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
import { Shield, User, Settings, LogOut, Building2, Plus, Camera, ArrowLeft, Menu } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/contexts/TenantContext';
import { CameraWizard } from '@/components/camera/CameraWizard';
import { TenantSwitcher } from '@/components/tenant/TenantSwitcher';
import { MainNav } from '@/components/navigation/MainNav';
import { MobileNav } from '@/components/navigation/MobileNav';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { Link } from 'react-router-dom';

export const Header = () => {
  const { user, profile, signOut, isAdmin, isRootAdmin } = useAuth();
  const { isImpersonating } = useTenant();
  const [showCameraWizard, setShowCameraWizard] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);

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
        <div className="container flex h-16 items-center justify-between px-4 lg:px-6">
          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-9 w-9"
            onClick={() => setShowMobileNav(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Logo */}
          <div className="flex items-center space-x-4 lg:space-x-8">
            <Link to="/" className="flex items-center space-x-2 shrink-0">
              <div className="p-1.5 lg:p-2 bg-gradient-primary rounded-lg">
                <Shield className="h-5 w-5 lg:h-6 lg:w-6 text-primary-foreground" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg lg:text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  Vision-Y
                </h1>
                <p className="text-xs text-muted-foreground -mt-1 hidden lg:block">Security Intelligence</p>
              </div>
            </Link>
            
            {/* Desktop Navigation */}
            <MainNav />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 lg:gap-3">
            {/* Back to MSSP Dashboard Button (Desktop) */}
            {isRootAdmin && isImpersonating && (
              <Button 
                variant="outline"
                size="sm"
                asChild
                className="hidden lg:flex"
              >
                <Link to="/mssp">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  <span className="hidden xl:inline">Back to MSSP</span>
                </Link>
              </Button>
            )}
            
            {/* Add Camera Button */}
            <Button 
              onClick={() => setShowCameraWizard(true)}
              size="sm"
              className="bg-gradient-primary hover:bg-gradient-primary/90 text-white shadow-glow hidden sm:flex"
            >
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Add Camera</span>
            </Button>

            {/* Tenant Switcher (Desktop) */}
            {profile && (
              <TenantSwitcher className="hidden lg:flex min-w-[180px] xl:min-w-[200px]" />
            )}

            {/* System Status (Desktop) */}
            <div className="hidden xl:flex items-center space-x-2">
              <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
              <span className="text-sm text-muted-foreground">System Online</span>
            </div>

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-sm">{getUserInitials()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64 bg-popover" align="end" forceMount>
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

      {/* Mobile Navigation */}
      <MobileNav open={showMobileNav} onOpenChange={setShowMobileNav} />

      {/* Camera Wizard */}
      <CameraWizard 
        open={showCameraWizard} 
        onClose={() => setShowCameraWizard(false)}
        onComplete={() => {
          setShowCameraWizard(false);
        }}
      />
    </>
  );
};