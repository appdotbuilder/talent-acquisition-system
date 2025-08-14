import { db } from '../db';
import { 
  usersTable, 
  jobsTable, 
  applicationsTable, 
  interviewsTable, 
  aiParsedDataTable 
} from '../db/schema';
import { eq, count, and, avg, gte, desc, sql } from 'drizzle-orm';
import { type UserRole } from '../schema';

interface CandidateDashboardData {
    totalApplications: number;
    pendingApplications: number;
    shortlistedApplications: number;
    upcomingInterviews: number;
    recentApplications: any[];
    upcomingInterviewSchedules: any[];
}

interface RequesterDashboardData {
    totalJobPostings: number;
    pendingApprovals: number;
    activeJobPostings: number;
    totalApplicationsReceived: number;
    candidatesInPipeline: number;
    averageMatchScore: number;
    recentApplications: any[];
    weeklyMetrics: any;
}

interface AdminDashboardData {
    totalUsers: number;
    totalJobs: number;
    totalApplications: number;
    pendingJobApprovals: number;
    aiProcessingQueue: number;
    systemMetrics: any;
    recentActivity: any[];
}

export const getCandidateDashboard = async (candidateId: number): Promise<CandidateDashboardData> => {
    try {
        // Get total applications count
        const totalApplicationsResult = await db
            .select({ count: count() })
            .from(applicationsTable)
            .where(eq(applicationsTable.candidate_id, candidateId))
            .execute();

        // Get pending applications count
        const pendingApplicationsResult = await db
            .select({ count: count() })
            .from(applicationsTable)
            .where(
                and(
                    eq(applicationsTable.candidate_id, candidateId),
                    eq(applicationsTable.status, 'pending')
                )
            )
            .execute();

        // Get shortlisted applications count
        const shortlistedApplicationsResult = await db
            .select({ count: count() })
            .from(applicationsTable)
            .where(
                and(
                    eq(applicationsTable.candidate_id, candidateId),
                    eq(applicationsTable.status, 'shortlisted')
                )
            )
            .execute();

        // Get upcoming interviews count
        const now = new Date();
        const upcomingInterviewsResult = await db
            .select({ count: count() })
            .from(interviewsTable)
            .innerJoin(applicationsTable, eq(interviewsTable.application_id, applicationsTable.id))
            .where(
                and(
                    eq(applicationsTable.candidate_id, candidateId),
                    gte(interviewsTable.scheduled_at, now),
                    eq(interviewsTable.status, 'scheduled')
                )
            )
            .execute();

        // Get recent applications (last 5)
        const recentApplicationsResult = await db
            .select({
                id: applicationsTable.id,
                job_title: jobsTable.title,
                status: applicationsTable.status,
                created_at: applicationsTable.created_at,
                ai_match_score: applicationsTable.ai_match_score,
                company_department: jobsTable.department
            })
            .from(applicationsTable)
            .innerJoin(jobsTable, eq(applicationsTable.job_id, jobsTable.id))
            .where(eq(applicationsTable.candidate_id, candidateId))
            .orderBy(desc(applicationsTable.created_at))
            .limit(5)
            .execute();

        // Get upcoming interview schedules
        const upcomingInterviewSchedulesResult = await db
            .select({
                id: interviewsTable.id,
                job_title: jobsTable.title,
                scheduled_at: interviewsTable.scheduled_at,
                duration_minutes: interviewsTable.duration_minutes,
                location: interviewsTable.location,
                meeting_link: interviewsTable.meeting_link,
                interviewer_name: sql<string>`CONCAT(${usersTable.first_name}, ' ', ${usersTable.last_name})`,
                application_id: interviewsTable.application_id
            })
            .from(interviewsTable)
            .innerJoin(applicationsTable, eq(interviewsTable.application_id, applicationsTable.id))
            .innerJoin(jobsTable, eq(applicationsTable.job_id, jobsTable.id))
            .innerJoin(usersTable, eq(interviewsTable.interviewer_id, usersTable.id))
            .where(
                and(
                    eq(applicationsTable.candidate_id, candidateId),
                    gte(interviewsTable.scheduled_at, now),
                    eq(interviewsTable.status, 'scheduled')
                )
            )
            .orderBy(interviewsTable.scheduled_at)
            .execute();

        return {
            totalApplications: totalApplicationsResult[0]?.count || 0,
            pendingApplications: pendingApplicationsResult[0]?.count || 0,
            shortlistedApplications: shortlistedApplicationsResult[0]?.count || 0,
            upcomingInterviews: upcomingInterviewsResult[0]?.count || 0,
            recentApplications: recentApplicationsResult,
            upcomingInterviewSchedules: upcomingInterviewSchedulesResult
        };
    } catch (error) {
        console.error('Candidate dashboard fetch failed:', error);
        throw error;
    }
};

