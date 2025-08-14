import { db } from '../db';
import { applicationsTable } from '../db/schema';
import { type UpdateApplicationStatusInput, type Application } from '../schema';
import { eq } from 'drizzle-orm';

export const updateApplicationStatus = async (input: UpdateApplicationStatusInput): Promise<Application> => {
  try {
    // First verify the application exists
    const existingApplication = await db.select()
      .from(applicationsTable)
      .where(eq(applicationsTable.id, input.application_id))
      .execute();

    if (existingApplication.length === 0) {
      throw new Error(`Application with ID ${input.application_id} not found`);
    }

    // Update the application with new status and notes
    const updateData: any = {
      status: input.status,
      updated_at: new Date()
    };

    // Only update notes if provided
    if (input.notes !== undefined) {
      updateData.notes = input.notes;
    }

    const result = await db.update(applicationsTable)
      .set(updateData)
      .where(eq(applicationsTable.id, input.application_id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Application status update failed:', error);
    throw error;
  }
};