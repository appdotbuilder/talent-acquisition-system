import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, jobsTable } from '../db/schema';
import { type UpdateJobStatusInput } from '../schema';
import { updateJobStatus } from '../handlers/update_job_status';
import { eq } from 'drizzle-orm';

describe('updateJobStatus', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUser: any;
  let approverUser: any;
  let testJob: any;

  beforeEach(async () => {
    // Create test users first
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'creator@test.com',
          first_name: 'Job',
          last_name: 'Creator',
          role: 'requester',
          department: 'Engineering'
        },
        {
          email: 'approver@test.com',
          first_name: 'Job',
          last_name: 'Approver',
          role: 'admin',
          department: 'HR'
        }
      ])
      .returning()
      .execute();

    testUser = users[0];
    approverUser = users[1];

    // Create test job
    const jobs = await db.insert(jobsTable)
      .values({
        title: 'Software Engineer',
        description: 'Join our engineering team',
        requirements: 'Bachelor\'s degree in CS',
        department: 'Engineering',
        employment_type: 'full-time',
        status: 'draft',
        created_by: testUser.id
      })
      .returning()
      .execute();

    testJob = jobs[0];
  });

  it('should update job status from draft to pending_approval', async () => {
    const input: UpdateJobStatusInput = {
      job_id: testJob.id,
      status: 'pending_approval',
      approved_by: null
    };

    const result = await updateJobStatus(input);

    expect(result.status).toEqual('pending_approval');
    expect(result.approved_by).toBeNull();
    expect(result.published_at).toBeNull();
    expect(result.closed_at).toBeNull();
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update job status to approved and set approved_by', async () => {
    const input: UpdateJobStatusInput = {
      job_id: testJob.id,
      status: 'approved',
      approved_by: approverUser.id
    };

    const result = await updateJobStatus(input);

    expect(result.status).toEqual('approved');
    expect(result.approved_by).toEqual(approverUser.id);
    expect(result.published_at).toBeNull();
    expect(result.closed_at).toBeNull();
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update job status to published and set published_at', async () => {
    const input: UpdateJobStatusInput = {
      job_id: testJob.id,
      status: 'published',
      approved_by: null
    };

    const result = await updateJobStatus(input);

    expect(result.status).toEqual('published');
    expect(result.published_at).toBeInstanceOf(Date);
    expect(result.closed_at).toBeNull();
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update job status to closed and set closed_at', async () => {
    const input: UpdateJobStatusInput = {
      job_id: testJob.id,
      status: 'closed',
      approved_by: null
    };

    const result = await updateJobStatus(input);

    expect(result.status).toEqual('closed');
    expect(result.closed_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save updated status to database', async () => {
    const input: UpdateJobStatusInput = {
      job_id: testJob.id,
      status: 'approved',
      approved_by: approverUser.id
    };

    await updateJobStatus(input);

    // Query database to verify the update
    const updatedJob = await db.select()
      .from(jobsTable)
      .where(eq(jobsTable.id, testJob.id))
      .execute();

    expect(updatedJob).toHaveLength(1);
    expect(updatedJob[0].status).toEqual('approved');
    expect(updatedJob[0].approved_by).toEqual(approverUser.id);
    expect(updatedJob[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle status workflow transitions correctly', async () => {
    // Test draft -> pending_approval -> approved -> published -> closed workflow
    
    // Step 1: draft -> pending_approval
    let input: UpdateJobStatusInput = {
      job_id: testJob.id,
      status: 'pending_approval',
      approved_by: null
    };
    
    let result = await updateJobStatus(input);
    expect(result.status).toEqual('pending_approval');
    expect(result.approved_by).toBeNull();

    // Step 2: pending_approval -> approved
    input = {
      job_id: testJob.id,
      status: 'approved',
      approved_by: approverUser.id
    };
    
    result = await updateJobStatus(input);
    expect(result.status).toEqual('approved');
    expect(result.approved_by).toEqual(approverUser.id);

    // Step 3: approved -> published
    input = {
      job_id: testJob.id,
      status: 'published',
      approved_by: null
    };
    
    result = await updateJobStatus(input);
    expect(result.status).toEqual('published');
    expect(result.published_at).toBeInstanceOf(Date);

    // Step 4: published -> closed
    input = {
      job_id: testJob.id,
      status: 'closed',
      approved_by: null
    };
    
    result = await updateJobStatus(input);
    expect(result.status).toEqual('closed');
    expect(result.closed_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent job', async () => {
    const input: UpdateJobStatusInput = {
      job_id: 99999,
      status: 'approved',
      approved_by: approverUser.id
    };

    expect(updateJobStatus(input)).rejects.toThrow(/Job with id 99999 not found/i);
  });

  it('should preserve existing job data when updating status', async () => {
    const input: UpdateJobStatusInput = {
      job_id: testJob.id,
      status: 'published',
      approved_by: null
    };

    const result = await updateJobStatus(input);

    // Verify all original job data is preserved
    expect(result.title).toEqual('Software Engineer');
    expect(result.description).toEqual('Join our engineering team');
    expect(result.requirements).toEqual('Bachelor\'s degree in CS');
    expect(result.department).toEqual('Engineering');
    expect(result.employment_type).toEqual('full-time');
    expect(result.created_by).toEqual(testUser.id);
    expect(result.id).toEqual(testJob.id);
  });

  it('should update updated_at timestamp on every status change', async () => {
    const originalUpdatedAt = testJob.updated_at;
    
    // Wait a small amount to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 1));

    const input: UpdateJobStatusInput = {
      job_id: testJob.id,
      status: 'pending_approval',
      approved_by: null
    };

    const result = await updateJobStatus(input);

    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });
});