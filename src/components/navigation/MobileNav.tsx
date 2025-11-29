import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, BarChart3, Video, FileText, Settings, Users, Shield, Building, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useCases } from '@/hooks/useCases';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

interface NavItem {
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge?: string;
  badgeVariant?: 'destructive' | 'secondary';
}

interface MobileNavProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileNav({ open, onOpenChange }: MobileNavProps) {
  const location = useLocation();
  const { isAdmin, isRootAdmin, isManagedServicesMode } = useAuth();
  const { cases } = useCases();
  
  const openCases = cases.filter(c => c.status === 'open').length;

  const navItems: NavItem[] = [
    { path: '/', icon: Home, label: 'Dashboard' },
  ];

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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[280px] sm:w-[320px] p-0">
        <SheetHeader className="p-6 pb-4 border-b">
          <SheetTitle className="text-left">Navigation</SheetTitle>
        </SheetHeader>
        
        <nav className="flex flex-col p-4 space-y-1">
          {navItems.map(({ path, icon: Icon, label, badge, badgeVariant }) => {
            const isActive = location.pathname === path;
            
            return (
              <Button
                key={path}
                variant={isActive ? 'secondary' : 'ghost'}
                size="default"
                asChild
                className="justify-start relative"
                onClick={() => onOpenChange(false)}
              >
                <Link to={path} className="flex items-center gap-3 w-full">
                  <Icon className="w-5 h-5" />
                  <span className="flex-1 text-left">{label}</span>
                  {badge && (
                    <Badge 
                      variant={badgeVariant || 'secondary'} 
                      className="text-xs min-w-[20px] h-[20px] flex items-center justify-center"
                    >
                      {badge}
                    </Badge>
                  )}
                </Link>
              </Button>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}