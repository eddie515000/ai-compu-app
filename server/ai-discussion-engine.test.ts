import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateInitialAnalysis,
  generateDiscussionResponse,
  generateEvaluationScores,
  generateThreadSummary,
} from "./ai-discussion-engine";
import * as llmModule from "./_core/llm";

// Mock the LLM module
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

describe("AI Discussion Engine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateInitialAnalysis", () => {
    it("should generate initial analysis for a thread", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content:
                "This is an innovative AI service with strong potential in NLP tasks.",
            },
          },
        ],
      };

      vi.mocked(llmModule.invokeLLM).mockResolvedValue(mockResponse as any);

      const result = await generateInitialAnalysis(
        {
          threadId: 1,
          title: "New GPT-5 Release",
          serviceName: "GPT-5",
          description: "Discussion about the new GPT-5 model",
        },
        1
      );

      expect(result).toBe(
        "This is an innovative AI service with strong potential in NLP tasks."
      );
      expect(llmModule.invokeLLM).toHaveBeenCalled();
    });

    it("should return empty string if LLM response is invalid", async () => {
      vi.mocked(llmModule.invokeLLM).mockResolvedValue({
        choices: [{ message: { content: null } }],
      } as any);

      const result = await generateInitialAnalysis(
        {
          threadId: 1,
          title: "Test",
          serviceName: "Test Service",
        },
        1
      );

      expect(result).toBe("");
    });
  });

  describe("generateDiscussionResponse", () => {
    it("should generate a response to existing messages", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: "I agree with the previous analysis. Additionally...",
            },
          },
        ],
      };

      vi.mocked(llmModule.invokeLLM).mockResolvedValue(mockResponse as any);

      const result = await generateDiscussionResponse(
        {
          threadId: 1,
          title: "Test Thread",
          serviceName: "Test Service",
        },
        ["First message", "Second message"],
        2
      );

      expect(result).toBe("I agree with the previous analysis. Additionally...");
      expect(llmModule.invokeLLM).toHaveBeenCalled();
    });
  });

  describe("generateEvaluationScores", () => {
    it("should generate evaluation scores in JSON format", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                performance: 8.5,
                safety: 7.0,
                ethics: 8.0,
                cost: 6.5,
                innovation: 9.0,
                reasoning: "Strong performance and innovation, good safety.",
              }),
            },
          },
        ],
      };

      vi.mocked(llmModule.invokeLLM).mockResolvedValue(mockResponse as any);

      const result = await generateEvaluationScores(
        {
          threadId: 1,
          title: "Test",
          serviceName: "Test Service",
        },
        ["Message 1", "Message 2"],
        1
      );

      expect(result.performance).toBe(8.5);
      expect(result.safety).toBe(7.0);
      expect(result.ethics).toBe(8.0);
      expect(result.cost).toBe(6.5);
      expect(result.innovation).toBe(9.0);
      expect(result.reasoning).toBe("Strong performance and innovation, good safety.");
    });

    it("should throw error if response is not valid JSON", async () => {
      vi.mocked(llmModule.invokeLLM).mockResolvedValue({
        choices: [{ message: { content: "Invalid JSON" } }],
      } as any);

      await expect(
        generateEvaluationScores(
          {
            threadId: 1,
            title: "Test",
            serviceName: "Test Service",
          },
          ["Message"],
          1
        )
      ).rejects.toThrow();
    });
  });

  describe("generateThreadSummary", () => {
    it("should generate thread summary with key points", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                summary: "The discussion focused on the service's capabilities.",
                keyPoints: [
                  "Strong performance metrics",
                  "Good safety practices",
                  "Innovative approach",
                ],
                consensus: "Overall positive assessment with room for improvement.",
              }),
            },
          },
        ],
      };

      vi.mocked(llmModule.invokeLLM).mockResolvedValue(mockResponse as any);

      const result = await generateThreadSummary(
        {
          threadId: 1,
          title: "Test",
          serviceName: "Test Service",
        },
        ["Message 1", "Message 2", "Message 3"]
      );

      expect(result.summary).toBe(
        "The discussion focused on the service's capabilities."
      );
      expect(result.keyPoints).toHaveLength(3);
      expect(result.consensus).toBe(
        "Overall positive assessment with room for improvement."
      );
    });
  });
});
