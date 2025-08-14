import { db } from '../db';
import { jobsTable } from '../db/schema';
import { type Job, type GetJobsByStatusInput } from '../schema';
import { eq, and, type SQL } from 'drizzle-orm';

export const getJobs = async (): Promise<Job[]> => {
  try {
    const results = await db.select()
      .from(jobsTable)
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch jobs:', error);
    throw error;
  }
};

export const getJobsByStatus = async (input: GetJobsByStatusInput): Promise<Job[]> => {
  try {
    const conditions: SQL<unknown>[] = [];

    if (input.status !== undefined) {
      conditions.push(eq(jobsTable.status, input.status));
    }

    if (input.created_by !== undefined) {
      conditions.push(eq(jobsTable.created_by, input.created_by));
    }

    const baseQuery = db.select().from(jobsTable);

    const results = conditions.length > 0
      ? await baseQuery.where(conditions.length === 1 ? conditions[0] : and(...conditions)).execute()
      : await baseQuery.execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch jobs by status:', error);
    throw error;
  }
};