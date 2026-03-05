import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

export type ImageSizeConfig = "1024x1024" | "1536x1024" | "1024x1536";
export type ImageQualityConfig = "low" | "medium" | "high";
export type ImageFormatConfig = "png" | "jpg" | "webp";

export interface AzureConfig {
  provider: "azure";
  endpoint: string;
  apiKey: string;
  deploymentName: string;
  imageDeploymentName: string;
  apiVersion: string;
  imageApiVersion: string;
}

export interface OpenAIConfig {
  provider: "openai";
  apiKey: string;
  chatModel: string;
  imageModel: string;
}

export type ProviderConfig = AzureConfig | OpenAIConfig;

/**
 * .envファイルをパースしてキーバリューのペアを返す
 */
function parseEnvFile(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    // クォートを除去
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

/**
 * .envファイルから環境変数を読み込む
 * 探索順: cwd/.env → ~/.imgen/.env
 */
async function loadEnvVars(): Promise<Record<string, string>> {
  const candidates = [path.join(process.cwd(), ".env"), path.join(os.homedir(), ".imgen", ".env")];

  for (const envPath of candidates) {
    try {
      const content = await fs.readFile(envPath, "utf-8");
      return parseEnvFile(content);
    } catch {
      // ファイルが見つからない場合はスキップ
    }
  }
  return {};
}

/**
 * Resolves the full Azure OpenAI configuration from environment variables
 * and .env files. Environment variables take precedence.
 * Throws if required fields (endpoint, apiKey, deploymentName, imageDeploymentName)
 * are missing.
 */
export async function getAzureConfig(): Promise<AzureConfig> {
  // .envファイルから読み込み（process.envにない場合のフォールバック）
  const envVars = await loadEnvVars();

  const endpoint = process.env.AZURE_OPENAI_ENDPOINT || envVars.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_API_KEY || envVars.AZURE_OPENAI_API_KEY;
  const deploymentName =
    process.env.AZURE_OPENAI_DEPLOYMENT_NAME || envVars.AZURE_OPENAI_DEPLOYMENT_NAME;
  const imageDeploymentName =
    process.env.AZURE_OPENAI_DEPLOYMENT_NAME_IMAGE || envVars.AZURE_OPENAI_DEPLOYMENT_NAME_IMAGE;
  const apiVersion =
    process.env.AZURE_OPENAI_API_VERSION ||
    envVars.AZURE_OPENAI_API_VERSION ||
    "2024-02-15-preview";
  const imageApiVersion =
    process.env.AZURE_OPENAI_IMAGE_API_VERSION ||
    envVars.AZURE_OPENAI_IMAGE_API_VERSION ||
    "2025-04-01-preview";

  if (!endpoint || !apiKey || !deploymentName || !imageDeploymentName) {
    throw new Error(
      "Azure OpenAI の設定が見つかりません。環境変数または .env ファイルで設定してください。"
    );
  }

  return {
    provider: "azure",
    endpoint,
    apiKey,
    deploymentName,
    imageDeploymentName,
    apiVersion,
    imageApiVersion,
  };
}

/**
 * Resolves the OpenAI configuration from environment variables and .env files.
 * Throws if OPENAI_API_KEY is missing.
 */
export async function getOpenAIConfig(): Promise<OpenAIConfig> {
  const envVars = await loadEnvVars();

  const apiKey = process.env.OPENAI_API_KEY || envVars.OPENAI_API_KEY;
  const chatModel = process.env.OPENAI_CHAT_MODEL || envVars.OPENAI_CHAT_MODEL || "gpt-5.1";
  const imageModel =
    process.env.OPENAI_IMAGE_MODEL || envVars.OPENAI_IMAGE_MODEL || "gpt-image-1.5";

  if (!apiKey) {
    throw new Error(
      "OpenAI の設定が見つかりません。OPENAI_API_KEY を環境変数または .env ファイルで設定してください。"
    );
  }

  return { provider: "openai", apiKey, chatModel, imageModel };
}

/**
 * Auto-detects the provider from environment variables.
 * Priority: Azure (AZURE_OPENAI_API_KEY) → OpenAI (OPENAI_API_KEY) → error.
 */
export async function getConfig(): Promise<ProviderConfig> {
  const envVars = await loadEnvVars();

  const hasAzure = !!(process.env.AZURE_OPENAI_API_KEY || envVars.AZURE_OPENAI_API_KEY);
  const hasOpenAI = !!(process.env.OPENAI_API_KEY || envVars.OPENAI_API_KEY);

  if (hasAzure) return getAzureConfig();
  if (hasOpenAI) return getOpenAIConfig();

  throw new Error(
    "API キーが見つかりません。以下のいずれかを設定してください:\n" +
      "  Azure OpenAI: AZURE_OPENAI_API_KEY, AZURE_OPENAI_ENDPOINT, ...\n" +
      "  OpenAI:       OPENAI_API_KEY"
  );
}
