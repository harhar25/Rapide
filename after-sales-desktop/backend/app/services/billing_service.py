from database import db
from datetime import datetime, timedelta
import json

class BillingService:
    """Billing and invoice management service"""
    
    def generate_invoice_number(self):
        """Generate unique invoice number with format: INV-YYYYMM-XXXXX"""
        from datetime import datetime
        current_date = datetime.now()
        date_str = current_date.strftime('%Y%m')
        
        # Get count of invoices this month
        query = "SELECT COUNT(*) as count FROM invoices WHERE MONTH(created_at) = MONTH(NOW()) AND YEAR(created_at) = YEAR(NOW())"
        result = db.execute_query(query)
        count = (result[0]['count'] if result else 0) + 1
        
        return f"INV-{date_str}-{count:05d}"
    
    def create_invoice(self, service_order_id, customer_id, job_wrapup_id, labor_hours, 
                      labor_rate, materials_cost, parts_cost, parking_cost, discount=0, tax_rate=0.1):
        """Create a new invoice from service order and job wrap-up"""
        try:
            invoice_number = self.generate_invoice_number()
            
            # Calculate costs
            labor_cost = float(labor_hours) * float(labor_rate) if labor_hours else 0
            subtotal = labor_cost + float(materials_cost) + float(parts_cost) + float(parking_cost) - float(discount)
            tax_amount = subtotal * float(tax_rate)
            total_amount = subtotal + tax_amount
            
            query = """
            INSERT INTO invoices
            (service_order_id, invoice_number, customer_id, job_wrapup_id,
             labor_hours, labor_rate, labor_cost, materials_cost, parts_cost, parking_cost,
             discount_amount, tax_amount, subtotal, total_amount, status, due_date)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'draft', DATE_ADD(CURDATE(), INTERVAL 30 DAY))
            """
            
            params = (service_order_id, invoice_number, customer_id, job_wrapup_id,
                     labor_hours, labor_rate, labor_cost, materials_cost, parts_cost, parking_cost,
                     discount, tax_amount, subtotal, total_amount)
            
            result = db.execute_update(query, params)
            if result['success']:
                return result.get('last_id')
            raise ValueError("Failed to create invoice")
        except Exception as e:
            raise ValueError(f"Invoice creation failed: {str(e)}")
    
    def add_billing_item(self, invoice_id, item_type, description, quantity, unit_price, notes=""):
        """Add a line item to an invoice"""
        line_total = float(quantity) * float(unit_price)
        
        query = """
        INSERT INTO billing_items
        (invoice_id, item_type, item_description, quantity, unit_price, line_total, notes)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        """
        params = (invoice_id, item_type, description, quantity, unit_price, line_total, notes)
        
        result = db.execute_update(query, params)
        if not result['success']:
            raise ValueError("Failed to add billing item")
        return result.get('last_id')
    
    def issue_invoice(self, invoice_id):
        """Mark invoice as issued"""
        query = """
        UPDATE invoices 
        SET status = 'issued', updated_at = NOW()
        WHERE id = %s AND status = 'draft'
        """
        result = db.execute_update(query, (invoice_id,))
        
        if not result['success']:
            raise ValueError("Failed to issue invoice")
        return True
    
    def record_payment(self, invoice_id, payment_amount, payment_method, created_by, reference_number=""):
        """Record a payment against an invoice"""
        # Get invoice details
        invoice = self.get_invoice(invoice_id)
        if not invoice:
            raise ValueError("Invoice not found")
        
        # Update invoice status
        total_paid = float(invoice[13]) + float(payment_amount)  # invoice[13] is total_amount
        
        if total_paid >= float(invoice[13]):
            status = 'paid'
        else:
            status = 'partial-paid'
        
        # Record payment
        query = """
        INSERT INTO invoice_payments
        (invoice_id, payment_amount, payment_method, reference_number, created_by)
        VALUES (%s, %s, %s, %s, %s)
        """
        params = (invoice_id, payment_amount, payment_method, reference_number, created_by)
        
        result = db.execute_update(query, params)
        if not result['success']:
            raise ValueError("Failed to record payment")
        
        # Update invoice status
        query_update = "UPDATE invoices SET status = %s, updated_at = NOW() WHERE id = %s"
        db.execute_update(query_update, (status, invoice_id))
        
        return result.get('last_id')
    
    def get_invoice(self, invoice_id):
        """Get invoice details"""
        query = """
        SELECT i.id, i.service_order_id, i.invoice_number, i.customer_id, c.name,
               i.labor_hours, i.labor_rate, i.labor_cost, i.materials_cost, i.parts_cost,
               i.parking_cost, i.discount_amount, i.tax_amount, i.total_amount,
               i.status, i.invoice_date, i.due_date, i.notes
        FROM invoices i
        JOIN customers c ON i.customer_id = c.id
        WHERE i.id = %s
        """
        result = db.execute_query(query, (invoice_id,))
        if result:
            return tuple(result[0].values())
        raise ValueError("Invoice not found")
    
    def get_invoice_items(self, invoice_id):
        """Get line items for an invoice"""
        query = """
        SELECT id, item_type, item_description, item_code, quantity, unit_price, line_total, notes
        FROM billing_items
        WHERE invoice_id = %s
        ORDER BY id ASC
        """
        results = db.execute_query(query, (invoice_id,)) or []
        return [tuple(r.values()) for r in results]
    
    def get_invoice_payments(self, invoice_id):
        """Get all payments for an invoice"""
        query = """
        SELECT ip.id, ip.payment_amount, ip.payment_method, ip.payment_date,
               ip.reference_number, COALESCE(p.name, 'System') as received_by
        FROM invoice_payments ip
        LEFT JOIN personnel p ON ip.created_by = p.id
        WHERE ip.invoice_id = %s
        ORDER BY ip.payment_date DESC
        """
        results = db.execute_query(query, (invoice_id,)) or []
        return [tuple(r.values()) for r in results]
    
    def get_pending_invoices(self):
        """Get all pending/draft invoices"""
        query = """
        SELECT i.id, i.invoice_number, c.name, c.plate_no, CONCAT('SO-', LPAD(so.id, 6, '0')) as service_order_no,
               i.total_amount, i.status, i.invoice_date, i.due_date
        FROM invoices i
        JOIN customers c ON i.customer_id = c.id
        JOIN scheduling_orders so ON i.service_order_id = so.id
        WHERE i.status IN ('draft', 'issued')
        ORDER BY i.created_at DESC
        """
        results = db.execute_query(query) or []
        return [tuple(r.values()) for r in results]
    
    def get_paid_invoices(self):
        """Get all paid invoices"""
        query = """
        SELECT i.id, i.invoice_number, c.name, c.plate_no, CONCAT('SO-', LPAD(so.id, 6, '0')) as service_order_no,
               i.total_amount, i.status, i.invoice_date
        FROM invoices i
        JOIN customers c ON i.customer_id = c.id
        JOIN scheduling_orders so ON i.service_order_id = so.id
        WHERE i.status = 'paid'
        ORDER BY i.updated_at DESC
        """
        results = db.execute_query(query) or []
        return [tuple(r.values()) for r in results]
    
    def get_overdue_invoices(self):
        """Get invoices that are overdue"""
        query = """
        SELECT i.id, i.invoice_number, c.name, c.plate_no, i.total_amount,
               i.status, i.due_date, DATEDIFF(CURDATE(), i.due_date) as days_overdue
        FROM invoices i
        JOIN customers c ON i.customer_id = c.id
        WHERE i.due_date < CURDATE() AND i.status IN ('issued', 'partial-paid')
        ORDER BY i.due_date ASC
        """
        results = db.execute_query(query) or []
        return [tuple(r.values()) for r in results]
    
    def get_billing_summary(self):
        """Get billing summary statistics"""
        query = """
        SELECT 
            COUNT(DISTINCT CASE WHEN status = 'draft' THEN id END) as draft_count,
            COUNT(DISTINCT CASE WHEN status IN ('issued', 'sent') THEN id END) as issued_count,
            COUNT(DISTINCT CASE WHEN status = 'partial-paid' THEN id END) as partial_paid_count,
            COUNT(DISTINCT CASE WHEN status = 'paid' THEN id END) as paid_count,
            COUNT(DISTINCT CASE WHEN status = 'cancelled' THEN id END) as cancelled_count,
            COALESCE(SUM(CASE WHEN status IN ('issued', 'partial-paid', 'sent') THEN total_amount ELSE 0 END), 0) as pending_amount,
            COALESCE(SUM(CASE WHEN status = 'partial-paid' THEN total_amount ELSE 0 END), 0) as partial_paid_amount,
            COALESCE(SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END), 0) as paid_amount,
            COALESCE(SUM(CASE WHEN status IN ('issued', 'partial-paid', 'sent') AND due_date < CURDATE() THEN total_amount ELSE 0 END), 0) as overdue_amount
        FROM invoices
        WHERE DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        """
        result = db.execute_query(query)
        if result:
            stats = result[0]
            return tuple(stats.values())
        return (0, 0, 0, 0, 0, 0, 0, 0, 0)
    
    def generate_invoice_from_service_order(self, service_order_id):
        """Auto-generate invoice from completed service order and wrap-up"""
        # Get service order and wrap-up details
        query = """
        SELECT so.id, so.customer_id, jw.id as wrapup_id, jw.total_labor_hours
        FROM scheduling_orders so
        LEFT JOIN job_wrapups jw ON so.id = jw.service_order_id
        WHERE so.id = %s
        """
        result = db.execute_query(query, (service_order_id,))
        if not result:
            raise ValueError("Service order not found")
        
        so_data = result[0]
        
        # Create invoice with labor hours from wrap-up
        invoice_id = self.create_invoice(
            service_order_id=service_order_id,
            customer_id=so_data['customer_id'],
            job_wrapup_id=so_data.get('wrapup_id'),
            labor_hours=so_data.get('total_labor_hours', 0),
            labor_rate=50.00,
            materials_cost=0,
            parts_cost=0,
            parking_cost=0
        )
        
        return invoice_id