export const getRequesterDashboard = async (requesterId: number): Promise<RequesterDashboardData> => {
    try {
        // Get total job postings count
        const totalJobPostingsResult = await db
            .select({ count: count() })
            .from(jobsTable)
            .where(eq(jobsTable.created_by, requesterId))
            .execute();

        // Get pending approvals count
        const pendingApprovalsResult = await db
            .select({ count: count() })
            .from(jobsTable)
            .where(
                and(
                    eq(jobsTable.created_by, requesterId),
                    eq(jobsTable.status, 'pending_approval')
                )
            )
            .execute();

        // Get active job postings count (published jobs)
        const activeJobPostingsResult = await db
            .select({ count: count() })
            .from(jobsTable)
            .where(
                and(
                    eq(jobsTable.created_by, requesterId),
                    eq(jobsTable.status, 'published')
                )
            )
            .execute();

        // Get total applications received for requester's jobs
        const totalApplicationsResult = await db
            .select({ count: count() })
            .from(applicationsTable)
            .innerJoin(jobsTable, eq(applicationsTable.job_id, jobsTable.id))
            .where(eq(jobsTable.created_by, requesterId))
            .execute();

        // Get candidates in pipeline (not rejected/hired)
        const candidatesInPipelineResult = await db
            .select({ count: count() })
            .from(applicationsTable)
            .innerJoin(jobsTable, eq(applicationsTable.job_id, jobsTable.id))
            .where(
                and(
                    eq(jobsTable.created_by, requesterId),
                    sql`${applicationsTable.status} NOT IN ('rejected', 'hired', 'offer_rejected')`
                )
            )
            .execute();

        // Get average match score
        const averageMatchScoreResult = await db
            .select({ avg: avg(applicationsTable.ai_match_score) })
            .from(applicationsTable)
            .innerJoin(jobsTable, eq(applicationsTable.job_id, jobsTable.id))
            .where(
                and(
                    eq(jobsTable.created_by, requesterId),
                    sql`${applicationsTable.ai_match_score} IS NOT NULL`
                )
            )
            .execute();

        // Get recent applications (last 10)
        const recentApplicationsResult = await db
            .select({
                id: applicationsTable.id,
                job_title: jobsTable.title,
                candidate_name: sql<string>`CONCAT(${usersTable.first_name}, ' ', ${usersTable.last_name})`,
                status: applicationsTable.status,
                ai_match_score: applicationsTable.ai_match_score,
                created_at: applicationsTable.created_at
            })
            .from(applicationsTable)
            .innerJoin(jobsTable, eq(applicationsTable.job_id, jobsTable.id))
            .innerJoin(usersTable, eq(applicationsTable.candidate_id, usersTable.id))
            .where(eq(jobsTable.created_by, requesterId))
            .orderBy(desc(applicationsTable.created_at))
            .limit(10)
            .execute();

        // Get weekly metrics (last 7 days)
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        const weeklyApplicationsResult = await db
            .select({ count: count() })
            .from(applicationsTable)
            .innerJoin(jobsTable, eq(applicationsTable.job_id, jobsTable.id))
            .where(
                and(
                    eq(jobsTable.created_by, requesterId),
                    gte(applicationsTable.created_at, weekAgo)
                )
            )
            .execute();

        const weeklyInterviewsResult = await db
            .select({ count: count() })
            .from(interviewsTable)
            .innerJoin(applicationsTable, eq(interviewsTable.application_id, applicationsTable.id))
            .innerJoin(jobsTable, eq(applicationsTable.job_id, jobsTable.id))
            .where(
                and(
                    eq(jobsTable.created_by, requesterId),
                    gte(interviewsTable.created_at, weekAgo)
                )
            )
            .execute();

        return {
            totalJobPostings: totalJobPostingsResult[0]?.count || 0,
            pendingApprovals: pendingApprovalsResult[0]?.count || 0,
            activeJobPostings: activeJobPostingsResult[0]?.count || 0,
            totalApplicationsReceived: totalApplicationsResult[0]?.count || 0,
            candidatesInPipeline: candidatesInPipelineResult[0]?.count || 0,
            averageMatchScore: Math.round(Number(averageMatchScoreResult[0]?.avg) || 0),
            recentApplications: recentApplicationsResult,
            weeklyMetrics: {
                applications: weeklyApplicationsResult[0]?.count || 0,
                interviews: weeklyInterviewsResult[0]?.count || 0
            }
        };
    } catch (error) {
        console.error('Requester dashboard fetch failed:', error);
        throw error;
    }
};

