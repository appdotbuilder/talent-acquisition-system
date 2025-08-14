import { db } from '../db';
import { notificationsTable } from '../db/schema';
import { type Notification, type GetUserNotificationsInput } from '../schema';
import { eq, and, isNull, desc, SQL } from 'drizzle-orm';

export const getUserNotifications = async (input: GetUserNotificationsInput): Promise<Notification[]> => {
  try {
    // Build conditions array
    const conditions: SQL<unknown>[] = [];
    
    // Always filter by user_id
    conditions.push(eq(notificationsTable.user_id, input.user_id));
    
    // Apply unread filter if specified
    if (input.unread_only === true) {
      conditions.push(isNull(notificationsTable.read_at));
    }

    // Build complete query in one chain
    const results = await db.select()
      .from(notificationsTable)
      .where(conditions.length === 1 ? conditions[0] : and(...conditions))
      .orderBy(desc(notificationsTable.created_at))
      .execute();

    // Convert database results to schema format
    return results.map(notification => ({
      id: notification.id,
      user_id: notification.user_id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      email_sent: notification.email_sent,
      read_at: notification.read_at,
      created_at: notification.created_at
    }));
  } catch (error) {
    console.error('Failed to get user notifications:', error);
    throw error;
  }
};

export const markNotificationAsRead = async (notificationId: number): Promise<Notification> => {
  try {
    // Update the notification with current timestamp
    const result = await db.update(notificationsTable)
      .set({
        read_at: new Date()
      })
      .where(eq(notificationsTable.id, notificationId))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Notification with id ${notificationId} not found`);
    }

    const notification = result[0];
    
    return {
      id: notification.id,
      user_id: notification.user_id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      email_sent: notification.email_sent,
      read_at: notification.read_at,
      created_at: notification.created_at
    };
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
    throw error;
  }
};