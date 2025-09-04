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
    const { deviceId, rtspUrl, webrtcUrl } = await req.json();

    if (!deviceId && !rtspUrl && !webrtcUrl) {
      throw new Error('Missing required parameters: deviceId or stream URL');
    }

    // Simulate connection test - In a real implementation, this would:
    // 1. Try to connect to the RTSP/WebRTC stream
    // 2. Capture a frame for preview
    // 3. Test stream stability
    // 4. Return connection status and preview image

    console.log('Testing device connection:', { deviceId, rtspUrl, webrtcUrl });

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    // Mock different outcomes based on URL patterns
    let success = true;
    let errorMessage = '';
    let previewImageUrl = null;

    // Simulate some failure scenarios for testing
    if (rtspUrl?.includes('invalid') || webrtcUrl?.includes('invalid')) {
      success = false;
      errorMessage = 'Invalid stream URL format';
    } else if (rtspUrl?.includes('timeout') || webrtcUrl?.includes('timeout')) {
      success = false;
      errorMessage = 'Connection timeout - camera may be offline';
    } else if (rtspUrl?.includes('auth') || webrtcUrl?.includes('auth')) {
      success = false;
      errorMessage = 'Authentication failed - check credentials';
    } else {
      // Success case - generate a mock preview URL
      previewImageUrl = `data:image/svg+xml;base64,${btoa(`
        <svg width="640" height="360" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#1f2937"/>
          <text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" fill="#9ca3af" font-family="Arial" font-size="18">
            Camera Preview
          </text>
          <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" fill="#6b7280" font-family="Arial" font-size="14">
            Connection Test Successful
          </text>
          <circle cx="50" cy="50" r="8" fill="#10b981"/>
          <text x="70" y="55" fill="#10b981" font-family="Arial" font-size="12">LIVE</text>
        </svg>
      `)}`;
    }

    // If deviceId is provided, update the device's last test status
    if (deviceId && success) {
      try {
        await supabase
          .from('vy_device')
          .update({
            last_seen: new Date().toISOString(),
            health_score: 95 + Math.floor(Math.random() * 5),
          })
          .eq('id', deviceId);
      } catch (updateError) {
        console.error('Error updating device status:', updateError);
        // Don't fail the entire test for this
      }
    }

    return new Response(
      JSON.stringify({
        success,
        error: success ? null : errorMessage,
        data: success ? {
          connectionTime: Math.floor(Math.random() * 500) + 100, // ms
          streamQuality: success ? 'HD' : null,
          previewImageUrl,
          timestamp: new Date().toISOString(),
        } : null,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in device-test function:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'An unexpected error occurred during connection test',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});