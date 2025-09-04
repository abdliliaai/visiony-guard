import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, BarChart3, Video, FileText, Settings, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useMobile } from '@/hooks/useMobile';

export function MobileNav() {
  const location = useLocation();
  const { isNative, triggerHapticFeedback } = useMobile();

  const navItems = [
    { path: '/', icon: Home, label: 'Dashboard' },
    { path: '/analytics', icon: BarChart3, label: 'Analytics' },
    { path: '/live', icon: Video, label: 'Live View' },
    { path: '/cases', icon: FileText, label: 'Cases' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  const handleNavClick = async () => {
    if (isNative) {
      await triggerHapticFeedback('light');
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t md:hidden">
      <div className="flex items-center justify-around py-2">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          
          return (
            <Link
              key={path}
              to={path}
              onClick={handleNavClick}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                isActive 
                  ? 'text-primary bg-primary/10' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{label}</span>
              {isActive && <div className="w-1 h-1 bg-primary rounded-full" />}
            </Link>
          );
        })}
      </div>
      {isNative && (
        <div className="flex items-center justify-center py-1">
          <Badge variant="outline" className="text-xs gap-1">
            <Shield className="w-3 h-3" />
            Mobile App
          </Badge>
        </div>
      )}
    </nav>
  );
}