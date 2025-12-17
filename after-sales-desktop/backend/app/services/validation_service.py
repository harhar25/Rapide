"""
Validation Service for CRO Module
Provides comprehensive input validation for all CRO operations
Production-grade validators with detailed error codes
"""

import re
from datetime import datetime, date
import logging

logger = logging.getLogger(__name__)


class ValidationService:
    """Comprehensive validation for CRO operations"""
    
    # Error codes
    ERROR_CODES = {
        'INVALID_PHONE': 'VAL-001',
        'INVALID_EMAIL': 'VAL-002',
        'INVALID_PLATE_NO': 'VAL-003',
        'INVALID_DATE': 'VAL-004',
        'INVALID_TIME': 'VAL-005',
        'INVALID_NAME': 'VAL-006',
        'INVALID_RESOURCE_ID': 'VAL-007',
        'MISSING_REQUIRED_FIELD': 'VAL-008',
        'INVALID_DURATION': 'VAL-009',
        'INVALID_PRIORITY': 'VAL-010',
        'INVALID_SERVICE_TYPE': 'VAL-011',
        'INVALID_CONTACT_TYPE': 'VAL-012',
        'INVALID_CONTACT_STATUS': 'VAL-013',
        'INVALID_VEHICLE_YEAR': 'VAL-014',
        'INVALID_ENGINE_NO': 'VAL-015',
        'INVALID_CHASSIS_NO': 'VAL-016',
        'INVALID_CUSTOMER_TYPE': 'VAL-017',
        'DATE_IN_PAST': 'VAL-018',
        'TIME_INVALID_FORMAT': 'VAL-019',
        'RESOURCE_NOT_AVAILABLE': 'VAL-020'
    }
    
    # Valid enums
    VALID_CONTACT_TYPES = ['call', 'sms', 'email', 'whatsapp']
    VALID_CONTACT_STATUS = ['attempted', 'connected', 'confirmed', 'not-available', 'declined']
    VALID_SERVICE_TYPES = ['PMS', 'breakdown', 'warranty', 'general']
    VALID_PRIORITIES = ['low', 'normal', 'high', 'urgent']
    VALID_CUSTOMER_TYPES = ['regular', 'corporate', 'government', 'walk-in']
    VALID_REMINDER_TYPES = ['24h', '2h', '30m', 'custom']
    VALID_CONFIRMATION_METHODS = ['sms', 'email', 'whatsapp', 'call']
    
    @staticmethod
    def validate_phone(phone_number):
        """
        Validate phone number format
        Accepts: +1234567890, 1234567890, (123) 456-7890, 123-456-7890
        
        Returns: (is_valid, error_code, error_message)
        """
        try:
            if not phone_number or not isinstance(phone_number, str):
                return False, ValidationService.ERROR_CODES['INVALID_PHONE'], 'Phone number is required'
            
            # Remove common formatting characters
            cleaned = re.sub(r'[\s\-\(\)\.]+', '', phone_number)
            
            # Accept + prefix for international
            if cleaned.startswith('+'):
                cleaned = cleaned[1:]
            
            # Should be at least 10 digits
            if not re.match(r'^\d{10,15}$', cleaned):
                return False, ValidationService.ERROR_CODES['INVALID_PHONE'], \
                    'Phone number must be 10-15 digits'
            
            logger.debug(f"Phone validation passed: {phone_number}")
            return True, None, None
        except Exception as e:
            logger.error(f"Phone validation error: {str(e)}")
            return False, ValidationService.ERROR_CODES['INVALID_PHONE'], str(e)
    
    @staticmethod
    def validate_email(email):
        """
        Validate email format
        
        Returns: (is_valid, error_code, error_message)
        """
        try:
            if not email or not isinstance(email, str):
                return True, None, None  # Email is optional
            
            # RFC 5322 simplified email validation
            pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
            
            if not re.match(pattern, email):
                return False, ValidationService.ERROR_CODES['INVALID_EMAIL'], \
                    'Invalid email format'
            
            if len(email) > 100:
                return False, ValidationService.ERROR_CODES['INVALID_EMAIL'], \
                    'Email is too long (max 100 characters)'
            
            logger.debug(f"Email validation passed: {email}")
            return True, None, None
        except Exception as e:
            logger.error(f"Email validation error: {str(e)}")
            return False, ValidationService.ERROR_CODES['INVALID_EMAIL'], str(e)
    
    @staticmethod
    def validate_plate_no(plate_no):
        """
        Validate vehicle plate number format
        Accepts common formats: ABC-1234, ABC1234, A1B2C3D4
        
        Returns: (is_valid, error_code, error_message)
        """
        try:
            if not plate_no or not isinstance(plate_no, str):
                return False, ValidationService.ERROR_CODES['INVALID_PLATE_NO'], \
                    'Plate number is required'
            
            # Clean whitespace
            plate_no = plate_no.strip()
            
            # Accept alphanumeric with optional dash
            # 4-10 characters total
            if not re.match(r'^[A-Z0-9\-]{4,10}$', plate_no.upper()):
                return False, ValidationService.ERROR_CODES['INVALID_PLATE_NO'], \
                    'Plate number format invalid (alphanumeric, 4-10 chars)'
            
            logger.debug(f"Plate number validation passed: {plate_no}")
            return True, None, None
        except Exception as e:
            logger.error(f"Plate validation error: {str(e)}")
            return False, ValidationService.ERROR_CODES['INVALID_PLATE_NO'], str(e)
    
    @staticmethod
    def validate_name(name, field_name='Name'):
        """
        Validate name field
        
        Returns: (is_valid, error_code, error_message)
        """
        try:
            if not name or not isinstance(name, str):
                return False, ValidationService.ERROR_CODES['INVALID_NAME'], \
                    f'{field_name} is required'
            
            name = name.strip()
            
            # At least 2 characters, max 255
            if len(name) < 2:
                return False, ValidationService.ERROR_CODES['INVALID_NAME'], \
                    f'{field_name} must be at least 2 characters'
            
            if len(name) > 255:
                return False, ValidationService.ERROR_CODES['INVALID_NAME'], \
                    f'{field_name} is too long (max 255 characters)'
            
            # Allow letters, numbers, spaces, hyphens, apostrophes
            if not re.match(r"^[a-zA-Z0-9\s\-'\.]{2,255}$", name):
                return False, ValidationService.ERROR_CODES['INVALID_NAME'], \
                    f'{field_name} contains invalid characters'
            
            logger.debug(f"{field_name} validation passed: {name}")
            return True, None, None
        except Exception as e:
            logger.error(f"Name validation error: {str(e)}")
            return False, ValidationService.ERROR_CODES['INVALID_NAME'], str(e)
    
    @staticmethod
    def validate_date(date_str):
        """
        Validate date format YYYY-MM-DD and ensure it's not in the past
        
        Returns: (is_valid, error_code, error_message)
        """
        try:
            if not date_str or not isinstance(date_str, str):
                return False, ValidationService.ERROR_CODES['INVALID_DATE'], \
                    'Date is required'
            
            # Parse date
            try:
                parsed_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                return False, ValidationService.ERROR_CODES['INVALID_DATE'], \
                    'Date format must be YYYY-MM-DD'
            
            # Check if date is not in past
            if parsed_date < date.today():
                return False, ValidationService.ERROR_CODES['DATE_IN_PAST'], \
                    'Appointment date cannot be in the past'
            
            logger.debug(f"Date validation passed: {date_str}")
            return True, None, None
        except Exception as e:
            logger.error(f"Date validation error: {str(e)}")
            return False, ValidationService.ERROR_CODES['INVALID_DATE'], str(e)
    
    @staticmethod
    def validate_time(time_str):
        """
        Validate time format HH:MM (24-hour format)
        
        Returns: (is_valid, error_code, error_message)
        """
        try:
            if not time_str or not isinstance(time_str, str):
                return False, ValidationService.ERROR_CODES['INVALID_TIME'], \
                    'Time is required'
            
            # Parse time
            try:
                datetime.strptime(time_str, '%H:%M')
            except ValueError:
                return False, ValidationService.ERROR_CODES['TIME_INVALID_FORMAT'], \
                    'Time format must be HH:MM (24-hour format)'
            
            logger.debug(f"Time validation passed: {time_str}")
            return True, None, None
        except Exception as e:
            logger.error(f"Time validation error: {str(e)}")
            return False, ValidationService.ERROR_CODES['INVALID_TIME'], str(e)
    
    @staticmethod
    def validate_duration_hours(duration):
        """
        Validate estimated duration in hours
        
        Returns: (is_valid, error_code, error_message)
        """
        try:
            try:
                duration = float(duration)
            except (ValueError, TypeError):
                return False, ValidationService.ERROR_CODES['INVALID_DURATION'], \
                    'Duration must be a number'
            
            if duration <= 0:
                return False, ValidationService.ERROR_CODES['INVALID_DURATION'], \
                    'Duration must be greater than 0'
            
            if duration > 24:
                return False, ValidationService.ERROR_CODES['INVALID_DURATION'], \
                    'Duration cannot exceed 24 hours'
            
            logger.debug(f"Duration validation passed: {duration}")
            return True, None, None
        except Exception as e:
            logger.error(f"Duration validation error: {str(e)}")
            return False, ValidationService.ERROR_CODES['INVALID_DURATION'], str(e)
    
    @staticmethod
    def validate_priority(priority):
        """
        Validate priority level
        
        Returns: (is_valid, error_code, error_message)
        """
        try:
            if not priority or not isinstance(priority, str):
                return True, None, None  # Priority is optional, defaults to 'normal'
            
            if priority not in ValidationService.VALID_PRIORITIES:
                return False, ValidationService.ERROR_CODES['INVALID_PRIORITY'], \
                    f"Priority must be one of: {', '.join(ValidationService.VALID_PRIORITIES)}"
            
            logger.debug(f"Priority validation passed: {priority}")
            return True, None, None
        except Exception as e:
            logger.error(f"Priority validation error: {str(e)}")
            return False, ValidationService.ERROR_CODES['INVALID_PRIORITY'], str(e)
    
    @staticmethod
    def validate_service_type(service_type):
        """
        Validate service type
        
        Returns: (is_valid, error_code, error_message)
        """
        try:
            if not service_type or not isinstance(service_type, str):
                return True, None, None  # Service type is optional, defaults to 'PMS'
            
            if service_type not in ValidationService.VALID_SERVICE_TYPES:
                return False, ValidationService.ERROR_CODES['INVALID_SERVICE_TYPE'], \
                    f"Service type must be one of: {', '.join(ValidationService.VALID_SERVICE_TYPES)}"
            
            logger.debug(f"Service type validation passed: {service_type}")
            return True, None, None
        except Exception as e:
            logger.error(f"Service type validation error: {str(e)}")
            return False, ValidationService.ERROR_CODES['INVALID_SERVICE_TYPE'], str(e)
    
    @staticmethod
    def validate_contact_type(contact_type):
        """
        Validate contact type
        
        Returns: (is_valid, error_code, error_message)
        """
        try:
            if not contact_type or not isinstance(contact_type, str):
                return False, ValidationService.ERROR_CODES['INVALID_CONTACT_TYPE'], \
                    'Contact type is required'
            
            if contact_type not in ValidationService.VALID_CONTACT_TYPES:
                return False, ValidationService.ERROR_CODES['INVALID_CONTACT_TYPE'], \
                    f"Contact type must be one of: {', '.join(ValidationService.VALID_CONTACT_TYPES)}"
            
            logger.debug(f"Contact type validation passed: {contact_type}")
            return True, None, None
        except Exception as e:
            logger.error(f"Contact type validation error: {str(e)}")
            return False, ValidationService.ERROR_CODES['INVALID_CONTACT_TYPE'], str(e)
    
    @staticmethod
    def validate_contact_status(status):
        """
        Validate contact status
        
        Returns: (is_valid, error_code, error_message)
        """
        try:
            if not status or not isinstance(status, str):
                return True, None, None  # Status is optional, defaults to 'attempted'
            
            if status not in ValidationService.VALID_CONTACT_STATUS:
                return False, ValidationService.ERROR_CODES['INVALID_CONTACT_STATUS'], \
                    f"Status must be one of: {', '.join(ValidationService.VALID_CONTACT_STATUS)}"
            
            logger.debug(f"Contact status validation passed: {status}")
            return True, None, None
        except Exception as e:
            logger.error(f"Contact status validation error: {str(e)}")
            return False, ValidationService.ERROR_CODES['INVALID_CONTACT_STATUS'], str(e)
    
    @staticmethod
    def validate_vehicle_year(year):
        """
        Validate vehicle year
        
        Returns: (is_valid, error_code, error_message)
        """
        try:
            if not year:
                return True, None, None  # Year is optional
            
            try:
                year_int = int(year)
            except (ValueError, TypeError):
                return False, ValidationService.ERROR_CODES['INVALID_VEHICLE_YEAR'], \
                    'Year must be a number'
            
            current_year = datetime.now().year
            
            if year_int < 1900:
                return False, ValidationService.ERROR_CODES['INVALID_VEHICLE_YEAR'], \
                    'Year must be 1900 or later'
            
            if year_int > current_year + 1:
                return False, ValidationService.ERROR_CODES['INVALID_VEHICLE_YEAR'], \
                    f'Year cannot be in the future (max {current_year + 1})'
            
            logger.debug(f"Vehicle year validation passed: {year_int}")
            return True, None, None
        except Exception as e:
            logger.error(f"Vehicle year validation error: {str(e)}")
            return False, ValidationService.ERROR_CODES['INVALID_VEHICLE_YEAR'], str(e)
    
    @staticmethod
    def validate_engine_no(engine_no):
        """
        Validate engine number format
        
        Returns: (is_valid, error_code, error_message)
        """
        try:
            if not engine_no:
                return True, None, None  # Engine no is optional
            
            if not isinstance(engine_no, str):
                return False, ValidationService.ERROR_CODES['INVALID_ENGINE_NO'], \
                    'Engine number must be text'
            
            engine_no = engine_no.strip()
            
            if len(engine_no) < 3:
                return False, ValidationService.ERROR_CODES['INVALID_ENGINE_NO'], \
                    'Engine number must be at least 3 characters'
            
            if len(engine_no) > 50:
                return False, ValidationService.ERROR_CODES['INVALID_ENGINE_NO'], \
                    'Engine number is too long (max 50 characters)'
            
            # Allow alphanumeric and special characters
            if not re.match(r'^[a-zA-Z0-9\-\.\/]{3,50}$', engine_no):
                return False, ValidationService.ERROR_CODES['INVALID_ENGINE_NO'], \
                    'Engine number contains invalid characters'
            
            logger.debug(f"Engine number validation passed: {engine_no}")
            return True, None, None
        except Exception as e:
            logger.error(f"Engine number validation error: {str(e)}")
            return False, ValidationService.ERROR_CODES['INVALID_ENGINE_NO'], str(e)
    
    @staticmethod
    def validate_chassis_no(chassis_no):
        """
        Validate chassis/VIN number format
        
        Returns: (is_valid, error_code, error_message)
        """
        try:
            if not chassis_no:
                return True, None, None  # Chassis no is optional
            
            if not isinstance(chassis_no, str):
                return False, ValidationService.ERROR_CODES['INVALID_CHASSIS_NO'], \
                    'Chassis number must be text'
            
            chassis_no = chassis_no.strip()
            
            if len(chassis_no) < 6:
                return False, ValidationService.ERROR_CODES['INVALID_CHASSIS_NO'], \
                    'Chassis number must be at least 6 characters'
            
            if len(chassis_no) > 50:
                return False, ValidationService.ERROR_CODES['INVALID_CHASSIS_NO'], \
                    'Chassis number is too long (max 50 characters)'
            
            # VIN can contain letters and numbers (not I, O, Q)
            if not re.match(r'^[a-hA-HJ-NPR-Z0-9]{6,50}$', chassis_no):
                return False, ValidationService.ERROR_CODES['INVALID_CHASSIS_NO'], \
                    'Chassis number format invalid (no I, O, Q allowed in VIN)'
            
            logger.debug(f"Chassis number validation passed: {chassis_no}")
            return True, None, None
        except Exception as e:
            logger.error(f"Chassis number validation error: {str(e)}")
            return False, ValidationService.ERROR_CODES['INVALID_CHASSIS_NO'], str(e)
    
    @staticmethod
    def validate_customer_type(customer_type):
        """
        Validate customer type
        
        Returns: (is_valid, error_code, error_message)
        """
        try:
            if not customer_type or not isinstance(customer_type, str):
                return True, None, None  # Optional, defaults to 'regular'
            
            if customer_type not in ValidationService.VALID_CUSTOMER_TYPES:
                return False, ValidationService.ERROR_CODES['INVALID_CUSTOMER_TYPE'], \
                    f"Customer type must be one of: {', '.join(ValidationService.VALID_CUSTOMER_TYPES)}"
            
            logger.debug(f"Customer type validation passed: {customer_type}")
            return True, None, None
        except Exception as e:
            logger.error(f"Customer type validation error: {str(e)}")
            return False, ValidationService.ERROR_CODES['INVALID_CUSTOMER_TYPE'], str(e)
    
    @staticmethod
    def validate_resource_ids(bay_id, technician_id, advisor_id):
        """
        Validate that resource IDs are positive integers
        
        Returns: (is_valid, error_code, error_message)
        """
        try:
            for resource_id, name in [(bay_id, 'Bay'), (technician_id, 'Technician'), 
                                       (advisor_id, 'Advisor')]:
                if resource_id is None:
                    continue  # Optional
                
                try:
                    rid = int(resource_id)
                    if rid <= 0:
                        return False, ValidationService.ERROR_CODES['INVALID_RESOURCE_ID'], \
                            f'{name} ID must be a positive integer'
                except (ValueError, TypeError):
                    return False, ValidationService.ERROR_CODES['INVALID_RESOURCE_ID'], \
                        f'{name} ID must be an integer'
            
            logger.debug(f"Resource IDs validation passed")
            return True, None, None
        except Exception as e:
            logger.error(f"Resource IDs validation error: {str(e)}")
            return False, ValidationService.ERROR_CODES['INVALID_RESOURCE_ID'], str(e)
    
    @staticmethod
    def validate_confirmation_method(method):
        """
        Validate confirmation method
        
        Returns: (is_valid, error_code, error_message)
        """
        try:
            if not method or not isinstance(method, str):
                return True, None, None  # Optional, defaults to 'sms'
            
            if method not in ValidationService.VALID_CONFIRMATION_METHODS:
                return False, ValidationService.ERROR_CODES['INVALID_CONTACT_TYPE'], \
                    f"Method must be one of: {', '.join(ValidationService.VALID_CONFIRMATION_METHODS)}"
            
            logger.debug(f"Confirmation method validation passed: {method}")
            return True, None, None
        except Exception as e:
            logger.error(f"Confirmation method validation error: {str(e)}")
            return False, ValidationService.ERROR_CODES['INVALID_CONTACT_TYPE'], str(e)
    
    @staticmethod
    def validate_create_customer_request(data):
        """
        Comprehensive validation for customer creation
        
        Returns: (is_valid, errors_dict)
        """
        errors = {}
        
        # Validate required fields
        required_fields = ['name', 'contact_no', 'plate_no', 'vehicle_model']
        for field in required_fields:
            if not data.get(field):
                errors[field] = f'{field} is required'
        
        # Validate name
        if data.get('name'):
            is_valid, error_code, error_msg = ValidationService.validate_name(data.get('name'))
            if not is_valid:
                errors['name'] = error_msg
        
        # Validate phone
        if data.get('contact_no'):
            is_valid, error_code, error_msg = ValidationService.validate_phone(data.get('contact_no'))
            if not is_valid:
                errors['contact_no'] = error_msg
        
        # Validate plate
        if data.get('plate_no'):
            is_valid, error_code, error_msg = ValidationService.validate_plate_no(data.get('plate_no'))
            if not is_valid:
                errors['plate_no'] = error_msg
        
        # Validate email (optional)
        if data.get('email'):
            is_valid, error_code, error_msg = ValidationService.validate_email(data.get('email'))
            if not is_valid:
                errors['email'] = error_msg
        
        # Validate vehicle year (optional)
        if data.get('vehicle_year'):
            is_valid, error_code, error_msg = ValidationService.validate_vehicle_year(data.get('vehicle_year'))
            if not is_valid:
                errors['vehicle_year'] = error_msg
        
        # Validate engine no (optional)
        if data.get('engine_no'):
            is_valid, error_code, error_msg = ValidationService.validate_engine_no(data.get('engine_no'))
            if not is_valid:
                errors['engine_no'] = error_msg
        
        # Validate chassis no (optional)
        if data.get('chassis_no'):
            is_valid, error_code, error_msg = ValidationService.validate_chassis_no(data.get('chassis_no'))
            if not is_valid:
                errors['chassis_no'] = error_msg
        
        # Validate customer type (optional)
        if data.get('customer_type'):
            is_valid, error_code, error_msg = ValidationService.validate_customer_type(data.get('customer_type'))
            if not is_valid:
                errors['customer_type'] = error_msg
        
        return len(errors) == 0, errors
    
    @staticmethod
    def validate_scheduling_order_request(data):
        """
        Comprehensive validation for scheduling order creation
        
        Returns: (is_valid, errors_dict)
        """
        errors = {}
        
        # Validate required fields
        required_fields = ['customer_id', 'scheduled_date', 'scheduled_time', 'bay_id', 
                          'technician_id', 'advisor_id']
        for field in required_fields:
            if not data.get(field):
                errors[field] = f'{field} is required'
        
        # Validate date
        if data.get('scheduled_date'):
            is_valid, error_code, error_msg = ValidationService.validate_date(data.get('scheduled_date'))
            if not is_valid:
                errors['scheduled_date'] = error_msg
        
        # Validate time
        if data.get('scheduled_time'):
            is_valid, error_code, error_msg = ValidationService.validate_time(data.get('scheduled_time'))
            if not is_valid:
                errors['scheduled_time'] = error_msg
        
        # Validate resource IDs
        is_valid, error_code, error_msg = ValidationService.validate_resource_ids(
            data.get('bay_id'), data.get('technician_id'), data.get('advisor_id')
        )
        if not is_valid:
            errors['resources'] = error_msg
        
        # Validate service type (optional)
        if data.get('service_type'):
            is_valid, error_code, error_msg = ValidationService.validate_service_type(data.get('service_type'))
            if not is_valid:
                errors['service_type'] = error_msg
        
        # Validate priority (optional)
        if data.get('priority'):
            is_valid, error_code, error_msg = ValidationService.validate_priority(data.get('priority'))
            if not is_valid:
                errors['priority'] = error_msg
        
        # Validate duration (optional)
        if data.get('estimated_duration_hours'):
            is_valid, error_code, error_msg = ValidationService.validate_duration_hours(data.get('estimated_duration_hours'))
            if not is_valid:
                errors['estimated_duration_hours'] = error_msg
        
        return len(errors) == 0, errors
