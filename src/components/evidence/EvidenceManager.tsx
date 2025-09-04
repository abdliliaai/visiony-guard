import React, { useState } from 'react';
import { Upload, FileText, Image, Video, Music, Download, Trash2, Eye, Camera, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEvidence } from '@/hooks/useEvidence';
import { useMobile } from '@/hooks/useMobile';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface EvidenceManagerProps {
  caseId?: string;
}

interface EvidenceFormData {
  type: 'video' | 'image' | 'audio' | 'document' | 'other';
  description: string;
  file: File | null;
}

export function EvidenceManager({ caseId }: EvidenceManagerProps) {
  const { evidence, loading, uploadEvidence, deleteEvidence, getEvidenceUrl } = useEvidence();
  const { isNative, capturePhoto, triggerHapticFeedback } = useMobile();
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState<any>(null);

  const [formData, setFormData] = useState<EvidenceFormData>({
    type: 'image',
    description: '',
    file: null,
  });

  const caseEvidence = caseId ? evidence.filter(e => e.case_id === caseId) : evidence;

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'image': return <Image className="w-4 h-4" />;
      case 'video': return <Video className="w-4 h-4" />;
      case 'audio': return <Music className="w-4 h-4" />;
      case 'document': return <FileText className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getFileTypeColor = (type: string) => {
    switch (type) {
      case 'image': return 'default';
      case 'video': return 'secondary';
      case 'audio': return 'outline';
      case 'document': return 'destructive';
      default: return 'secondary';
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, file }));
      // Auto-detect file type
      if (file.type.startsWith('image/')) {
        setFormData(prev => ({ ...prev, type: 'image' }));
      } else if (file.type.startsWith('video/')) {
        setFormData(prev => ({ ...prev, type: 'video' }));
      } else if (file.type.startsWith('audio/')) {
        setFormData(prev => ({ ...prev, type: 'audio' }));
      } else {
        setFormData(prev => ({ ...prev, type: 'document' }));
      }
    }
  };

  const handleCapturePhoto = async () => {
    if (!isNative) {
      toast.error('Camera capture is only available on mobile devices');
      return;
    }

    try {
      const dataUrl = await capturePhoto();
      if (dataUrl) {
        // Convert data URL to File
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        const file = new File([blob], `evidence_${Date.now()}.jpg`, { type: 'image/jpeg' });
        
        setFormData(prev => ({ 
          ...prev, 
          file,
          type: 'image',
          description: prev.description || 'Photo captured on mobile device'
        }));
        
        toast.success('Photo captured successfully');
        await triggerHapticFeedback();
      }
    } catch (error) {
      console.error('Error capturing photo:', error);
      toast.error('Failed to capture photo');
    }
  };

  const handleUploadEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.file) {
      toast.error('Please select a file to upload');
      return;
    }

    setIsSubmitting(true);

    try {
      await uploadEvidence({
        case_id: caseId,
        type: formData.type,
        file: formData.file,
        description: formData.description,
      });
      
      setFormData({
        type: 'image',
        description: '',
        file: null,
      });
      
      setIsUploadDialogOpen(false);
      
      if (isNative) {
        await triggerHapticFeedback();
      }
    } catch (error) {
      // Error already handled in the hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEvidence = async (evidenceId: string) => {
    if (window.confirm('Are you sure you want to delete this evidence? This action cannot be undone.')) {
      try {
        await deleteEvidence(evidenceId);
        if (isNative) {
          await triggerHapticFeedback();
        }
      } catch (error) {
        // Error already handled in the hook
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Evidence Management</h2>
          <p className="text-muted-foreground">
            Upload and manage case evidence with chain of custody tracking
          </p>
        </div>
        <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Upload className="w-4 h-4" />
              Upload Evidence
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Upload Evidence</DialogTitle>
              <DialogDescription>
                Upload files as evidence with proper chain of custody tracking.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUploadEvidence} className="space-y-4">
              <div className="space-y-2">
                <Label>Evidence Type</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as any }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="image">Image/Photo</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="audio">Audio</SelectItem>
                    <SelectItem value="document">Document</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>File</Label>
                <div className="flex gap-2">
                  <Input
                    type="file"
                    onChange={handleFileSelect}
                    className="flex-1"
                    accept={
                      formData.type === 'image' ? 'image/*' :
                      formData.type === 'video' ? 'video/*' :
                      formData.type === 'audio' ? 'audio/*' :
                      '*/*'
                    }
                  />
                  {isNative && formData.type === 'image' && (
                    <Button type="button" variant="outline" onClick={handleCapturePhoto} className="gap-2">
                      <Camera className="w-4 h-4" />
                      Capture
                    </Button>
                  )}
                </div>
                {formData.file && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {formData.file.name} ({formatFileSize(formData.file.size)})
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the evidence and its relevance..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Uploading...' : 'Upload Evidence'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Evidence Grid */}
      <div className="grid gap-4">
        {loading ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-muted-foreground">Loading evidence...</div>
            </CardContent>
          </Card>
        ) : caseEvidence.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-muted-foreground">
                No evidence uploaded yet. Upload your first piece of evidence to get started.
              </div>
            </CardContent>
          </Card>
        ) : (
          caseEvidence.map((item) => (
            <Card key={item.id} className="hover:shadow-elegant transition-all">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-mono text-sm text-muted-foreground">
                        {item.evidence_number}
                      </span>
                      <Badge variant={getFileTypeColor(item.type)} className="gap-1">
                        {getFileIcon(item.type)}
                        {item.type}
                      </Badge>
                      {item.hash_value && (
                        <Badge variant="outline" className="gap-1">
                          <Hash className="w-3 h-3" />
                          Verified
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 mb-2">
                      <h3 className="font-semibold">
                        {item.file_name || `Evidence ${item.evidence_number}`}
                      </h3>
                      {item.file_size && (
                        <span className="text-sm text-muted-foreground">
                          {formatFileSize(item.file_size)}
                        </span>
                      )}
                    </div>

                    {item.description && (
                      <p className="text-muted-foreground text-sm mb-2">
                        {item.description}
                      </p>
                    )}

                    <div className="text-sm text-muted-foreground">
                      Uploaded: {format(new Date(item.created_at), 'MMM d, yyyy HH:mm')}
                      {item.chain_of_custody && item.chain_of_custody.length > 0 && (
                        <span className="ml-4">
                          Chain of Custody: {item.chain_of_custody.length} entries
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.file_path && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const url = getEvidenceUrl(item.file_path!);
                          window.open(url, '_blank');
                        }}
                        className="gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedEvidence(item)}
                      className="gap-1"
                    >
                      <FileText className="w-4 h-4" />
                      Details
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteEvidence(item.id)}
                      className="gap-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Evidence Details Dialog */}
      <Dialog open={!!selectedEvidence} onOpenChange={() => setSelectedEvidence(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Evidence Details</DialogTitle>
            <DialogDescription>
              Complete information about this piece of evidence
            </DialogDescription>
          </DialogHeader>
          {selectedEvidence && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Evidence Number</Label>
                  <p className="font-mono text-sm">{selectedEvidence.evidence_number}</p>
                </div>
                <div>
                  <Label>Type</Label>
                  <p className="capitalize">{selectedEvidence.type}</p>
                </div>
              </div>

              {selectedEvidence.file_name && (
                <div>
                  <Label>File Name</Label>
                  <p>{selectedEvidence.file_name}</p>
                </div>
              )}

              {selectedEvidence.description && (
                <div>
                  <Label>Description</Label>
                  <p>{selectedEvidence.description}</p>
                </div>
              )}

              {selectedEvidence.hash_value && (
                <div>
                  <Label>File Hash (SHA-256)</Label>
                  <p className="font-mono text-xs break-all">{selectedEvidence.hash_value}</p>
                </div>
              )}

              {selectedEvidence.chain_of_custody && selectedEvidence.chain_of_custody.length > 0 && (
                <div>
                  <Label>Chain of Custody</Label>
                  <div className="space-y-2 mt-2">
                    {selectedEvidence.chain_of_custody.map((entry: any, index: number) => (
                      <div key={index} className="border rounded p-2 text-sm">
                        <div className="flex justify-between">
                          <span className="font-semibold">{entry.action}</span>
                          <span className="text-muted-foreground">
                            {format(new Date(entry.timestamp), 'MMM d, yyyy HH:mm')}
                          </span>
                        </div>
                        {entry.notes && (
                          <p className="text-muted-foreground mt-1">{entry.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}