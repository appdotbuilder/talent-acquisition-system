import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarIcon, FileIcon, TrendingUpIcon, ClockIcon } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import { StubNotification } from '@/components/StubNotification';
import type { User, Application, Interview } from '../../../server/src/schema';

interface CandidateDashboardProps {
  candidateId: number;
  user: User;
}

interface DashboardData {
  totalApplications: number;
  pendingApplications: number;
  shortlistedApplications: number;
  upcomingInterviews: number;
  recentApplications: any[];
  upcomingInterviewSchedules: any[];
}

export function CandidateDashboard({ candidateId, user }: CandidateDashboardProps) {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [dashData, userApplications, userInterviews] = await Promise.all([
        trpc.getCandidateDashboard.query({ candidateId }),
        trpc.getCandidateApplications.query({ candidate_id: candidateId }),
        trpc.getInterviewsByCandidate.query({ candidateId })
      ]);
      
      setDashboardData(dashData);
      setApplications(userApplications);
      setInterviews(userInterviews);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [candidateId]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const getStatusColor = (status: string): string => {
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

  const getStatusIcon = (status: string): string => {
    switch (status) {
      case 'pending':
        return '⏳';
      case 'ai_processing':
        return '🤖';
      case 'shortlisted':
        return '✅';
      case 'rejected':
        return '❌';
      case 'interview_scheduled':
        return '📅';
      case 'offer_made':
        return '🎉';
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
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-lg">
        <h2 className="text-2xl font-bold mb-2">
          Welcome back, {user.first_name}! 👋
        </h2>
        <p className="text-blue-100">
          Track your applications and stay updated on your career journey
        </p>
      </div>

      {/* Demo Notification */}
      <StubNotification feature="Candidate application and interview data" />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
            <FileIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData?.totalApplications || 0}</div>
            <p className="text-xs text-muted-foreground">
              Your career portfolio
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <ClockIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData?.pendingApplications || 0}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting response
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Shortlisted</CardTitle>
            <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {dashboardData?.shortlistedApplications || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Great progress!
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Interviews</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {dashboardData?.upcomingInterviews || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Be prepared!
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Views */}
      <Tabs defaultValue="applications" className="space-y-4">
        <TabsList>
          <TabsTrigger value="applications">My Applications</TabsTrigger>
          <TabsTrigger value="interviews">Interview Schedule</TabsTrigger>
        </TabsList>

        <TabsContent value="applications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Application Status</CardTitle>
              <CardDescription>
                Track the progress of your job applications
              </CardDescription>
            </CardHeader>
            <CardContent>
              {applications.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No applications yet</p>
                  <p className="text-sm">Start applying to jobs to see them here!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {applications.map((application: Application) => (
                    <div key={application.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <span className="text-2xl">{getStatusIcon(application.status)}</span>
                        <div>
                          <h3 className="font-medium">Job ID: {application.job_id}</h3>
                          <p className="text-sm text-gray-600">
                            Applied: {application.created_at.toLocaleDateString()}
                          </p>
                          {application.ai_match_score && (
                            <div className="mt-1">
                              <div className="flex items-center space-x-2">
                                <span className="text-xs text-gray-500">AI Match:</span>
                                <Progress 
                                  value={application.ai_match_score} 
                                  className="w-20 h-2" 
                                />
                                <span className="text-xs font-medium">
                                  {application.ai_match_score}%
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <Badge className={getStatusColor(application.status)}>
                        {application.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="interviews" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Interview Schedule</CardTitle>
              <CardDescription>
                Your upcoming and past interviews
              </CardDescription>
            </CardHeader>
            <CardContent>
              {interviews.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No interviews scheduled</p>
                  <p className="text-sm">Interviews will appear here once scheduled</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {interviews.map((interview: Interview) => (
                    <div key={interview.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <CalendarIcon className="h-8 w-8 text-blue-500" />
                        <div>
                          <h3 className="font-medium">Application ID: {interview.application_id}</h3>
                          <p className="text-sm text-gray-600">
                            📅 {interview.scheduled_at.toLocaleDateString()} at{' '}
                            {interview.scheduled_at.toLocaleTimeString()}
                          </p>
                          <p className="text-sm text-gray-600">
                            ⏱️ Duration: {interview.duration_minutes} minutes
                          </p>
                          {interview.meeting_link && (
                            <Button variant="outline" size="sm" className="mt-2">
                              Join Meeting
                            </Button>
                          )}
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
      </Tabs>
    </div>
  );
}