-- Reset demo user password to match UI display
-- Update the demo user's password to 'demo123'
UPDATE auth.users 
SET encrypted_password = crypt('demo123', gen_salt('bf'))
WHERE email = 'demo@visiony.com';