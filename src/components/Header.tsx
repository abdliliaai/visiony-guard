import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  Settings, 
  User, 
  Search, 
  Shield, 
  Activity,
  Wifi,
  WifiOff
} from 'lucide-react';

export const Header: React.FC = () => {
  const [notifications] = React.useState(12);
  const [systemStatus] = React.useState<'online' | 'offline'>('online');

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
      <div className="container flex h-16 items-center justify-between px-6">
        {/* Logo & Brand */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-primary rounded-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Vision-Y
              </h1>
              <p className="text-xs text-muted-foreground">Security Analytics</p>
            </div>
          </div>
          
          {/* System Status */}
          <div className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              className={`${
                systemStatus === 'online' 
                  ? 'bg-success/10 text-success border-success/30' 
                  : 'bg-destructive/10 text-destructive border-destructive/30'
              }`}
            >
              {systemStatus === 'online' ? (
                <Wifi className="w-3 h-3 mr-1" />
              ) : (
                <WifiOff className="w-3 h-3 mr-1" />
              )}
              System {systemStatus}
            </Badge>
          </div>
        </div>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <Button variant="ghost" className="text-foreground hover:text-primary">
            Dashboard
          </Button>
          <Button variant="ghost" className="text-muted-foreground hover:text-primary">
            Cameras
          </Button>
          <Button variant="ghost" className="text-muted-foreground hover:text-primary">
            Events
          </Button>
          <Button variant="ghost" className="text-muted-foreground hover:text-primary">
            Analytics
          </Button>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
            <Search className="w-5 h-5" />
          </Button>

          {/* Activity Monitor */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-surface rounded-lg">
            <Activity className="w-4 h-4 text-detection-active animate-pulse" />
            <span className="text-sm font-medium">Live</span>
          </div>

          {/* Notifications */}
          <div className="relative">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
              <Bell className="w-5 h-5" />
            </Button>
            {notifications > 0 && (
              <Badge className="absolute -top-2 -right-2 px-1.5 py-0.5 text-xs bg-destructive text-destructive-foreground">
                {notifications > 99 ? '99+' : notifications}
              </Badge>
            )}
          </div>

          {/* Settings */}
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
            <Settings className="w-5 h-5" />
          </Button>

          {/* Profile */}
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
            <User className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </header>
  );
};