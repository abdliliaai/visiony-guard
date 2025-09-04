import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Shield, User, Settings, LogOut, Building2, Plus, Camera } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { CameraWizard } from '@/components/camera/CameraWizard';
import { TenantSwitcher } from '@/components/tenant/TenantSwitcher';
import { Link } from 'react-router-dom';

export const Header = () => {
  const { user, profile, signOut, isAdmin } = useAuth();
  const [showCameraWizard, setShowCameraWizard] = useState(false);

  const handleSignOut = async () => {
    await signOut();
  };

  const getUserInitials = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`;
    }
    return user?.email?.[0]?.toUpperCase() || 'U';
  };

  const getUserDisplayName = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    return user?.email || 'User';
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-6">
          {/* Logo */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-gradient-primary rounded-lg">
                <Shield className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  Vision-Y
                </h1>
                <p className="text-xs text-muted-foreground -mt-1">Security Intelligence</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-4">
            {/* Add Camera Button */}
            <Button 
              onClick={() => setShowCameraWizard(true)}
              className="bg-gradient-primary hover:bg-gradient-primary/90 text-white shadow-glow"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Camera
            </Button>

            {/* Tenant Switcher for Multi-tenant Users */}
            {profile && (
              <TenantSwitcher className="min-w-[200px]" />
            )}

            {/* System Status */}
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
              <span className="text-sm text-muted-foreground">System Online</span>
            </div>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>{getUserInitials()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium leading-none">
                        {getUserDisplayName()}
                      </p>
                      {isAdmin && (
                        <Badge variant="secondary" className="text-xs">
                          Admin
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                    {profile && (
                      <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                        <Building2 className="h-3 w-3" />
                        <span className="truncate">Tenant: {profile.tenant_id.slice(-8)}</span>
                      </div>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {isAdmin && (
                  <>
                    <DropdownMenuItem>
                      <Building2 className="mr-2 h-4 w-4" />
                      <span>Tenant Management</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Camera className="mr-2 h-4 w-4" />
                      <span>Device Management</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                
                <DropdownMenuItem asChild>
                  <Link to="/settings">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-destructive focus:text-destructive"
                  onClick={handleSignOut}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Camera Wizard */}
      <CameraWizard 
        open={showCameraWizard} 
        onOpenChange={setShowCameraWizard} 
      />
    </>
  );
};