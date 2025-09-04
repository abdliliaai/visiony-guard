#!/usr/bin/env node

/**
 * Vision-Y Streams Worker
 * Handles RTSP/WebRTC ingestion, HLS generation, AI detection, and event processing
 */

const ffmpeg = require('fluent-ffmpeg');
const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const sharp = require('sharp');
require('dotenv').config();

// Configuration
const CONFIG = {
  port: parseInt(process.env.VY_STREAMS_PORT || '8002'),
  supabaseUrl: process.env.VY_SUPABASE_URL,
  supabaseServiceKey: process.env.VY_SUPABASE_SERVICE_ROLE,
  mlServiceUrl: process.env.VY_ML_URL || 'http://localhost:8001',
  hlsSegmentSeconds: parseInt(process.env.VY_HLS_SEGMENT_SECONDS || '2'),
  eventPrePostSeconds: parseInt(process.env.VY_EVENT_PREPOST_SECONDS || '5'),
  detectionIntervalMs: parseInt(process.env.VY_DETECTION_INTERVAL_MS || '5000'),
  outputDir: process.env.VY_OUTPUT_DIR || './output',
  tempDir: process.env.VY_TEMP_DIR || './temp',
};

// Logging utility
const logger = {
  info: (msg, meta = {}) => console.log(`[INFO] ${new Date().toISOString()} ${msg}`, meta),
  error: (msg, meta = {}) => console.error(`[ERROR] ${new Date().toISOString()} ${msg}`, meta),
  warn: (msg, meta = {}) => console.warn(`[WARN] ${new Date().toISOString()} ${msg}`, meta),
  debug: (msg, meta = {}) => process.env.DEBUG && console.log(`[DEBUG] ${new Date().toISOString()} ${msg}`, meta),
};

// Stream Manager Class
class StreamManager {
  constructor() {
    this.activeStreams = new Map();
    this.detectionIntervals = new Map();
    this.wsClients = new Set();
    this.app = express();
    this.setupExpress();
    this.setupWebSocket();
  }

