insert into ambulance_tracking (ambulance_id, status, latitude, longitude, fuel_percent, oxygen_percent, equipment_ready)
values
('AMB-01', 'available', -6.2088, 106.8456, 86, 92, true),
('AMB-02', 'en_route', -6.1751, 106.8650, 71, 80, true);

insert into emergency_reports (type, severity, victim_count, description, location, status, anonymous_reporter_name)
values
('Kecelakaan', 'berat', 2, 'Tabrakan beruntun di simpang utama', ST_SetSRID(ST_MakePoint(106.84513, -6.21462), 4326)::geography, 'dispatching', 'Pelapor Internal'),
('Jantung', 'kritis', 1, 'Pasien sesak napas dan nyeri dada', ST_SetSRID(ST_MakePoint(106.8272, -6.1754), 4326)::geography, 'ambulance_assigned', 'Anonim');
