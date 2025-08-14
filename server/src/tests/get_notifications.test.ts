import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { notificationsTable, usersTable } from '../db/schema';
import { type GetUserNotificationsInput, type CreateNotificationInput } from '../schema';
import { getUserNotifications, markNotificationAsRead } from '../handlers/get_notifications';
import { eq } from 'drizzle-orm';

// Test user data
const testUser = {
  email: 'test.user@example.com',
  first_name: 'Test',
  last_name: 'User',
  role: 'candidate' as const,
  department: 'Engineering',
  phone: '+1234567890'
};

// Test notification data
const testNotification1: CreateNotificationInput = {
  user_id: 1, // Will be updated after user creation
  type: 'application_status',
  title: 'Application Update',
  message: 'Your application status has been updated'
};

const testNotification2: CreateNotificationInput = {
  user_id: 1, // Will be updated after user creation
  type: 'interview_invitation',
  title: 'Interview Scheduled',
  message: 'You have been scheduled for an interview'
};

const testNotification3: CreateNotificationInput = {
  user_id: 2, // Different user
  type: 'job_approval',
  title: 'Job Approved',
  message: 'Your job posting has been approved'
};

describe('getUserNotifications', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should get all notifications for a user', async () => {
    // Create test users
    const userResult1 = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userResult2 = await db.insert(usersTable)
      .values({
        ...testUser,
        email: 'test.user2@example.com'
      })
      .returning()
      .execute();

    const user1Id = userResult1[0].id;
    const user2Id = userResult2[0].id;

    // Create test notifications
    await db.insert(notificationsTable)
      .values([
        {
          ...testNotification1,
          user_id: user1Id
        },
        {
          ...testNotification2,
          user_id: user1Id
        },
        {
          ...testNotification3,
          user_id: user2Id
        }
      ])
      .execute();

    const input: GetUserNotificationsInput = {
      user_id: user1Id
    };

    const result = await getUserNotifications(input);

    // Should return only notifications for user1
    expect(result).toHaveLength(2);
    expect(result.every(notification => notification.user_id === user1Id)).toBe(true);
    
    // Check notification details
    const applicationNotification = result.find(n => n.type === 'application_status');
    expect(applicationNotification).toBeDefined();
    expect(applicationNotification?.title).toBe('Application Update');
    expect(applicationNotification?.message).toBe('Your application status has been updated');
    expect(applicationNotification?.email_sent).toBe(false);
    expect(applicationNotification?.read_at).toBeNull();
    expect(applicationNotification?.created_at).toBeInstanceOf(Date);

    const interviewNotification = result.find(n => n.type === 'interview_invitation');
    expect(interviewNotification).toBeDefined();
    expect(interviewNotification?.title).toBe('Interview Scheduled');
  });

  it('should return notifications ordered by created_at descending', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create notifications with different timestamps
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    await db.insert(notificationsTable)
      .values([
        {
          ...testNotification1,
          user_id: userId,
          title: 'Oldest Notification',
          created_at: twoHoursAgo
        },
        {
          ...testNotification2,
          user_id: userId,
          title: 'Newest Notification',
          created_at: now
        },
        {
          ...testNotification1,
          user_id: userId,
          title: 'Middle Notification',
          created_at: oneHourAgo
        }
      ])
      .execute();

    const input: GetUserNotificationsInput = {
      user_id: userId
    };

    const result = await getUserNotifications(input);

    expect(result).toHaveLength(3);
    
    // Should be ordered by created_at descending (newest first)
    expect(result[0].title).toBe('Newest Notification');
    expect(result[1].title).toBe('Middle Notification');
    expect(result[2].title).toBe('Oldest Notification');

    // Verify timestamps are in descending order
    expect(result[0].created_at.getTime()).toBeGreaterThan(result[1].created_at.getTime());
    expect(result[1].created_at.getTime()).toBeGreaterThan(result[2].created_at.getTime());
  });

  it('should filter unread notifications when unread_only is true', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create notifications - one read, one unread
    const notificationResults = await db.insert(notificationsTable)
      .values([
        {
          ...testNotification1,
          user_id: userId,
          title: 'Unread Notification'
        },
        {
          ...testNotification2,
          user_id: userId,
          title: 'Read Notification'
        }
      ])
      .returning()
      .execute();

    // Mark one notification as read
    await db.update(notificationsTable)
      .set({ read_at: new Date() })
      .where(eq(notificationsTable.id, notificationResults[1].id))
      .execute();

    const input: GetUserNotificationsInput = {
      user_id: userId,
      unread_only: true
    };

    const result = await getUserNotifications(input);

    // Should return only unread notifications
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Unread Notification');
    expect(result[0].read_at).toBeNull();
  });

  it('should return all notifications when unread_only is false', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create notifications - one read, one unread
    const notificationResults = await db.insert(notificationsTable)
      .values([
        {
          ...testNotification1,
          user_id: userId,
          title: 'Unread Notification'
        },
        {
          ...testNotification2,
          user_id: userId,
          title: 'Read Notification'
        }
      ])
      .returning()
      .execute();

    // Mark one notification as read
    await db.update(notificationsTable)
      .set({ read_at: new Date() })
      .where(eq(notificationsTable.id, notificationResults[1].id))
      .execute();

    const input: GetUserNotificationsInput = {
      user_id: userId,
      unread_only: false
    };

    const result = await getUserNotifications(input);

    // Should return both read and unread notifications
    expect(result).toHaveLength(2);
    expect(result.some(n => n.read_at === null)).toBe(true); // Has unread
    expect(result.some(n => n.read_at !== null)).toBe(true); // Has read
  });

  it('should return empty array for user with no notifications', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const userId = userResult[0].id;

    const input: GetUserNotificationsInput = {
      user_id: userId
    };

    const result = await getUserNotifications(input);

    expect(result).toHaveLength(0);
  });
});

