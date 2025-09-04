-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
CREATE TYPE public.user_role AS ENUM ('root_admin', 'tenant_admin', 'manager', 'analyst', 'viewer');
CREATE TYPE public.event_type AS ENUM ('detection', 'alert', 'behavior', 'system');
CREATE TYPE public.detection_class AS ENUM ('person', 'car', 'truck', 'motorcycle', 'bicycle', 'animal', 'package', 'unknown');

-- Organizations table
CREATE TABLE public.vy_org (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tenants table (supports hierarchy)
CREATE TABLE public.vy_tenant (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.vy_org(id) ON DELETE CASCADE,
    parent_tenant_id UUID REFERENCES public.vy_tenant(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT,
    timezone TEXT DEFAULT 'UTC',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User profiles (extends auth.users)
CREATE TABLE public.vy_user_profile (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES public.vy_org(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.vy_tenant(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'viewer',
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Invitations table
CREATE TABLE public.vy_invite (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    org_id UUID NOT NULL REFERENCES public.vy_org(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.vy_tenant(id) ON DELETE CASCADE,
    role user_role NOT NULL,
    token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
    accepted BOOLEAN DEFAULT false,
    invited_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Devices table
CREATE TABLE public.vy_device (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.vy_tenant(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    rtsp_url TEXT,
    webrtc_url TEXT,
    location TEXT,
    roi_polygons JSONB DEFAULT '[]',
    enabled BOOLEAN DEFAULT true,
    online BOOLEAN DEFAULT false,
    last_seen TIMESTAMPTZ,
    stream_config JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Detection thresholds per tenant
CREATE TABLE public.vy_threshold (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.vy_tenant(id) ON DELETE CASCADE,
    class_name detection_class NOT NULL,
    min_confidence FLOAT NOT NULL DEFAULT 0.5 CHECK (min_confidence >= 0 AND min_confidence <= 1),
    nms_iou FLOAT NOT NULL DEFAULT 0.45 CHECK (nms_iou >= 0 AND nms_iou <= 1),
    enabled BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, class_name)
);

-- Schedules for time-based rules
CREATE TABLE public.vy_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.vy_tenant(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    hours_json JSONB NOT NULL DEFAULT '{}',
    timezone TEXT DEFAULT 'UTC',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Events table
CREATE TABLE public.vy_event (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.vy_tenant(id) ON DELETE CASCADE,
    device_id UUID NOT NULL REFERENCES public.vy_device(id) ON DELETE CASCADE,
    type event_type NOT NULL DEFAULT 'detection',
    class_name detection_class,
    confidence FLOAT CHECK (confidence >= 0 AND confidence <= 1),
    bbox JSONB,
    image_url TEXT,
    clip_url TEXT,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    severity TEXT DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    acknowledged BOOLEAN DEFAULT false,
    acknowledged_by UUID REFERENCES auth.users(id),
    acknowledged_at TIMESTAMPTZ,
    meta JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Settings table for tenant-specific configuration
CREATE TABLE public.vy_setting (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.vy_tenant(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, key)
);

-- API keys for external integrations
CREATE TABLE public.vy_apikey (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.vy_tenant(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    key_hash TEXT NOT NULL UNIQUE,
    scopes TEXT[] DEFAULT '{}',
    expires_at TIMESTAMPTZ,
    last_used TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Mobile tokens for push notifications
CREATE TABLE public.vy_mobile_token (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.vy_tenant(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
    fcm_token TEXT NOT NULL,
    device_info JSONB DEFAULT '{}',
    last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, platform, fcm_token)
);

-- Enable RLS on all tables
ALTER TABLE public.vy_org ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vy_tenant ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vy_user_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vy_invite ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vy_device ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vy_threshold ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vy_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vy_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vy_setting ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vy_apikey ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vy_mobile_token ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX idx_vy_tenant_org_id ON public.vy_tenant(org_id);
CREATE INDEX idx_vy_user_profile_tenant_id ON public.vy_user_profile(tenant_id);
CREATE INDEX idx_vy_device_tenant_id ON public.vy_device(tenant_id);
CREATE INDEX idx_vy_event_tenant_device ON public.vy_event(tenant_id, device_id);
CREATE INDEX idx_vy_event_occurred_at ON public.vy_event(occurred_at DESC);
CREATE INDEX idx_vy_event_class_name ON public.vy_event(class_name);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_vy_org_updated_at
    BEFORE UPDATE ON public.vy_org
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_vy_tenant_updated_at
    BEFORE UPDATE ON public.vy_tenant
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_vy_user_profile_updated_at
    BEFORE UPDATE ON public.vy_user_profile
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_vy_device_updated_at
    BEFORE UPDATE ON public.vy_device
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();