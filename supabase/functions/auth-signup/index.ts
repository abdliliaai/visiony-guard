import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SignupRequest {
  email: string;
  password: string;
  inviteToken?: string;
  firstName?: string;
  lastName?: string;
  tenantId?: string;
  orgId?: string;
  role?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { email, password, inviteToken, firstName, lastName, tenantId: providedTenantId, orgId: providedOrgId, role: providedRole }: SignupRequest = await req.json();

    // Check if invite token exists and is valid
    let orgId: string | null = providedOrgId || null;
    let tenantId: string | null = providedTenantId || null;
    let role: string = providedRole || 'viewer';

    if (inviteToken) {
      const { data: invite, error: inviteError } = await supabase
        .from('vy_invite')
        .select('*')
        .eq('token', inviteToken)
        .eq('accepted', false)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (inviteError || !invite) {
        return new Response(
          JSON.stringify({ error: 'Invalid or expired invitation token' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      orgId = invite.org_id;
      tenantId = invite.tenant_id;
      role = invite.role;
    } else if (!orgId || !tenantId) {
      // Create default org and tenant only if not provided (self-signup)
      const { data: org, error: orgError } = await supabase
        .from('vy_org')
        .insert({ name: `${firstName || email.split('@')[0]}'s Organization` })
        .select()
        .single();

      if (orgError) {
        throw orgError;
      }

      const { data: tenant, error: tenantError } = await supabase
        .from('vy_tenant')
        .insert({ 
          org_id: org.id, 
          name: 'Main Location',
          address: 'Default Location'
        })
        .select()
        .single();

      if (tenantError) {
        throw tenantError;
      }

      orgId = org.id;
      tenantId = tenant.id;
      role = role || 'tenant_admin';
    }

    // Create user account
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
      }
    });

    if (authError) {
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create user profile
    const { error: profileError } = await supabase
      .from('vy_user_profile')
      .insert({
        user_id: authData.user.id,
        org_id: orgId,
        tenant_id: tenantId,
        role: role,
        first_name: firstName,
        last_name: lastName,
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      // Clean up user if profile creation fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      throw profileError;
    }

    // Mark invite as accepted if it was used
    if (inviteToken) {
      await supabase
        .from('vy_invite')
        .update({ accepted: true })
        .eq('token', inviteToken);
    }

    // Create default thresholds for the tenant
    const defaultThresholds = [
      { class_name: 'person', min_confidence: 0.6, nms_iou: 0.45 },
      { class_name: 'car', min_confidence: 0.7, nms_iou: 0.45 },
      { class_name: 'truck', min_confidence: 0.7, nms_iou: 0.45 },
      { class_name: 'motorcycle', min_confidence: 0.6, nms_iou: 0.45 },
      { class_name: 'bicycle', min_confidence: 0.5, nms_iou: 0.45 },
      { class_name: 'animal', min_confidence: 0.5, nms_iou: 0.45 },
      { class_name: 'package', min_confidence: 0.6, nms_iou: 0.45 },
    ];

    await supabase
      .from('vy_threshold')
      .insert(
        defaultThresholds.map(threshold => ({
          ...threshold,
          tenant_id: tenantId,
        }))
      );

    console.log('User signup successful:', { userId: authData.user.id, email, tenantId, role });

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: authData.user,
        profile: { orgId, tenantId, role }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Signup error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});