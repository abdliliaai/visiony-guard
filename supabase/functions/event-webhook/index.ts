import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EventPayload {
  tenant_id: string;
  device_id: string;
  type: 'detection' | 'alert' | 'behavior' | 'system';
  class_name?: string;
  confidence?: number;
  bbox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  image_data?: string; // base64 encoded image
  clip_url?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  meta?: Record<string, any>;
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

    const payload: EventPayload = await req.json();
    
    console.log('Received event payload:', payload);

    // Validate required fields
    if (!payload.tenant_id || !payload.device_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: tenant_id, device_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify device exists and belongs to tenant
    const { data: device, error: deviceError } = await supabase
      .from('vy_device')
      .select('id, name, tenant_id')
      .eq('id', payload.device_id)
      .eq('tenant_id', payload.tenant_id)
      .single();

    if (deviceError || !device) {
      return new Response(
        JSON.stringify({ error: 'Device not found or unauthorized' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let image_url = null;

    // Upload image data to storage if provided
    if (payload.image_data) {
      try {
        const eventId = crypto.randomUUID();
        const fileName = `${payload.tenant_id}/${eventId}.jpg`;
        
        // Decode base64 image
        const imageBytes = Uint8Array.from(atob(payload.image_data), c => c.charCodeAt(0));
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('vy-snapshots')
          .upload(fileName, imageBytes, {
            contentType: 'image/jpeg',
            upsert: false
          });

        if (uploadError) {
          console.error('Image upload error:', uploadError);
        } else {
          image_url = `vy-snapshots/${fileName}`;
        }
      } catch (error) {
        console.error('Error processing image data:', error);
      }
    }

    // Insert event into database
    const { data: event, error: eventError } = await supabase
      .from('vy_event')
      .insert({
        tenant_id: payload.tenant_id,
        device_id: payload.device_id,
        type: payload.type || 'detection',
        class_name: payload.class_name,
        confidence: payload.confidence,
        bbox: payload.bbox,
        image_url,
        clip_url: payload.clip_url,
        severity: payload.severity || 'low',
        meta: payload.meta || {},
        occurred_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (eventError) {
      console.error('Event insertion error:', eventError);
      return new Response(
        JSON.stringify({ error: 'Failed to create event' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Broadcast realtime update
    const channel = supabase.channel('vy_events');
    await channel.send({
      type: 'broadcast',
      event: 'event_created',
      payload: {
        ...event,
        device_name: device.name,
      },
    });

    // Get signed URL for image if it was uploaded
    let signed_image_url = null;
    if (image_url) {
      const { data: signedUrlData } = await supabase.storage
        .from('vy-snapshots')
        .createSignedUrl(image_url.replace('vy-snapshots/', ''), 3600); // 1 hour expiry
      
      if (signedUrlData) {
        signed_image_url = signedUrlData.signedUrl;
      }
    }

    console.log('Event created successfully:', event.id);

    return new Response(
      JSON.stringify({
        success: true,
        event: {
          ...event,
          signed_image_url,
        },
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Event webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});