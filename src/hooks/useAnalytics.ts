import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface AnalyticsData {
  detectionTrends: {
    name: string;
    vandalism: number;
    loitering: number;
    total: number;
  }[];
  hourlyActivity: {
    hour: string;
    incidents: number;
  }[];
  incidentDistribution: {
    name: string;
    value: number;
    color: string;
  }[];
  locationHotspots: {
    name: string;
    incidents: number;
    risk: 'High' | 'Medium' | 'Low';
  }[];
  totalStats: {
    totalIncidents: number;
    vandalismTotal: number;
    loiteringTotal: number;
    responseTime: string;
  };
}

export const useAnalytics = (timeRange: string = 'last30days') => {
  const { profile } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const generateDateRange = (range: string) => {
    const end = new Date();
    const start = new Date();

    switch (range) {
      case 'last7days':
        start.setDate(end.getDate() - 7);
        break;
      case 'last30days':
        start.setDate(end.getDate() - 30);
        break;
      case 'last90days':
        start.setDate(end.getDate() - 90);
        break;
      case 'last1year':
        start.setFullYear(end.getFullYear() - 1);
        break;
    }

    return { start: start.toISOString(), end: end.toISOString() };
  };

  const fetchAnalytics = async () => {
    if (!profile?.tenant_id) return;

    try {
      setLoading(true);
      const { start, end } = generateDateRange(timeRange);

      // Fetch events from database
      const { data: events, error: eventsError } = await supabase
        .from('vy_event')
        .select(`
          *,
          device:vy_device(name, location)
        `)
        .eq('tenant_id', profile.tenant_id)
        .gte('occurred_at', start)
        .lte('occurred_at', end)
        .order('occurred_at', { ascending: false });

      if (eventsError) throw eventsError;

      // Process data for analytics
      const processedData = processAnalyticsData(events || []);
      setData(processedData);
    } catch (err: any) {
      console.error('Error fetching analytics:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const processAnalyticsData = (events: any[]): AnalyticsData => {
    // Group events by month for trends
    const monthlyData = new Map();
    const hourlyData = new Map();
    const locationData = new Map();
    const typeData = new Map();

    events.forEach(event => {
      const date = new Date(event.occurred_at);
      const month = date.toLocaleDateString('en-US', { month: 'short' });
      const hour = `${date.getHours().toString().padStart(2, '0')}:00`;
      const location = event.device?.name || 'Unknown';
      const type = event.class_name || event.type;

      // Monthly trends
      if (!monthlyData.has(month)) {
        monthlyData.set(month, { name: month, vandalism: 0, loitering: 0, total: 0 });
      }
      const monthEntry = monthlyData.get(month);
      if (type?.toLowerCase().includes('vandal')) {
        monthEntry.vandalism++;
      } else if (type?.toLowerCase().includes('loiter')) {
        monthEntry.loitering++;
      }
      monthEntry.total++;

      // Hourly activity
      hourlyData.set(hour, (hourlyData.get(hour) || 0) + 1);

      // Location hotspots
      locationData.set(location, (locationData.get(location) || 0) + 1);

      // Type distribution
      typeData.set(type, (typeData.get(type) || 0) + 1);
    });

    // Convert to arrays and sort
    const detectionTrends = Array.from(monthlyData.values()).slice(-6);
    
    const hourlyActivity = Array.from({ length: 24 }, (_, i) => {
      const hour = `${i.toString().padStart(2, '0')}:00`;
      return { hour, incidents: hourlyData.get(hour) || 0 };
    });

    const locationHotspots = Array.from(locationData.entries())
      .map(([name, incidents]) => ({
        name,
        incidents,
        risk: (incidents > 30 ? 'High' : incidents > 15 ? 'Medium' : 'Low') as 'High' | 'Medium' | 'Low'
      }))
      .sort((a, b) => b.incidents - a.incidents)
      .slice(0, 5);

    const incidentDistribution = Array.from(typeData.entries())
      .map(([name, value], index) => ({
        name: name || 'Unknown',
        value,
        color: ['#8B5CF6', '#F59E0B', '#EF4444', '#10B981'][index % 4]
      }));

    const totalStats = {
      totalIncidents: events.length,
      vandalismTotal: events.filter(e => e.class_name?.toLowerCase().includes('vandal')).length,
      loiteringTotal: events.filter(e => e.class_name?.toLowerCase().includes('loiter')).length,
      responseTime: '2.4m'
    };

    return {
      detectionTrends,
      hourlyActivity,
      incidentDistribution,
      locationHotspots,
      totalStats
    };
  };

  const exportData = async (format: 'csv' | 'pdf' = 'csv') => {
    if (!data) return;

    try {
      const csvContent = generateCSV(data);
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `analytics-export-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
    }
  };

  const generateCSV = (data: AnalyticsData): string => {
    let csv = 'Analytics Export\n\n';
    
    csv += 'Detection Trends\n';
    csv += 'Month,Vandalism,Loitering,Total\n';
    data.detectionTrends.forEach(row => {
      csv += `${row.name},${row.vandalism},${row.loitering},${row.total}\n`;
    });
    
    csv += '\nLocation Hotspots\n';
    csv += 'Location,Incidents,Risk Level\n';
    data.locationHotspots.forEach(row => {
      csv += `${row.name},${row.incidents},${row.risk}\n`;
    });
    
    return csv;
  };

  useEffect(() => {
    fetchAnalytics();
  }, [profile?.tenant_id, timeRange]);

  return {
    data,
    loading,
    error,
    refetch: fetchAnalytics,
    exportData
  };
};