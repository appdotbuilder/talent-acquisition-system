import { db } from '../db';
import { cvFilesTable, usersTable } from '../db/schema';
import { type UploadCVInput, type CVFile } from '../schema';
import { eq } from 'drizzle-orm';

export const uploadCV = async (input: UploadCVInput): Promise<CVFile> => {
  try {
    // Validate that the candidate exists
    const candidate = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.candidate_id))
      .execute();

    if (candidate.length === 0) {
      throw new Error(`Candidate with ID ${input.candidate_id} not found`);
    }

    // Validate that the candidate has 'candidate' role
    if (candidate[0].role !== 'candidate') {
      throw new Error(`User with ID ${input.candidate_id} is not a candidate`);
    }

    // Insert CV file metadata
    const result = await db.insert(cvFilesTable)
      .values({
        candidate_id: input.candidate_id,
        file_name: input.file_name,
        file_type: input.file_type,
        file_size: input.file_size,
        file_path: input.file_path
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('CV upload failed:', error);
    throw error;
  }
};