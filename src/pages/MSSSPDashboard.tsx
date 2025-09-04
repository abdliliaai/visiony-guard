import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { ClientOnboardingWizard } from '@/components/tenant/ClientOnboardingWizard';
import { TenantSwitcher } from '@/components/tenant/TenantSwitcher';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Users, 
  Camera, 
  Shield, 
  Plus, 
  Settings, 
  Eye,
  UserPlus,
  Cog,
  ArrowLeft,
  Activity
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ColumnDef } from '@tanstack/react-table';

interface ClientTenant {
  id: string;
  name: string;
  address?: string;
  created_at: string;
  org_id: string;
  parent_tenant_id?: string;
  userCount?: number;
  cameraCount?: number;
  lastActivity?: string;
  status: 'active' | 'inactive' | 'setup';
}

const MSSSPDashboard = () => {
  const { profile, isRootAdmin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<ClientTenant[]>([]);
  const [showOnboardingWizard, setShowOnboardingWizard] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<string | null>(null);

  const columns: ColumnDef<ClientTenant>[] = [
    {
      accessorKey: 'name',
      header: 'Client Name',
      cell: ({ row }) => {
        const client = row.original;
        return (
          <div>
            <div className="font-medium">{client.name}</div>
            <div className="text-sm text-muted-foreground">{client.address}</div>
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as string;
        const variant = status === 'active' ? 'default' : status === 'setup' ? 'secondary' : 'outline';
        return <Badge variant={variant}>{status}</Badge>;
      },
    },
    {
      accessorKey: 'userCount',
      header: 'Users',
      cell: ({ row }) => row.getValue('userCount') || 0,
    },
    {
      accessorKey: 'cameraCount',
      header: 'Cameras',
      cell: ({ row }) => row.getValue('cameraCount') || 0,
    },
    {
      accessorKey: 'created_at',
      header: 'Created',
      cell: ({ row }) => {
        const date = new Date(row.getValue('created_at'));
        return date.toLocaleDateString();
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const client = row.original;
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleViewDashboard(client.id)}
            >
              <Eye className="w-4 h-4 mr-1" />
              View
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleManageUsers(client.id)}
            >
              <Users className="w-4 h-4 mr-1" />
              Users
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleManageCameras(client.id)}
            >
              <Camera className="w-4 h-4 mr-1" />
              Cameras
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleSettings(client.id)}
            >
              <Settings className="w-4 h-4 mr-1" />
              Settings
            </Button>
          </div>
        );
      },
    },
  ];

  useEffect(() => {
    if (isRootAdmin) {
      fetchClients();
    }
  }, [isRootAdmin]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      
      // Fetch tenants in the same org
      const { data: tenants, error } = await supabase
        .from('vy_tenant')
        .select('*')
        .eq('org_id', profile?.org_id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // For each tenant, get user and device counts
      const clientsWithCounts = await Promise.all(
        (tenants || []).map(async (tenant) => {
          // Get user count
          const { count: userCount } = await supabase
            .from('vy_user_profile')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenant.id);

          // Get camera count
          const { count: cameraCount } = await supabase
            .from('vy_device')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenant.id);

          return {
            ...tenant,
            userCount: userCount || 0,
            cameraCount: cameraCount || 0,
            status: (cameraCount || 0) > 0 ? 'active' : 'setup',
          } as ClientTenant;
        })
      );

      setClients(clientsWithCounts);
    } catch (error: any) {
      console.error('Error fetching clients:', error);
      toast({
        title: "Error",
        description: "Failed to load client tenants.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewDashboard = (tenantId: string) => {
    setSelectedTenant(tenantId);
    // Navigate to dashboard with tenant context using React Router
    navigate(`/?tenant=${tenantId}`);
  };

  const handleManageUsers = (tenantId: string) => {
    toast({
      title: "User Management",
      description: "User management for this tenant will be implemented.",
    });
  };

  const handleManageCameras = (tenantId: string) => {
    // Navigate to camera management for this tenant using React Router
    navigate(`/cameras?tenant=${tenantId}`);
  };

  const handleSettings = (tenantId: string) => {
    toast({
      title: "Tenant Settings",
      description: "Tenant-specific settings will be implemented.",
    });
  };

  const handleOnboardingComplete = () => {
    setShowOnboardingWizard(false);
    fetchClients(); // Refresh the client list
  };

  if (!isRootAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container px-6 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
            <p className="text-muted-foreground">
              You need root admin privileges to access the MSSP Dashboard.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                MSSP Dashboard
              </h1>
              <p className="text-muted-foreground mt-2">
                Manage multiple client tenants and their security systems
              </p>
            </div>
          </div>
          <Button 
            onClick={() => setShowOnboardingWizard(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Onboard Client
          </Button>
        </div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <Building2 className="w-8 h-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{clients.length}</p>
                <p className="text-sm text-muted-foreground">Total Clients</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">
                  {clients.reduce((acc, client) => acc + (client.userCount || 0), 0)}
                </p>
                <p className="text-sm text-muted-foreground">Total Users</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <Camera className="w-8 h-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">
                  {clients.reduce((acc, client) => acc + (client.cameraCount || 0), 0)}
                </p>
                <p className="text-sm text-muted-foreground">Total Cameras</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">
                  {clients.filter(c => c.status === 'active').length}
                </p>
                <p className="text-sm text-muted-foreground">Active Clients</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Client List */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <Building2 className="w-5 h-5" />
            <h2 className="text-xl font-semibold">Client Tenants</h2>
          </div>
          
          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading clients...</p>
            </div>
          ) : clients.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No clients yet</h3>
              <p className="text-muted-foreground mb-4">
                Start by onboarding your first client tenant
              </p>
              <Button onClick={() => setShowOnboardingWizard(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Onboard First Client
              </Button>
            </div>
          ) : (
            <DataTable columns={columns} data={clients} />
          )}
        </Card>
      </main>

      {/* Client Onboarding Wizard */}
      {showOnboardingWizard && (
        <ClientOnboardingWizard
          open={showOnboardingWizard}
          onClose={() => setShowOnboardingWizard(false)}
          onComplete={handleOnboardingComplete}
        />
      )}
    </div>
  );
};

export default MSSSPDashboard;