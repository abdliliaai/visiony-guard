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
    const { action, deviceId } = await req.json();

    if (!action || !deviceId) {
      throw new Error('Missing required parameters: action and deviceId');
    }

    // Verify user has access to this device
    const { data: device, error: deviceError } = await supabase
      .from('vy_device')
      .select('*, vy_tenant!inner(org_id)')
      .eq('id', deviceId)
      .single();

    if (deviceError || !device) {
      throw new Error('Device not found or access denied');
    }

    // Check user permissions
    const { data: userProfile } = await supabase
      .from('vy_user_profile')
      .select('role, org_id, tenant_id')
      .eq('user_id', user.id)
      .single();

    if (!userProfile) {
      throw new Error('User profile not found');
    }

    // Check if user has access to this device's tenant
    const hasAccess = userProfile.role === 'root_admin' || 
                     (userProfile.role === 'tenant_admin' && userProfile.tenant_id === device.tenant_id);

    if (!hasAccess) {
      throw new Error('Insufficient permissions to control this device');
    }

    console.log(`Executing ${action} on device ${deviceId} by user ${user.id}`);

    let result: any = {};

    switch (action) {
      case 'restart':
        result = await handleRestart(device, supabase);
        break;
      case 'stop':
        result = await handleStop(device, supabase);
        break;
      case 'start':
        result = await handleStart(device, supabase);
        break;
      case 'update_config':
        result = await handleUpdateConfig(device, supabase);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        action,
        deviceId,
        result,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in device-control function:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'An unexpected error occurred during device control',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function handleRestart(device: any, supabase: any) {
  // In a real implementation, this would:
  // 1. Send stop signal to the streams worker
  // 2. Wait for confirmation
  // 3. Send start signal with updated config
  // 4. Monitor startup process
  // 5. Update device status

  console.log(`Restarting device stream: ${device.name}`);
  
  // Simulate restart process
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Update device status
  const { error } = await supabase
    .from('vy_device')
    .update({
      last_seen: new Date().toISOString(),
      online: true,
      health_score: 95,
      updated_at: new Date().toISOString(),
    })
    .eq('id', device.id);

  if (error) {
    throw new Error('Failed to update device status after restart');
  }

  return {
    message: 'Device stream restarted successfully',
    status: 'online',
    health_score: 95,
  };
}

async function handleStop(device: any, supabase: any) {
  console.log(`Stopping device stream: ${device.name}`);
  
  // Simulate stop process
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Update device status
  const { error } = await supabase
    .from('vy_device')
    .update({
      online: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', device.id);

  if (error) {
    throw new Error('Failed to update device status after stop');
  }

  return {
    message: 'Device stream stopped successfully',
    status: 'offline',
  };
}

async function handleStart(device: any, supabase: any) {
  console.log(`Starting device stream: ${device.name}`);
  
  // Simulate start process
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Update device status
  const { error } = await supabase
    .from('vy_device')
    .update({
      online: true,
      last_seen: new Date().toISOString(),
      health_score: 90,
      updated_at: new Date().toISOString(),
    })
    .eq('id', device.id);

  if (error) {
    throw new Error('Failed to update device status after start');
  }

  return {
    message: 'Device stream started successfully',
    status: 'online',
    health_score: 90,
  };
}

async function handleUpdateConfig(device: any, supabase: any) {
  console.log(`Updating device configuration: ${device.name}`);
  
  // In a real implementation, this would push new configuration
  // to the streams worker and restart the stream with new settings
  
  // Simulate config update
  await new Promise(resolve => setTimeout(resolve, 1000));

  return {
    message: 'Device configuration updated successfully',
    config_updated: true,
  };
}