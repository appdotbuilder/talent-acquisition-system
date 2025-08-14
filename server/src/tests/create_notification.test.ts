import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { notificationsTable, usersTable } from '../db/schema';
import { type CreateNotificationInput } from '../schema';
import { createNotification, sendEmailNotification } from '../handlers/create_notification';
import { eq } from 'drizzle-orm';

// Test data
const testUser = {
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  role: 'candidate' as const,
  department: 'IT',
  phone: '+1234567890'
};

const testNotificationInput: CreateNotificationInput = {
  user_id: 1, // Will be set after user creation
  type: 'application_status',
  title: 'Application Status Update',
  message: 'Your application has been reviewed'
};

describe('createNotification', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a notification successfully', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const userId = userResult[0].id;
    const input = { ...testNotificationInput, user_id: userId };

    const result = await createNotification(input);

    // Verify notification fields
    expect(result.id).toBeDefined();
    expect(result.user_id).toEqual(userId);
    expect(result.type).toEqual('application_status');
    expect(result.title).toEqual('Application Status Update');
    expect(result.message).toEqual('Your application has been reviewed');
    expect(result.email_sent).toBe(false);
    expect(result.read_at).toBeNull();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save notification to database', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const userId = userResult[0].id;
    const input = { ...testNotificationInput, user_id: userId };

    const result = await createNotification(input);

    // Verify database record
    const notifications = await db.select()
      .from(notificationsTable)
      .where(eq(notificationsTable.id, result.id))
      .execute();

    expect(notifications).toHaveLength(1);
    const notification = notifications[0];
    expect(notification.user_id).toEqual(userId);
    expect(notification.type).toEqual('application_status');
    expect(notification.title).toEqual('Application Status Update');
    expect(notification.message).toEqual('Your application has been reviewed');
    expect(notification.email_sent).toBe(false);
    expect(notification.created_at).toBeInstanceOf(Date);
  });

  it('should create notifications with different types', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const userId = userResult[0].id;

    const interviewNotification = {
      user_id: userId,
      type: 'interview_invitation' as const,
      title: 'Interview Invitation',
      message: 'You have been invited for an interview'
    };

    const result = await createNotification(interviewNotification);

    expect(result.type).toEqual('interview_invitation');
    expect(result.title).toEqual('Interview Invitation');
    expect(result.message).toEqual('You have been invited for an interview');
  });

  it('should create multiple notifications for same user', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const userId = userResult[0].id;

    const notification1 = await createNotification({
      user_id: userId,
      type: 'application_status',
      title: 'First Notification',
      message: 'First message'
    });

    const notification2 = await createNotification({
      user_id: userId,
      type: 'weekly_report',
      title: 'Second Notification',
      message: 'Second message'
    });

    expect(notification1.id).not.toEqual(notification2.id);
    expect(notification1.user_id).toEqual(userId);
    expect(notification2.user_id).toEqual(userId);

    // Verify both exist in database
    const notifications = await db.select()
      .from(notificationsTable)
      .where(eq(notificationsTable.user_id, userId))
      .execute();

    expect(notifications).toHaveLength(2);
  });

  it('should throw error when user does not exist', async () => {
    const input = { ...testNotificationInput, user_id: 999 };

    await expect(createNotification(input)).rejects.toThrow(/User with ID 999 not found/i);
  });
});

describe('sendEmailNotification', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should send email notification successfully', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create notification
    const notificationResult = await createNotification({
      user_id: userId,
      type: 'application_status',
      title: 'Test Notification',
      message: 'Test message'
    });

    const success = await sendEmailNotification(notificationResult.id);

    expect(success).toBe(true);

    // Verify email_sent flag was updated
    const updatedNotification = await db.select()
      .from(notificationsTable)
      .where(eq(notificationsTable.id, notificationResult.id))
      .execute();

    expect(updatedNotification[0].email_sent).toBe(true);
  });

  it('should return true if email already sent', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create notification
    const notificationResult = await createNotification({
      user_id: userId,
      type: 'application_status',
      title: 'Test Notification',
      message: 'Test message'
    });

    // Send email first time
    await sendEmailNotification(notificationResult.id);

    // Send email second time - should still return true
    const success = await sendEmailNotification(notificationResult.id);

    expect(success).toBe(true);
  });

  it('should throw error when notification does not exist', async () => {
    await expect(sendEmailNotification(999)).rejects.toThrow(/Notification with ID 999 not found/i);
  });

  it('should handle notification with user details correctly', async () => {
    // Create user with specific details
    const userResult = await db.insert(usersTable)
      .values({
        email: 'admin@company.com',
        first_name: 'Admin',
        last_name: 'User',
        role: 'admin',
        department: 'HR',
        phone: null
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create notification for admin
    const notificationResult = await createNotification({
      user_id: userId,
      type: 'job_approval',
      title: 'Job Approval Required',
      message: 'A new job posting requires your approval'
    });

    const success = await sendEmailNotification(notificationResult.id);

    expect(success).toBe(true);

    // Verify the notification was updated
    const notification = await db.select()
      .from(notificationsTable)
      .where(eq(notificationsTable.id, notificationResult.id))
      .execute();

    expect(notification[0].email_sent).toBe(true);
    expect(notification[0].type).toEqual('job_approval');
  });
});