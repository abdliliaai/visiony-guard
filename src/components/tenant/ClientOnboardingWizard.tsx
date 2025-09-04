import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Building2, 
  Mail, 
  User, 
  MapPin, 
  Check, 
  ChevronRight, 
  ChevronLeft,
  Users,
  Send
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface ClientOnboardingWizardProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

interface OnboardingData {
  // Step 1: Company Info
  companyName: string;
  companyDescription: string;
  address: string;
  
  // Step 2: Admin User
  adminEmail: string;
  adminFirstName: string;
  adminLastName: string;
  
  // Step 3: Tenant Hierarchy (optional)
  parentTenantId?: string;
  isSubTenant: boolean;
}

const STEPS = [
  { id: 1, title: 'Company Information', icon: Building2 },
  { id: 2, title: 'Admin User', icon: User },
  { id: 3, title: 'Configuration', icon: MapPin },
  { id: 4, title: 'Review & Send', icon: Send },
];

export const ClientOnboardingWizard: React.FC<ClientOnboardingWizardProps> = ({
  open,
  onClose,
  onComplete,
}) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    companyName: '',
    companyDescription: '',
    address: '',
    adminEmail: '',
    adminFirstName: '',
    adminLastName: '',
    isSubTenant: false,
  });

  const progress = (currentStep / STEPS.length) * 100;

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Call the edge function to create tenant and send invite
      const { data: result, error } = await supabase.functions.invoke('create-tenant', {
        body: {
          tenantData: {
            name: data.companyName,
            description: data.companyDescription,
            address: data.address,
            org_id: profile?.org_id,
            parent_tenant_id: data.parentTenantId || null,
          },
          adminUser: {
            email: data.adminEmail,
            first_name: data.adminFirstName,
            last_name: data.adminLastName,
          },
        },
      });

      if (error) throw error;

      toast({
        title: "Client Onboarded Successfully",
        description: `${data.companyName} has been created and invitation sent to ${data.adminEmail}`,
      });

      onComplete();
    } catch (error: any) {
      console.error('Error onboarding client:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to onboard client.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return data.companyName.trim() && data.address.trim();
      case 2:
        return data.adminEmail.trim() && data.adminFirstName.trim() && data.adminLastName.trim();
      case 3:
        return true; // Configuration step is optional
      case 4:
        return true; // Review step
      default:
        return false;
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Building2 className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold">Company Information</h3>
              <p className="text-muted-foreground">Tell us about your new client</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="companyName">Company Name *</Label>
                <Input
                  id="companyName"
                  value={data.companyName}
                  onChange={(e) => setData({ ...data, companyName: e.target.value })}
                  placeholder="e.g. Acme Corporation"
                />
              </div>
              
              <div>
                <Label htmlFor="companyDescription">Description</Label>
                <Textarea
                  id="companyDescription"
                  value={data.companyDescription}
                  onChange={(e) => setData({ ...data, companyDescription: e.target.value })}
                  placeholder="Brief description of the client business"
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="address">Address *</Label>
                <Textarea
                  id="address"
                  value={data.address}
                  onChange={(e) => setData({ ...data, address: e.target.value })}
                  placeholder="Full business address"
                  rows={2}
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <User className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold">Admin User</h3>
              <p className="text-muted-foreground">Set up the primary admin for this client</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="adminEmail">Email Address *</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  value={data.adminEmail}
                  onChange={(e) => setData({ ...data, adminEmail: e.target.value })}
                  placeholder="admin@client.com"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="adminFirstName">First Name *</Label>
                  <Input
                    id="adminFirstName"
                    value={data.adminFirstName}
                    onChange={(e) => setData({ ...data, adminFirstName: e.target.value })}
                    placeholder="John"
                  />
                </div>
                
                <div>
                  <Label htmlFor="adminLastName">Last Name *</Label>
                  <Input
                    id="adminLastName"
                    value={data.adminLastName}
                    onChange={(e) => setData({ ...data, adminLastName: e.target.value })}
                    placeholder="Doe"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <MapPin className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold">Configuration</h3>
              <p className="text-muted-foreground">Optional tenant configuration</p>
            </div>
            
            <div className="space-y-4">
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">Sub-Tenant</Label>
                    <p className="text-sm text-muted-foreground">
                      Create this as a sub-tenant under an existing client
                    </p>
                  </div>
                  <Badge variant={data.isSubTenant ? "default" : "outline"}>
                    {data.isSubTenant ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
              </Card>
              
              <div className="text-center text-muted-foreground">
                <p>Additional configuration options can be set up later</p>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Send className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold">Review & Send Invitation</h3>
              <p className="text-muted-foreground">Review the details and send the invitation</p>
            </div>
            
            <div className="space-y-4">
              <Card className="p-4">
                <h4 className="font-medium mb-3">Company Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name:</span>
                    <span>{data.companyName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Address:</span>
                    <span className="text-right max-w-48">{data.address}</span>
                  </div>
                  {data.companyDescription && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Description:</span>
                      <span className="text-right max-w-48">{data.companyDescription}</span>
                    </div>
                  )}
                </div>
              </Card>
              
              <Card className="p-4">
                <h4 className="font-medium mb-3">Admin User</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name:</span>
                    <span>{data.adminFirstName} {data.adminLastName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email:</span>
                    <span>{data.adminEmail}</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Onboard New Client</DialogTitle>
          <DialogDescription>
            Set up a new client tenant with their admin user
          </DialogDescription>
        </DialogHeader>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Step {currentStep} of {STEPS.length}</span>
            <span className="text-sm text-muted-foreground">{Math.round(progress)}% complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step Indicators */}
        <div className="flex items-center justify-between mb-8">
          {STEPS.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            
            return (
              <div key={step.id} className="flex flex-col items-center">
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center mb-2
                    ${isCompleted ? 'bg-primary text-primary-foreground' : ''}
                    ${isActive ? 'bg-primary text-primary-foreground' : ''}
                    ${!isActive && !isCompleted ? 'bg-muted text-muted-foreground' : ''}
                  `}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <StepIcon className="w-5 h-5" />
                  )}
                </div>
                <span className="text-xs text-center max-w-16">{step.title}</span>
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        <div className="mb-8">
          {renderStepContent()}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            
            {currentStep === STEPS.length ? (
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? 'Creating...' : 'Create Client & Send Invite'}
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={!isStepValid()}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};