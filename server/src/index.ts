import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Schema imports
import {
  createUserInputSchema,
  createJobInputSchema,
  createApplicationInputSchema,
  uploadCVInputSchema,
  scheduleInterviewInputSchema,
  createNotificationInputSchema,
  updateApplicationStatusInputSchema,
  updateJobStatusInputSchema,
  updateInterviewInputSchema,
  getJobsByStatusInputSchema,
  getApplicationsByJobInputSchema,
  getCandidateApplicationsInputSchema,
  getUserNotificationsInputSchema
} from './schema';

// Handler imports
import { createUser } from './handlers/create_user';
import { getUsers } from './handlers/get_users';
import { createJob } from './handlers/create_job';
import { getJobs, getJobsByStatus } from './handlers/get_jobs';
import { updateJobStatus } from './handlers/update_job_status';
import { uploadCV } from './handlers/upload_cv';
import { processCVWithAI, getCVParsedData } from './handlers/process_cv_with_ai';
import { createApplication } from './handlers/create_application';
import { getApplications, getApplicationsByJob, getCandidateApplications } from './handlers/get_applications';
import { updateApplicationStatus } from './handlers/update_application_status';
import { scheduleInterview } from './handlers/schedule_interview';
import { getInterviews, getInterviewsByCandidate, getInterviewsByInterviewer } from './handlers/get_interviews';
import { updateInterview } from './handlers/update_interview';
import { createNotification, sendEmailNotification } from './handlers/create_notification';
import { getUserNotifications, markNotificationAsRead } from './handlers/get_notifications';
import { generateWeeklyReport, getReportsByRequester } from './handlers/generate_report';
import { getCandidateDashboard, getRequesterDashboard, getAdminDashboard } from './handlers/dashboard_analytics';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User management
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),
  
  getUsers: publicProcedure
    .query(() => getUsers()),

  // Job management
  createJob: publicProcedure
    .input(createJobInputSchema)
    .mutation(({ input }) => createJob(input)),

  getJobs: publicProcedure
    .query(() => getJobs()),

  getJobsByStatus: publicProcedure
    .input(getJobsByStatusInputSchema)
    .query(({ input }) => getJobsByStatus(input)),

  updateJobStatus: publicProcedure
    .input(updateJobStatusInputSchema)
    .mutation(({ input }) => updateJobStatus(input)),

  // CV management
  uploadCV: publicProcedure
    .input(uploadCVInputSchema)
    .mutation(({ input }) => uploadCV(input)),

  processCVWithAI: publicProcedure
    .input(z.object({ cvFileId: z.number() }))
    .mutation(({ input }) => processCVWithAI(input.cvFileId)),

  getCVParsedData: publicProcedure
    .input(z.object({ cvFileId: z.number() }))
    .query(({ input }) => getCVParsedData(input.cvFileId)),

  // Application management
  createApplication: publicProcedure
    .input(createApplicationInputSchema)
    .mutation(({ input }) => createApplication(input)),

  getApplications: publicProcedure
    .query(() => getApplications()),

  getApplicationsByJob: publicProcedure
    .input(getApplicationsByJobInputSchema)
    .query(({ input }) => getApplicationsByJob(input)),

  getCandidateApplications: publicProcedure
    .input(getCandidateApplicationsInputSchema)
    .query(({ input }) => getCandidateApplications(input)),

  updateApplicationStatus: publicProcedure
    .input(updateApplicationStatusInputSchema)
    .mutation(({ input }) => updateApplicationStatus(input)),

  // Interview management
  scheduleInterview: publicProcedure
    .input(scheduleInterviewInputSchema)
    .mutation(({ input }) => scheduleInterview(input)),

  getInterviews: publicProcedure
    .query(() => getInterviews()),

  getInterviewsByCandidate: publicProcedure
    .input(z.object({ candidateId: z.number() }))
    .query(({ input }) => getInterviewsByCandidate(input.candidateId)),

  getInterviewsByInterviewer: publicProcedure
    .input(z.object({ interviewerId: z.number() }))
    .query(({ input }) => getInterviewsByInterviewer(input.interviewerId)),

  updateInterview: publicProcedure
    .input(updateInterviewInputSchema)
    .mutation(({ input }) => updateInterview(input)),

  // Notification management
  createNotification: publicProcedure
    .input(createNotificationInputSchema)
    .mutation(({ input }) => createNotification(input)),

  getUserNotifications: publicProcedure
    .input(getUserNotificationsInputSchema)
    .query(({ input }) => getUserNotifications(input)),

  markNotificationAsRead: publicProcedure
    .input(z.object({ notificationId: z.number() }))
    .mutation(({ input }) => markNotificationAsRead(input.notificationId)),

  sendEmailNotification: publicProcedure
    .input(z.object({ notificationId: z.number() }))
    .mutation(({ input }) => sendEmailNotification(input.notificationId)),

  // Report management
  generateWeeklyReport: publicProcedure
    .input(z.object({
      requesterId: z.number(),
      weekStart: z.coerce.date(),
      weekEnd: z.coerce.date()
    }))
    .mutation(({ input }) => generateWeeklyReport(input.requesterId, input.weekStart, input.weekEnd)),

  getReportsByRequester: publicProcedure
    .input(z.object({ requesterId: z.number() }))
    .query(({ input }) => getReportsByRequester(input.requesterId)),

  // Dashboard analytics
  getCandidateDashboard: publicProcedure
    .input(z.object({ candidateId: z.number() }))
    .query(({ input }) => getCandidateDashboard(input.candidateId)),

  getRequesterDashboard: publicProcedure
    .input(z.object({ requesterId: z.number() }))
    .query(({ input }) => getRequesterDashboard(input.requesterId)),

  getAdminDashboard: publicProcedure
    .query(() => getAdminDashboard()),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC Talent Acquisition System server listening at port: ${port}`);
}

start();