import { describe, expect, it, vi, beforeEach } from "vitest";
import { ChatClient } from "./chat-client.js";
import type { AzureConfig, OpenAIConfig } from "./config.js";

// Mock the openai module
vi.mock("openai", () => {
  const mockCreate = vi.fn();
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: { completions: { create: mockCreate } },
    })),
    AzureOpenAI: vi.fn().mockImplementation(() => ({
      chat: { completions: { create: mockCreate } },
    })),
    __mockCreate: mockCreate,
  };
});

const AZURE_CONFIG: AzureConfig = {
  provider: "azure",
  endpoint: "https://test.openai.azure.com",
  apiKey: "test-key",
  deploymentName: "gpt-5.1",
  imageDeploymentName: "gpt-image-1.5",
  apiVersion: "2024-02-15-preview",
  imageApiVersion: "2025-04-01-preview",
};

const OPENAI_CONFIG: OpenAIConfig = {
  provider: "openai",
  apiKey: "sk-test",
  chatModel: "gpt-5.1",
  imageModel: "gpt-image-1.5",
};

describe("ChatClient", () => {
  let mockCreate: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const openaiModule = await import("openai");
    mockCreate = (openaiModule as unknown as { __mockCreate: ReturnType<typeof vi.fn> })
      .__mockCreate;
    mockCreate.mockReset();
  });

  describe("with Azure config", () => {
    let client: ChatClient;

    beforeEach(() => {
      client = new ChatClient(AZURE_CONFIG);
    });

    describe("generatePrompt", () => {
      it("should return expanded prompt", async () => {
        mockCreate.mockResolvedValue({
          choices: [{ message: { content: "A detailed prompt for image generation" } }],
        });
        const result = await client.generatePrompt("cute cat");
        expect(result).toBe("A detailed prompt for image generation");
        expect(mockCreate).toHaveBeenCalledTimes(1);
      });
    });

    describe("generateFileName", () => {
      it("should return sanitized filename", async () => {
        mockCreate.mockResolvedValue({
          choices: [{ message: { content: "cute-cat-mascot" } }],
        });
        const result = await client.generateFileName("cute cat mascot");
        expect(result).toMatch(/^[a-z0-9-]+$/);
      });
    });

    describe("generateExplanation", () => {
      it("should call with multimodal content", async () => {
        mockCreate.mockResolvedValue({
          choices: [{ message: { content: "This image shows a cat." } }],
        });
        const result = await client.generateExplanation(
          { data: "base64data", mimeType: "image/png" },
          "en"
        );
        expect(result).toBe("This image shows a cat.");
        expect(mockCreate).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("with OpenAI config", () => {
    let client: ChatClient;

    beforeEach(() => {
      client = new ChatClient(OPENAI_CONFIG);
    });

    describe("generatePrompt", () => {
      it("should return expanded prompt", async () => {
        mockCreate.mockResolvedValue({
          choices: [{ message: { content: "A detailed OpenAI prompt" } }],
        });
        const result = await client.generatePrompt("sunset beach");
        expect(result).toBe("A detailed OpenAI prompt");
        expect(mockCreate).toHaveBeenCalledTimes(1);
      });
    });

    describe("generateFileName", () => {
      it("should return sanitized filename", async () => {
        mockCreate.mockResolvedValue({
          choices: [{ message: { content: "sunset-beach" } }],
        });
        const result = await client.generateFileName("sunset beach");
        expect(result).toBe("sunset-beach");
      });
    });

    describe("generateExplanation", () => {
      it("should call with multimodal content", async () => {
        mockCreate.mockResolvedValue({
          choices: [{ message: { content: "A beautiful sunset." } }],
        });
        const result = await client.generateExplanation(
          { data: "base64data", mimeType: "image/jpeg" },
          "en"
        );
        expect(result).toBe("A beautiful sunset.");
      });
    });
  });
});
