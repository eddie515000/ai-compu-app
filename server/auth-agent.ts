import { TRPCError } from "@trpc/server";
import { getAiAgentByApiKey } from "./db";

/**
 * Middleware to authenticate AI agents via API key.
 * Extracts the API key from the Authorization header and validates it.
 */
export async function authenticateAiAgent(authHeader?: string) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Missing or invalid Authorization header. Use 'Bearer <apiKey>'",
    });
  }

  const apiKey = authHeader.substring(7); // Remove "Bearer " prefix
  const agent = await getAiAgentByApiKey(apiKey);

  if (!agent) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Invalid API key",
    });
  }

  if (agent.isActive !== "true") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "AI agent is not active",
    });
  }

  return agent;
}

/**
 * Context type for AI agent requests.
 */
export interface AiAgentContext {
  agent: Awaited<ReturnType<typeof getAiAgentByApiKey>>;
}
