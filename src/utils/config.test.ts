import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAzureConfig, getOpenAIConfig, getConfig } from "./config.js";

describe("config", () => {
  let tempDir: string;
  let origHome: string | undefined;
  let origCwd: ReturnType<typeof vi.spyOn>;

  const envKeys = [
    "AZURE_OPENAI_API_KEY",
    "AZURE_OPENAI_ENDPOINT",
    "AZURE_OPENAI_DEPLOYMENT_NAME",
    "AZURE_OPENAI_DEPLOYMENT_NAME_IMAGE",
    "AZURE_OPENAI_API_VERSION",
    "AZURE_OPENAI_IMAGE_API_VERSION",
    "OPENAI_API_KEY",
    "OPENAI_CHAT_MODEL",
    "OPENAI_IMAGE_MODEL",
  ] as const;

  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "imgen-test-config-"));
    origHome = process.env.HOME;
    process.env.HOME = tempDir;

    // 環境変数を退避・クリア
    for (const key of envKeys) {
      savedEnv[key] = process.env[key];
      delete process.env[key];
    }

    // cwd をtempDirに向ける
    origCwd = vi.spyOn(process, "cwd").mockReturnValue(tempDir);
  });

  afterEach(async () => {
    process.env.HOME = origHome;
    for (const key of envKeys) {
      if (savedEnv[key] !== undefined) process.env[key] = savedEnv[key];
      else delete process.env[key];
    }
    origCwd.mockRestore();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe("getAzureConfig", () => {
    it("should resolve from environment variables", async () => {
      process.env.AZURE_OPENAI_API_KEY = "test-key";
      process.env.AZURE_OPENAI_ENDPOINT = "https://test.openai.azure.com";
      process.env.AZURE_OPENAI_DEPLOYMENT_NAME = "gpt-5.1";
      process.env.AZURE_OPENAI_DEPLOYMENT_NAME_IMAGE = "gpt-image-1.5";

      const config = await getAzureConfig();
      expect(config.provider).toBe("azure");
      expect(config.apiKey).toBe("test-key");
      expect(config.endpoint).toBe("https://test.openai.azure.com");
      expect(config.deploymentName).toBe("gpt-5.1");
      expect(config.imageDeploymentName).toBe("gpt-image-1.5");
      expect(config.apiVersion).toBe("2024-02-15-preview");
      expect(config.imageApiVersion).toBe("2025-04-01-preview");
    });

    it("should resolve from cwd/.env file", async () => {
      const envContent = [
        'AZURE_OPENAI_API_KEY="env-key"',
        "AZURE_OPENAI_ENDPOINT=https://env.openai.azure.com",
        "AZURE_OPENAI_DEPLOYMENT_NAME=gpt-5.1",
        "AZURE_OPENAI_DEPLOYMENT_NAME_IMAGE=gpt-image-1.5",
      ].join("\n");
      await fs.writeFile(path.join(tempDir, ".env"), envContent);

      const config = await getAzureConfig();
      expect(config.apiKey).toBe("env-key");
      expect(config.endpoint).toBe("https://env.openai.azure.com");
    });

    it("should resolve from ~/.imgen/.env file", async () => {
      const imgenDir = path.join(tempDir, ".imgen");
      await fs.mkdir(imgenDir, { recursive: true });
      const envContent = [
        "AZURE_OPENAI_API_KEY=imgen-key",
        "AZURE_OPENAI_ENDPOINT=https://imgen.openai.azure.com",
        "AZURE_OPENAI_DEPLOYMENT_NAME=gpt-5.1",
        "AZURE_OPENAI_DEPLOYMENT_NAME_IMAGE=gpt-image-1.5",
      ].join("\n");
      await fs.writeFile(path.join(imgenDir, ".env"), envContent);

      // cwd/.envがない状態でフォールバック
      const config = await getAzureConfig();
      expect(config.apiKey).toBe("imgen-key");
      expect(config.endpoint).toBe("https://imgen.openai.azure.com");
    });

    it("should prefer environment variables over .env file", async () => {
      const envContent = [
        "AZURE_OPENAI_API_KEY=file-key",
        "AZURE_OPENAI_ENDPOINT=https://file.openai.azure.com",
        "AZURE_OPENAI_DEPLOYMENT_NAME=gpt-5.1",
        "AZURE_OPENAI_DEPLOYMENT_NAME_IMAGE=gpt-image-1.5",
      ].join("\n");
      await fs.writeFile(path.join(tempDir, ".env"), envContent);

      process.env.AZURE_OPENAI_API_KEY = "env-key";
      process.env.AZURE_OPENAI_ENDPOINT = "https://env.openai.azure.com";
      process.env.AZURE_OPENAI_DEPLOYMENT_NAME = "gpt-5.1";
      process.env.AZURE_OPENAI_DEPLOYMENT_NAME_IMAGE = "gpt-image-1.5";

      const config = await getAzureConfig();
      expect(config.apiKey).toBe("env-key");
      expect(config.endpoint).toBe("https://env.openai.azure.com");
    });

    it("should handle single-quoted values in .env", async () => {
      const envContent = [
        "AZURE_OPENAI_API_KEY='quoted-key'",
        "AZURE_OPENAI_ENDPOINT='https://quoted.openai.azure.com'",
        "AZURE_OPENAI_DEPLOYMENT_NAME='gpt-5.1'",
        "AZURE_OPENAI_DEPLOYMENT_NAME_IMAGE='gpt-image-1.5'",
      ].join("\n");
      await fs.writeFile(path.join(tempDir, ".env"), envContent);

      const config = await getAzureConfig();
      expect(config.apiKey).toBe("quoted-key");
    });

    it("should skip comments and blank lines in .env", async () => {
      const envContent = [
        "# This is a comment",
        "",
        "AZURE_OPENAI_API_KEY=key-with-comments",
        "# Another comment",
        "AZURE_OPENAI_ENDPOINT=https://test.openai.azure.com",
        "AZURE_OPENAI_DEPLOYMENT_NAME=gpt-5.1",
        "AZURE_OPENAI_DEPLOYMENT_NAME_IMAGE=gpt-image-1.5",
      ].join("\n");
      await fs.writeFile(path.join(tempDir, ".env"), envContent);

      const config = await getAzureConfig();
      expect(config.apiKey).toBe("key-with-comments");
    });

    it("should throw when no config available", async () => {
      await expect(getAzureConfig()).rejects.toThrow("Azure OpenAI の設定が見つかりません");
    });

    it("should use default API versions when not specified", async () => {
      process.env.AZURE_OPENAI_API_KEY = "key";
      process.env.AZURE_OPENAI_ENDPOINT = "https://test.openai.azure.com";
      process.env.AZURE_OPENAI_DEPLOYMENT_NAME = "gpt-5.1";
      process.env.AZURE_OPENAI_DEPLOYMENT_NAME_IMAGE = "gpt-image-1.5";

      const config = await getAzureConfig();
      expect(config.apiVersion).toBe("2024-02-15-preview");
      expect(config.imageApiVersion).toBe("2025-04-01-preview");
    });

    it("should override default API versions from env", async () => {
      process.env.AZURE_OPENAI_API_KEY = "key";
      process.env.AZURE_OPENAI_ENDPOINT = "https://test.openai.azure.com";
      process.env.AZURE_OPENAI_DEPLOYMENT_NAME = "gpt-5.1";
      process.env.AZURE_OPENAI_DEPLOYMENT_NAME_IMAGE = "gpt-image-1.5";
      process.env.AZURE_OPENAI_API_VERSION = "2025-01-01";
      process.env.AZURE_OPENAI_IMAGE_API_VERSION = "2025-06-01";

      const config = await getAzureConfig();
      expect(config.apiVersion).toBe("2025-01-01");
      expect(config.imageApiVersion).toBe("2025-06-01");
    });
  });

  describe("getOpenAIConfig", () => {
    it("should resolve from environment variables", async () => {
      process.env.OPENAI_API_KEY = "sk-test";

      const config = await getOpenAIConfig();
      expect(config.provider).toBe("openai");
      expect(config.apiKey).toBe("sk-test");
      expect(config.chatModel).toBe("gpt-5.1");
      expect(config.imageModel).toBe("gpt-image-1.5");
    });

    it("should use custom models from env", async () => {
      process.env.OPENAI_API_KEY = "sk-test";
      process.env.OPENAI_CHAT_MODEL = "gpt-4o";
      process.env.OPENAI_IMAGE_MODEL = "dall-e-3";

      const config = await getOpenAIConfig();
      expect(config.chatModel).toBe("gpt-4o");
      expect(config.imageModel).toBe("dall-e-3");
    });

    it("should resolve from .env file", async () => {
      const envContent = 'OPENAI_API_KEY="sk-from-file"';
      await fs.writeFile(path.join(tempDir, ".env"), envContent);

      const config = await getOpenAIConfig();
      expect(config.apiKey).toBe("sk-from-file");
    });

    it("should throw when no API key", async () => {
      await expect(getOpenAIConfig()).rejects.toThrow("OpenAI の設定が見つかりません");
    });
  });

  describe("getConfig", () => {
    it("should auto-detect Azure provider", async () => {
      process.env.AZURE_OPENAI_API_KEY = "azure-key";
      process.env.AZURE_OPENAI_ENDPOINT = "https://test.openai.azure.com";
      process.env.AZURE_OPENAI_DEPLOYMENT_NAME = "gpt-5.1";
      process.env.AZURE_OPENAI_DEPLOYMENT_NAME_IMAGE = "gpt-image-1.5";

      const config = await getConfig();
      expect(config.provider).toBe("azure");
    });

    it("should auto-detect OpenAI provider", async () => {
      process.env.OPENAI_API_KEY = "sk-test";

      const config = await getConfig();
      expect(config.provider).toBe("openai");
    });

    it("should prefer Azure when both are set", async () => {
      process.env.AZURE_OPENAI_API_KEY = "azure-key";
      process.env.AZURE_OPENAI_ENDPOINT = "https://test.openai.azure.com";
      process.env.AZURE_OPENAI_DEPLOYMENT_NAME = "gpt-5.1";
      process.env.AZURE_OPENAI_DEPLOYMENT_NAME_IMAGE = "gpt-image-1.5";
      process.env.OPENAI_API_KEY = "sk-test";

      const config = await getConfig();
      expect(config.provider).toBe("azure");
    });

    it("should throw when no provider configured", async () => {
      await expect(getConfig()).rejects.toThrow("API キーが見つかりません");
    });

    it("should auto-detect from .env file", async () => {
      const envContent = 'OPENAI_API_KEY="sk-env-file"';
      await fs.writeFile(path.join(tempDir, ".env"), envContent);

      const config = await getConfig();
      expect(config.provider).toBe("openai");
    });
  });
});
