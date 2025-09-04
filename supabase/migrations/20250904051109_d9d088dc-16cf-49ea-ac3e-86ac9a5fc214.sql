-- Completely reset RLS policies for vy_user_profile to fix infinite recursion
-- Disable RLS temporarily to clean up
ALTER TABLE public.vy_user_profile DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.vy_user_profile;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.vy_user_profile;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.vy_user_profile;

-- Re-enable RLS
ALTER TABLE public.vy_user_profile ENABLE ROW LEVEL SECURITY;

-- Create fresh, simple policies
CREATE POLICY "vy_user_profile_select_policy" 
ON public.vy_user_profile 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "vy_user_profile_insert_policy" 
ON public.vy_user_profile 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "vy_user_profile_update_policy" 
ON public.vy_user_profile 
FOR UPDATE 
USING (user_id = auth.uid());

-- Ensure the user has a profile record
INSERT INTO public.vy_user_profile (user_id, role, tenant_id, created_at, updated_at)
SELECT 
    'ba058830-5ae3-4c7a-817c-7fb1b876fbe6'::uuid,
    'tenant_admin',
    'ba058830-5ae3-4c7a-817c-7fb1b876fbe6'::uuid,
    now(),
    now()
ON CONFLICT (user_id) DO NOTHING;