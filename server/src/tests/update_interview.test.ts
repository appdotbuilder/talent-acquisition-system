import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, jobsTable, cvFilesTable, applicationsTable, interviewsTable } from '../db/schema';
import { type UpdateInterviewInput } from '../schema';
import { updateInterview } from '../handlers/update_interview';
import { eq } from 'drizzle-orm';

describe('updateInterview', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create prerequisite data
  const createTestData = async () => {
    // Create users (candidate, requester, interviewer)
    const candidate = await db.insert(usersTable)
      .values({
        email: 'candidate@test.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'candidate',
        department: 'Engineering'
      })
      .returning()
      .execute();

    const requester = await db.insert(usersTable)
      .values({
        email: 'requester@test.com',
        first_name: 'Jane',
        last_name: 'Smith',
        role: 'requester',
        department: 'HR'
      })
      .returning()
      .execute();

    const interviewer = await db.insert(usersTable)
      .values({
        email: 'interviewer@test.com',
        first_name: 'Bob',
        last_name: 'Wilson',
        role: 'requester',
        department: 'Engineering'
      })
      .returning()
      .execute();

    // Create job
    const job = await db.insert(jobsTable)
      .values({
        title: 'Software Engineer',
        description: 'A test job',
        requirements: 'Test requirements',
        department: 'Engineering',
        employment_type: 'full-time',
        created_by: requester[0].id
      })
      .returning()
      .execute();

    // Create CV file
    const cvFile = await db.insert(cvFilesTable)
      .values({
        candidate_id: candidate[0].id,
        file_name: 'resume.pdf',
        file_type: 'pdf',
        file_size: 1024,
        file_path: '/uploads/resume.pdf'
      })
      .returning()
      .execute();

    // Create application
    const application = await db.insert(applicationsTable)
      .values({
        job_id: job[0].id,
        candidate_id: candidate[0].id,
        cv_file_id: cvFile[0].id,
        status: 'interview_scheduled'
      })
      .returning()
      .execute();

    // Create interview
    const interview = await db.insert(interviewsTable)
      .values({
        application_id: application[0].id,
        interviewer_id: interviewer[0].id,
        scheduled_at: new Date('2024-01-15T10:00:00Z'),
        duration_minutes: 60,
        location: 'Conference Room A',
        status: 'scheduled'
      })
      .returning()
      .execute();

    return {
      candidate: candidate[0],
      requester: requester[0],
      interviewer: interviewer[0],
      job: job[0],
      cvFile: cvFile[0],
      application: application[0],
      interview: interview[0]
    };
  };

  it('should update interview status', async () => {
    const testData = await createTestData();
    
    const input: UpdateInterviewInput = {
      interview_id: testData.interview.id,
      status: 'completed'
    };

    const result = await updateInterview(input);

    expect(result.id).toEqual(testData.interview.id);
    expect(result.status).toEqual('completed');
    expect(result.application_id).toEqual(testData.application.id);
    expect(result.interviewer_id).toEqual(testData.interviewer.id);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > testData.interview.updated_at).toBe(true);
  });

  it('should update interview notes', async () => {
    const testData = await createTestData();
    
    const input: UpdateInterviewInput = {
      interview_id: testData.interview.id,
      notes: 'Interview went well, candidate showed strong technical skills'
    };

    const result = await updateInterview(input);

    expect(result.notes).toEqual('Interview went well, candidate showed strong technical skills');
    expect(result.status).toEqual('scheduled'); // Status unchanged
  });

  it('should update interview feedback', async () => {
    const testData = await createTestData();
    
    const input: UpdateInterviewInput = {
      interview_id: testData.interview.id,
      feedback: 'Strong candidate, recommend for next round'
    };

    const result = await updateInterview(input);

    expect(result.feedback).toEqual('Strong candidate, recommend for next round');
    expect(result.status).toEqual('scheduled'); // Status unchanged
  });

  it('should update multiple fields at once', async () => {
    const testData = await createTestData();
    
    const input: UpdateInterviewInput = {
      interview_id: testData.interview.id,
      status: 'completed',
      notes: 'Interview completed successfully',
      feedback: 'Excellent candidate, highly recommend'
    };

    const result = await updateInterview(input);

    expect(result.status).toEqual('completed');
    expect(result.notes).toEqual('Interview completed successfully');
    expect(result.feedback).toEqual('Excellent candidate, highly recommend');
  });

  it('should update application status to interviewed when interview is completed', async () => {
    const testData = await createTestData();
    
    const input: UpdateInterviewInput = {
      interview_id: testData.interview.id,
      status: 'completed'
    };

    await updateInterview(input);

    // Check that application status was updated
    const applications = await db.select()
      .from(applicationsTable)
      .where(eq(applicationsTable.id, testData.application.id))
      .execute();

    expect(applications).toHaveLength(1);
    expect(applications[0].status).toEqual('interviewed');
    expect(applications[0].updated_at).toBeInstanceOf(Date);
    expect(applications[0].updated_at > testData.application.updated_at).toBe(true);
  });

  it('should not update application status for non-completed interview status', async () => {
    const testData = await createTestData();
    
    const input: UpdateInterviewInput = {
      interview_id: testData.interview.id,
      status: 'rescheduled'
    };

    await updateInterview(input);

    // Check that application status was NOT updated
    const applications = await db.select()
      .from(applicationsTable)
      .where(eq(applicationsTable.id, testData.application.id))
      .execute();

    expect(applications).toHaveLength(1);
    expect(applications[0].status).toEqual('interview_scheduled'); // Original status
  });

  it('should handle null values for optional fields', async () => {
    const testData = await createTestData();
    
    // First set some values
    await db.update(interviewsTable)
      .set({
        notes: 'Initial notes',
        feedback: 'Initial feedback'
      })
      .where(eq(interviewsTable.id, testData.interview.id))
      .execute();

    // Then clear them with null
    const input: UpdateInterviewInput = {
      interview_id: testData.interview.id,
      notes: null,
      feedback: null
    };

    const result = await updateInterview(input);

    expect(result.notes).toBeNull();
    expect(result.feedback).toBeNull();
  });

  it('should persist changes in database', async () => {
    const testData = await createTestData();
    
    const input: UpdateInterviewInput = {
      interview_id: testData.interview.id,
      status: 'cancelled',
      notes: 'Interview cancelled due to scheduling conflict'
    };

    await updateInterview(input);

    // Verify changes are persisted
    const interviews = await db.select()
      .from(interviewsTable)
      .where(eq(interviewsTable.id, testData.interview.id))
      .execute();

    expect(interviews).toHaveLength(1);
    expect(interviews[0].status).toEqual('cancelled');
    expect(interviews[0].notes).toEqual('Interview cancelled due to scheduling conflict');
    expect(interviews[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent interview', async () => {
    const input: UpdateInterviewInput = {
      interview_id: 99999,
      status: 'completed'
    };

    await expect(updateInterview(input)).rejects.toThrow(/Interview with id 99999 not found/i);
  });
});