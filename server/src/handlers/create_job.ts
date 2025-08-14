import { db } from '../db';
import { jobsTable } from '../db/schema';
import { type CreateJobInput, type Job } from '../schema';

export const createJob = async (input: CreateJobInput): Promise<Job> => {
  try {
    // Insert job record in draft status
    const result = await db.insert(jobsTable)
      .values({
        title: input.title,
        description: input.description,
        requirements: input.requirements,
        department: input.department,
        location: input.location,
        salary_range: input.salary_range,
        employment_type: input.employment_type,
        created_by: input.created_by,
        status: 'draft' // Jobs start in draft status
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Job creation failed:', error);
    throw error;
  }
};