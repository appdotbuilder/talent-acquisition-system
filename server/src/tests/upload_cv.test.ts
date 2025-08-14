import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { cvFilesTable, usersTable } from '../db/schema';
import { type UploadCVInput, type CreateUserInput } from '../schema';
import { uploadCV } from '../handlers/upload_cv';
import { eq } from 'drizzle-orm';

describe('uploadCV', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  const createTestCandidate = async (): Promise<number> => {
    const userInput: CreateUserInput = {
      email: 'candidate@test.com',
      first_name: 'John',
      last_name: 'Doe',
      role: 'candidate',
      department: null,
      phone: '+1234567890'
    };

    const result = await db.insert(usersTable)
      .values(userInput)
      .returning()
      .execute();

    return result[0].id;
  };

  const createTestRequester = async (): Promise<number> => {
    const userInput: CreateUserInput = {
      email: 'requester@test.com',
      first_name: 'Jane',
      last_name: 'Manager',
      role: 'requester',
      department: 'HR',
      phone: '+1234567891'
    };

    const result = await db.insert(usersTable)
      .values(userInput)
      .returning()
      .execute();

    return result[0].id;
  };

  it('should upload CV file metadata successfully', async () => {
    const candidateId = await createTestCandidate();

    const testInput: UploadCVInput = {
      candidate_id: candidateId,
      file_name: 'john_doe_cv.pdf',
      file_type: 'pdf',
      file_size: 1024576, // 1MB
      file_path: '/uploads/cvs/john_doe_cv.pdf'
    };

    const result = await uploadCV(testInput);

    // Validate returned CV file object
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.candidate_id).toBe(candidateId);
    expect(result.file_name).toBe('john_doe_cv.pdf');
    expect(result.file_type).toBe('pdf');
    expect(result.file_size).toBe(1024576);
    expect(result.file_path).toBe('/uploads/cvs/john_doe_cv.pdf');
    expect(result.uploaded_at).toBeInstanceOf(Date);
  });

  it('should save CV file metadata to database', async () => {
    const candidateId = await createTestCandidate();

    const testInput: UploadCVInput = {
      candidate_id: candidateId,
      file_name: 'jane_smith_resume.docx',
      file_type: 'docx',
      file_size: 2048000, // 2MB
      file_path: '/uploads/cvs/jane_smith_resume.docx'
    };

    const result = await uploadCV(testInput);

    // Query database to verify the record was saved
    const savedCVs = await db.select()
      .from(cvFilesTable)
      .where(eq(cvFilesTable.id, result.id))
      .execute();

    expect(savedCVs).toHaveLength(1);
    const savedCV = savedCVs[0];
    expect(savedCV.candidate_id).toBe(candidateId);
    expect(savedCV.file_name).toBe('jane_smith_resume.docx');
    expect(savedCV.file_type).toBe('docx');
    expect(savedCV.file_size).toBe(2048000);
    expect(savedCV.file_path).toBe('/uploads/cvs/jane_smith_resume.docx');
    expect(savedCV.uploaded_at).toBeInstanceOf(Date);
  });

  it('should handle different file types correctly', async () => {
    const candidateId = await createTestCandidate();

    // Test PDF file
    const pdfInput: UploadCVInput = {
      candidate_id: candidateId,
      file_name: 'cv.pdf',
      file_type: 'pdf',
      file_size: 500000,
      file_path: '/uploads/cvs/cv.pdf'
    };

    const pdfResult = await uploadCV(pdfInput);
    expect(pdfResult.file_type).toBe('pdf');

    // Test DOCX file
    const docxInput: UploadCVInput = {
      candidate_id: candidateId,
      file_name: 'cv.docx',
      file_type: 'docx',
      file_size: 600000,
      file_path: '/uploads/cvs/cv.docx'
    };

    const docxResult = await uploadCV(docxInput);
    expect(docxResult.file_type).toBe('docx');

    // Test image files
    const jpgInput: UploadCVInput = {
      candidate_id: candidateId,
      file_name: 'cv.jpg',
      file_type: 'jpg',
      file_size: 300000,
      file_path: '/uploads/cvs/cv.jpg'
    };

    const jpgResult = await uploadCV(jpgInput);
    expect(jpgResult.file_type).toBe('jpg');

    const pngInput: UploadCVInput = {
      candidate_id: candidateId,
      file_name: 'cv.png',
      file_type: 'png',
      file_size: 400000,
      file_path: '/uploads/cvs/cv.png'
    };

    const pngResult = await uploadCV(pngInput);
    expect(pngResult.file_type).toBe('png');
  });

  it('should allow multiple CV uploads for the same candidate', async () => {
    const candidateId = await createTestCandidate();

    const firstInput: UploadCVInput = {
      candidate_id: candidateId,
      file_name: 'cv_v1.pdf',
      file_type: 'pdf',
      file_size: 1000000,
      file_path: '/uploads/cvs/cv_v1.pdf'
    };

    const secondInput: UploadCVInput = {
      candidate_id: candidateId,
      file_name: 'cv_v2.pdf',
      file_type: 'pdf',
      file_size: 1200000,
      file_path: '/uploads/cvs/cv_v2.pdf'
    };

    const firstResult = await uploadCV(firstInput);
    const secondResult = await uploadCV(secondInput);

    // Both uploads should succeed and have different IDs
    expect(firstResult.id).not.toBe(secondResult.id);
    expect(firstResult.file_name).toBe('cv_v1.pdf');
    expect(secondResult.file_name).toBe('cv_v2.pdf');

    // Verify both records exist in database
    const allCVs = await db.select()
      .from(cvFilesTable)
      .where(eq(cvFilesTable.candidate_id, candidateId))
      .execute();

    expect(allCVs).toHaveLength(2);
  });

  it('should throw error when candidate does not exist', async () => {
    const nonExistentCandidateId = 99999;

    const testInput: UploadCVInput = {
      candidate_id: nonExistentCandidateId,
      file_name: 'cv.pdf',
      file_type: 'pdf',
      file_size: 1000000,
      file_path: '/uploads/cvs/cv.pdf'
    };

    await expect(uploadCV(testInput)).rejects.toThrow(/Candidate with ID 99999 not found/);
  });

  it('should throw error when user is not a candidate', async () => {
    const requesterId = await createTestRequester();

    const testInput: UploadCVInput = {
      candidate_id: requesterId,
      file_name: 'cv.pdf',
      file_type: 'pdf',
      file_size: 1000000,
      file_path: '/uploads/cvs/cv.pdf'
    };

    await expect(uploadCV(testInput)).rejects.toThrow(/is not a candidate/);
  });

  it('should handle large file sizes correctly', async () => {
    const candidateId = await createTestCandidate();

    const testInput: UploadCVInput = {
      candidate_id: candidateId,
      file_name: 'large_cv.pdf',
      file_type: 'pdf',
      file_size: 10485760, // 10MB
      file_path: '/uploads/cvs/large_cv.pdf'
    };

    const result = await uploadCV(testInput);

    expect(result.file_size).toBe(10485760);
    expect(typeof result.file_size).toBe('number');
  });

  it('should handle special characters in file names', async () => {
    const candidateId = await createTestCandidate();

    const testInput: UploadCVInput = {
      candidate_id: candidateId,
      file_name: 'CV - John O\'Connor & Associates (2024).pdf',
      file_type: 'pdf',
      file_size: 1500000,
      file_path: '/uploads/cvs/CV - John O\'Connor & Associates (2024).pdf'
    };

    const result = await uploadCV(testInput);

    expect(result.file_name).toBe('CV - John O\'Connor & Associates (2024).pdf');
    expect(result.file_path).toBe('/uploads/cvs/CV - John O\'Connor & Associates (2024).pdf');

    // Verify it was saved correctly in the database
    const savedCV = await db.select()
      .from(cvFilesTable)
      .where(eq(cvFilesTable.id, result.id))
      .execute();

    expect(savedCV[0].file_name).toBe('CV - John O\'Connor & Associates (2024).pdf');
  });
});