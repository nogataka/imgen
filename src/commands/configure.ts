import { Command } from "commander";
import inquirer from "inquirer";
import { LANGUAGE_DESCRIPTIONS, type SupportedLanguage } from "../lang.js";
import {
  type Config,
  DEFAULT_CONFIG,
  getConfigPath,
  loadConfig,
  saveConfig,
} from "../utils/config.js";

type ConfigMenuItem = "azure" | "defaults" | "show" | "reset" | "exit";

export function configureCommand(): Command {
  return new Command("configure")
    .description("API設定を行います")
    .option("--show", "現在の設定を表示")
    .option("--reset", "設定をリセット")
    .action(async (options: { show?: boolean; reset?: boolean }) => {
      try {
        if (options.show) {
          await showConfig();
          return;
        }
        if (options.reset) {
          await resetConfig();
          return;
        }
        await interactiveConfig();
      } catch (error) {
        if (error instanceof Error) {
          console.error("エラー:", error.message);
        } else {
          console.error("不明なエラーが発生しました");
        }
        process.exit(1);
      }
    });
}

async function showConfig(): Promise<void> {
  const config = await loadConfig();
  const configPath = getConfigPath();

  console.log(`\n設定ファイル: ${configPath}\n`);

  if (!config) {
    console.log("設定ファイルが見つかりません。");
    console.log("\nデフォルト値:");
    console.log(JSON.stringify(DEFAULT_CONFIG, null, 2));
    return;
  }

  const displayConfig = { ...config };
  if (displayConfig.azureApiKey) {
    displayConfig.azureApiKey = "****" + displayConfig.azureApiKey.slice(-4);
  }

  console.log("現在の設定:");
  console.log(JSON.stringify(displayConfig, null, 2));
}

async function resetConfig(): Promise<void> {
  const { confirm } = await inquirer.prompt<{ confirm: boolean }>([
    {
      type: "confirm",
      name: "confirm",
      message: "設定をリセットしますか？（API設定も削除されます）",
      default: false,
    },
  ]);

  if (confirm) {
    await saveConfig({});
    console.log("設定をリセットしました。");
  } else {
    console.log("キャンセルしました。");
  }
}

async function interactiveConfig(): Promise<void> {
  const { action } = await inquirer.prompt<{ action: ConfigMenuItem }>([
    {
      type: "list",
      name: "action",
      message: "設定項目を選択してください",
      choices: [
        { name: "Azure OpenAI接続設定", value: "azure" },
        { name: "デフォルト値を設定", value: "defaults" },
        { name: "現在の設定を表示", value: "show" },
        { name: "設定をリセット", value: "reset" },
        { name: "終了", value: "exit" },
      ],
    },
  ]);

  switch (action) {
    case "azure":
      await configureAzure();
      break;
    case "defaults":
      await configureDefaults();
      break;
    case "show":
      await showConfig();
      break;
    case "reset":
      await resetConfig();
      break;
    case "exit":
      return;
  }
}

