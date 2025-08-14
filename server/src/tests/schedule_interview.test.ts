import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  interviewsTable, 
  applicationsTable, 
  usersTable, 
  jobsTable, 
  cvFilesTable,
  notificationsTable 
} from '../db/schema';
import { type ScheduleInterviewInput } from '../schema';
import { scheduleInterview } from '../handlers/schedule_interview';
import { eq } from 'drizzle-orm';

describe('scheduleInterview', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let candidateId: number;
  let interviewerId: number;
  let applicationId: number;
  let cvFileId: number;
  let jobId: number;

  // Test input
  const testInput: ScheduleInterviewInput = {
    application_id: 0, // Will be set in beforeEach
    interviewer_id: 0, // Will be set in beforeEach
    scheduled_at: new Date('2024-02-01T10:00:00Z'),
    duration_minutes: 60,
    location: 'Conference Room A',
    meeting_link: 'https://meet.example.com/interview123'
  };

  beforeEach(async () => {
    // Create candidate user
    const candidateResult = await db.insert(usersTable)
      .values({
        email: 'candidate@test.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'candidate',
        department: null,
        phone: '+1234567890'
      })
      .returning()
      .execute();
    candidateId = candidateResult[0].id;

    // Create interviewer user
    const interviewerResult = await db.insert(usersTable)
      .values({
        email: 'interviewer@test.com',
        first_name: 'Jane',
        last_name: 'Smith',
        role: 'admin',
        department: 'HR',
        phone: '+1987654321'
      })
      .returning()
      .execute();
    interviewerId = interviewerResult[0].id;

    // Create requester user for job creation
    const requesterResult = await db.insert(usersTable)
      .values({
        email: 'requester@test.com',
        first_name: 'Bob',
        last_name: 'Manager',
        role: 'requester',
        department: 'Engineering',
        phone: null
      })
      .returning()
      .execute();

    // Create a job
    const jobResult = await db.insert(jobsTable)
      .values({
        title: 'Software Engineer',
        description: 'Join our engineering team',
        requirements: 'Bachelor degree in CS',
        department: 'Engineering',
        location: 'San Francisco',
        salary_range: '$80k-120k',
        employment_type: 'full-time',
        created_by: requesterResult[0].id,
        status: 'published'
      })
      .returning()
      .execute();
    jobId = jobResult[0].id;

    // Create CV file
    const cvFileResult = await db.insert(cvFilesTable)
      .values({
        candidate_id: candidateId,
        file_name: 'resume.pdf',
        file_type: 'pdf',
        file_size: 1024000,
        file_path: '/uploads/resume.pdf'
      })
      .returning()
      .execute();
    cvFileId = cvFileResult[0].id;

    // Create application
    const applicationResult = await db.insert(applicationsTable)
      .values({
        job_id: jobId,
        candidate_id: candidateId,
        cv_file_id: cvFileId,
        status: 'shortlisted',
        cover_letter: 'I am interested in this position'
      })
      .returning()
      .execute();
    applicationId = applicationResult[0].id;

    // Set the IDs in test input
    testInput.application_id = applicationId;
    testInput.interviewer_id = interviewerId;
  });

  it('should schedule an interview successfully', async () => {
    const result = await scheduleInterview(testInput);

    // Verify interview record
    expect(result.id).toBeDefined();
    expect(result.application_id).toEqual(applicationId);
    expect(result.interviewer_id).toEqual(interviewerId);
    expect(result.scheduled_at).toEqual(testInput.scheduled_at);
    expect(result.duration_minutes).toEqual(60);
    expect(result.location).toEqual('Conference Room A');
    expect(result.meeting_link).toEqual('https://meet.example.com/interview123');
    expect(result.status).toEqual('scheduled');
    expect(result.notes).toBeNull();
    expect(result.feedback).toBeNull();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save interview to database', async () => {
    const result = await scheduleInterview(testInput);

    const interviews = await db.select()
      .from(interviewsTable)
      .where(eq(interviewsTable.id, result.id))
      .execute();

    expect(interviews).toHaveLength(1);
    const interview = interviews[0];
    expect(interview.application_id).toEqual(applicationId);
    expect(interview.interviewer_id).toEqual(interviewerId);
    expect(interview.scheduled_at).toEqual(testInput.scheduled_at);
    expect(interview.duration_minutes).toEqual(60);
    expect(interview.location).toEqual('Conference Room A');
    expect(interview.meeting_link).toEqual('https://meet.example.com/interview123');
    expect(interview.status).toEqual('scheduled');
  });

  it('should update application status to interview_scheduled', async () => {
    await scheduleInterview(testInput);

    const applications = await db.select()
      .from(applicationsTable)
      .where(eq(applicationsTable.id, applicationId))
      .execute();

    expect(applications).toHaveLength(1);
    expect(applications[0].status).toEqual('interview_scheduled');
    expect(applications[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create notifications for candidate and interviewer', async () => {
    await scheduleInterview(testInput);

    // Check candidate notification
    const candidateNotifications = await db.select()
      .from(notificationsTable)
      .where(eq(notificationsTable.user_id, candidateId))
      .execute();

    expect(candidateNotifications).toHaveLength(1);
    expect(candidateNotifications[0].type).toEqual('interview_invitation');
    expect(candidateNotifications[0].title).toEqual('Interview Scheduled');
    expect(candidateNotifications[0].message).toContain('interview has been scheduled');
    expect(candidateNotifications[0].email_sent).toBe(false);

    // Check interviewer notification
    const interviewerNotifications = await db.select()
      .from(notificationsTable)
      .where(eq(notificationsTable.user_id, interviewerId))
      .execute();

    expect(interviewerNotifications).toHaveLength(1);
    expect(interviewerNotifications[0].type).toEqual('interview_invitation');
    expect(interviewerNotifications[0].title).toEqual('Interview Assignment');
    expect(interviewerNotifications[0].message).toContain('assigned to conduct an interview');
    expect(interviewerNotifications[0].email_sent).toBe(false);
  });

  it('should handle interview with only required fields', async () => {
    const minimalInput: ScheduleInterviewInput = {
      application_id: applicationId,
      interviewer_id: interviewerId,
      scheduled_at: new Date('2024-02-15T14:00:00Z'),
      duration_minutes: 45,
      location: null,
      meeting_link: null
    };

    const result = await scheduleInterview(minimalInput);

    expect(result.location).toBeNull();
    expect(result.meeting_link).toBeNull();
    expect(result.duration_minutes).toEqual(45);
    expect(result.scheduled_at).toEqual(minimalInput.scheduled_at);
  });

  it('should throw error for non-existent application', async () => {
    const invalidInput = {
      ...testInput,
      application_id: 99999
    };

    expect(scheduleInterview(invalidInput)).rejects.toThrow(/Application with ID 99999 not found/i);
  });

  it('should throw error for non-existent interviewer', async () => {
    const invalidInput = {
      ...testInput,
      interviewer_id: 99999
    };

    expect(scheduleInterview(invalidInput)).rejects.toThrow(/Interviewer with ID 99999 not found/i);
  });

  it('should handle virtual meeting link format', async () => {
    const virtualInput = {
      ...testInput,
      location: null,
      meeting_link: 'https://zoom.us/j/123456789'
    };

    const result = await scheduleInterview(virtualInput);

    expect(result.location).toBeNull();
    expect(result.meeting_link).toEqual('https://zoom.us/j/123456789');
    
    // Verify notification mentions virtual meeting
    const candidateNotifications = await db.select()
      .from(notificationsTable)
      .where(eq(notificationsTable.user_id, candidateId))
      .execute();
    
    expect(candidateNotifications[0].message).toContain('interview has been scheduled');
  });

  it('should handle long duration interviews', async () => {
    const longInput = {
      ...testInput,
      duration_minutes: 180 // 3 hours
    };

    const result = await scheduleInterview(longInput);

    expect(result.duration_minutes).toEqual(180);
  });
});