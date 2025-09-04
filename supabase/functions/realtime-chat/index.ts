import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};


serve(async (req) => {
  console.log('Realtime chat request received:', req.method);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Handle WebSocket upgrade
  if (req.headers.get("upgrade")?.toLowerCase() === "websocket") {
    const { socket, response } = Deno.upgradeWebSocket(req);
    
    let openAISocket: WebSocket | null = null;
    let sessionCreated = false;

    console.log('WebSocket connection established');

    socket.onopen = () => {
      console.log('Client WebSocket opened');
      
      // Connect to OpenAI Realtime API
      const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
      if (!OPENAI_API_KEY) {
        console.error('OPENAI_API_KEY not found');
        socket.close(1000, 'API key not configured');
        return;
      }

      console.log('Connecting to OpenAI Realtime API...');
      openAISocket = new WebSocket(
        'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01',
        {
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'OpenAI-Beta': 'realtime=v1'
          }
        }
      );

      openAISocket.onopen = () => {
        console.log('Connected to OpenAI Realtime API');
      };

      openAISocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('OpenAI message type:', data.type);

          // Handle session created event
          if (data.type === 'session.created') {
            console.log('Session created, sending session.update');
            sessionCreated = true;

            // Send session configuration
            const sessionUpdate = {
              type: 'session.update',
              session: {
                modalities: ['text', 'audio'],
                instructions: `You are a helpful AI security assistant for Vision-Y Security Platform. 
                
You help users with:
- Security case management and investigation
- Event analysis and reporting  
- Device monitoring and alerts
- Evidence collection and documentation
- Threat assessment and recommendations

You have access to security data and can perform various functions when requested. 
Be professional, concise, and security-focused in your responses.

When users ask about events, cases, or security data, use the appropriate function calls to get real information.`,
                voice: 'alloy',
                input_audio_format: 'pcm16',
                output_audio_format: 'pcm16',
                input_audio_transcription: {
                  model: 'whisper-1'
                },
                turn_detection: {
                  type: 'server_vad',
                  threshold: 0.5,
                  prefix_padding_ms: 300,
                  silence_duration_ms: 1000
                },
                tools: [
                  {
                    type: 'function',
                    name: 'get_security_events',
                    description: 'Get recent security events and detections from cameras and sensors',
                    parameters: {
                      type: 'object',
                      properties: {
                        limit: { type: 'number', description: 'Number of events to retrieve (default 10)' },
                        severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'], description: 'Filter by severity level' },
                        device_id: { type: 'string', description: 'Filter by specific device ID' }
                      }
                    }
                  },
                  {
                    type: 'function',
                    name: 'get_case_details',
                    description: 'Get details about a specific security case by case number or ID',
                    parameters: {
                      type: 'object',
                      properties: {
                        case_id: { type: 'string', description: 'Case ID or case number' }
                      },
                      required: ['case_id']
                    }
                  },
                  {
                    type: 'function',
                    name: 'create_security_case',
                    description: 'Create a new security case for investigation',
                    parameters: {
                      type: 'object',
                      properties: {
                        title: { type: 'string', description: 'Case title' },
                        description: { type: 'string', description: 'Case description' },
                        priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
                        category: { type: 'string', enum: ['security', 'theft', 'vandalism', 'trespassing', 'maintenance', 'other'] }
                      },
                      required: ['title', 'description']
                    }
                  },
                  {
                    type: 'function',
                    name: 'get_device_status',
                    description: 'Get current status and health information for security devices',
                    parameters: {
                      type: 'object',
                      properties: {
                        device_id: { type: 'string', description: 'Specific device ID (optional)' }
                      }
                    }
                  },
                  {
                    type: 'function',
                    name: 'analyze_threat_level',
                    description: 'Analyze current threat level based on recent events and patterns',
                    parameters: {
                      type: 'object',
                      properties: {
                        time_range: { type: 'string', description: 'Time range for analysis (e.g., "24h", "1w")' }
                      }
                    }
                  }
                ],
                tool_choice: 'auto',
                temperature: 0.7,
                max_response_output_tokens: 'inf'
              }
            };

            openAISocket?.send(JSON.stringify(sessionUpdate));
          }

          // Handle function calls
          if (data.type === 'response.function_call_arguments.done') {
            console.log('Function call completed:', data.name, data.arguments);
            handleFunctionCall(data.name, JSON.parse(data.arguments), data.call_id, openAISocket);
          }

          // Forward all messages to client
          socket.send(event.data);
        } catch (error) {
          console.error('Error processing OpenAI message:', error);
        }
      };

      openAISocket.onerror = (error) => {
        console.error('OpenAI WebSocket error:', error);
        socket.close(1000, 'OpenAI connection failed');
      };

      openAISocket.onclose = () => {
        console.log('OpenAI WebSocket closed');
        socket.close();
      };
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('Client message type:', message.type);

        // Forward client messages to OpenAI
        if (openAISocket && openAISocket.readyState === WebSocket.OPEN) {
          openAISocket.send(event.data);
        } else {
          console.log('OpenAI WebSocket not ready, queuing message');
        }
      } catch (error) {
        console.error('Error processing client message:', error);
      }
    };

    socket.onclose = () => {
      console.log('Client WebSocket closed');
      if (openAISocket) {
        openAISocket.close();
      }
    };

    socket.onerror = (error) => {
      console.error('Client WebSocket error:', error);
    };

    return response;
  }

  // Handle regular HTTP requests (for testing)
  return new Response(JSON.stringify({ status: 'WebSocket endpoint ready' }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
});

