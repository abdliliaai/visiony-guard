import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, BarChart3, Video, FileText, Settings, Users, Shield, AlertCircle, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useCases } from '@/hooks/useCases';

interface NavItem {
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge?: string;
  badgeVariant?: 'destructive' | 'secondary';
}

export function MainNav() {
  const location = useLocation();
  const { isAdmin, isRootAdmin, isManagedServicesMode } = useAuth();
  const { cases } = useCases();
  
  const openCases = cases.filter(c => c.status === 'open').length;

  const navItems: NavItem[] = [
    { path: '/', icon: Home, label: 'Dashboard' },
  ];

  // Add MSSP Dashboard for root admins with managed services mode
  if (isRootAdmin && isManagedServicesMode) {
    navItems.push({ path: '/mssp', icon: Building, label: 'MSSP Dashboard' });
  }

  navItems.push(
    { path: '/analytics', icon: BarChart3, label: 'Analytics' },
    { path: '/live', icon: Video, label: 'Live View' },
    { 
      path: '/cases', 
      icon: FileText, 
      label: 'Cases',
      badge: openCases > 0 ? openCases.toString() : undefined,
      badgeVariant: openCases > 0 ? 'destructive' as const : undefined
    }
  );

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