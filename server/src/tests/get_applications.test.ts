import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, jobsTable, cvFilesTable, applicationsTable } from '../db/schema';
import { type GetApplicationsByJobInput, type GetCandidateApplicationsInput } from '../schema';
import { getApplications, getApplicationsByJob, getCandidateApplications } from '../handlers/get_applications';
import { eq } from 'drizzle-orm';

describe('get applications handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test data
  async function createTestData() {
    // Create test users
    const candidateResult = await db.insert(usersTable).values({
      email: 'candidate@test.com',
      first_name: 'John',
      last_name: 'Doe',
      role: 'candidate',
      department: 'Engineering'
    }).returning().execute();
    const candidate = candidateResult[0];

    const candidate2Result = await db.insert(usersTable).values({
      email: 'candidate2@test.com',
      first_name: 'Jane',
      last_name: 'Smith',
      role: 'candidate',
      department: 'Marketing'
    }).returning().execute();
    const candidate2 = candidate2Result[0];

    const requesterResult = await db.insert(usersTable).values({
      email: 'requester@test.com',
      first_name: 'Bob',
      last_name: 'Manager',
      role: 'requester',
      department: 'HR'
    }).returning().execute();
    const requester = requesterResult[0];

    // Create test jobs
    const job1Result = await db.insert(jobsTable).values({
      title: 'Software Engineer',
      description: 'Build amazing software',
      requirements: 'JavaScript, Node.js',
      department: 'Engineering',
      location: 'Remote',
      salary_range: '$80k-$120k',
      employment_type: 'Full-time',
      created_by: requester.id,
      status: 'published'
    }).returning().execute();
    const job1 = job1Result[0];

    const job2Result = await db.insert(jobsTable).values({
      title: 'Marketing Manager',
      description: 'Lead marketing campaigns',
      requirements: 'Marketing experience',
      department: 'Marketing',
      location: 'New York',
      salary_range: '$70k-$100k',
      employment_type: 'Full-time',
      created_by: requester.id,
      status: 'published'
    }).returning().execute();
    const job2 = job2Result[0];

    // Create test CV files
    const cvFile1Result = await db.insert(cvFilesTable).values({
      candidate_id: candidate.id,
      file_name: 'john_doe_cv.pdf',
      file_type: 'pdf',
      file_size: 1024000,
      file_path: '/uploads/cv/john_doe_cv.pdf'
    }).returning().execute();
    const cvFile1 = cvFile1Result[0];

    const cvFile2Result = await db.insert(cvFilesTable).values({
      candidate_id: candidate2.id,
      file_name: 'jane_smith_cv.pdf',
      file_type: 'pdf',
      file_size: 2048000,
      file_path: '/uploads/cv/jane_smith_cv.pdf'
    }).returning().execute();
    const cvFile2 = cvFile2Result[0];

    // Create test applications
    const application1Result = await db.insert(applicationsTable).values({
      job_id: job1.id,
      candidate_id: candidate.id,
      cv_file_id: cvFile1.id,
      status: 'pending',
      ai_match_score: 85,
      cover_letter: 'I am very interested in this position'
    }).returning().execute();
    const application1 = application1Result[0];

    const application2Result = await db.insert(applicationsTable).values({
      job_id: job1.id,
      candidate_id: candidate2.id,
      cv_file_id: cvFile2.id,
      status: 'shortlisted',
      ai_match_score: 92,
      cover_letter: 'Perfect fit for this role'
    }).returning().execute();
    const application2 = application2Result[0];

    const application3Result = await db.insert(applicationsTable).values({
      job_id: job2.id,
      candidate_id: candidate.id,
      cv_file_id: cvFile1.id,
      status: 'rejected',
      ai_match_score: 45,
      cover_letter: 'Exploring new opportunities'
    }).returning().execute();
    const application3 = application3Result[0];

    return {
      candidate,
      candidate2,
      requester,
      job1,
      job2,
      cvFile1,
      cvFile2,
      application1,
      application2,
      application3
    };
  }

  describe('getApplications', () => {
    it('should fetch all applications ordered by creation date', async () => {
      const testData = await createTestData();

      const results = await getApplications();

      // Should return all applications
      expect(results).toHaveLength(3);

      // Should be ordered by created_at descending (newest first)
      expect(results[0].id).toEqual(testData.application3.id);
      expect(results[1].id).toEqual(testData.application2.id);
      expect(results[2].id).toEqual(testData.application1.id);

      // Verify all fields are present
      const firstApp = results[0];
      expect(firstApp.job_id).toEqual(testData.job2.id);
      expect(firstApp.candidate_id).toEqual(testData.candidate.id);
      expect(firstApp.status).toEqual('rejected');
      expect(firstApp.ai_match_score).toEqual(45);
      expect(firstApp.cover_letter).toEqual('Exploring new opportunities');
      expect(firstApp.created_at).toBeInstanceOf(Date);
      expect(firstApp.updated_at).toBeInstanceOf(Date);
    });

    it('should return empty array when no applications exist', async () => {
      const results = await getApplications();
      expect(results).toHaveLength(0);
    });

    it('should handle applications with null values correctly', async () => {
      const testData = await createTestData();

      // Create application with null values
      await db.insert(applicationsTable).values({
        job_id: testData.job1.id,
        candidate_id: testData.candidate.id,
        cv_file_id: testData.cvFile1.id,
        status: 'pending',
        ai_match_score: null,
        cover_letter: null,
        notes: null
      }).execute();

      const results = await getApplications();
      expect(results).toHaveLength(4);

      const appWithNulls = results.find(app => app.ai_match_score === null);
      expect(appWithNulls).toBeDefined();
      expect(appWithNulls!.cover_letter).toBeNull();
      expect(appWithNulls!.notes).toBeNull();
    });
  });

  describe('getApplicationsByJob', () => {
    it('should fetch applications for specific job ordered by AI score and creation date', async () => {
      const testData = await createTestData();

      const input: GetApplicationsByJobInput = {
        job_id: testData.job1.id
      };

      const results = await getApplicationsByJob(input);

      // Should return only applications for job1
      expect(results).toHaveLength(2);
      expect(results.every(app => app.job_id === testData.job1.id)).toBe(true);

      // Should be ordered by AI match score descending, then by created_at descending
      expect(results[0].ai_match_score).toEqual(92); // application2
      expect(results[1].ai_match_score).toEqual(85); // application1

      // Verify correct applications
      expect(results[0].candidate_id).toEqual(testData.candidate2.id);
      expect(results[0].status).toEqual('shortlisted');
      expect(results[1].candidate_id).toEqual(testData.candidate.id);
      expect(results[1].status).toEqual('pending');
    });

    it('should return empty array for job with no applications', async () => {
      const testData = await createTestData();

      // Create a job with no applications
      const jobWithNoAppsResult = await db.insert(jobsTable).values({
        title: 'Empty Job',
        description: 'No applications',
        requirements: 'None',
        department: 'Test',
        employment_type: 'Full-time',
        created_by: testData.requester.id,
        status: 'published'
      }).returning().execute();

      const input: GetApplicationsByJobInput = {
        job_id: jobWithNoAppsResult[0].id
      };

      const results = await getApplicationsByJob(input);
      expect(results).toHaveLength(0);
    });

    it('should handle applications with null AI scores correctly', async () => {
      const testData = await createTestData();

      // Create application with null AI score
      await db.insert(applicationsTable).values({
        job_id: testData.job1.id,
        candidate_id: testData.candidate.id,
        cv_file_id: testData.cvFile1.id,
        status: 'ai_processing',
        ai_match_score: null
      }).execute();

      const input: GetApplicationsByJobInput = {
        job_id: testData.job1.id
      };

      const results = await getApplicationsByJob(input);

      expect(results).toHaveLength(3);
      
      // Find applications by their specific characteristics
      const highScoreApp = results.find(app => app.ai_match_score === 92);
      const mediumScoreApp = results.find(app => app.ai_match_score === 85);
      const nullScoreApp = results.find(app => app.ai_match_score === null);

      expect(highScoreApp).toBeDefined();
      expect(mediumScoreApp).toBeDefined();
      expect(nullScoreApp).toBeDefined();

      // Verify that non-null scores come before null scores in the ordering
      const highScoreIndex = results.findIndex(app => app.ai_match_score === 92);
      const nullScoreIndex = results.findIndex(app => app.ai_match_score === null);
      expect(highScoreIndex).toBeLessThan(nullScoreIndex);
    });

    it('should validate job exists through database constraint', async () => {
      const input: GetApplicationsByJobInput = {
        job_id: 99999 // Non-existent job
      };

      // Should not throw error, just return empty results
      const results = await getApplicationsByJob(input);
      expect(results).toHaveLength(0);
    });
  });

  describe('getCandidateApplications', () => {
    it('should fetch all applications for specific candidate ordered by creation date', async () => {
      const testData = await createTestData();

      const input: GetCandidateApplicationsInput = {
        candidate_id: testData.candidate.id
      };

      const results = await getCandidateApplications(input);

      // Candidate has 2 applications
      expect(results).toHaveLength(2);
      expect(results.every(app => app.candidate_id === testData.candidate.id)).toBe(true);

      // Should be ordered by created_at descending (newest first)
      expect(results[0].job_id).toEqual(testData.job2.id); // application3 (most recent)
      expect(results[1].job_id).toEqual(testData.job1.id); // application1

      // Verify statuses and other fields
      expect(results[0].status).toEqual('rejected');
      expect(results[0].ai_match_score).toEqual(45);
      expect(results[1].status).toEqual('pending');
      expect(results[1].ai_match_score).toEqual(85);
    });

    it('should return empty array for candidate with no applications', async () => {
      const testData = await createTestData();

      // Create candidate with no applications
      const candidateWithNoAppsResult = await db.insert(usersTable).values({
        email: 'noapps@test.com',
        first_name: 'No',
        last_name: 'Apps',
        role: 'candidate',
        department: 'Test'
      }).returning().execute();

      const input: GetCandidateApplicationsInput = {
        candidate_id: candidateWithNoAppsResult[0].id
      };

      const results = await getCandidateApplications(input);
      expect(results).toHaveLength(0);
    });

    it('should show application history across different job statuses', async () => {
      const testData = await createTestData();

      // Create additional application with different status
      await db.insert(applicationsTable).values({
        job_id: testData.job2.id,
        candidate_id: testData.candidate.id,
        cv_file_id: testData.cvFile1.id,
        status: 'interview_scheduled',
        ai_match_score: 78,
        notes: 'Good candidate for interview'
      }).execute();

      const input: GetCandidateApplicationsInput = {
        candidate_id: testData.candidate.id
      };

      const results = await getCandidateApplications(input);

      expect(results).toHaveLength(3);
      
      // Verify different statuses are included
      const statuses = results.map(app => app.status);
      expect(statuses).toContain('pending');
      expect(statuses).toContain('rejected');
      expect(statuses).toContain('interview_scheduled');
    });

    it('should validate candidate exists through database constraint', async () => {
      const input: GetCandidateApplicationsInput = {
        candidate_id: 99999 // Non-existent candidate
      };

      // Should not throw error, just return empty results
      const results = await getCandidateApplications(input);
      expect(results).toHaveLength(0);
    });
  });

  // Integration tests
  describe('integration scenarios', () => {
    it('should handle multiple jobs and candidates correctly', async () => {
      const testData = await createTestData();

      // Test all handlers with the same dataset
      const allApps = await getApplications();
      const job1Apps = await getApplicationsByJob({ job_id: testData.job1.id });
      const candidate1Apps = await getCandidateApplications({ candidate_id: testData.candidate.id });

      // Verify counts
      expect(allApps).toHaveLength(3);
      expect(job1Apps).toHaveLength(2);
      expect(candidate1Apps).toHaveLength(2);

      // Verify no duplicates in results
      const allAppIds = allApps.map(app => app.id);
      expect(new Set(allAppIds)).toHaveProperty('size', allAppIds.length);

      // Verify consistent data across handlers
      const job1AppFromAll = allApps.find(app => app.id === testData.application1.id);
      const job1AppDirect = job1Apps.find(app => app.id === testData.application1.id);
      const job1AppFromCandidate = candidate1Apps.find(app => app.id === testData.application1.id);

      expect(job1AppFromAll).toBeDefined();
      expect(job1AppDirect).toBeDefined();
      expect(job1AppFromCandidate).toBeDefined();
      
      // TypeScript assertions after null checks
      expect(job1AppFromAll!).toEqual(job1AppDirect!);
      expect(job1AppFromAll!).toEqual(job1AppFromCandidate!);
    });
  });
});