  setupExpress() {
    this.app.use(cors());
    this.app.use(express.json());
    
    // Serve HLS streams
    this.app.use('/hls', express.static(CONFIG.outputDir));
    
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        activeStreams: this.activeStreams.size,
        timestamp: new Date().toISOString(),
      });
    });

    // Start stream endpoint
    this.app.post('/streams/start', async (req, res) => {
      try {
        const { deviceId, rtspUrl, tenantId } = req.body;
        await this.startStream(deviceId, rtspUrl, tenantId);
        res.json({ success: true, deviceId });
      } catch (error) {
        logger.error('Failed to start stream', { error: error.message });
        res.status(500).json({ error: error.message });
      }
    });

    // Stop stream endpoint
    this.app.post('/streams/stop', async (req, res) => {
      try {
        const { deviceId } = req.body;
        await this.stopStream(deviceId);
        res.json({ success: true, deviceId });
      } catch (error) {
        logger.error('Failed to stop stream', { error: error.message });
        res.status(500).json({ error: error.message });
      }
    });

    // List active streams
    this.app.get('/streams', (req, res) => {
      const streams = Array.from(this.activeStreams.entries()).map(([id, stream]) => ({
        deviceId: id,
        status: stream.status,
        startTime: stream.startTime,
        lastSnapshot: stream.lastSnapshot,
      }));
      res.json({ streams });
    });
  }

  setupWebSocket() {
    this.wss = new WebSocket.Server({ port: CONFIG.port + 1 });
    
    this.wss.on('connection', (ws) => {
      logger.info('WebSocket client connected');
      this.wsClients.add(ws);
      
      ws.on('close', () => {
        logger.info('WebSocket client disconnected');
        this.wsClients.delete(ws);
      });
      
      ws.on('error', (error) => {
        logger.error('WebSocket error', { error: error.message });
        this.wsClients.delete(ws);
      });
    });
  }

  async startStream(deviceId, rtspUrl, tenantId) {
    if (this.activeStreams.has(deviceId)) {
      logger.warn('Stream already active', { deviceId });
      return;
    }

    logger.info('Starting stream', { deviceId, rtspUrl });

    const outputPath = path.join(CONFIG.outputDir, deviceId);
    const tempPath = path.join(CONFIG.tempDir, deviceId);
    
    // Create directories
    await fs.mkdir(outputPath, { recursive: true });
    await fs.mkdir(tempPath, { recursive: true });

    const streamInfo = {
      deviceId,
      rtspUrl,
      tenantId,
      outputPath,
      tempPath,
      status: 'starting',
      startTime: new Date().toISOString(),
      lastSnapshot: null,
      ffmpegProcess: null,
    };

    // Start FFmpeg for HLS generation
    const command = ffmpeg(rtspUrl)
      .inputOptions([
        '-rtsp_transport', 'tcp',
        '-analyzeduration', '1000000',
        '-probesize', '1000000',
      ])
      .outputOptions([
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-tune', 'zerolatency',
        '-g', '30',
        '-sc_threshold', '0',
        '-f', 'hls',
        '-hls_time', CONFIG.hlsSegmentSeconds.toString(),
        '-hls_list_size', '10',
        '-hls_flags', 'delete_segments',
        '-hls_segment_filename', path.join(outputPath, 'segment_%03d.ts'),
      ])
      .output(path.join(outputPath, 'index.m3u8'));

    command.on('start', (commandLine) => {
      logger.info('FFmpeg started', { deviceId, commandLine });
      streamInfo.status = 'running';
    });

    command.on('error', (err) => {
      logger.error('FFmpeg error', { deviceId, error: err.message });
      streamInfo.status = 'error';
      this.activeStreams.delete(deviceId);
    });

    command.on('end', () => {
      logger.info('FFmpeg ended', { deviceId });
      streamInfo.status = 'stopped';
      this.activeStreams.delete(deviceId);
    });

    streamInfo.ffmpegProcess = command;
    command.run();

    this.activeStreams.set(deviceId, streamInfo);

    // Start detection interval
    this.startDetectionLoop(deviceId);

    // Update device status in database
    await this.updateDeviceStatus(deviceId, true);
  }

  async stopStream(deviceId) {
    const streamInfo = this.activeStreams.get(deviceId);
    if (!streamInfo) {
      logger.warn('Stream not found', { deviceId });
      return;
    }

    logger.info('Stopping stream', { deviceId });

    // Stop FFmpeg
    if (streamInfo.ffmpegProcess) {
      streamInfo.ffmpegProcess.kill('SIGTERM');
    }

    // Stop detection loop
    this.stopDetectionLoop(deviceId);

    // Update device status
    await this.updateDeviceStatus(deviceId, false);

    this.activeStreams.delete(deviceId);
  }

  startDetectionLoop(deviceId) {
    const interval = setInterval(async () => {
      try {
        await this.performDetection(deviceId);
      } catch (error) {
        logger.error('Detection loop error', { deviceId, error: error.message });
      }
    }, CONFIG.detectionIntervalMs);

    this.detectionIntervals.set(deviceId, interval);
  }

  stopDetectionLoop(deviceId) {
    const interval = this.detectionIntervals.get(deviceId);
    if (interval) {
      clearInterval(interval);
      this.detectionIntervals.delete(deviceId);
    }
  }

  async performDetection(deviceId) {
    const streamInfo = this.activeStreams.get(deviceId);
    if (!streamInfo || streamInfo.status !== 'running') {
      return;
    }

    try {
      // Capture frame from stream
      const frameBuffer = await this.captureFrame(streamInfo.rtspUrl);
      
      // Convert to base64
      const frameBase64 = frameBuffer.toString('base64');

      // Get device thresholds
      const thresholds = await this.getDeviceThresholds(deviceId);

      // Call ML service
      const detectionResponse = await axios.post(`${CONFIG.mlServiceUrl}/detect`, {
        image_data: frameBase64,
        thresholds,
      });

      const { detections } = detectionResponse.data;

      if (detections.length > 0) {
        logger.info('Detections found', { deviceId, count: detections.length });

        // Save snapshot
        const snapshotPath = await this.saveSnapshot(deviceId, frameBuffer);
        streamInfo.lastSnapshot = snapshotPath;

        // Evaluate rules and create events
        await this.evaluateRules(deviceId, detections, snapshotPath);

        // Broadcast detection metadata via WebSocket
        this.broadcastDetections(deviceId, detections);
      }

      // Update last seen
      await this.updateDeviceLastSeen(deviceId);

    } catch (error) {
      logger.error('Detection failed', { deviceId, error: error.message });
    }
  }

  async captureFrame(rtspUrl) {
    return new Promise((resolve, reject) => {
      const command = ffmpeg(rtspUrl)
        .inputOptions(['-rtsp_transport', 'tcp'])
        .outputOptions([
          '-vframes', '1',
          '-f', 'image2pipe',
          '-vcodec', 'mjpeg',
        ])
        .format('mjpeg');

      const buffers = [];
      
      command.on('error', reject);
      
      command.pipe()
        .on('data', (chunk) => buffers.push(chunk))
        .on('end', () => resolve(Buffer.concat(buffers)))
        .on('error', reject);
    });
  }

  async saveSnapshot(deviceId, frameBuffer) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${deviceId}_${timestamp}.jpg`;
    const filepath = path.join(CONFIG.tempDir, deviceId, filename);
    
    // Optimize image
    const optimizedBuffer = await sharp(frameBuffer)
      .jpeg({ quality: 80 })
      .resize(1280, 720, { fit: 'inside' })
      .toBuffer();
    
    await fs.writeFile(filepath, optimizedBuffer);
    return filepath;
  }

  async evaluateRules(deviceId, detections, snapshotPath) {
    // Simplified rule evaluation - implement full rules engine as needed
    const highConfidenceDetections = detections.filter(d => d.confidence > 0.8);
    
    if (highConfidenceDetections.length > 0) {
      // Create event
      await this.createEvent(deviceId, highConfidenceDetections, snapshotPath);
    }
  }

  async createEvent(deviceId, detections, snapshotPath) {
    try {
      // Upload snapshot to Supabase Storage
      const imageUrl = await this.uploadSnapshot(deviceId, snapshotPath);

      // Create event via edge function
      const eventData = {
        device_id: deviceId,
        type: 'detection',
        detections,
        image_data: await fs.readFile(snapshotPath, 'base64'),
        severity: this.determineSeverity(detections),
        meta: {
          processing_time: new Date().toISOString(),
          detection_count: detections.length,
        },
      };

      await axios.post(`${CONFIG.supabaseUrl}/functions/v1/event-webhook`, eventData, {
        headers: {
          'Authorization': `Bearer ${CONFIG.supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
      });

      logger.info('Event created', { deviceId, detections: detections.length });

    } catch (error) {
      logger.error('Failed to create event', { deviceId, error: error.message });
    }
  }

  determineSeverity(detections) {
    const maxConfidence = Math.max(...detections.map(d => d.confidence));
    if (maxConfidence > 0.9) return 'high';
    if (maxConfidence > 0.7) return 'medium';
    return 'low';
  }

  broadcastDetections(deviceId, detections) {
    const message = JSON.stringify({
      type: 'detections',
      deviceId,
      detections,
      timestamp: new Date().toISOString(),
    });

    this.wsClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  async getDeviceThresholds(deviceId) {
    // Implement Supabase query to get device thresholds
    return {
      person: 0.6,
      car: 0.7,
      truck: 0.7,
    };
  }

  async updateDeviceStatus(deviceId, online) {
    try {
      await axios.patch(
        `${CONFIG.supabaseUrl}/rest/v1/vy_device?id=eq.${deviceId}`,
        { online, last_seen: new Date().toISOString() },
        {
          headers: {
            'Authorization': `Bearer ${CONFIG.supabaseServiceKey}`,
            'apikey': CONFIG.supabaseServiceKey,
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (error) {
      logger.error('Failed to update device status', { deviceId, error: error.message });
    }
  }

  async updateDeviceLastSeen(deviceId) {
    await this.updateDeviceStatus(deviceId, true);
  }

  async uploadSnapshot(deviceId, localPath) {
    // Implement Supabase Storage upload
    // For now, return local path
    return localPath;
  }

  async start() {
    // Create directories
    await fs.mkdir(CONFIG.outputDir, { recursive: true });
    await fs.mkdir(CONFIG.tempDir, { recursive: true });

    // Start HTTP server
    this.server = this.app.listen(CONFIG.port, () => {
      logger.info(`Streams worker started on port ${CONFIG.port}`);
      logger.info(`WebSocket server on port ${CONFIG.port + 1}`);
    });

    // Load active devices from database and start streams
    await this.loadActiveDevices();
  }

  async loadActiveDevices() {
    try {
      const response = await axios.get(
        `${CONFIG.supabaseUrl}/rest/v1/vy_device?enabled=eq.true&select=*`,
        {
          headers: {
            'Authorization': `Bearer ${CONFIG.supabaseServiceKey}`,
            'apikey': CONFIG.supabaseServiceKey,
          },
        }
      );

      const devices = response.data;
      logger.info(`Loading ${devices.length} active devices`);

      for (const device of devices) {
        if (device.rtsp_url || device.webrtc_url) {
          const streamUrl = device.rtsp_url || device.webrtc_url;
          await this.startStream(device.id, streamUrl, device.tenant_id);
        }
      }
    } catch (error) {
      logger.error('Failed to load active devices', { error: error.message });
    }
  }

  async stop() {
    logger.info('Stopping streams worker...');
    
    // Stop all streams
    for (const deviceId of this.activeStreams.keys()) {
      await this.stopStream(deviceId);
    }

    // Close servers
    if (this.server) {
      this.server.close();
    }
    if (this.wss) {
      this.wss.close();
    }
  }
}

// Signal handling
process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  if (global.streamManager) {
    await global.streamManager.stop();
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully');
  if (global.streamManager) {
    await global.streamManager.stop();
  }
  process.exit(0);
});

// Start the service
async function main() {
  try {
    global.streamManager = new StreamManager();
    await global.streamManager.start();
  } catch (error) {
    logger.error('Failed to start streams worker', { error: error.message });
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}