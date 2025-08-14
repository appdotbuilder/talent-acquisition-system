import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, jobsTable, cvFilesTable, applicationsTable, interviewsTable } from '../db/schema';
import { type CreateUserInput, type CreateJobInput, type UploadCVInput, type CreateApplicationInput, type ScheduleInterviewInput } from '../schema';
import { getInterviews, getInterviewsByCandidate, getInterviewsByInterviewer } from '../handlers/get_interviews';

// Test data setup
const testUser: CreateUserInput = {
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  role: 'candidate',
  department: null,
  phone: '+1234567890'
};

const testInterviewer: CreateUserInput = {
  email: 'interviewer@example.com',
  first_name: 'John',
  last_name: 'Interviewer',
  role: 'requester',
  department: 'Engineering',
  phone: '+1234567891'
};

const testJob: CreateJobInput = {
  title: 'Software Engineer',
  description: 'A great software engineering position',
  requirements: 'Experience with TypeScript',
  department: 'Engineering',
  location: 'Remote',
  salary_range: '$80,000 - $120,000',
  employment_type: 'Full-time',
  created_by: 1 // Will be set to actual user ID
};

const testCV: UploadCVInput = {
  candidate_id: 1, // Will be set to actual user ID
  file_name: 'resume.pdf',
  file_type: 'pdf',
  file_size: 1024000,
  file_path: '/uploads/resume.pdf'
};

const testApplication: CreateApplicationInput = {
  job_id: 1, // Will be set to actual job ID
  candidate_id: 1, // Will be set to actual user ID
  cv_file_id: 1, // Will be set to actual CV ID
  cover_letter: 'I am interested in this position'
};

describe('getInterviews', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no interviews exist', async () => {
    const results = await getInterviews();
    expect(results).toEqual([]);
  });

  it('should fetch all interviews ordered by scheduled date', async () => {
    // Create prerequisite data
    const [user] = await db.insert(usersTable).values(testUser).returning().execute();
    const [interviewer] = await db.insert(usersTable).values(testInterviewer).returning().execute();
    const [job] = await db.insert(jobsTable).values({ ...testJob, created_by: user.id }).returning().execute();
    const [cvFile] = await db.insert(cvFilesTable).values({ ...testCV, candidate_id: user.id }).returning().execute();
    const [application] = await db.insert(applicationsTable).values({
      ...testApplication,
      job_id: job.id,
      candidate_id: user.id,
      cv_file_id: cvFile.id
    }).returning().execute();

    // Create interviews with different scheduled dates
    const interview1: ScheduleInterviewInput = {
      application_id: application.id,
      interviewer_id: interviewer.id,
      scheduled_at: new Date('2024-01-15T10:00:00Z'),
      duration_minutes: 60,
      location: 'Office Room 1',
      meeting_link: null
    };

    const interview2: ScheduleInterviewInput = {
      application_id: application.id,
      interviewer_id: interviewer.id,
      scheduled_at: new Date('2024-01-10T14:00:00Z'),
      duration_minutes: 45,
      location: null,
      meeting_link: 'https://zoom.us/j/123456789'
    };

    await db.insert(interviewsTable).values([
      {
        ...interview1,
        status: 'scheduled'
      },
      {
        ...interview2,
        status: 'completed'
      }
    ]).execute();

    const results = await getInterviews();

    expect(results).toHaveLength(2);
    
    // Should be ordered by scheduled_at descending (most recent first)
    expect(results[0].scheduled_at.getTime()).toBeGreaterThan(results[1].scheduled_at.getTime());
    expect(results[0].location).toEqual('Office Room 1');
    expect(results[0].duration_minutes).toEqual(60);
    expect(results[0].status).toEqual('scheduled');
    
    expect(results[1].meeting_link).toEqual('https://zoom.us/j/123456789');
    expect(results[1].duration_minutes).toEqual(45);
    expect(results[1].status).toEqual('completed');
  });

  it('should return interviews with all expected fields', async () => {
    // Create prerequisite data
    const [user] = await db.insert(usersTable).values(testUser).returning().execute();
    const [interviewer] = await db.insert(usersTable).values(testInterviewer).returning().execute();
    const [job] = await db.insert(jobsTable).values({ ...testJob, created_by: user.id }).returning().execute();
    const [cvFile] = await db.insert(cvFilesTable).values({ ...testCV, candidate_id: user.id }).returning().execute();
    const [application] = await db.insert(applicationsTable).values({
      ...testApplication,
      job_id: job.id,
      candidate_id: user.id,
      cv_file_id: cvFile.id
    }).returning().execute();

    const interview: ScheduleInterviewInput = {
      application_id: application.id,
      interviewer_id: interviewer.id,
      scheduled_at: new Date('2024-01-15T10:00:00Z'),
      duration_minutes: 60,
      location: 'Office Room 1',
      meeting_link: 'https://zoom.us/j/123456789'
    };

    await db.insert(interviewsTable).values({
      ...interview,
      status: 'scheduled',
      notes: 'Initial technical interview',
      feedback: null
    }).execute();

    const results = await getInterviews();

    expect(results).toHaveLength(1);
    const result = results[0];
    
    expect(result.id).toBeDefined();
    expect(result.application_id).toEqual(application.id);
    expect(result.interviewer_id).toEqual(interviewer.id);
    expect(result.scheduled_at).toBeInstanceOf(Date);
    expect(result.duration_minutes).toEqual(60);
    expect(result.location).toEqual('Office Room 1');
    expect(result.meeting_link).toEqual('https://zoom.us/j/123456789');
    expect(result.status).toEqual('scheduled');
    expect(result.notes).toEqual('Initial technical interview');
    expect(result.feedback).toBeNull();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });
});

