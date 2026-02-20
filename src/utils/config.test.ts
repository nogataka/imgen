import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_CONFIG,
  getAzureConfig,
  getConfigDir,
  getConfigPath,
  getConfigValue,
  loadConfig,
  saveConfig,
} from "./config.js";

describe("config", () => {
  let tempDir: string;
  let origHome: string | undefined;
  let origKey: string | undefined;
  let origEndpoint: string | undefined;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "imgen-test-config-"));
    origHome = process.env.HOME;
    origKey = process.env.AZURE_OPENAI_API_KEY;
    origEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
    process.env.HOME = tempDir;
    delete process.env.AZURE_OPENAI_API_KEY;
    delete process.env.AZURE_OPENAI_ENDPOINT;
    delete process.env.AZURE_OPENAI_DEPLOYMENT_NAME;
    delete process.env.AZURE_OPENAI_DEPLOYMENT_NAME_IMAGE;
    delete process.env.AZURE_OPENAI_API_VERSION;
    delete process.env.AZURE_OPENAI_IMAGE_API_VERSION;
  });

  afterEach(async () => {
    process.env.HOME = origHome;
    if (origKey) process.env.AZURE_OPENAI_API_KEY = origKey;
    else delete process.env.AZURE_OPENAI_API_KEY;
    if (origEndpoint) process.env.AZURE_OPENAI_ENDPOINT = origEndpoint;
    else delete process.env.AZURE_OPENAI_ENDPOINT;
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe("getConfigDir", () => {
    it("should return ~/.imgen", () => {
      expect(getConfigDir()).toBe(path.join(tempDir, ".imgen"));
    });
  });

  describe("getConfigPath", () => {
    it("should return ~/.imgen/config.json", () => {
      expect(getConfigPath()).toBe(path.join(tempDir, ".imgen", "config.json"));
    });
  });

  describe("loadConfig / saveConfig", () => {
    it("should return null when no config file", async () => {
      expect(await loadConfig()).toBeNull();
    });

    it("should save and load config", async () => {
      await saveConfig({ azureEndpoint: "https://test.openai.azure.com" });
      const config = await loadConfig();
      expect(config?.azureEndpoint).toBe("https://test.openai.azure.com");
    });
  });

  describe("getConfigValue", () => {
    it("should return saved value", async () => {
      await saveConfig({ defaultImageSize: "1536x1024" });
      expect(await getConfigValue("defaultImageSize")).toBe("1536x1024");
    });

    it("should return default when not set", async () => {
      expect(await getConfigValue("defaultImageSize")).toBe(DEFAULT_CONFIG.defaultImageSize);
    });
  });

  describe("getAzureConfig", () => {
    it("should resolve from environment variables", async () => {
      process.env.AZURE_OPENAI_API_KEY = "test-key";
      process.env.AZURE_OPENAI_ENDPOINT = "https://test.openai.azure.com";
      process.env.AZURE_OPENAI_DEPLOYMENT_NAME = "gpt-5.1";
      process.env.AZURE_OPENAI_DEPLOYMENT_NAME_IMAGE = "gpt-image-1.5";
      process.env.AZURE_OPENAI_API_VERSION = "2024-02-15-preview";
      process.env.AZURE_OPENAI_IMAGE_API_VERSION = "2025-04-01-preview";

      const config = await getAzureConfig();
      expect(config.apiKey).toBe("test-key");
      expect(config.endpoint).toBe("https://test.openai.azure.com");
      expect(config.deploymentName).toBe("gpt-5.1");
      expect(config.imageDeploymentName).toBe("gpt-image-1.5");
    });

    it("should resolve from config file", async () => {
      await saveConfig({
        azureApiKey: "file-key",
        azureEndpoint: "https://file.openai.azure.com",
        azureDeploymentName: "gpt-5.1",
        azureImageDeploymentName: "gpt-image-1.5",
        azureApiVersion: "2024-02-15-preview",
        azureImageApiVersion: "2025-04-01-preview",
      });
      const config = await getAzureConfig();
      expect(config.apiKey).toBe("file-key");
      expect(config.endpoint).toBe("https://file.openai.azure.com");
    });

    it("should throw when no config available", async () => {
      await expect(getAzureConfig()).rejects.toThrow();
    });
  });
});
