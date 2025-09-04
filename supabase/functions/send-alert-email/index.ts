import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

interface AlertEmailRequest {
  event_id?: string;
  case_id?: string;
  analysis_id?: string;
  alert_type: 'device_offline' | 'motion_detected' | 'case_assigned' | 'evidence_added' | 'system_alert' | 'high_confidence_detection';
  custom_message?: string;
  recipient_email?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      event_id, 
      case_id, 
      analysis_id, 
      alert_type, 
      custom_message,
      recipient_email 
    }: AlertEmailRequest = await req.json();

    // Get event details if provided
    let event = null;
    let eventCase = null;
    let analysis = null;
    let tenantId = null;

    if (event_id) {
      const { data } = await supabase
        .from('vy_event')
        .select(`
          *,
          vy_device (name, location)
        `)
        .eq('id', event_id)
        .single();
      event = data;
      tenantId = event?.tenant_id;
    }

    if (case_id) {
      const { data } = await supabase
        .from('cases')
        .select('*')
        .eq('id', case_id)
        .single();
      eventCase = data;
      tenantId = eventCase?.tenant_id;
    }

    if (analysis_id) {
      const { data } = await supabase
        .from('ai_analysis')
        .select('*')
        .eq('id', analysis_id)
        .single();
      analysis = data;
      tenantId = analysis?.tenant_id;
    }

    if (!tenantId) {
      throw new Error('Unable to determine tenant ID');
    }

    // Get alert configurations for users in this tenant
    const { data: alertConfigs } = await supabase
      .from('alert_configurations')
      .select(`
        *,
        vy_user_profile (
          user_id,
          first_name,
          last_name
        )
      `)
      .eq('tenant_id', tenantId)
      .eq('alert_type', alert_type)
      .eq('enabled', true)
      .eq('email_enabled', true);

    if (!alertConfigs || alertConfigs.length === 0) {
      console.log(`No alert configurations found for ${alert_type} in tenant ${tenantId}`);
      return new Response(
        JSON.stringify({ message: 'No recipients configured for this alert type' }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get user emails
    const userIds = alertConfigs.map(config => config.vy_user_profile.user_id);
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    
    const emailPromises = alertConfigs.map(async (config) => {
      const user = authUsers.users.find(u => u.id === config.vy_user_profile.user_id);
      if (!user?.email) return null;

      const { subject, html } = generateEmailContent(alert_type, {
        event,
        case: eventCase,
        analysis,
        custom_message,
        recipient_name: `${config.vy_user_profile.first_name} ${config.vy_user_profile.last_name}`.trim(),
      });

      try {
        const emailResponse = await resend.emails.send({
          from: "Vision-Y Security <alerts@yourdomain.com>",
          to: recipient_email || user.email,
          subject,
          html,
        });

        console.log(`Alert email sent to ${user.email}:`, emailResponse);
        return emailResponse;
      } catch (error) {
        console.error(`Failed to send email to ${user.email}:`, error);
        return null;
      }
    });

    const results = await Promise.all(emailPromises);
    const successCount = results.filter(r => r !== null).length;

    console.log(`Sent ${successCount} alert emails for ${alert_type}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        emails_sent: successCount,
        total_recipients: alertConfigs.length
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in send-alert-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

function generateEmailContent(alertType: string, data: any) {
  const { event, case: eventCase, analysis, custom_message, recipient_name } = data;

  let subject = '';
  let html = '';

  const baseStyle = `
    <style>
      .container { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; }
      .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; }
      .content { padding: 20px; background: #f9f9f9; }
      .alert-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 15px 0; }
      .critical { background: #f8d7da; border-left-color: #dc3545; }
      .success { background: #d4edda; border-left-color: #28a745; }
      .info { background: #d1ecf1; border-left-color: #17a2b8; }
      .footer { padding: 20px; text-align: center; color: #666; }
      .button { display: inline-block; background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; }
    </style>
  `;

  switch (alertType) {
    case 'device_offline':
      subject = '🔴 Security Device Offline Alert';
      html = `
        ${baseStyle}
        <div class="container">
          <div class="header">
            <h1>Device Offline Alert</h1>
          </div>
          <div class="content">
            <p>Hello ${recipient_name || 'Security Team'},</p>
            <div class="alert-box critical">
              <strong>Security device has gone offline!</strong>
            </div>
            ${event ? `
              <p><strong>Device:</strong> ${event.vy_device?.name || 'Unknown'}</p>
              <p><strong>Location:</strong> ${event.vy_device?.location || 'Unknown'}</p>
              <p><strong>Last Seen:</strong> ${new Date(event.occurred_at).toLocaleString()}</p>
            ` : ''}
            <p>Please check the device status immediately to ensure continuous security monitoring.</p>
            ${custom_message ? `<p><em>${custom_message}</em></p>` : ''}
          </div>
          <div class="footer">
            <p>Vision-Y Security Platform</p>
          </div>
        </div>
      `;
      break;

    case 'motion_detected':
      subject = '👁️ Motion Detection Alert';
      html = `
        ${baseStyle}
        <div class="container">
          <div class="header">
            <h1>Motion Detection Alert</h1>
          </div>
          <div class="content">
            <p>Hello ${recipient_name || 'Security Team'},</p>
            <div class="alert-box">
              <strong>Motion detected by security camera!</strong>
            </div>
            ${event ? `
              <p><strong>Camera:</strong> ${event.vy_device?.name || 'Unknown'}</p>
              <p><strong>Location:</strong> ${event.vy_device?.location || 'Unknown'}</p>
              <p><strong>Time:</strong> ${new Date(event.occurred_at).toLocaleString()}</p>
              <p><strong>Confidence:</strong> ${Math.round((event.confidence || 0) * 100)}%</p>
              ${event.image_url ? `<p><a href="${event.image_url}" class="button">View Snapshot</a></p>` : ''}
            ` : ''}
            ${custom_message ? `<p><em>${custom_message}</em></p>` : ''}
          </div>
          <div class="footer">
            <p>Vision-Y Security Platform</p>
          </div>
        </div>
      `;
      break;

    case 'case_assigned':
      subject = '📋 Security Case Assignment';
      html = `
        ${baseStyle}
        <div class="container">
          <div class="header">
            <h1>Case Assignment Notification</h1>
          </div>
          <div class="content">
            <p>Hello ${recipient_name || 'Team Member'},</p>
            <div class="alert-box info">
              <strong>You have been assigned to a security case!</strong>
            </div>
            ${eventCase ? `
              <p><strong>Case Number:</strong> ${eventCase.case_number}</p>
              <p><strong>Title:</strong> ${eventCase.title}</p>
              <p><strong>Priority:</strong> ${eventCase.priority.toUpperCase()}</p>
              <p><strong>Status:</strong> ${eventCase.status}</p>
              ${eventCase.description ? `<p><strong>Description:</strong> ${eventCase.description}</p>` : ''}
            ` : ''}
            <p>Please review the case details and begin your investigation promptly.</p>
            ${custom_message ? `<p><em>${custom_message}</em></p>` : ''}
          </div>
          <div class="footer">
            <p>Vision-Y Security Platform</p>
          </div>
        </div>
      `;
      break;

    case 'evidence_added':
      subject = '🔍 New Evidence Added';
      html = `
        ${baseStyle}
        <div class="container">
          <div class="header">
            <h1>Evidence Notification</h1>
          </div>
          <div class="content">
            <p>Hello ${recipient_name || 'Security Team'},</p>
            <div class="alert-box success">
              <strong>New evidence has been added to a case!</strong>
            </div>
            ${eventCase ? `
              <p><strong>Case:</strong> ${eventCase.case_number} - ${eventCase.title}</p>
            ` : ''}
            <p>New evidence has been uploaded and added to the chain of custody.</p>
            ${custom_message ? `<p><em>${custom_message}</em></p>` : ''}
          </div>
          <div class="footer">
            <p>Vision-Y Security Platform</p>
          </div>
        </div>
      `;
      break;

    case 'high_confidence_detection':
      subject = '🚨 High Confidence Security Alert';
      html = `
        ${baseStyle}
        <div class="container">
          <div class="header">
            <h1>High Confidence Detection</h1>
          </div>
          <div class="content">
            <p>Hello ${recipient_name || 'Security Team'},</p>
            <div class="alert-box critical">
              <strong>AI has detected a high-confidence security event!</strong>
            </div>
            ${event ? `
              <p><strong>Location:</strong> ${event.vy_device?.name || 'Unknown'}</p>
              <p><strong>Time:</strong> ${new Date(event.occurred_at).toLocaleString()}</p>
              <p><strong>Event Type:</strong> ${event.class_name || event.type}</p>
            ` : ''}
            ${analysis ? `
              <p><strong>Analysis Type:</strong> ${analysis.analysis_type}</p>
              <p><strong>Confidence Score:</strong> ${Math.round((analysis.confidence_score || 0) * 100)}%</p>
            ` : ''}
            <p>This event requires immediate attention from the security team.</p>
            ${custom_message ? `<p><em>${custom_message}</em></p>` : ''}
          </div>
          <div class="footer">
            <p>Vision-Y Security Platform</p>
          </div>
        </div>
      `;
      break;

    default:
      subject = '🔔 Security System Alert';
      html = `
        ${baseStyle}
        <div class="container">
          <div class="header">
            <h1>Security Alert</h1>
          </div>
          <div class="content">
            <p>Hello ${recipient_name || 'Security Team'},</p>
            <div class="alert-box">
              <strong>Security system alert: ${alertType}</strong>
            </div>
            ${custom_message ? `<p>${custom_message}</p>` : ''}
            <p>Please check your Vision-Y dashboard for more details.</p>
          </div>
          <div class="footer">
            <p>Vision-Y Security Platform</p>
          </div>
        </div>
      `;
  }

  return { subject, html };
}

serve(handler);