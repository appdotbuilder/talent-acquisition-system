import { db } from '../db';
import { notificationsTable, usersTable } from '../db/schema';
import { type CreateNotificationInput, type Notification } from '../schema';
import { eq } from 'drizzle-orm';

export const createNotification = async (input: CreateNotificationInput): Promise<Notification> => {
  try {
    // Verify user exists before creating notification
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (!user || user.length === 0) {
      throw new Error(`User with ID ${input.user_id} not found`);
    }

    // Insert notification record
    const result = await db.insert(notificationsTable)
      .values({
        user_id: input.user_id,
        type: input.type,
        title: input.title,
        message: input.message,
        email_sent: false // Default value - email sending is separate
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Notification creation failed:', error);
    throw error;
  }
};

export const sendEmailNotification = async (notificationId: number): Promise<boolean> => {
  try {
    // Get notification details with user information
    const notificationData = await db.select({
      notification: notificationsTable,
      user: usersTable
    })
      .from(notificationsTable)
      .innerJoin(usersTable, eq(notificationsTable.user_id, usersTable.id))
      .where(eq(notificationsTable.id, notificationId))
      .execute();

    if (!notificationData || notificationData.length === 0) {
      throw new Error(`Notification with ID ${notificationId} not found`);
    }

    const { notification, user } = notificationData[0];

    // Check if email was already sent
    if (notification.email_sent) {
      return true; // Already sent
    }

    // Simulate email sending (in real implementation, this would integrate with email service)
    // For now, we'll just update the email_sent flag
    const updateResult = await db.update(notificationsTable)
      .set({ email_sent: true })
      .where(eq(notificationsTable.id, notificationId))
      .returning()
      .execute();

    return updateResult.length > 0;
  } catch (error) {
    console.error('Email notification sending failed:', error);
    throw error;
  }
};