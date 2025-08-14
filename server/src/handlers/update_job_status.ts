import { db } from '../db';
import { jobsTable } from '../db/schema';
import { type UpdateJobStatusInput, type Job } from '../schema';
import { eq } from 'drizzle-orm';

export const updateJobStatus = async (input: UpdateJobStatusInput): Promise<Job> => {
  try {
    // First, verify the job exists
    const existingJob = await db.select()
      .from(jobsTable)
      .where(eq(jobsTable.id, input.job_id))
      .execute();

    if (existingJob.length === 0) {
      throw new Error(`Job with id ${input.job_id} not found`);
    }

    // Build update values based on status
    const updateValues: any = {
      status: input.status,
      updated_at: new Date()
    };

    // Set approved_by when status becomes 'approved'
    if (input.status === 'approved' && input.approved_by) {
      updateValues.approved_by = input.approved_by;
    }

    // Set published_at when status becomes 'published'
    if (input.status === 'published') {
      updateValues.published_at = new Date();
    }

    // Set closed_at when status becomes 'closed'
    if (input.status === 'closed') {
      updateValues.closed_at = new Date();
    }

    // Update the job status
    const result = await db.update(jobsTable)
      .set(updateValues)
      .where(eq(jobsTable.id, input.job_id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Job status update failed:', error);
    throw error;
  }
};