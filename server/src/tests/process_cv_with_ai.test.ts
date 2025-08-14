import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, cvFilesTable, aiParsedDataTable } from '../db/schema';
import { processCVWithAI, getCVParsedData } from '../handlers/process_cv_with_ai';
import { eq } from 'drizzle-orm';

describe('processCVWithAI', () => {
  let testUserId: number;
  let testCVFileId: number;

  beforeEach(async () => {
    await createDB();

    // Create test user (candidate)
    const userResult = await db.insert(usersTable)
      .values({
        email: 'candidate@test.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'candidate',
        department: null,
        phone: '+1234567890'
      })
      .returning()
      .execute();

    testUserId = userResult[0].id;

    // Create test CV file
    const cvFileResult = await db.insert(cvFilesTable)
      .values({
        candidate_id: testUserId,
        file_name: 'john_doe_cv.pdf',
        file_type: 'pdf',
        file_size: 1024000,
        file_path: '/uploads/cvs/john_doe_cv.pdf'
      })
      .returning()
      .execute();

    testCVFileId = cvFileResult[0].id;
  });

  afterEach(resetDB);

  it('should process CV with AI and create parsed data record', async () => {
    const result = await processCVWithAI(testCVFileId);

    // Verify basic fields
    expect(result.id).toBeDefined();
    expect(result.cv_file_id).toEqual(testCVFileId);
    expect(result.processing_status).toEqual('completed');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify parsed data structure
    expect(result.parsed_data).toBeDefined();
    expect(typeof result.parsed_data).toBe('object');
    
    const parsedData = result.parsed_data as Record<string, unknown>;
    expect(parsedData['personal_info']).toBeDefined();
    expect(parsedData['experience']).toBeDefined();
    expect(parsedData['education']).toBeDefined();
    expect(parsedData['skills']).toBeDefined();
  });

  it('should save AI parsed data to database', async () => {
    const result = await processCVWithAI(testCVFileId);

    // Verify record exists in database
    const dbRecords = await db.select()
      .from(aiParsedDataTable)
      .where(eq(aiParsedDataTable.id, result.id))
      .execute();

    expect(dbRecords).toHaveLength(1);
    expect(dbRecords[0].cv_file_id).toEqual(testCVFileId);
    expect(dbRecords[0].processing_status).toEqual('completed');
    expect(dbRecords[0].parsed_data).toBeDefined();
  });

  it('should return existing parsed data if already processed', async () => {
    // Process CV first time
    const firstResult = await processCVWithAI(testCVFileId);

    // Process same CV second time
    const secondResult = await processCVWithAI(testCVFileId);

    // Should return the same record
    expect(secondResult.id).toEqual(firstResult.id);
    expect(secondResult.cv_file_id).toEqual(testCVFileId);
    expect(secondResult.processing_status).toEqual('completed');

    // Verify only one record exists in database
    const allRecords = await db.select()
      .from(aiParsedDataTable)
      .where(eq(aiParsedDataTable.cv_file_id, testCVFileId))
      .execute();

    expect(allRecords).toHaveLength(1);
  });

  it('should throw error for non-existent CV file', async () => {
    const nonExistentCVFileId = 99999;

    await expect(processCVWithAI(nonExistentCVFileId))
      .rejects.toThrow(/CV file with ID 99999 not found/i);
  });

  it('should handle multiple CV files independently', async () => {
    // Create second CV file
    const secondCVResult = await db.insert(cvFilesTable)
      .values({
        candidate_id: testUserId,
        file_name: 'john_doe_cv_v2.pdf',
        file_type: 'pdf',
        file_size: 2048000,
        file_path: '/uploads/cvs/john_doe_cv_v2.pdf'
      })
      .returning()
      .execute();

    const secondCVFileId = secondCVResult[0].id;

    // Process both CVs
    const firstResult = await processCVWithAI(testCVFileId);
    const secondResult = await processCVWithAI(secondCVFileId);

    // Should be different records
    expect(firstResult.id).not.toEqual(secondResult.id);
    expect(firstResult.cv_file_id).toEqual(testCVFileId);
    expect(secondResult.cv_file_id).toEqual(secondCVFileId);

    // Both should be completed
    expect(firstResult.processing_status).toEqual('completed');
    expect(secondResult.processing_status).toEqual('completed');
  });
});

describe('getCVParsedData', () => {
  let testUserId: number;
  let testCVFileId: number;

  beforeEach(async () => {
    await createDB();

    // Create test user and CV file
    const userResult = await db.insert(usersTable)
      .values({
        email: 'candidate@test.com',
        first_name: 'Jane',
        last_name: 'Smith',
        role: 'candidate',
        department: null,
        phone: null
      })
      .returning()
      .execute();

    testUserId = userResult[0].id;

    const cvFileResult = await db.insert(cvFilesTable)
      .values({
        candidate_id: testUserId,
        file_name: 'jane_smith_cv.docx',
        file_type: 'docx',
        file_size: 512000,
        file_path: '/uploads/cvs/jane_smith_cv.docx'
      })
      .returning()
      .execute();

    testCVFileId = cvFileResult[0].id;
  });

  afterEach(resetDB);

  it('should return null for CV file without parsed data', async () => {
    const result = await getCVParsedData(testCVFileId);

    expect(result).toBeNull();
  });

  it('should return parsed data for processed CV', async () => {
    // First process the CV
    await processCVWithAI(testCVFileId);

    // Then retrieve the parsed data
    const result = await getCVParsedData(testCVFileId);

    expect(result).not.toBeNull();
    expect(result!.cv_file_id).toEqual(testCVFileId);
    expect(result!.processing_status).toEqual('completed');
    expect(result!.parsed_data).toBeDefined();
  });

  it('should return correct parsed data for specific CV file', async () => {
    // Create and process multiple CV files
    const secondCVResult = await db.insert(cvFilesTable)
      .values({
        candidate_id: testUserId,
        file_name: 'jane_smith_updated_cv.pdf',
        file_type: 'pdf',
        file_size: 768000,
        file_path: '/uploads/cvs/jane_smith_updated_cv.pdf'
      })
      .returning()
      .execute();

    const secondCVFileId = secondCVResult[0].id;

    // Process both CVs
    await processCVWithAI(testCVFileId);
    await processCVWithAI(secondCVFileId);

    // Get parsed data for first CV
    const firstResult = await getCVParsedData(testCVFileId);
    const secondResult = await getCVParsedData(secondCVFileId);

    // Should return correct data for each CV
    expect(firstResult).not.toBeNull();
    expect(secondResult).not.toBeNull();
    expect(firstResult!.cv_file_id).toEqual(testCVFileId);
    expect(secondResult!.cv_file_id).toEqual(secondCVFileId);
    expect(firstResult!.id).not.toEqual(secondResult!.id);
  });

  it('should handle non-existent CV file gracefully', async () => {
    const nonExistentCVFileId = 99999;

    const result = await getCVParsedData(nonExistentCVFileId);

    expect(result).toBeNull();
  });
});