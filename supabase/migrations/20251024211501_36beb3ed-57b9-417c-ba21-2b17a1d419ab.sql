-- Ensure demo user has a profile as root_admin under their org, and a tenant exists
DO $$
DECLARE 
  v_user_id uuid := 'ba058830-5ae3-4c7a-817c-7fb1b876fbe6'; -- demo@visiony.com
  v_org_id uuid := '7f41ac14-634b-41d0-aeb7-161b7361983c';  -- Tuco's Organization
  v_tenant_id uuid;
BEGIN
  -- Find or create a tenant for this org
  SELECT id INTO v_tenant_id FROM public.vy_tenant WHERE org_id = v_org_id LIMIT 1;

  IF v_tenant_id IS NULL THEN
    INSERT INTO public.vy_tenant (name, org_id)
    VALUES ('Main Location', v_org_id)
    RETURNING id INTO v_tenant_id;
  END IF;

  -- Upsert user profile
  IF EXISTS (SELECT 1 FROM public.vy_user_profile WHERE user_id = v_user_id) THEN
    UPDATE public.vy_user_profile
      SET role = 'root_admin',
          org_id = v_org_id,
          tenant_id = v_tenant_id,
          managed_services_mode = true,
          updated_at = now()
      WHERE user_id = v_user_id;
  ELSE
    INSERT INTO public.vy_user_profile (user_id, role, org_id, tenant_id, managed_services_mode, first_name, last_name)
    VALUES (v_user_id, 'root_admin', v_org_id, v_tenant_id, true, 'Tuco', 'Salamanca');
  END IF;
END $$;