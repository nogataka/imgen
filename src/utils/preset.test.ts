import { describe, expect, it } from "vitest";
import { BUILTIN_PRESETS, getPreset } from "./preset.js";

describe("preset", () => {
  it("should have builtin presets", () => {
    expect(BUILTIN_PRESETS["builtin:square"]).toEqual({
      size: "1024x1024",
      quality: "high",
    });
    expect(BUILTIN_PRESETS["builtin:landscape"]).toEqual({
      size: "1536x1024",
      quality: "high",
    });
  });

  it("should have all expected builtin presets", () => {
    const names = Object.keys(BUILTIN_PRESETS);
    expect(names).toContain("builtin:square");
    expect(names).toContain("builtin:landscape");
    expect(names).toContain("builtin:portrait");
    expect(names).toContain("builtin:draft");
    expect(names).toContain("builtin:photo");
    expect(names).toHaveLength(5);
  });

  it("should get builtin preset by name", () => {
    expect(getPreset("builtin:square")).toEqual({
      size: "1024x1024",
      quality: "high",
    });
  });

  it("should get builtin:portrait preset", () => {
    expect(getPreset("builtin:portrait")).toEqual({
      size: "1024x1536",
      quality: "high",
    });
  });

  it("should get builtin:draft preset", () => {
    expect(getPreset("builtin:draft")).toEqual({
      size: "1024x1024",
      quality: "low",
    });
  });

  it("should return null for missing preset", () => {
    expect(getPreset("nope")).toBeNull();
  });

  it("should return null for nonexistent builtin prefix", () => {
    expect(getPreset("builtin:nonexistent")).toBeNull();
  });

  it("should return null for custom preset names (no longer supported)", () => {
    expect(getPreset("my-custom")).toBeNull();
  });
});
