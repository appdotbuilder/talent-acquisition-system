import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, jobsTable, applicationsTable, interviewsTable, reportsTable } from '../db/schema';
import { generateWeeklyReport, getReportsByRequester } from '../handlers/generate_report';
import { eq } from 'drizzle-orm';

describe('generateWeeklyReport', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  const weekStart = new Date('2024-01-01T00:00:00Z');
  const weekEnd = new Date('2024-01-07T23:59:59Z');
  
  it('should generate a weekly report with basic metrics', async () => {
    // Create requester user
    const [requester] = await db.insert(usersTable)
      .values({
        email: 'requester@test.com',
        first_name: 'Test',
        last_name: 'Requester',
        role: 'requester',
        department: 'HR'
      })
      .returning()
      .execute();

    // Create candidate user
    const [candidate] = await db.insert(usersTable)
      .values({
        email: 'candidate@test.com',
        first_name: 'Test',
        last_name: 'Candidate',
        role: 'candidate',
        department: null
      })
      .returning()
      .execute();

    // Create job
    const [job] = await db.insert(jobsTable)
      .values({
        title: 'Software Engineer',
        description: 'Test job',
        requirements: 'Test requirements',
        department: 'Engineering',
        employment_type: 'full-time',
        created_by: requester.id,
        created_at: new Date('2024-01-02T10:00:00Z')
      })
      .returning()
      .execute();

    // Create applications within date range
    await db.insert(applicationsTable)
      .values([
        {
          job_id: job.id,
          candidate_id: candidate.id,
          cv_file_id: 1,
          status: 'pending',
          created_at: new Date('2024-01-03T10:00:00Z')
        },
        {
          job_id: job.id,
          candidate_id: candidate.id,
          cv_file_id: 2,
          status: 'shortlisted',
          ai_match_score: 85,
          created_at: new Date('2024-01-04T10:00:00Z')
        }
      ])
      .execute();

    const result = await generateWeeklyReport(requester.id, weekStart, weekEnd);

    // Verify report structure
    expect(result.id).toBeDefined();
    expect(result.requester_id).toEqual(requester.id);
    expect(result.report_type).toEqual('weekly');
    expect(result.week_start).toEqual(weekStart);
    expect(result.week_end).toEqual(weekEnd);
    expect(result.generated_at).toBeInstanceOf(Date);

    // Verify report metrics
    expect(result.report_data['totalApplications']).toEqual(2);
    expect(result.report_data['shortlistedApplications']).toEqual(1);
    expect(result.report_data['averageMatchRate']).toEqual(85);
    expect(result.report_data['interviewsScheduled']).toEqual(0);
    expect(result.report_data['offersExtended']).toEqual(0);
    expect(result.report_data['offerAcceptanceRate']).toEqual(0);
    expect(result.report_data['timeToFill']).toEqual(0);
  });

  it('should calculate offer metrics correctly', async () => {
    // Create requester user
    const [requester] = await db.insert(usersTable)
      .values({
        email: 'requester@test.com',
        first_name: 'Test',
        last_name: 'Requester',
        role: 'requester',
        department: 'HR'
      })
      .returning()
      .execute();

    // Create candidate user
    const [candidate] = await db.insert(usersTable)
      .values({
        email: 'candidate@test.com',
        first_name: 'Test',
        last_name: 'Candidate',
        role: 'candidate',
        department: null
      })
      .returning()
      .execute();

    // Create job
    const [job] = await db.insert(jobsTable)
      .values({
        title: 'Software Engineer',
        description: 'Test job',
        requirements: 'Test requirements',
        department: 'Engineering',
        employment_type: 'full-time',
        created_by: requester.id,
        created_at: new Date('2024-01-01T10:00:00Z')
      })
      .returning()
      .execute();

    // Create applications with offer statuses
    await db.insert(applicationsTable)
      .values([
        {
          job_id: job.id,
          candidate_id: candidate.id,
          cv_file_id: 1,
          status: 'offer_made',
          created_at: new Date('2024-01-01T10:00:00Z'),
          updated_at: new Date('2024-01-03T10:00:00Z')
        },
        {
          job_id: job.id,
          candidate_id: candidate.id,
          cv_file_id: 2,
          status: 'offer_accepted',
          created_at: new Date('2024-01-01T10:00:00Z'),
          updated_at: new Date('2024-01-04T10:00:00Z')
        }
      ])
      .execute();

    const result = await generateWeeklyReport(requester.id, weekStart, weekEnd);

    expect(result.report_data['offersExtended']).toEqual(1);
    expect(result.report_data['offerAcceptanceRate']).toEqual(100);
    expect(result.report_data['timeToFill']).toBeGreaterThan(0); // Should calculate actual time
  });

  it('should count interviews scheduled correctly', async () => {
    // Create users
    const [requester] = await db.insert(usersTable)
      .values({
        email: 'requester@test.com',
        first_name: 'Test',
        last_name: 'Requester',
        role: 'requester',
        department: 'HR'
      })
      .returning()
      .execute();

    const [candidate] = await db.insert(usersTable)
      .values({
        email: 'candidate@test.com',
        first_name: 'Test',
        last_name: 'Candidate',
        role: 'candidate',
        department: null
      })
      .returning()
      .execute();

    const [interviewer] = await db.insert(usersTable)
      .values({
        email: 'interviewer@test.com',
        first_name: 'Test',
        last_name: 'Interviewer',
        role: 'requester',
        department: 'Engineering'
      })
      .returning()
      .execute();

    // Create job
    const [job] = await db.insert(jobsTable)
      .values({
        title: 'Software Engineer',
        description: 'Test job',
        requirements: 'Test requirements',
        department: 'Engineering',
        employment_type: 'full-time',
        created_by: requester.id
      })
      .returning()
      .execute();

    // Create application
    const [application] = await db.insert(applicationsTable)
      .values({
        job_id: job.id,
        candidate_id: candidate.id,
        cv_file_id: 1,
        status: 'interview_scheduled'
      })
      .returning()
      .execute();

    // Create interview within date range
    await db.insert(interviewsTable)
      .values({
        application_id: application.id,
        interviewer_id: interviewer.id,
        scheduled_at: new Date('2024-01-05T14:00:00Z'),
        duration_minutes: 60,
        created_at: new Date('2024-01-03T10:00:00Z')
      })
      .execute();

    const result = await generateWeeklyReport(requester.id, weekStart, weekEnd);

    expect(result.report_data['interviewsScheduled']).toEqual(1);
  });

  it('should only include data for the specified requester', async () => {
    // Create two requesters
    const [requester1] = await db.insert(usersTable)
      .values({
        email: 'requester1@test.com',
        first_name: 'Test',
        last_name: 'Requester1',
        role: 'requester',
        department: 'HR'
      })
      .returning()
      .execute();

    const [requester2] = await db.insert(usersTable)
      .values({
        email: 'requester2@test.com',
        first_name: 'Test',
        last_name: 'Requester2',
        role: 'requester',
        department: 'Engineering'
      })
      .returning()
      .execute();

    const [candidate] = await db.insert(usersTable)
      .values({
        email: 'candidate@test.com',
        first_name: 'Test',
        last_name: 'Candidate',
        role: 'candidate',
        department: null
      })
      .returning()
      .execute();

    // Create jobs for both requesters
    const [job1] = await db.insert(jobsTable)
      .values({
        title: 'Job 1',
        description: 'Test job 1',
        requirements: 'Test requirements',
        department: 'HR',
        employment_type: 'full-time',
        created_by: requester1.id
      })
      .returning()
      .execute();

    const [job2] = await db.insert(jobsTable)
      .values({
        title: 'Job 2',
        description: 'Test job 2',
        requirements: 'Test requirements',
        department: 'Engineering',
        employment_type: 'full-time',
        created_by: requester2.id
      })
      .returning()
      .execute();

    // Create applications for both jobs
    await db.insert(applicationsTable)
      .values([
        {
          job_id: job1.id,
          candidate_id: candidate.id,
          cv_file_id: 1,
          status: 'pending',
          created_at: new Date('2024-01-03T10:00:00Z')
        },
        {
          job_id: job2.id,
          candidate_id: candidate.id,
          cv_file_id: 2,
          status: 'shortlisted',
          created_at: new Date('2024-01-04T10:00:00Z')
        }
      ])
      .execute();

    const result = await generateWeeklyReport(requester1.id, weekStart, weekEnd);

    // Should only count applications for requester1's jobs
    expect(result.report_data['totalApplications']).toEqual(1);
    expect(result.report_data['shortlistedApplications']).toEqual(0);
  });

  it('should save report to database', async () => {
    const [requester] = await db.insert(usersTable)
      .values({
        email: 'requester@test.com',
        first_name: 'Test',
        last_name: 'Requester',
        role: 'requester',
        department: 'HR'
      })
      .returning()
      .execute();

    const result = await generateWeeklyReport(requester.id, weekStart, weekEnd);

    // Verify report was saved to database
    const savedReports = await db
      .select()
      .from(reportsTable)
      .where(eq(reportsTable.id, result.id))
      .execute();

    expect(savedReports).toHaveLength(1);
    expect(savedReports[0].requester_id).toEqual(requester.id);
    expect(savedReports[0].report_type).toEqual('weekly');
    expect(savedReports[0].week_start).toEqual(weekStart);
    expect(savedReports[0].week_end).toEqual(weekEnd);
  });
});

