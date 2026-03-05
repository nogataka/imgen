/**
 * imgen SDK - OpenAI / Azure OpenAI Image Generation Library
 *
 * OpenAI (gpt-image-1.5 / gpt-5.1) を使った
 * 画像生成・編集・説明のプログラマティック API
 */

// --- クライアント ---
export { ImageClient } from "./utils/image-client.js";
export { ChatClient } from "./utils/chat-client.js";

// --- ImageClient 型 ---
export type {
  ImageSize,
  ImageQuality,
  GenerateImageOptions,
  EditImageOptions,
} from "./utils/image-client.js";

// --- Config ---
export type {
  AzureConfig,
  OpenAIConfig,
  ProviderConfig,
  ImageSizeConfig,
  ImageQualityConfig,
  ImageFormatConfig,
} from "./utils/config.js";
export { getAzureConfig, getOpenAIConfig, getConfig } from "./utils/config.js";

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