describe('getInterviewsByCandidate', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when candidate has no interviews', async () => {
    const results = await getInterviewsByCandidate(999);
    expect(results).toEqual([]);
  });

  it('should fetch interviews for specific candidate', async () => {
    // Create two candidates
    const [candidate1] = await db.insert(usersTable).values({
      ...testUser,
      email: 'candidate1@example.com'
    }).returning().execute();
    
    const [candidate2] = await db.insert(usersTable).values({
      ...testUser,
      email: 'candidate2@example.com'
    }).returning().execute();

    const [interviewer] = await db.insert(usersTable).values(testInterviewer).returning().execute();
    const [job] = await db.insert(jobsTable).values({ ...testJob, created_by: interviewer.id }).returning().execute();
    
    // Create CVs for both candidates
    const [cvFile1] = await db.insert(cvFilesTable).values({ ...testCV, candidate_id: candidate1.id }).returning().execute();
    const [cvFile2] = await db.insert(cvFilesTable).values({ ...testCV, candidate_id: candidate2.id }).returning().execute();
    
    // Create applications for both candidates
    const [application1] = await db.insert(applicationsTable).values({
      ...testApplication,
      job_id: job.id,
      candidate_id: candidate1.id,
      cv_file_id: cvFile1.id
    }).returning().execute();
    
    const [application2] = await db.insert(applicationsTable).values({
      ...testApplication,
      job_id: job.id,
      candidate_id: candidate2.id,
      cv_file_id: cvFile2.id
    }).returning().execute();

    // Create interviews for both candidates
    await db.insert(interviewsTable).values([
      {
        application_id: application1.id,
        interviewer_id: interviewer.id,
        scheduled_at: new Date('2024-01-15T10:00:00Z'),
        duration_minutes: 60,
        location: 'Room 1',
        meeting_link: null,
        status: 'scheduled'
      },
      {
        application_id: application1.id,
        interviewer_id: interviewer.id,
        scheduled_at: new Date('2024-01-10T14:00:00Z'),
        duration_minutes: 45,
        location: null,
        meeting_link: 'https://zoom.us/j/123',
        status: 'completed'
      },
      {
        application_id: application2.id,
        interviewer_id: interviewer.id,
        scheduled_at: new Date('2024-01-12T09:00:00Z'),
        duration_minutes: 30,
        location: 'Room 2',
        meeting_link: null,
        status: 'scheduled'
      }
    ]).execute();

    const results = await getInterviewsByCandidate(candidate1.id);

    expect(results).toHaveLength(2);
    
    // Should be ordered by scheduled_at descending
    expect(results[0].scheduled_at.getTime()).toBeGreaterThan(results[1].scheduled_at.getTime());
    expect(results[0].location).toEqual('Room 1');
    expect(results[0].duration_minutes).toEqual(60);
    
    expect(results[1].meeting_link).toEqual('https://zoom.us/j/123');
    expect(results[1].duration_minutes).toEqual(45);

    // Verify candidate2's interviews are not included
    const candidate2Results = await getInterviewsByCandidate(candidate2.id);
    expect(candidate2Results).toHaveLength(1);
    expect(candidate2Results[0].location).toEqual('Room 2');
  });

  it('should return interviews with all fields for candidate', async () => {
    // Create prerequisite data
    const [candidate] = await db.insert(usersTable).values(testUser).returning().execute();
    const [interviewer] = await db.insert(usersTable).values(testInterviewer).returning().execute();
    const [job] = await db.insert(jobsTable).values({ ...testJob, created_by: interviewer.id }).returning().execute();
    const [cvFile] = await db.insert(cvFilesTable).values({ ...testCV, candidate_id: candidate.id }).returning().execute();
    const [application] = await db.insert(applicationsTable).values({
      ...testApplication,
      job_id: job.id,
      candidate_id: candidate.id,
      cv_file_id: cvFile.id
    }).returning().execute();

    await db.insert(interviewsTable).values({
      application_id: application.id,
      interviewer_id: interviewer.id,
      scheduled_at: new Date('2024-01-15T10:00:00Z'),
      duration_minutes: 60,
      location: 'Office Room 1',
      meeting_link: 'https://zoom.us/j/123456789',
      status: 'scheduled',
      notes: 'Technical interview',
      feedback: null
    }).execute();

    const results = await getInterviewsByCandidate(candidate.id);

    expect(results).toHaveLength(1);
    const result = results[0];
    
    // Verify all fields are present
    expect(result.id).toBeDefined();
    expect(result.application_id).toEqual(application.id);
    expect(result.interviewer_id).toEqual(interviewer.id);
    expect(result.scheduled_at).toBeInstanceOf(Date);
    expect(result.duration_minutes).toEqual(60);
    expect(result.location).toEqual('Office Room 1');
    expect(result.meeting_link).toEqual('https://zoom.us/j/123456789');
    expect(result.status).toEqual('scheduled');
    expect(result.notes).toEqual('Technical interview');
    expect(result.feedback).toBeNull();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });
});

