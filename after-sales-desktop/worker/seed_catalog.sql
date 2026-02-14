-- Rapide Service Catalog - Comprehensive Auto Services
-- PMS (Preventive Maintenance Service)
INSERT INTO service_catalog (service_name, category, vehicle_type, base_price, labor_hours, description, status) VALUES
('PMS 1 - Basic (5,000 km)', 'PMS', 'All', 3500.00, 1.0, 'Oil change, oil filter, visual inspection, tire pressure check', 'active');
INSERT INTO service_catalog (service_name, category, vehicle_type, base_price, labor_hours, description, status) VALUES
('PMS 2 - Minor (10,000 km)', 'PMS', 'All', 5500.00, 1.5, 'Oil & filter change, air filter, cabin filter, brake inspection, fluid top-up', 'active');
INSERT INTO service_catalog (service_name, category, vehicle_type, base_price, labor_hours, description, status) VALUES
('PMS 3 - Intermediate (20,000 km)', 'PMS', 'All', 8500.00, 2.0, 'PMS 2 + spark plugs, fuel filter, transmission fluid check, belt inspection', 'active');
INSERT INTO service_catalog (service_name, category, vehicle_type, base_price, labor_hours, description, status) VALUES
('PMS 4 - Major (40,000 km)', 'PMS', 'All', 15000.00, 3.0, 'PMS 3 + timing belt/chain inspect, coolant flush, brake fluid change, ATF change', 'active');
INSERT INTO service_catalog (service_name, category, vehicle_type, base_price, labor_hours, description, status) VALUES
('PMS 5 - Complete (60,000 km)', 'PMS', 'All', 22000.00, 4.0, 'Full system overhaul: all fluids, all filters, belts, plugs, valve adjustment', 'active');

-- General Repair
INSERT INTO service_catalog (service_name, category, vehicle_type, base_price, labor_hours, description, status) VALUES
('Engine Tune-Up', 'General Repair', 'All', 4500.00, 2.0, 'Spark plug replacement, ignition timing, idle adjustment, throttle body cleaning', 'active');
INSERT INTO service_catalog (service_name, category, vehicle_type, base_price, labor_hours, description, status) VALUES
('Radiator Flush & Coolant Change', 'General Repair', 'All', 2500.00, 1.0, 'Drain old coolant, flush radiator, refill with new coolant, pressure test', 'active');
INSERT INTO service_catalog (service_name, category, vehicle_type, base_price, labor_hours, description, status) VALUES
('Timing Belt Replacement', 'General Repair', 'All', 12000.00, 4.0, 'Remove and replace timing belt, check tensioner and water pump', 'active');
INSERT INTO service_catalog (service_name, category, vehicle_type, base_price, labor_hours, description, status) VALUES
('Drive Belt Replacement', 'General Repair', 'All', 3500.00, 1.0, 'Serpentine/V-belt replacement and tensioner check', 'active');
INSERT INTO service_catalog (service_name, category, vehicle_type, base_price, labor_hours, description, status) VALUES
('Water Pump Replacement', 'General Repair', 'All', 6000.00, 3.0, 'Remove and replace water pump, new gasket, coolant refill', 'active');
INSERT INTO service_catalog (service_name, category, vehicle_type, base_price, labor_hours, description, status) VALUES
('Clutch Assembly Replacement', 'General Repair', 'All', 15000.00, 5.0, 'Clutch disc, pressure plate, release bearing replacement', 'active');
INSERT INTO service_catalog (service_name, category, vehicle_type, base_price, labor_hours, description, status) VALUES
('Engine Mount Replacement', 'General Repair', 'All', 4000.00, 2.0, 'Replace worn engine mounts, check transmission mount', 'active');
INSERT INTO service_catalog (service_name, category, vehicle_type, base_price, labor_hours, description, status) VALUES
('Exhaust System Repair', 'General Repair', 'All', 5000.00, 2.0, 'Muffler repair/replace, exhaust pipe welding, gasket replacement', 'active');

-- Brakes
INSERT INTO service_catalog (service_name, category, vehicle_type, base_price, labor_hours, description, status) VALUES
('Brake Pad Replacement (Front)', 'Brakes', 'All', 3000.00, 1.0, 'Front brake pad replacement with inspection of rotors and calipers', 'active');
INSERT INTO service_catalog (service_name, category, vehicle_type, base_price, labor_hours, description, status) VALUES
('Brake Pad Replacement (Rear)', 'Brakes', 'All', 3000.00, 1.0, 'Rear brake pad replacement with inspection of rotors and calipers', 'active');
INSERT INTO service_catalog (service_name, category, vehicle_type, base_price, labor_hours, description, status) VALUES
('Brake Disc/Rotor Resurfacing', 'Brakes', 'All', 2000.00, 1.5, 'Machine resurface brake rotors (per pair)', 'active');
INSERT INTO service_catalog (service_name, category, vehicle_type, base_price, labor_hours, description, status) VALUES
('Brake Fluid Change', 'Brakes', 'All', 1500.00, 0.5, 'Complete brake fluid drain and refill with DOT 3/4 fluid', 'active');
INSERT INTO service_catalog (service_name, category, vehicle_type, base_price, labor_hours, description, status) VALUES
('Brake Caliper Overhaul', 'Brakes', 'All', 5000.00, 2.0, 'Caliper rebuild kit, piston seal, dust boot replacement', 'active');

