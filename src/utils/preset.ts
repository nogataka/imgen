import * as fs from "node:fs/promises";
import * as path from "node:path";
import { getConfigDir } from "./config.js";
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
 * A dictionary of named presets.
 */
export interface Presets {
  [name: string]: ImagePreset;
}

/**
 * Built-in presets that ship with imgen.
 */
export const BUILTIN_PRESETS: Presets = {
  "builtin:square": { size: "1024x1024", quality: "high" },
  "builtin:landscape": { size: "1536x1024", quality: "high" },
  "builtin:portrait": { size: "1024x1536", quality: "high" },
  "builtin:draft": { size: "1024x1024", quality: "low" },
  "builtin:photo": { size: "1536x1024", quality: "high" },
};

/**
 * Returns the file path for user-defined presets (~/.imgen/presets.json).
 */
export function getPresetsPath(): string {
  return path.join(getConfigDir(), "presets.json");
}

/**
 * Loads user-defined presets from disk. Returns an empty object if no file exists.
 */
export async function loadPresets(): Promise<Presets> {
  try {
    const text = await fs.readFile(getPresetsPath(), "utf-8");
    return JSON.parse(text) as Presets;
  } catch {
    return {};
  }
}

/**
 * Saves user-defined presets to disk, creating the config directory if needed.
 */
export async function savePresets(presets: Presets): Promise<void> {
  const p = getPresetsPath();
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, JSON.stringify(presets, null, 2));
}

/**
 * Retrieves a preset by name. Checks builtin presets first, then user-defined
 * presets. Returns null if no preset with the given name is found.
 */
export async function getPreset(name: string): Promise<ImagePreset | null> {
  if (name.startsWith("builtin:") && BUILTIN_PRESETS[name]) {
    return BUILTIN_PRESETS[name];
  }
  const presets = await loadPresets();
  return presets[name] || null;
}

/**
 * Saves a user-defined preset. Throws if the name starts with "builtin:".
 */
export async function savePreset(name: string, preset: ImagePreset): Promise<void> {
  if (name.startsWith("builtin:")) {
    throw new Error("ビルトインプリセットは上書きできません");
  }
  const presets = await loadPresets();
  presets[name] = preset;
  await savePresets(presets);
}

/**
 * Deletes a user-defined preset. Throws if the name starts with "builtin:".
 * Returns true if the preset was found and deleted, false if it did not exist.
 */
export async function deletePreset(name: string): Promise<boolean> {
  if (name.startsWith("builtin:")) {
    throw new Error("ビルトインプリセットは削除できません");
  }
  const presets = await loadPresets();
  if (!presets[name]) return false;
  delete presets[name];
  await savePresets(presets);
  return true;
}

/**
 * Lists all presets (builtin and user-defined), returning each with its name,
 * preset configuration, and a flag indicating whether it is builtin.
 */
export async function listAllPresets(): Promise<
  { name: string; preset: ImagePreset; builtin: boolean }[]
> {
  const result: { name: string; preset: ImagePreset; builtin: boolean }[] = [];
  for (const [name, preset] of Object.entries(BUILTIN_PRESETS)) {
    result.push({ name, preset, builtin: true });
  }
  const presets = await loadPresets();
  for (const [name, preset] of Object.entries(presets)) {
    result.push({ name, preset, builtin: false });
  }
  return result;
}
