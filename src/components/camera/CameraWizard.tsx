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
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
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
  onClose: () => void;
  onComplete: () => void;
  editingCamera?: CameraDevice | null;
  tenantId?: string;
}

interface CameraDevice {
  id: string;
  name: string;
  description?: string;
  location?: string;
  rtsp_url?: string;
  webrtc_url?: string;
  online: boolean;
  enabled: boolean;
  tenant_id: string;
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

const formatPointsForSvg = (points: ROIPoint[]) =>
  points.map(point => `${point.x * 100},${point.y * 100}`).join(' ');

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

export const CameraWizard = ({ open, onClose, onComplete, editingCamera, tenantId }: CameraWizardProps) => {
  const { devices, addDevice, updateDevice } = useDevices();
  const { toast } = useToast();
  const { currentTenantId } = useTenant();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [connectionTested, setConnectionTested] = useState(false);
  const [connectionValid, setConnectionValid] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  
  const [deviceForm, setDeviceForm] = useState<DeviceForm>({
    name: editingCamera?.name || '',
    description: editingCamera?.description || '',
    rtsp_url: editingCamera?.rtsp_url || '',
    webrtc_url: editingCamera?.webrtc_url || '',
    location: editingCamera?.location || '',
    protocol: editingCamera?.rtsp_url ? 'rtsp' : 'webrtc',
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
    setNameError(null);
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
      const streamUrl = deviceForm.protocol === 'rtsp' ? deviceForm.rtsp_url : deviceForm.webrtc_url;
      
      if (!streamUrl?.trim()) {
        throw new Error('Please enter a stream URL');
      }

      // Get fresh session token before making the request
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session refresh error:', sessionError);
        throw new Error('Authentication error. Please try logging out and back in.');
      }
      
      if (!session?.access_token) {
        throw new Error('No valid session. Please log in again.');
      }

      // Test connection via streams service directly
      const streamsUrl = import.meta.env.VITE_STREAMS_SERVICE_URL || 'https://visiony.xylox.ai/streams';
      const response = await fetch(`${streamsUrl}/api/test-camera`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          url: streamUrl.trim(),
          protocol: deviceForm.protocol,
          timeout: 50000 // 30 second timeout for unstable connections
        }),
      });

      const result = await response.json();
      console.log('Camera test result:', { 
        success: result.success, 
        hasPreviewFrame: !!result.previewFrame,
        previewFrameLength: result.previewFrame?.length || 0
      });

      if (response.ok && result.success) {
        setConnectionValid(true);
        setConnectionTested(true);
        
        // Set preview image if available from test
        if (result.previewFrame) {
          const imageDataUrl = `data:image/jpeg;base64,${result.previewFrame}`;
          console.log('Setting preview image, data URL length:', imageDataUrl.length);
          setPreviewImage(imageDataUrl);
        } else {
          console.log('No preview frame in response, using placeholder');
          setPreviewImage('/placeholder.svg');
        }
        
        toast({
          title: "Connection Successful ✅",
          description: `Camera stream is accessible. Resolution: ${result.width || 'Unknown'}x${result.height || 'Unknown'}`,
        });
      } else {
        throw new Error(result.error || 'Connection test failed');
      }
    } catch (error) {
      setConnectionValid(false);
      setConnectionTested(true);
      setPreviewImage(null);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      toast({
        title: "Connection Failed ❌",
        description: `Unable to connect: ${errorMessage}`,
        variant: "destructive",
      });
      
      console.error('Camera connection test failed:', error);
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

  const validateCameraName = (name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError(null);
      return;
    }

    const effectiveTenantId = currentTenantId || tenantId;
    const duplicateCamera = devices.find(device => 
      device.name.toLowerCase() === trimmedName.toLowerCase() &&
      device.tenant_id === effectiveTenantId &&
      device.id !== editingCamera?.id
    );

    if (duplicateCamera) {
      setNameError(`A camera named "${trimmedName}" already exists`);
    } else {
      setNameError(null);
    }
  };

  const finishSetup = async () => {
    setLoading(true);
        
    try {
      // Refresh session before setup
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session refresh error:', sessionError);
        throw new Error('Authentication error. Please try logging out and back in.');
      }
      
      if (!session?.access_token) {
        throw new Error('No valid session. Please log in again.');
      }

      // Validate required fields
      if (!deviceForm.name?.trim()) {
        throw new Error('Camera name is required');
      }
      
      const effectiveTenantId = currentTenantId || tenantId;
      if (!effectiveTenantId) {
        throw new Error('No tenant selected - please ensure you have selected a tenant');
      }
      
      if (deviceForm.protocol === 'rtsp' && !deviceForm.rtsp_url?.trim()) {
        throw new Error('RTSP URL is required for RTSP protocol');
      }

      // Check for duplicate camera names in the same tenant
      const trimmedName = deviceForm.name.trim();
      const duplicateCamera = devices.find(device => 
        device.name.toLowerCase() === trimmedName.toLowerCase() &&
        device.tenant_id === effectiveTenantId &&
        device.id !== editingCamera?.id // Exclude current camera when editing
      );

      if (duplicateCamera) {
        throw new Error(`A camera named "${trimmedName}" already exists in this tenant. Please choose a different name.`);
      }

      const baseDeviceData = {
        name: deviceForm.name.trim(),
        description: deviceForm.description?.trim() || '',
        rtsp_url: deviceForm.protocol === 'rtsp' ? deviceForm.rtsp_url?.trim() : undefined,
        webrtc_url: deviceForm.protocol === 'webrtc' ? deviceForm.webrtc_url?.trim() : undefined,
        location: deviceForm.location?.trim() || '',
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
      };

      // Only include tenant_id when adding a new device
      const deviceData = editingCamera 
        ? baseDeviceData 
        : { ...baseDeviceData, tenant_id: effectiveTenantId };

      console.log('📤 Final device data to send:', JSON.stringify(deviceData, null, 2));

      console.log(`🚀 ${editingCamera ? 'Updating' : 'Adding'} device...`);
      const result = editingCamera
        ? await updateDevice(editingCamera.id, deviceData)
        : await addDevice(deviceData);
      
      console.log('📥 Device operation result:', result);

      if (result && result.error) {
        console.error('❌ Device operation returned error:', result.error);
        throw new Error(result.error);
      }

      console.log(`✅ Camera ${editingCamera ? 'updated' : 'added'} successfully!`);

      toast({
        title: editingCamera ? "Camera Updated Successfully" : "Camera Added Successfully",
        description: `${deviceForm.name} has been configured and will start monitoring shortly.`,
      });

      // Wait for the parent component to refresh before closing
      await onComplete();
      
      resetWizard();
      onClose();
    } catch (error: any) {
      console.error('❌ Setup failed with error:', error);
      
      toast({
        title: "Setup Failed",
        description: error.message || `Failed to ${editingCamera ? 'update' : 'add'} camera. Please check the console for details.`,
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
        return deviceForm.name && (deviceForm.rtsp_url || deviceForm.webrtc_url) && !nameError;
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
                  onChange={(e) => {
                    const newName = e.target.value;
                    setDeviceForm(prev => ({ ...prev, name: newName }));
                    validateCameraName(newName);
                  }}
                  className={nameError ? "border-destructive" : ""}
                />
                {nameError && (
                  <p className="text-sm text-destructive">{nameError}</p>
                )}
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
                    ? "rtsp://admin:Welcome100!@192.168.50.14:554/Streaming/Channels/101"
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
                {(() => {
                  console.log('Render preview - previewImage state:', {
                    hasPreviewImage: !!previewImage,
                    previewImageLength: previewImage?.length || 0,
                    previewImageStart: previewImage?.substring(0, 50) || 'none'
                  });
                  return null;
                })()}
                <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                  <img 
                    src={previewImage} 
                    alt="Camera preview" 
                    className="w-full h-full object-cover"
                    onLoad={() => console.log('Preview image loaded successfully')}
                    onError={(e) => console.error('Preview image failed to load:', e)}
                  />
                </div>
              </div>
            )}
          </div>
        );

      case 2: { // ROI
        const roiPointPath = formatPointsForSvg(roiPoints);
        const firstPoint = roiPoints[0];
        const lastPoint = roiPoints[roiPoints.length - 1];
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
                <svg
                  viewBox="0 0 100 100"
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  preserveAspectRatio="none"
                >
                  {roiPoints.length >= 3 && roiPointPath && (
                    <polygon
                      points={roiPointPath}
                      fill="rgba(34,197,94,0.15)"
                    />
                  )}
                  {roiPoints.length >= 2 && roiPointPath && (
                    <polyline
                      points={roiPointPath}
                      fill="none"
                      stroke="#22c55e"
                      strokeWidth={1.5}
                      vectorEffect="non-scaling-stroke"
                    />
                  )}
                  {roiPoints.length >= 3 && firstPoint && lastPoint && (
                    <line
                      x1={lastPoint.x * 100}
                      y1={lastPoint.y * 100}
                      x2={firstPoint.x * 100}
                      y2={firstPoint.y * 100}
                      stroke="#22c55e"
                      strokeWidth={1.5}
                      vectorEffect="non-scaling-stroke"
                      strokeDasharray="4 4"
                    />
                  )}
                  {roiPoints.map((point, index) => (
                    <circle
                      key={`${point.x}-${point.y}-${index}`}
                      cx={point.x * 100}
                      cy={point.y * 100}
                      r={1.5}
                      fill="#22c55e"
                      stroke="#14532d"
                      strokeWidth={0.5}
                    />
                  ))}
                </svg>
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
      }

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
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingCamera ? 'Edit Camera' : 'Add New Camera'}</DialogTitle>
          <DialogDescription>
            {editingCamera ? 'Update camera configuration' : 'Configure a new camera for AI-powered security monitoring'}
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
            <Button variant="outline" onClick={onClose}>
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
                    {editingCamera ? 'Updating...' : 'Setting up...'}
                  </>
                ) : (
                  editingCamera ? 'Update Camera' : 'Complete Setup'
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