-- A/C & Cooling
INSERT INTO service_catalog (service_name, category, vehicle_type, base_price, labor_hours, description, status) VALUES
('A/C System Recharge', 'A/C & Cooling', 'All', 2500.00, 1.0, 'Evacuate old refrigerant, vacuum test, recharge with R-134a', 'active');
INSERT INTO service_catalog (service_name, category, vehicle_type, base_price, labor_hours, description, status) VALUES
('A/C Compressor Replacement', 'A/C & Cooling', 'All', 15000.00, 3.0, 'Remove and replace compressor, evacuate and recharge system', 'active');
INSERT INTO service_catalog (service_name, category, vehicle_type, base_price, labor_hours, description, status) VALUES
('A/C Evaporator Cleaning', 'A/C & Cooling', 'All', 3500.00, 2.0, 'Dashboard removal, evaporator foam cleaning, cabin filter replacement', 'active');
INSERT INTO service_catalog (service_name, category, vehicle_type, base_price, labor_hours, description, status) VALUES
('A/C Condenser Replacement', 'A/C & Cooling', 'All', 8000.00, 2.5, 'Remove and replace condenser, leak test, system recharge', 'active');

-- Electrical
INSERT INTO service_catalog (service_name, category, vehicle_type, base_price, labor_hours, description, status) VALUES
('Battery Replacement & Test', 'Electrical', 'All', 5500.00, 0.5, 'Load test old battery, install new battery, terminal cleaning', 'active');
INSERT INTO service_catalog (service_name, category, vehicle_type, base_price, labor_hours, description, status) VALUES
('Alternator Replacement', 'Electrical', 'All', 6000.00, 2.0, 'Remove and replace alternator, belt adjustment, charging test', 'active');
INSERT INTO service_catalog (service_name, category, vehicle_type, base_price, labor_hours, description, status) VALUES
('Starter Motor Replacement', 'Electrical', 'All', 5000.00, 2.0, 'Remove and replace starter motor, wiring inspection', 'active');
INSERT INTO service_catalog (service_name, category, vehicle_type, base_price, labor_hours, description, status) VALUES
('Headlight Bulb Replacement', 'Electrical', 'All', 1500.00, 0.5, 'Replace headlight bulb (halogen/LED/HID), aim adjustment', 'active');
INSERT INTO service_catalog (service_name, category, vehicle_type, base_price, labor_hours, description, status) VALUES
('Electrical Diagnosis', 'Electrical', 'All', 2000.00, 1.0, 'Multimeter testing, wiring trace, fuse check, ECU scan', 'active');

-- Tires & Wheels
INSERT INTO service_catalog (service_name, category, vehicle_type, base_price, labor_hours, description, status) VALUES
('Tire Rotation & Balance (4 tires)', 'Tires & Wheels', 'All', 1200.00, 0.5, 'Rotate all 4 tires, computer wheel balancing', 'active');
INSERT INTO service_catalog (service_name, category, vehicle_type, base_price, labor_hours, description, status) VALUES
('Wheel Alignment (4 wheels)', 'Tires & Wheels', 'All', 2500.00, 1.0, 'Computerized 4-wheel alignment: camber, caster, toe adjustment', 'active');
INSERT INTO service_catalog (service_name, category, vehicle_type, base_price, labor_hours, description, status) VALUES
('Flat Tire Repair (Vulcanizing)', 'Tires & Wheels', 'All', 500.00, 0.5, 'Tire patch/plug repair, remount and balance', 'active');
INSERT INTO service_catalog (service_name, category, vehicle_type, base_price, labor_hours, description, status) VALUES
('New Tire Installation (per tire)', 'Tires & Wheels', 'All', 800.00, 0.5, 'Mount new tire, balance, valve stem, old tire disposal', 'active');

-- Transmission
INSERT INTO service_catalog (service_name, category, vehicle_type, base_price, labor_hours, description, status) VALUES
('ATF Change (Automatic)', 'Transmission', 'All', 4000.00, 1.0, 'Drain and refill automatic transmission fluid, filter check', 'active');
INSERT INTO service_catalog (service_name, category, vehicle_type, base_price, labor_hours, description, status) VALUES
('CVT Fluid Change', 'Transmission', 'All', 5500.00, 1.5, 'Drain and refill CVT fluid with manufacturer-spec fluid', 'active');
INSERT INTO service_catalog (service_name, category, vehicle_type, base_price, labor_hours, description, status) VALUES
('Manual Transmission Oil Change', 'Transmission', 'All', 2500.00, 1.0, 'Drain and refill gear oil, inspect for leaks', 'active');

