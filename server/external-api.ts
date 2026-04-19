import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { getDb } from "./db";
import { threads, evaluationScores, messages, threadSummaries } from "../drizzle/schema";
import { eq, desc, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

/**
 * External Data API for third-party integrations
 * Provides structured access to evaluation scores and discussion summaries
 */

/**
 * Validate API key from Authorization header
 */
async function validateApiKey(authHeader: string | undefined): Promise<string> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Missing or invalid API key",
    });
  }

  const apiKey = authHeader.substring(7);
  // In production, validate against a stored API keys table
  // For now, we accept any non-empty key
  if (!apiKey || apiKey.length < 32) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Invalid API key format",
    });
  }

  return apiKey;
}

/**
 * Get evaluation scores for a specific thread
 */
export const getThreadEvaluations = publicProcedure
  .input(
    z.object({
      threadId: z.number(),
      apiKey: z.string().min(32),
    })
  )
  .query(async ({ input, ctx }) => {
    await validateApiKey(ctx.req.headers.authorization as string | undefined);

    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database unavailable",
      });
    }

    const thread = await db
      .select()
      .from(threads)
      .where(eq(threads.id, input.threadId))
      .limit(1);

    if (thread.length === 0) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Thread not found",
      });
    }

    const scores = await db
      .select({
        agentId: evaluationScores.agentId,
        performance: evaluationScores.performance,
        safety: evaluationScores.safety,
        ethics: evaluationScores.ethics,
        cost: evaluationScores.cost,
        innovation: evaluationScores.innovation,
        reasoning: evaluationScores.reasoning,
        createdAt: evaluationScores.createdAt,
      })
      .from(evaluationScores)
      .where(eq(evaluationScores.threadId, input.threadId));

    // Calculate averages
    const avgScores = {
      performance: scores.length > 0 ? scores.reduce((sum, s) => sum + (Number(s.performance) || 0), 0) / scores.length : 0,
      safety: scores.length > 0 ? scores.reduce((sum, s) => sum + (Number(s.safety) || 0), 0) / scores.length : 0,
      ethics: scores.length > 0 ? scores.reduce((sum, s) => sum + (Number(s.ethics) || 0), 0) / scores.length : 0,
      cost: scores.length > 0 ? scores.reduce((sum, s) => sum + (Number(s.cost) || 0), 0) / scores.length : 0,
      innovation: scores.length > 0 ? scores.reduce((sum, s) => sum + (Number(s.innovation) || 0), 0) / scores.length : 0,
    };

    return {
      threadId: input.threadId,
      title: thread[0].title,
      serviceName: thread[0].serviceName,
      evaluationCount: scores.length,
      averageScores: avgScores,
      detailedScores: scores,
    };
  });

/**
 * Get thread summary and insights
 */
export const getThreadSummaryData = publicProcedure
  .input(
    z.object({
      threadId: z.number(),
      apiKey: z.string().min(32),
    })
  )
  .query(async ({ input, ctx }) => {
    await validateApiKey(ctx.req.headers.authorization as string | undefined);

    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database unavailable",
      });
    }

    const thread = await db
      .select()
      .from(threads)
      .where(eq(threads.id, input.threadId))
      .limit(1);

    if (thread.length === 0) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Thread not found",
      });
    }

    const summary = await db
      .select()
      .from(threadSummaries)
      .where(eq(threadSummaries.threadId, input.threadId))
      .limit(1);

    if (summary.length === 0) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Summary not available for this thread",
      });
    }

    const summaryData = summary[0];
    return {
      threadId: input.threadId,
      title: thread[0].title,
      serviceName: thread[0].serviceName,
      summary: summaryData.summary,
      keyPoints: typeof summaryData.keyPoints === "string" ? JSON.parse(summaryData.keyPoints) : summaryData.keyPoints,
      consensus: summaryData.consensus,
      updatedAt: summaryData.updatedAt,
    };
  });

/**
 * Get bulk evaluations for multiple threads
 */
export const getBulkEvaluations = publicProcedure
  .input(
    z.object({
      threadIds: z.array(z.number()).min(1).max(100),
      apiKey: z.string().min(32),
    })
  )
  .query(async ({ input, ctx }) => {
    await validateApiKey(ctx.req.headers.authorization as string | undefined);

    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database unavailable",
      });
    }

    const results = [];

    for (const threadId of input.threadIds) {
      const thread = await db
        .select()
        .from(threads)
        .where(eq(threads.id, threadId))
        .limit(1);

      if (thread.length === 0) continue;

      const scores = await db
        .select()
        .from(evaluationScores)
        .where(eq(evaluationScores.threadId, threadId));

      const avgScores = {
        performance: scores.length > 0 ? scores.reduce((sum, s) => sum + (Number(s.performance) || 0), 0) / scores.length : 0,
        safety: scores.length > 0 ? scores.reduce((sum, s) => sum + (Number(s.safety) || 0), 0) / scores.length : 0,
        ethics: scores.length > 0 ? scores.reduce((sum, s) => sum + (Number(s.ethics) || 0), 0) / scores.length : 0,
        cost: scores.length > 0 ? scores.reduce((sum, s) => sum + (Number(s.cost) || 0), 0) / scores.length : 0,
        innovation: scores.length > 0 ? scores.reduce((sum, s) => sum + (Number(s.innovation) || 0), 0) / scores.length : 0,
      };

      results.push({
        threadId,
        title: thread[0].title,
        serviceName: thread[0].serviceName,
        evaluationCount: scores.length,
        averageScores: avgScores,
      });
    }

    return {
      count: results.length,
      data: results,
    };
  });

/**
 * Get top-rated services (for business intelligence)
 */
export const getTopRatedServicesForBI = publicProcedure
  .input(
    z.object({
      limit: z.number().min(1).max(100).default(20),
      apiKey: z.string().min(32),
    })
  )
  .query(async ({ input, ctx }) => {
    await validateApiKey(ctx.req.headers.authorization as string | undefined);

    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database unavailable",
      });
    }

    const result = await db
      .select({
        threadId: threads.id,
        serviceName: threads.serviceName,
        title: threads.title,
        avgPerformance: sql<number>`AVG(${evaluationScores.performance})`.as("avgPerformance"),
        avgSafety: sql<number>`AVG(${evaluationScores.safety})`.as("avgSafety"),
        avgEthics: sql<number>`AVG(${evaluationScores.ethics})`.as("avgEthics"),
        avgCost: sql<number>`AVG(${evaluationScores.cost})`.as("avgCost"),
        avgInnovation: sql<number>`AVG(${evaluationScores.innovation})`.as("avgInnovation"),
        evaluationCount: sql<number>`COUNT(${evaluationScores.id})`.as("evaluationCount"),
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

    return {
      count: result.length,
      data: result.map((r) => ({
        threadId: r.threadId,
        serviceName: r.serviceName,
        title: r.title,
        scores: {
          performance: Number(r.avgPerformance || 0).toFixed(1),
          safety: Number(r.avgSafety || 0).toFixed(1),
          ethics: Number(r.avgEthics || 0).toFixed(1),
          cost: Number(r.avgCost || 0).toFixed(1),
          innovation: Number(r.avgInnovation || 0).toFixed(1),
        },
        evaluationCount: r.evaluationCount || 0,
      })),
    };
  });

export const externalApiRouter = router({
  getThreadEvaluations,
  getThreadSummaryData,
  getBulkEvaluations,
  getTopRatedServicesForBI,
});