// Function call handlers with dummy data
async function handleFunctionCall(functionName: string, args: any, callId: string, openAISocket: WebSocket | null) {
  console.log(`Executing function: ${functionName}`, args);
  
  let result: any = {};

  try {
    switch (functionName) {
      case 'get_security_events':
        result = await getSecurityEvents(args);
        break;
      case 'get_case_details':
        result = await getCaseDetails(args);
        break;
      case 'create_security_case':
        result = await createSecurityCase(args);
        break;
      case 'get_device_status':
        result = await getDeviceStatus(args);
        break;
      case 'analyze_threat_level':
        result = await analyzeThreatLevel(args);
        break;
      default:
        result = { error: 'Unknown function' };
    }

    // Send function result back to OpenAI
    const functionResponse = {
      type: 'conversation.item.create',
      item: {
        type: 'function_call_output',
        call_id: callId,
        output: JSON.stringify(result)
      }
    };

    console.log('Sending function result:', result);
    openAISocket?.send(JSON.stringify(functionResponse));
    
    // Trigger response creation
    openAISocket?.send(JSON.stringify({ type: 'response.create' }));

  } catch (error) {
    console.error('Function call error:', error);
    const errorResponse = {
      type: 'conversation.item.create', 
      item: {
        type: 'function_call_output',
        call_id: callId,
        output: JSON.stringify({ error: error.message })
      }
    };
    openAISocket?.send(JSON.stringify(errorResponse));
  }
}

// Dummy data functions
async function getSecurityEvents(args: any) {
  const events = [
    {
      id: 'evt_001',
      type: 'motion_detection',
      severity: 'medium',
      device_id: 'cam_entrance_01',
      device_name: 'Main Entrance Camera',
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      description: 'Motion detected at main entrance',
      confidence: 0.87,
      location: 'Building A - Main Entrance'
    },
    {
      id: 'evt_002', 
      type: 'person_detection',
      severity: 'high',
      device_id: 'cam_parking_02',
      device_name: 'Parking Lot Camera 2',
      timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      description: 'Unauthorized person detected in restricted parking area',
      confidence: 0.92,
      location: 'Building A - Parking Lot'
    },
    {
      id: 'evt_003',
      type: 'door_access',
      severity: 'low',
      device_id: 'door_lobby_01',
      device_name: 'Lobby Access Control',
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      description: 'Badge access granted to authorized personnel',
      confidence: 1.0,
      location: 'Building A - Lobby'
    },
    {
      id: 'evt_004',
      type: 'vehicle_detection',
      severity: 'critical',
      device_id: 'cam_gate_01',
      device_name: 'Security Gate Camera',
      timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      description: 'Unregistered vehicle attempting to enter premises',
      confidence: 0.95,
      location: 'Main Security Gate'
    }
  ];

  let filteredEvents = events;
  
  if (args.severity) {
    filteredEvents = events.filter(e => e.severity === args.severity);
  }
  
  if (args.device_id) {
    filteredEvents = events.filter(e => e.device_id === args.device_id);
  }

  const limit = args.limit || 10;
  return {
    events: filteredEvents.slice(0, limit),
    total_count: filteredEvents.length,
    timestamp: new Date().toISOString()
  };
}

