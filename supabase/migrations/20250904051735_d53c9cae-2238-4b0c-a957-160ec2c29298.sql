-- Add managed_services_mode field to vy_user_profile table
ALTER TABLE public.vy_user_profile 
ADD COLUMN managed_services_mode boolean DEFAULT false;

-- Add comment for clarity
COMMENT ON COLUMN public.vy_user_profile.managed_services_mode IS 'Whether the user has enabled Managed Services (MSSP) mode to manage multiple client tenants';

-- Create edge function permissions for tenant management
CREATE OR REPLACE FUNCTION public.can_manage_tenants(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.vy_user_profile 
    WHERE vy_user_profile.user_id = can_manage_tenants.user_id
    AND role = 'root_admin' 
    AND managed_services_mode = true
  );
$$;