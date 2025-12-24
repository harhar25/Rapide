from flask import Flask, jsonify, request
from flask_cors import CORS
from database import db
import os

def create_app(config_name='development'):
    """Application factory"""
    app = Flask(__name__)
    
    # Load configuration
    from config import config
    app.config.from_object(config[config_name])
    
    # Enable CORS
    CORS(app)
    
    # Initialize database connection
    db.connect()
    db.ensure_core_tables()
    
    # Register blueprints
    from app.routes import customer_bp, scheduler_bp
    from app.routes.auth_routes import auth_bp
    from app.routes.warehouse_routes import warehouse_bp
    from app.routes.service_advisor_routes import service_advisor_bp
    from app.routes.job_controller_routes import job_controller_bp
    from app.routes.technician_routes import technician_bp
    from app.routes.foreman_qc_routes import foreman_qc_bp
    from app.routes.job_wrapup_routes import job_wrapup_bp
    from app.routes.car_jockey_routes import car_jockey_bp
    from app.routes.billing_routes import billing_bp
    from app.routes.cashier_routes import cashier_bp
    from app.routes.security_gate_routes import security_gate_bp
    from app.routes.vehicle_handover_routes import vehicle_handover_bp
    from app.routes.follow_up_routes import follow_up_bp
    from app.routes.sms_routes import sms_bp
    app.register_blueprint(customer_bp)
    app.register_blueprint(scheduler_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(warehouse_bp)
    app.register_blueprint(service_advisor_bp)
    app.register_blueprint(job_controller_bp)
    app.register_blueprint(technician_bp)
    app.register_blueprint(foreman_qc_bp)
    app.register_blueprint(job_wrapup_bp)
    app.register_blueprint(car_jockey_bp)
    app.register_blueprint(billing_bp)
    app.register_blueprint(cashier_bp)
    app.register_blueprint(security_gate_bp)
    app.register_blueprint(vehicle_handover_bp)
    app.register_blueprint(follow_up_bp)
    app.register_blueprint(sms_bp)
    
    # Health check endpoint
    @app.route('/api/health', methods=['GET'])
    def health_check():
        return {'status': 'ok', 'message': 'After-Sales API running'}, 200

    @app.before_request
    def handle_api_preflight():
        if request.method == 'OPTIONS' and request.path.startswith('/api/'):
            return ('', 204)

    @app.errorhandler(404)
    def handle_404(e):
        if request.path.startswith('/api/'):
            return jsonify({'success': False, 'error': 'Not found', 'code': 'HTTP-404'}), 404
        return e

    @app.errorhandler(405)
    def handle_405(e):
        if request.path.startswith('/api/'):
            return jsonify({'success': False, 'error': 'Method not allowed', 'code': 'HTTP-405'}), 405
        return e

    @app.errorhandler(500)
    def handle_500(e):
        if request.path.startswith('/api/'):
            return jsonify({'success': False, 'error': 'Internal server error', 'code': 'HTTP-500'}), 500
        return e
    
    # Dashboard visualization
    @app.route('/', methods=['GET'])
    def dashboard():
        """Main dashboard to visualize API"""
        return '''
        <!DOCTYPE html>
        <html>
        <head>
            <title>After-Sales API Dashboard</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; padding: 20px; }
                .container { max-width: 1200px; margin: 0 auto; }
                header { color: white; text-align: center; margin-bottom: 40px; }
                h1 { font-size: 2.5em; margin-bottom: 10px; }
                .status { display: inline-block; background: #10b981; color: white; padding: 8px 16px; border-radius: 20px; font-size: 0.9em; }
                .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 40px; }
                .card { background: white; border-radius: 12px; padding: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); transition: transform 0.3s; }
                .card:hover { transform: translateY(-5px); }
                .card h2 { color: #667eea; margin-bottom: 16px; font-size: 1.3em; }
                .endpoint { background: #f8f9fa; padding: 12px; margin: 8px 0; border-left: 4px solid #667eea; border-radius: 4px; font-family: monospace; font-size: 0.9em; }
                .method { display: inline-block; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 0.8em; margin-right: 8px; }
                .get { background: #3b82f6; color: white; }
                .post { background: #10b981; color: white; }
                .test-btn { background: #667eea; color: white; padding: 12px 24px; border: none; border-radius: 6px; cursor: pointer; font-size: 1em; margin-top: 10px; transition: background 0.3s; }
                .test-btn:hover { background: #5568d3; }
                .output { background: #1f2937; color: #10b981; padding: 16px; border-radius: 6px; font-family: monospace; font-size: 0.85em; margin-top: 10px; max-height: 200px; overflow-y: auto; }
                .loading { color: #999; font-style: italic; }
                .error { color: #ef4444; }
                .success { color: #10b981; }
            </style>
        </head>
        <body>
            <div class="container">
                <header>
                    <h1>🚗 After-Sales API</h1>
                    <p class="status">✓ API Running</p>
                </header>

                <div class="grid">
                    <div class="card">
                        <h2>📋 Customer Endpoints</h2>
                        <div class="endpoint">
                            <span class="method get">GET</span>
                            /api/customer/pms-due-list
                        </div>
                        <button class="test-btn" onclick="testEndpoint('/api/customer/pms-due-list', 'GET', 'customers')">Test</button>
                        <div id="customers" class="output loading">Ready to fetch...</div>
                    </div>

                    <div class="card">
                        <h2>🔍 Search Customer</h2>
                        <div class="endpoint">
                            <span class="method post">POST</span>
                            /api/customer/search
                        </div>
                        <input type="text" id="searchInput" placeholder="Enter plate no, name, or contact" style="width: 100%; padding: 8px; margin: 8px 0; border: 1px solid #ddd; border-radius: 4px;">
                        <select id="searchType" style="width: 100%; padding: 8px; margin: 8px 0; border: 1px solid #ddd; border-radius: 4px;">
                            <option value="plate">Plate Number</option>
                            <option value="name">Customer Name</option>
                            <option value="contact">Contact Number</option>
                        </select>
                        <button class="test-btn" onclick="searchCustomer()">Search</button>
                        <div id="search-result" class="output loading">Ready to search...</div>
                    </div>

                    <div class="card">
                        <h2>📅 Check Availability</h2>
                        <div class="endpoint">
                            <span class="method post">POST</span>
                            /api/scheduler/check-availability
                        </div>
                        <input type="date" id="availDate" style="width: 100%; padding: 8px; margin: 8px 0; border: 1px solid #ddd; border-radius: 4px;">
                        <input type="time" id="availTime" style="width: 100%; padding: 8px; margin: 8px 0; border: 1px solid #ddd; border-radius: 4px;">
                        <button class="test-btn" onclick="checkAvailability()">Check</button>
                        <div id="availability" class="output loading">Ready to check...</div>
                    </div>

                    <div class="card">
                        <h2>ℹ️ API Info</h2>
                        <p style="margin: 10px 0;"><strong>Base URL:</strong> http://localhost:5000</p>
                        <p style="margin: 10px 0;"><strong>Status:</strong> <span class="success">✓ Connected</span></p>
                        <p style="margin: 10px 0;"><strong>Database:</strong> MySQL</p>
                        <button class="test-btn" onclick="testHealth()">Test Connection</button>
                        <div id="health" class="output loading">Ready...</div>
                    </div>
                </div>

                <div style="background: white; border-radius: 12px; padding: 24px; margin-top: 20px;">
                    <h2 style="color: #667eea; margin-bottom: 16px;">📚 API Endpoints</h2>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr style="background: #f8f9fa;">
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Method</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Endpoint</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Description</th>
                        </tr>
                        <tr style="border-bottom: 1px solid #e5e7eb;">
                            <td style="padding: 12px;"><span class="method get">GET</span></td>
                            <td style="padding: 12px;">/api/customer/pms-due-list</td>
                            <td style="padding: 12px;">Get customers due for PMS</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #e5e7eb;">
                            <td style="padding: 12px;"><span class="method post">POST</span></td>
                            <td style="padding: 12px;">/api/customer/search</td>
                            <td style="padding: 12px;">Search customer by plate, name, or contact</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #e5e7eb;">
                            <td style="padding: 12px;"><span class="method post">POST</span></td>
                            <td style="padding: 12px;">/api/customer/register</td>
                            <td style="padding: 12px;">Register a new walk-in customer</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #e5e7eb;">
                            <td style="padding: 12px;"><span class="method post">POST</span></td>
                            <td style="padding: 12px;">/api/scheduler/check-availability</td>
                            <td style="padding: 12px;">Check bay, technician, and advisor availability</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #e5e7eb;">
                            <td style="padding: 12px;"><span class="method post">POST</span></td>
                            <td style="padding: 12px;">/api/scheduler/create-order</td>
                            <td style="padding: 12px;">Create a scheduling order</td>
                        </tr>
                        <tr>
                            <td style="padding: 12px;"><span class="method get">GET</span></td>
                            <td style="padding: 12px;">/api/health</td>
                            <td style="padding: 12px;">Health check</td>
                        </tr>
                    </table>
                </div>
            </div>

            <script>
                async function testEndpoint(url, method, outputId) {
                    const output = document.getElementById(outputId);
                    output.textContent = 'Loading...';
                    try {
                        const response = await fetch(url, { method });
                        const data = await response.json();
                        output.textContent = JSON.stringify(data, null, 2);
                        output.style.color = response.ok ? '#10b981' : '#ef4444';
                    } catch (error) {
                        output.textContent = 'Error: ' + error.message;
                        output.style.color = '#ef4444';
                    }
                }

                function searchCustomer() {
                    const type = document.getElementById('searchType').value;
                    const value = document.getElementById('searchInput').value;
                    if (!value) { alert('Please enter a search value'); return; }
                    
                    fetch('/api/customer/search', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ search_type: type, search_value: value })
                    })
                    .then(r => r.json())
                    .then(data => {
                        const output = document.getElementById('search-result');
                        output.textContent = JSON.stringify(data, null, 2);
                        output.style.color = data.success ? '#10b981' : '#ef4444';
                    })
                    .catch(e => {
                        document.getElementById('search-result').textContent = 'Error: ' + e.message;
                        document.getElementById('search-result').style.color = '#ef4444';
                    });
                }

                function checkAvailability() {
                    const date = document.getElementById('availDate').value;
                    const time = document.getElementById('availTime').value;
                    if (!date || !time) { alert('Please select date and time'); return; }
                    
                    fetch('/api/scheduler/check-availability', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ date, time })
                    })
                    .then(r => r.json())
                    .then(data => {
                        const output = document.getElementById('availability');
                        output.textContent = JSON.stringify(data, null, 2);
                        output.style.color = data.success ? '#10b981' : '#ef4444';
                    })
                    .catch(e => {
                        document.getElementById('availability').textContent = 'Error: ' + e.message;
                        document.getElementById('availability').style.color = '#ef4444';
                    });
                }

                function testHealth() {
                    testEndpoint('/api/health', 'GET', 'health');
                }
            </script>
        </body>
        </html>
        '''
    
    # Cleanup on shutdown
    @app.teardown_appcontext
    def teardown(exception):
        pass
    
    return app
