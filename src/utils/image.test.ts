import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getMimeType, readImageFile } from "./image.js";

describe("getMimeType", () => {
  it("should return correct MIME type for each format", () => {
    expect(getMimeType("test.jpg")).toBe("image/jpeg");
    expect(getMimeType("test.jpeg")).toBe("image/jpeg");
    expect(getMimeType("test.png")).toBe("image/png");
    expect(getMimeType("test.gif")).toBe("image/gif");
    expect(getMimeType("test.webp")).toBe("image/webp");
  });

  it("should throw for unsupported format", () => {
    expect(() => getMimeType("test.txt")).toThrow("サポートされていないファイル形式です");
  });
});

describe("readImageFile", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "imgen-test-image-"));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("should read image and return base64", async () => {
    const p = path.join(tempDir, "test.jpg");
    await fs.writeFile(p, Buffer.from([1, 2, 3, 4]));
    const result = await readImageFile(p);
    expect(result.data).toBe("AQIDBA==");
    expect(result.mimeType).toBe("image/jpeg");
  });

  it("should throw for missing file", async () => {
    await expect(readImageFile(path.join(tempDir, "nope.jpg"))).rejects.toThrow(
      "画像ファイルの読み込みに失敗しました"
    );
  });
});
