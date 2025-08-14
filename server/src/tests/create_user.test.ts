import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreateUserInput = {
  email: 'test@example.com',
  first_name: 'John',
  last_name: 'Doe',
  role: 'candidate',
  department: 'Engineering',
  phone: '+1234567890'
};

// Test input with nullable fields as null
const minimalTestInput: CreateUserInput = {
  email: 'minimal@example.com',
  first_name: 'Jane',
  last_name: 'Smith',
  role: 'admin',
  department: null,
  phone: null
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user with all fields', async () => {
    const result = await createUser(testInput);

    // Basic field validation
    expect(result.email).toEqual('test@example.com');
    expect(result.first_name).toEqual('John');
    expect(result.last_name).toEqual('Doe');
    expect(result.role).toEqual('candidate');
    expect(result.department).toEqual('Engineering');
    expect(result.phone).toEqual('+1234567890');
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a user with minimal fields (nullable fields as null)', async () => {
    const result = await createUser(minimalTestInput);

    expect(result.email).toEqual('minimal@example.com');
    expect(result.first_name).toEqual('Jane');
    expect(result.last_name).toEqual('Smith');
    expect(result.role).toEqual('admin');
    expect(result.department).toBeNull();
    expect(result.phone).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save user to database', async () => {
    const result = await createUser(testInput);

    // Query using proper drizzle syntax
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('test@example.com');
    expect(users[0].first_name).toEqual('John');
    expect(users[0].last_name).toEqual('Doe');
    expect(users[0].role).toEqual('candidate');
    expect(users[0].department).toEqual('Engineering');
    expect(users[0].phone).toEqual('+1234567890');
    expect(users[0].created_at).toBeInstanceOf(Date);
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create users with different roles', async () => {
    const candidateInput: CreateUserInput = {
      ...testInput,
      email: 'candidate@test.com',
      role: 'candidate'
    };

    const requesterInput: CreateUserInput = {
      ...testInput,
      email: 'requester@test.com',
      role: 'requester'
    };

    const adminInput: CreateUserInput = {
      ...testInput,
      email: 'admin@test.com',
      role: 'admin'
    };

    const candidate = await createUser(candidateInput);
    const requester = await createUser(requesterInput);
    const admin = await createUser(adminInput);

    expect(candidate.role).toEqual('candidate');
    expect(requester.role).toEqual('requester');
    expect(admin.role).toEqual('admin');

    // Verify all three users were saved
    const allUsers = await db.select().from(usersTable).execute();
    expect(allUsers).toHaveLength(3);
  });

  it('should reject duplicate emails', async () => {
    // Create first user
    await createUser(testInput);

    // Try to create another user with same email
    const duplicateInput: CreateUserInput = {
      ...testInput,
      first_name: 'Different',
      last_name: 'Person'
    };

    await expect(createUser(duplicateInput)).rejects.toThrow(/unique/i);
  });

  it('should handle different department values', async () => {
    const engineeringUser = await createUser({
      ...testInput,
      email: 'eng@test.com',
      department: 'Engineering'
    });

    const marketingUser = await createUser({
      ...testInput,
      email: 'marketing@test.com',
      department: 'Marketing'
    });

    const noDeptUser = await createUser({
      ...testInput,
      email: 'nodept@test.com',
      department: null
    });

    expect(engineeringUser.department).toEqual('Engineering');
    expect(marketingUser.department).toEqual('Marketing');
    expect(noDeptUser.department).toBeNull();
  });

  it('should auto-generate timestamps', async () => {
    const beforeCreation = new Date();
    const result = await createUser(testInput);
    const afterCreation = new Date();

    // Check that timestamps are within reasonable range
    expect(result.created_at.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
    expect(result.created_at.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
    expect(result.updated_at.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
    expect(result.updated_at.getTime()).toBeLessThanOrEqual(afterCreation.getTime());

    // Initially, created_at and updated_at should be very close
    const timeDiff = Math.abs(result.updated_at.getTime() - result.created_at.getTime());
    expect(timeDiff).toBeLessThan(1000); // Less than 1 second difference
  });
});