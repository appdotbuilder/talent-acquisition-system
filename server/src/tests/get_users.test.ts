import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type UserRole } from '../schema';
import { getUsers } from '../handlers/get_users';

describe('getUsers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create a test user
  const createTestUser = async (userData: CreateUserInput) => {
    const result = await db.insert(usersTable)
      .values({
        email: userData.email,
        first_name: userData.first_name,
        last_name: userData.last_name,
        role: userData.role,
        department: userData.department,
        phone: userData.phone
      })
      .returning()
      .execute();
    return result[0];
  };

  it('should fetch all users when no filters are provided', async () => {
    // Create test users with different roles
    await createTestUser({
      email: 'candidate@test.com',
      first_name: 'John',
      last_name: 'Candidate',
      role: 'candidate' as UserRole,
      department: null,
      phone: '+1234567890'
    });

    await createTestUser({
      email: 'requester@test.com',
      first_name: 'Jane',
      last_name: 'Requester',
      role: 'requester' as UserRole,
      department: 'HR',
      phone: null
    });

    await createTestUser({
      email: 'admin@test.com',
      first_name: 'Bob',
      last_name: 'Admin',
      role: 'admin' as UserRole,
      department: 'IT',
      phone: '+9876543210'
    });

    const users = await getUsers();

    expect(users).toHaveLength(3);
    
    // Verify all users are returned
    const emails = users.map(u => u.email).sort();
    expect(emails).toEqual([
      'admin@test.com',
      'candidate@test.com',
      'requester@test.com'
    ]);

    // Verify user structure
    users.forEach(user => {
      expect(user.id).toBeDefined();
      expect(user.email).toBeDefined();
      expect(user.first_name).toBeDefined();
      expect(user.last_name).toBeDefined();
      expect(user.role).toBeDefined();
      expect(user.created_at).toBeInstanceOf(Date);
      expect(user.updated_at).toBeInstanceOf(Date);
    });
  });

  it('should filter users by role when role filter is provided', async () => {
    // Create users with different roles
    await createTestUser({
      email: 'candidate1@test.com',
      first_name: 'John',
      last_name: 'Candidate1',
      role: 'candidate' as UserRole,
      department: null,
      phone: null
    });

    await createTestUser({
      email: 'candidate2@test.com',
      first_name: 'Jane',
      last_name: 'Candidate2',
      role: 'candidate' as UserRole,
      department: null,
      phone: null
    });

    await createTestUser({
      email: 'requester@test.com',
      first_name: 'Bob',
      last_name: 'Requester',
      role: 'requester' as UserRole,
      department: 'HR',
      phone: null
    });

    // Filter by candidate role
    const candidates = await getUsers({ role: 'candidate' });

    expect(candidates).toHaveLength(2);
    candidates.forEach(user => {
      expect(user.role).toBe('candidate');
    });

    const candidateEmails = candidates.map(u => u.email).sort();
    expect(candidateEmails).toEqual([
      'candidate1@test.com',
      'candidate2@test.com'
    ]);

    // Filter by requester role
    const requesters = await getUsers({ role: 'requester' });

    expect(requesters).toHaveLength(1);
    expect(requesters[0].role).toBe('requester');
    expect(requesters[0].email).toBe('requester@test.com');
  });

  it('should return empty array when filtering by role with no matching users', async () => {
    // Create only candidate users
    await createTestUser({
      email: 'candidate@test.com',
      first_name: 'John',
      last_name: 'Candidate',
      role: 'candidate' as UserRole,
      department: null,
      phone: null
    });

    // Filter by admin role (which doesn't exist)
    const admins = await getUsers({ role: 'admin' });

    expect(admins).toHaveLength(0);
    expect(Array.isArray(admins)).toBe(true);
  });

  it('should return empty array when no users exist', async () => {
    const users = await getUsers();

    expect(users).toHaveLength(0);
    expect(Array.isArray(users)).toBe(true);
  });

  it('should handle all user role types correctly', async () => {
    const roles: UserRole[] = ['candidate', 'requester', 'admin'];
    
    // Create one user for each role
    for (let i = 0; i < roles.length; i++) {
      await createTestUser({
        email: `user${i}@test.com`,
        first_name: `User${i}`,
        last_name: `Test${i}`,
        role: roles[i],
        department: i === 0 ? null : 'Test Department',
        phone: null
      });
    }

    // Test filtering by each role
    for (const role of roles) {
      const filteredUsers = await getUsers({ role });
      
      expect(filteredUsers).toHaveLength(1);
      expect(filteredUsers[0].role).toBe(role);
    }
  });

  it('should preserve all user fields correctly', async () => {
    const testUserData: CreateUserInput = {
      email: 'full.user@test.com',
      first_name: 'Full',
      last_name: 'User',
      role: 'requester' as UserRole,
      department: 'Engineering',
      phone: '+1234567890'
    };

    await createTestUser(testUserData);

    const users = await getUsers();
    expect(users).toHaveLength(1);

    const user = users[0];
    expect(user.email).toBe(testUserData.email);
    expect(user.first_name).toBe(testUserData.first_name);
    expect(user.last_name).toBe(testUserData.last_name);
    expect(user.role).toBe(testUserData.role);
    expect(user.department).toBe(testUserData.department);
    expect(user.phone).toBe(testUserData.phone);
    expect(user.id).toBeTypeOf('number');
    expect(user.created_at).toBeInstanceOf(Date);
    expect(user.updated_at).toBeInstanceOf(Date);
  });
});