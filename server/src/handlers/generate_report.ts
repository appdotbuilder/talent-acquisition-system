import { db } from '../db';
import { reportsTable, applicationsTable, jobsTable, interviewsTable } from '../db/schema';
import { type Report } from '../schema';
import { eq, and, gte, lte, count, avg, sql } from 'drizzle-orm';

export const generateWeeklyReport = async (requesterId: number, weekStart: Date, weekEnd: Date): Promise<Report> => {
  try {
    // Calculate metrics for jobs created by this requester within the date range
    
    // Get total applications for requester's jobs within date range
    const totalApplicationsResult = await db
      .select({ count: count() })
      .from(applicationsTable)
      .innerJoin(jobsTable, eq(applicationsTable.job_id, jobsTable.id))
      .where(
        and(
          eq(jobsTable.created_by, requesterId),
          gte(applicationsTable.created_at, weekStart),
          lte(applicationsTable.created_at, weekEnd)
        )
      )
      .execute();

    const totalApplications = totalApplicationsResult[0]?.count || 0;

    // Get shortlisted applications count
    const shortlistedResult = await db
      .select({ count: count() })
      .from(applicationsTable)
      .innerJoin(jobsTable, eq(applicationsTable.job_id, jobsTable.id))
      .where(
        and(
          eq(jobsTable.created_by, requesterId),
          eq(applicationsTable.status, 'shortlisted'),
          gte(applicationsTable.created_at, weekStart),
          lte(applicationsTable.created_at, weekEnd)
        )
      )
      .execute();

    const shortlistedApplications = shortlistedResult[0]?.count || 0;

    // Get interviews scheduled count
    const interviewsResult = await db
      .select({ count: count() })
      .from(interviewsTable)
      .innerJoin(applicationsTable, eq(interviewsTable.application_id, applicationsTable.id))
      .innerJoin(jobsTable, eq(applicationsTable.job_id, jobsTable.id))
      .where(
        and(
          eq(jobsTable.created_by, requesterId),
          gte(interviewsTable.created_at, weekStart),
          lte(interviewsTable.created_at, weekEnd)
        )
      )
      .execute();

    const interviewsScheduled = interviewsResult[0]?.count || 0;

    // Get offers extended count
    const offersResult = await db
      .select({ count: count() })
      .from(applicationsTable)
      .innerJoin(jobsTable, eq(applicationsTable.job_id, jobsTable.id))
      .where(
        and(
          eq(jobsTable.created_by, requesterId),
          eq(applicationsTable.status, 'offer_made'),
          gte(applicationsTable.updated_at, weekStart),
          lte(applicationsTable.updated_at, weekEnd)
        )
      )
      .execute();

    const offersExtended = offersResult[0]?.count || 0;

    // Get average match score for applications with scores
    const matchScoreResult = await db
      .select({ 
        avgScore: avg(applicationsTable.ai_match_score) 
      })
      .from(applicationsTable)
      .innerJoin(jobsTable, eq(applicationsTable.job_id, jobsTable.id))
      .where(
        and(
          eq(jobsTable.created_by, requesterId),
          gte(applicationsTable.created_at, weekStart),
          lte(applicationsTable.created_at, weekEnd),
          sql`${applicationsTable.ai_match_score} IS NOT NULL`
        )
      )
      .execute();

    const averageMatchRate = matchScoreResult[0]?.avgScore ? Number(matchScoreResult[0].avgScore) : 0;

    // Calculate offer acceptance rate
    const acceptedOffersResult = await db
      .select({ count: count() })
      .from(applicationsTable)
      .innerJoin(jobsTable, eq(applicationsTable.job_id, jobsTable.id))
      .where(
        and(
          eq(jobsTable.created_by, requesterId),
          eq(applicationsTable.status, 'offer_accepted'),
          gte(applicationsTable.updated_at, weekStart),
          lte(applicationsTable.updated_at, weekEnd)
        )
      )
      .execute();

    const acceptedOffers = acceptedOffersResult[0]?.count || 0;
    const offerAcceptanceRate = offersExtended > 0 ? (acceptedOffers / offersExtended) * 100 : 0;

    // Calculate average time to fill (days from job creation to offer acceptance)
    const timeToFillResult = await db
      .select({
        avgDays: sql<string>`AVG(EXTRACT(epoch FROM ${applicationsTable.updated_at} - ${jobsTable.created_at})) / 86400`
      })
      .from(applicationsTable)
      .innerJoin(jobsTable, eq(applicationsTable.job_id, jobsTable.id))
      .where(
        and(
          eq(jobsTable.created_by, requesterId),
          eq(applicationsTable.status, 'offer_accepted'),
          gte(applicationsTable.updated_at, weekStart),
          lte(applicationsTable.updated_at, weekEnd)
        )
      )
      .execute();

    const timeToFill = timeToFillResult[0]?.avgDays ? parseFloat(timeToFillResult[0].avgDays) : 0;

    // Create report data
    const reportData: Record<string, unknown> = {
      timeToFill: Math.round(timeToFill * 100) / 100, // Round to 2 decimal places
      offerAcceptanceRate: Math.round(offerAcceptanceRate * 100) / 100,
      averageMatchRate: Math.round(averageMatchRate * 100) / 100,
      totalApplications: totalApplications,
      shortlistedApplications: shortlistedApplications,
      interviewsScheduled: interviewsScheduled,
      offersExtended: offersExtended
    };

    // Insert report record
    const result = await db.insert(reportsTable)
      .values({
        requester_id: requesterId,
        report_type: 'weekly',
        report_data: reportData,
        file_path: null, // For now, not generating actual PDF
        week_start: weekStart,
        week_end: weekEnd
      })
      .returning()
      .execute();

    // Cast report_data to the correct type
    const report = result[0];
    return {
      ...report,
      report_data: report.report_data as Record<string, unknown>
    };
  } catch (error) {
    console.error('Weekly report generation failed:', error);
    throw error;
  }
};

export const getReportsByRequester = async (requesterId: number): Promise<Report[]> => {
  try {
    const reports = await db
      .select()
      .from(reportsTable)
      .where(eq(reportsTable.requester_id, requesterId))
      .orderBy(reportsTable.generated_at)
      .execute();

    // Cast report_data to the correct type for each report
    return reports.map(report => ({
      ...report,
      report_data: report.report_data as Record<string, unknown>
    }));
  } catch (error) {
    console.error('Failed to fetch reports:', error);
    throw error;
  }
};