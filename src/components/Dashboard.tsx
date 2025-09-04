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
  MapPin
} from 'lucide-react';
import heroImage from '@/assets/security-camera-hero.jpg';

export const Dashboard: React.FC = () => {
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
                Advanced Security
                <span className="block bg-gradient-primary bg-clip-text text-transparent">
                  Intelligence Platform
                </span>
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                Monitor, detect, and respond to security events in real-time with 
                AI-powered computer vision and behavioral analytics.
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <Button size="lg" className="bg-gradient-primary hover:bg-gradient-primary/90 text-white shadow-glow">
                <Play className="w-5 h-5 mr-2" />
                View Live Feed
              </Button>
              <Button variant="outline" size="lg">
                <BarChart3 className="w-5 h-5 mr-2" />
                Analytics Dashboard
              </Button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-success">12</p>
                <p className="text-sm text-muted-foreground">Cameras Online</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">847</p>
                <p className="text-sm text-muted-foreground">Events Today</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-warning">3</p>
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
            {[
              {
                time: '14:32',
                event: 'Unauthorized access attempt detected',
                location: 'Main Entrance - Zone A',
                severity: 'high',
                action: 'Alert sent to security team'
              },
              {
                time: '14:15',
                event: 'Vehicle license plate captured',
                location: 'Parking Lot B',
                severity: 'low',
                action: 'ABC-1234 logged in database'
              },
              {
                time: '13:58',
                event: 'Motion detected in restricted area',
                location: 'Warehouse Floor - Section C',
                severity: 'medium',
                action: 'Recording activated'
              },
              {
                time: '13:45',
                event: 'Person loitering detected',
                location: 'Loading Bay',
                severity: 'medium',
                action: 'Monitoring continued'
              }
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-4 p-4 bg-surface rounded-lg hover:bg-surface-hover transition-colors">
                <div className="text-sm font-mono text-muted-foreground min-w-[60px]">
                  {item.time}
                </div>
                <div className={`w-2 h-2 rounded-full ${
                  item.severity === 'high' ? 'bg-destructive' :
                  item.severity === 'medium' ? 'bg-warning' : 'bg-success'
                }`}></div>
                <div className="flex-1">
                  <p className="font-medium">{item.event}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <MapPin className="w-3 h-3" />
                    {item.location}
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  {item.action}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </main>
    </div>
  );
};