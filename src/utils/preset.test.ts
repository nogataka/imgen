import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  BUILTIN_PRESETS,
  deletePreset,
  getPreset,
  listAllPresets,
  savePreset,
} from "./preset.js";

describe("preset", () => {
  let tempDir: string;
  let origHome: string | undefined;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "imgen-test-preset-"));
    origHome = process.env.HOME;
    process.env.HOME = tempDir;
  });

  afterEach(async () => {
    process.env.HOME = origHome;
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("should have builtin presets", () => {
    expect(BUILTIN_PRESETS["builtin:square"]).toEqual({
      size: "1024x1024", quality: "high",
    });
    expect(BUILTIN_PRESETS["builtin:landscape"]).toEqual({
      size: "1536x1024", quality: "high",
    });
  });

  it("should get builtin preset", async () => {
    expect(await getPreset("builtin:square")).toEqual({
      size: "1024x1024", quality: "high",
    });
  });

  it("should save and get user preset", async () => {
    await savePreset("test", { size: "1024x1536", quality: "low" });
    expect(await getPreset("test")).toEqual({
      size: "1024x1536", quality: "low",
    });
  });

  it("should return null for missing preset", async () => {
    expect(await getPreset("nope")).toBeNull();
  });

  it("should delete user preset", async () => {
    await savePreset("test", { size: "1024x1024" });
    expect(await deletePreset("test")).toBe(true);
    expect(await getPreset("test")).toBeNull();
  });

  it("should reject deleting builtin preset", async () => {
    await expect(deletePreset("builtin:square")).rejects.toThrow();
  });

  it("should list all presets", async () => {
    await savePreset("custom", { size: "1024x1024" });
    const all = await listAllPresets();
    expect(all.some((p) => p.name === "builtin:square" && p.builtin)).toBe(true);
    expect(all.some((p) => p.name === "custom" && !p.builtin)).toBe(true);
  });
});
