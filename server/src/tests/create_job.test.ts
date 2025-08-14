import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { jobsTable, usersTable } from '../db/schema';
import { type CreateJobInput } from '../schema';
import { createJob } from '../handlers/create_job';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreateJobInput = {
  title: 'Senior Software Engineer',
  description: 'We are looking for a senior software engineer to join our team',
  requirements: 'Bachelor degree in Computer Science, 5+ years experience',
  department: 'Engineering',
  location: 'San Francisco, CA',
  salary_range: '$120,000 - $150,000',
  employment_type: 'Full-time',
  created_by: 1
};

describe('createJob', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a job in draft status', async () => {
    // Create a user first (for foreign key constraint)
    await db.insert(usersTable).values({
      email: 'requester@test.com',
      first_name: 'John',
      last_name: 'Doe',
      role: 'requester',
      department: 'Engineering'
    }).execute();

    const result = await createJob(testInput);

    // Verify all fields are set correctly
    expect(result.title).toEqual('Senior Software Engineer');
    expect(result.description).toEqual(testInput.description);
    expect(result.requirements).toEqual(testInput.requirements);
    expect(result.department).toEqual('Engineering');
    expect(result.location).toEqual('San Francisco, CA');
    expect(result.salary_range).toEqual('$120,000 - $150,000');
    expect(result.employment_type).toEqual('Full-time');
    expect(result.created_by).toEqual(1);
    expect(result.status).toEqual('draft');
    expect(result.approved_by).toBeNull();
    expect(result.published_at).toBeNull();
    expect(result.closed_at).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save job to database', async () => {
    // Create a user first
    await db.insert(usersTable).values({
      email: 'requester@test.com',
      first_name: 'John',
      last_name: 'Doe',
      role: 'requester',
      department: 'Engineering'
    }).execute();

    const result = await createJob(testInput);

    // Verify job exists in database
    const jobs = await db.select()
      .from(jobsTable)
      .where(eq(jobsTable.id, result.id))
      .execute();

    expect(jobs).toHaveLength(1);
    expect(jobs[0].title).toEqual('Senior Software Engineer');
    expect(jobs[0].status).toEqual('draft');
    expect(jobs[0].created_by).toEqual(1);
    expect(jobs[0].created_at).toBeInstanceOf(Date);
    expect(jobs[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create job with nullable fields set to null', async () => {
    // Create a user first
    await db.insert(usersTable).values({
      email: 'requester@test.com',
      first_name: 'John',
      last_name: 'Doe',
      role: 'requester',
      department: 'Engineering'
    }).execute();

    const minimalInput: CreateJobInput = {
      title: 'Remote Developer',
      description: 'Remote position available',
      requirements: 'Programming experience required',
      department: 'IT',
      location: null,
      salary_range: null,
      employment_type: 'Contract',
      created_by: 1
    };

    const result = await createJob(minimalInput);

    expect(result.title).toEqual('Remote Developer');
    expect(result.location).toBeNull();
    expect(result.salary_range).toBeNull();
    expect(result.status).toEqual('draft');
    expect(result.approved_by).toBeNull();
    expect(result.published_at).toBeNull();
    expect(result.closed_at).toBeNull();
  });

  it('should handle multiple jobs created by same user', async () => {
    // Create a user first
    await db.insert(usersTable).values({
      email: 'requester@test.com',
      first_name: 'John',
      last_name: 'Doe',
      role: 'requester',
      department: 'Engineering'
    }).execute();

    const job1Input: CreateJobInput = {
      ...testInput,
      title: 'Backend Developer'
    };

    const job2Input: CreateJobInput = {
      ...testInput,
      title: 'Frontend Developer'
    };

    const result1 = await createJob(job1Input);
    const result2 = await createJob(job2Input);

    expect(result1.id).not.toEqual(result2.id);
    expect(result1.title).toEqual('Backend Developer');
    expect(result2.title).toEqual('Frontend Developer');
    expect(result1.created_by).toEqual(result2.created_by);

    // Verify both jobs exist in database
    const jobs = await db.select()
      .from(jobsTable)
      .where(eq(jobsTable.created_by, 1))
      .execute();

    expect(jobs).toHaveLength(2);
  });

  it('should create job even when created_by references non-existent user', async () => {
    // Since foreign key constraints aren't enforced in the schema,
    // this should succeed but would be invalid in a real application
    const result = await createJob(testInput);

    expect(result.title).toEqual('Senior Software Engineer');
    expect(result.created_by).toEqual(1);
    expect(result.status).toEqual('draft');
    expect(result.id).toBeDefined();
  });
});