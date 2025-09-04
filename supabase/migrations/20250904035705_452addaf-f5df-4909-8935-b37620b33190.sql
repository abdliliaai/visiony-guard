-- Insert demo organization and tenant
INSERT INTO public.vy_org (id, name) VALUES 
('550e8400-e29b-41d4-a716-446655440000', 'Vision-Y Demo Corp')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.vy_tenant (id, org_id, name, address) VALUES 
('660e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000', 'Main Campus', '123 Security Blvd, Tech City')
ON CONFLICT (id) DO NOTHING;

-- Insert demo devices
INSERT INTO public.vy_device (tenant_id, name, description, location, rtsp_url, enabled, online) VALUES 
('660e8400-e29b-41d4-a716-446655440000', 'Main Entrance Camera', 'Primary entrance monitoring', 'Main Entrance', 'rtsp://demo.camera/stream1', true, true),
('660e8400-e29b-41d4-a716-446655440000', 'Parking Lot Camera', 'Vehicle monitoring and ALPR', 'Parking Lot A', 'rtsp://demo.camera/stream2', true, true),
('660e8400-e29b-41d4-a716-446655440000', 'Warehouse Camera', 'Internal security monitoring', 'Warehouse Floor', 'rtsp://demo.camera/stream3', true, false)
ON CONFLICT DO NOTHING;

-- Insert demo events
INSERT INTO public.vy_event (tenant_id, device_id, type, class_name, confidence, severity, acknowledged, occurred_at) 
SELECT 
  '660e8400-e29b-41d4-a716-446655440000',
  d.id,
  'detection',
  'person',
  0.95,
  'medium',
  false,
  now() - interval '2 hours'
FROM public.vy_device d WHERE d.name = 'Main Entrance Camera' LIMIT 1
ON CONFLICT DO NOTHING;