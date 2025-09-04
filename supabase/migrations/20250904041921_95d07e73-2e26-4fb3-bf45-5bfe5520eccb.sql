-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create enums
CREATE TYPE user_role AS ENUM ('root_admin', 'tenant_admin', 'manager', 'analyst', 'viewer');
CREATE TYPE event_type AS ENUM ('detection', 'alert', 'system');
CREATE TYPE detection_class AS ENUM ('person', 'car', 'truck', 'animal', 'plate', 'unknown');

-- Create organizations table
CREATE TABLE public.vy_org (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create tenants table
CREATE TABLE public.vy_tenant (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES vy_org(id) ON DELETE CASCADE,
    parent_tenant_id UUID REFERENCES vy_tenant(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT,
    timezone TEXT DEFAULT 'UTC',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user profiles table
CREATE TABLE public.vy_user_profile (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES vy_org(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES vy_tenant(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'viewer',
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id)
);

-- Create devices table
CREATE TABLE public.vy_device (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES vy_tenant(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    rtsp_url TEXT,
    webrtc_url TEXT,
    location TEXT,
    roi_polygons JSONB DEFAULT '[]',
    stream_config JSONB DEFAULT '{}',
    enabled BOOLEAN DEFAULT true,
    online BOOLEAN DEFAULT false,
    last_seen TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create events table
CREATE TABLE public.vy_event (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES vy_tenant(id) ON DELETE CASCADE,
    device_id UUID NOT NULL REFERENCES vy_device(id) ON DELETE CASCADE,
    type event_type NOT NULL DEFAULT 'detection',
    class_name detection_class,
    confidence DOUBLE PRECISION,
    bbox JSONB,
    image_url TEXT,
    clip_url TEXT,
    meta JSONB DEFAULT '{}',
    severity TEXT DEFAULT 'low',
    acknowledged BOOLEAN DEFAULT false,
    acknowledged_by UUID REFERENCES auth.users(id),
    acknowledged_at TIMESTAMPTZ,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create other supporting tables
CREATE TABLE public.vy_threshold (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES vy_tenant(id) ON DELETE CASCADE,
    class_name detection_class NOT NULL,
    min_confidence DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    nms_iou DOUBLE PRECISION NOT NULL DEFAULT 0.45,
    enabled BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.vy_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES vy_tenant(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    hours_json JSONB NOT NULL DEFAULT '{}',
    timezone TEXT DEFAULT 'UTC',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.vy_setting (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES vy_tenant(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE vy_org ENABLE ROW LEVEL SECURITY;
ALTER TABLE vy_tenant ENABLE ROW LEVEL SECURITY;
ALTER TABLE vy_user_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE vy_device ENABLE ROW LEVEL SECURITY;
ALTER TABLE vy_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE vy_threshold ENABLE ROW LEVEL SECURITY;
ALTER TABLE vy_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE vy_setting ENABLE ROW LEVEL SECURITY;

-- Create utility functions
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role::TEXT INTO user_role 
    FROM vy_user_profile 
    WHERE user_id = auth.uid();
    
    RETURN COALESCE(user_role, 'viewer');
END;
$$;

CREATE OR REPLACE FUNCTION get_current_user_tenant()
RETURNS UUID
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_tenant UUID;
BEGIN
    SELECT tenant_id INTO user_tenant 
    FROM vy_user_profile 
    WHERE user_id = auth.uid();
    
    RETURN user_tenant;
END;
$$;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN get_current_user_role() IN ('root_admin', 'tenant_admin');
END;
$$;

-- Create RLS policies for user_profile
CREATE POLICY "Users can view profiles in their tenant"
ON vy_user_profile FOR SELECT
USING (
    CASE 
        WHEN get_current_user_role() = 'root_admin' THEN true
        WHEN get_current_user_role() = 'tenant_admin' THEN 
            tenant_id IN (
                SELECT t.id FROM vy_tenant t 
                JOIN vy_user_profile up ON t.org_id = up.org_id 
                WHERE up.user_id = auth.uid()
            )
        ELSE tenant_id = get_current_user_tenant() OR user_id = auth.uid()
    END
);

CREATE POLICY "Users can update their own profile"
ON vy_user_profile FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Create RLS policies for devices
CREATE POLICY "Users can view devices in their tenant"
ON vy_device FOR SELECT
USING (tenant_id = get_current_user_tenant() OR is_admin());

CREATE POLICY "Admins can manage devices"
ON vy_device FOR ALL
USING (is_admin() AND tenant_id IN (
    SELECT t.id FROM vy_tenant t 
    JOIN vy_user_profile up ON t.org_id = up.org_id 
    WHERE up.user_id = auth.uid()
))
WITH CHECK (is_admin() AND tenant_id IN (
    SELECT t.id FROM vy_tenant t 
    JOIN vy_user_profile up ON t.org_id = up.org_id 
    WHERE up.user_id = auth.uid()
));

-- Create RLS policies for events
CREATE POLICY "Users can view events in their tenant"
ON vy_event FOR SELECT
USING (tenant_id = get_current_user_tenant() OR is_admin());

CREATE POLICY "System can create events"
ON vy_event FOR INSERT
WITH CHECK (tenant_id = get_current_user_tenant() OR is_admin());

-- Create RLS policies for tenants
CREATE POLICY "Admins can view all tenants in their org"
ON vy_tenant FOR SELECT
USING (
    CASE 
        WHEN get_current_user_role() = 'root_admin' THEN true
        WHEN get_current_user_role() = 'tenant_admin' THEN 
            org_id IN (SELECT org_id FROM vy_user_profile WHERE user_id = auth.uid())
        ELSE id = get_current_user_tenant()
    END
);

CREATE POLICY "Tenant admins can create sub-tenants"
ON vy_tenant FOR INSERT
WITH CHECK (
    get_current_user_role() IN ('root_admin', 'tenant_admin') AND 
    org_id IN (SELECT org_id FROM vy_user_profile WHERE user_id = auth.uid())
);

-- Create RLS policies for orgs
CREATE POLICY "Users can view their org"
ON vy_org FOR SELECT
USING (id IN (SELECT org_id FROM vy_user_profile WHERE user_id = auth.uid()));

CREATE POLICY "Root admins can view all orgs"
ON vy_org FOR SELECT
USING (get_current_user_role() = 'root_admin');

-- Create RLS policies for settings and thresholds
CREATE POLICY "Users can view tenant settings"
ON vy_setting FOR SELECT
USING (tenant_id = get_current_user_tenant() OR is_admin());

CREATE POLICY "Admins can manage settings"
ON vy_setting FOR ALL
USING (is_admin() AND tenant_id = get_current_user_tenant())
WITH CHECK (is_admin() AND tenant_id = get_current_user_tenant());

CREATE POLICY "Users can view thresholds in their tenant"
ON vy_threshold FOR SELECT
USING (tenant_id = get_current_user_tenant() OR is_admin());

CREATE POLICY "Admins can manage thresholds"
ON vy_threshold FOR ALL
USING (is_admin() AND tenant_id = get_current_user_tenant())
WITH CHECK (is_admin() AND tenant_id = get_current_user_tenant());

-- Create triggers for updated_at
CREATE TRIGGER update_vy_org_updated_at
    BEFORE UPDATE ON vy_org
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_vy_tenant_updated_at
    BEFORE UPDATE ON vy_tenant
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_vy_user_profile_updated_at
    BEFORE UPDATE ON vy_user_profile
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_vy_device_updated_at
    BEFORE UPDATE ON vy_device
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Insert demo data
INSERT INTO vy_org (id, name) VALUES 
('550e8400-e29b-41d4-a716-446655440000', 'Vision-Y Security Demo');

INSERT INTO vy_tenant (id, org_id, name, address) VALUES 
('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'Main Campus', '123 Security Blvd, Tech City, TC 12345');

-- Create event summary function
CREATE OR REPLACE FUNCTION vy_event_summary(
    _tenant_id UUID,
    _from TIMESTAMPTZ DEFAULT NULL,
    _to TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE(
    class_name TEXT,
    device_name TEXT,
    event_count BIGINT,
    severity_counts JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.class_name::TEXT,
        d.name as device_name,
        COUNT(*) as event_count,
        jsonb_object_agg(e.severity, count(*)) as severity_counts
    FROM vy_event e
    JOIN vy_device d ON e.device_id = d.id
    WHERE e.tenant_id = _tenant_id
    AND (_from IS NULL OR e.occurred_at >= _from)
    AND (_to IS NULL OR e.occurred_at <= _to)
    GROUP BY e.class_name, d.name;
END;
$$;