describe('getInterviewsByInterviewer', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when interviewer has no interviews', async () => {
    const results = await getInterviewsByInterviewer(999);
    expect(results).toEqual([]);
  });

  it('should fetch interviews for specific interviewer', async () => {
    // Create two interviewers
    const [interviewer1] = await db.insert(usersTable).values({
      ...testInterviewer,
      email: 'interviewer1@example.com'
    }).returning().execute();
    
    const [interviewer2] = await db.insert(usersTable).values({
      ...testInterviewer,
      email: 'interviewer2@example.com'
    }).returning().execute();

    const [candidate] = await db.insert(usersTable).values(testUser).returning().execute();
    const [job] = await db.insert(jobsTable).values({ ...testJob, created_by: interviewer1.id }).returning().execute();
    const [cvFile] = await db.insert(cvFilesTable).values({ ...testCV, candidate_id: candidate.id }).returning().execute();
    const [application] = await db.insert(applicationsTable).values({
      ...testApplication,
      job_id: job.id,
      candidate_id: candidate.id,
      cv_file_id: cvFile.id
    }).returning().execute();

    // Create interviews for both interviewers
    await db.insert(interviewsTable).values([
      {
        application_id: application.id,
        interviewer_id: interviewer1.id,
        scheduled_at: new Date('2024-01-15T10:00:00Z'),
        duration_minutes: 60,
        location: 'Room 1',
        meeting_link: null,
        status: 'scheduled'
      },
      {
        application_id: application.id,
        interviewer_id: interviewer1.id,
        scheduled_at: new Date('2024-01-10T14:00:00Z'),
        duration_minutes: 45,
        location: null,
        meeting_link: 'https://zoom.us/j/123',
        status: 'completed'
      },
      {
        application_id: application.id,
        interviewer_id: interviewer2.id,
        scheduled_at: new Date('2024-01-12T09:00:00Z'),
        duration_minutes: 30,
        location: 'Room 2',
        meeting_link: null,
        status: 'scheduled'
      }
    ]).execute();

    const results = await getInterviewsByInterviewer(interviewer1.id);

    expect(results).toHaveLength(2);
    
    // Should be ordered by scheduled_at descending
    expect(results[0].scheduled_at.getTime()).toBeGreaterThan(results[1].scheduled_at.getTime());
    expect(results[0].location).toEqual('Room 1');
    expect(results[0].duration_minutes).toEqual(60);
    
    expect(results[1].meeting_link).toEqual('https://zoom.us/j/123');
    expect(results[1].duration_minutes).toEqual(45);

    // Verify interviewer2's interviews are not included
    const interviewer2Results = await getInterviewsByInterviewer(interviewer2.id);
    expect(interviewer2Results).toHaveLength(1);
    expect(interviewer2Results[0].location).toEqual('Room 2');
  });

  it('should return interviews with all expected fields', async () => {
    // Create prerequisite data
    const [candidate] = await db.insert(usersTable).values(testUser).returning().execute();
    const [interviewer] = await db.insert(usersTable).values(testInterviewer).returning().execute();
    const [job] = await db.insert(jobsTable).values({ ...testJob, created_by: interviewer.id }).returning().execute();
    const [cvFile] = await db.insert(cvFilesTable).values({ ...testCV, candidate_id: candidate.id }).returning().execute();
    const [application] = await db.insert(applicationsTable).values({
      ...testApplication,
      job_id: job.id,
      candidate_id: candidate.id,
      cv_file_id: cvFile.id
    }).returning().execute();

    await db.insert(interviewsTable).values({
      application_id: application.id,
      interviewer_id: interviewer.id,
      scheduled_at: new Date('2024-01-15T10:00:00Z'),
      duration_minutes: 60,
      location: 'Office Room 1',
      meeting_link: 'https://zoom.us/j/123456789',
      status: 'scheduled',
      notes: 'Final interview',
      feedback: 'Candidate shows strong technical skills'
    }).execute();

    const results = await getInterviewsByInterviewer(interviewer.id);

    expect(results).toHaveLength(1);
    const result = results[0];
    
    // Verify all fields are present
    expect(result.id).toBeDefined();
    expect(result.application_id).toEqual(application.id);
    expect(result.interviewer_id).toEqual(interviewer.id);
    expect(result.scheduled_at).toBeInstanceOf(Date);
    expect(result.duration_minutes).toEqual(60);
    expect(result.location).toEqual('Office Room 1');
    expect(result.meeting_link).toEqual('https://zoom.us/j/123456789');
    expect(result.status).toEqual('scheduled');
    expect(result.notes).toEqual('Final interview');
    expect(result.feedback).toEqual('Candidate shows strong technical skills');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });
});