async function getCaseDetails(args: any) {
  const cases = {
    'CASE-25-0001': {
      case_number: 'CASE-25-0001',
      title: 'Unauthorized Access Investigation',
      status: 'investigating',
      priority: 'high',
      category: 'security',
      created_at: '2025-01-15T09:30:00Z',
      assigned_to: 'Security Team Alpha',
      description: 'Investigation into unauthorized access attempts at Building A main entrance between 2:00-3:00 AM.',
      evidence_count: 3,
      related_events: ['evt_001', 'evt_002'],
      timeline: [
        { time: '2025-01-15T02:15:00Z', event: 'Motion detected at main entrance' },
        { time: '2025-01-15T02:18:00Z', event: 'Failed badge access attempt' },
        { time: '2025-01-15T02:25:00Z', event: 'Security patrol dispatched' }
      ]
    },
    'CASE-25-0002': {
      case_number: 'CASE-25-0002', 
      title: 'Parking Lot Security Breach',
      status: 'open',
      priority: 'medium',
      category: 'trespassing',
      created_at: '2025-01-14T14:22:00Z',
      description: 'Reports of unauthorized individuals in employee parking area.',
      evidence_count: 2,
      related_events: ['evt_004']
    }
  };

  const caseData = cases[args.case_id as keyof typeof cases];
  
  if (!caseData) {
    return { error: 'Case not found', case_id: args.case_id };
  }

  return caseData;
}

async function createSecurityCase(args: any) {
  const caseNumber = `CASE-25-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`;
  
  return {
    success: true,
    case_number: caseNumber,
    title: args.title,
    description: args.description,
    priority: args.priority || 'medium',
    category: args.category || 'security',
    status: 'open',
    created_at: new Date().toISOString(),
    message: `Security case ${caseNumber} has been created successfully.`
  };
}

async function getDeviceStatus(args: any) {
  const devices = [
    {
      device_id: 'cam_entrance_01',
      name: 'Main Entrance Camera',
      type: 'IP Camera',
      status: 'online',
      health_score: 95,
      last_seen: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      location: 'Building A - Main Entrance',
      firmware_version: '2.1.4',
      uptime: '15 days, 4 hours'
    },
    {
      device_id: 'cam_parking_02',
      name: 'Parking Lot Camera 2', 
      type: 'IP Camera',
      status: 'online',
      health_score: 87,
      last_seen: new Date(Date.now() - 1 * 60 * 1000).toISOString(),
      location: 'Building A - Parking Lot',
      firmware_version: '2.1.3',
      uptime: '12 days, 8 hours'
    },
    {
      device_id: 'door_lobby_01',
      name: 'Lobby Access Control',
      type: 'Access Control',
      status: 'online', 
      health_score: 98,
      last_seen: new Date(Date.now() - 30 * 1000).toISOString(),
      location: 'Building A - Lobby',
      firmware_version: '1.8.2',
      uptime: '28 days, 12 hours'
    },
    {
      device_id: 'cam_gate_01',
      name: 'Security Gate Camera',
      type: 'IP Camera', 
      status: 'offline',
      health_score: 0,
      last_seen: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      location: 'Main Security Gate',
      firmware_version: '2.0.8',
      uptime: '0 seconds',
      issues: ['Connection timeout', 'Power supply issue suspected']
    }
  ];

  if (args.device_id) {
    const device = devices.find(d => d.device_id === args.device_id);
    return device ? { device } : { error: 'Device not found' };
  }

  return {
    devices,
    summary: {
      total: devices.length,
      online: devices.filter(d => d.status === 'online').length,
      offline: devices.filter(d => d.status === 'offline').length,
      average_health: Math.round(devices.reduce((acc, d) => acc + d.health_score, 0) / devices.length)
    }
  };
}

async function analyzeThreatLevel(args: any) {
  return {
    current_threat_level: 'ELEVATED',
    risk_score: 6.5,
    time_range: args.time_range || '24h',
    analysis: {
      total_events: 47,
      high_severity_events: 3,
      critical_events: 1,
      trending_threats: [
        'Unauthorized access attempts',
        'After-hours activity',
        'Unregistered vehicles'
      ],
      recommendations: [
        'Increase security patrols during night hours',
        'Review and update access control policies', 
        'Install additional perimeter cameras',
        'Implement vehicle registration system'
      ]
    },
    recent_incidents: [
      {
        type: 'Unauthorized Access',
        count: 2,
        last_occurrence: '45 minutes ago'
      },
      {
        type: 'Suspicious Vehicle',
        count: 1, 
        last_occurrence: '1 hour ago'
      }
    ],
    timestamp: new Date().toISOString()
  };
}