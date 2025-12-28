#!/usr/bin/env python
"""
Validate all imports and detect syntax/import errors in the application
"""

import sys
import importlib.util
from pathlib import Path

def check_module(module_path, module_name):
    """Check if a module can be imported without errors"""
    try:
        spec = importlib.util.spec_from_file_location(module_name, module_path)
        if spec is None:
            return False, f"Could not load spec for {module_name}"
        
        module = importlib.util.module_from_spec(spec)
        sys.modules[module_name] = module
        spec.loader.exec_module(module)
        return True, None
    except Exception as e:
        return False, str(e)

def main():
    print("="*60)
    print("VALIDATING ALL BACKEND MODULES")
    print("="*60)
    
    backend_path = Path(__file__).parent
    errors_found = []
    modules_checked = 0
    
    # Check services
    print("\n[1] Checking Services...")
    services_path = backend_path / "app" / "services"
    for service_file in services_path.glob("*.py"):
        if service_file.name == "__init__.py":
            continue
        
        modules_checked += 1
        module_name = f"app.services.{service_file.stem}"
        success, error = check_module(service_file, module_name)
        
        if success:
            print(f"  ✓ {service_file.name}")
        else:
            print(f"  ✗ {service_file.name}: {error}")
            errors_found.append({
                'file': str(service_file),
                'module': module_name,
                'error': error
            })
    
    # Check routes
    print("\n[2] Checking Routes...")
    routes_path = backend_path / "app" / "routes"
    for route_file in routes_path.glob("*.py"):
        if route_file.name == "__init__.py":
            continue
        
        modules_checked += 1
        module_name = f"app.routes.{route_file.stem}"
        success, error = check_module(route_file, module_name)
        
        if success:
            print(f"  ✓ {route_file.name}")
        else:
            print(f"  ✗ {route_file.name}: {error}")
            errors_found.append({
                'file': str(route_file),
                'module': module_name,
                'error': error
            })
    
    # Check main app
    print("\n[3] Checking Main Application...")
    app_init = backend_path / "app" / "__init__.py"
    success, error = check_module(app_init, "app")
    modules_checked += 1
    
    if success:
        print(f"  ✓ app/__init__.py")
    else:
        print(f"  ✗ app/__init__.py: {error}")
        errors_found.append({
            'file': str(app_init),
            'module': 'app',
            'error': error
        })
    
    # Summary
    print("\n" + "="*60)
    print("VALIDATION SUMMARY")
    print("="*60)
    print(f"Modules Checked: {modules_checked}")
    print(f"✓ Passed: {modules_checked - len(errors_found)}")
    print(f"✗ Failed: {len(errors_found)}")
    
    if errors_found:
        print("\n" + "="*60)
        print("ERRORS FOUND:")
        print("="*60)
        for i, error in enumerate(errors_found, 1):
            print(f"\n{i}. {error['module']}")
            print(f"   File: {error['file']}")
            print(f"   Error: {error['error'][:200]}")
        return 1
    else:
        print("\n🎉 ALL MODULES VALIDATED SUCCESSFULLY - NO ERRORS!")
        return 0

if __name__ == "__main__":
    sys.exit(main())
