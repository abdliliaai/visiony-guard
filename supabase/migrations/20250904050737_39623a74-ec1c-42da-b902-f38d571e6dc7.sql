-- Fix infinite recursion in vy_user_profile RLS policies
-- Drop existing policies that might be causing recursion
DROP POLICY IF EXISTS "Users can view their own profile" ON public.vy_user_profile;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.vy_user_profile;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.vy_user_profile;

-- Create new, simpler policies without recursion
CREATE POLICY "Users can view their own profile" 
ON public.vy_user_profile 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own profile" 
ON public.vy_user_profile 
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own profile" 
ON public.vy_user_profile 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- Fix function search path issues
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role::TEXT INTO user_role 
    FROM public.vy_user_profile 
    WHERE user_id = auth.uid();
    
    RETURN COALESCE(user_role, 'viewer');
END;
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_tenant()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    user_tenant UUID;
BEGIN
    SELECT tenant_id INTO user_tenant 
    FROM public.vy_user_profile 
    WHERE user_id = auth.uid();
    
    RETURN user_tenant;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    RETURN get_current_user_role() IN ('root_admin', 'tenant_admin');
END;
$$;