from flask import Blueprint, jsonify, request
from app.services.sms_service import SmsService
from app.services.audit_service import AuditService
import os


sms_bp = Blueprint('sms', __name__, url_prefix='/api/sms')

sms_service = SmsService()
audit_service = AuditService()


@sms_bp.route('/queue', methods=['POST'])
def queue_sms():
    try:
        data = request.json or {}
        phone = data.get('phone')
        message = data.get('message')
        purpose = data.get('purpose', 'PMS_OUTREACH')
        created_by = data.get('created_by', 'system')
        customer_id = data.get('customer_id')
        scheduling_order_id = data.get('scheduling_order_id')

        if not phone or not message:
            return jsonify({'success': False, 'error': 'phone and message are required'}), 400

        outbox_id = sms_service.queue_sms(
            phone=phone,
            message=message,
            purpose=purpose,
            created_by=created_by,
            customer_id=customer_id,
            scheduling_order_id=scheduling_order_id,
        )

        if not outbox_id:
            return jsonify({'success': False, 'error': 'Failed to queue SMS'}), 500

        audit_service.log(
            operation_type='SMS_QUEUED',
            entity_type='sms_outbox',
            entity_id=outbox_id,
            user_name=created_by,
            ip_address=request.remote_addr,
            browser_info=str(request.user_agent),
            operation_details=purpose,
            new_values={'phone': phone},
        )

        return jsonify({'success': True, 'outbox_id': outbox_id}), 201
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@sms_bp.route('/dispatch', methods=['POST'])
def dispatch_sms():
    try:
        secret = os.environ.get('SMS_DISPATCH_SECRET', '').strip()
        header_secret = request.headers.get('X-Dispatch-Secret', '').strip()
        if secret and header_secret != secret:
            return jsonify({'success': False, 'error': 'Unauthorized'}), 401

        limit = None
        if request.is_json:
            limit = (request.json or {}).get('limit')
        if limit is None:
            limit = request.args.get('limit')

        try:
            limit = int(limit) if limit is not None else 20
        except Exception:
            limit = 20

        result = sms_service.dispatch_due_messages(limit=limit)
        return jsonify(result), 200 if result.get('success') else 400
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@sms_bp.route('/queue-pms-batch', methods=['POST'])
def queue_pms_batch():
    try:
        data = request.json or {}
        customer_ids = data.get('customer_ids') or []
        created_by = data.get('created_by', 'system')
        branch_name = os.environ.get('BRANCH_NAME', 'Rapide')
        message_template = data.get('message_template') or f"{branch_name}: Hi {{name}}, your PMS is due. Reply is not monitored. Please contact us to schedule."

        result = sms_service.queue_pms_batch(customer_ids, message_template, created_by=created_by)

        audit_service.log(
            operation_type='SMS_BATCH_QUEUED',
            entity_type='customers',
            entity_id=None,
            user_name=created_by,
            ip_address=request.remote_addr,
            browser_info=str(request.user_agent),
            operation_details=f"PMS_OUTREACH batch queued: {result.get('queued')} queued, {result.get('skipped')} skipped",
            new_values={'customer_ids': customer_ids},
        )

        return jsonify(result), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@sms_bp.route('/outbox', methods=['GET'])
def list_outbox():
    try:
        status = request.args.get('status')
        limit = int(request.args.get('limit', 100))
        data = sms_service.list_outbox(status=status, limit=limit)
        return jsonify({'success': True, 'data': data, 'count': len(data)}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@sms_bp.route('/provider/status-callback', methods=['GET', 'POST'])
def sms_status_callback():
    try:
        secret = os.environ.get('SMS_WEBHOOK_SECRET', '').strip()
        header_secret = request.headers.get('X-Webhook-Secret', '').strip()
        query_secret = request.args.get('secret', '').strip()
        if secret and header_secret != secret and query_secret != secret:
            return jsonify({'success': False, 'error': 'Unauthorized'}), 401

        # Promotexter DLR is typically sent as query params (often GET)
        # Example: ?status=1&id=<transactionId>&referenceId=<yourRefId>
        status_q = request.args.get('status') or request.args.get('_status')
        id_q = request.args.get('id') or request.args.get('_id')
        reference_id_q = request.args.get('referenceId') or request.args.get('reference_id')
        timestamp_q = request.args.get('timestamp') or request.args.get('_timestamp')
        from_q = request.args.get('from') or request.args.get('_from')
        to_q = request.args.get('to') or request.args.get('_to')

        if status_q is not None or id_q is not None or reference_id_q is not None:
            result = sms_service.update_status_from_promotexter_dlr(
                provider_message_id=id_q,
                reference_id=reference_id_q,
                dlr_status=status_q,
                error_message=None,
            )

            audit_service.log(
                operation_type='SMS_DLR_RECEIVED',
                entity_type='sms_outbox',
                entity_id=result.get('outbox_id'),
                ip_address=request.remote_addr,
                browser_info=str(request.user_agent),
                operation_details='Promotexter DLR',
                new_values={
                    'status': status_q,
                    'id': id_q,
                    'referenceId': reference_id_q,
                    'timestamp': timestamp_q,
                    'from': from_q,
                    'to': to_q,
                },
            )
            return jsonify(result), 200

        # Generic JSON callback (existing internal format)
        data = request.json or {}
        provider_message_id = data.get('provider_message_id')
        status = data.get('status')
        error_message = data.get('error_message')

        if not provider_message_id or not status:
            return jsonify({'success': False, 'error': 'Missing callback parameters'}), 400

        ok = sms_service.update_status_by_provider_id(provider_message_id, status, error_message=error_message)
        return jsonify({'success': True, 'updated': ok}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
