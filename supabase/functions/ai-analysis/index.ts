import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

interface AnalysisRequest {
  event_id: string;
  analysis_type: 'object_detection' | 'behavior_analysis' | 'anomaly_detection' | 'facial_recognition';
  image_url?: string;
  additional_context?: Record<string, any>;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { event_id, analysis_type, image_url, additional_context }: AnalysisRequest = await req.json();

    if (!event_id || !analysis_type) {
      throw new Error('Missing required parameters: event_id and analysis_type');
    }

    // Get the event details
    const { data: event, error: eventError } = await supabase
      .from('vy_event')
      .select('*')
      .eq('id', event_id)
      .single();

    if (eventError || !event) {
      throw new Error('Event not found');
    }

    const startTime = Date.now();
    let analysisResults: Record<string, any> = {};
    let confidence = 0.0;

    // Perform different types of AI analysis
    switch (analysis_type) {
      case 'object_detection':
        analysisResults = await performObjectDetection(image_url || event.image_url, additional_context);
        confidence = analysisResults.confidence || 0.85;
        break;

      case 'behavior_analysis':
        analysisResults = await performBehaviorAnalysis(event, additional_context);
        confidence = analysisResults.confidence || 0.75;
        break;

      case 'anomaly_detection':
        analysisResults = await performAnomalyDetection(event, additional_context);
        confidence = analysisResults.confidence || 0.80;
        break;

      case 'facial_recognition':
        analysisResults = await performFacialRecognition(image_url || event.image_url, additional_context);
        confidence = analysisResults.confidence || 0.70;
        break;

      default:
        throw new Error(`Unsupported analysis type: ${analysis_type}`);
    }

    const processingTime = Date.now() - startTime;

    // Save analysis results
    const { data: analysis, error: analysisError } = await supabase
      .from('ai_analysis')
      .insert({
        event_id,
        analysis_type,
        confidence_score: confidence,
        results: analysisResults,
        model_version: 'v1.0.0',
        processing_time_ms: processingTime,
        tenant_id: event.tenant_id,
      })
      .select()
      .single();

    if (analysisError) {
      throw analysisError;
    }

    // Create follow-up actions based on analysis
    await createFollowUpActions(analysis, event);

    console.log(`AI Analysis completed for event ${event_id}:`, {
      analysis_type,
      confidence,
      processing_time_ms: processingTime,
    });

