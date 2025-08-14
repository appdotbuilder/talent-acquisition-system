import { z } from 'zod';

// Enums
export const UserRoleSchema = z.enum(['candidate', 'requester', 'admin']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const ApplicationStatusSchema = z.enum(['pending', 'ai_processing', 'shortlisted', 'rejected', 'interview_scheduled', 'interviewed', 'offer_made', 'offer_accepted', 'offer_rejected', 'hired']);
export type ApplicationStatus = z.infer<typeof ApplicationStatusSchema>;

export const JobStatusSchema = z.enum(['draft', 'pending_approval', 'approved', 'published', 'closed']);
export type JobStatus = z.infer<typeof JobStatusSchema>;

export const InterviewStatusSchema = z.enum(['scheduled', 'completed', 'cancelled', 'rescheduled']);
export type InterviewStatus = z.infer<typeof InterviewStatusSchema>;

export const NotificationTypeSchema = z.enum(['application_status', 'interview_invitation', 'job_approval', 'weekly_report']);
export type NotificationType = z.infer<typeof NotificationTypeSchema>;

export const FileTypeSchema = z.enum(['pdf', 'docx', 'jpg', 'png']);
export type FileType = z.infer<typeof FileTypeSchema>;

// User schema
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  first_name: z.string(),
  last_name: z.string(),
  role: UserRoleSchema,
  department: z.string().nullable(),
  phone: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Job schema
export const jobSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string(),
  requirements: z.string(),
  department: z.string(),
  location: z.string().nullable(),
  salary_range: z.string().nullable(),
  employment_type: z.string(),
  status: JobStatusSchema,
  created_by: z.number(),
  approved_by: z.number().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  published_at: z.coerce.date().nullable(),
  closed_at: z.coerce.date().nullable()
});

export type Job = z.infer<typeof jobSchema>;

// CV file schema
export const cvFileSchema = z.object({
  id: z.number(),
  candidate_id: z.number(),
  file_name: z.string(),
  file_type: FileTypeSchema,
  file_size: z.number(),
  file_path: z.string(),
  uploaded_at: z.coerce.date()
});

export type CVFile = z.infer<typeof cvFileSchema>;

// AI parsed data schema
export const aiParsedDataSchema = z.object({
  id: z.number(),
  cv_file_id: z.number(),
  parsed_data: z.record(z.unknown()), // JSON object for parsed CV data
  processing_status: z.enum(['pending', 'processing', 'completed', 'failed']),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type AIParsedData = z.infer<typeof aiParsedDataSchema>;

// Application schema
export const applicationSchema = z.object({
  id: z.number(),
  job_id: z.number(),
  candidate_id: z.number(),
  cv_file_id: z.number(),
  ai_parsed_data_id: z.number().nullable(),
  status: ApplicationStatusSchema,
  ai_match_score: z.number().nullable(),
  cover_letter: z.string().nullable(),
  notes: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Application = z.infer<typeof applicationSchema>;

// Interview schema
export const interviewSchema = z.object({
  id: z.number(),
  application_id: z.number(),
  interviewer_id: z.number(),
  scheduled_at: z.coerce.date(),
  duration_minutes: z.number(),
  location: z.string().nullable(),
  meeting_link: z.string().nullable(),
  status: InterviewStatusSchema,
  notes: z.string().nullable(),
  feedback: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Interview = z.infer<typeof interviewSchema>;

// Notification schema
export const notificationSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  type: NotificationTypeSchema,
  title: z.string(),
  message: z.string(),
  email_sent: z.boolean(),
  read_at: z.coerce.date().nullable(),
  created_at: z.coerce.date()
});

export type Notification = z.infer<typeof notificationSchema>;

// Report schema
export const reportSchema = z.object({
  id: z.number(),
  requester_id: z.number(),
  report_type: z.string(),
  report_data: z.record(z.unknown()), // JSON object for report metrics
  file_path: z.string().nullable(),
  generated_at: z.coerce.date(),
  week_start: z.coerce.date(),
  week_end: z.coerce.date()
});

export type Report = z.infer<typeof reportSchema>;

// Input schemas for creating entities

export const createUserInputSchema = z.object({
  email: z.string().email(),
  first_name: z.string(),
  last_name: z.string(),
  role: UserRoleSchema,
  department: z.string().nullable(),
  phone: z.string().nullable()
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const createJobInputSchema = z.object({
  title: z.string(),
  description: z.string(),
  requirements: z.string(),
  department: z.string(),
  location: z.string().nullable(),
  salary_range: z.string().nullable(),
  employment_type: z.string(),
  created_by: z.number()
});

export type CreateJobInput = z.infer<typeof createJobInputSchema>;

export const createApplicationInputSchema = z.object({
  job_id: z.number(),
  candidate_id: z.number(),
  cv_file_id: z.number(),
  cover_letter: z.string().nullable()
});

export type CreateApplicationInput = z.infer<typeof createApplicationInputSchema>;

export const uploadCVInputSchema = z.object({
  candidate_id: z.number(),
  file_name: z.string(),
  file_type: FileTypeSchema,
  file_size: z.number(),
  file_path: z.string()
});

export type UploadCVInput = z.infer<typeof uploadCVInputSchema>;

export const scheduleInterviewInputSchema = z.object({
  application_id: z.number(),
  interviewer_id: z.number(),
  scheduled_at: z.coerce.date(),
  duration_minutes: z.number(),
  location: z.string().nullable(),
  meeting_link: z.string().nullable()
});

export type ScheduleInterviewInput = z.infer<typeof scheduleInterviewInputSchema>;

export const createNotificationInputSchema = z.object({
  user_id: z.number(),
  type: NotificationTypeSchema,
  title: z.string(),
  message: z.string()
});

export type CreateNotificationInput = z.infer<typeof createNotificationInputSchema>;

// Update schemas

export const updateApplicationStatusInputSchema = z.object({
  application_id: z.number(),
  status: ApplicationStatusSchema,
  notes: z.string().nullable()
});

export type UpdateApplicationStatusInput = z.infer<typeof updateApplicationStatusInputSchema>;

export const updateJobStatusInputSchema = z.object({
  job_id: z.number(),
  status: JobStatusSchema,
  approved_by: z.number().nullable()
});

export type UpdateJobStatusInput = z.infer<typeof updateJobStatusInputSchema>;

export const updateInterviewInputSchema = z.object({
  interview_id: z.number(),
  status: InterviewStatusSchema.optional(),
  notes: z.string().nullable().optional(),
  feedback: z.string().nullable().optional()
});

export type UpdateInterviewInput = z.infer<typeof updateInterviewInputSchema>;

// Query schemas

export const getJobsByStatusInputSchema = z.object({
  status: JobStatusSchema.optional(),
  created_by: z.number().optional()
});

export type GetJobsByStatusInput = z.infer<typeof getJobsByStatusInputSchema>;

export const getApplicationsByJobInputSchema = z.object({
  job_id: z.number()
});

export type GetApplicationsByJobInput = z.infer<typeof getApplicationsByJobInputSchema>;

export const getCandidateApplicationsInputSchema = z.object({
  candidate_id: z.number()
});

export type GetCandidateApplicationsInput = z.infer<typeof getCandidateApplicationsInputSchema>;

export const getUserNotificationsInputSchema = z.object({
  user_id: z.number(),
  unread_only: z.boolean().optional()
});

export type GetUserNotificationsInput = z.infer<typeof getUserNotificationsInputSchema>;