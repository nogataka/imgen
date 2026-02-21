import type { ImageFormatConfig, ImageQualityConfig, ImageSizeConfig } from "./config.js";

/**
 * Represents a preset configuration for image generation.
 */
export interface ImagePreset {
  size?: ImageSizeConfig;
  quality?: ImageQualityConfig;
  format?: ImageFormatConfig;
}

/**
 * Built-in presets that ship with imgen.
 */
export const BUILTIN_PRESETS: Record<string, ImagePreset> = {
  "builtin:square": { size: "1024x1024", quality: "high" },
  "builtin:landscape": { size: "1536x1024", quality: "high" },
  "builtin:portrait": { size: "1024x1536", quality: "high" },
  "builtin:draft": { size: "1024x1024", quality: "low" },
  "builtin:photo": { size: "1536x1024", quality: "high" },
};

/**
 * Retrieves a preset by name. Only builtin presets are available.
 * Returns null if no preset with the given name is found.
 */
export function getPreset(name: string): ImagePreset | null {
  if (name.startsWith("builtin:") && BUILTIN_PRESETS[name]) {
    return BUILTIN_PRESETS[name];
  }
  return BUILTIN_PRESETS[name] || null;
}
