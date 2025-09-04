-- Fix access denied issues by adding missing RLS policies

-- API Keys - Only allow users to view their own tenant's API keys
CREATE POLICY "Users can view API keys in their tenant" 
ON vy_apikey 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM vy_user_profile 
    WHERE user_id = auth.uid() 
    AND tenant_id = vy_apikey.tenant_id
  )
);

CREATE POLICY "Admins can manage API keys in their tenant" 
ON vy_apikey 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM vy_user_profile 
    WHERE user_id = auth.uid() 
    AND tenant_id = vy_apikey.tenant_id
    AND role IN ('tenant_admin', 'root_admin')
  )
);

-- Invites - Users can view invites for their org
CREATE POLICY "Users can view invites for their org" 
ON vy_invite 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM vy_user_profile 
    WHERE user_id = auth.uid() 
    AND org_id = vy_invite.org_id
  )
);

CREATE POLICY "Admins can manage invites for their org" 
ON vy_invite 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM vy_user_profile 
    WHERE user_id = auth.uid() 
    AND org_id = vy_invite.org_id
    AND role IN ('tenant_admin', 'root_admin')
  )
);

-- Mobile tokens - Users can only manage their own tokens
CREATE POLICY "Users can manage their own mobile tokens" 
ON vy_mobile_token 
FOR ALL 
USING (user_id = auth.uid());

-- Schedules - Users can view schedules in their tenant
CREATE POLICY "Users can view schedules in their tenant" 
ON vy_schedule 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM vy_user_profile 
    WHERE user_id = auth.uid() 
    AND tenant_id = vy_schedule.tenant_id
  )
);

CREATE POLICY "Admins can manage schedules in their tenant" 
ON vy_schedule 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM vy_user_profile 
    WHERE user_id = auth.uid() 
    AND tenant_id = vy_schedule.tenant_id
    AND role IN ('manager', 'tenant_admin', 'root_admin')
  )
);