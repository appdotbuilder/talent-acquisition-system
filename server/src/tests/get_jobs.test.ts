import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, jobsTable } from '../db/schema';
import { type GetJobsByStatusInput } from '../schema';
import { getJobs, getJobsByStatus } from '../handlers/get_jobs';
import { eq } from 'drizzle-orm';

describe('getJobs', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no jobs exist', async () => {
    const result = await getJobs();
    expect(result).toEqual([]);
  });

  it('should return all jobs', async () => {
    // Create a test user first (required for foreign key)
    const user = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        role: 'requester',
        department: 'Engineering'
      })
      .returning()
      .execute();

    // Create multiple test jobs
    const job1 = await db.insert(jobsTable)
      .values({
        title: 'Software Engineer',
        description: 'Develop software applications',
        requirements: 'JavaScript experience required',
        department: 'Engineering',
        location: 'New York',
        salary_range: '$80,000 - $120,000',
        employment_type: 'full-time',
        status: 'published',
        created_by: user[0].id
      })
      .returning()
      .execute();

    const job2 = await db.insert(jobsTable)
      .values({
        title: 'Product Manager',
        description: 'Manage product roadmap',
        requirements: 'Product management experience',
        department: 'Product',
        location: 'San Francisco',
        salary_range: '$100,000 - $150,000',
        employment_type: 'full-time',
        status: 'draft',
        created_by: user[0].id
      })
      .returning()
      .execute();

    const result = await getJobs();

    expect(result).toHaveLength(2);
    
    const titles = result.map(job => job.title).sort();
    expect(titles).toEqual(['Product Manager', 'Software Engineer']);
    
    // Verify all fields are present
    const firstJob = result[0];
    expect(firstJob.id).toBeDefined();
    expect(firstJob.title).toBeDefined();
    expect(firstJob.description).toBeDefined();
    expect(firstJob.requirements).toBeDefined();
    expect(firstJob.department).toBeDefined();
    expect(firstJob.employment_type).toBeDefined();
    expect(firstJob.status).toBeDefined();
    expect(firstJob.created_by).toBeDefined();
    expect(firstJob.created_at).toBeInstanceOf(Date);
    expect(firstJob.updated_at).toBeInstanceOf(Date);
  });

  it('should return jobs with correct data types', async () => {
    // Create a test user
    const user = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        role: 'requester',
        department: 'Engineering'
      })
      .returning()
      .execute();

    // Create a test job
    await db.insert(jobsTable)
      .values({
        title: 'Test Job',
        description: 'Test description',
        requirements: 'Test requirements',
        department: 'Engineering',
        employment_type: 'full-time',
        created_by: user[0].id
      })
      .execute();

    const result = await getJobs();

    expect(result).toHaveLength(1);
    const job = result[0];
    
    expect(typeof job.id).toBe('number');
    expect(typeof job.title).toBe('string');
    expect(typeof job.description).toBe('string');
    expect(typeof job.requirements).toBe('string');
    expect(typeof job.department).toBe('string');
    expect(typeof job.employment_type).toBe('string');
    expect(typeof job.status).toBe('string');
    expect(typeof job.created_by).toBe('number');
    expect(job.created_at).toBeInstanceOf(Date);
    expect(job.updated_at).toBeInstanceOf(Date);
  });
});

