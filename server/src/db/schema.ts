import { serial, text, pgTable, timestamp, integer, boolean, jsonb, pgEnum } from 'drizzle-orm/pg-core';

// Define enums for PostgreSQL
export const userRoleEnum = pgEnum('user_role', ['candidate', 'requester', 'admin']);
export const applicationStatusEnum = pgEnum('application_status', ['pending', 'ai_processing', 'shortlisted', 'rejected', 'interview_scheduled', 'interviewed', 'offer_made', 'offer_accepted', 'offer_rejected', 'hired']);
export const jobStatusEnum = pgEnum('job_status', ['draft', 'pending_approval', 'approved', 'published', 'closed']);
export const interviewStatusEnum = pgEnum('interview_status', ['scheduled', 'completed', 'cancelled', 'rescheduled']);
export const notificationTypeEnum = pgEnum('notification_type', ['application_status', 'interview_invitation', 'job_approval', 'weekly_report']);
export const fileTypeEnum = pgEnum('file_type', ['pdf', 'docx', 'jpg', 'png']);
export const processingStatusEnum = pgEnum('processing_status', ['pending', 'processing', 'completed', 'failed']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  first_name: text('first_name').notNull(),
  last_name: text('last_name').notNull(),
  role: userRoleEnum('role').notNull(),
  department: text('department'),
  phone: text('phone'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Jobs table
export const jobsTable = pgTable('jobs', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  requirements: text('requirements').notNull(),
  department: text('department').notNull(),
  location: text('location'),
  salary_range: text('salary_range'),
  employment_type: text('employment_type').notNull(),
  status: jobStatusEnum('status').notNull().default('draft'),
  created_by: integer('created_by').notNull(),
  approved_by: integer('approved_by'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
  published_at: timestamp('published_at'),
  closed_at: timestamp('closed_at'),
});

// CV files table
export const cvFilesTable = pgTable('cv_files', {
  id: serial('id').primaryKey(),
  candidate_id: integer('candidate_id').notNull(),
  file_name: text('file_name').notNull(),
  file_type: fileTypeEnum('file_type').notNull(),
  file_size: integer('file_size').notNull(),
  file_path: text('file_path').notNull(),
  uploaded_at: timestamp('uploaded_at').defaultNow().notNull(),
});

// AI parsed data table
export const aiParsedDataTable = pgTable('ai_parsed_data', {
  id: serial('id').primaryKey(),
  cv_file_id: integer('cv_file_id').notNull(),
  parsed_data: jsonb('parsed_data').notNull(),
  processing_status: processingStatusEnum('processing_status').notNull().default('pending'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Applications table
export const applicationsTable = pgTable('applications', {
  id: serial('id').primaryKey(),
  job_id: integer('job_id').notNull(),
  candidate_id: integer('candidate_id').notNull(),
  cv_file_id: integer('cv_file_id').notNull(),
  ai_parsed_data_id: integer('ai_parsed_data_id'),
  status: applicationStatusEnum('status').notNull().default('pending'),
  ai_match_score: integer('ai_match_score'), // Storing as percentage (0-100)
  cover_letter: text('cover_letter'),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Interviews table
export const interviewsTable = pgTable('interviews', {
  id: serial('id').primaryKey(),
  application_id: integer('application_id').notNull(),
  interviewer_id: integer('interviewer_id').notNull(),
  scheduled_at: timestamp('scheduled_at').notNull(),
  duration_minutes: integer('duration_minutes').notNull(),
  location: text('location'),
  meeting_link: text('meeting_link'),
  status: interviewStatusEnum('status').notNull().default('scheduled'),
  notes: text('notes'),
  feedback: text('feedback'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Notifications table
export const notificationsTable = pgTable('notifications', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull(),
  type: notificationTypeEnum('type').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  email_sent: boolean('email_sent').notNull().default(false),
  read_at: timestamp('read_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Reports table
export const reportsTable = pgTable('reports', {
  id: serial('id').primaryKey(),
  requester_id: integer('requester_id').notNull(),
  report_type: text('report_type').notNull(),
  report_data: jsonb('report_data').notNull(),
  file_path: text('file_path'),
  generated_at: timestamp('generated_at').defaultNow().notNull(),
  week_start: timestamp('week_start').notNull(),
  week_end: timestamp('week_end').notNull(),
});

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

export type Job = typeof jobsTable.$inferSelect;
export type NewJob = typeof jobsTable.$inferInsert;

export type CVFile = typeof cvFilesTable.$inferSelect;
export type NewCVFile = typeof cvFilesTable.$inferInsert;

export type AIParsedData = typeof aiParsedDataTable.$inferSelect;
export type NewAIParsedData = typeof aiParsedDataTable.$inferInsert;

export type Application = typeof applicationsTable.$inferSelect;
export type NewApplication = typeof applicationsTable.$inferInsert;

export type Interview = typeof interviewsTable.$inferSelect;
export type NewInterview = typeof interviewsTable.$inferInsert;

export type Notification = typeof notificationsTable.$inferSelect;
export type NewNotification = typeof notificationsTable.$inferInsert;

export type Report = typeof reportsTable.$inferSelect;
export type NewReport = typeof reportsTable.$inferInsert;

// Export all tables for relation queries
export const tables = {
  users: usersTable,
  jobs: jobsTable,
  cvFiles: cvFilesTable,
  aiParsedData: aiParsedDataTable,
  applications: applicationsTable,
  interviews: interviewsTable,
  notifications: notificationsTable,
  reports: reportsTable
};