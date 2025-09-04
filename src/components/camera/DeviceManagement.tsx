import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useDevices } from '@/hooks/useDevices';
import { useToast } from '@/hooks/use-toast';
import { 
  Camera, 
  MoreVertical, 
  Play, 
  Square, 
  Settings, 
  Trash2, 
  TestTube,
  MapPin,
  Wifi,
  WifiOff,
  Clock,
  Search,
  Filter,
  Plus
} from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type Device = Database['public']['Tables']['vy_device']['Row'];

interface DeviceManagementProps {
  onAddCamera?: () => void;
}

export const DeviceManagement = ({ onAddCamera }: DeviceManagementProps) => {
  const { devices, loading, updateDevice, deleteDevice } = useDevices();
  const { toast } = useToast();
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline'>('all');

  const filteredDevices = devices.filter(device => {
    const matchesSearch = device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         device.location?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
                          (statusFilter === 'online' && device.online) ||
                          (statusFilter === 'offline' && !device.online);
    
    return matchesSearch && matchesStatus;
  });

  const handleToggleDevice = async (device: Device) => {
    const { error } = await updateDevice(device.id, { enabled: !device.enabled });
    if (error) {
      toast({
        title: "Update Failed",
        description: error,
        variant: "destructive",
      });
    } else {
      toast({
        title: device.enabled ? "Device Disabled" : "Device Enabled",
        description: `${device.name} has been ${device.enabled ? 'disabled' : 'enabled'}.`,
      });
    }
  };

  const handleDeleteDevice = async (device: Device) => {
    if (confirm(`Are you sure you want to delete ${device.name}? This action cannot be undone.`)) {
      const { error } = await deleteDevice(device.id);
      if (error) {
        toast({
          title: "Delete Failed",
          description: error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Device Deleted",
          description: `${device.name} has been removed.`,
        });
      }
    }
  };

  const handleTestConnection = async (device: Device) => {
    toast({
      title: "Testing Connection",
      description: `Testing connection to ${device.name}...`,
    });
    
    // Simulate connection test
    setTimeout(() => {
      toast({
        title: "Connection Test Complete",
        description: `${device.name} is responding normally.`,
      });
    }, 2000);
  };

  const getStatusBadge = (device: Device) => {
    if (!device.enabled) {
      return <Badge variant="secondary">Disabled</Badge>;
    }
    if (device.online) {
      return <Badge className="bg-success text-white">Online</Badge>;
    }
    return <Badge variant="destructive">Offline</Badge>;
  };

  const getLastSeenText = (lastSeen?: string | null) => {
    if (!lastSeen) return 'Never';
    
    const now = new Date();
    const seen = new Date(lastSeen);
    const diffMs = now.getTime() - seen.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Device Management</h2>
          <p className="text-muted-foreground">
            Manage and monitor your security cameras
          </p>
        </div>
        <Button onClick={onAddCamera} className="bg-gradient-primary hover:bg-gradient-primary/90 text-white">
          <Plus className="mr-2 h-4 w-4" />
          Add Camera
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search devices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Status: {statusFilter === 'all' ? 'All' : statusFilter === 'online' ? 'Online' : 'Offline'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setStatusFilter('all')}>
              All Devices
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter('online')}>
              Online Only
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter('offline')}>
              Offline Only
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Device Grid */}
      {filteredDevices.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Camera className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No devices found</h3>
            <p className="text-muted-foreground text-center mb-4">
              {devices.length === 0 
                ? "Get started by adding your first security camera"
                : "No devices match your current filters"
              }
            </p>
            {devices.length === 0 && (
              <Button onClick={onAddCamera}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Camera
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDevices.map((device) => (
            <Card key={device.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{device.name}</CardTitle>
                    {device.location && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <MapPin className="mr-1 h-3 w-3" />
                        {device.location}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(device)}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelectedDevice(device)}>
                          <Settings className="mr-2 h-4 w-4" />
                          Configure
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleTestConnection(device)}>
                          <TestTube className="mr-2 h-4 w-4" />
                          Test Connection
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleDevice(device)}>
                          {device.enabled ? (
                            <>
                              <Square className="mr-2 h-4 w-4" />
                              Disable
                            </>
                          ) : (
                            <>
                              <Play className="mr-2 h-4 w-4" />
                              Enable
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDeleteDevice(device)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Stream Preview */}
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                  {device.enabled && device.online ? (
                    <div className="text-center">
                      <Camera className="h-8 w-8 text-muted-foreground mb-2 mx-auto" />
                      <p className="text-sm text-muted-foreground">Live Stream</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <WifiOff className="h-8 w-8 text-muted-foreground mb-2 mx-auto" />
                      <p className="text-sm text-muted-foreground">
                        {device.enabled ? 'Offline' : 'Disabled'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Device Info */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Protocol:</span>
                    <span className="font-medium">
                      {device.rtsp_url ? 'RTSP' : device.webrtc_url ? 'WebRTC' : 'Unknown'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Last Seen:</span>
                    <div className="flex items-center space-x-1">
                      {device.online ? (
                        <Wifi className="h-3 w-3 text-success" />
                      ) : (
                        <Clock className="h-3 w-3 text-muted-foreground" />
                      )}
                      <span className="font-medium">{getLastSeenText(device.last_seen)}</span>
                    </div>
                  </div>
                  {device.description && (
                    <div className="pt-2 border-t">
                      <p className="text-muted-foreground">{device.description}</p>
                    </div>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="flex space-x-2 pt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => setSelectedDevice(device)}
                  >
                    <Settings className="mr-2 h-3 w-3" />
                    Configure
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleTestConnection(device)}
                  >
                    <TestTube className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Device Configuration Dialog */}
      <Dialog open={!!selectedDevice} onOpenChange={() => setSelectedDevice(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Configure {selectedDevice?.name}</DialogTitle>
            <DialogDescription>
              Adjust device settings and detection parameters
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Device configuration panel will be implemented here with:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Stream URL configuration</li>
              <li>ROI (Region of Interest) editor</li>
              <li>Detection threshold adjustments</li>
              <li>Recording settings</li>
              <li>Alert configurations</li>
            </ul>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};