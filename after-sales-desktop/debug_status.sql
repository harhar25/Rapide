SELECT status, COUNT(*) FROM service_orders GROUP BY status;
SELECT * FROM vehicle_handovers WHERE status = 'pending';
SELECT * FROM service_orders WHERE status = 'billed' OR status = 'ready-for-release'; -- checking for statuses
