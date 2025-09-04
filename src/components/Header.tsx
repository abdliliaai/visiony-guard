import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Shield, User, Settings, LogOut, Building2, Plus, Camera } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { CameraWizard } from '@/components/camera/CameraWizard';

export const Header: React.FC = () => {
  const { user, profile, signOut, isAdmin } = useAuth();
  const [showCameraWizard, setShowCameraWizard] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="container flex h-16 items-center justify-between px-6">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-gradient-primary rounded-lg">
              <Shield className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">Vision-Y</h1>
              <p className="text-xs text-muted-foreground -mt-1">Security Intelligence</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Button onClick={() => setShowCameraWizard(true)} className="bg-gradient-primary hover:bg-gradient-primary/90 text-white">
              <Plus className="mr-2 h-4 w-4" />
              Add Camera
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>{user?.email?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64" align="end">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{profile?.first_name || user?.email}</p>
                    {isAdmin && <Badge variant="secondary" className="text-xs">Admin</Badge>}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {isAdmin && (
                  <>
                    <DropdownMenuItem><Building2 className="mr-2 h-4 w-4" />Tenant Management</DropdownMenuItem>
                    <DropdownMenuItem><Camera className="mr-2 h-4 w-4" />Device Management</DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem><User className="mr-2 h-4 w-4" />Profile</DropdownMenuItem>
                <DropdownMenuItem><Settings className="mr-2 h-4 w-4" />Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <CameraWizard open={showCameraWizard} onOpenChange={setShowCameraWizard} />
    </>
  );
};