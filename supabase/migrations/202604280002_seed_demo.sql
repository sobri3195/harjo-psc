insert into ambulances (id, plate_number, status, equipment_ready, current_location, last_heartbeat_at)
values
('AMB-01', 'B 1201 HJO', 'available', true, ST_SetSRID(ST_MakePoint(106.8456, -6.2088), 4326)::geography, now()),
('AMB-02', 'B 1202 HJO', 'en_route', true, ST_SetSRID(ST_MakePoint(106.8650, -6.1751), 4326)::geography, now()),
('AMB-03', 'B 1203 HJO', 'maintenance', false, ST_SetSRID(ST_MakePoint(106.9000, -6.2100), 4326)::geography, now())
on conflict (id) do nothing;

insert into ambulance_equipment (ambulance_id, equipment_code, equipment_name, quantity, min_required, is_ready)
values
('AMB-01', 'OXY', 'Oxygen Tank', 2, 1, true),
('AMB-01', 'AED', 'Defibrillator', 1, 1, true),
('AMB-02', 'OXY', 'Oxygen Tank', 1, 1, true),
('AMB-02', 'AED', 'Defibrillator', 0, 1, false)
on conflict (ambulance_id, equipment_code) do nothing;

insert into ambulance_tracking (ambulance_id, status, latitude, longitude, fuel_percent, oxygen_percent, equipment_ready, accuracy_meters, speed_kph, heading)
values
('AMB-01', 'available', -6.2088, 106.8456, 86, 92, true, 5.4, 0, 0),
('AMB-02', 'en_route', -6.1751, 106.8650, 71, 80, true, 7.1, 45, 180);

insert into anonymous_emergency_sessions (token_hash, nickname, expires_at)
values
('anon-session-001-hash', 'Pelapor Anonim', now() + interval '1 hour')
on conflict (token_hash) do nothing;

insert into emergency_reports (type, severity, victim_count, description, location, status, anonymous_reporter_name, address_text)
values
('Kecelakaan', 'berat', 2, 'Tabrakan beruntun di simpang utama', ST_SetSRID(ST_MakePoint(106.84513, -6.21462), 4326)::geography, 'dispatching', 'Pelapor Internal', 'Simpang Harmoni'),
('Jantung', 'kritis', 1, 'Pasien sesak napas dan nyeri dada', ST_SetSRID(ST_MakePoint(106.8272, -6.1754), 4326)::geography, 'ambulance_assigned', 'Anonim', 'Dekat Monas')
on conflict do nothing;

insert into alert_broadcasts (title, message, priority, target_audience, area_scope)
values
('Kondisi Cuaca Ekstrem', 'Waspada hujan deras dan banjir di Jakarta Pusat.', 'high', 'all_field_team', 'jakarta_pusat');

insert into notification_queue (user_id, title, body, payload, priority, status)
values
(null, 'Dispatch Baru', 'Ambulans terdekat diminta merespon insiden kritis.', '{"source":"seed"}'::jsonb, 'high', 'pending'),
(null, 'Reminder Equipment', 'Lakukan pengecekan AED sebelum shift malam.', '{"source":"seed"}'::jsonb, 'normal', 'pending');
