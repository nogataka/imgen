/**
 * imgen SDK - Azure OpenAI Image Generation Library
 *
 * Azure OpenAI (gpt-image-1.5 / gpt-5.1) を使った
 * 画像生成・編集・説明のプログラマティック API
 */

// --- クライアント ---
export { AzureImageClient } from "./utils/azure-image.js";
export { AzureChatClient } from "./utils/azure-chat.js";

// --- AzureImageClient 型 ---
export type {
  ImageSize,
  ImageQuality,
  GenerateImageOptions,
  EditImageOptions,
} from "./utils/azure-image.js";

// --- Config ---
export type {
  AzureConfig,
  ImageSizeConfig,
  ImageQualityConfig,
  ImageFormatConfig,
} from "./utils/config.js";
export { getAzureConfig } from "./utils/config.js";

// --- Preset ---
export type { ImagePreset } from "./utils/preset.js";
export { BUILTIN_PRESETS, getPreset } from "./utils/preset.js";

// --- 画像ユーティリティ ---
export type { ImageData } from "./utils/image.js";
export { readImageFile, getMimeType } from "./utils/image.js";

// --- ファイルユーティリティ ---
export { saveFileWithUniqueNameIfExists, fileExists } from "./utils/file.js";

// --- 言語 ---
export type { SupportedLanguage } from "./lang.js";
export { LANGUAGE_DESCRIPTIONS } from "./lang.js";
