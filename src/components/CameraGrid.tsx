import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Play, Pause, Maximize2, AlertCircle, Users, Car, Shield } from 'lucide-react';

interface Detection {
  id: string;
  class: string;
  confidence: number;
  bbox: [number, number, number, number];
  timestamp: number;
}

interface CameraFeed {
  id: string;
  name: string;
  location: string;
  status: 'online' | 'offline' | 'recording';
  detections: Detection[];
  lastEvent: string;
}

const mockCameras: CameraFeed[] = [
  {
    id: '1',
    name: 'Main Entrance',
    location: 'Building A - Floor 1',
    status: 'online',
    detections: [
      { id: '1', class: 'person', confidence: 0.92, bbox: [120, 80, 200, 280], timestamp: Date.now() - 2000 },
      { id: '2', class: 'person', confidence: 0.85, bbox: [300, 100, 380, 300], timestamp: Date.now() - 1000 }
    ],
    lastEvent: '2 people detected - 3s ago'
  },
  {
    id: '2', 
    name: 'Parking Lot A',
    location: 'Outdoor - Section A',
    status: 'recording',
    detections: [
      { id: '3', class: 'car', confidence: 0.96, bbox: [50, 150, 250, 350], timestamp: Date.now() - 5000 }
    ],
    lastEvent: 'Vehicle detected - 12s ago'
  },
  {
    id: '3',
    name: 'Loading Bay',
    location: 'Building B - Rear',
    status: 'online',
    detections: [],
    lastEvent: 'No activity - 2m ago'
  },
  {
    id: '4',
    name: 'Warehouse Floor',
    location: 'Building C - Center',
    status: 'offline',
    detections: [],
    lastEvent: 'Camera offline - 15m ago'
  }
];

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case 'online': return 'default';
    case 'recording': return 'destructive';
    case 'offline': return 'secondary';
    default: return 'default';
  }
};

const getDetectionIcon = (className: string) => {
  switch (className) {
    case 'person': return Users;
    case 'car': return Car;
    default: return Shield;
  }
};

const CameraStreamOverlay: React.FC<{ camera: CameraFeed }> = ({ camera }) => {
  const [isPlaying, setIsPlaying] = useState(true);
  
  return (
    <div className="relative aspect-video bg-surface rounded-lg overflow-hidden group">
      {/* Mock video stream background */}
      <div className="absolute inset-0 bg-gradient-to-br from-surface to-muted">
        <div className="absolute inset-0 opacity-20">
          <div className="w-full h-full bg-gradient-to-r from-transparent via-primary/10 to-transparent animate-pulse"></div>
        </div>
      </div>
      
      {/* Detection overlays */}
      {camera.detections.map((detection) => {
        const Icon = getDetectionIcon(detection.class);
        const [x, y, x2, y2] = detection.bbox;
        const width = ((x2 - x) / 640) * 100; // Assuming 640px source width
        const height = ((y2 - y) / 480) * 100; // Assuming 480px source height
        const left = (x / 640) * 100;
        const top = (y / 480) * 100;
        
        return (
          <div
            key={detection.id}
            className="absolute border-2 border-detection-active bg-detection-active/10"
            style={{
              left: `${left}%`,
              top: `${top}%`,
              width: `${width}%`,
              height: `${height}%`
            }}
          >
            <div className="absolute -top-8 left-0 flex items-center gap-1 bg-detection-active px-2 py-1 rounded text-xs text-white">
              <Icon className="w-3 h-3" />
              {detection.class} {Math.round(detection.confidence * 100)}%
            </div>
          </div>
        );
      })}
      
      {/* Camera controls overlay */}
      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setIsPlaying(!isPlaying)}
            className="bg-black/50 hover:bg-black/70"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="bg-black/50 hover:bg-black/70"
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      {/* Status indicator */}
      <div className="absolute top-3 right-3">
        <div className={`w-3 h-3 rounded-full ${camera.status === 'online' ? 'bg-success animate-pulse' : camera.status === 'recording' ? 'bg-destructive animate-pulse' : 'bg-muted'}`}></div>
      </div>
    </div>
  );
};

export const CameraGrid: React.FC = () => {
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Live Camera Feeds</h2>
          <p className="text-muted-foreground">Monitor your security cameras in real-time</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="bg-success/10 text-success border-success/30">
            {mockCameras.filter(c => c.status === 'online').length} Online
          </Badge>
          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
            {mockCameras.filter(c => c.status === 'recording').length} Recording
          </Badge>
          <Badge variant="outline" className="bg-muted/10 text-muted-foreground border-muted/30">
            {mockCameras.filter(c => c.status === 'offline').length} Offline
          </Badge>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-6">
        {mockCameras.map((camera) => (
          <Card 
            key={camera.id} 
            className="p-4 bg-card hover:bg-surface-hover transition-colors cursor-pointer"
            onClick={() => setSelectedCamera(camera.id)}
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium">{camera.name}</h3>
                  <p className="text-sm text-muted-foreground">{camera.location}</p>
                </div>
                <Badge variant={getStatusBadgeVariant(camera.status)}>
                  {camera.status}
                </Badge>
              </div>
              
              <CameraStreamOverlay camera={camera} />
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{camera.lastEvent}</span>
                {camera.detections.length > 0 && (
                  <div className="flex items-center gap-1 text-detection-active">
                    <AlertCircle className="w-4 h-4" />
                    {camera.detections.length}
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};