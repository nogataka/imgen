import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import type { SupportedLanguage } from "../lang.js";

export type ImageSizeConfig = "1024x1024" | "1536x1024" | "1024x1536";
export type ImageQualityConfig = "low" | "medium" | "high";
export type ImageFormatConfig = "png" | "jpg" | "webp";
export type LogLevelConfig = "debug" | "info" | "warn" | "error";

export interface Config {
  azureEndpoint?: string;
  azureApiKey?: string;
  azureDeploymentName?: string;
  azureImageDeploymentName?: string;
  azureApiVersion?: string;
  azureImageApiVersion?: string;
  defaultOutputDir?: string;
  defaultLanguage?: SupportedLanguage;
  defaultImageSize?: ImageSizeConfig;
  defaultImageQuality?: ImageQualityConfig;
  defaultImageFormat?: ImageFormatConfig;
  logLevel?: LogLevelConfig;
}

export const DEFAULT_CONFIG = {
  defaultLanguage: "ja" as SupportedLanguage,
  defaultImageSize: "1024x1024" as ImageSizeConfig,
  defaultImageQuality: "high" as ImageQualityConfig,
  defaultImageFormat: "png" as ImageFormatConfig,
  logLevel: "info" as LogLevelConfig,
};

export interface AzureConfig {
  endpoint: string;
  apiKey: string;
  deploymentName: string;
  imageDeploymentName: string;
  apiVersion: string;
  imageApiVersion: string;
}

/**
 * Returns the configuration directory path (~/.imgen).
 */
export function getConfigDir(): string {
  return path.join(os.homedir(), ".imgen");
}

/**
 * Returns the configuration file path (~/.imgen/config.json).
 */
export function getConfigPath(): string {
  return path.join(getConfigDir(), "config.json");
}

/**
 * Loads the configuration from disk. Returns null if no config file exists.
 */
export async function loadConfig(): Promise<Config | null> {
  try {
    const text = await fs.readFile(getConfigPath(), "utf-8");
    return JSON.parse(text) as Config;
  } catch {
    return null;
  }
}

/**
 * Saves the configuration to disk, creating the config directory if needed.
 */
export async function saveConfig(config: Config): Promise<void> {
  const configPath = getConfigPath();
  await fs.mkdir(path.dirname(configPath), { recursive: true });
  await fs.writeFile(configPath, JSON.stringify(config, null, 2));
}

/**
 * Retrieves a single config value by key. Falls back to DEFAULT_CONFIG if the
 * key is not set in the saved configuration.
 */
export async function getConfigValue<K extends keyof Config>(
  key: K
): Promise<Config[K] | undefined> {
  const config = await loadConfig();
  if (config && config[key] !== undefined) return config[key];
  return (DEFAULT_CONFIG as Record<string, unknown>)[key] as Config[K] | undefined;
}

/**
 * Resolves the full Azure OpenAI configuration from environment variables and
 * the config file. Environment variables take precedence over file-based config.
 * Throws if required fields (endpoint, apiKey, deploymentName, imageDeploymentName)
 * are missing.
 */
export async function getAzureConfig(): Promise<AzureConfig> {
  const config = await loadConfig();

  const endpoint =
    process.env.AZURE_OPENAI_ENDPOINT || config?.azureEndpoint;
  const apiKey =
    process.env.AZURE_OPENAI_API_KEY || config?.azureApiKey;
  const deploymentName =
    process.env.AZURE_OPENAI_DEPLOYMENT_NAME || config?.azureDeploymentName;
  const imageDeploymentName =
    process.env.AZURE_OPENAI_DEPLOYMENT_NAME_IMAGE || config?.azureImageDeploymentName;
  const apiVersion =
    process.env.AZURE_OPENAI_API_VERSION || config?.azureApiVersion || "2024-02-15-preview";
  const imageApiVersion =
    process.env.AZURE_OPENAI_IMAGE_API_VERSION || config?.azureImageApiVersion || "2025-04-01-preview";

  if (!endpoint || !apiKey || !deploymentName || !imageDeploymentName) {
    throw new Error(
      "Azure OpenAI の設定が見つかりません。`imgen configure` コマンドで設定するか、環境変数を設定してください。"
    );
  }

  return { endpoint, apiKey, deploymentName, imageDeploymentName, apiVersion, imageApiVersion };
}
