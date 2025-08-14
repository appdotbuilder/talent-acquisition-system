import { db } from '../db';
import { interviewsTable, applicationsTable } from '../db/schema';
import { type UpdateInterviewInput, type Interview } from '../schema';
import { eq, and } from 'drizzle-orm';

export const updateInterview = async (input: UpdateInterviewInput): Promise<Interview> => {
  try {
    // Build update data object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.status !== undefined) {
      updateData.status = input.status;
    }

    if (input.notes !== undefined) {
      updateData.notes = input.notes;
    }

    if (input.feedback !== undefined) {
      updateData.feedback = input.feedback;
    }

    // Update the interview
    const result = await db.update(interviewsTable)
      .set(updateData)
      .where(eq(interviewsTable.id, input.interview_id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Interview with id ${input.interview_id} not found`);
    }

    const updatedInterview = result[0];

    // If interview status is 'completed', update application status to 'interviewed'
    if (input.status === 'completed') {
      await db.update(applicationsTable)
        .set({
          status: 'interviewed',
          updated_at: new Date()
        })
        .where(eq(applicationsTable.id, updatedInterview.application_id))
        .execute();
    }

    return updatedInterview;
  } catch (error) {
    console.error('Interview update failed:', error);
    throw error;
  }
};