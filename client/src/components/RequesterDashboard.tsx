import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BriefcaseIcon, UsersIcon, TrendingUpIcon, ClockIcon, FileTextIcon, BarChart3Icon } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import { StubNotification } from '@/components/StubNotification';
import type { User, Job, Application } from '../../../server/src/schema';

interface RequesterDashboardProps {
  requesterId: number;
  user: User;
}

interface DashboardData {
  totalJobPostings: number;
  pendingApprovals: number;
  activeJobPostings: number;
  totalApplicationsReceived: number;
  candidatesInPipeline: number;
  averageMatchScore: number;
  recentApplications: any[];
  weeklyMetrics: any;
}

export function RequesterDashboard({ requesterId, user }: RequesterDashboardProps) {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [dashData, requesterJobs, requesterReports] = await Promise.all([
        trpc.getRequesterDashboard.query({ requesterId }),
        trpc.getJobsByStatus.query({ created_by: requesterId }),
        trpc.getReportsByRequester.query({ requesterId })
      ]);
      
      setDashboardData(dashData);
      setJobs(requesterJobs);
      setReports(requesterReports);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [requesterId]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const generateWeeklyReport = async () => {
    try {
      const now = new Date();
      const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
      const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
      
      await trpc.generateWeeklyReport.mutate({
        requesterId,
        weekStart,
        weekEnd
      });
      
      // Reload reports
      const updatedReports = await trpc.getReportsByRequester.query({ requesterId });
      setReports(updatedReports);
    } catch (error) {
      console.error('Failed to generate report:', error);
    }
  };

  const getJobStatusColor = (status: string): string => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'pending_approval':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-blue-100 text-blue-800';
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getJobStatusIcon = (status: string): string => {
    switch (status) {
      case 'draft':
        return '📝';
      case 'pending_approval':
        return '⏳';
      case 'approved':
        return '✅';
      case 'published':
        return '📢';
      case 'closed':
        return '🔒';
      default:
        return '📄';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-green-500 to-blue-600 text-white p-6 rounded-lg">
        <h2 className="text-2xl font-bold mb-2">
          Welcome, {user.first_name}! 📋
        </h2>
        <p className="text-green-100">
          Monitor your recruitment pipeline and track hiring progress
        </p>
        <div className="mt-2 text-sm">
          <span className="font-semibold">Department:</span> {user.department || 'Not specified'}
        </div>
      </div>

      {/* Demo Notification */}
      <StubNotification feature="Job posting analytics and candidate pipeline data" />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Job Postings</CardTitle>
            <BriefcaseIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData?.totalJobPostings || 0}</div>
            <p className="text-xs text-muted-foreground">
              Total positions created
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <ClockIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {dashboardData?.pendingApprovals || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting admin review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Candidates in Pipeline</CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {dashboardData?.candidatesInPipeline || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Active applicants
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Match Score</CardTitle>
            <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {dashboardData?.averageMatchScore || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              AI candidate matching
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Views */}
      <Tabs defaultValue="jobs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="jobs">Job Postings</TabsTrigger>
          <TabsTrigger value="candidates">Candidate Pipeline</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="jobs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Job Posting Status</CardTitle>
              <CardDescription>
                Track the progress of your job postings through the approval workflow
              </CardDescription>
            </CardHeader>
            <CardContent>
              {jobs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <BriefcaseIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No job postings yet</p>
                  <p className="text-sm">Create your first job posting to get started</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {jobs.map((job: Job) => (
                    <div key={job.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <span className="text-2xl">{getJobStatusIcon(job.status)}</span>
                        <div className="flex-1">
                          <h3 className="font-medium">{job.title}</h3>
                          <p className="text-sm text-gray-600">
                            {job.department} • {job.employment_type}
                          </p>
                          <p className="text-sm text-gray-500">
                            Created: {job.created_at.toLocaleDateString()}
                          </p>
                          {job.salary_range && (
                            <p className="text-sm text-green-600 font-medium">
                              💰 {job.salary_range}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={getJobStatusColor(job.status)}>
                          {job.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                        {job.published_at && (
                          <p className="text-xs text-gray-500 mt-1">
                            Published: {job.published_at.toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="candidates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Candidate Pipeline</CardTitle>
              <CardDescription>
                Monitor candidates progressing through your recruitment process
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <UsersIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Candidate pipeline visualization coming soon</p>
                <p className="text-sm">This will show candidates by application status and AI match scores</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Weekly Reports</CardTitle>
                <CardDescription>
                  Generated recruitment analytics and metrics
                </CardDescription>
              </div>
              <Button onClick={generateWeeklyReport}>
                <BarChart3Icon className="h-4 w-4 mr-2" />
                Generate Report
              </Button>
            </CardHeader>
            <CardContent>
              {reports.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileTextIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No reports generated yet</p>
                  <p className="text-sm">Click "Generate Report" to create your first weekly report</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reports.map((report: any) => (
                    <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <FileTextIcon className="h-8 w-8 text-blue-500" />
                        <div>
                          <h3 className="font-medium">{report.report_type} Report</h3>
                          <p className="text-sm text-gray-600">
                            Week: {report.week_start.toLocaleDateString()} -{' '}
                            {report.week_end.toLocaleDateString()}
                          </p>
                          <p className="text-sm text-gray-500">
                            Generated: {report.generated_at.toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        📄 View Report
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}