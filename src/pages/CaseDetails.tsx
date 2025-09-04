import React, { useState } from 'react';
import { Header } from '@/components/Header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  User, 
  AlertTriangle, 
  CheckCircle2, 
  Eye, 
  Download,
  FileText,
  Clock,
  Video,
  Image as ImageIcon
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

const CaseDetails = () => {
  const { caseId, type } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('investigating');
  const [assignedTo, setAssignedTo] = useState('');

  // Mock case data - in real app, fetch from database
  const caseData = {
    id: caseId,
    type: type,
    timestamp: '2024-01-15 14:30:22',
    location: 'Main Entrance',
    confidence: 92,
    description: type === 'vandalism' ? 'Graffiti spraying detected on wall surface' : 'Individual remaining in restricted area for 15+ minutes',
    status: 'investigating',
    severity: 'medium',
    deviceName: 'Camera-01',
    assignedTo: 'Security Team Alpha',
    notes: 'Initial assessment completed. Further investigation required.',
    evidence: [
      { type: 'image', url: '/placeholder.svg', timestamp: '14:30:22' },
      { type: 'video', url: '/placeholder.mp4', timestamp: '14:30:00-14:32:00' },
    ]
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-destructive text-destructive-foreground';
      case 'high': return 'bg-destructive text-destructive-foreground';
      case 'medium': return 'bg-warning text-warning-foreground';
      case 'low': return 'bg-success text-success-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-destructive text-destructive-foreground';
      case 'investigating': return 'bg-warning text-warning-foreground';
      case 'reported': return 'bg-primary text-primary-foreground';
      case 'resolved': return 'bg-success text-success-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const handleSaveChanges = async () => {
    try {
      // In real app, save to database
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Case Updated",
        description: "Changes have been saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save changes.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadEvidence = (item: any) => {
    toast({
      title: "Download Started",
      description: `Downloading ${item.type} evidence...`,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container px-6 py-8">
        <div className="flex items-center gap-4 mb-8">
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
              Case Details
            </h1>
            <p className="text-muted-foreground mt-2">
              Case ID: {caseData.id} • {caseData.type?.charAt(0).toUpperCase() + caseData.type?.slice(1)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Case Overview */}
            <Card className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <Badge className={getSeverityColor(caseData.severity)}>
                      {caseData.severity.toUpperCase()}
                    </Badge>
                    <Badge className={getStatusColor(caseData.status)}>
                      {caseData.status.toUpperCase()}
                    </Badge>
                  </div>
                  <h2 className="text-xl font-semibold mb-2">{caseData.description}</h2>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {caseData.timestamp}
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {caseData.location}
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {caseData.confidence}% confidence
                    </div>
                  </div>
                </div>
              </div>

              {/* Evidence Section */}
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-4">Evidence</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {caseData.evidence.map((item, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {item.type === 'image' ? (
                            <ImageIcon className="w-4 h-4" />
                          ) : (
                            <Video className="w-4 h-4" />
                          )}
                          <span className="font-medium capitalize">{item.type}</span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownloadEvidence(item)}
                        >
                          <Download className="w-3 h-3 mr-1" />
                          Download
                        </Button>
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {item.timestamp}
                      </div>
                      <div className="mt-2 bg-muted rounded-lg aspect-video flex items-center justify-center">
                        <span className="text-muted-foreground text-sm">
                          {item.type === 'image' ? 'Image Preview' : 'Video Preview'}
                        </span>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </Card>

            {/* Notes Section */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Investigation Notes</h3>
              <Textarea
                placeholder="Add your investigation notes here..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[120px]"
              />
              <div className="flex justify-end mt-4">
                <Button onClick={handleSaveChanges}>
                  <FileText className="w-4 h-4 mr-2" />
                  Save Notes
                </Button>
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Case Management */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Case Management</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="investigating">Investigating</SelectItem>
                      <SelectItem value="reported">Reported</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assigned">Assigned To</Label>
                  <Select value={assignedTo} onValueChange={setAssignedTo}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select team member" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="security-alpha">Security Team Alpha</SelectItem>
                      <SelectItem value="security-beta">Security Team Beta</SelectItem>
                      <SelectItem value="maintenance">Maintenance Team</SelectItem>
                      <SelectItem value="management">Management</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button className="w-full" onClick={handleSaveChanges}>
                  Update Case
                </Button>
              </div>
            </Card>

            {/* Case Information */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Case Information</h3>
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Device</Label>
                  <p className="text-sm">{caseData.deviceName}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Detection Type</Label>
                  <p className="text-sm capitalize">{caseData.type}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Confidence</Label>
                  <p className="text-sm">{caseData.confidence}%</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Created</Label>
                  <p className="text-sm">{caseData.timestamp}</p>
                </div>
              </div>
            </Card>

            {/* Quick Actions */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Escalate Case
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <User className="w-4 h-4 mr-2" />
                  Notify Authorities
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="w-4 h-4 mr-2" />
                  Generate Report
                </Button>
                <Button variant="destructive" className="w-full justify-start">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Close Case
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CaseDetails;