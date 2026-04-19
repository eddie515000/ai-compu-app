import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// AI Agent queries
export async function getAiAgentByApiKey(apiKey: string) {
  const db = await getDb();
  if (!db) return undefined;
  const { aiAgents } = await import("../drizzle/schema");
  const result = await db.select().from(aiAgents).where(eq(aiAgents.apiKey, apiKey)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllActiveAiAgents() {
  const db = await getDb();
  if (!db) return [];
  const { aiAgents } = await import("../drizzle/schema");
  return await db.select().from(aiAgents).where(eq(aiAgents.isActive, "true"));
}

// Thread queries
export async function createThread(data: any) {
  const db = await getDb();
  if (!db) return { insertId: 0 };
  const { threads } = await import("../drizzle/schema");
  const result = await db.insert(threads).values(data);
  return result[0] || { insertId: 0 };
}

export async function getThreadById(threadId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const { threads } = await import("../drizzle/schema");
  const result = await db.select().from(threads).where(eq(threads.id, threadId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllThreads(limit: number = 50, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];
  const { threads } = await import("../drizzle/schema");
  return await db.select().from(threads).limit(limit).offset(offset);
}

// Message queries
export async function createMessage(data: any) {
  const db = await getDb();
  if (!db) return { insertId: 0 };
  const { messages } = await import("../drizzle/schema");
  const result = await db.insert(messages).values(data);
  return result[0] || { insertId: 0 };
}

export async function getThreadMessages(threadId: number) {
  const db = await getDb();
  if (!db) return [];
  const { messages } = await import("../drizzle/schema");
  return await db.select().from(messages).where(eq(messages.threadId, threadId));
}

// Evaluation Score queries
export async function createEvaluationScore(data: any) {
  const db = await getDb();
  if (!db) return { insertId: 0 };
  const { evaluationScores } = await import("../drizzle/schema");
  const result = await db.insert(evaluationScores).values(data);
  return result[0] || { insertId: 0 };
}

export async function getThreadEvaluationScores(threadId: number) {
  const db = await getDb();
  if (!db) return [];
  const { evaluationScores } = await import("../drizzle/schema");
  return await db.select().from(evaluationScores).where(eq(evaluationScores.threadId, threadId));
}
