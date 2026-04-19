import { publicProcedure } from "./_core/trpc";
import { z } from "zod";
import { orchestrateDiscussionRound, generateThreadSummary } from "./ai-discussion-engine";
import { getThreadById, getThreadMessages, getAllActiveAiAgents } from "./db";
import { createOrUpdateThreadSummary, getThreadSummary } from "./db-summary";
import { TRPCError } from "@trpc/server";

/**
 * Trigger automatic discussion for a thread
 * This procedure orchestrates AI agents to discuss and evaluate a thread
 */
export const triggerAutoDiscussion = publicProcedure
  .input(
    z.object({
      threadId: z.number(),
      numAgents: z.number().min(1).max(5).default(3),
      roundNumber: z.number().min(1).default(1),
    })
  )
  .mutation(async ({ input }) => {
    const thread = await getThreadById(input.threadId);
    if (!thread) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Thread not found",
      });
    }

    // Get active AI agents
    const agents = await getAllActiveAiAgents();
    if (agents.length === 0) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "No active AI agents available",
      });
    }

    // Select random agents for discussion
    const selectedAgents = agents
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.min(input.numAgents, agents.length))
      .map((a) => a.id);

    try {
      // Orchestrate discussion round
      await orchestrateDiscussionRound(
        {
          threadId: input.threadId,
          title: thread.title,
          description: thread.description || undefined,
          serviceName: thread.serviceName,
        },
        selectedAgents,
        input.roundNumber
      );

      return {
        success: true,
        message: `Discussion round ${input.roundNumber} completed with ${selectedAgents.length} agents`,
      };
    } catch (error) {
      console.error("[Discussion Engine]", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to orchestrate discussion",
      });
    }
  });

/**
 * Generate and update thread summary
 */
export const generateThreadSummaryProcedure = publicProcedure
  .input(z.object({ threadId: z.number() }))
  .mutation(async ({ input }) => {
    const thread = await getThreadById(input.threadId);
    if (!thread) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Thread not found",
      });
    }

    const messages = await getThreadMessages(input.threadId);
    if (messages.length === 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No messages in thread to summarize",
      });
    }

    try {
      const messageContents = messages.map((m) => m.content);
      const summary = await generateThreadSummary(
        {
          threadId: input.threadId,
          title: thread.title,
          description: thread.description || undefined,
          serviceName: thread.serviceName,
        },
        messageContents
      );

      await createOrUpdateThreadSummary(
        input.threadId,
        summary.summary,
        summary.keyPoints,
        summary.consensus
      );

      return {
        success: true,
        summary,
      };
    } catch (error) {
      console.error("[Summary Generation]", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to generate summary",
      });
    }
  });

/**
 * Get thread summary
 */
export const getThreadSummaryProcedure = publicProcedure
  .input(z.object({ threadId: z.number() }))
  .query(async ({ input }) => {
    const summary = await getThreadSummary(input.threadId);
    return summary || null;
  });
