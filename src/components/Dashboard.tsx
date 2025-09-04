import React from 'react';
import { Header } from '@/components/Header';
import { CameraGrid } from '@/components/CameraGrid';
import { DetectionStats } from '@/components/DetectionStats';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Calendar, 
  Download,
  Filter,
  BarChart3,
  MapPin,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import heroImage from '@/assets/security-camera-hero.jpg';
import { useAuth } from '@/contexts/AuthContext';
import { useEvents } from '@/hooks/useEvents';
import { useDevices } from '@/hooks/useDevices';
import { MobileFeatures } from '@/components/mobile/MobileFeatures';
import { Link } from 'react-router-dom';

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'critical': return 'bg-destructive';
    case 'high': return 'bg-destructive';
    case 'medium': return 'bg-warning';
    case 'low': return 'bg-success';
    default: return 'bg-success';
  }
};

export const Dashboard: React.FC = () => {
  const { profile } = useAuth();
  const { events, loading: eventsLoading, acknowledgeEvent } = useEvents(10);
  const { devices, loading: devicesLoading } = useDevices();

  const onlineDevices = devices.filter(d => d.online).length;
  const totalEvents = events.length;
  const activeAlerts = events.filter(e => !e.acknowledged && e.severity !== 'low').length;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0">
          <img 
            src={heroImage} 
            alt="Security monitoring system" 
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent"></div>
        </div>
        
        <div className="relative container px-6 py-12">
          <div className="max-w-2xl space-y-6">
            <div className="space-y-4">
              <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
                ✨ AI-Powered Detection Active
              </Badge>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                Welcome back, {profile?.first_name && profile?.last_name ? `${profile.first_name} ${profile.last_name}` : profile?.first_name || 'User'}!
                <span className="block bg-gradient-primary bg-clip-text text-transparent">
                  Security Intelligence
                </span>
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                Monitor, detect, and respond to security events in real-time with 
                AI-powered computer vision and behavioral analytics.
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <Button size="lg" className="bg-gradient-primary hover:bg-gradient-primary/90 text-white shadow-glow" asChild>
                <Link to="/live">
                  <Play className="w-5 h-5 mr-2" />
                  View Live Feed
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link to="/analytics">
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Analytics Dashboard
                </Link>
              </Button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-success">
                  {devicesLoading ? '...' : onlineDevices}
                </p>
                <p className="text-sm text-muted-foreground">Cameras Online</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">
                  {eventsLoading ? '...' : totalEvents}
                </p>
                <p className="text-sm text-muted-foreground">Recent Events</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-warning">
                  {eventsLoading ? '...' : activeAlerts}
                </p>
                <p className="text-sm text-muted-foreground">Active Alerts</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="container px-6 py-8 space-y-8">
        {/* Detection Stats */}
        <DetectionStats />
        
        {/* Camera Feeds */}
        <CameraGrid />
        
        {/* Mobile Features Card */}
        <MobileFeatures />

        {/* Activity Timeline */}
        <Card className="p-6 bg-card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold">Security Timeline</h3>
              <p className="text-muted-foreground">Recent activity across all monitored locations</p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm">
                <Calendar className="w-4 h-4 mr-2" />
                Last 24h
              </Button>
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
          
          <div className="space-y-4">
            {eventsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No recent events. Your security system is monitoring normally.
              </div>
            ) : (
              events.map((event) => (
                <div key={event.id} className="flex items-center gap-4 p-4 bg-surface rounded-lg hover:bg-surface-hover transition-colors">
                  <div className="text-sm font-mono text-muted-foreground min-w-[60px]">
                    {new Date(event.occurred_at).toLocaleTimeString()}
                  </div>
                  <div className={`w-2 h-2 rounded-full ${getSeverityColor(event.severity)}`}></div>
                  <div className="flex-1">
                    <p className="font-medium">
                      {event.class_name ? `${event.class_name} detected` : event.type}
                      {event.confidence && (
                        <span className="text-muted-foreground ml-2">
                          ({Math.round(event.confidence * 100)}% confidence)
                        </span>
                      )}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <MapPin className="w-3 h-3" />
                      {event.device?.name || 'Unknown Device'}
                      {event.device?.location && ` - ${event.device.location}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {event.acknowledged ? (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-warning" />
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => event.acknowledged ? null : acknowledgeEvent(event.id)}
                      disabled={event.acknowledged}
                    >
                      {event.acknowledged ? 'Acknowledged' : 'Acknowledge'}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </main>
    </div>
  );
};