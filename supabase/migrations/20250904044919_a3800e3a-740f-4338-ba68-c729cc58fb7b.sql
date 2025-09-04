-- Cases Management System
CREATE TABLE public.cases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_number TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'closed', 'archived')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  category TEXT NOT NULL DEFAULT 'security' CHECK (category IN ('security', 'theft', 'vandalism', 'trespassing', 'maintenance', 'other')),
  assigned_to UUID,
  created_by UUID NOT NULL,
  tenant_id UUID NOT NULL,
  location TEXT,
  incident_date TIMESTAMP WITH TIME ZONE,
  resolution TEXT,
  estimated_completion TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Evidence Management System
CREATE TABLE public.evidence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE,
  evidence_number TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('video', 'image', 'audio', 'document', 'other')),
  file_path TEXT,
  file_name TEXT,
  file_size BIGINT,
  mime_type TEXT,
  description TEXT,
  collected_by UUID NOT NULL,
  chain_of_custody JSONB DEFAULT '[]'::jsonb,
  hash_value TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  tenant_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Email Alert Configuration
CREATE TABLE public.alert_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('device_offline', 'motion_detected', 'case_assigned', 'evidence_added', 'system_alert')),
  enabled BOOLEAN DEFAULT true,
  email_enabled BOOLEAN DEFAULT true,
  push_enabled BOOLEAN DEFAULT true,
  conditions JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- AI Analysis Results (fixed to reference vy_event)
CREATE TABLE public.ai_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES public.vy_event(id) ON DELETE CASCADE,
  analysis_type TEXT NOT NULL CHECK (analysis_type IN ('object_detection', 'behavior_analysis', 'anomaly_detection', 'facial_recognition')),
  confidence_score DECIMAL(5,4),
  results JSONB NOT NULL DEFAULT '{}'::jsonb,
  model_version TEXT,
  processing_time_ms INTEGER,
  tenant_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enhanced Device Capabilities
ALTER TABLE public.vy_device 
ADD COLUMN IF NOT EXISTS capabilities JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS firmware_version TEXT,
ADD COLUMN IF NOT EXISTS last_maintenance TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS maintenance_schedule TEXT,
ADD COLUMN IF NOT EXISTS health_score INTEGER DEFAULT 100 CHECK (health_score >= 0 AND health_score <= 100);

-- Mobile App Sessions
CREATE TABLE public.mobile_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  device_token TEXT,
  platform TEXT CHECK (platform IN ('ios', 'android', 'web')),
  app_version TEXT,
  last_active TIMESTAMP WITH TIME ZONE DEFAULT now(),
  push_token TEXT,
  biometric_enabled BOOLEAN DEFAULT false,
  offline_sync_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mobile_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Cases
CREATE POLICY "Users can view cases in their tenant" 
ON public.cases FOR SELECT 
USING (
  tenant_id = get_current_user_tenant() OR is_admin()
);

CREATE POLICY "Users can create cases in their tenant" 
ON public.cases FOR INSERT 
WITH CHECK (
  created_by = auth.uid() AND
  (tenant_id = get_current_user_tenant() OR is_admin())
);

CREATE POLICY "Users can update cases in their tenant" 
ON public.cases FOR UPDATE 
USING (
  tenant_id = get_current_user_tenant() OR is_admin()
);

-- RLS Policies for Evidence
CREATE POLICY "Users can view evidence in their tenant" 
ON public.evidence FOR SELECT 
USING (
  tenant_id = get_current_user_tenant() OR is_admin()
);

CREATE POLICY "Users can create evidence in their tenant" 
ON public.evidence FOR INSERT 
WITH CHECK (
  collected_by = auth.uid() AND
  (tenant_id = get_current_user_tenant() OR is_admin())
);

-- RLS Policies for Alert Configurations
CREATE POLICY "Users can manage their own alert configurations" 
ON public.alert_configurations FOR ALL 
USING (user_id = auth.uid());

-- RLS Policies for AI Analysis
CREATE POLICY "Users can view AI analysis in their tenant" 
ON public.ai_analysis FOR SELECT 
USING (
  tenant_id = get_current_user_tenant() OR is_admin()
);

-- RLS Policies for Mobile Sessions
CREATE POLICY "Users can manage their own mobile sessions" 
ON public.mobile_sessions FOR ALL 
USING (user_id = auth.uid());

-- Create storage buckets for evidence
INSERT INTO storage.buckets (id, name, public) 
VALUES ('evidence', 'evidence', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('case-files', 'case-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for evidence
CREATE POLICY "Users can upload evidence in their tenant" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'evidence' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view evidence in their tenant" 
ON storage.objects FOR SELECT 
USING (
  bucket_id = 'evidence'
);

-- Storage policies for case files
CREATE POLICY "Users can upload case files in their tenant" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'case-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view case files in their tenant" 
ON storage.objects FOR SELECT 
USING (
  bucket_id = 'case-files'
);

-- Functions for auto-updating timestamps
CREATE TRIGGER update_cases_updated_at
BEFORE UPDATE ON public.cases
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_evidence_updated_at
BEFORE UPDATE ON public.evidence
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_alert_configurations_updated_at
BEFORE UPDATE ON public.alert_configurations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Function to generate case numbers
CREATE OR REPLACE FUNCTION generate_case_number(tenant_id UUID)
RETURNS TEXT AS $$
DECLARE
  case_count INTEGER;
  year_suffix TEXT;
BEGIN
  -- Get current year suffix
  year_suffix := TO_CHAR(NOW(), 'YY');
  
  -- Count existing cases for this tenant this year
  SELECT COUNT(*) INTO case_count 
  FROM public.cases 
  WHERE cases.tenant_id = generate_case_number.tenant_id
  AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());
  
  -- Return formatted case number
  RETURN 'CASE-' || year_suffix || '-' || LPAD((case_count + 1)::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add chain of custody entry
CREATE OR REPLACE FUNCTION add_custody_entry(
  evidence_id UUID,
  action_type TEXT,
  actor_id UUID,
  notes TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  new_entry JSONB;
BEGIN
  new_entry := jsonb_build_object(
    'timestamp', NOW(),
    'action', action_type,
    'actor_id', actor_id,
    'notes', notes
  );
  
  UPDATE public.evidence 
  SET chain_of_custody = chain_of_custody || new_entry
  WHERE id = evidence_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;