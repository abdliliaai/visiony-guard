import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { useDevices } from '@/hooks/useDevices';
import { useToast } from '@/hooks/use-toast';
import { 
  Camera, 
  TestTube, 
  MapPin, 
  Settings, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Play,
  Square
} from 'lucide-react';

interface CameraWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface DeviceForm {
  name: string;
  description: string;
  rtsp_url: string;
  webrtc_url: string;
  location: string;
  protocol: 'rtsp' | 'webrtc';
}

interface ROIPoint {
  x: number;
  y: number;
}

interface DetectionThreshold {
  class_name: string;
  min_confidence: number;
  enabled: boolean;
}

const DETECTION_CLASSES = [
  'person', 'car', 'truck', 'motorcycle', 'bicycle', 'animal', 'package'
];

const WIZARD_STEPS = [
  { id: 'device', title: 'Device Info', icon: Camera },
  { id: 'connection', title: 'Test Connection', icon: TestTube },
  { id: 'roi', title: 'Region of Interest', icon: MapPin },
  { id: 'thresholds', title: 'Detection Settings', icon: Settings },
  { id: 'complete', title: 'Complete', icon: CheckCircle2 },
];

export const CameraWizard = ({ open, onOpenChange }: CameraWizardProps) => {
  const { addDevice } = useDevices();
  const { toast } = useToast();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [connectionTested, setConnectionTested] = useState(false);
  const [connectionValid, setConnectionValid] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  const [deviceForm, setDeviceForm] = useState<DeviceForm>({
    name: '',
    description: '',
    rtsp_url: '',
    webrtc_url: '',
    location: '',
    protocol: 'rtsp',
  });
  
  const [roiPoints, setRoiPoints] = useState<ROIPoint[]>([]);
  const [thresholds, setThresholds] = useState<DetectionThreshold[]>(
    DETECTION_CLASSES.map(cls => ({
      class_name: cls,
      min_confidence: 0.6,
      enabled: true,
    }))
  );

  const resetWizard = () => {
    setCurrentStep(0);
    setConnectionTested(false);
    setConnectionValid(false);
    setPreviewImage(null);
    setRoiPoints([]);
    setDeviceForm({
      name: '',
      description: '',
      rtsp_url: '',
      webrtc_url: '',
      location: '',
      protocol: 'rtsp',
    });
  };

  const handleNext = () => {
    if (currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const testConnection = async () => {
    setLoading(true);
    try {
      // Simulate connection test - in real implementation, this would call an edge function
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock success with preview image
      setConnectionValid(true);
      setConnectionTested(true);
      setPreviewImage('/placeholder.svg'); // In real app, this would be a frame from the stream
      
      toast({
        title: "Connection Successful",
        description: "Camera stream is accessible and working properly.",
      });
    } catch (error) {
      setConnectionValid(false);
      setConnectionTested(true);
      toast({
        title: "Connection Failed",
        description: "Unable to connect to camera stream. Please check your URL and credentials.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    
    setRoiPoints([...roiPoints, { x, y }]);
  };

  const clearROI = () => {
    setRoiPoints([]);
  };

  const finishSetup = async () => {
    setLoading(true);
    try {
      const { error } = await addDevice({
        name: deviceForm.name,
        description: deviceForm.description,
        rtsp_url: deviceForm.protocol === 'rtsp' ? deviceForm.rtsp_url : undefined,
        webrtc_url: deviceForm.protocol === 'webrtc' ? deviceForm.webrtc_url : undefined,
        location: deviceForm.location,
        roi_polygons: roiPoints as any,
        enabled: true,
        online: false,
        stream_config: {
          protocol: deviceForm.protocol,
          thresholds: thresholds.reduce((acc, t) => {
            acc[t.class_name] = {
              min_confidence: t.min_confidence,
              enabled: t.enabled,
            };
            return acc;
          }, {} as Record<string, any>),
        },
      });

      if (error) {
        throw new Error(error);
      }

      toast({
        title: "Camera Added Successfully",
        description: `${deviceForm.name} has been configured and will start monitoring shortly.`,
      });

      resetWizard();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Setup Failed",
        description: error.message || "Failed to add camera. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateThreshold = (className: string, field: keyof DetectionThreshold, value: any) => {
    setThresholds(prev => prev.map(t => 
      t.class_name === className ? { ...t, [field]: value } : t
    ));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: // Device Info
        return deviceForm.name && (deviceForm.rtsp_url || deviceForm.webrtc_url);
      case 1: // Connection Test
        return connectionTested && connectionValid;
      case 2: // ROI (optional)
        return true;
      case 3: // Thresholds
        return true;
      default:
        return true;
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Device Info
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Camera Name *</Label>
                <Input
                  id="name"
                  placeholder="Main Entrance Camera"
                  value={deviceForm.name}
                  onChange={(e) => setDeviceForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="Building A - Entrance"
                  value={deviceForm.location}
                  onChange={(e) => setDeviceForm(prev => ({ ...prev, location: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Primary security monitoring point"
                value={deviceForm.description}
                onChange={(e) => setDeviceForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Protocol</Label>
              <Select 
                value={deviceForm.protocol} 
                onValueChange={(value: 'rtsp' | 'webrtc') => 
                  setDeviceForm(prev => ({ ...prev, protocol: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rtsp">RTSP</SelectItem>
                  <SelectItem value="webrtc">WebRTC</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stream_url">
                {deviceForm.protocol === 'rtsp' ? 'RTSP URL' : 'WebRTC URL'} *
              </Label>
              <Input
                id="stream_url"
                placeholder={
                  deviceForm.protocol === 'rtsp' 
                    ? "rtsp://admin:password@192.168.1.100:554/stream1"
                    : "https://camera.example.com/webrtc"
                }
                value={deviceForm.protocol === 'rtsp' ? deviceForm.rtsp_url : deviceForm.webrtc_url}
                onChange={(e) => setDeviceForm(prev => ({ 
                  ...prev, 
                  [deviceForm.protocol === 'rtsp' ? 'rtsp_url' : 'webrtc_url']: e.target.value 
                }))}
              />
            </div>
          </div>
        );

      case 1: // Connection Test
        return (
          <div className="space-y-4">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <TestTube className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Test Camera Connection</h3>
                <p className="text-muted-foreground">
                  We'll verify that your camera stream is accessible and working properly.
                </p>
              </div>
            </div>

            {!connectionTested && (
              <Button 
                onClick={testConnection} 
                disabled={loading}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing Connection...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Test Connection
                  </>
                )}
              </Button>
            )}

            {connectionTested && (
              <Alert className={connectionValid ? "border-success bg-success/10" : "border-destructive bg-destructive/10"}>
                {connectionValid ? (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-destructive" />
                )}
                <AlertDescription>
                  {connectionValid 
                    ? "Connection successful! Camera stream is working properly."
                    : "Connection failed. Please check your URL and camera settings."
                  }
                </AlertDescription>
              </Alert>
            )}

            {previewImage && (
              <div className="space-y-2">
                <Label>Live Preview</Label>
                <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                  <img 
                    src={previewImage} 
                    alt="Camera preview" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}
          </div>
        );

      case 2: // ROI
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Define Region of Interest (Optional)</h3>
              <p className="text-muted-foreground">
                Click on the preview to define areas where detection should be focused.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Detection Area</Label>
                <Button variant="outline" size="sm" onClick={clearROI}>
                  <Square className="mr-2 h-4 w-4" />
                  Clear ROI
                </Button>
              </div>
              <div className="aspect-video bg-muted rounded-lg overflow-hidden relative">
                <canvas
                  width={640}
                  height={360}
                  className="w-full h-full cursor-crosshair"
                  onClick={handleCanvasClick}
                  style={{
                    backgroundImage: previewImage ? `url(${previewImage})` : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                />
                {roiPoints.map((point, index) => (
                  <div
                    key={index}
                    className="absolute w-2 h-2 bg-primary rounded-full transform -translate-x-1/2 -translate-y-1/2"
                    style={{
                      left: `${point.x * 100}%`,
                      top: `${point.y * 100}%`,
                    }}
                  />
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                {roiPoints.length === 0 
                  ? "Click to add detection points (leave empty to monitor entire frame)"
                  : `${roiPoints.length} detection points defined`
                }
              </p>
            </div>
          </div>
        );

      case 3: // Thresholds
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Detection Thresholds</h3>
              <p className="text-muted-foreground">
                Configure confidence levels for different object types.
              </p>
            </div>

            <div className="space-y-4">
              {thresholds.map((threshold) => (
                <div key={threshold.class_name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={threshold.enabled}
                        onChange={(e) => updateThreshold(threshold.class_name, 'enabled', e.target.checked)}
                        className="rounded"
                      />
                      <Label className="capitalize">{threshold.class_name}</Label>
                    </div>
                    <Badge variant="outline">
                      {Math.round(threshold.min_confidence * 100)}%
                    </Badge>
                  </div>
                  {threshold.enabled && (
                    <Slider
                      value={[threshold.min_confidence]}
                      onValueChange={([value]) => updateThreshold(threshold.class_name, 'min_confidence', value)}
                      max={1}
                      min={0.1}
                      step={0.05}
                      className="w-full"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      case 4: // Complete
        return (
          <div className="space-y-4 text-center">
            <div className="mx-auto w-16 h-16 bg-success/10 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-success" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Setup Complete!</h3>
              <p className="text-muted-foreground">
                Your camera is ready to start monitoring. The stream will begin shortly.
              </p>
            </div>
            
            <div className="space-y-2 text-left bg-muted/50 p-4 rounded-lg">
              <h4 className="font-medium">Configuration Summary:</h4>
              <ul className="text-sm space-y-1">
                <li>• <strong>Name:</strong> {deviceForm.name}</li>
                <li>• <strong>Location:</strong> {deviceForm.location || 'Not specified'}</li>
                <li>• <strong>Protocol:</strong> {deviceForm.protocol.toUpperCase()}</li>
                <li>• <strong>ROI Points:</strong> {roiPoints.length || 'Full frame'}</li>
                <li>• <strong>Active Classes:</strong> {thresholds.filter(t => t.enabled).length}</li>
              </ul>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Camera</DialogTitle>
          <DialogDescription>
            Configure a new camera for AI-powered security monitoring
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6">
          {WIZARD_STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            
            return (
              <div key={step.id} className="flex items-center">
                <div className={`
                  flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors
                  ${isActive 
                    ? 'border-primary bg-primary text-primary-foreground' 
                    : isCompleted 
                      ? 'border-success bg-success text-white'
                      : 'border-muted bg-background text-muted-foreground'
                  }
                `}>
                  <Icon className="w-5 h-5" />
                </div>
                {index < WIZARD_STEPS.length - 1 && (
                  <div className={`w-12 h-0.5 mx-2 ${isCompleted ? 'bg-success' : 'bg-muted'}`} />
                )}
              </div>
            );
          })}
        </div>

        <Progress value={((currentStep + 1) / WIZARD_STEPS.length) * 100} className="mb-6" />

        {/* Step Content */}
        <div className="min-h-[400px]">
          {renderStepContent()}
        </div>

        <DialogFooter className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={handleBack}
            disabled={currentStep === 0}
          >
            Back
          </Button>
          
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            
            {currentStep === WIZARD_STEPS.length - 1 ? (
              <Button 
                onClick={finishSetup}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  'Complete Setup'
                )}
              </Button>
            ) : (
              <Button 
                onClick={handleNext}
                disabled={!canProceed()}
              >
                Next
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};