import { db } from '../db';
import { interviewsTable, applicationsTable, usersTable } from '../db/schema';
import { type Interview } from '../schema';
import { eq, desc } from 'drizzle-orm';

export const getInterviews = async (): Promise<Interview[]> => {
  try {
    const results = await db.select()
      .from(interviewsTable)
      .orderBy(desc(interviewsTable.scheduled_at))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch interviews:', error);
    throw error;
  }
};

export const getInterviewsByCandidate = async (candidateId: number): Promise<Interview[]> => {
  try {
    const results = await db.select({
      id: interviewsTable.id,
      application_id: interviewsTable.application_id,
      interviewer_id: interviewsTable.interviewer_id,
      scheduled_at: interviewsTable.scheduled_at,
      duration_minutes: interviewsTable.duration_minutes,
      location: interviewsTable.location,
      meeting_link: interviewsTable.meeting_link,
      status: interviewsTable.status,
      notes: interviewsTable.notes,
      feedback: interviewsTable.feedback,
      created_at: interviewsTable.created_at,
      updated_at: interviewsTable.updated_at
    })
    .from(interviewsTable)
    .innerJoin(applicationsTable, eq(interviewsTable.application_id, applicationsTable.id))
    .where(eq(applicationsTable.candidate_id, candidateId))
    .orderBy(desc(interviewsTable.scheduled_at))
    .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch interviews for candidate:', error);
    throw error;
  }
};

export const getInterviewsByInterviewer = async (interviewerId: number): Promise<Interview[]> => {
  try {
    const results = await db.select()
      .from(interviewsTable)
      .where(eq(interviewsTable.interviewer_id, interviewerId))
      .orderBy(desc(interviewsTable.scheduled_at))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch interviews for interviewer:', error);
    throw error;
  }
};