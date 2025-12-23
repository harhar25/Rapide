from database import db
from datetime import datetime
import os

from app.services.promotexter_client import PromotexterClient


class SmsService:
    def queue_sms(self, phone, message, purpose, scheduled_at=None, created_by='system',
                  customer_id=None, scheduling_order_id=None):
        scheduled_at = scheduled_at or datetime.now()

        query = """
        INSERT INTO sms_outbox
        (customer_id, scheduling_order_id, purpose, phone, message, scheduled_at, status, created_by)
        VALUES (%s, %s, %s, %s, %s, %s, 'queued', %s)
        """

        params = (
            customer_id,
            scheduling_order_id,
            purpose,
            phone,
            message,
            scheduled_at,
            created_by,
        )

        result = db.execute_update(query, params)
        return result.get('last_id') if result.get('success') else None

    def queue_pms_batch(self, customer_ids, message_template, created_by='system'):
        if not customer_ids:
            return {'success': True, 'queued': 0, 'skipped': 0, 'outbox_ids': []}

        placeholders = ','.join(['%s'] * len(customer_ids))
        customers = db.execute_query(
            f"SELECT id, name, contact_no FROM customers WHERE id IN ({placeholders}) AND status = 'active'",
            tuple(customer_ids),
        ) or []

        outbox_ids = []
        skipped = 0
        for c in customers:
            phone = c.get('contact_no')
            if not phone:
                skipped += 1
                continue

            message = message_template.format(name=c.get('name') or '').strip()
            outbox_id = self.queue_sms(
                phone=phone,
                message=message,
                purpose='PMS_OUTREACH',
                scheduled_at=datetime.now(),
                created_by=created_by,
                customer_id=c.get('id'),
            )
            if outbox_id:
                outbox_ids.append(outbox_id)
            else:
                skipped += 1

        return {'success': True, 'queued': len(outbox_ids), 'skipped': skipped, 'outbox_ids': outbox_ids}

    def list_outbox(self, status=None, limit=100):
        if status:
            query = """
            SELECT id, purpose, phone, message, scheduled_at, sent_at, status, created_by, provider_message_id
            FROM sms_outbox
            WHERE status = %s
            ORDER BY scheduled_at ASC
            LIMIT %s
            """
            return db.execute_query(query, (status, limit)) or []

        query = """
        SELECT id, purpose, phone, message, scheduled_at, sent_at, status, created_by, provider_message_id
        FROM sms_outbox
        ORDER BY scheduled_at DESC
        LIMIT %s
        """
        return db.execute_query(query, (limit,)) or []

    def list_due_for_sending(self, limit=20):
        query = """
        SELECT id, purpose, phone, message, scheduled_at, status, provider_message_id, retry_count, created_by,
               customer_id, scheduling_order_id
        FROM sms_outbox
        WHERE status = 'queued'
          AND scheduled_at <= NOW()
        ORDER BY scheduled_at ASC
        LIMIT %s
        """
        return db.execute_query(query, (limit,)) or []

    def mark_sending(self, outbox_id):
        query = """
        UPDATE sms_outbox
        SET status = 'sending'
        WHERE id = %s AND status = 'queued'
        """
        result = db.execute_update(query, (outbox_id,))
        return result.get('success') and result.get('affected_rows', 0) == 1

    def mark_failed(self, outbox_id, error_message=None):
        query = """
        UPDATE sms_outbox
        SET status = 'failed',
            retry_count = retry_count + 1,
            error_message = %s
        WHERE id = %s
        """
        result = db.execute_update(query, (error_message, outbox_id))
        return result.get('success')

    def mark_sent(self, outbox_id, provider_message_id=None):
        query = """
        UPDATE sms_outbox
        SET status = 'sent',
            provider_message_id = COALESCE(%s, provider_message_id),
            sent_at = CASE WHEN sent_at IS NULL THEN NOW() ELSE sent_at END
        WHERE id = %s
        """
        result = db.execute_update(query, (provider_message_id, outbox_id))
        return result.get('success')

    def update_status_by_outbox_id(self, outbox_id, new_status, error_message=None, provider_message_id=None):
        query = """
        UPDATE sms_outbox
        SET status = %s,
            provider_message_id = COALESCE(%s, provider_message_id),
            error_message = COALESCE(%s, error_message),
            delivered_at = CASE WHEN %s = 'delivered' THEN NOW() ELSE delivered_at END,
            sent_at = CASE WHEN %s IN ('sent','delivered') AND sent_at IS NULL THEN NOW() ELSE sent_at END
        WHERE id = %s
        """
        result = db.execute_update(query, (new_status, provider_message_id, error_message, new_status, new_status, outbox_id))
        return result.get('success')

    def sync_related_tables_for_outbox(self, outbox_id):
        rows = db.execute_query(
            "SELECT id, purpose, scheduling_order_id, status FROM sms_outbox WHERE id = %s",
            (outbox_id,),
        ) or []
        if not rows:
            return False

        outbox = rows[0]
        purpose = outbox.get('purpose')
        scheduling_order_id = outbox.get('scheduling_order_id')
        status = outbox.get('status')
        if not scheduling_order_id:
            return True

        if purpose == 'APPT_CONFIRM':
            q = """
            UPDATE appointment_confirmations
            SET status = %s,
                error_message = CASE WHEN %s = 'failed' THEN COALESCE(error_message, '') ELSE error_message END,
                sent_at = CASE WHEN %s IN ('sent','delivered') AND sent_at IS NULL THEN NOW() ELSE sent_at END,
                delivered_at = CASE WHEN %s = 'delivered' AND delivered_at IS NULL THEN NOW() ELSE delivered_at END
            WHERE scheduling_order_id = %s
              AND method = 'sms'
            ORDER BY id DESC
            LIMIT 1
            """
            db.execute_update(q, (status, status, status, status, scheduling_order_id))
            return True

        if purpose == 'APPT_REMINDER':
            q = """
            UPDATE appointment_reminders
            SET status = %s,
                sent_at = CASE WHEN %s IN ('sent','delivered') AND sent_at IS NULL THEN NOW() ELSE sent_at END,
                delivered_at = CASE WHEN %s = 'delivered' AND delivered_at IS NULL THEN NOW() ELSE delivered_at END
            WHERE scheduling_order_id = %s
            ORDER BY id DESC
            LIMIT 1
            """
            db.execute_update(q, (status, status, status, scheduling_order_id))
            return True

        return True

    def dispatch_due_messages(self, limit=20):
        api_key = os.environ.get('PROMOTEXTER_API_KEY', '')
        api_secret = os.environ.get('PROMOTEXTER_API_SECRET', '')
        from_id = os.environ.get('PROMOTEXTER_FROM', os.environ.get('BRANCH_SMS_SENDER', 'Rapide'))

        if not api_key or not api_secret:
            return {'success': False, 'error': 'Missing PROMOTEXTER_API_KEY or PROMOTEXTER_API_SECRET'}

        client = PromotexterClient(api_key=api_key, api_secret=api_secret)
        due = self.list_due_for_sending(limit=limit)

        sent = 0
        failed = 0
        skipped = 0
        results = []

        base_callback = os.environ.get('SMS_DLR_CALLBACK_URL', '').strip()
        webhook_secret = os.environ.get('SMS_WEBHOOK_SECRET', '').strip()
        dlr_callback = None
        if base_callback:
            if webhook_secret and 'secret=' not in base_callback:
                joiner = '&' if '?' in base_callback else '?'
                base_callback = f"{base_callback}{joiner}secret={webhook_secret}"

            joiner = '&' if '?' in base_callback else '?'
            dlr_callback = (
                f"{base_callback}{joiner}status=%s&id=%i&referenceId=%r&timestamp=%d&transactionType=%tr&from=%f&to=%t"
            )

        for row in due:
            outbox_id = row.get('id')
            if not outbox_id:
                skipped += 1
                continue

            if not self.mark_sending(outbox_id):
                skipped += 1
                continue

            resp = client.send_sms(
                from_id=from_id,
                to=row.get('phone'),
                text=row.get('message'),
                reference_id=str(outbox_id),
                dlr_callback=dlr_callback,
                dlr_report=True,
            )

            if resp.get('success'):
                data = resp.get('data') or {}
                provider_id = None
                if isinstance(data, dict):
                    provider_id = (data.get('data') or {}).get('id') if isinstance(data.get('data'), dict) else data.get('id')

                self.mark_sent(outbox_id, provider_message_id=provider_id)
                sent += 1
                results.append({'outbox_id': outbox_id, 'status': 'sent', 'provider_message_id': provider_id})
            else:
                self.mark_failed(outbox_id, error_message=str(resp.get('error')))
                failed += 1
                results.append({'outbox_id': outbox_id, 'status': 'failed', 'error': resp.get('error')})

        return {
            'success': True,
            'count': len(due),
            'sent': sent,
            'failed': failed,
            'skipped': skipped,
            'results': results,
        }

    def update_status_by_provider_id(self, provider_message_id, new_status, error_message=None):
        query = """
        UPDATE sms_outbox
        SET status = %s,
            error_message = COALESCE(%s, error_message),
            delivered_at = CASE WHEN %s = 'delivered' THEN NOW() ELSE delivered_at END,
            sent_at = CASE WHEN %s IN ('sent','delivered') AND sent_at IS NULL THEN NOW() ELSE sent_at END
        WHERE provider_message_id = %s
        """
        result = db.execute_update(query, (new_status, error_message, new_status, new_status, provider_message_id))
        return result.get('success')

    def update_status_from_promotexter_dlr(self, provider_message_id=None, reference_id=None, dlr_status=None,
                                          error_message=None):
        # Promotexter sends DLR status as an integer code.
        # We map conservatively:
        # - 1 => delivered
        # - others => sent/failed depending on value
        status_str = None
        try:
            code = int(dlr_status) if dlr_status is not None and str(dlr_status).strip() != '' else None
        except Exception:
            code = None

        if code == 1:
            status_str = 'delivered'
        elif code in (0,):
            status_str = 'sent'
        elif code is None:
            status_str = 'sent'
        else:
            status_str = 'failed'

        updated = False
        outbox_id = None
        if reference_id and str(reference_id).isdigit():
            outbox_id = int(reference_id)
            updated = self.update_status_by_outbox_id(
                outbox_id,
                status_str,
                error_message=error_message,
                provider_message_id=provider_message_id,
            )
        elif provider_message_id:
            updated = self.update_status_by_provider_id(provider_message_id, status_str, error_message=error_message)

        if outbox_id and updated:
            self.sync_related_tables_for_outbox(outbox_id)

        return {'success': True, 'updated': updated, 'mapped_status': status_str, 'outbox_id': outbox_id}