    return new Response(
      JSON.stringify({
        success: true,
        analysis_id: analysis.id,
        results: analysisResults,
        confidence,
        processing_time_ms: processingTime,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in ai-analysis function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function performObjectDetection(imageUrl: string, context?: Record<string, any>) {
  if (!imageUrl) {
    return {
      objects: [],
      confidence: 0.0,
      message: 'No image provided for analysis',
    };
  }

  try {
    // Call OpenAI Vision API for advanced object detection
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are an expert security analyst. Analyze the provided image for security-relevant objects, people, vehicles, and activities. 
            Return a JSON response with detected objects, their locations, confidence levels, and any security concerns.
            Focus on: people, vehicles, weapons, suspicious behavior, entry/exit points, and unusual objects.`,
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this security camera image for objects and potential security concerns.',
              },
              {
                type: 'image_url',
                image_url: { url: imageUrl },
              },
            ],
          },
        ],
        max_tokens: 1000,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const analysisText = data.choices[0].message.content;

    // Parse the AI response
    let parsedResults;
    try {
      parsedResults = JSON.parse(analysisText);
    } catch {
      // Fallback if AI doesn't return valid JSON
      parsedResults = {
        objects: [{ type: 'analysis', description: analysisText }],
        confidence: 0.75,
      };
    }

    return {
      ...parsedResults,
      model: 'gpt-4o',
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Object detection error:', error);
    return {
      objects: [],
      confidence: 0.0,
      error: error.message,
    };
  }
}

async function performBehaviorAnalysis(event: any, context?: Record<string, any>) {
  try {
    // Analyze behavior patterns using OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          {
            role: 'system',
            content: `You are a security behavior analyst. Analyze the provided event data for suspicious behavior patterns.
            Consider factors like: time of day, frequency of events, location patterns, and event types.
            Return a JSON response with behavior analysis, risk level, and recommendations.`,
          },
          {
            role: 'user',
            content: `Analyze this security event:
            Event Type: ${event.type}
            Class: ${event.class_name}
            Time: ${event.occurred_at}
            Severity: ${event.severity}
            Confidence: ${event.confidence}
            Location: Device ${event.device_id}
            Metadata: ${JSON.stringify(event.meta)}
            Context: ${JSON.stringify(context)}`,
          },
        ],
        max_completion_tokens: 800,
        temperature: 0.2,
      }),
    });

    const data = await response.json();
    const analysisText = data.choices[0].message.content;

    let parsedResults;
    try {
      parsedResults = JSON.parse(analysisText);
    } catch {
      parsedResults = {
        behavior_type: 'unknown',
        risk_level: 'medium',
        analysis: analysisText,
        confidence: 0.70,
      };
    }

    return {
      ...parsedResults,
      model: 'gpt-5-2025-08-07',
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Behavior analysis error:', error);
    return {
      behavior_type: 'error',
      risk_level: 'unknown',
      error: error.message,
      confidence: 0.0,
    };
  }
}

async function performAnomalyDetection(event: any, context?: Record<string, any>) {
  try {
    // Get recent events for pattern analysis
    const { data: recentEvents } = await supabase
      .from('vy_event')
      .select('*')
      .eq('device_id', event.device_id)
      .gte('occurred_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('occurred_at', { ascending: false })
      .limit(50);

    // Analyze for anomalies using OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          {
            role: 'system',
            content: `You are an anomaly detection specialist. Analyze the current event against historical patterns to identify anomalies.
            Look for: unusual timing, frequency spikes, location changes, severity patterns, and event type variations.
            Return a JSON response with anomaly score (0-1), anomaly type, and explanation.`,
          },
          {
            role: 'user',
            content: `Current Event: ${JSON.stringify(event)}
            Recent Events (last 24h): ${JSON.stringify(recentEvents?.slice(0, 10))}
            Total Recent Events: ${recentEvents?.length || 0}`,
          },
        ],
        max_completion_tokens: 600,
        temperature: 0.1,
      }),
    });

    const data = await response.json();
    const analysisText = data.choices[0].message.content;

    let parsedResults;
    try {
      parsedResults = JSON.parse(analysisText);
    } catch {
      parsedResults = {
        anomaly_score: 0.5,
        anomaly_type: 'pattern_deviation',
        analysis: analysisText,
        confidence: 0.60,
      };
    }

    return {
      ...parsedResults,
      historical_events_analyzed: recentEvents?.length || 0,
      model: 'gpt-5-2025-08-07',
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Anomaly detection error:', error);
    return {
      anomaly_score: 0.0,
      anomaly_type: 'error',
      error: error.message,
      confidence: 0.0,
    };
  }
}

async function performFacialRecognition(imageUrl: string, context?: Record<string, any>) {
  if (!imageUrl) {
    return {
      faces: [],
      confidence: 0.0,
      message: 'No image provided for facial recognition',
    };
  }

  try {
    // Use OpenAI Vision for face detection and analysis
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are a facial analysis expert. Analyze faces in the image for security purposes.
            Provide: number of faces, estimated ages, genders, emotions, and any notable features.
            Note: Do NOT attempt to identify specific individuals. Focus on general characteristics only.
            Return JSON with face analysis data.`,
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze faces in this security image. Count faces and describe general characteristics.',
              },
              {
                type: 'image_url',
                image_url: { url: imageUrl },
              },
            ],
          },
        ],
        max_tokens: 800,
        temperature: 0.1,
      }),
    });

    const data = await response.json();
    const analysisText = data.choices[0].message.content;

    let parsedResults;
    try {
      parsedResults = JSON.parse(analysisText);
    } catch {
      parsedResults = {
        faces: [{ description: analysisText }],
        confidence: 0.70,
      };
    }

    return {
      ...parsedResults,
      model: 'gpt-4o',
      privacy_note: 'No individual identification performed',
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Facial recognition error:', error);
    return {
      faces: [],
      confidence: 0.0,
      error: error.message,
    };
  }
}

async function createFollowUpActions(analysis: any, event: any) {
  try {
    const results = analysis.results;
    let shouldCreateCase = false;
    let casePriority = 'medium';
    let caseCategory = 'security';

    // Determine if we should create a case based on analysis results
    if (analysis.analysis_type === 'anomaly_detection' && results.anomaly_score > 0.8) {
      shouldCreateCase = true;
      casePriority = 'high';
    }

    if (analysis.analysis_type === 'behavior_analysis' && results.risk_level === 'high') {
      shouldCreateCase = true;
      casePriority = 'high';
    }

    if (analysis.analysis_type === 'object_detection' && results.objects?.some((obj: any) => obj.type === 'weapon')) {
      shouldCreateCase = true;
      casePriority = 'critical';
    }

    if (shouldCreateCase) {
      // Generate case number
      const { data: caseNumber } = await supabase
        .rpc('generate_case_number', { tenant_id: event.tenant_id });

      if (caseNumber) {
        await supabase
          .from('cases')
          .insert({
            case_number: caseNumber,
            title: `AI-Generated Case: ${analysis.analysis_type}`,
            description: `Automatically created based on AI analysis results. Analysis confidence: ${analysis.confidence_score}`,
            priority: casePriority,
            category: caseCategory,
            status: 'open',
            created_by: '00000000-0000-0000-0000-000000000000', // System user
            tenant_id: event.tenant_id,
            incident_date: event.occurred_at,
          });

        console.log(`Auto-created case ${caseNumber} for event ${event.id}`);
      }
    }

    // Send alerts based on analysis results
    if (analysis.confidence_score > 0.85 && (results.risk_level === 'high' || results.anomaly_score > 0.9)) {
      await supabase.functions.invoke('send-alert-email', {
        body: {
          event_id: event.id,
          analysis_id: analysis.id,
          alert_type: 'high_confidence_detection',
        },
      });
    }
  } catch (error) {
    console.error('Error creating follow-up actions:', error);
  }
}