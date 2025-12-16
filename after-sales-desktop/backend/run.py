#!/usr/bin/env python
"""Run the Flask backend server"""

import os
import sys
from app import create_app

if __name__ == '__main__':
    config_name = os.environ.get('FLASK_ENV', 'development')
    app = create_app(config_name)
    
    print(f"\n{'='*50}")
    print(f"After-Sales API Server - {config_name.upper()}")
    print(f"{'='*50}")
    print(f"Starting server on http://127.0.0.1:5000")
    print(f"{'='*50}\n")
    
    app.run(host='127.0.0.1', port=5000, debug=True)
