import React, { useState } from 'react';
import { Header } from '@/components/Header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, TrendingUp, TrendingDown, Calendar, Download, Filter, Eye, AlertTriangle, Users, Car, Package } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useToast } from '@/hooks/use-toast';

const mockDetectionData = [
  { name: 'Jan', vandalism: 4, loitering: 12, total: 16 },
  { name: 'Feb', vandalism: 8, loitering: 15, total: 23 },
  { name: 'Mar', vandalism: 6, loitering: 18, total: 24 },
  { name: 'Apr', vandalism: 12, loitering: 22, total: 34 },
  { name: 'May', vandalism: 9, loitering: 19, total: 28 },
  { name: 'Jun', vandalism: 15, loitering: 25, total: 40 },
];

const mockHourlyData = [
  { hour: '00:00', incidents: 2 },
  { hour: '02:00', incidents: 1 },
  { hour: '04:00', incidents: 0 },
  { hour: '06:00', incidents: 3 },
  { hour: '08:00', incidents: 8 },
  { hour: '10:00', incidents: 12 },
  { hour: '12:00', incidents: 15 },
  { hour: '14:00', incidents: 18 },
  { hour: '16:00', incidents: 22 },
  { hour: '18:00', incidents: 25 },
  { hour: '20:00', incidents: 19 },
  { hour: '22:00', incidents: 8 },
];

const pieData = [
  { name: 'Loitering', value: 45, color: '#8B5CF6' },
  { name: 'Vandalism', value: 25, color: '#F59E0B' },
  { name: 'Unauthorized Access', value: 20, color: '#EF4444' },
  { name: 'Vehicle Detection', value: 10, color: '#10B981' },
];

const Analytics = () => {
  const [timeRange, setTimeRange] = useState('last30days');
  const { data, loading, exportData } = useAnalytics(timeRange);
  const { toast } = useToast();

  const handleExport = async () => {
    try {
      await exportData('csv');
      toast({
        title: "Export Complete",
        description: "Analytics data has been exported successfully.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export analytics data.",
        variant: "destructive",
      });
    }
  };

  const handleFilter = () => {
    toast({
      title: "Filter Options",
      description: "Advanced filtering options will be available soon.",
    });
  };

  if (loading) return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    </div>
  );

  const totalIncidents = data?.totalStats.totalIncidents || 0;
  const vandalismTotal = data?.totalStats.vandalismTotal || 0;
  const loiteringTotal = data?.totalStats.loiteringTotal || 0;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Analytics Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">
              Comprehensive security intelligence and trend analysis
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last7days">Last 7 days</SelectItem>
                <SelectItem value="last30days">Last 30 days</SelectItem>
                <SelectItem value="last90days">Last 90 days</SelectItem>
                <SelectItem value="last1year">Last 1 year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleFilter}>
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Incidents</p>
                <p className="text-3xl font-bold">{totalIncidents}</p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="w-4 h-4 text-success mr-1" />
                  <span className="text-sm text-success">+12%</span>
                </div>
              </div>
              <AlertTriangle className="w-8 h-8 text-warning" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Vandalism Cases</p>
                <p className="text-3xl font-bold">{vandalismTotal}</p>
                <div className="flex items-center mt-2">
                  <TrendingDown className="w-4 h-4 text-success mr-1" />
                  <span className="text-sm text-success">-8%</span>
                </div>
              </div>
              <Package className="w-8 h-8 text-destructive" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Loitering Events</p>
                <p className="text-3xl font-bold">{loiteringTotal}</p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="w-4 h-4 text-warning mr-1" />
                  <span className="text-sm text-warning">+5%</span>
                </div>
              </div>
              <Users className="w-8 h-8 text-primary" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Response Time</p>
                <p className="text-3xl font-bold">2.4m</p>
                <div className="flex items-center mt-2">
                  <TrendingDown className="w-4 h-4 text-success mr-1" />
                  <span className="text-sm text-success">-15%</span>
                </div>
              </div>
              <Eye className="w-8 h-8 text-success" />
            </div>
          </Card>
        </div>

        <Tabs defaultValue="trends" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="incidents">Incident Types</TabsTrigger>
            <TabsTrigger value="heatmap">Time Analysis</TabsTrigger>
            <TabsTrigger value="locations">Locations</TabsTrigger>
          </TabsList>

          <TabsContent value="trends" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Detection Trends</h3>
                  <Badge variant="secondary">Monthly</Badge>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data?.detectionTrends || []}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="vandalism" stroke="#F59E0B" strokeWidth={3} />
                    <Line type="monotone" dataKey="loitering" stroke="#8B5CF6" strokeWidth={3} />
                    <Line type="monotone" dataKey="total" stroke="#10B981" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Area Analysis</h3>
                  <Badge variant="secondary">Cumulative</Badge>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={data?.detectionTrends || []}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="loitering" stackId="1" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.6} />
                    <Area type="monotone" dataKey="vandalism" stackId="1" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.6} />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="incidents" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Incident Distribution</h3>
                  <Badge variant="secondary">Current Period</Badge>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data?.incidentDistribution || []}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {(data?.incidentDistribution || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Monthly Comparison</h3>
                  <Badge variant="secondary">Bar Chart</Badge>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data?.detectionTrends || []}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="vandalism" fill="#F59E0B" />
                    <Bar dataKey="loitering" fill="#8B5CF6" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="heatmap" className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">24-Hour Activity Pattern</h3>
                <Badge variant="secondary">Hourly Breakdown</Badge>
              </div>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={data?.hourlyActivity || []}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="incidents" stroke="#10B981" fill="#10B981" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          </TabsContent>

          <TabsContent value="locations" className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Location Hotspots</h3>
                <Badge variant="secondary">Risk Analysis</Badge>
              </div>
              <div className="space-y-4">
                {(data?.locationHotspots || []).map((location) => (
                  <div key={location.name} className="flex items-center justify-between p-4 bg-surface rounded-lg">
                    <div>
                      <p className="font-medium">{location.name}</p>
                      <p className="text-sm text-muted-foreground">{location.incidents} incidents</p>
                    </div>
                    <Badge variant={location.risk === 'High' ? 'destructive' : location.risk === 'Medium' ? 'secondary' : 'outline'}>
                      {location.risk} Risk
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Analytics;