describe('getJobsByStatus', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no jobs match filter', async () => {
    const input: GetJobsByStatusInput = {
      status: 'published'
    };

    const result = await getJobsByStatus(input);
    expect(result).toEqual([]);
  });

  it('should filter jobs by status', async () => {
    // Create a test user
    const user = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        role: 'requester',
        department: 'Engineering'
      })
      .returning()
      .execute();

    // Create jobs with different statuses
    await db.insert(jobsTable)
      .values({
        title: 'Published Job',
        description: 'A published job',
        requirements: 'Requirements',
        department: 'Engineering',
        employment_type: 'full-time',
        status: 'published',
        created_by: user[0].id
      })
      .execute();

    await db.insert(jobsTable)
      .values({
        title: 'Draft Job',
        description: 'A draft job',
        requirements: 'Requirements',
        department: 'Engineering',
        employment_type: 'full-time',
        status: 'draft',
        created_by: user[0].id
      })
      .execute();

    const input: GetJobsByStatusInput = {
      status: 'published'
    };

    const result = await getJobsByStatus(input);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Published Job');
    expect(result[0].status).toBe('published');
  });

  it('should filter jobs by created_by', async () => {
    // Create test users
    const user1 = await db.insert(usersTable)
      .values({
        email: 'user1@example.com',
        first_name: 'User',
        last_name: 'One',
        role: 'requester',
        department: 'Engineering'
      })
      .returning()
      .execute();

    const user2 = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        first_name: 'User',
        last_name: 'Two',
        role: 'requester',
        department: 'Marketing'
      })
      .returning()
      .execute();

    // Create jobs for different users
    await db.insert(jobsTable)
      .values({
        title: 'Job by User 1',
        description: 'Job created by user 1',
        requirements: 'Requirements',
        department: 'Engineering',
        employment_type: 'full-time',
        created_by: user1[0].id
      })
      .execute();

    await db.insert(jobsTable)
      .values({
        title: 'Job by User 2',
        description: 'Job created by user 2',
        requirements: 'Requirements',
        department: 'Marketing',
        employment_type: 'part-time',
        created_by: user2[0].id
      })
      .execute();

    const input: GetJobsByStatusInput = {
      created_by: user1[0].id
    };

    const result = await getJobsByStatus(input);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Job by User 1');
    expect(result[0].created_by).toBe(user1[0].id);
  });

  it('should filter jobs by both status and created_by', async () => {
    // Create a test user
    const user1 = await db.insert(usersTable)
      .values({
        email: 'user1@example.com',
        first_name: 'User',
        last_name: 'One',
        role: 'requester',
        department: 'Engineering'
      })
      .returning()
      .execute();

    const user2 = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        first_name: 'User',
        last_name: 'Two',
        role: 'requester',
        department: 'Marketing'
      })
      .returning()
      .execute();

    // Create various jobs
    await db.insert(jobsTable)
      .values({
        title: 'Published Job by User 1',
        description: 'Job description',
        requirements: 'Requirements',
        department: 'Engineering',
        employment_type: 'full-time',
        status: 'published',
        created_by: user1[0].id
      })
      .execute();

    await db.insert(jobsTable)
      .values({
        title: 'Draft Job by User 1',
        description: 'Job description',
        requirements: 'Requirements',
        department: 'Engineering',
        employment_type: 'full-time',
        status: 'draft',
        created_by: user1[0].id
      })
      .execute();

    await db.insert(jobsTable)
      .values({
        title: 'Published Job by User 2',
        description: 'Job description',
        requirements: 'Requirements',
        department: 'Marketing',
        employment_type: 'full-time',
        status: 'published',
        created_by: user2[0].id
      })
      .execute();

    const input: GetJobsByStatusInput = {
      status: 'published',
      created_by: user1[0].id
    };

    const result = await getJobsByStatus(input);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Published Job by User 1');
    expect(result[0].status).toBe('published');
    expect(result[0].created_by).toBe(user1[0].id);
  });

  it('should return all jobs when no filters provided', async () => {
    // Create a test user
    const user = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        role: 'requester',
        department: 'Engineering'
      })
      .returning()
      .execute();

    // Create test jobs
    await db.insert(jobsTable)
      .values([
        {
          title: 'Job 1',
          description: 'Description 1',
          requirements: 'Requirements 1',
          department: 'Engineering',
          employment_type: 'full-time',
          status: 'published',
          created_by: user[0].id
        },
        {
          title: 'Job 2',
          description: 'Description 2',
          requirements: 'Requirements 2',
          department: 'Marketing',
          employment_type: 'part-time',
          status: 'draft',
          created_by: user[0].id
        }
      ])
      .execute();

    const input: GetJobsByStatusInput = {};

    const result = await getJobsByStatus(input);

    expect(result).toHaveLength(2);
    const titles = result.map(job => job.title).sort();
    expect(titles).toEqual(['Job 1', 'Job 2']);
  });

  it('should handle different job status values correctly', async () => {
    // Create a test user
    const user = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        role: 'requester',
        department: 'Engineering'
      })
      .returning()
      .execute();

    // Create jobs with all different status values
    const statuses = ['draft', 'pending_approval', 'approved', 'published', 'closed'] as const;
    
    for (const status of statuses) {
      await db.insert(jobsTable)
        .values({
          title: `Job ${status}`,
          description: `Job with ${status} status`,
          requirements: 'Requirements',
          department: 'Engineering',
          employment_type: 'full-time',
          status: status,
          created_by: user[0].id
        })
        .execute();
    }

    // Test filtering by each status
    for (const status of statuses) {
      const input: GetJobsByStatusInput = { status };
      const result = await getJobsByStatus(input);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(status);
      expect(result[0].title).toBe(`Job ${status}`);
    }
  });

  it('should verify jobs are saved correctly in database', async () => {
    // Create a test user
    const user = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        role: 'requester',
        department: 'Engineering'
      })
      .returning()
      .execute();

    // Create and fetch job using handler
    await db.insert(jobsTable)
      .values({
        title: 'Test Job',
        description: 'Test description',
        requirements: 'Test requirements',
        department: 'Engineering',
        location: 'Remote',
        salary_range: '$50,000 - $70,000',
        employment_type: 'full-time',
        status: 'published',
        created_by: user[0].id
      })
      .execute();

    const handlerResult = await getJobs();

    // Verify same data is in database directly
    const dbResult = await db.select()
      .from(jobsTable)
      .where(eq(jobsTable.id, handlerResult[0].id))
      .execute();

    expect(dbResult).toHaveLength(1);
    expect(dbResult[0].title).toBe('Test Job');
    expect(dbResult[0].description).toBe('Test description');
    expect(dbResult[0].requirements).toBe('Test requirements');
    expect(dbResult[0].department).toBe('Engineering');
    expect(dbResult[0].location).toBe('Remote');
    expect(dbResult[0].salary_range).toBe('$50,000 - $70,000');
    expect(dbResult[0].employment_type).toBe('full-time');
    expect(dbResult[0].status).toBe('published');
    expect(dbResult[0].created_by).toBe(user[0].id);
    expect(dbResult[0].created_at).toBeInstanceOf(Date);
    expect(dbResult[0].updated_at).toBeInstanceOf(Date);
  });
});