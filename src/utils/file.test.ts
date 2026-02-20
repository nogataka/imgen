import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  fileExists,
  generateUniqueFilePath,
  loadContextFile,
  saveFileWithUniqueNameIfExists,
} from "./file.js";

describe("file utilities", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "imgen-test-file-"));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe("generateUniqueFilePath", () => {
    it("should return original path when file does not exist", async () => {
      const testPath = path.join(tempDir, "test.txt");
      const result = await generateUniqueFilePath(testPath);
      expect(result).toBe(testPath);
    });

    it("should add random number when file exists", async () => {
      const testPath = path.join(tempDir, "test.txt");
      await fs.writeFile(testPath, "data");
      const result = await generateUniqueFilePath(testPath);
      expect(result).not.toBe(testPath);
      expect(result).toMatch(/test-\d{4}\.txt$/);
    });
  });

  describe("saveFileWithUniqueNameIfExists", () => {
    it("should save to original path when file does not exist", async () => {
      const testPath = path.join(tempDir, "save.txt");
      const data = new TextEncoder().encode("data");
      const saved = await saveFileWithUniqueNameIfExists(testPath, data);
      expect(saved).toBe(testPath);
      const content = await fs.readFile(testPath);
      expect(content).toEqual(Buffer.from(data));
    });

    it("should save with unique name when file exists", async () => {
      const testPath = path.join(tempDir, "save.txt");
      await fs.writeFile(testPath, "existing");
      const data = new TextEncoder().encode("new");
      const saved = await saveFileWithUniqueNameIfExists(testPath, data);
      expect(saved).not.toBe(testPath);
    });
  });

  describe("loadContextFile", () => {
    it("should return empty string for undefined", async () => {
      expect(await loadContextFile(undefined)).toBe("");
    });

    it("should return file content", async () => {
      const p = path.join(tempDir, "ctx.txt");
      await fs.writeFile(p, "context");
      expect(await loadContextFile(p)).toBe("context");
    });

    it("should throw for missing file", async () => {
      await expect(loadContextFile(path.join(tempDir, "nope.txt"))).rejects.toThrow(
        "コンテキストファイルが見つかりません"
      );
    });
  });

  describe("fileExists", () => {
    it("should return true for existing file", async () => {
      const p = path.join(tempDir, "exists.txt");
      await fs.writeFile(p, "x");
      expect(await fileExists(p)).toBe(true);
    });

    it("should return false for missing file", async () => {
      expect(await fileExists(path.join(tempDir, "nope.txt"))).toBe(false);
    });
  });
});
