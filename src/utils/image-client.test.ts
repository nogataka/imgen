import { describe, expect, it, vi, beforeEach } from "vitest";
import { ImageClient } from "./image-client.js";
import type { AzureConfig, OpenAIConfig } from "./config.js";

vi.mock("openai", () => {
  const mockGenerate = vi.fn();
  const mockEdit = vi.fn();
  return {
    default: vi.fn().mockImplementation(() => ({
      images: { generate: mockGenerate, edit: mockEdit },
    })),
    AzureOpenAI: vi.fn().mockImplementation(() => ({
      images: { generate: mockGenerate, edit: mockEdit },
    })),
    __mockGenerate: mockGenerate,
    __mockEdit: mockEdit,
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

describe("ImageClient", () => {
  let mockGenerate: ReturnType<typeof vi.fn>;
  let mockEdit: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const mod = await import("openai");
    const m = mod as unknown as {
      __mockGenerate: ReturnType<typeof vi.fn>;
      __mockEdit: ReturnType<typeof vi.fn>;
    };
    mockGenerate = m.__mockGenerate;
    mockEdit = m.__mockEdit;
    mockGenerate.mockReset();
    mockEdit.mockReset();
  });

  describe("with Azure config", () => {
    let client: ImageClient;

    beforeEach(() => {
      client = new ImageClient(AZURE_CONFIG);
    });

    describe("generateImage", () => {
      it("should return image data from base64 response", async () => {
        const b64 = Buffer.from([1, 2, 3]).toString("base64");
        mockGenerate.mockResolvedValue({ data: [{ b64_json: b64 }] });

        const result = await client.generateImage("a cat", {});
        expect(result).toBeInstanceOf(Uint8Array);
        expect(result.length).toBe(3);
      });

      it("should throw when no data returned", async () => {
        mockGenerate.mockResolvedValue({ data: [] });
        await expect(client.generateImage("a cat", {})).rejects.toThrow(
          "画像データが見つかりません"
        );
      });
    });
  });

  describe("with OpenAI config", () => {
    let client: ImageClient;

    beforeEach(() => {
      client = new ImageClient(OPENAI_CONFIG);
    });

    describe("generateImage", () => {
      it("should return image data from base64 response", async () => {
        const b64 = Buffer.from([4, 5, 6]).toString("base64");
        mockGenerate.mockResolvedValue({ data: [{ b64_json: b64 }] });

        const result = await client.generateImage("a dog", {});
        expect(result).toBeInstanceOf(Uint8Array);
        expect(result.length).toBe(3);
      });

      it("should throw when no data returned", async () => {
        mockGenerate.mockResolvedValue({ data: [] });
        await expect(client.generateImage("a dog", {})).rejects.toThrow(
          "画像データが見つかりません"
        );
      });
    });

    describe("editImage", () => {
      it("should return edited image data via SDK", async () => {
        const b64 = Buffer.from([7, 8, 9]).toString("base64");
        mockEdit.mockResolvedValue({ data: [{ b64_json: b64 }] });

        const buf = Buffer.from([1, 2, 3]);
        const result = await client.editImage(buf, "make it blue", {});
        expect(result).toBeInstanceOf(Uint8Array);
        expect(result.length).toBe(3);
        expect(mockEdit).toHaveBeenCalledTimes(1);
      });

      it("should throw when no data returned from edit", async () => {
        mockEdit.mockResolvedValue({ data: [] });
        const buf = Buffer.from([1, 2, 3]);
        await expect(client.editImage(buf, "make it blue", {})).rejects.toThrow(
          "画像データが見つかりません"
        );
      });
    });
  });
});
