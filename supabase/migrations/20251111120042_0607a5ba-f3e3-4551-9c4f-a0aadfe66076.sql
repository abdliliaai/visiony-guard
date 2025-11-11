-- Create tenant for Vision-Y Demo Corp if it doesn't exist
INSERT INTO vy_tenant (org_id, name, address)
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'Demo Headquarters', 'Main Office')
ON CONFLICT DO NOTHING;

-- Create profile for demo user
INSERT INTO vy_user_profile (
  user_id, 
  org_id, 
  tenant_id, 
  role, 
  first_name, 
  last_name,
  managed_services_mode
)
VALUES (
  'ba058830-5ae3-4c7a-817c-7fb1b876fbe6',
  '550e8400-e29b-41d4-a716-446655440000',
  (SELECT id FROM vy_tenant WHERE org_id = '550e8400-e29b-41d4-a716-446655440000' LIMIT 1),
  'root_admin',
  'Demo',
  'User',
  true
)
ON CONFLICT (user_id) DO UPDATE SET
  role = 'root_admin',
  managed_services_mode = true;