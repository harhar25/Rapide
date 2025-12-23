import json
import os
import urllib.error
import urllib.request


class PromotexterClient:
    def __init__(self, api_key=None, api_secret=None, base_url=None):
        self.api_key = api_key or os.environ.get('PROMOTEXTER_API_KEY', '')
        self.api_secret = api_secret or os.environ.get('PROMOTEXTER_API_SECRET', '')
        self.base_url = (base_url or os.environ.get('PROMOTEXTER_BASE_URL', 'https://api.promotexter.com')).rstrip('/')

    def send_sms(self, from_id, to, text, reference_id=None, dlr_callback=None, dlr_report=True, timeout_seconds=20):
        url = f"{self.base_url}/sms/send"

        payload = {
            'apiKey': self.api_key,
            'apiSecret': self.api_secret,
            'from': from_id,
            'to': to,
            'text': text,
        }

        if reference_id is not None:
            payload['referenceId'] = str(reference_id)

        if dlr_callback:
            payload['dlrCallback'] = dlr_callback

        if dlr_report:
            payload['dlrReport'] = 1

        data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(url, data=data, method='POST')
        req.add_header('Content-Type', 'application/json')

        try:
            with urllib.request.urlopen(req, timeout=timeout_seconds) as resp:
                body = resp.read().decode('utf-8')
                parsed = json.loads(body) if body else {}
                return {'success': True, 'status_code': resp.status, 'data': parsed}
        except urllib.error.HTTPError as e:
            try:
                body = e.read().decode('utf-8')
                parsed = json.loads(body) if body else {}
            except Exception:
                parsed = {'raw': getattr(e, 'reason', str(e))}
            return {'success': False, 'status_code': e.code, 'error': parsed}
        except Exception as e:
            return {'success': False, 'status_code': None, 'error': str(e)}
