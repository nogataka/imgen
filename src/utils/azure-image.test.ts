import { describe, expect, it, vi, beforeEach } from "vitest";
import { AzureImageClient } from "./azure-image.js";
import type { AzureConfig } from "./config.js";

vi.mock("openai", () => {
  const mockGenerate = vi.fn();
  return {
    AzureOpenAI: vi.fn().mockImplementation(() => ({
      images: { generate: mockGenerate },
    })),
    __mockGenerate: mockGenerate,
  };
});

const TEST_CONFIG: AzureConfig = {
  endpoint: "https://test.openai.azure.com",
  apiKey: "test-key",
  deploymentName: "gpt-5.1",
  imageDeploymentName: "gpt-image-1.5",
  apiVersion: "2024-02-15-preview",
  imageApiVersion: "2025-04-01-preview",
};

describe("AzureImageClient", () => {
  let client: AzureImageClient;
  let mockGenerate: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const mod = await import("openai");
    mockGenerate = (mod as unknown as { __mockGenerate: ReturnType<typeof vi.fn> }).__mockGenerate;
    mockGenerate.mockReset();
    client = new AzureImageClient(TEST_CONFIG);
  });

  describe("generateImage", () => {
    it("should return image data from base64 response", async () => {
      const b64 = Buffer.from([1, 2, 3]).toString("base64");
      mockGenerate.mockResolvedValue({
        data: [{ b64_json: b64 }],
      });

      const result = await client.generateImage("a cat", {});
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBe(3);
    });

    it("should throw when no data returned", async () => {
      mockGenerate.mockResolvedValue({ data: [] });
      await expect(client.generateImage("a cat", {})).rejects.toThrow("画像データが見つかりません");
    });
  });
});
