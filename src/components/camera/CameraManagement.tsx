import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { CameraWizard } from '@/components/camera/CameraWizard';
import { 
  Camera, 
  Plus, 
  Edit, 
  Trash2, 
  Play, 
  Square, 
  TestTube,
  ArrowLeft,
  Wifi,
  WifiOff,
  Activity
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ColumnDef } from '@tanstack/react-table';

interface CameraDevice {
  id: string;
  name: string;
  description?: string;
  location?: string;
  rtsp_url?: string;
  webrtc_url?: string;
  online: boolean;
  enabled: boolean;
  last_seen?: string;
  health_score?: number;
  firmware_version?: string;
  created_at: string;
  updated_at: string;
  tenant_id: string;
}

interface CameraManagementProps {
  tenantId?: string;
}

const CameraManagement: React.FC<CameraManagementProps> = ({ tenantId }) => {
  const { profile, isAdmin } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [showCameraWizard, setShowCameraWizard] = useState(false);
  const [editingCamera, setEditingCamera] = useState<CameraDevice | null>(null);

  const columns: ColumnDef<CameraDevice>[] = [
    {
      accessorKey: 'name',
      header: 'Camera Name',
      cell: ({ row }) => {
        const camera = row.original;
        return (
          <div>
            <div className="font-medium">{camera.name}</div>
            <div className="text-sm text-muted-foreground">{camera.location}</div>
          </div>
        );
      },
    },
    {
      accessorKey: 'online',
      header: 'Status',
      cell: ({ row }) => {
        const online = row.getValue('online') as boolean;
        const enabled = row.original.enabled;
        
        if (!enabled) {
          return <Badge variant="secondary">Disabled</Badge>;
        }
        
        return (
          <div className="flex items-center gap-2">
            {online ? (
              <>
                <Wifi className="w-4 h-4 text-success" />
                <Badge variant="default">Online</Badge>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-destructive" />
                <Badge variant="destructive">Offline</Badge>
              </>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'health_score',
      header: 'Health',
      cell: ({ row }) => {
        const health = row.getValue('health_score') as number || 0;
        const color = health >= 80 ? 'text-success' : health >= 60 ? 'text-warning' : 'text-destructive';
        return <span className={color}>{health}%</span>;
      },
    },
    {
      accessorKey: 'last_seen',
      header: 'Last Seen',
      cell: ({ row }) => {
        const lastSeen = row.getValue('last_seen') as string;
        if (!lastSeen) return 'Never';
        
        const date = new Date(lastSeen);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
        return date.toLocaleDateString();
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const camera = row.original;
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleTestConnection(camera)}
            >
              <TestTube className="w-4 h-4 mr-1" />
              Test
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEditCamera(camera)}
            >
              <Edit className="w-4 h-4 mr-1" />
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleRestartStream(camera)}
              disabled={!camera.online}
            >
              <Play className="w-4 h-4 mr-1" />
              Restart
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeleteCamera(camera)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Delete
            </Button>
          </div>
        );
      },
    },
  ];

  useEffect(() => {
    fetchCameras();
  }, [tenantId]);

  const fetchCameras = async () => {
    try {
      setLoading(true);
      
      const query = supabase
        .from('vy_device')
        .select('*')
        .order('created_at', { ascending: false });

      if (tenantId) {
        query.eq('tenant_id', tenantId);
      } else if (profile?.tenant_id) {
        query.eq('tenant_id', profile.tenant_id);
      }

      const { data, error } = await query;

      if (error) throw error;

      setCameras(data || []);
    } catch (error: any) {
      console.error('Error fetching cameras:', error);
      toast({
        title: "Error",
        description: "Failed to load cameras.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async (camera: CameraDevice) => {
    try {
      toast({
        title: "Testing Connection",
        description: `Testing connection to ${camera.name}...`,
      });

      const { data, error } = await supabase.functions.invoke('device-test', {
        body: {
          deviceId: camera.id,
          rtspUrl: camera.rtsp_url,
          webrtcUrl: camera.webrtc_url,
        },
      });

      if (error) throw error;

      toast({
        title: "Connection Test",
        description: data.success 
          ? `${camera.name} is responding normally` 
          : `${camera.name} connection failed: ${data.error}`,
        variant: data.success ? "default" : "destructive",
      });
    } catch (error: any) {
      toast({
        title: "Test Failed",
        description: error.message || "Failed to test camera connection.",
        variant: "destructive",
      });
    }
  };

  const handleEditCamera = (camera: CameraDevice) => {
    setEditingCamera(camera);
    setShowCameraWizard(true);
  };

  const handleRestartStream = async (camera: CameraDevice) => {
    try {
      toast({
        title: "Restarting Stream",
        description: `Restarting stream for ${camera.name}...`,
      });

      const { error } = await supabase.functions.invoke('device-control', {
        body: {
          action: 'restart',
          deviceId: camera.id,
        },
      });

      if (error) throw error;

      toast({
        title: "Stream Restarted",
        description: `${camera.name} stream has been restarted.`,
      });
    } catch (error: any) {
      toast({
        title: "Restart Failed",
        description: error.message || "Failed to restart camera stream.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCamera = async (camera: CameraDevice) => {
    if (!confirm(`Are you sure you want to delete ${camera.name}? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('vy_device')
        .delete()
        .eq('id', camera.id);

      if (error) throw error;

      toast({
        title: "Camera Deleted",
        description: `${camera.name} has been deleted.`,
      });

      fetchCameras();
    } catch (error: any) {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete camera.",
        variant: "destructive",
      });
    }
  };

  const handleWizardComplete = () => {
    setShowCameraWizard(false);
    setEditingCamera(null);
    fetchCameras();
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container px-6 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
            <p className="text-muted-foreground">
              You need admin privileges to manage cameras.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.history.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Camera Management
              </h1>
              <p className="text-muted-foreground mt-2">
                Manage security cameras and monitoring devices
              </p>
            </div>
          </div>
          <Button 
            onClick={() => setShowCameraWizard(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Camera
          </Button>
        </div>

        {/* Camera Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <Camera className="w-8 h-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{cameras.length}</p>
                <p className="text-sm text-muted-foreground">Total Cameras</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <Wifi className="w-8 h-8 text-success" />
              <div>
                <p className="text-2xl font-bold">
                  {cameras.filter(c => c.online).length}
                </p>
                <p className="text-sm text-muted-foreground">Online</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <WifiOff className="w-8 h-8 text-destructive" />
              <div>
                <p className="text-2xl font-bold">
                  {cameras.filter(c => !c.online).length}
                </p>
                <p className="text-sm text-muted-foreground">Offline</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">
                  {Math.round(cameras.reduce((acc, c) => acc + (c.health_score || 0), 0) / Math.max(cameras.length, 1))}%
                </p>
                <p className="text-sm text-muted-foreground">Avg Health</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Camera List */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <Camera className="w-5 h-5" />
            <h2 className="text-xl font-semibold">Cameras</h2>
          </div>
          
          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading cameras...</p>
            </div>
          ) : cameras.length === 0 ? (
            <div className="text-center py-8">
              <Camera className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No cameras configured</h3>
              <p className="text-muted-foreground mb-4">
                Start by adding your first security camera
              </p>
              <Button onClick={() => setShowCameraWizard(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add First Camera
              </Button>
            </div>
          ) : (
            <DataTable columns={columns} data={cameras} />
          )}
        </Card>
      </main>

      {/* Camera Wizard */}
      {showCameraWizard && (
        <CameraWizard
          open={showCameraWizard}
          onClose={() => {
            setShowCameraWizard(false);
            setEditingCamera(null);
          }}
          onComplete={handleWizardComplete}
          editingCamera={editingCamera}
          tenantId={tenantId || profile?.tenant_id}
        />
      )}
    </div>
  );
};

export default CameraManagement;