import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { threadSummaries } from "../drizzle/schema";
import { getDb } from "./db";

/**
 * Create or update a thread summary
 */
export async function createOrUpdateThreadSummary(
  threadId: number,
  summary: string,
  keyPoints: string[],
  consensus: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Check if summary exists
  const existing = await db
    .select()
    .from(threadSummaries)
    .where(eq(threadSummaries.threadId, threadId))
    .limit(1);

  if (existing.length > 0) {
    // Update existing
    await db
      .update(threadSummaries)
      .set({
        summary,
        keyPoints: JSON.stringify(keyPoints),
        consensus,
        updatedAt: new Date(),
      })
      .where(eq(threadSummaries.threadId, threadId));
  } else {
    // Create new
    await db.insert(threadSummaries).values({
      threadId,
      summary,
      keyPoints: JSON.stringify(keyPoints),
      consensus,
    });
  }
}

/**
 * Get thread summary
 */
export async function getThreadSummary(threadId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(threadSummaries)
    .where(eq(threadSummaries.threadId, threadId))
    .limit(1);

  if (result.length === 0) return undefined;

  const summary = result[0];
  return {
    ...summary,
    keyPoints: typeof summary.keyPoints === "string" ? JSON.parse(summary.keyPoints) : summary.keyPoints,
  };
}
