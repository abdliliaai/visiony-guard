-- Update demo@visiony.com to root_admin role
UPDATE public.vy_user_profile
SET role = 'root_admin'
WHERE user_id = 'ba058830-5ae3-4c7a-817c-7fb1b876fbe6';