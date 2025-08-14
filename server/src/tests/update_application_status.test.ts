import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, jobsTable, cvFilesTable, applicationsTable } from '../db/schema';
import { type UpdateApplicationStatusInput } from '../schema';
import { updateApplicationStatus } from '../handlers/update_application_status';
import { eq } from 'drizzle-orm';

describe('updateApplicationStatus', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Setup test data
  const createTestData = async () => {
    // Create a candidate user
    const candidateResult = await db.insert(usersTable)
      .values({
        email: 'candidate@example.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'candidate'
      })
      .returning()
      .execute();

    // Create a requester user
    const requesterResult = await db.insert(usersTable)
      .values({
        email: 'requester@example.com',
        first_name: 'Jane',
        last_name: 'Smith',
        role: 'requester',
        department: 'Engineering'
      })
      .returning()
      .execute();

    // Create a job
    const jobResult = await db.insert(jobsTable)
      .values({
        title: 'Software Engineer',
        description: 'A software engineering position',
        requirements: 'Bachelor degree in CS',
        department: 'Engineering',
        employment_type: 'full-time',
        created_by: requesterResult[0].id
      })
      .returning()
      .execute();

    // Create a CV file
    const cvResult = await db.insert(cvFilesTable)
      .values({
        candidate_id: candidateResult[0].id,
        file_name: 'resume.pdf',
        file_type: 'pdf',
        file_size: 1024,
        file_path: '/uploads/resume.pdf'
      })
      .returning()
      .execute();

    // Create an application
    const applicationResult = await db.insert(applicationsTable)
      .values({
        job_id: jobResult[0].id,
        candidate_id: candidateResult[0].id,
        cv_file_id: cvResult[0].id,
        status: 'pending',
        cover_letter: 'I am interested in this position'
      })
      .returning()
      .execute();

    return {
      candidate: candidateResult[0],
      requester: requesterResult[0],
      job: jobResult[0],
      cvFile: cvResult[0],
      application: applicationResult[0]
    };
  };

  it('should update application status successfully', async () => {
    const testData = await createTestData();
    
    const input: UpdateApplicationStatusInput = {
      application_id: testData.application.id,
      status: 'shortlisted',
      notes: 'Candidate looks promising'
    };

    const result = await updateApplicationStatus(input);

    expect(result.id).toEqual(testData.application.id);
    expect(result.status).toEqual('shortlisted');
    expect(result.notes).toEqual('Candidate looks promising');
    expect(result.job_id).toEqual(testData.job.id);
    expect(result.candidate_id).toEqual(testData.candidate.id);
    expect(result.cv_file_id).toEqual(testData.cvFile.id);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(result.created_at.getTime());
  });

  it('should update application status without notes', async () => {
    const testData = await createTestData();
    
    const input: UpdateApplicationStatusInput = {
      application_id: testData.application.id,
      status: 'rejected',
      notes: null
    };

    const result = await updateApplicationStatus(input);

    expect(result.id).toEqual(testData.application.id);
    expect(result.status).toEqual('rejected');
    expect(result.notes).toBeNull();
  });

  it('should persist changes in database', async () => {
    const testData = await createTestData();
    
    const input: UpdateApplicationStatusInput = {
      application_id: testData.application.id,
      status: 'interview_scheduled',
      notes: 'Interview scheduled for next week'
    };

    await updateApplicationStatus(input);

    // Verify changes persisted in database
    const applications = await db.select()
      .from(applicationsTable)
      .where(eq(applicationsTable.id, testData.application.id))
      .execute();

    expect(applications).toHaveLength(1);
    expect(applications[0].status).toEqual('interview_scheduled');
    expect(applications[0].notes).toEqual('Interview scheduled for next week');
    expect(applications[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle various status transitions', async () => {
    const testData = await createTestData();
    
    // Test different status transitions
    const statusTransitions: Array<'ai_processing' | 'shortlisted' | 'interview_scheduled' | 'interviewed' | 'offer_made' | 'offer_accepted' | 'hired'> = [
      'ai_processing',
      'shortlisted',
      'interview_scheduled',
      'interviewed',
      'offer_made',
      'offer_accepted',
      'hired'
    ];

    for (const status of statusTransitions) {
      const input: UpdateApplicationStatusInput = {
        application_id: testData.application.id,
        status: status,
        notes: `Updated to ${status}`
      };

      const result = await updateApplicationStatus(input);
      expect(result.status).toEqual(status);
      expect(result.notes).toEqual(`Updated to ${status}`);
    }
  });

  it('should throw error for non-existent application', async () => {
    const input: UpdateApplicationStatusInput = {
      application_id: 99999,
      status: 'shortlisted',
      notes: 'This should fail'
    };

    await expect(updateApplicationStatus(input)).rejects.toThrow(/Application with ID 99999 not found/i);
  });

  it('should preserve existing application data', async () => {
    const testData = await createTestData();
    
    const input: UpdateApplicationStatusInput = {
      application_id: testData.application.id,
      status: 'shortlisted',
      notes: 'New notes'
    };

    const result = await updateApplicationStatus(input);

    // Verify that other fields are preserved
    expect(result.job_id).toEqual(testData.application.job_id);
    expect(result.candidate_id).toEqual(testData.application.candidate_id);
    expect(result.cv_file_id).toEqual(testData.application.cv_file_id);
    expect(result.cover_letter).toEqual(testData.application.cover_letter);
    expect(result.ai_match_score).toEqual(testData.application.ai_match_score);
    expect(result.created_at).toEqual(testData.application.created_at);
  });

  it('should handle null notes correctly', async () => {
    const testData = await createTestData();
    
    // First update with notes
    await updateApplicationStatus({
      application_id: testData.application.id,
      status: 'shortlisted',
      notes: 'Initial notes'
    });

    // Then update with null notes
    const result = await updateApplicationStatus({
      application_id: testData.application.id,
      status: 'interviewed',
      notes: null
    });

    expect(result.status).toEqual('interviewed');
    expect(result.notes).toBeNull();

    // Verify in database
    const applications = await db.select()
      .from(applicationsTable)
      .where(eq(applicationsTable.id, testData.application.id))
      .execute();

    expect(applications[0].notes).toBeNull();
  });

  it('should update timestamp correctly', async () => {
    const testData = await createTestData();
    const originalUpdatedAt = testData.application.updated_at;
    
    // Wait a small amount to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const input: UpdateApplicationStatusInput = {
      application_id: testData.application.id,
      status: 'shortlisted',
      notes: 'Updated notes'
    };

    const result = await updateApplicationStatus(input);

    expect(result.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    expect(result.created_at).toEqual(testData.application.created_at);
  });
});