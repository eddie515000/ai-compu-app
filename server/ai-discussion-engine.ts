import { invokeLLM } from "./_core/llm";
import { createMessage, createEvaluationScore, getThreadById, getThreadMessages } from "./db";

/**
 * AI Discussion Engine
 * Orchestrates automatic discussions between multiple AI agents on a given thread.
 */

export interface DiscussionContext {
  threadId: number;
  title: string;
  description?: string;
  serviceName: string;
}

export interface EvaluationResult {
  performance: number;
  safety: number;
  ethics: number;
  cost: number;
  innovation: number;
  reasoning: string;
}

/**
 * Generate an initial analysis message for a thread
 */
export async function generateInitialAnalysis(
  context: DiscussionContext,
  agentId: number
): Promise<string> {
  const prompt = `You are an AI agent evaluating AI technologies and services. 
  
A new discussion thread has been created:
- Title: ${context.title}
- Service: ${context.serviceName}
- Description: ${context.description || "N/A"}

Provide an initial analysis of this AI service/technology. Consider its potential impact, use cases, and preliminary assessment. Be concise and technical.`;

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content:
          "You are an expert AI analyst. Provide technical, objective analysis of AI technologies and services.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const content = response.choices[0]?.message.content;
  if (typeof content === "string") {
    return content;
  }
  return "";
}

/**
 * Generate a response to existing discussion messages
 */
export async function generateDiscussionResponse(
  context: DiscussionContext,
  previousMessages: string[],
  agentId: number
): Promise<string> {
  const messagesContext = previousMessages
    .slice(-5) // Last 5 messages for context
    .map((msg, idx) => `Message ${idx + 1}: ${msg}`)
    .join("\n\n");

  const prompt = `You are an AI agent in a discussion about AI technologies. 
  
Thread: ${context.title} (${context.serviceName})

Previous discussion:
${messagesContext}

Provide your response to this discussion. Add new insights, ask clarifying questions, or challenge assumptions. Be concise and technical.`;

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content:
          "You are an expert AI analyst participating in a technical discussion. Be critical, objective, and constructive.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const content = response.choices[0]?.message.content;
  if (typeof content === "string") {
    return content;
  }
  return "";
}

/**
 * Generate multi-axis evaluation scores for a thread
 */
export async function generateEvaluationScores(
  context: DiscussionContext,
  threadMessages: string[],
  agentId: number
): Promise<EvaluationResult> {
  const messagesContext = threadMessages
    .slice(-10)
    .map((msg, idx) => `${idx + 1}. ${msg}`)
    .join("\n");

  const prompt = `You are an AI evaluator. Based on the discussion about "${context.serviceName}", 
provide scores (0-10) for the following evaluation axes:

1. 性能 (Performance): Technical capabilities, speed, accuracy
2. 安全性 (Safety): Security measures, risk mitigation
3. 倫理 (Ethics): Ethical considerations, bias, fairness
4. コスト (Cost): Value for money, pricing efficiency
5. 革新性 (Innovation): Novelty, breakthrough potential

Discussion context:
${messagesContext}

Respond in JSON format:
{
  "performance": <number 0-10>,
  "safety": <number 0-10>,
  "ethics": <number 0-10>,
  "cost": <number 0-10>,
  "innovation": <number 0-10>,
  "reasoning": "<brief explanation of scores>"
}`;

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content:
          "You are an expert evaluator. Provide objective scores and reasoning in JSON format.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "evaluation_scores",
        strict: true,
        schema: {
          type: "object",
          properties: {
            performance: { type: "number", minimum: 0, maximum: 10 },
            safety: { type: "number", minimum: 0, maximum: 10 },
            ethics: { type: "number", minimum: 0, maximum: 10 },
            cost: { type: "number", minimum: 0, maximum: 10 },
            innovation: { type: "number", minimum: 0, maximum: 10 },
            reasoning: { type: "string" },
          },
          required: [
            "performance",
            "safety",
            "ethics",
            "cost",
            "innovation",
            "reasoning",
          ],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0]?.message.content;
  if (!content || typeof content !== "string") {
    throw new Error("Failed to generate evaluation scores");
  }

  const parsed = JSON.parse(content);
  return {
    performance: parsed.performance,
    safety: parsed.safety,
    ethics: parsed.ethics,
    cost: parsed.cost,
    innovation: parsed.innovation,
    reasoning: parsed.reasoning,
  };
}

/**
 * Generate a summary and key insights from thread discussion
 */
export async function generateThreadSummary(
  context: DiscussionContext,
  threadMessages: string[]
): Promise<{ summary: string; keyPoints: string[]; consensus: string }> {
  const messagesContext = threadMessages
    .map((msg, idx) => `${idx + 1}. ${msg}`)
    .join("\n\n");

  const prompt = `You are a technical summarizer. Analyze the following discussion about "${context.serviceName}" and provide:

1. A concise summary (2-3 sentences)
2. Key discussion points (3-5 bullet points)
3. Overall consensus or conclusion

Discussion:
${messagesContext}

Respond in JSON format:
{
  "summary": "<2-3 sentence summary>",
  "keyPoints": ["<point 1>", "<point 2>", ...],
  "consensus": "<overall conclusion>"
}`;

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content:
          "You are an expert summarizer. Extract key insights and consensus from technical discussions.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "thread_summary",
        strict: true,
        schema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            keyPoints: { type: "array", items: { type: "string" } },
            consensus: { type: "string" },
          },
          required: ["summary", "keyPoints", "consensus"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0]?.message.content;
  if (!content || typeof content !== "string") {
    throw new Error("Failed to generate summary");
  }

  const parsed = JSON.parse(content);
  return {
    summary: parsed.summary,
    keyPoints: parsed.keyPoints,
    consensus: parsed.consensus,
  };
}

/**
 * Orchestrate a complete discussion round
 */
export async function orchestrateDiscussionRound(
  context: DiscussionContext,
  agentIds: number[],
  roundNumber: number = 1
): Promise<void> {
  const thread = await getThreadById(context.threadId);
  if (!thread) {
    throw new Error("Thread not found");
  }

  const existingMessages = await getThreadMessages(context.threadId);
  const messageContents = existingMessages.map((m) => m.content);

  // Generate responses from each agent
  for (const agentId of agentIds) {
    let responseContent: string;

    if (roundNumber === 1 && messageContents.length === 0) {
      // First agent provides initial analysis
      responseContent = await generateInitialAnalysis(context, agentId);
    } else {
      // Subsequent agents respond to existing discussion
      responseContent = await generateDiscussionResponse(
        context,
        messageContents,
        agentId
      );
    }

    // Store the message
    await createMessage({
      threadId: context.threadId,
      agentId,
      content: responseContent,
      messageType: "response",
    });

    messageContents.push(responseContent);
  }

  // Generate evaluation scores from each agent
  for (const agentId of agentIds) {
    const scores = await generateEvaluationScores(
      context,
      messageContents,
      agentId
    );

    await createEvaluationScore({
      threadId: context.threadId,
      agentId,
      performance: scores.performance,
      safety: scores.safety,
      ethics: scores.ethics,
      cost: scores.cost,
      innovation: scores.innovation,
      reasoning: scores.reasoning,
    });
  }
}
