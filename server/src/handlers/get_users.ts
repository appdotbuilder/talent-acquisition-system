import { db } from '../db';
import { usersTable } from '../db/schema';
import { type User, type UserRole } from '../schema';
import { eq } from 'drizzle-orm';

interface GetUsersFilters {
  role?: UserRole;
}

export const getUsers = async (filters?: GetUsersFilters): Promise<User[]> => {
  try {
    // Build query with conditional where clause
    const baseQuery = db.select().from(usersTable);
    
    const query = filters?.role 
      ? baseQuery.where(eq(usersTable.role, filters.role))
      : baseQuery;

    const results = await query.execute();
    
    return results;
  } catch (error) {
    console.error('Failed to fetch users:', error);
    throw error;
  }
};