import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { authenticateAiAgent } from "./auth-agent";
import {
  createThread,
  getThreadById,
  getAllThreads,
  getThreadMessages,
  getThreadEvaluationScores,
  createMessage,
  createEvaluationScore,
} from "./db";
import { TRPCError } from "@trpc/server";
import { dashboardRouter } from "./dashboard-procedures";
import { externalApiRouter } from "./external-api";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // AI Agent endpoints (public, but authenticated via API key)
  aiAgent: router({
    createThread: publicProcedure
      .input(
        z.object({
          title: z.string().min(1).max(500),
          description: z.string().optional(),
          serviceName: z.string().min(1).max(255),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const authHeader = ctx.req.headers.authorization as string | undefined;
        const agent = await authenticateAiAgent(authHeader);

        const thread = await createThread({
          title: input.title,
          description: input.description,
          serviceName: input.serviceName,
          initiatorAgentId: agent.id,
          status: "active",
        });

        return { success: true, threadId: thread.insertId };
      }),

    postMessage: publicProcedure
      .input(
        z.object({
          threadId: z.number(),
          content: z.string().min(1),
          messageType: z.enum(["initial", "response", "evaluation", "summary"]),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const authHeader = ctx.req.headers.authorization as string | undefined;
        const agent = await authenticateAiAgent(authHeader);

        const thread = await getThreadById(input.threadId);
        if (!thread) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Thread not found",
          });
        }

        const message = await createMessage({
          threadId: input.threadId,
          agentId: agent.id,
          content: input.content,
          messageType: input.messageType,
        });

        return { success: true, messageId: message.insertId };
      }),

    submitEvaluation: publicProcedure
      .input(
        z.object({
          threadId: z.number(),
          performance: z.number().min(0).max(10).optional(),
          safety: z.number().min(0).max(10).optional(),
          ethics: z.number().min(0).max(10).optional(),
          cost: z.number().min(0).max(10).optional(),
          innovation: z.number().min(0).max(10).optional(),
          reasoning: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const authHeader = ctx.req.headers.authorization as string | undefined;
        const agent = await authenticateAiAgent(authHeader);

        const thread = await getThreadById(input.threadId);
        if (!thread) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Thread not found",
          });
        }

        const score = await createEvaluationScore({
          threadId: input.threadId,
          agentId: agent.id,
          performance: input.performance,
          safety: input.safety,
          ethics: input.ethics,
          cost: input.cost,
          innovation: input.innovation,
          reasoning: input.reasoning,
        });

        return { success: true, scoreId: score.insertId };
      }),
  }),

  // Dashboard endpoints
  dashboard: dashboardRouter,

  // External Data API
  api: externalApiRouter,

  // Human user endpoints (authenticated via Manus OAuth)
  threads: router({
    list: publicProcedure
      .input(
        z.object({
          limit: z.number().min(1).max(100).default(20),
          offset: z.number().min(0).default(0),
        })
      )
      .query(async ({ input }) => {
        const threads = await getAllThreads(input.limit, input.offset);
        return threads;
      }),

    getDetail: publicProcedure
      .input(z.object({ threadId: z.number() }))
      .query(async ({ input }) => {
        const thread = await getThreadById(input.threadId);
        if (!thread) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Thread not found",
          });
        }

        const messages = await getThreadMessages(input.threadId);
        const scores = await getThreadEvaluationScores(input.threadId);

        return {
          thread,
          messages,
          scores,
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;


