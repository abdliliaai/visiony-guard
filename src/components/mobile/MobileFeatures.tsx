import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Smartphone, 
  Bell, 
  Camera, 
  MapPin, 
  Wifi, 
  Battery,
  Download,
  Share2,
  QrCode
} from 'lucide-react';

interface MobileFeaturesProps {
  className?: string;
}

export const MobileFeatures = ({ className }: MobileFeaturesProps) => {
  const [isCapacitor, setIsCapacitor] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);

  useEffect(() => {
    // Check if running in Capacitor
    checkCapacitorEnvironment();
  }, []);

  const checkCapacitorEnvironment = async () => {
    try {
      // @ts-ignore - Capacitor global
      if (window.Capacitor) {
        setIsCapacitor(true);
        
        // Get device info (only if available)
        try {
          const { Device } = await import('@capacitor/device');
          const info = await Device.getInfo();
          setDeviceInfo(info);
        } catch (deviceError) {
          console.log('Device plugin not available');
        }
      }
    } catch (error) {
      console.log('Not running in Capacitor environment');
    }
  };

  const requestNotificationPermission = async () => {
    try {
      // In a real mobile app, implement push notifications
      console.log('Requesting notification permission...');
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    }
  };

  const shareApp = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Vision-Y Security Platform',
          text: 'Advanced AI-powered security monitoring platform',
          url: window.location.href,
        });
      } else {
        // Fallback for non-supporting browsers
        navigator.clipboard.writeText(window.location.href);
        alert('App URL copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Smartphone className="h-5 w-5" />
            <span>Mobile App Features</span>
            {isCapacitor && <Badge className="bg-success text-white">Native App</Badge>}
          </CardTitle>
          <CardDescription>
            Vision-Y mobile app capabilities and native features
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Environment Status */}
          <Alert>
            <Smartphone className="h-4 w-4" />
            <AlertDescription>
              {isCapacitor 
                ? `Running as native app on ${deviceInfo?.platform} ${deviceInfo?.osVersion}`
                : 'Running in web browser. Install as native app for full features.'
              }
            </AlertDescription>
          </Alert>

          {/* Mobile Features Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-medium">Core Features</h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm">
                  <Camera className="h-4 w-4 text-primary" />
                  <span>Live camera streams</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <Bell className="h-4 w-4 text-primary" />
                  <span>Real-time alerts</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span>Location-based events</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <QrCode className="h-4 w-4 text-primary" />
                  <span>QR code device setup</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium">Native Features</h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm">
                  <Bell className={`h-4 w-4 ${isCapacitor ? 'text-success' : 'text-muted-foreground'}`} />
                  <span>Push notifications</span>
                  {!isCapacitor && <Badge variant="outline" className="text-xs">Web Only</Badge>}
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <Wifi className={`h-4 w-4 ${isCapacitor ? 'text-success' : 'text-muted-foreground'}`} />
                  <span>Offline capabilities</span>
                  {!isCapacitor && <Badge variant="outline" className="text-xs">Web Only</Badge>}
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <Battery className={`h-4 w-4 ${isCapacitor ? 'text-success' : 'text-muted-foreground'}`} />
                  <span>Background monitoring</span>
                  {!isCapacitor && <Badge variant="outline" className="text-xs">Web Only</Badge>}
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <Camera className={`h-4 w-4 ${isCapacitor ? 'text-success' : 'text-muted-foreground'}`} />
                  <span>Device camera access</span>
                  {!isCapacitor && <Badge variant="outline" className="text-xs">Web Only</Badge>}
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Actions */}
          <div className="flex flex-wrap gap-3">
            {!isCapacitor && (
              <div className="space-y-2 w-full">
                <h4 className="font-medium text-sm">Install Mobile App</h4>
                <Alert>
                  <Download className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    To get the full mobile experience:
                    <ol className="list-decimal list-inside mt-2 space-y-1">
                      <li>Export project to GitHub</li>
                      <li>Run <code className="bg-muted px-1 rounded">npx cap add ios</code> or <code className="bg-muted px-1 rounded">npx cap add android</code></li>
                      <li>Build with <code className="bg-muted px-1 rounded">npx cap run ios/android</code></li>
                    </ol>
                  </AlertDescription>
                </Alert>
              </div>
            )}

            <Button onClick={requestNotificationPermission}>
              <Bell className="mr-2 h-4 w-4" />
              Enable Notifications
            </Button>

            <Button variant="outline" onClick={shareApp}>
              <Share2 className="mr-2 h-4 w-4" />
              Share App
            </Button>
          </div>

          {/* Development Info */}
          {isCapacitor && deviceInfo && (
            <div className="pt-4 border-t space-y-2">
              <h4 className="font-medium text-sm">Device Information</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>Platform: {deviceInfo.platform}</div>
                <div>OS Version: {deviceInfo.osVersion}</div>
                <div>Model: {deviceInfo.model}</div>
                <div>Manufacturer: {deviceInfo.manufacturer}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};