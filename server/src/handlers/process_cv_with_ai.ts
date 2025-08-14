import { db } from '../db';
import { aiParsedDataTable, cvFilesTable } from '../db/schema';
import { type AIParsedData } from '../schema';
import { eq } from 'drizzle-orm';

export const processCVWithAI = async (cvFileId: number): Promise<AIParsedData> => {
  try {
    // First verify the CV file exists
    const cvFile = await db.select()
      .from(cvFilesTable)
      .where(eq(cvFilesTable.id, cvFileId))
      .execute();

    if (cvFile.length === 0) {
      throw new Error(`CV file with ID ${cvFileId} not found`);
    }

    // Check if AI parsing already exists for this CV
    const existingParsedData = await db.select()
      .from(aiParsedDataTable)
      .where(eq(aiParsedDataTable.cv_file_id, cvFileId))
      .execute();

    if (existingParsedData.length > 0) {
      return {
        ...existingParsedData[0],
        parsed_data: existingParsedData[0].parsed_data as Record<string, unknown>
      };
    }

    // Create initial AI parsed data record with processing status
    const initialResult = await db.insert(aiParsedDataTable)
      .values({
        cv_file_id: cvFileId,
        parsed_data: {},
        processing_status: 'processing'
      })
      .returning()
      .execute();

    const aiParsedData = initialResult[0];

    // Simulate AI processing (in real implementation, this would call external AI service)
    const mockAIResponse = await simulateAIProcessing(cvFile[0]);

    // Update the record with AI processed data
    const updatedResult = await db.update(aiParsedDataTable)
      .set({
        parsed_data: mockAIResponse,
        processing_status: 'completed',
        updated_at: new Date()
      })
      .where(eq(aiParsedDataTable.id, aiParsedData.id))
      .returning()
      .execute();

    return {
      ...updatedResult[0],
      parsed_data: updatedResult[0].parsed_data as Record<string, unknown>
    };
  } catch (error) {
    console.error('AI CV processing failed:', error);
    throw error;
  }
};

export const getCVParsedData = async (cvFileId: number): Promise<AIParsedData | null> => {
  try {
    const results = await db.select()
      .from(aiParsedDataTable)
      .where(eq(aiParsedDataTable.cv_file_id, cvFileId))
      .execute();

    return results.length > 0 ? {
      ...results[0],
      parsed_data: results[0].parsed_data as Record<string, unknown>
    } : null;
  } catch (error) {
    console.error('Failed to get CV parsed data:', error);
    throw error;
  }
};

// Mock AI processing function - in real implementation this would call external AI service
const simulateAIProcessing = async (cvFile: any): Promise<Record<string, unknown>> => {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 100));

  // Mock parsed data structure that an AI service might return
  return {
    personal_info: {
      name: "John Doe",
      email: "john.doe@email.com",
      phone: "+1234567890",
      location: "New York, NY"
    },
    experience: [
      {
        company: "Tech Corp",
        position: "Software Engineer",
        duration: "2020-2023",
        skills_used: ["JavaScript", "React", "Node.js"]
      }
    ],
    education: [
      {
        degree: "Bachelor of Computer Science",
        institution: "State University",
        year: "2020"
      }
    ],
    skills: ["JavaScript", "Python", "React", "Node.js", "SQL"],
    certifications: ["AWS Certified Developer"],
    summary: "Experienced software engineer with 3+ years in web development",
    file_info: {
      file_name: cvFile.file_name,
      file_type: cvFile.file_type,
      processed_at: new Date().toISOString()
    }
  };
};