async function configureAzure(): Promise<void> {
  const config = (await loadConfig()) || {};

  const envEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const envKey = process.env.AZURE_OPENAI_API_KEY;

  if (envEndpoint && envKey) {
    console.log("\n環境変数でAzure OpenAI設定が検出されました。");
    const { useEnv } = await inquirer.prompt<{ useEnv: boolean }>([
      {
        type: "confirm",
        name: "useEnv",
        message: "環境変数の値を設定ファイルに保存しますか？",
        default: true,
      },
    ]);
    if (useEnv) {
      config.azureEndpoint = envEndpoint;
      config.azureApiKey = envKey;
      config.azureDeploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "gpt-5.1";
      config.azureImageDeploymentName =
        process.env.AZURE_OPENAI_DEPLOYMENT_NAME_IMAGE || "gpt-image-1.5";
      config.azureApiVersion = process.env.AZURE_OPENAI_API_VERSION || "2024-02-15-preview";
      config.azureImageApiVersion =
        process.env.AZURE_OPENAI_IMAGE_API_VERSION || "2025-04-01-preview";
      await saveConfig(config);
      console.log("設定を保存しました。");
      return;
    }
  }

  const answers = await inquirer.prompt<{
    endpoint: string;
    apiKey: string;
    deploymentName: string;
    imageDeploymentName: string;
    apiVersion: string;
    imageApiVersion: string;
  }>([
    {
      type: "input",
      name: "endpoint",
      message: "Azure OpenAI エンドポイント:",
      default: config.azureEndpoint || "",
      validate: (input: string) =>
        input.startsWith("https://") || "https:// で始まるURLを入力してください",
    },
    {
      type: "password",
      name: "apiKey",
      message: "Azure OpenAI APIキー:",
      mask: "*",
      validate: (input: string) => input.length > 0 || "APIキーを入力してください",
    },
    {
      type: "input",
      name: "deploymentName",
      message: "チャットモデルデプロイ名:",
      default: config.azureDeploymentName || "gpt-5.1",
    },
    {
      type: "input",
      name: "imageDeploymentName",
      message: "画像モデルデプロイ名:",
      default: config.azureImageDeploymentName || "gpt-image-1.5",
    },
    {
      type: "input",
      name: "apiVersion",
      message: "チャット API バージョン:",
      default: config.azureApiVersion || "2024-02-15-preview",
    },
    {
      type: "input",
      name: "imageApiVersion",
      message: "画像 API バージョン:",
      default: config.azureImageApiVersion || "2025-04-01-preview",
    },
  ]);

  config.azureEndpoint = answers.endpoint;
  config.azureApiKey = answers.apiKey;
  config.azureDeploymentName = answers.deploymentName;
  config.azureImageDeploymentName = answers.imageDeploymentName;
  config.azureApiVersion = answers.apiVersion;
  config.azureImageApiVersion = answers.imageApiVersion;

  await saveConfig(config);
  console.log("\nAzure OpenAI設定を保存しました。");
}

async function configureDefaults(): Promise<void> {
  const config = (await loadConfig()) || {};

  const answers = await inquirer.prompt<{
    language: SupportedLanguage;
    imageSize: string;
    imageQuality: string;
    imageStyle: string;
    imageFormat: string;
  }>([
    {
      type: "list",
      name: "language",
      message: "デフォルト言語",
      choices: Object.entries(LANGUAGE_DESCRIPTIONS).map(([key, value]) => ({
        name: `${key}: ${value}`,
        value: key,
      })),
      default: config.defaultLanguage || DEFAULT_CONFIG.defaultLanguage,
    },
    {
      type: "list",
      name: "imageSize",
      message: "デフォルト画像サイズ",
      choices: [
        { name: "1024x1024 (正方形)", value: "1024x1024" },
        { name: "1536x1024 (横長)", value: "1536x1024" },
        { name: "1024x1536 (縦長)", value: "1024x1536" },
      ],
      default: config.defaultImageSize || DEFAULT_CONFIG.defaultImageSize,
    },
    {
      type: "list",
      name: "imageQuality",
      message: "デフォルト画像品質",
      choices: [
        { name: "high (高品質)", value: "high" },
        { name: "medium (標準)", value: "medium" },
        { name: "low (高速)", value: "low" },
      ],
      default: config.defaultImageQuality || DEFAULT_CONFIG.defaultImageQuality,
    },
    {
      type: "list",
      name: "imageStyle",
      message: "デフォルト画像スタイル",
      choices: [
        { name: "vivid (鮮やか)", value: "vivid" },
        { name: "natural (自然)", value: "natural" },
      ],
      default: config.defaultImageStyle || DEFAULT_CONFIG.defaultImageStyle,
    },
    {
      type: "list",
      name: "imageFormat",
      message: "デフォルト画像フォーマット",
      choices: [
        { name: "PNG", value: "png" },
        { name: "JPG", value: "jpg" },
        { name: "WebP", value: "webp" },
      ],
      default: config.defaultImageFormat || DEFAULT_CONFIG.defaultImageFormat,
    },
  ]);

  config.defaultLanguage = answers.language;
  config.defaultImageSize = answers.imageSize as Config["defaultImageSize"];
  config.defaultImageQuality = answers.imageQuality as Config["defaultImageQuality"];
  config.defaultImageStyle = answers.imageStyle as Config["defaultImageStyle"];
  config.defaultImageFormat = answers.imageFormat as Config["defaultImageFormat"];

  await saveConfig(config);
  console.log("\nデフォルト設定を保存しました。");
}
