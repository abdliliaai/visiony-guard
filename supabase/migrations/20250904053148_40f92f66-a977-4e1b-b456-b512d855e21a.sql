-- Insert a new user into auth.users for testing non-MSSP functionality
-- This will be a regular user without MSSP access
INSERT INTO auth.users (
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  gen_random_uuid(),
  'authenticated',
  'authenticated', 
  'user@visiony.com',
  crypt('password123', gen_salt('bf')),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"email": "user@visiony.com", "first_name": "Regular", "last_name": "User"}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
);

-- Create a profile for the regular user
INSERT INTO public.vy_user_profile (
  user_id,
  first_name,
  last_name,
  role,
  managed_services_mode,
  org_id,
  tenant_id
) 
SELECT 
  u.id,
  'Regular',
  'User',
  'viewer',
  false,
  (SELECT id FROM public.vy_org LIMIT 1),
  (SELECT id FROM public.vy_tenant LIMIT 1)
FROM auth.users u 
WHERE u.email = 'user@visiony.com';