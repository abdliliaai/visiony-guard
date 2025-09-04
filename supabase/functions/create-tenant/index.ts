import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the user's JWT token
    const authHeader = req.headers.get('Authorization')!;
    const jwt = authHeader.replace('Bearer ', '');

    // Verify the user's authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Get the request body
    const { tenantData, adminUser } = await req.json();

    // Validate input
    if (!tenantData?.name || !adminUser?.email) {
      throw new Error('Missing required fields: tenant name and admin email');
    }

    // Check if the current user is a root admin
    const { data: userProfile } = await supabase
      .from('vy_user_profile')
      .select('role, org_id, managed_services_mode')
      .eq('user_id', user.id)
      .single();

    if (!userProfile || userProfile.role !== 'root_admin' || !userProfile.managed_services_mode) {
      throw new Error('Insufficient permissions - root admin with managed services mode required');
    }

    // Create the new tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('vy_tenant')
      .insert({
        name: tenantData.name,
        address: tenantData.address,
        org_id: userProfile.org_id,
        parent_tenant_id: tenantData.parent_tenant_id || null,
      })
      .select()
      .single();

    if (tenantError) {
      console.error('Error creating tenant:', tenantError);
      throw new Error('Failed to create tenant');
    }

    // Generate invitation token
    const inviteToken = crypto.randomUUID();

    // Create invitation record
    const { error: inviteError } = await supabase
      .from('vy_invite')
      .insert({
        email: adminUser.email,
        token: inviteToken,
        role: 'tenant_admin',
        org_id: userProfile.org_id,
        tenant_id: tenant.id,
        invited_by: user.id,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      });

    if (inviteError) {
      console.error('Error creating invitation:', inviteError);
      throw new Error('Failed to create invitation');
    }

    // Send invitation email
    try {
      const { error: emailError } = await supabase.functions.invoke('send-alert-email', {
        body: {
          to: adminUser.email,
          subject: `Welcome to Vision-Y Security Platform - ${tenantData.name}`,
          text: `
Hello ${adminUser.first_name || 'there'},

You've been invited to manage the security system for ${tenantData.name} on the Vision-Y platform.

To get started:
1. Visit: ${supabaseUrl.replace('https://mwhutmxhymjwimxeavbc.supabase.co', 'https://your-app-domain.com')}/auth?invite=${inviteToken}
2. Create your account using this email address
3. Set up your security cameras and monitoring

Your invitation expires in 7 days.

If you have any questions, please contact your security provider.

Best regards,
Vision-Y Security Team
          `,
          html: `
            <h2>Welcome to Vision-Y Security Platform</h2>
            <p>Hello ${adminUser.first_name || 'there'},</p>
            <p>You've been invited to manage the security system for <strong>${tenantData.name}</strong> on the Vision-Y platform.</p>
            
            <h3>To get started:</h3>
            <ol>
              <li>Visit: <a href="${supabaseUrl.replace('https://mwhutmxhymjwimxeavbc.supabase.co', 'https://your-app-domain.com')}/auth?invite=${inviteToken}">Accept Invitation</a></li>
              <li>Create your account using this email address</li>
              <li>Set up your security cameras and monitoring</li>
            </ol>
            
            <p><em>Your invitation expires in 7 days.</em></p>
            <p>If you have any questions, please contact your security provider.</p>
            
            <p>Best regards,<br>Vision-Y Security Team</p>
          `,
        },
      });

      if (emailError) {
        console.error('Failed to send invitation email:', emailError);
        // Don't throw error here - tenant was created successfully
      }
    } catch (emailError) {
      console.error('Error sending invitation email:', emailError);
      // Continue - the tenant was created successfully
    }

    return new Response(
      JSON.stringify({
        success: true,
        tenant,
        invitation: {
          email: adminUser.email,
          token: inviteToken,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
        message: `Tenant ${tenantData.name} created successfully and invitation sent to ${adminUser.email}`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in create-tenant function:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'An unexpected error occurred',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});