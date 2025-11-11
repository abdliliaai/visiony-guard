import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Users, Shield } from 'lucide-react';

interface UserProfile {
  user_id: string;
  first_name: string;
  last_name: string;
  role: 'root_admin' | 'tenant_admin' | 'viewer' | 'manager' | 'analyst';
  tenant_id: string;
  org_id: string;
  managed_services_mode: boolean;
  created_at: string;
  updated_at: string;
}

const UserManagement = () => {
  const { profile, isRootAdmin, isManagedServicesMode } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'viewer' as const,
    tenantId: '',
  });

  // Fetch users based on permissions
  const { data: users, isLoading } = useQuery({
    queryKey: ['users', profile?.tenant_id, profile?.org_id],
    queryFn: async () => {
      let query = supabase.from('vy_user_profile').select('*');
      
      if (isRootAdmin && isManagedServicesMode) {
        // Root admin can see all users in their org
        query = query.eq('org_id', profile?.org_id);
      } else {
        // Regular users can only see users in their tenant
        query = query.eq('tenant_id', profile?.tenant_id);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as UserProfile[];
    },
    enabled: !!profile,
  });

  // Fetch tenants for dropdown (if root admin)
  const { data: tenants } = useQuery({
    queryKey: ['tenants', profile?.org_id],
    queryFn: async () => {
      if (!isRootAdmin || !isManagedServicesMode) return [];
      
      const { data, error } = await supabase
        .from('vy_tenant')
        .select('*')
        .eq('org_id', profile?.org_id)
        .order('name');
      
      if (error) throw error;
      return data;
    },
    enabled: isRootAdmin && isManagedServicesMode && !!profile,
  });

  const createUserMutation = useMutation({
    mutationFn: async (userData: typeof formData) => {
      const { data, error } = await supabase.functions.invoke('auth-signup', {
        body: {
          email: userData.email,
          password: 'TempPassword123!', // User will need to reset
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role,
          tenantId: userData.tenantId || profile?.tenant_id,
          orgId: profile?.org_id,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User created successfully');
      setIsDialogOpen(false);
      setFormData({ email: '', firstName: '', lastName: '', role: 'viewer', tenantId: '' });
    },
    onError: (error: any) => {
      const errorMessage = error.message || 'Failed to create user';
      
      if (errorMessage.includes('already been registered')) {
        toast.error('This email is already registered. Please use a different email address or delete the existing user first from Supabase Auth.');
      } else {
        toast.error(`Failed to create user: ${errorMessage}`);
      }
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: Partial<UserProfile> }) => {
      const { data, error } = await supabase
        .from('vy_user_profile')
        .update(updates)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User updated successfully');
      setEditingUser(null);
    },
    onError: (error) => {
      toast.error(`Failed to update user: ${error.message}`);
    },
  });

  const handleCreateUser = () => {
    createUserMutation.mutate(formData);
  };

  const handleUpdateUser = (updates: Partial<UserProfile>) => {
    if (editingUser) {
      updateUserMutation.mutate({ userId: editingUser.user_id, updates });
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'root_admin':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'tenant_admin':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      case 'manager':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'analyst':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <Header />
      
      <div className="container mx-auto px-4 py-8 pt-24">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Users className="h-8 w-8" />
              User Management
            </h1>
            <p className="text-muted-foreground">Manage user accounts and permissions</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
                <DialogDescription>
                  Add a new user to the system. They will receive login instructions via email.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="col-span-3"
                    placeholder="user@example.com"
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="firstName" className="text-right">
                    First Name
                  </Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="lastName" className="text-right">
                    Last Name
                  </Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="role" className="text-right">
                    Role
                  </Label>
                  <Select value={formData.role} onValueChange={(value: any) => setFormData({ ...formData, role: value })}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">Viewer</SelectItem>
                      <SelectItem value="analyst">Analyst</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="tenant_admin">Tenant Admin</SelectItem>
                      {isRootAdmin && <SelectItem value="root_admin">Root Admin</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>

                {isRootAdmin && isManagedServicesMode && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="tenant" className="text-right">
                      Tenant
                    </Label>
                    <Select value={formData.tenantId} onValueChange={(value) => setFormData({ ...formData, tenantId: value })}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select tenant" />
                      </SelectTrigger>
                      <SelectContent>
                        {tenants?.map((tenant) => (
                          <SelectItem key={tenant.id} value={tenant.id}>
                            {tenant.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              
              <DialogFooter>
                <Button
                  onClick={handleCreateUser}
                  disabled={createUserMutation.isPending || !formData.email || !formData.firstName}
                >
                  {createUserMutation.isPending ? 'Creating...' : 'Create User'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-6">
          {isLoading ? (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Users ({users?.length || 0})
                </CardTitle>
                <CardDescription>
                  Manage user accounts, roles, and permissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {users?.map((user) => (
                    <div key={user.user_id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div>
                          <h3 className="font-semibold">
                            {user.first_name} {user.last_name}
                          </h3>
                          <p className="text-sm text-muted-foreground">ID: {user.user_id}</p>
                        </div>
                        <Badge className={getRoleColor(user.role)}>
                          {user.role.replace('_', ' ')}
                        </Badge>
                        {user.managed_services_mode && (
                          <Badge variant="outline">MSSP</Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={() => setEditingUser(user)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit User</DialogTitle>
                              <DialogDescription>
                                Update user role and permissions
                              </DialogDescription>
                            </DialogHeader>
                            
                            <div className="grid gap-4 py-4">
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Role</Label>
                                <Select
                                  value={editingUser?.role}
                                  onValueChange={(value: any) => 
                                    setEditingUser(prev => prev ? { ...prev, role: value } : null)
                                  }
                                >
                                  <SelectTrigger className="col-span-3">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="viewer">Viewer</SelectItem>
                                    <SelectItem value="analyst">Analyst</SelectItem>
                                    <SelectItem value="manager">Manager</SelectItem>
                                    <SelectItem value="tenant_admin">Tenant Admin</SelectItem>
                                    {isRootAdmin && <SelectItem value="root_admin">Root Admin</SelectItem>}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            
                            <DialogFooter>
                              <Button
                                onClick={() => handleUpdateUser({ role: editingUser?.role })}
                                disabled={updateUserMutation.isPending}
                              >
                                {updateUserMutation.isPending ? 'Updating...' : 'Update User'}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  ))}
                  
                  {users?.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No users found. Create your first user to get started.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserManagement;