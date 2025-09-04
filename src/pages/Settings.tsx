import React, { useState } from 'react';
import { Header } from '@/components/Header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Bell, 
  Shield, 
  Camera, 
  Database, 
  Smartphone, 
  Mail, 
  Key, 
  Globe, 
  Save,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

const Settings = () => {
  const { profile, isAdmin } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Profile settings
  const [profileData, setProfileData] = useState({
    firstName: profile?.first_name || '',
    lastName: profile?.last_name || '',
    phone: profile?.phone || '',
    preferences: profile?.preferences || {}
  });

  // Notification settings
  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    smsAlerts: false,
    pushNotifications: true,
    weeklyReports: true,
    systemUpdates: true,
    criticalOnly: false
  });

  // Security settings
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorAuth: false,
    sessionTimeout: '24',
    passwordExpiry: '90',
    loginNotifications: true
  });

  // Detection settings
  const [detectionSettings, setDetectionSettings] = useState({
    vandalismSensitivity: 'medium',
    loiteringSensitivity: 'high',
    minimumConfidence: '75',
    recordingDuration: '30',
    autoArchive: true,
    realTimeAlerts: true
  });

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Profile Updated",
        description: "Your profile settings have been saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile settings.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotifications = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Notifications Updated",
        description: "Your notification preferences have been saved.",
      });
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to update notification settings.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Settings
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage your account, security, and system preferences
            </p>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-success" />
            <span className="text-sm text-muted-foreground">All changes saved</span>
          </div>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="detection">Detection</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
            <TabsTrigger value="mobile">Mobile</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <User className="w-5 h-5" />
                <h2 className="text-xl font-semibold">Profile Information</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={profileData.firstName}
                    onChange={(e) => setProfileData({...profileData, firstName: e.target.value})}
                    placeholder="Enter your first name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={profileData.lastName}
                    onChange={(e) => setProfileData({...profileData, lastName: e.target.value})}
                    placeholder="Enter your last name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                    placeholder="Enter your phone number"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Input
                    id="role"
                    value={profile?.role || 'viewer'}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>
              
              <div className="flex justify-end mt-6">
                <Button onClick={handleSaveProfile} disabled={loading}>
                  <Save className="w-4 h-4 mr-2" />
                  {loading ? 'Saving...' : 'Save Profile'}
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <Bell className="w-5 h-5" />
                <h2 className="text-xl font-semibold">Notification Preferences</h2>
              </div>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">Email Alerts</Label>
                    <p className="text-sm text-muted-foreground">Receive security alerts via email</p>
                  </div>
                  <Switch
                    checked={notifications.emailAlerts}
                    onCheckedChange={(checked) => setNotifications({...notifications, emailAlerts: checked})}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">SMS Alerts</Label>
                    <p className="text-sm text-muted-foreground">Receive critical alerts via SMS</p>
                  </div>
                  <Switch
                    checked={notifications.smsAlerts}
                    onCheckedChange={(checked) => setNotifications({...notifications, smsAlerts: checked})}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive browser/mobile push notifications</p>
                  </div>
                  <Switch
                    checked={notifications.pushNotifications}
                    onCheckedChange={(checked) => setNotifications({...notifications, pushNotifications: checked})}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">Weekly Reports</Label>
                    <p className="text-sm text-muted-foreground">Receive weekly security summary reports</p>
                  </div>
                  <Switch
                    checked={notifications.weeklyReports}
                    onCheckedChange={(checked) => setNotifications({...notifications, weeklyReports: checked})}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">Critical Only Mode</Label>
                    <p className="text-sm text-muted-foreground">Only receive critical severity alerts</p>
                  </div>
                  <Switch
                    checked={notifications.criticalOnly}
                    onCheckedChange={(checked) => setNotifications({...notifications, criticalOnly: checked})}
                  />
                </div>
              </div>
              
              <div className="flex justify-end mt-6">
                <Button onClick={handleSaveNotifications} disabled={loading}>
                  <Save className="w-4 h-4 mr-2" />
                  {loading ? 'Saving...' : 'Save Notifications'}
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <Shield className="w-5 h-5" />
                <h2 className="text-xl font-semibold">Security Settings</h2>
              </div>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">Two-Factor Authentication</Label>
                    <p className="text-sm text-muted-foreground">Add an extra layer of security to your account</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Recommended</Badge>
                    <Switch
                      checked={securitySettings.twoFactorAuth}
                      onCheckedChange={(checked) => setSecuritySettings({...securitySettings, twoFactorAuth: checked})}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="sessionTimeout">Session Timeout (hours)</Label>
                  <Select value={securitySettings.sessionTimeout} onValueChange={(value) => setSecuritySettings({...securitySettings, sessionTimeout: value})}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 hour</SelectItem>
                      <SelectItem value="8">8 hours</SelectItem>
                      <SelectItem value="24">24 hours</SelectItem>
                      <SelectItem value="168">1 week</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">Login Notifications</Label>
                    <p className="text-sm text-muted-foreground">Get notified of new device logins</p>
                  </div>
                  <Switch
                    checked={securitySettings.loginNotifications}
                    onCheckedChange={(checked) => setSecuritySettings({...securitySettings, loginNotifications: checked})}
                  />
                </div>
              </div>
              
              <div className="flex justify-end mt-6">
                <Button>
                  <Save className="w-4 h-4 mr-2" />
                  Save Security Settings
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="detection" className="space-y-6">
            {isAdmin && (
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Camera className="w-5 h-5" />
                  <h2 className="text-xl font-semibold">Detection Settings</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="vandalismSensitivity">Vandalism Detection Sensitivity</Label>
                    <Select value={detectionSettings.vandalismSensitivity} onValueChange={(value) => setDetectionSettings({...detectionSettings, vandalismSensitivity: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low (Less alerts)</SelectItem>
                        <SelectItem value="medium">Medium (Balanced)</SelectItem>
                        <SelectItem value="high">High (More alerts)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="loiteringSensitivity">Loitering Detection Sensitivity</Label>
                    <Select value={detectionSettings.loiteringSensitivity} onValueChange={(value) => setDetectionSettings({...detectionSettings, loiteringSensitivity: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low (Less alerts)</SelectItem>
                        <SelectItem value="medium">Medium (Balanced)</SelectItem>
                        <SelectItem value="high">High (More alerts)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="minimumConfidence">Minimum Confidence (%)</Label>
                    <Input
                      id="minimumConfidence"
                      value={detectionSettings.minimumConfidence}
                      onChange={(e) => setDetectionSettings({...detectionSettings, minimumConfidence: e.target.value})}
                      placeholder="75"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="recordingDuration">Recording Duration (seconds)</Label>
                    <Input
                      id="recordingDuration"
                      value={detectionSettings.recordingDuration}
                      onChange={(e) => setDetectionSettings({...detectionSettings, recordingDuration: e.target.value})}
                      placeholder="30"
                    />
                  </div>
                </div>
                
                <div className="space-y-6 mt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">Auto Archive</Label>
                      <p className="text-sm text-muted-foreground">Automatically archive old recordings</p>
                    </div>
                    <Switch
                      checked={detectionSettings.autoArchive}
                      onCheckedChange={(checked) => setDetectionSettings({...detectionSettings, autoArchive: checked})}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">Real-time Alerts</Label>
                      <p className="text-sm text-muted-foreground">Send alerts immediately when events are detected</p>
                    </div>
                    <Switch
                      checked={detectionSettings.realTimeAlerts}
                      onCheckedChange={(checked) => setDetectionSettings({...detectionSettings, realTimeAlerts: checked})}
                    />
                  </div>
                </div>
                
                <div className="flex justify-end mt-6">
                  <Button>
                    <Save className="w-4 h-4 mr-2" />
                    Save Detection Settings
                  </Button>
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="system" className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <Database className="w-5 h-5" />
                <h2 className="text-xl font-semibold">System Information</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">System Version</Label>
                    <p className="text-base">Vision-Y v2.1.0</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Database Status</Label>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-success" />
                      <span className="text-base">Connected</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Last Backup</Label>
                    <p className="text-base">January 15, 2024 at 3:00 AM</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Storage Used</Label>
                    <p className="text-base">2.4 TB of 5 TB (48%)</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Active Cameras</Label>
                    <p className="text-base">12 of 15 online</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Uptime</Label>
                    <p className="text-base">99.8% (30 days)</p>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="mobile" className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <Smartphone className="w-5 h-5" />
                <h2 className="text-xl font-semibold">Mobile App Settings</h2>
              </div>
              
              <div className="space-y-6">
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <AlertTriangle className="w-5 h-5 text-warning" />
                    <Label className="text-base font-medium">Mobile App Status</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Vision-Y mobile app is not currently installed. Download it from your app store to receive push notifications and access mobile-specific features.
                  </p>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="outline">
                      Download for iOS
                    </Button>
                    <Button size="sm" variant="outline">
                      Download for Android
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Connected Devices</Label>
                      <p className="text-base">0 devices</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Push Token Status</Label>
                      <p className="text-base text-muted-foreground">Not configured</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Last Sync</Label>
                      <p className="text-base text-muted-foreground">Never</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">App Version</Label>
                      <p className="text-base text-muted-foreground">Not installed</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Settings;