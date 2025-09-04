-- Helper function to get current user's role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role::TEXT INTO user_role 
    FROM public.vy_user_profile 
    WHERE user_id = auth.uid();
    
    RETURN COALESCE(user_role, 'viewer');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Helper function to get current user's tenant_id
CREATE OR REPLACE FUNCTION public.get_current_user_tenant()
RETURNS UUID AS $$
DECLARE
    user_tenant UUID;
BEGIN
    SELECT tenant_id INTO user_tenant 
    FROM public.vy_user_profile 
    WHERE user_id = auth.uid();
    
    RETURN user_tenant;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Helper function to check if user has admin role
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_current_user_role() IN ('root_admin', 'tenant_admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Helper function for event summaries
CREATE OR REPLACE FUNCTION public.vy_event_summary(
    _tenant_id UUID,
    _from TIMESTAMPTZ DEFAULT NULL,
    _to TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
    class_name TEXT,
    device_name TEXT,
    event_count BIGINT,
    severity_counts JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.class_name::TEXT,
        d.name as device_name,
        COUNT(*) as event_count,
        jsonb_object_agg(e.severity, count(*)) as severity_counts
    FROM public.vy_event e
    JOIN public.vy_device d ON e.device_id = d.id
    WHERE e.tenant_id = _tenant_id
    AND (_from IS NULL OR e.occurred_at >= _from)
    AND (_to IS NULL OR e.occurred_at <= _to)
    GROUP BY e.class_name, d.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- RLS Policies for vy_org
CREATE POLICY "Root admins can view all orgs"
ON public.vy_org FOR SELECT
TO authenticated
USING (get_current_user_role() = 'root_admin');

CREATE POLICY "Users can view their org"
ON public.vy_org FOR SELECT
TO authenticated
USING (
    id IN (
        SELECT org_id FROM public.vy_user_profile 
        WHERE user_id = auth.uid()
    )
);

-- RLS Policies for vy_tenant
CREATE POLICY "Admins can view all tenants in their org"
ON public.vy_tenant FOR SELECT
TO authenticated
USING (
    CASE 
        WHEN get_current_user_role() = 'root_admin' THEN true
        WHEN get_current_user_role() = 'tenant_admin' THEN 
            org_id IN (SELECT org_id FROM public.vy_user_profile WHERE user_id = auth.uid())
        ELSE id = get_current_user_tenant()
    END
);

CREATE POLICY "Tenant admins can create sub-tenants"
ON public.vy_tenant FOR INSERT
TO authenticated
WITH CHECK (
    get_current_user_role() IN ('root_admin', 'tenant_admin') AND
    org_id IN (SELECT org_id FROM public.vy_user_profile WHERE user_id = auth.uid())
);

-- RLS Policies for vy_user_profile
CREATE POLICY "Users can view profiles in their tenant"
ON public.vy_user_profile FOR SELECT
TO authenticated
USING (
    CASE 
        WHEN get_current_user_role() = 'root_admin' THEN true
        WHEN get_current_user_role() = 'tenant_admin' THEN 
            tenant_id IN (
                SELECT id FROM public.vy_tenant 
                WHERE org_id IN (SELECT org_id FROM public.vy_user_profile WHERE user_id = auth.uid())
            )
        ELSE tenant_id = get_current_user_tenant() OR user_id = auth.uid()
    END
);

CREATE POLICY "Users can update their own profile"
ON public.vy_user_profile FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- RLS Policies for vy_device
CREATE POLICY "Users can view devices in their tenant"
ON public.vy_device FOR SELECT
TO authenticated
USING (tenant_id = get_current_user_tenant() OR is_admin());

CREATE POLICY "Admins can manage devices"
ON public.vy_device FOR ALL
TO authenticated
USING (
    is_admin() AND 
    tenant_id IN (
        SELECT id FROM public.vy_tenant 
        WHERE org_id IN (SELECT org_id FROM public.vy_user_profile WHERE user_id = auth.uid())
    )
)
WITH CHECK (
    is_admin() AND 
    tenant_id IN (
        SELECT id FROM public.vy_tenant 
        WHERE org_id IN (SELECT org_id FROM public.vy_user_profile WHERE user_id = auth.uid())
    )
);

-- RLS Policies for vy_event
CREATE POLICY "Users can view events in their tenant"
ON public.vy_event FOR SELECT
TO authenticated
USING (tenant_id = get_current_user_tenant() OR is_admin());

CREATE POLICY "System can create events"
ON public.vy_event FOR INSERT
TO authenticated
WITH CHECK (
    tenant_id = get_current_user_tenant() OR 
    is_admin()
);

-- RLS Policies for vy_threshold
CREATE POLICY "Users can view thresholds in their tenant"
ON public.vy_threshold FOR SELECT
TO authenticated
USING (tenant_id = get_current_user_tenant() OR is_admin());

CREATE POLICY "Admins can manage thresholds"
ON public.vy_threshold FOR ALL
TO authenticated
USING (is_admin() AND tenant_id = get_current_user_tenant())
WITH CHECK (is_admin() AND tenant_id = get_current_user_tenant());

-- RLS Policies for vy_setting
CREATE POLICY "Users can view tenant settings"
ON public.vy_setting FOR SELECT
TO authenticated
USING (tenant_id = get_current_user_tenant() OR is_admin());

CREATE POLICY "Admins can manage settings"
ON public.vy_setting FOR ALL
TO authenticated
USING (is_admin() AND tenant_id = get_current_user_tenant())
WITH CHECK (is_admin() AND tenant_id = get_current_user_tenant());

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES 
    ('vy-snapshots', 'vy-snapshots', false),
    ('vy-clips', 'vy-clips', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for snapshots
CREATE POLICY "Users can view snapshots from their tenant events"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'vy-snapshots' AND
    EXISTS (
        SELECT 1 FROM public.vy_event e
        WHERE e.tenant_id = get_current_user_tenant()
        AND name LIKE e.tenant_id::text || '/%'
    )
);

CREATE POLICY "System can upload snapshots"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'vy-snapshots' AND
    is_admin()
);

-- Storage policies for clips
CREATE POLICY "Users can view clips from their tenant events"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'vy-clips' AND
    EXISTS (
        SELECT 1 FROM public.vy_event e
        WHERE e.tenant_id = get_current_user_tenant()
        AND name LIKE e.tenant_id::text || '/%'
    )
);

CREATE POLICY "System can upload clips"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'vy-clips' AND
    is_admin()
);