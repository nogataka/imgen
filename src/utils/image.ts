import * as fs from "node:fs/promises";

export interface ImageData {
  data: string;
  mimeType: string;
}

export async function readImageFile(filePath: string): Promise<ImageData> {
  try {
    const buffer = await fs.readFile(filePath);
    return {
      data: buffer.toString("base64"),
      mimeType: getMimeType(filePath),
    };
  } catch (error: unknown) {
    if (error instanceof Error && error.message.startsWith("サポートされていない")) {
      throw error;
    }
    throw new Error(
      `画像ファイルの読み込みに失敗しました: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export function getMimeType(filePath: string): string {
  const ext = filePath.toLowerCase().split(".").pop();
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
  };
  if (ext && map[ext]) return map[ext];
  throw new Error(`サポートされていないファイル形式です: .${ext}`);
}