export const getAdminDashboard = async (): Promise<AdminDashboardData> => {
    try {
        // Get total users count
        const totalUsersResult = await db
            .select({ count: count() })
            .from(usersTable)
            .execute();

        // Get total jobs count
        const totalJobsResult = await db
            .select({ count: count() })
            .from(jobsTable)
            .execute();

        // Get total applications count
        const totalApplicationsResult = await db
            .select({ count: count() })
            .from(applicationsTable)
            .execute();

        // Get pending job approvals count
        const pendingJobApprovalsResult = await db
            .select({ count: count() })
            .from(jobsTable)
            .where(eq(jobsTable.status, 'pending_approval'))
            .execute();

        // Get AI processing queue count
        const aiProcessingQueueResult = await db
            .select({ count: count() })
            .from(aiParsedDataTable)
            .where(sql`${aiParsedDataTable.processing_status} IN ('pending', 'processing')`)
            .execute();

        // Get system metrics
        const usersByRoleResult = await db
            .select({
                role: usersTable.role,
                count: count()
            })
            .from(usersTable)
            .groupBy(usersTable.role)
            .execute();

        const applicationsByStatusResult = await db
            .select({
                status: applicationsTable.status,
                count: count()
            })
            .from(applicationsTable)
            .groupBy(applicationsTable.status)
            .execute();

        const jobsByStatusResult = await db
            .select({
                status: jobsTable.status,
                count: count()
            })
            .from(jobsTable)
            .groupBy(jobsTable.status)
            .execute();

        // Get recent activity (recent jobs, applications, interviews)
        const recentJobsResult = await db
            .select({
                type: sql<string>`'job'`,
                id: jobsTable.id,
                title: jobsTable.title,
                user_name: sql<string>`CONCAT(${usersTable.first_name}, ' ', ${usersTable.last_name})`,
                created_at: jobsTable.created_at
            })
            .from(jobsTable)
            .innerJoin(usersTable, eq(jobsTable.created_by, usersTable.id))
            .orderBy(desc(jobsTable.created_at))
            .limit(5)
            .execute();

        const recentApplicationsResult = await db
            .select({
                type: sql<string>`'application'`,
                id: applicationsTable.id,
                title: jobsTable.title,
                user_name: sql<string>`CONCAT(${usersTable.first_name}, ' ', ${usersTable.last_name})`,
                created_at: applicationsTable.created_at
            })
            .from(applicationsTable)
            .innerJoin(jobsTable, eq(applicationsTable.job_id, jobsTable.id))
            .innerJoin(usersTable, eq(applicationsTable.candidate_id, usersTable.id))
            .orderBy(desc(applicationsTable.created_at))
            .limit(5)
            .execute();

        const recentActivity = [...recentJobsResult, ...recentApplicationsResult]
            .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
            .slice(0, 10);

        return {
            totalUsers: totalUsersResult[0]?.count || 0,
            totalJobs: totalJobsResult[0]?.count || 0,
            totalApplications: totalApplicationsResult[0]?.count || 0,
            pendingJobApprovals: pendingJobApprovalsResult[0]?.count || 0,
            aiProcessingQueue: aiProcessingQueueResult[0]?.count || 0,
            systemMetrics: {
                usersByRole: usersByRoleResult,
                applicationsByStatus: applicationsByStatusResult,
                jobsByStatus: jobsByStatusResult
            },
            recentActivity
        };
    } catch (error) {
        console.error('Admin dashboard fetch failed:', error);
        throw error;
    }
};