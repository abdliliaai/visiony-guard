import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/contexts/TenantContext';
import type { Database } from '@/integrations/supabase/types';

type Event = Database['public']['Tables']['vy_event']['Row'] & {
  device?: {
    name: string;
    location?: string;
  };
};

export const useEvents = (limit = 50) => {
  const { profile } = useAuth();
  const { currentTenantId } = useTenant();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = async () => {
    if (!currentTenantId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('vy_event')
        .select(`
          *,
          device:vy_device(name, location)
        `)
        .eq('tenant_id', currentTenantId)
        .order('occurred_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      setEvents(data as Event[] || []);
    } catch (err: any) {
      console.error('Error fetching events:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const acknowledgeEvent = async (eventId: string) => {
    if (!profile?.user_id) return { error: 'Not authenticated' };

    try {
      const { data, error } = await supabase
        .from('vy_event')
        .update({
          acknowledged: true,
          acknowledged_by: profile.user_id,
          acknowledged_at: new Date().toISOString(),
        })
        .eq('id', eventId)
        .select()
        .single();

      if (error) throw error;
      
      setEvents(prev => prev.map(event => 
        event.id === eventId ? { ...event, ...data } : event
      ));
      
      return { data, error: null };
    } catch (err: any) {
      console.error('Error acknowledging event:', err);
      return { data: null, error: err.message };
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [currentTenantId, limit]);

  // Set up realtime subscription for new events
  useEffect(() => {
    if (!currentTenantId) return;

    const channel = supabase
      .channel('event-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'vy_event',
          filter: `tenant_id=eq.${currentTenantId}`,
        },
        (payload) => {
          console.log('New event:', payload);
          
          // Fetch the device info for the new event
          supabase
            .from('vy_device')
            .select('name, location')
            .eq('id', payload.new.device_id)
            .single()
            .then(({ data: device }) => {
              const newEvent = {
                ...payload.new,
                device,
              } as Event;
              
              setEvents(prev => [newEvent, ...prev.slice(0, limit - 1)]);
            });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentTenantId, limit]);

  return {
    events,
    loading,
    error,
    acknowledgeEvent,
    refetch: fetchEvents,
  };
};