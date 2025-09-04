import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Building2, 
  ChevronDown, 
  Settings, 
  Users, 
  Plus,
  Crown,
  Shield
} from 'lucide-react';

interface Tenant {
  id: string;
  name: string;
  address?: string;
  org_id: string;
  parent_tenant_id?: string;
}

interface TenantSwitcherProps {
  className?: string;
}

export const TenantSwitcher = ({ className }: TenantSwitcherProps) => {
  const { profile, isAdmin } = useAuth();
  const { toast } = useToast();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [showMSSPMode, setShowMSSPMode] = useState(false);
  const [loading, setLoading] = useState(false);

  // Check if user is root admin (can see MSSP mode)
  const isRootAdmin = profile?.role === 'root_admin';

  useEffect(() => {
    if (profile) {
      fetchTenants();
      fetchCurrentTenant();
    }
  }, [profile]);

  const fetchTenants = async () => {
    if (!profile) return;

    try {
      let query = supabase.from('vy_tenant').select('*');
      
      if (isRootAdmin) {
        // Root admin can see all tenants in their org
        query = query.eq('org_id', profile.org_id);
      } else if (profile.role === 'tenant_admin') {
        // Tenant admin can see their tenant and sub-tenants
        query = query.or(`id.eq.${profile.tenant_id},parent_tenant_id.eq.${profile.tenant_id}`);
      } else {
        // Other roles can only see their own tenant
        query = query.eq('id', profile.tenant_id);
      }

      const { data, error } = await query.order('name');
      
      if (error) throw error;
      setTenants(data || []);
    } catch (error: any) {
      console.error('Error fetching tenants:', error);
      toast({
        title: "Error",
        description: "Failed to load tenants",
        variant: "destructive",
      });
    }
  };

  const fetchCurrentTenant = async () => {
    if (!profile?.tenant_id) return;

    try {
      const { data, error } = await supabase
        .from('vy_tenant')
        .select('*')
        .eq('id', profile.tenant_id)
        .single();

      if (error) throw error;
      setCurrentTenant(data);
    } catch (error: any) {
      console.error('Error fetching current tenant:', error);
    }
  };

  const switchTenant = async (tenantId: string) => {
    setLoading(true);
    try {
      // In a real implementation, this would update the user's session
      // For now, we'll show a toast indicating the switch
      const tenant = tenants.find(t => t.id === tenantId);
      
      toast({
        title: "Tenant Switch",
        description: `Switched to ${tenant?.name}. In production, this would update your session context.`,
      });
      
      setCurrentTenant(tenant || null);
    } catch (error: any) {
      toast({
        title: "Switch Failed",
        description: "Failed to switch tenant context",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!profile || tenants.length <= 1) return null;

  return (
    <>
      <div className={className}>
        {/* Tenant Switcher Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <div className="flex items-center space-x-2">
                <Building2 className="h-4 w-4" />
                <span className="truncate">
                  {currentTenant?.name || 'Select Tenant'}
                </span>
                {isRootAdmin && (
                  <Crown className="h-3 w-3 text-warning" />
                )}
              </div>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64">
            {tenants.map((tenant) => (
              <DropdownMenuItem
                key={tenant.id}
                onClick={() => switchTenant(tenant.id)}
                className="flex items-center justify-between"
              >
                <div className="flex items-center space-x-2">
                  <Building2 className="h-4 w-4" />
                  <span>{tenant.name}</span>
                </div>
                {tenant.id === currentTenant?.id && (
                  <Badge variant="secondary" className="text-xs">Current</Badge>
                )}
              </DropdownMenuItem>
            ))}
            
            {isRootAdmin && (
              <>
                <DropdownMenuItem onClick={() => setShowMSSPMode(true)}>
                  <Shield className="mr-2 h-4 w-4" />
                  <span>MSSP Console</span>
                  <Badge variant="outline" className="ml-auto text-xs">Admin</Badge>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* MSSP Management Dialog */}
      <Dialog open={showMSSPMode} onOpenChange={setShowMSSPMode}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Managed Services Provider Console</span>
            </DialogTitle>
            <DialogDescription>
              Manage multiple tenants and organizations from a centralized dashboard
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Organization Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Organization Overview</CardTitle>
                <CardDescription>
                  High-level metrics across all managed tenants
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-primary">{tenants.length}</div>
                    <div className="text-sm text-muted-foreground">Total Tenants</div>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-success">85%</div>
                    <div className="text-sm text-muted-foreground">System Health</div>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-warning">12</div>
                    <div className="text-sm text-muted-foreground">Active Alerts</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tenant Management */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Tenant Management</CardTitle>
                  <CardDescription>
                    Create, configure, and monitor tenant accounts
                  </CardDescription>
                </div>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Tenant
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {tenants.map((tenant) => (
                    <div
                      key={tenant.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    >
                      <div className="flex items-center space-x-3">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{tenant.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {tenant.address || 'No address specified'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs">
                          Active
                        </Badge>
                        <Button variant="ghost" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Users className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Feature Matrix */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">MSSP Features</CardTitle>
                <CardDescription>
                  Available multi-tenant management capabilities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Tenant Management</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Create and configure tenants</li>
                      <li>• Hierarchical sub-tenant support</li>
                      <li>• Role-based access control</li>
                      <li>• Cross-tenant reporting</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Operations</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Centralized monitoring</li>
                      <li>• Bulk configuration management</li>
                      <li>• Usage analytics</li>
                      <li>• Automated alerting</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
