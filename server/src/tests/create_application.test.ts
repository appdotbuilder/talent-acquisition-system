import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { applicationsTable, usersTable, jobsTable, cvFilesTable } from '../db/schema';
import { type CreateApplicationInput } from '../schema';
import { createApplication } from '../handlers/create_application';
import { eq } from 'drizzle-orm';

describe('createApplication', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Create test data before each test
  let candidateId: number;
  let requesterId: number;
  let jobId: number;
  let cvFileId: number;

  const setupTestData = async () => {
    // Create a candidate user
    const candidateResult = await db.insert(usersTable)
      .values({
        email: 'candidate@test.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'candidate',
        department: null,
        phone: null
      })
      .returning()
      .execute();
    candidateId = candidateResult[0].id;

    // Create a requester user
    const requesterResult = await db.insert(usersTable)
      .values({
        email: 'requester@test.com',
        first_name: 'Jane',
        last_name: 'Smith',
        role: 'requester',
        department: 'Engineering',
        phone: null
      })
      .returning()
      .execute();
    requesterId = requesterResult[0].id;

    // Create a job
    const jobResult = await db.insert(jobsTable)
      .values({
        title: 'Software Engineer',
        description: 'A great software engineering position',
        requirements: 'Bachelor\'s degree in Computer Science',
        department: 'Engineering',
        location: 'San Francisco',
        salary_range: '$80,000 - $120,000',
        employment_type: 'Full-time',
        status: 'published',
        created_by: requesterId,
        approved_by: null
      })
      .returning()
      .execute();
    jobId = jobResult[0].id;

    // Create a CV file
    const cvFileResult = await db.insert(cvFilesTable)
      .values({
        candidate_id: candidateId,
        file_name: 'john_doe_resume.pdf',
        file_type: 'pdf',
        file_size: 1024000,
        file_path: '/uploads/john_doe_resume.pdf'
      })
      .returning()
      .execute();
    cvFileId = cvFileResult[0].id;
  };

  it('should create an application with all required fields', async () => {
    await setupTestData();

    const testInput: CreateApplicationInput = {
      job_id: jobId,
      candidate_id: candidateId,
      cv_file_id: cvFileId,
      cover_letter: 'I am very interested in this position.'
    };

    const result = await createApplication(testInput);

    // Basic field validation
    expect(result.job_id).toEqual(jobId);
    expect(result.candidate_id).toEqual(candidateId);
    expect(result.cv_file_id).toEqual(cvFileId);
    expect(result.cover_letter).toEqual('I am very interested in this position.');
    expect(result.status).toEqual('pending');
    expect(result.ai_parsed_data_id).toBeNull();
    expect(result.ai_match_score).toBeNull();
    expect(result.notes).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create an application without cover letter', async () => {
    await setupTestData();

    const testInput: CreateApplicationInput = {
      job_id: jobId,
      candidate_id: candidateId,
      cv_file_id: cvFileId,
      cover_letter: null
    };

    const result = await createApplication(testInput);

    expect(result.job_id).toEqual(jobId);
    expect(result.candidate_id).toEqual(candidateId);
    expect(result.cv_file_id).toEqual(cvFileId);
    expect(result.cover_letter).toBeNull();
    expect(result.status).toEqual('pending');
  });

  it('should save application to database', async () => {
    await setupTestData();

    const testInput: CreateApplicationInput = {
      job_id: jobId,
      candidate_id: candidateId,
      cv_file_id: cvFileId,
      cover_letter: 'Test cover letter'
    };

    const result = await createApplication(testInput);

    // Query the database to verify the application was saved
    const applications = await db.select()
      .from(applicationsTable)
      .where(eq(applicationsTable.id, result.id))
      .execute();

    expect(applications).toHaveLength(1);
    expect(applications[0].job_id).toEqual(jobId);
    expect(applications[0].candidate_id).toEqual(candidateId);
    expect(applications[0].cv_file_id).toEqual(cvFileId);
    expect(applications[0].cover_letter).toEqual('Test cover letter');
    expect(applications[0].status).toEqual('pending');
    expect(applications[0].created_at).toBeInstanceOf(Date);
    expect(applications[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when job does not exist', async () => {
    await setupTestData();

    const testInput: CreateApplicationInput = {
      job_id: 99999, // Non-existent job ID
      candidate_id: candidateId,
      cv_file_id: cvFileId,
      cover_letter: 'Test cover letter'
    };

    await expect(createApplication(testInput)).rejects.toThrow(/job not found/i);
  });

  it('should throw error when candidate does not exist', async () => {
    await setupTestData();

    const testInput: CreateApplicationInput = {
      job_id: jobId,
      candidate_id: 99999, // Non-existent candidate ID
      cv_file_id: cvFileId,
      cover_letter: 'Test cover letter'
    };

    await expect(createApplication(testInput)).rejects.toThrow(/candidate not found/i);
  });

  it('should throw error when CV file does not exist', async () => {
    await setupTestData();

    const testInput: CreateApplicationInput = {
      job_id: jobId,
      candidate_id: candidateId,
      cv_file_id: 99999, // Non-existent CV file ID
      cover_letter: 'Test cover letter'
    };

    await expect(createApplication(testInput)).rejects.toThrow(/cv file not found/i);
  });

  it('should throw error when CV file does not belong to candidate', async () => {
    await setupTestData();

    // Create another candidate
    const anotherCandidateResult = await db.insert(usersTable)
      .values({
        email: 'another@test.com',
        first_name: 'Alice',
        last_name: 'Johnson',
        role: 'candidate',
        department: null,
        phone: null
      })
      .returning()
      .execute();
    const anotherCandidateId = anotherCandidateResult[0].id;

    const testInput: CreateApplicationInput = {
      job_id: jobId,
      candidate_id: anotherCandidateId, // Different candidate
      cv_file_id: cvFileId, // CV file belongs to original candidate
      cover_letter: 'Test cover letter'
    };

    await expect(createApplication(testInput)).rejects.toThrow(/cv file does not belong to the specified candidate/i);
  });

  it('should allow multiple applications from same candidate to different jobs', async () => {
    await setupTestData();

    // Create another job
    const secondJobResult = await db.insert(jobsTable)
      .values({
        title: 'Senior Software Engineer',
        description: 'A senior software engineering position',
        requirements: 'Master\'s degree in Computer Science',
        department: 'Engineering',
        location: 'New York',
        salary_range: '$100,000 - $150,000',
        employment_type: 'Full-time',
        status: 'published',
        created_by: requesterId,
        approved_by: null
      })
      .returning()
      .execute();
    const secondJobId = secondJobResult[0].id;

    // Create first application
    const firstInput: CreateApplicationInput = {
      job_id: jobId,
      candidate_id: candidateId,
      cv_file_id: cvFileId,
      cover_letter: 'First application'
    };

    const firstResult = await createApplication(firstInput);

    // Create second application to different job
    const secondInput: CreateApplicationInput = {
      job_id: secondJobId,
      candidate_id: candidateId,
      cv_file_id: cvFileId,
      cover_letter: 'Second application'
    };

    const secondResult = await createApplication(secondInput);

    expect(firstResult.id).not.toEqual(secondResult.id);
    expect(firstResult.job_id).toEqual(jobId);
    expect(secondResult.job_id).toEqual(secondJobId);
    expect(firstResult.candidate_id).toEqual(candidateId);
    expect(secondResult.candidate_id).toEqual(candidateId);

    // Verify both applications exist in database
    const applications = await db.select()
      .from(applicationsTable)
      .where(eq(applicationsTable.candidate_id, candidateId))
      .execute();

    expect(applications).toHaveLength(2);
  });
});