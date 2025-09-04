-- Update the demo user to be a root admin with managed services mode enabled
UPDATE public.vy_user_profile 
SET 
  role = 'root_admin',
  managed_services_mode = true 
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'demo@visiony.com'
);