import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Device } from '@capacitor/device';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Geolocation } from '@capacitor/geolocation';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Network } from '@capacitor/network';
import { App } from '@capacitor/app';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface DeviceInfo {
  platform: string;
  model: string;
  operatingSystem: string;
  osVersion: string;
  isVirtual: boolean;
}

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export function useMobile() {
  const [isNative, setIsNative] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [networkStatus, setNetworkStatus] = useState({ connected: true, connectionType: 'wifi' });
  const [location, setLocation] = useState<LocationData | null>(null);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const { user, profile } = useAuth();

  useEffect(() => {
    initializeMobile();
    setupEventListeners();
  }, []);

  const initializeMobile = async () => {
    const native = Capacitor.isNativePlatform();
    setIsNative(native);

    if (native) {
      try {
        // Get device info
        const info = await Device.getInfo();
        setDeviceInfo({
          platform: info.platform,
          model: info.model,
          operatingSystem: info.operatingSystem,
          osVersion: info.osVersion,
          isVirtual: info.isVirtual,
        });

        // Initialize push notifications
        await initializePushNotifications();
        
        // Get network status
        const status = await Network.getStatus();
        setNetworkStatus(status);

        // Register mobile session
        if (user && profile?.tenant_id) {
          await registerMobileSession();
        }
      } catch (error) {
        console.error('Error initializing mobile:', error);
      }
    }
  };

  const setupEventListeners = () => {
    if (!Capacitor.isNativePlatform()) return;

    // Network status listener
    Network.addListener('networkStatusChange', (status) => {
      setNetworkStatus(status);
      if (status.connected) {
        toast.success('Network connection restored');
      } else {
        toast.error('Network connection lost');
      }
    });

    // App state listeners
    App.addListener('appStateChange', ({ isActive }) => {
      if (isActive && user && profile?.tenant_id) {
        updateLastActive();
      }
    });
  };

  const initializePushNotifications = async () => {
    try {
      const permission = await PushNotifications.requestPermissions();
      
      if (permission.receive === 'granted') {
        await PushNotifications.register();
      }

      PushNotifications.addListener('registration', (token) => {
        setPushToken(token.value);
        if (user && profile?.tenant_id) {
          savePushToken(token.value);
        }
      });

      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        toast.info(notification.title || 'New notification');
        triggerHapticFeedback('light');
      });

      PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        // Handle notification tap
        console.log('Push notification action performed:', notification);
      });
    } catch (error) {
      console.error('Error setting up push notifications:', error);
    }
  };

  const registerMobileSession = async () => {
    if (!user || !profile?.tenant_id || !deviceInfo) return;

    try {
      await supabase
        .from('mobile_sessions')
        .upsert({
          user_id: user.id,
          tenant_id: profile.tenant_id,
          platform: deviceInfo.platform,
          app_version: '1.0.0',
          push_token: pushToken,
          device_token: `${deviceInfo.model}-${deviceInfo.osVersion}`,
          last_active: new Date().toISOString(),
        });
    } catch (error) {
      console.error('Error registering mobile session:', error);
    }
  };

  const savePushToken = async (token: string) => {
    if (!user || !profile?.tenant_id) return;

    try {
      await supabase
        .from('mobile_sessions')
        .update({ push_token: token })
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Error saving push token:', error);
    }
  };

  const updateLastActive = async () => {
    if (!user) return;

    try {
      await supabase
        .from('mobile_sessions')
        .update({ last_active: new Date().toISOString() })
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Error updating last active:', error);
    }
  };

  const getCurrentLocation = async (): Promise<LocationData | null> => {
    try {
      const coordinates = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
      });

      const locationData = {
        latitude: coordinates.coords.latitude,
        longitude: coordinates.coords.longitude,
        accuracy: coordinates.coords.accuracy,
        timestamp: coordinates.timestamp,
      };

      setLocation(locationData);
      return locationData;
    } catch (error) {
      console.error('Error getting location:', error);
      toast.error('Failed to get location');
      return null;
    }
  };

  const capturePhoto = async (): Promise<string | null> => {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
      });

      triggerHapticFeedback('medium');
      return image.dataUrl || null;
    } catch (error) {
      console.error('Error capturing photo:', error);
      toast.error('Failed to capture photo');
      return null;
    }
  };

  const scheduleNotification = async (title: string, body: string, delay: number = 0) => {
    try {
      await LocalNotifications.schedule({
        notifications: [{
          title,
          body,
          id: Date.now(),
          schedule: { at: new Date(Date.now() + delay) },
          sound: 'beep.wav',
          attachments: [],
          actionTypeId: '',
          extra: null,
        }],
      });
    } catch (error) {
      console.error('Error scheduling notification:', error);
    }
  };

  const triggerHapticFeedback = async (style: 'light' | 'medium' | 'heavy' = 'medium') => {
    if (!isNative) return;

    try {
      const impactStyle = style === 'light' ? ImpactStyle.Light :
                         style === 'heavy' ? ImpactStyle.Heavy :
                         ImpactStyle.Medium;
      
      await Haptics.impact({ style: impactStyle });
    } catch (error) {
      console.error('Error triggering haptic feedback:', error);
    }
  };

  return {
    isNative,
    deviceInfo,
    networkStatus,
    location,
    pushToken,
    getCurrentLocation,
    capturePhoto,
    scheduleNotification,
    triggerHapticFeedback,
  };
}