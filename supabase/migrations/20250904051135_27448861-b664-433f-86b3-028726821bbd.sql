-- Fix infinite recursion in vy_user_profile RLS policies
-- Disable RLS temporarily to clean up
ALTER TABLE public.vy_user_profile DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.vy_user_profile;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.vy_user_profile; 
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.vy_user_profile;
DROP POLICY IF EXISTS "Users can view profiles in their tenant" ON public.vy_user_profile;
DROP POLICY IF EXISTS "vy_user_profile_select_policy" ON public.vy_user_profile;
DROP POLICY IF EXISTS "vy_user_profile_insert_policy" ON public.vy_user_profile;
DROP POLICY IF EXISTS "vy_user_profile_update_policy" ON public.vy_user_profile;

-- Re-enable RLS
ALTER TABLE public.vy_user_profile ENABLE ROW LEVEL SECURITY;

-- Create simple policies without any function calls that could cause recursion
CREATE POLICY "profile_select_own" 
ON public.vy_user_profile 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "profile_insert_own" 
ON public.vy_user_profile 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "profile_update_own" 
ON public.vy_user_profile 
FOR UPDATE 
USING (user_id = auth.uid());