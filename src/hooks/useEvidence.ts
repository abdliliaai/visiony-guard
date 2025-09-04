import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface Evidence {
  id: string;
  case_id?: string;
  evidence_number: string;
  type: string;
  file_path?: string;
  file_name?: string;
  file_size?: number;
  mime_type?: string;
  description?: string;
  collected_by: string;
  chain_of_custody: any;
  hash_value?: string;
  metadata: any;
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

interface CreateEvidenceData {
  case_id?: string;
  type: 'video' | 'image' | 'audio' | 'document' | 'other';
  file?: File;
  description?: string;
  metadata?: Record<string, any>;
}

export function useEvidence() {
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, profile } = useAuth();

  const fetchEvidence = async (caseId?: string) => {
    if (!user || !profile?.tenant_id) return;
    
    try {
      setLoading(true);
      let query = supabase
        .from('evidence')
        .select('*')
        .eq('tenant_id', profile.tenant_id);

      if (caseId) {
        query = query.eq('case_id', caseId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setEvidence((data || []) as Evidence[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch evidence');
      toast.error('Failed to load evidence');
    } finally {
      setLoading(false);
    }
  };

  const uploadEvidence = async (evidenceData: CreateEvidenceData) => {
    if (!user || !profile?.tenant_id) throw new Error('Not authenticated');

    try {
      let filePath = '';
      let fileName = '';
      let fileSize = 0;
      let mimeType = '';
      let hashValue = '';

      // Upload file if provided
      if (evidenceData.file) {
        const file = evidenceData.file;
        fileName = file.name;
        fileSize = file.size;
        mimeType = file.type;

        // Generate hash
        const buffer = await file.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        hashValue = Array.from(new Uint8Array(hashBuffer))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');

        // Upload to storage
        const fileExt = fileName.split('.').pop();
        const timestamp = Date.now();
        filePath = `${user.id}/${timestamp}_${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('evidence')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) throw uploadError;
      }

      // Generate evidence number
      const evidenceCount = evidence.length + 1;
      const evidenceNumber = `EV-${new Date().getFullYear()}-${String(evidenceCount).padStart(4, '0')}`;

      // Create evidence record
      const { data, error } = await supabase
        .from('evidence')
        .insert({
          case_id: evidenceData.case_id,
          evidence_number: evidenceNumber,
          type: evidenceData.type,
          file_path: filePath,
          file_name: fileName,
          file_size: fileSize,
          mime_type: mimeType,
          description: evidenceData.description,
          collected_by: user.id,
          hash_value: hashValue,
          metadata: evidenceData.metadata || {},
          tenant_id: profile.tenant_id,
        })
        .select()
        .single();

      if (error) throw error;

      // Add initial chain of custody entry
      await supabase.rpc('add_custody_entry', {
        evidence_id: data.id,
        action_type: 'collected',
        actor_id: user.id,
        notes: 'Evidence initially collected and uploaded',
      });

      setEvidence(prev => [data as Evidence, ...prev]);
      toast.success('Evidence uploaded successfully');
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to upload evidence';
      toast.error(message);
      throw new Error(message);
    }
  };

  const deleteEvidence = async (evidenceId: string) => {
    try {
      const evidenceItem = evidence.find(e => e.id === evidenceId);
      
      // Delete file from storage if exists
      if (evidenceItem?.file_path) {
        await supabase.storage
          .from('evidence')
          .remove([evidenceItem.file_path]);
      }

      const { error } = await supabase
        .from('evidence')
        .delete()
        .eq('id', evidenceId);

      if (error) throw error;

      setEvidence(prev => prev.filter(e => e.id !== evidenceId));
      toast.success('Evidence deleted successfully');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete evidence';
      toast.error(message);
      throw new Error(message);
    }
  };

  const getEvidenceUrl = (filePath: string) => {
    const { data } = supabase.storage
      .from('evidence')
      .getPublicUrl(filePath);
    return data.publicUrl;
  };

  useEffect(() => {
    fetchEvidence();
  }, [user, profile?.tenant_id]);

  return {
    evidence,
    loading,
    error,
    uploadEvidence,
    deleteEvidence,
    getEvidenceUrl,
    refetch: fetchEvidence,
  };
}