describe('markNotificationAsRead', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should mark notification as read', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create test notification
    const notificationResult = await db.insert(notificationsTable)
      .values({
        ...testNotification1,
        user_id: userId
      })
      .returning()
      .execute();

    const notificationId = notificationResult[0].id;

    // Verify notification is initially unread
    expect(notificationResult[0].read_at).toBeNull();

    const result = await markNotificationAsRead(notificationId);

    // Check returned notification
    expect(result.id).toBe(notificationId);
    expect(result.user_id).toBe(userId);
    expect(result.type).toBe('application_status');
    expect(result.title).toBe('Application Update');
    expect(result.message).toBe('Your application status has been updated');
    expect(result.email_sent).toBe(false);
    expect(result.read_at).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);

    // Verify in database
    const updatedNotification = await db.select()
      .from(notificationsTable)
      .where(eq(notificationsTable.id, notificationId))
      .execute();

    expect(updatedNotification).toHaveLength(1);
    expect(updatedNotification[0].read_at).toBeInstanceOf(Date);
    expect(updatedNotification[0].read_at).not.toBeNull();
  });

  it('should update read_at timestamp correctly', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create test notification
    const notificationResult = await db.insert(notificationsTable)
      .values({
        ...testNotification1,
        user_id: userId
      })
      .returning()
      .execute();

    const notificationId = notificationResult[0].id;
    const beforeMarkTime = new Date();

    const result = await markNotificationAsRead(notificationId);

    const afterMarkTime = new Date();

    // Verify read_at is set to a reasonable timestamp
    expect(result.read_at).toBeInstanceOf(Date);
    expect(result.read_at!.getTime()).toBeGreaterThanOrEqual(beforeMarkTime.getTime());
    expect(result.read_at!.getTime()).toBeLessThanOrEqual(afterMarkTime.getTime());
  });

  it('should handle already read notifications', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create test notification that's already read
    const initialReadTime = new Date();
    const notificationResult = await db.insert(notificationsTable)
      .values({
        ...testNotification1,
        user_id: userId,
        read_at: initialReadTime
      })
      .returning()
      .execute();

    const notificationId = notificationResult[0].id;

    const result = await markNotificationAsRead(notificationId);

    // Should update the read_at timestamp even if already read
    expect(result.id).toBe(notificationId);
    expect(result.read_at).toBeInstanceOf(Date);
    expect(result.read_at!.getTime()).toBeGreaterThan(initialReadTime.getTime());
  });

  it('should throw error for non-existent notification', async () => {
    const nonExistentId = 99999;

    await expect(markNotificationAsRead(nonExistentId))
      .rejects.toThrow(/Notification with id 99999 not found/i);
  });
});