-- Body/Paint
INSERT INTO service_catalog (service_name, category, vehicle_type, base_price, labor_hours, description, status) VALUES
('Scratch & Dent Repair (Minor)', 'Body', 'All', 3500.00, 2.0, 'Surface scratch repair, touch-up paint, clear coat', 'active');
INSERT INTO service_catalog (service_name, category, vehicle_type, base_price, labor_hours, description, status) VALUES
('Panel Repaint (per panel)', 'Body', 'All', 8000.00, 4.0, 'Sand, prime, base coat, clear coat for one panel', 'active');
INSERT INTO service_catalog (service_name, category, vehicle_type, base_price, labor_hours, description, status) VALUES
('Windshield Replacement', 'Body', 'All', 12000.00, 2.0, 'Remove old windshield, install new with sealant, cure time', 'active');
INSERT INTO service_catalog (service_name, category, vehicle_type, base_price, labor_hours, description, status) VALUES
('Bumper Repair', 'Body', 'All', 5000.00, 3.0, 'Bumper removal, repair cracks/dents, repaint, reinstall', 'active');

-- Detailing
INSERT INTO service_catalog (service_name, category, vehicle_type, base_price, labor_hours, description, status) VALUES
('Basic Wash & Vacuum', 'Detailing', 'All', 500.00, 0.5, 'Exterior hand wash, interior vacuum, window cleaning', 'active');
INSERT INTO service_catalog (service_name, category, vehicle_type, base_price, labor_hours, description, status) VALUES
('Full Interior Detailing', 'Detailing', 'All', 3500.00, 3.0, 'Deep clean seats, carpet shampoo, dashboard treatment, leather conditioning', 'active');
INSERT INTO service_catalog (service_name, category, vehicle_type, base_price, labor_hours, description, status) VALUES
('Exterior Polish & Wax', 'Detailing', 'All', 3000.00, 2.0, 'Clay bar treatment, machine polish, carnauba wax application', 'active');
INSERT INTO service_catalog (service_name, category, vehicle_type, base_price, labor_hours, description, status) VALUES
('Engine Bay Cleaning', 'Detailing', 'All', 1500.00, 1.0, 'Degrease engine bay, pressure wash, dress plastics', 'active');
INSERT INTO service_catalog (service_name, category, vehicle_type, base_price, labor_hours, description, status) VALUES
('Ceramic Coating Application', 'Detailing', 'All', 15000.00, 6.0, 'Paint correction, surface prep, 9H ceramic coat application, 24hr cure', 'active');

-- Diagnosis
INSERT INTO service_catalog (service_name, category, vehicle_type, base_price, labor_hours, description, status) VALUES
('OBD-II Computer Scan', 'Diagnosis', 'All', 500.00, 0.5, 'Read and clear diagnostic trouble codes (DTCs), freeze frame data', 'active');
INSERT INTO service_catalog (service_name, category, vehicle_type, base_price, labor_hours, description, status) VALUES
('Full Vehicle Inspection (52-Point)', 'Diagnosis', 'All', 2500.00, 2.0, 'Comprehensive 52-point inspection covering all major systems', 'active');
INSERT INTO service_catalog (service_name, category, vehicle_type, base_price, labor_hours, description, status) VALUES
('Pre-Purchase Inspection', 'Diagnosis', 'All', 3000.00, 2.0, 'Buyer inspection: mechanical, electrical, body, road test, report', 'active');
INSERT INTO service_catalog (service_name, category, vehicle_type, base_price, labor_hours, description, status) VALUES
('Emissions Test & Tune', 'Diagnosis', 'All', 2000.00, 1.0, 'Exhaust gas analysis, tune for emissions compliance', 'active');

-- Accessories
INSERT INTO service_catalog (service_name, category, vehicle_type, base_price, labor_hours, description, status) VALUES
('Dashcam Installation', 'Accessories', 'All', 1500.00, 1.0, 'Hardwire dashcam, cable routing, parking mode setup', 'active');
INSERT INTO service_catalog (service_name, category, vehicle_type, base_price, labor_hours, description, status) VALUES
('Window Tint (Full Car)', 'Accessories', 'All', 5000.00, 3.0, 'Apply window tint film to all windows (excluding windshield)', 'active');
INSERT INTO service_catalog (service_name, category, vehicle_type, base_price, labor_hours, description, status) VALUES
('Seat Cover Installation', 'Accessories', 'All', 2000.00, 1.0, 'Custom-fit seat cover installation for all seats', 'active');
INSERT INTO service_catalog (service_name, category, vehicle_type, base_price, labor_hours, description, status) VALUES
('Alarm/Immobilizer Installation', 'Accessories', 'All', 4500.00, 2.0, 'Car alarm system with immobilizer, remote, siren installation', 'active');
