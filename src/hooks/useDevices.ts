import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { Database } from '@/integrations/supabase/types';

type Device = Database['public']['Tables']['vy_device']['Row'];
type DeviceInsert = Database['public']['Tables']['vy_device']['Insert'];
type DeviceUpdate = Database['public']['Tables']['vy_device']['Update'];

export const useDevices = () => {
  const { profile } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDevices = async () => {
    if (!profile?.tenant_id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('vy_device')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDevices(data as Device[] || []);
    } catch (err: any) {
      console.error('Error fetching devices:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addDevice = async (deviceData: Omit<DeviceInsert, 'tenant_id'>) => {
    if (!profile?.tenant_id) return { error: 'No tenant selected' };

    try {
      const { data, error } = await supabase
        .from('vy_device')
        .insert({
          ...deviceData,
          tenant_id: profile.tenant_id,
        })
        .select()
        .single();

      if (error) throw error;
      
      setDevices(prev => [data as Device, ...prev]);
      return { data, error: null };
    } catch (err: any) {
      console.error('Error adding device:', err);
      return { data: null, error: err.message };
    }
  };

  const updateDevice = async (id: string, updates: DeviceUpdate) => {
    try {
      const { data, error } = await supabase
        .from('vy_device')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setDevices(prev => prev.map(device => 
        device.id === id ? { ...device, ...data } as Device : device
      ));
      
      return { data, error: null };
    } catch (err: any) {
      console.error('Error updating device:', err);
      return { data: null, error: err.message };
    }
  };

  const deleteDevice = async (id: string) => {
    try {
      const { error } = await supabase
        .from('vy_device')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setDevices(prev => prev.filter(device => device.id !== id));
      return { error: null };
    } catch (err: any) {
      console.error('Error deleting device:', err);
      return { error: err.message };
    }
  };

  useEffect(() => {
    fetchDevices();
  }, [profile?.tenant_id]);

  // Set up realtime subscription for device status updates
  useEffect(() => {
    if (!profile?.tenant_id) return;

    const channel = supabase
      .channel('device-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vy_device',
          filter: `tenant_id=eq.${profile.tenant_id}`,
        },
        (payload) => {
          console.log('Device change:', payload);
          
          if (payload.eventType === 'INSERT') {
            setDevices(prev => [payload.new as Device, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setDevices(prev => prev.map(device => 
              device.id === payload.new.id ? payload.new as Device : device
            ));
          } else if (payload.eventType === 'DELETE') {
            setDevices(prev => prev.filter(device => device.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.tenant_id]);

  return {
    devices,
    loading,
    error,
    addDevice,
    updateDevice,
    deleteDevice,
    refetch: fetchDevices,
  };
};