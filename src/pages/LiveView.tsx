import React, { useState } from 'react';
import { Header } from '@/components/Header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Play, 
  Pause, 
  Square, 
  Volume2, 
  VolumeX, 
  Maximize, 
  RotateCcw, 
  MapPin, 
  AlertTriangle, 
  Users, 
  Package, 
  Calendar,
  Filter,
  Search
} from 'lucide-react';
import { useDevices } from '@/hooks/useDevices';
import { useEvents } from '@/hooks/useEvents';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

const mockCases = {
  vandalism: [
    {
      id: '1',
      timestamp: '2024-01-15 14:30:22',
      location: 'Main Entrance',
      confidence: 92,
      description: 'Graffiti spraying detected on wall surface',
      status: 'resolved',
      severity: 'medium'
    },
    {
      id: '2',
      timestamp: '2024-01-14 22:15:45',
      location: 'Parking Lot A',
      confidence: 87,
      description: 'Property damage to vehicle detected',
      status: 'investigating',
      severity: 'high'
    },
    {
      id: '3',
      timestamp: '2024-01-14 18:42:11',
      location: 'Side Gate',
      confidence: 78,
      description: 'Attempted damage to security equipment',
      status: 'reported',
      severity: 'critical'
    },
    {
      id: '4',
      timestamp: '2024-01-13 16:20:33',
      location: 'Loading Bay',
      confidence: 85,
      description: 'Unauthorized marking on building exterior',
      status: 'resolved',
      severity: 'low'
    }
  ],
  loitering: [
    {
      id: '5',
      timestamp: '2024-01-15 23:45:12',
      location: 'Main Entrance',
      confidence: 95,
      description: 'Individual remaining in restricted area for 15+ minutes',
      status: 'active',
      severity: 'medium'
    },
    {
      id: '6',
      timestamp: '2024-01-15 20:30:48',
      location: 'Garden Area',
      confidence: 89,
      description: 'Group of 3 people loitering after hours',
      status: 'investigating',
      severity: 'high'
    },
    {
      id: '7',
      timestamp: '2024-01-15 12:15:22',
      location: 'Parking Lot B',
      confidence: 76,
      description: 'Suspicious individual near vehicles',
      status: 'resolved',
      severity: 'medium'
    },
    {
      id: '8',
      timestamp: '2024-01-14 19:22:15',
      location: 'Side Entrance',
      confidence: 82,
      description: 'Person waiting without apparent purpose',
      status: 'reported',
      severity: 'low'
    }
  ]
};

