SELECT id, status, vehicle_plate_no, customer_id, service_type FROM service_orders WHERE vehicle_plate_no LIKE '%xyz%' OR vehicle_plate_no LIKE '%12345%';

SELECT * FROM customers WHERE name LIKE '%June Aton%';

-- If we find the service order ID, let's say it's X
-- SELECT * FROM vehicle_handovers WHERE service_order_id = X;
-- SELECT * FROM job_wrapups WHERE service_order_id = X;