describe('getReportsByRequester', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all reports for a specific requester', async () => {
    // Create requester
    const [requester] = await db.insert(usersTable)
      .values({
        email: 'requester@test.com',
        first_name: 'Test',
        last_name: 'Requester',
        role: 'requester',
        department: 'HR'
      })
      .returning()
      .execute();

    // Create test reports
    const reportData: Record<string, unknown> = {
      timeToFill: 5.5,
      offerAcceptanceRate: 75.0,
      averageMatchRate: 80.5,
      totalApplications: 20,
      shortlistedApplications: 8,
      interviewsScheduled: 5,
      offersExtended: 3
    };

    await db.insert(reportsTable)
      .values([
        {
          requester_id: requester.id,
          report_type: 'weekly',
          report_data: reportData,
          week_start: new Date('2024-01-01'),
          week_end: new Date('2024-01-07'),
          generated_at: new Date('2024-01-08T10:00:00Z')
        },
        {
          requester_id: requester.id,
          report_type: 'weekly',
          report_data: reportData,
          week_start: new Date('2024-01-08'),
          week_end: new Date('2024-01-14'),
          generated_at: new Date('2024-01-15T10:00:00Z')
        }
      ])
      .execute();

    const result = await getReportsByRequester(requester.id);

    expect(result).toHaveLength(2);
    expect(result[0].requester_id).toEqual(requester.id);
    expect(result[1].requester_id).toEqual(requester.id);
    expect(result[0].report_type).toEqual('weekly');
    expect(result[1].report_type).toEqual('weekly');

    // Verify chronological ordering
    expect(result[0].generated_at <= result[1].generated_at).toBe(true);
  });

  it('should return empty array when no reports exist', async () => {
    const [requester] = await db.insert(usersTable)
      .values({
        email: 'requester@test.com',
        first_name: 'Test',
        last_name: 'Requester',
        role: 'requester',
        department: 'HR'
      })
      .returning()
      .execute();

    const result = await getReportsByRequester(requester.id);

    expect(result).toHaveLength(0);
  });

  it('should only return reports for the specified requester', async () => {
    // Create two requesters
    const [requester1] = await db.insert(usersTable)
      .values({
        email: 'requester1@test.com',
        first_name: 'Test',
        last_name: 'Requester1',
        role: 'requester',
        department: 'HR'
      })
      .returning()
      .execute();

    const [requester2] = await db.insert(usersTable)
      .values({
        email: 'requester2@test.com',
        first_name: 'Test',
        last_name: 'Requester2',
        role: 'requester',
        department: 'Engineering'
      })
      .returning()
      .execute();

    const reportData: Record<string, unknown> = {
      timeToFill: 5.5,
      offerAcceptanceRate: 75.0,
      averageMatchRate: 80.5,
      totalApplications: 20,
      shortlistedApplications: 8,
      interviewsScheduled: 5,
      offersExtended: 3
    };

    // Create reports for both requesters
    await db.insert(reportsTable)
      .values([
        {
          requester_id: requester1.id,
          report_type: 'weekly',
          report_data: reportData,
          week_start: new Date('2024-01-01'),
          week_end: new Date('2024-01-07')
        },
        {
          requester_id: requester2.id,
          report_type: 'weekly',
          report_data: reportData,
          week_start: new Date('2024-01-01'),
          week_end: new Date('2024-01-07')
        }
      ])
      .execute();

    const result = await getReportsByRequester(requester1.id);

    expect(result).toHaveLength(1);
    expect(result[0].requester_id).toEqual(requester1.id);
  });

  it('should return reports with correct data structure', async () => {
    const [requester] = await db.insert(usersTable)
      .values({
        email: 'requester@test.com',
        first_name: 'Test',
        last_name: 'Requester',
        role: 'requester',
        department: 'HR'
      })
      .returning()
      .execute();

    const reportData: Record<string, unknown> = {
      timeToFill: 5.5,
      offerAcceptanceRate: 75.0,
      averageMatchRate: 80.5,
      totalApplications: 20,
      shortlistedApplications: 8,
      interviewsScheduled: 5,
      offersExtended: 3
    };

    await db.insert(reportsTable)
      .values({
        requester_id: requester.id,
        report_type: 'weekly',
        report_data: reportData,
        file_path: '/reports/test.pdf',
        week_start: new Date('2024-01-01'),
        week_end: new Date('2024-01-07')
      })
      .execute();

    const result = await getReportsByRequester(requester.id);

    expect(result).toHaveLength(1);
    
    const report = result[0];
    expect(report.id).toBeDefined();
    expect(report.requester_id).toEqual(requester.id);
    expect(report.report_type).toEqual('weekly');
    expect(report.report_data).toEqual(reportData);
    expect(report.file_path).toEqual('/reports/test.pdf');
    expect(report.week_start).toBeInstanceOf(Date);
    expect(report.week_end).toBeInstanceOf(Date);
    expect(report.generated_at).toBeInstanceOf(Date);
  });
});