const LiveView = () => {
  const { devices, loading: devicesLoading } = useDevices();
  const { events } = useEvents(20);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedCamera, setSelectedCamera] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isPlayingAll, setIsPlayingAll] = useState(false);

  const handlePlayAll = () => {
    setIsPlayingAll(true);
    toast({
      title: "Starting All Cameras",
      description: "All camera feeds are now live.",
    });
  };

  const handlePauseAll = () => {
    setIsPlayingAll(false);
    toast({
      title: "Pausing All Cameras",
      description: "All camera feeds have been paused.",
    });
  };

  const handleCameraControl = (action: string, deviceName: string) => {
    toast({
      title: `Camera ${action}`,
      description: `${action} applied to ${deviceName}.`,
    });
  };

  const handleMaximize = (deviceName: string) => {
    toast({
      title: "Maximize Camera",
      description: `${deviceName} opened in full screen mode.`,
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-destructive text-destructive-foreground';
      case 'high': return 'bg-destructive text-destructive-foreground';
      case 'medium': return 'bg-warning text-warning-foreground';
      case 'low': return 'bg-success text-success-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-destructive text-destructive-foreground';
      case 'investigating': return 'bg-warning text-warning-foreground';
      case 'reported': return 'bg-primary text-primary-foreground';
      case 'resolved': return 'bg-success text-success-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const filteredVandalismCases = mockCases.vandalism.filter(case_ => 
    (filterStatus === 'all' || case_.status === filterStatus) &&
    (searchTerm === '' || case_.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
     case_.location.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredLoiteringCases = mockCases.loitering.filter(case_ => 
    (filterStatus === 'all' || case_.status === filterStatus) &&
    (searchTerm === '' || case_.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
     case_.location.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Live Monitoring
            </h1>
            <p className="text-muted-foreground mt-2">
              Real-time security feeds and historical incident analysis
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
              <span className="text-sm text-muted-foreground">Live</span>
            </div>
          </div>
        </div>

        <Tabs defaultValue="live" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="live">Live Feeds</TabsTrigger>
            <TabsTrigger value="vandalism">Vandalism Cases</TabsTrigger>
            <TabsTrigger value="loitering">Loitering Events</TabsTrigger>
          </TabsList>

          <TabsContent value="live" className="space-y-6">
            {/* Camera Controls */}
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Select value={selectedCamera} onValueChange={setSelectedCamera}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Select camera" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Cameras</SelectItem>
                      {devices.map(device => (
                        <SelectItem key={device.id} value={device.id}>
                          {device.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={handlePlayAll} disabled={isPlayingAll}>
                      <Play className="w-4 h-4 mr-2" />
                      {isPlayingAll ? 'Playing All' : 'Play All'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={handlePauseAll} disabled={!isPlayingAll}>
                      <Pause className="w-4 h-4 mr-2" />
                      Pause All
                    </Button>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  {devices.filter(d => d.online).length} of {devices.length} cameras online
                </div>
              </div>
            </Card>

            {/* Live Camera Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {devices.map((device) => (
                <Card key={device.id} className="overflow-hidden">
                  <div className="relative aspect-video bg-slate-900 flex items-center justify-center">
                    {device.online ? (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                        <div className="text-white text-center">
                          <Play className="w-12 h-12 mx-auto mb-2 opacity-70" />
                          <p className="text-sm">Live Feed</p>
                        </div>
                        <div className="absolute top-3 left-3 flex items-center gap-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                          <span className="text-white text-xs font-medium">LIVE</span>
                        </div>
                        <div className="absolute top-3 right-3">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="text-white hover:text-white hover:bg-black/20"
                            onClick={() => handleMaximize(device.name)}
                          >
                            <Maximize className="w-4 h-4" />
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="text-center text-muted-foreground">
                        <Square className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Camera Offline</p>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">{device.name}</h3>
                      <Badge variant={device.online ? 'secondary' : 'destructive'}>
                        {device.online ? 'Online' : 'Offline'}
                      </Badge>
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground mb-3">
                      <MapPin className="w-3 h-3 mr-1" />
                      {device.location || 'Location not set'}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => handleCameraControl('Volume Toggle', device.name)}
                        >
                          <Volume2 className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => handleCameraControl('Restart', device.name)}
                        >
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {device.last_seen ? `Last seen: ${new Date(device.last_seen).toLocaleTimeString()}` : 'Never'}
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="vandalism" className="space-y-6">
            {/* Filters */}
            <Card className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search vandalism cases..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-sm"
                  />
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="investigating">Investigating</SelectItem>
                    <SelectItem value="reported">Reported</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </Card>

            {/* Vandalism Cases */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Vandalism Cases ({filteredVandalismCases.length})
                </h2>
                <Badge variant="secondary">{filteredVandalismCases.filter(c => c.status !== 'resolved').length} Active</Badge>
              </div>
              
              {filteredVandalismCases.map((case_) => (
                <Card key={case_.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge className={getSeverityColor(case_.severity)}>
                          {case_.severity.toUpperCase()}
                        </Badge>
                        <Badge className={getStatusColor(case_.status)}>
                          {case_.status.toUpperCase()}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          Confidence: {case_.confidence}%
                        </span>
                      </div>
                      <h3 className="font-semibold mb-2">{case_.description}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {case_.timestamp}
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {case_.location}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => navigate(`/case/vandalism/${case_.id}`)}>
                        View Details
                      </Button>
                      {case_.status !== 'resolved' && (
                        <Button size="sm" onClick={() => {
                          toast({
                            title: "Action Required",
                            description: "Case escalated for immediate attention.",
                          });
                        }}>
                          Take Action
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="loitering" className="space-y-6">
            {/* Filters */}
            <Card className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search loitering events..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-sm"
                  />
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="investigating">Investigating</SelectItem>
                    <SelectItem value="reported">Reported</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </Card>

            {/* Loitering Cases */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Loitering Events ({filteredLoiteringCases.length})
                </h2>
                <Badge variant="secondary">{filteredLoiteringCases.filter(c => c.status !== 'resolved').length} Active</Badge>
              </div>
              
              {filteredLoiteringCases.map((case_) => (
                <Card key={case_.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge className={getSeverityColor(case_.severity)}>
                          {case_.severity.toUpperCase()}
                        </Badge>
                        <Badge className={getStatusColor(case_.status)}>
                          {case_.status.toUpperCase()}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          Confidence: {case_.confidence}%
                        </span>
                      </div>
                      <h3 className="font-semibold mb-2">{case_.description}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {case_.timestamp}
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {case_.location}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => navigate(`/case/loitering/${case_.id}`)}>
                        View Details
                      </Button>
                      {case_.status !== 'resolved' && (
                        <Button size="sm" onClick={() => {
                          toast({
                            title: "Action Required", 
                            description: "Case escalated for immediate attention.",
                          });
                        }}>
                          Take Action
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default LiveView;