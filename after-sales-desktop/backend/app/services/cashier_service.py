from database import db
from datetime import datetime, timedelta

class CashierService:
    """Cashier and payment collection service"""
    
    def process_payment(self, invoice_id, customer_id, amount, payment_method, 
                       created_by, reference_number="", card_last_four="", 
                       bank_name="", check_number=""):
        """Process a payment transaction"""
        query = """
        INSERT INTO payment_transactions
        (invoice_id, customer_id, transaction_type, amount, payment_method,
         reference_number, card_last_four, bank_name, check_number,
         transaction_status, created_by, transaction_date)
        VALUES (%s, %s, 'payment', %s, %s, %s, %s, %s, %s, 'completed', %s, NOW())
        """
        params = (invoice_id, customer_id, amount, payment_method, reference_number,
                 card_last_four, bank_name, check_number, created_by)
        
        result = db.execute_update(query, params)
        if result['success']:
            # Update invoice status
            self._update_invoice_after_payment(invoice_id)
            return result.get('last_id')
        raise ValueError("Failed to process payment")
    
    def _update_invoice_after_payment(self, invoice_id):
        """Update invoice status after payment"""
        # Get invoice amount
        query_get = """
        SELECT i.total_amount, COALESCE(SUM(pt.amount), 0) as paid_amount
        FROM invoices i
        LEFT JOIN payment_transactions pt ON i.id = pt.invoice_id 
                                         AND pt.transaction_status = 'completed'
        WHERE i.id = %s
        GROUP BY i.id
        """
        result = db.execute_query(query_get, (invoice_id,))
        if not result:
            return
        
        invoice_data = result[0]
        total = float(invoice_data['total_amount'])
        paid = float(invoice_data['paid_amount'])
        
        if paid >= total:
            status = 'paid'
        elif paid > 0:
            status = 'partial-paid'
        else:
            status = 'issued'
        
        query_update = "UPDATE invoices SET status = %s, updated_at = NOW() WHERE id = %s"
        db.execute_update(query_update, (status, invoice_id))
    
    def get_pending_invoices_for_payment(self):
        """Get invoices ready for payment"""
        query = """
        SELECT i.id, i.invoice_number, c.name, c.plate_no, CONCAT('SO-', LPAD(so.id, 6, '0')) as service_order_no,
               i.total_amount, COALESCE(SUM(pt.amount), 0) as paid_amount,
               i.total_amount - COALESCE(SUM(pt.amount), 0) as remaining_balance,
               i.due_date
        FROM invoices i
        JOIN customers c ON i.customer_id = c.id
        JOIN scheduling_orders so ON i.service_order_id = so.id
        LEFT JOIN payment_transactions pt ON i.id = pt.invoice_id 
                                         AND pt.transaction_status = 'completed'
        WHERE i.status IN ('issued', 'partial-paid')
        GROUP BY i.id
        ORDER BY i.due_date ASC
        """
        results = db.execute_query(query) or []
        return [tuple(r.values()) for r in results]
    
    def get_daily_transactions(self, date=None):
        """Get transactions for a specific day"""
        if not date:
            date = datetime.now().date()
        
        query = """
        SELECT pt.id, pt.reference_number, c.name, pt.amount, pt.payment_method,
               pt.transaction_status, CONCAT(p.name, ' (', p.role, ')') as received_by,
               pt.transaction_date
        FROM payment_transactions pt
        JOIN customers c ON pt.customer_id = c.id
        JOIN personnel p ON pt.created_by = p.id
        WHERE DATE(pt.transaction_date) = %s
        ORDER BY pt.transaction_date DESC
        """
        results = db.execute_query(query, (date,)) or []
        return [tuple(r.values()) for r in results]
    
    def get_daily_summary(self, date=None):
        """Get daily payment summary"""
        if not date:
            date = datetime.now().date()
        
        query = """
        SELECT 
            COUNT(*) as total_transactions,
            COUNT(DISTINCT CASE WHEN payment_method = 'cash' THEN id END) as cash_count,
            COUNT(DISTINCT CASE WHEN payment_method = 'card' THEN id END) as card_count,
            COUNT(DISTINCT CASE WHEN payment_method = 'check' THEN id END) as check_count,
            COUNT(DISTINCT CASE WHEN payment_method = 'bank-transfer' THEN id END) as transfer_count,
            COUNT(DISTINCT CASE WHEN payment_method = 'mobile-money' THEN id END) as mobile_count,
            COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN amount ELSE 0 END), 0) as cash_total,
            COALESCE(SUM(CASE WHEN payment_method = 'card' THEN amount ELSE 0 END), 0) as card_total,
            COALESCE(SUM(CASE WHEN payment_method = 'check' THEN amount ELSE 0 END), 0) as check_total,
            COALESCE(SUM(CASE WHEN payment_method = 'bank-transfer' THEN amount ELSE 0 END), 0) as transfer_total,
            COALESCE(SUM(CASE WHEN payment_method = 'mobile-money' THEN amount ELSE 0 END), 0) as mobile_total,
            COALESCE(SUM(amount), 0) as grand_total
        FROM payment_transactions
        WHERE DATE(transaction_date) = %s AND transaction_status = 'completed'
        """
        result = db.execute_query(query, (date,))
        if result:
            return tuple(result[0].values())
        return (0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)
    
    def open_cash_drawer(self, cashier_id, opening_balance):
        """Open a new cash drawer"""
        query = """
        INSERT INTO cash_drawer
        (cashier_id, opening_balance, opening_time, drawer_status)
        VALUES (%s, %s, NOW(), 'open')
        """
        result = db.execute_update(query, (cashier_id, opening_balance))
        if result['success']:
            return result.get('last_id')
        raise ValueError("Failed to open cash drawer")
    
    def close_cash_drawer(self, drawer_id, cash_counted, notes=""):
        """Close a cash drawer and calculate discrepancy"""
        # Get drawer details
        query_get = """
        SELECT cd.opening_balance,
               COALESCE(SUM(CASE WHEN pt.payment_method = 'cash' THEN pt.amount ELSE 0 END), 0) as cash_received
        FROM cash_drawer cd
        LEFT JOIN payment_transactions pt ON DATE(pt.transaction_date) = DATE(cd.opening_time)
                                         AND pt.payment_method = 'cash'
                                         AND pt.transaction_status = 'completed'
                                         AND pt.created_by IN (
                                             SELECT id FROM personnel WHERE id = cd.cashier_id
                                         )
        WHERE cd.id = %s
        GROUP BY cd.id
        """
        result = db.execute_query(query_get, (drawer_id,))
        if not result:
            raise ValueError("Cash drawer not found")
        
        drawer_data = result[0]
        opening_balance = float(drawer_data['opening_balance'])
        cash_received = float(drawer_data['cash_received'])
        expected_balance = opening_balance + cash_received
        discrepancy = float(cash_counted) - expected_balance
        
        # Get other payment totals for the day
        query_totals = """
        SELECT 
            COALESCE(SUM(CASE WHEN payment_method = 'card' THEN amount ELSE 0 END), 0) as card_total,
            COALESCE(SUM(CASE WHEN payment_method = 'check' THEN amount ELSE 0 END), 0) as check_total,
            COALESCE(SUM(CASE WHEN payment_method = 'bank-transfer' THEN amount ELSE 0 END), 0) as transfer_total,
            COALESCE(SUM(CASE WHEN payment_method = 'mobile-money' THEN amount ELSE 0 END), 0) as mobile_total
        FROM payment_transactions
        WHERE DATE(transaction_date) >= DATE(
                SELECT opening_time FROM cash_drawer WHERE id = %s
            )
        AND transaction_status = 'completed'
        """
        totals = db.execute_query(query_totals, (drawer_id,))[0]
        
        # Close drawer
        query_close = """
        UPDATE cash_drawer
        SET drawer_status = 'closed', closing_balance = %s, closing_time = NOW(),
            cash_counted = %s, discrepancy = %s, notes = %s,
            card_total = %s, check_total = %s, bank_transfer_total = %s, mobile_money_total = %s
        WHERE id = %s
        """
        params = (expected_balance, cash_counted, discrepancy, notes,
                 totals['card_total'], totals['check_total'],
                 totals['transfer_total'], totals['mobile_total'], drawer_id)
        
        result = db.execute_update(query_close, params)
        if not result['success']:
            raise ValueError("Failed to close cash drawer")
        return True
    
    def get_active_drawer(self, cashier_id=None):
        """Get active cash drawer"""
        if cashier_id:
            query = """
            SELECT id, cashier_id, opening_balance, opening_time, drawer_status
            FROM cash_drawer
            WHERE cashier_id = %s AND drawer_status = 'open'
            ORDER BY opening_time DESC LIMIT 1
            """
            result = db.execute_query(query, (cashier_id,))
        else:
            query = """
            SELECT id, cashier_id, opening_balance, opening_time, drawer_status
            FROM cash_drawer
            WHERE drawer_status = 'open'
            ORDER BY opening_time DESC LIMIT 1
            """
            result = db.execute_query(query)
        
        if result:
            return tuple(result[0].values())
        return None
    
    def get_payment_method_config(self, method_type):
        """Get payment method configuration"""
        query = """
        SELECT id, method_type, method_name, is_enabled, requires_verification,
               processing_fee_percent, daily_limit
        FROM payment_methods_config
        WHERE method_type = %s
        """
        result = db.execute_query(query, (method_type,))
        if result:
            return tuple(result[0].values())
        raise ValueError("Payment method not found")
    
    def get_payment_methods(self):
        """Get all enabled payment methods"""
        query = """
        SELECT method_type, method_name, requires_verification, processing_fee_percent
        FROM payment_methods_config
        WHERE is_enabled = TRUE
        ORDER BY method_name ASC
        """
        results = db.execute_query(query) or []
        return [tuple(r.values()) for r in results]
    
    def get_cashier_summary(self, cashier_id=None, date_from=None, date_to=None):
        """Get cashier performance summary"""
        if not date_from:
            date_from = (datetime.now() - timedelta(days=30)).date()
        if not date_to:
            date_to = datetime.now().date()
        
        if cashier_id:
            query = """
            SELECT 
                COUNT(DISTINCT DATE(pt.transaction_date)) as days_worked,
                COUNT(*) as total_transactions,
                COALESCE(SUM(pt.amount), 0) as total_collected,
                COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN amount ELSE 0 END), 0) as cash_collected,
                COUNT(DISTINCT cd.id) as drawers_handled,
                COALESCE(SUM(ABS(cd.discrepancy)), 0) as total_discrepancy
            FROM payment_transactions pt
            LEFT JOIN cash_drawer cd ON pt.created_by = cd.cashier_id
            WHERE pt.created_by = %s AND DATE(pt.transaction_date) BETWEEN %s AND %s
                AND pt.transaction_status = 'completed'
            """
            result = db.execute_query(query, (cashier_id, date_from, date_to))
        else:
            query = """
            SELECT 
                COUNT(DISTINCT DATE(pt.transaction_date)) as days_worked,
                COUNT(*) as total_transactions,
                COALESCE(SUM(pt.amount), 0) as total_collected,
                COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN amount ELSE 0 END), 0) as cash_collected,
                COUNT(DISTINCT cd.id) as drawers_handled,
                COALESCE(SUM(ABS(cd.discrepancy)), 0) as total_discrepancy
            FROM payment_transactions pt
            LEFT JOIN cash_drawer cd ON pt.created_by = cd.cashier_id
            WHERE DATE(pt.transaction_date) BETWEEN %s AND %s
                AND pt.transaction_status = 'completed'
            """
            result = db.execute_query(query, (date_from, date_to))
        
        if result:
            return tuple(result[0].values())
        return (0, 0, 0, 0, 0, 0)
