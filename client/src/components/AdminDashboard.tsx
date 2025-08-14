import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  UsersIcon, 
  BriefcaseIcon, 
  FileIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  ClockIcon,
  TrendingUpIcon,
  BotIcon,
  CalendarIcon,
  PlusIcon
} from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { User, Job, Application, Interview } from '../../../server/src/schema';
import { CreateJobForm } from '@/components/CreateJobForm';
import { ApplicationReview } from '@/components/ApplicationReview';
import { StubNotification } from '@/components/StubNotification';

interface AdminDashboardProps {
  user: User;
}

interface DashboardData {
  totalUsers: number;
  totalJobs: number;
  totalApplications: number;
  pendingJobApprovals: number;
  aiProcessingQueue: number;
  systemMetrics: any;
  recentActivity: any[];
}

export function AdminDashboard({ user }: AdminDashboardProps) {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('overview');

  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [dashData, allJobs, allApplications, allInterviews, allUsers] = await Promise.all([
        trpc.getAdminDashboard.query(),
        trpc.getJobs.query(),
        trpc.getApplications.query(),
        trpc.getInterviews.query(),
        trpc.getUsers.query()
      ]);
      
      setDashboardData(dashData);
      setJobs(allJobs);
      setApplications(allApplications);
      setInterviews(allInterviews);
      setUsers(allUsers);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const approveJob = async (jobId: number) => {
    try {
      await trpc.updateJobStatus.mutate({
        job_id: jobId,
        status: 'approved',
        approved_by: user.id
      });
      // Reload jobs
      const updatedJobs = await trpc.getJobs.query();
      setJobs(updatedJobs);
    } catch (error) {
      console.error('Failed to approve job:', error);
    }
  };

  const rejectJob = async (jobId: number) => {
    try {
      await trpc.updateJobStatus.mutate({
        job_id: jobId,
        status: 'draft',
        approved_by: null
      });
      // Reload jobs
      const updatedJobs = await trpc.getJobs.query();
      setJobs(updatedJobs);
    } catch (error) {
      console.error('Failed to reject job:', error);
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

  const getApplicationStatusColor = (status: string): string => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'ai_processing':
        return 'bg-blue-100 text-blue-800';
      case 'shortlisted':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'interview_scheduled':
        return 'bg-purple-100 text-purple-800';
      case 'offer_made':
        return 'bg-emerald-100 text-emerald-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleColor = (role: string): string => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'requester':
        return 'bg-blue-100 text-blue-800';
      case 'candidate':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const pendingJobs = jobs.filter((job: Job) => job.status === 'pending_approval');
  const aiProcessingApps = applications.filter((app: Application) => app.status === 'ai_processing');

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
      <div className="bg-gradient-to-r from-red-500 to-purple-600 text-white p-6 rounded-lg">
        <h2 className="text-2xl font-bold mb-2">
          Admin Dashboard 👑
        </h2>
        <p className="text-red-100">
          Manage the entire talent acquisition system and oversee recruitment workflows
        </p>
        <div className="mt-2 text-sm">
          <span className="font-semibold">System Admin:</span> {user.first_name} {user.last_name}
        </div>
      </div>

      {/* Demo Notification */}
      <StubNotification feature="System analytics and AI processing data" />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Users</CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-muted-foreground">
              Total registered users
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Job Postings</CardTitle>
            <BriefcaseIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{jobs.length}</div>
            <p className="text-xs text-muted-foreground">
              All job postings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Applications</CardTitle>
            <FileIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{applications.length}</div>
            <p className="text-xs text-muted-foreground">
              Total applications
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <ClockIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingJobs.length}</div>
            <p className="text-xs text-muted-foreground">
              Need your review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Processing</CardTitle>
            <BotIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{aiProcessingApps.length}</div>
            <p className="text-xs text-muted-foreground">
              CVs being analyzed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Management Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="jobs">Job Management</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="interviews">Interviews</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Pending Approvals */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClockIcon className="h-5 w-5" />
                  Pending Job Approvals ({pendingJobs.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pendingJobs.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No pending approvals</p>
                ) : (
                  <div className="space-y-3">
                    {pendingJobs.slice(0, 3).map((job: Job) => (
                      <div key={job.id} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <h4 className="font-medium">{job.title}</h4>
                          <p className="text-sm text-gray-600">{job.department}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => approveJob(job.id)}>
                            <CheckCircleIcon className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => rejectJob(job.id)}>
                            <XCircleIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* AI Processing Queue */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BotIcon className="h-5 w-5" />
                  AI Processing Queue ({aiProcessingApps.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {aiProcessingApps.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No CVs in processing queue</p>
                ) : (
                  <div className="space-y-3">
                    {aiProcessingApps.slice(0, 3).map((app: Application) => (
                      <div key={app.id} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <h4 className="font-medium">Application #{app.id}</h4>
                          <p className="text-sm text-gray-600">Job ID: {app.job_id}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          <span className="text-sm text-blue-600">Processing...</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="jobs" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Job Management</CardTitle>
                <CardDescription>Manage job postings and approval workflow</CardDescription>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Create Job
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create New Job Posting</DialogTitle>
                    <DialogDescription>
                      Create a new job posting that will go through the approval workflow
                    </DialogDescription>
                  </DialogHeader>
                  <CreateJobForm 
                    createdBy={user.id} 
                    onSuccess={() => {
                      loadDashboardData();
                    }} 
                  />
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {jobs.map((job: Job) => (
                  <div key={job.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h3 className="font-medium">{job.title}</h3>
                      <p className="text-sm text-gray-600">{job.department} • {job.employment_type}</p>
                      <p className="text-sm text-gray-500">Created: {job.created_at.toLocaleDateString()}</p>
                      {job.salary_range && (
                        <p className="text-sm text-green-600 font-medium">💰 {job.salary_range}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge className={getJobStatusColor(job.status)}>
                        {job.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                      {job.status === 'pending_approval' && (
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => approveJob(job.id)}>
                            <CheckCircleIcon className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => rejectJob(job.id)}>
                            <XCircleIcon className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="applications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Application Review</CardTitle>
              <CardDescription>Review applications and AI match scores</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {applications.map((application: Application) => (
                  <ApplicationReview
                    key={application.id}
                    application={application}
                    onStatusUpdate={() => loadDashboardData()}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="interviews" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Interview Management</CardTitle>
              <CardDescription>Schedule and manage interviews</CardDescription>
            </CardHeader>
            <CardContent>
              {interviews.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No interviews scheduled</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {interviews.map((interview: Interview) => (
                    <div key={interview.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <CalendarIcon className="h-8 w-8 text-blue-500" />
                        <div>
                          <h3 className="font-medium">Application #{interview.application_id}</h3>
                          <p className="text-sm text-gray-600">
                            📅 {interview.scheduled_at.toLocaleDateString()} at{' '}
                            {interview.scheduled_at.toLocaleTimeString()}
                          </p>
                          <p className="text-sm text-gray-600">⏱️ {interview.duration_minutes} minutes</p>
                        </div>
                      </div>
                      <Badge className={
                        interview.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                        interview.status === 'completed' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }>
                        {interview.status.toUpperCase()}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Manage system users and roles</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users.map((user: User) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">{user.first_name} {user.last_name}</h3>
                      <p className="text-sm text-gray-600">{user.email}</p>
                      <p className="text-sm text-gray-500">
                        {user.department && `${user.department} • `}
                        Joined: {user.created_at.toLocaleDateString()}
                      </p>
                    </div>
                    <Badge className={getRoleColor(user.role)}>
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}