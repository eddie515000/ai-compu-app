import { decimal, int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * AI Agent table: Stores registered AI agents with their API keys and metadata.
 */
export const aiAgents = mysqlTable("ai_agents", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  apiKey: varchar("apiKey", { length: 255 }).notNull().unique(),
  description: text("description"),
  provider: varchar("provider", { length: 64 }).notNull(), // e.g., "openai", "gemini", "custom"
  modelName: varchar("modelName", { length: 255 }).notNull(),
  isActive: mysqlEnum("isActive", ["true", "false"]).default("true").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AiAgent = typeof aiAgents.$inferSelect;
export type InsertAiAgent = typeof aiAgents.$inferInsert;

/**
 * Thread table: Stores discussion threads about AI technologies/services.
 */
export const threads = mysqlTable("threads", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  serviceName: varchar("serviceName", { length: 255 }).notNull(), // e.g., "GPT-5", "Claude 4"
  initiatorAgentId: int("initiatorAgentId").notNull(), // AI agent that created the thread
  status: mysqlEnum("status", ["active", "closed", "archived"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Thread = typeof threads.$inferSelect;
export type InsertThread = typeof threads.$inferInsert;

/**
 * Message table: Stores individual messages/responses in threads.
 */
export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  threadId: int("threadId").notNull(),
  agentId: int("agentId").notNull(),
  content: text("content").notNull(),
  messageType: mysqlEnum("messageType", ["initial", "response", "evaluation", "summary"]).default("response").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

/**
 * Evaluation Scores table: Stores multi-axis evaluation scores for threads.
 * Axes: 性能 (Performance), 安全性 (Safety), 倫理 (Ethics), コスト (Cost), 革新性 (Innovation)
 */
export const evaluationScores = mysqlTable("evaluation_scores", {
  id: int("id").autoincrement().primaryKey(),
  threadId: int("threadId").notNull(),
  agentId: int("agentId").notNull(),
  performance: decimal("performance", { precision: 3, scale: 1 }), // 0-10 scale
  safety: decimal("safety", { precision: 3, scale: 1 }),
  ethics: decimal("ethics", { precision: 3, scale: 1 }),
  cost: decimal("cost", { precision: 3, scale: 1 }),
  innovation: decimal("innovation", { precision: 3, scale: 1 }),
  reasoning: text("reasoning"), // Explanation for the scores
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EvaluationScore = typeof evaluationScores.$inferSelect;
export type InsertEvaluationScore = typeof evaluationScores.$inferInsert;

/**
 * Thread Summary table: Stores AI-generated summaries and insights for threads.
 */
export const threadSummaries = mysqlTable("thread_summaries", {
  id: int("id").autoincrement().primaryKey(),
  threadId: int("threadId").notNull(),
  summary: text("summary").notNull(),
  keyPoints: json("keyPoints"), // Array of key discussion points
  consensus: text("consensus"), // Overall consensus or conclusion
  generatedAt: timestamp("generatedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ThreadSummary = typeof threadSummaries.$inferSelect;
export type InsertThreadSummary = typeof threadSummaries.$inferInsert;

/**
 * User Notification Preferences table: Stores notification settings for human users.
 */
export const notificationPreferences = mysqlTable("notification_preferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  notifyNewThreads: mysqlEnum("notifyNewThreads", ["true", "false"]).default("true").notNull(),
  notifyTrendingThreads: mysqlEnum("notifyTrendingThreads", ["true", "false"]).default("true").notNull(),
  notifyKeywordMatches: mysqlEnum("notifyKeywordMatches", ["true", "false"]).default("false").notNull(),
  keywords: json("keywords"), // Array of keywords to monitor
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreference = typeof notificationPreferences.$inferInsert;

/**
 * API Access Log table: Tracks external API access for analytics and rate limiting.
 */
export const apiAccessLogs = mysqlTable("api_access_logs", {
  id: int("id").autoincrement().primaryKey(),
  apiKey: varchar("apiKey", { length: 255 }).notNull(),
  endpoint: varchar("endpoint", { length: 255 }).notNull(),
  method: varchar("method", { length: 10 }).notNull(),
  statusCode: int("statusCode"),
  responseTime: int("responseTime"), // milliseconds
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ApiAccessLog = typeof apiAccessLogs.$inferSelect;
export type InsertApiAccessLog = typeof apiAccessLogs.$inferInsert;