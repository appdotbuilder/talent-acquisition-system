import { db } from '../db';
import { applicationsTable, usersTable, jobsTable, cvFilesTable } from '../db/schema';
import { type CreateApplicationInput, type Application } from '../schema';
import { eq } from 'drizzle-orm';

export const createApplication = async (input: CreateApplicationInput): Promise<Application> => {
  try {
    // Validate that the job exists
    const job = await db.select()
      .from(jobsTable)
      .where(eq(jobsTable.id, input.job_id))
      .execute();

    if (job.length === 0) {
      throw new Error('Job not found');
    }

    // Validate that the candidate exists
    const candidate = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.candidate_id))
      .execute();

    if (candidate.length === 0) {
      throw new Error('Candidate not found');
    }

    // Validate that the CV file exists and belongs to the candidate
    const cvFile = await db.select()
      .from(cvFilesTable)
      .where(eq(cvFilesTable.id, input.cv_file_id))
      .execute();

    if (cvFile.length === 0) {
      throw new Error('CV file not found');
    }

    if (cvFile[0].candidate_id !== input.candidate_id) {
      throw new Error('CV file does not belong to the specified candidate');
    }

    // Insert application record
    const result = await db.insert(applicationsTable)
      .values({
        job_id: input.job_id,
        candidate_id: input.candidate_id,
        cv_file_id: input.cv_file_id,
        ai_parsed_data_id: null,
        status: 'pending',
        ai_match_score: null,
        cover_letter: input.cover_letter,
        notes: null
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Application creation failed:', error);
    throw error;
  }
};