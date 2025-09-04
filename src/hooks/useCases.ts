import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Case {
  id: string;
  case_number: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  category: string;
  assigned_to?: string;
  created_by: string;
  tenant_id: string;
  location?: string;
  incident_date?: string;
  resolution?: string;
  estimated_completion?: string;
  created_at: string;
  updated_at: string;
}

interface CreateCaseData {
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  category?: 'security' | 'theft' | 'vandalism' | 'trespassing' | 'maintenance' | 'other';
  location?: string;
  incident_date?: string;
  estimated_completion?: string;
}

interface UpdateCaseData extends Partial<CreateCaseData> {
  status?: 'open' | 'investigating' | 'resolved' | 'closed' | 'archived';
  assigned_to?: string;
  resolution?: string;
}

export function useCases() {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, profile } = useAuth();

  const fetchCases = async () => {
    if (!user || !profile?.tenant_id) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cases')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCases(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch cases');
      toast.error('Failed to load cases');
    } finally {
      setLoading(false);
    }
  };

  const createCase = async (caseData: CreateCaseData) => {
    if (!user || !profile?.tenant_id) throw new Error('Not authenticated');

    try {
      // Generate case number
      const { data: caseNumber, error: numberError } = await supabase
        .rpc('generate_case_number', { tenant_id: profile.tenant_id });

      if (numberError) throw numberError;

      const { data, error } = await supabase
        .from('cases')
        .insert({
          ...caseData,
          case_number: caseNumber,
          created_by: user.id,
          tenant_id: profile.tenant_id,
        })
        .select()
        .single();

      if (error) throw error;
      
      setCases(prev => [data, ...prev]);
      toast.success('Case created successfully');
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create case';
      toast.error(message);
      throw new Error(message);
    }
  };

  const updateCase = async (caseId: string, updates: UpdateCaseData) => {
    try {
      const { data, error } = await supabase
        .from('cases')
        .update(updates)
        .eq('id', caseId)
        .select()
        .single();

      if (error) throw error;

      setCases(prev => prev.map(c => c.id === caseId ? data : c));
      toast.success('Case updated successfully');
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update case';
      toast.error(message);
      throw new Error(message);
    }
  };

  const deleteCase = async (caseId: string) => {
    try {
      const { error } = await supabase
        .from('cases')
        .delete()
        .eq('id', caseId);

      if (error) throw error;

      setCases(prev => prev.filter(c => c.id !== caseId));
      toast.success('Case deleted successfully');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete case';
      toast.error(message);
      throw new Error(message);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [user, profile?.tenant_id]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!profile?.tenant_id) return;

    const channel = supabase
      .channel('cases-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cases',
          filter: `tenant_id=eq.${profile.tenant_id}`,
        },
        () => {
          fetchCases();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.tenant_id]);

  return {
    cases,
    loading,
    error,
    createCase,
    updateCase,
    deleteCase,
    refetch: fetchCases,
  };
}