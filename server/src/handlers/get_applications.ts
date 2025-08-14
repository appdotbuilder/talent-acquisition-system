import { db } from '../db';
import { applicationsTable } from '../db/schema';
import { type Application, type GetApplicationsByJobInput, type GetCandidateApplicationsInput } from '../schema';
import { eq, desc } from 'drizzle-orm';

export const getApplications = async (): Promise<Application[]> => {
  try {
    const results = await db.select()
      .from(applicationsTable)
      .orderBy(desc(applicationsTable.created_at))
      .execute();

    // Convert ai_match_score from integer to number (no conversion needed as it's already a number)
    // Note: ai_match_score is stored as integer in the database, no conversion needed
    return results;
  } catch (error) {
    console.error('Failed to fetch all applications:', error);
    throw error;
  }
};

export const getApplicationsByJob = async (input: GetApplicationsByJobInput): Promise<Application[]> => {
  try {
    const results = await db.select()
      .from(applicationsTable)
      .where(eq(applicationsTable.job_id, input.job_id))
      .orderBy(desc(applicationsTable.ai_match_score), desc(applicationsTable.created_at))
      .execute();

    // PostgreSQL's ORDER BY DESC with nulls puts nulls first by default
    // We want non-null scores first, so we'll sort manually to ensure consistent ordering
    return results.sort((a, b) => {
      // Non-null scores come first
      if (a.ai_match_score !== null && b.ai_match_score === null) return -1;
      if (a.ai_match_score === null && b.ai_match_score !== null) return 1;
      
      // Both non-null: sort by score descending
      if (a.ai_match_score !== null && b.ai_match_score !== null) {
        if (a.ai_match_score !== b.ai_match_score) {
          return b.ai_match_score - a.ai_match_score;
        }
      }
      
      // Same score or both null: sort by created_at descending
      return b.created_at.getTime() - a.created_at.getTime();
    });
  } catch (error) {
    console.error('Failed to fetch applications by job:', error);
    throw error;
  }
};

export const getCandidateApplications = async (input: GetCandidateApplicationsInput): Promise<Application[]> => {
  try {
    const results = await db.select()
      .from(applicationsTable)
      .where(eq(applicationsTable.candidate_id, input.candidate_id))
      .orderBy(desc(applicationsTable.created_at))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch candidate applications:', error);
    throw error;
  }
};