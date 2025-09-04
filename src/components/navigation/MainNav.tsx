import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, BarChart3, Video, FileText, Settings, Users, Shield, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useCases } from '@/hooks/useCases';

export function MainNav() {
  const location = useLocation();
  const { isAdmin } = useAuth();
  const { cases } = useCases();
  
  const openCases = cases.filter(c => c.status === 'open').length;

  const navItems = [
    { path: '/', icon: Home, label: 'Dashboard' },
    { path: '/analytics', icon: BarChart3, label: 'Analytics' },
    { path: '/live', icon: Video, label: 'Live View' },
    { 
      path: '/cases', 
      icon: FileText, 
      label: 'Cases',
      badge: openCases > 0 ? openCases.toString() : undefined,
      badgeVariant: openCases > 0 ? 'destructive' as const : undefined
    },
  ];

  if (isAdmin) {
    navItems.push(
      { path: '/devices', icon: Shield, label: 'Devices' },
      { path: '/users', icon: Users, label: 'Users' }
    );
  }

  navItems.push({ path: '/settings', icon: Settings, label: 'Settings' });

  return (
    <nav className="hidden md:flex items-center space-x-1">
      {navItems.map(({ path, icon: Icon, label, badge, badgeVariant }) => {
        const isActive = location.pathname === path;
        
        return (
          <Button
            key={path}
            variant={isActive ? 'default' : 'ghost'}
            size="sm"
            asChild
            className="relative"
          >
            <Link to={path} className="flex items-center gap-2">
              <Icon className="w-4 h-4" />
              {label}
              {badge && (
                <Badge 
                  variant={badgeVariant || 'secondary'} 
                  className="text-xs min-w-[18px] h-[18px] flex items-center justify-center p-0"
                >
                  {badge}
                </Badge>
              )}
            </Link>
          </Button>
        );
      })}
    </nav>
  );
}