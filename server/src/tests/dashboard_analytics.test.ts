import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  usersTable, 
  jobsTable, 
  applicationsTable, 
  interviewsTable,
  cvFilesTable,
  aiParsedDataTable
} from '../db/schema';
import { getCandidateDashboard, getRequesterDashboard, getAdminDashboard } from '../handlers/dashboard_analytics';

describe('Dashboard Analytics', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('getCandidateDashboard', () => {
    it('should return candidate dashboard data with zero counts for new candidate', async () => {
      // Create a candidate user
      const candidateResult = await db.insert(usersTable).values({
        email: 'candidate@test.com',
        first_name: 'Test',
        last_name: 'Candidate',
        role: 'candidate'
      }).returning().execute();

      const candidateId = candidateResult[0].id;

      const result = await getCandidateDashboard(candidateId);

      expect(result.totalApplications).toBe(0);
      expect(result.pendingApplications).toBe(0);
      expect(result.shortlistedApplications).toBe(0);
      expect(result.upcomingInterviews).toBe(0);
      expect(result.recentApplications).toHaveLength(0);
      expect(result.upcomingInterviewSchedules).toHaveLength(0);
    });

    it('should return correct application counts and recent applications', async () => {
      // Create test data
      const candidateResult = await db.insert(usersTable).values({
        email: 'candidate@test.com',
        first_name: 'Test',
        last_name: 'Candidate',
        role: 'candidate'
      }).returning().execute();

      const requesterResult = await db.insert(usersTable).values({
        email: 'requester@test.com',
        first_name: 'Test',
        last_name: 'Requester',
        role: 'requester'
      }).returning().execute();

      const jobResult = await db.insert(jobsTable).values({
        title: 'Software Engineer',
        description: 'Great job',
        requirements: 'Experience required',
        department: 'Engineering',
        employment_type: 'Full-time',
        created_by: requesterResult[0].id,
        status: 'published'
      }).returning().execute();

      const cvFileResult = await db.insert(cvFilesTable).values({
        candidate_id: candidateResult[0].id,
        file_name: 'resume.pdf',
        file_type: 'pdf',
        file_size: 1024,
        file_path: '/path/to/resume.pdf'
      }).returning().execute();

      // Create applications with different statuses
      await db.insert(applicationsTable).values([
        {
          job_id: jobResult[0].id,
          candidate_id: candidateResult[0].id,
          cv_file_id: cvFileResult[0].id,
          status: 'pending'
        },
        {
          job_id: jobResult[0].id,
          candidate_id: candidateResult[0].id,
          cv_file_id: cvFileResult[0].id,
          status: 'shortlisted',
          ai_match_score: 85
        },
        {
          job_id: jobResult[0].id,
          candidate_id: candidateResult[0].id,
          cv_file_id: cvFileResult[0].id,
          status: 'rejected'
        }
      ]).execute();

      const result = await getCandidateDashboard(candidateResult[0].id);

      expect(result.totalApplications).toBe(3);
      expect(result.pendingApplications).toBe(1);
      expect(result.shortlistedApplications).toBe(1);
      expect(result.recentApplications).toHaveLength(3);
      expect(result.recentApplications[0].job_title).toBe('Software Engineer');
      expect(result.recentApplications[0].company_department).toBe('Engineering');
    });

    it('should return upcoming interviews correctly', async () => {
      // Create test data
      const candidateResult = await db.insert(usersTable).values({
        email: 'candidate@test.com',
        first_name: 'Test',
        last_name: 'Candidate',
        role: 'candidate'
      }).returning().execute();

      const requesterResult = await db.insert(usersTable).values({
        email: 'requester@test.com',
        first_name: 'Test',
        last_name: 'Requester',
        role: 'requester'
      }).returning().execute();

      const interviewerResult = await db.insert(usersTable).values({
        email: 'interviewer@test.com',
        first_name: 'Test',
        last_name: 'Interviewer',
        role: 'requester'
      }).returning().execute();

      const jobResult = await db.insert(jobsTable).values({
        title: 'Software Engineer',
        description: 'Great job',
        requirements: 'Experience required',
        department: 'Engineering',
        employment_type: 'Full-time',
        created_by: requesterResult[0].id,
        status: 'published'
      }).returning().execute();

      const cvFileResult = await db.insert(cvFilesTable).values({
        candidate_id: candidateResult[0].id,
        file_name: 'resume.pdf',
        file_type: 'pdf',
        file_size: 1024,
        file_path: '/path/to/resume.pdf'
      }).returning().execute();

      const applicationResult = await db.insert(applicationsTable).values({
        job_id: jobResult[0].id,
        candidate_id: candidateResult[0].id,
        cv_file_id: cvFileResult[0].id,
        status: 'interview_scheduled'
      }).returning().execute();

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      await db.insert(interviewsTable).values({
        application_id: applicationResult[0].id,
        interviewer_id: interviewerResult[0].id,
        scheduled_at: tomorrow,
        duration_minutes: 60,
        location: 'Conference Room A',
        status: 'scheduled'
      }).execute();

      const result = await getCandidateDashboard(candidateResult[0].id);

      expect(result.upcomingInterviews).toBe(1);
      expect(result.upcomingInterviewSchedules).toHaveLength(1);
      expect(result.upcomingInterviewSchedules[0].job_title).toBe('Software Engineer');
      expect(result.upcomingInterviewSchedules[0].interviewer_name).toBe('Test Interviewer');
      expect(result.upcomingInterviewSchedules[0].location).toBe('Conference Room A');
      expect(result.upcomingInterviewSchedules[0].duration_minutes).toBe(60);
    });
  });

  describe('getRequesterDashboard', () => {
    it('should return requester dashboard data with zero counts for new requester', async () => {
      const requesterResult = await db.insert(usersTable).values({
        email: 'requester@test.com',
        first_name: 'Test',
        last_name: 'Requester',
        role: 'requester'
      }).returning().execute();

      const result = await getRequesterDashboard(requesterResult[0].id);

      expect(result.totalJobPostings).toBe(0);
      expect(result.pendingApprovals).toBe(0);
      expect(result.activeJobPostings).toBe(0);
      expect(result.totalApplicationsReceived).toBe(0);
      expect(result.candidatesInPipeline).toBe(0);
      expect(result.averageMatchScore).toBe(0);
      expect(result.recentApplications).toHaveLength(0);
      expect(result.weeklyMetrics.applications).toBe(0);
      expect(result.weeklyMetrics.interviews).toBe(0);
    });

    it('should return correct job posting counts and metrics', async () => {
      // Create test data
      const requesterResult = await db.insert(usersTable).values({
        email: 'requester@test.com',
        first_name: 'Test',
        last_name: 'Requester',
        role: 'requester'
      }).returning().execute();

      const candidateResult = await db.insert(usersTable).values({
        email: 'candidate@test.com',
        first_name: 'Test',
        last_name: 'Candidate',
        role: 'candidate'
      }).returning().execute();

      // Create jobs with different statuses
      const jobResults = await db.insert(jobsTable).values([
        {
          title: 'Software Engineer',
          description: 'Great job',
          requirements: 'Experience required',
          department: 'Engineering',
          employment_type: 'Full-time',
          created_by: requesterResult[0].id,
          status: 'pending_approval'
        },
        {
          title: 'Product Manager',
          description: 'Another great job',
          requirements: 'PM experience',
          department: 'Product',
          employment_type: 'Full-time',
          created_by: requesterResult[0].id,
          status: 'published'
        }
      ]).returning().execute();

      const cvFileResult = await db.insert(cvFilesTable).values({
        candidate_id: candidateResult[0].id,
        file_name: 'resume.pdf',
        file_type: 'pdf',
        file_size: 1024,
        file_path: '/path/to/resume.pdf'
      }).returning().execute();

      // Create applications with match scores
      await db.insert(applicationsTable).values([
        {
          job_id: jobResults[0].id,
          candidate_id: candidateResult[0].id,
          cv_file_id: cvFileResult[0].id,
          status: 'shortlisted',
          ai_match_score: 85
        },
        {
          job_id: jobResults[1].id,
          candidate_id: candidateResult[0].id,
          cv_file_id: cvFileResult[0].id,
          status: 'pending',
          ai_match_score: 92
        }
      ]).execute();

      const result = await getRequesterDashboard(requesterResult[0].id);

      expect(result.totalJobPostings).toBe(2);
      expect(result.pendingApprovals).toBe(1);
      expect(result.activeJobPostings).toBe(1);
      expect(result.totalApplicationsReceived).toBe(2);
      expect(result.candidatesInPipeline).toBe(2); // Both shortlisted and pending are in pipeline
      expect(result.averageMatchScore).toBe(89); // (85 + 92) / 2 = 88.5, rounded to 89
      expect(result.recentApplications).toHaveLength(2);
      expect(result.recentApplications[0].candidate_name).toBe('Test Candidate');
    });

    it('should calculate weekly metrics correctly', async () => {
      const requesterResult = await db.insert(usersTable).values({
        email: 'requester@test.com',
        first_name: 'Test',
        last_name: 'Requester',
        role: 'requester'
      }).returning().execute();

      const candidateResult = await db.insert(usersTable).values({
        email: 'candidate@test.com',
        first_name: 'Test',
        last_name: 'Candidate',
        role: 'candidate'
      }).returning().execute();

      const jobResult = await db.insert(jobsTable).values({
        title: 'Software Engineer',
        description: 'Great job',
        requirements: 'Experience required',
        department: 'Engineering',
        employment_type: 'Full-time',
        created_by: requesterResult[0].id,
        status: 'published'
      }).returning().execute();

      const cvFileResult = await db.insert(cvFilesTable).values({
        candidate_id: candidateResult[0].id,
        file_name: 'resume.pdf',
        file_type: 'pdf',
        file_size: 1024,
        file_path: '/path/to/resume.pdf'
      }).returning().execute();

      const applicationResult = await db.insert(applicationsTable).values({
        job_id: jobResult[0].id,
        candidate_id: candidateResult[0].id,
        cv_file_id: cvFileResult[0].id,
        status: 'pending'
      }).returning().execute();

      await db.insert(interviewsTable).values({
        application_id: applicationResult[0].id,
        interviewer_id: requesterResult[0].id,
        scheduled_at: new Date(),
        duration_minutes: 60,
        status: 'scheduled'
      }).execute();

      const result = await getRequesterDashboard(requesterResult[0].id);

      expect(result.weeklyMetrics.applications).toBe(1);
      expect(result.weeklyMetrics.interviews).toBe(1);
    });
  });

  describe('getAdminDashboard', () => {
    it('should return admin dashboard data with zero counts for empty system', async () => {
      const result = await getAdminDashboard();

      expect(result.totalUsers).toBe(0);
      expect(result.totalJobs).toBe(0);
      expect(result.totalApplications).toBe(0);
      expect(result.pendingJobApprovals).toBe(0);
      expect(result.aiProcessingQueue).toBe(0);
      expect(result.systemMetrics.usersByRole).toHaveLength(0);
      expect(result.systemMetrics.applicationsByStatus).toHaveLength(0);
      expect(result.systemMetrics.jobsByStatus).toHaveLength(0);
      expect(result.recentActivity).toHaveLength(0);
    });

    it('should return correct system-wide metrics', async () => {
      // Create users with different roles
      const usersResult = await db.insert(usersTable).values([
        {
          email: 'admin@test.com',
          first_name: 'Test',
          last_name: 'Admin',
          role: 'admin'
        },
        {
          email: 'requester@test.com',
          first_name: 'Test',
          last_name: 'Requester',
          role: 'requester'
        },
        {
          email: 'candidate@test.com',
          first_name: 'Test',
          last_name: 'Candidate',
          role: 'candidate'
        }
      ]).returning().execute();

      // Create jobs with different statuses
      const jobResults = await db.insert(jobsTable).values([
        {
          title: 'Software Engineer',
          description: 'Great job',
          requirements: 'Experience required',
          department: 'Engineering',
          employment_type: 'Full-time',
          created_by: usersResult[1].id,
          status: 'pending_approval'
        },
        {
          title: 'Product Manager',
          description: 'Another great job',
          requirements: 'PM experience',
          department: 'Product',
          employment_type: 'Full-time',
          created_by: usersResult[1].id,
          status: 'published'
        }
      ]).returning().execute();

      const cvFileResult = await db.insert(cvFilesTable).values({
        candidate_id: usersResult[2].id,
        file_name: 'resume.pdf',
        file_type: 'pdf',
        file_size: 1024,
        file_path: '/path/to/resume.pdf'
      }).returning().execute();

      // Create applications
      await db.insert(applicationsTable).values([
        {
          job_id: jobResults[0].id,
          candidate_id: usersResult[2].id,
          cv_file_id: cvFileResult[0].id,
          status: 'pending'
        },
        {
          job_id: jobResults[1].id,
          candidate_id: usersResult[2].id,
          cv_file_id: cvFileResult[0].id,
          status: 'shortlisted'
        }
      ]).execute();

      // Create AI processing records
      await db.insert(aiParsedDataTable).values([
        {
          cv_file_id: cvFileResult[0].id,
          parsed_data: { skills: ['JavaScript', 'React'] },
          processing_status: 'pending'
        }
      ]).execute();

      const result = await getAdminDashboard();

      expect(result.totalUsers).toBe(3);
      expect(result.totalJobs).toBe(2);
      expect(result.totalApplications).toBe(2);
      expect(result.pendingJobApprovals).toBe(1);
      expect(result.aiProcessingQueue).toBe(1);

      // Check system metrics structure
      expect(result.systemMetrics.usersByRole).toHaveLength(3);
      expect(result.systemMetrics.applicationsByStatus).toHaveLength(2);
      expect(result.systemMetrics.jobsByStatus).toHaveLength(2);

      // Verify user role counts
      const adminRoleCount = result.systemMetrics.usersByRole.find((u: any) => u.role === 'admin');
      const requesterRoleCount = result.systemMetrics.usersByRole.find((u: any) => u.role === 'requester');
      const candidateRoleCount = result.systemMetrics.usersByRole.find((u: any) => u.role === 'candidate');

      expect(adminRoleCount?.count).toBe(1);
      expect(requesterRoleCount?.count).toBe(1);
      expect(candidateRoleCount?.count).toBe(1);

      // Check recent activity
      expect(result.recentActivity.length).toBeGreaterThan(0);
      expect(result.recentActivity[0]).toHaveProperty('type');
      expect(result.recentActivity[0]).toHaveProperty('title');
      expect(result.recentActivity[0]).toHaveProperty('user_name');
    });

    it('should handle recent activity sorting correctly', async () => {
      const requesterResult = await db.insert(usersTable).values({
        email: 'requester@test.com',
        first_name: 'Test',
        last_name: 'Requester',
        role: 'requester'
      }).returning().execute();

      const candidateResult = await db.insert(usersTable).values({
        email: 'candidate@test.com',
        first_name: 'Test',
        last_name: 'Candidate',
        role: 'candidate'
      }).returning().execute();

      // Create job first
      const jobResult = await db.insert(jobsTable).values({
        title: 'Software Engineer',
        description: 'Great job',
        requirements: 'Experience required',
        department: 'Engineering',
        employment_type: 'Full-time',
        created_by: requesterResult[0].id,
        status: 'published'
      }).returning().execute();

      const cvFileResult = await db.insert(cvFilesTable).values({
        candidate_id: candidateResult[0].id,
        file_name: 'resume.pdf',
        file_type: 'pdf',
        file_size: 1024,
        file_path: '/path/to/resume.pdf'
      }).returning().execute();

      // Create application after a small delay
      await new Promise(resolve => setTimeout(resolve, 10));
      await db.insert(applicationsTable).values({
        job_id: jobResult[0].id,
        candidate_id: candidateResult[0].id,
        cv_file_id: cvFileResult[0].id,
        status: 'pending'
      }).execute();

      const result = await getAdminDashboard();

      // Recent activity should be sorted by creation date (most recent first)
      expect(result.recentActivity).toHaveLength(2);
      expect(result.recentActivity[0].type).toBe('application'); // Most recent
      expect(result.recentActivity[1].type).toBe('job'); // Earlier
    });
  });
});