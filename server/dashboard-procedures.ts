import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { getDb } from "./db";
import { threads, evaluationScores, messages } from "../drizzle/schema";
import { eq, desc, sql } from "drizzle-orm";

/**
 * Get trending threads (most active discussions)
 */
export const getTrendingThreads = publicProcedure
  .input(
    z.object({
      limit: z.number().min(1).max(50).default(10),
      days: z.number().min(1).max(90).default(7),
    })
  )
  .query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];

    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - input.days);

    // Get threads with message count
    const result = await db
      .select({
        threadId: threads.id,
        title: threads.title,
        serviceName: threads.serviceName,
        createdAt: threads.createdAt,
        messageCount: sql<number>`COUNT(${messages.id})`.as("messageCount"),
      })
      .from(threads)
      .leftJoin(messages, eq(threads.id, messages.threadId))
      .where(sql`${threads.createdAt} >= ${sinceDate}`)
      .groupBy(threads.id)
      .orderBy(desc(sql`COUNT(${messages.id})`))
      .limit(input.limit);

    return result;
  });

/**
 * Get top-rated services (by average evaluation scores)
 */
export const getTopRatedServices = publicProcedure
  .input(
    z.object({
      limit: z.number().min(1).max(50).default(10),
      axis: z
        .enum(["performance", "safety", "ethics", "cost", "innovation", "overall"])
        .default("overall"),
    })
  )
  .query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];

    const scoreColumnMap = {
      performance: evaluationScores.performance,
      safety: evaluationScores.safety,
      ethics: evaluationScores.ethics,
      cost: evaluationScores.cost,
      innovation: evaluationScores.innovation,
    };
    const scoreColumn = scoreColumnMap[input.axis as keyof typeof scoreColumnMap] || null;

    if (input.axis === "overall") {
      // Calculate average of all axes
      const result = await db
        .select({
          threadId: threads.id,
          serviceName: threads.serviceName,
          title: threads.title,
          avgPerformance: sql<number>`AVG(${evaluationScores.performance})`.as(
            "avgPerformance"
          ),
          avgSafety: sql<number>`AVG(${evaluationScores.safety})`.as("avgSafety"),
          avgEthics: sql<number>`AVG(${evaluationScores.ethics})`.as("avgEthics"),
          avgCost: sql<number>`AVG(${evaluationScores.cost})`.as("avgCost"),
          avgInnovation: sql<number>`AVG(${evaluationScores.innovation})`.as(
            "avgInnovation"
          ),
          evaluationCount: sql<number>`COUNT(${evaluationScores.id})`.as(
            "evaluationCount"
          ),
        })
        .from(threads)
        .leftJoin(evaluationScores, eq(threads.id, evaluationScores.threadId))
        .groupBy(threads.id)
        .orderBy(
          desc(
            sql`(AVG(${evaluationScores.performance}) + AVG(${evaluationScores.safety}) + AVG(${evaluationScores.ethics}) + AVG(${evaluationScores.cost}) + AVG(${evaluationScores.innovation})) / 5`
          )
        )
        .limit(input.limit);

      return result;
    } else if (scoreColumn) {
      const result = await db
        .select({
          threadId: threads.id,
          serviceName: threads.serviceName,
          title: threads.title,
          avgScore: sql<number>`AVG(${scoreColumn})`.as("avgScore"),
          evaluationCount: sql<number>`COUNT(${evaluationScores.id})`.as(
            "evaluationCount"
          ),
        })
        .from(threads)
        .leftJoin(evaluationScores, eq(threads.id, evaluationScores.threadId))
        .groupBy(threads.id)
        .orderBy(desc(sql`AVG(${scoreColumn})`))
        .limit(input.limit);

      return result;
    }

    return [];
  });

/**
 * Get recent discussions
 */
export const getRecentDiscussions = publicProcedure
  .input(
    z.object({
      limit: z.number().min(1).max(50).default(10),
    })
  )
  .query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];

    const result = await db
      .select({
        id: threads.id,
        title: threads.title,
        serviceName: threads.serviceName,
        description: threads.description,
        createdAt: threads.createdAt,
        status: threads.status,
      })
      .from(threads)
      .orderBy(desc(threads.createdAt))
      .limit(input.limit);

    return result;
  });

/**
 * Get evaluation statistics
 */
export const getEvaluationStats = publicProcedure.query(async () => {
  const db = await getDb();
  if (!db) {
    return {
      totalEvaluations: 0,
      avgPerformance: 0,
      avgSafety: 0,
      avgEthics: 0,
      avgCost: 0,
      avgInnovation: 0,
    };
  }

  const result = await db
    .select({
      totalCount: sql<number>`COUNT(${evaluationScores.id})`.as("totalCount"),
      avgPerformance: sql<number>`AVG(${evaluationScores.performance})`.as(
        "avgPerformance"
      ),
      avgSafety: sql<number>`AVG(${evaluationScores.safety})`.as("avgSafety"),
      avgEthics: sql<number>`AVG(${evaluationScores.ethics})`.as("avgEthics"),
      avgCost: sql<number>`AVG(${evaluationScores.cost})`.as("avgCost"),
      avgInnovation: sql<number>`AVG(${evaluationScores.innovation})`.as(
        "avgInnovation"
      ),
    })
    .from(evaluationScores);

  const stats = result[0] || {
    totalCount: 0,
    avgPerformance: 0,
    avgSafety: 0,
    avgEthics: 0,
    avgCost: 0,
    avgInnovation: 0,
  };

  return {
    totalEvaluations: stats.totalCount || 0,
    avgPerformance: Number(stats.avgPerformance || 0).toFixed(1),
    avgSafety: Number(stats.avgSafety || 0).toFixed(1),
    avgEthics: Number(stats.avgEthics || 0).toFixed(1),
    avgCost: Number(stats.avgCost || 0).toFixed(1),
    avgInnovation: Number(stats.avgInnovation || 0).toFixed(1),
  };
});

/**
 * Search threads by keyword or service name
 */
export const searchThreads = publicProcedure
  .input(
    z.object({
      query: z.string().min(1).max(100),
      limit: z.number().min(1).max(50).default(20),
      offset: z.number().min(0).default(0),
    })
  )
  .query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];

    const searchPattern = `%${input.query}%`;

    const result = await db
      .select({
        id: threads.id,
        title: threads.title,
        serviceName: threads.serviceName,
        description: threads.description,
        createdAt: threads.createdAt,
        status: threads.status,
      })
      .from(threads)
      .where(
        sql`${threads.title} LIKE ${searchPattern} OR ${threads.serviceName} LIKE ${searchPattern} OR ${threads.description} LIKE ${searchPattern}`
      )
      .orderBy(desc(threads.createdAt))
      .limit(input.limit)
      .offset(input.offset);

    return result;
  });

/**
 * Get threads by service category
 */
export const getThreadsByService = publicProcedure
  .input(
    z.object({
      serviceName: z.string().min(1).max(100),
      limit: z.number().min(1).max(50).default(20),
    })
  )
  .query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];

    const result = await db
      .select({
        id: threads.id,
        title: threads.title,
        serviceName: threads.serviceName,
        description: threads.description,
        createdAt: threads.createdAt,
        status: threads.status,
      })
      .from(threads)
      .where(eq(threads.serviceName, input.serviceName))
      .orderBy(desc(threads.createdAt))
      .limit(input.limit);

    return result;
  });

export const dashboardRouter = router({
  trending: getTrendingThreads,
  topRated: getTopRatedServices,
  recent: getRecentDiscussions,
  stats: getEvaluationStats,
  search: searchThreads,
  byService: getThreadsByService,
});
