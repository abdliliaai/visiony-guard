import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Car, Shield, AlertTriangle, TrendingUp, Clock } from 'lucide-react';

interface StatCard {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: React.ElementType;
  color: string;
}

const stats: StatCard[] = [
  {
    title: 'Active Detections',
    value: '23',
    change: '+12%',
    trend: 'up',
    icon: Shield,
    color: 'detection-active'
  },
  {
    title: 'People Detected',
    value: '147',
    change: '+8%', 
    trend: 'up',
    icon: Users,
    color: 'info'
  },
  {
    title: 'Vehicles Tracked',
    value: '89',
    change: '-3%',
    trend: 'down', 
    icon: Car,
    color: 'warning'
  },
  {
    title: 'Security Alerts',
    value: '5',
    change: '+25%',
    trend: 'up',
    icon: AlertTriangle,
    color: 'destructive'
  }
];

const recentEvents = [
  {
    id: '1',
    type: 'person',
    location: 'Main Entrance',
    confidence: 0.94,
    timestamp: '2 mins ago',
    severity: 'low'
  },
  {
    id: '2', 
    type: 'unauthorized_access',
    location: 'Restricted Zone B',
    confidence: 0.87,
    timestamp: '5 mins ago',
    severity: 'high'
  },
  {
    id: '3',
    type: 'vehicle',
    location: 'Parking Lot A', 
    confidence: 0.91,
    timestamp: '7 mins ago',
    severity: 'low'
  },
  {
    id: '4',
    type: 'loitering',
    location: 'Loading Bay',
    confidence: 0.76,
    timestamp: '12 mins ago',
    severity: 'medium'
  }
];

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'high': return 'text-destructive';
    case 'medium': return 'text-warning';
    case 'low': return 'text-success';
    default: return 'text-muted-foreground';
  }
};

export const DetectionStats: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="p-6 bg-card hover:bg-surface-hover transition-colors">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        stat.trend === 'up' ? 'text-success border-success/30 bg-success/10' :
                        stat.trend === 'down' ? 'text-destructive border-destructive/30 bg-destructive/10' :
                        'text-muted-foreground border-muted/30 bg-muted/10'
                      }`}
                    >
                      {stat.trend === 'up' && <TrendingUp className="w-3 h-3 mr-1" />}
                      {stat.change}
                    </Badge>
                  </div>
                </div>
                <div className={`p-3 rounded-full bg-gradient-to-br from-${stat.color}/20 to-${stat.color}/10`}>
                  <Icon className={`w-6 h-6 text-${stat.color}`} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Recent Events */}
      <Card className="p-6 bg-card">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-muted-foreground" />
              <h3 className="text-lg font-semibold">Recent Detection Events</h3>
            </div>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
              Live Feed
            </Badge>
          </div>
          
          <div className="space-y-3">
            {recentEvents.map((event) => (
              <div key={event.id} className="flex items-center justify-between p-3 bg-surface rounded-lg hover:bg-surface-hover transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${getSeverityColor(event.severity).replace('text-', 'bg-')}`}></div>
                  <div>
                    <p className="font-medium capitalize">{event.type.replace('_', ' ')}</p>
                    <p className="text-sm text-muted-foreground">{event.location}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{Math.round(event.confidence * 100)}%</p>
                  <p className="text-xs text-muted-foreground">{event.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
};