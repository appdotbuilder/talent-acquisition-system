import { db } from '../db';
import { interviewsTable, applicationsTable, usersTable, notificationsTable } from '../db/schema';
import { type ScheduleInterviewInput, type Interview } from '../schema';
import { eq } from 'drizzle-orm';

export const scheduleInterview = async (input: ScheduleInterviewInput): Promise<Interview> => {
  try {
    // Begin transaction to ensure data consistency
    const result = await db.transaction(async (tx) => {
      // 1. Verify application exists and get candidate info
      const applicationData = await tx.select({
        id: applicationsTable.id,
        candidate_id: applicationsTable.candidate_id,
        status: applicationsTable.status
      })
        .from(applicationsTable)
        .where(eq(applicationsTable.id, input.application_id))
        .execute();

      if (applicationData.length === 0) {
        throw new Error(`Application with ID ${input.application_id} not found`);
      }

      const application = applicationData[0];

      // 2. Verify interviewer exists
      const interviewerData = await tx.select()
        .from(usersTable)
        .where(eq(usersTable.id, input.interviewer_id))
        .execute();

      if (interviewerData.length === 0) {
        throw new Error(`Interviewer with ID ${input.interviewer_id} not found`);
      }

      // 3. Create the interview record
      const interviewResult = await tx.insert(interviewsTable)
        .values({
          application_id: input.application_id,
          interviewer_id: input.interviewer_id,
          scheduled_at: input.scheduled_at,
          duration_minutes: input.duration_minutes,
          location: input.location,
          meeting_link: input.meeting_link,
          status: 'scheduled'
        })
        .returning()
        .execute();

      const interview = interviewResult[0];

      // 4. Update application status to 'interview_scheduled'
      await tx.update(applicationsTable)
        .set({
          status: 'interview_scheduled',
          updated_at: new Date()
        })
        .where(eq(applicationsTable.id, input.application_id))
        .execute();

      // 5. Create notification for candidate
      await tx.insert(notificationsTable)
        .values({
          user_id: application.candidate_id,
          type: 'interview_invitation',
          title: 'Interview Scheduled',
          message: `Your interview has been scheduled for ${input.scheduled_at.toLocaleString()}`,
          email_sent: false
        })
        .execute();

      // 6. Create notification for interviewer
      await tx.insert(notificationsTable)
        .values({
          user_id: input.interviewer_id,
          type: 'interview_invitation',
          title: 'Interview Assignment',
          message: `You have been assigned to conduct an interview on ${input.scheduled_at.toLocaleString()}`,
          email_sent: false
        })
        .execute();

      return interview;
    });

    return result;
  } catch (error) {
    console.error('Interview scheduling failed:', error);
    throw error;
  }
};