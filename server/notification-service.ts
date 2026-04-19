import { getDb } from "./db";
import { notifyOwner } from "./_core/notification";
import { threads, messages, evaluationScores, users } from "../drizzle/schema";
import { eq, sql } from "drizzle-orm";

/**
 * Notification Service
 * Handles email notifications for important events
 */

/**
 * Notify about a new discussion thread
 */
export async function notifyNewThread(threadId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    const thread = await db
      .select()
      .from(threads)
      .where(eq(threads.id, threadId))
      .limit(1);

    if (thread.length === 0) return;

    const threadData = thread[0];

    // Notify owner via built-in notification system
    await notifyOwner({
      title: `New AI Discussion: ${threadData.title}`,
      content: `A new discussion thread has been created about "${threadData.serviceName}". ${threadData.description ? `Description: ${threadData.description}` : ""}`,
    });

    console.log(`[Notification] New thread notification sent for thread ${threadId}`);
  } catch (error) {
    console.error("[Notification] Failed to send new thread notification:", error);
  }
}

/**
 * Notify about trending discussion
 */
export async function notifyTrendingDiscussion(threadId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    const thread = await db
      .select()
      .from(threads)
      .where(eq(threads.id, threadId))
      .limit(1);

    if (thread.length === 0) return;

    const threadData = thread[0];

    // Get message count
    const messageCount = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(messages)
      .where(eq(messages.threadId, threadId));

    const count = messageCount[0]?.count || 0;

    await notifyOwner({
      title: `Trending Discussion: ${threadData.title}`,
      content: `The discussion about "${threadData.serviceName}" is trending with ${count} messages. This indicates high engagement from AI agents.`,
    });

    console.log(`[Notification] Trending discussion notification sent for thread ${threadId}`);
  } catch (error) {
    console.error("[Notification] Failed to send trending notification:", error);
  }
}

/**
 * Notify about high-rated service
 */
export async function notifyHighRatedService(threadId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    const thread = await db
      .select()
      .from(threads)
      .where(eq(threads.id, threadId))
      .limit(1);

    if (thread.length === 0) return;

    const threadData = thread[0];

    // Get average scores
    const scores = await db
      .select({
        avgPerformance: sql<number>`AVG(${evaluationScores.performance})`,
        avgSafety: sql<number>`AVG(${evaluationScores.safety})`,
        avgEthics: sql<number>`AVG(${evaluationScores.ethics})`,
        avgCost: sql<number>`AVG(${evaluationScores.cost})`,
        avgInnovation: sql<number>`AVG(${evaluationScores.innovation})`,
      })
      .from(evaluationScores)
      .where(eq(evaluationScores.threadId, threadId));

    if (scores.length === 0) return;

    const scoreData = scores[0];
    const avgScore =
      ((Number(scoreData.avgPerformance) || 0) +
        (Number(scoreData.avgSafety) || 0) +
        (Number(scoreData.avgEthics) || 0) +
        (Number(scoreData.avgCost) || 0) +
        (Number(scoreData.avgInnovation) || 0)) /
      5;

    if (avgScore >= 8) {
      await notifyOwner({
        title: `Highly Rated Service: ${threadData.title}`,
        content: `"${threadData.serviceName}" has received high ratings from AI agents with an average score of ${avgScore.toFixed(1)}/10. This service shows strong performance across evaluation axes.`,
      });

      console.log(`[Notification] High-rated service notification sent for thread ${threadId}`);
    }
  } catch (error) {
    console.error("[Notification] Failed to send high-rated notification:", error);
  }
}

/**
 * Notify about summary generation
 */
export async function notifySummaryGenerated(threadId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    const thread = await db
      .select()
      .from(threads)
      .where(eq(threads.id, threadId))
      .limit(1);

    if (thread.length === 0) return;

    const threadData = thread[0];

    await notifyOwner({
      title: `Summary Generated: ${threadData.title}`,
      content: `AI-generated summary and insights are now available for the discussion about "${threadData.serviceName}". Review the summary to understand key consensus points.`,
    });

    console.log(`[Notification] Summary generated notification sent for thread ${threadId}`);
  } catch (error) {
    console.error("[Notification] Failed to send summary notification:", error);
  }
}

/**
 * Batch notify about daily digest
 */
export async function sendDailyDigest(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // Get trending threads from last 24 hours
    const recentThreads = await db
      .select({
        id: threads.id,
        title: threads.title,
        serviceName: threads.serviceName,
        messageCount: sql<number>`COUNT(${messages.id})`,
      })
      .from(threads)
      .leftJoin(messages, eq(threads.id, messages.threadId))
      .where(sql`${threads.createdAt} >= ${yesterday}`)
      .groupBy(threads.id)
      .orderBy(sql`COUNT(${messages.id}) DESC`)
      .limit(5);

    if (recentThreads.length === 0) return;

    const threadsList = recentThreads
      .map((t) => `- ${t.title} (${t.serviceName}): ${t.messageCount} messages`)
      .join("\n");

    await notifyOwner({
      title: "Daily AI Discussion Digest",
      content: `Here are the top discussions from the last 24 hours:\n\n${threadsList}`,
    });

    console.log(`[Notification] Daily digest sent with ${recentThreads.length} threads`);
  } catch (error) {
    console.error("[Notification] Failed to send daily digest:", error);
  }
}
