-- Add demo devices for the existing tenant
INSERT INTO vy_device (tenant_id, name, description, location, rtsp_url, enabled, online, last_seen) VALUES
('3e218cb3-4804-4a80-afd0-5ded45f54cad', 'Main Entrance', 'Front door security camera', 'Building Entrance', 'rtsp://demo.camera/stream1', true, true, now()),
('3e218cb3-4804-4a80-afd0-5ded45f54cad', 'Parking Garage', 'Underground parking surveillance', 'Level B1 Parking', 'rtsp://demo.camera/stream2', true, true, now() - interval '2 minutes'),
('3e218cb3-4804-4a80-afd0-5ded45f54cad', 'Loading Dock', 'Rear loading area monitor', 'Service Area', 'rtsp://demo.camera/stream3', true, false, now() - interval '1 hour'),
('3e218cb3-4804-4a80-afd0-5ded45f54cad', 'Lobby Camera', 'Main lobby overview', 'Reception Area', 'rtsp://demo.camera/stream4', true, true, now() - interval '30 seconds')
ON CONFLICT DO NOTHING;

-- Add demo events for the devices (get device IDs first, then add events)
WITH device_ids AS (
  SELECT id, name FROM vy_device WHERE tenant_id = '3e218cb3-4804-4a80-afd0-5ded45f54cad'
)
INSERT INTO vy_event (tenant_id, device_id, type, class_name, confidence, severity, bbox, meta, occurred_at) 
SELECT 
  '3e218cb3-4804-4a80-afd0-5ded45f54cad',
  d.id,
  'detection',
  'person',
  0.85,
  'low',
  '{"x": 100, "y": 150, "width": 80, "height": 200}',
  '{"alert_type": "motion_detected", "zone": "entrance"}',
  now() - interval '5 minutes'
FROM device_ids d WHERE d.name = 'Main Entrance'

UNION ALL

SELECT 
  '3e218cb3-4804-4a80-afd0-5ded45f54cad',
  d.id,
  'detection', 
  'car',
  0.92,
  'medium',
  '{"x": 200, "y": 100, "width": 150, "height": 100}',
  '{"alert_type": "vehicle_detected", "license_plate": "ABC123"}',
  now() - interval '15 minutes'
FROM device_ids d WHERE d.name = 'Parking Garage'

UNION ALL

SELECT 
  '3e218cb3-4804-4a80-afd0-5ded45f54cad',
  d.id,
  'alert',
  'person',
  0.78,
  'high',
  '{"x": 50, "y": 200, "width": 60, "height": 180}',
  '{"alert_type": "unauthorized_access", "zone": "restricted"}',
  now() - interval '1 hour'
FROM device_ids d WHERE d.name = 'Loading Dock'

UNION ALL

SELECT 
  '3e218cb3-4804-4a80-afd0-5ded45f54cad',
  d.id,
  'detection',
  'person',
  0.67,
  'low',  
  '{"x": 300, "y": 50, "width": 70, "height": 190}',
  '{"alert_type": "visitor_detected", "zone": "lobby"}',
  now() - interval '2 minutes'
FROM device_ids d WHERE d.name = 'Lobby Camera'
ON CONFLICT DO NOTHING;

-- Add demo thresholds
INSERT INTO vy_threshold (tenant_id, class_name, min_confidence, nms_iou) VALUES
('3e218cb3-4804-4a80-afd0-5ded45f54cad', 'person', 0.6, 0.45),
('3e218cb3-4804-4a80-afd0-5ded45f54cad', 'car', 0.7, 0.45), 
('3e218cb3-4804-4a80-afd0-5ded45f54cad', 'truck', 0.7, 0.45),
('3e218cb3-4804-4a80-afd0-5ded45f54cad', 'animal', 0.5, 0.45)
ON CONFLICT DO NOTHING;