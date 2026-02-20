import * as fs from "node:fs/promises";

export async function generateUniqueFilePath(
  outputPath: string,
  maxRetries = 3
): Promise<string> {
  let finalPath = outputPath;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      await fs.stat(finalPath);
      const baseName = finalPath.slice(0, finalPath.lastIndexOf("."));
      const ext = finalPath.slice(finalPath.lastIndexOf("."));
      const rand = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
      finalPath = `${baseName}-${rand}${ext}`;
      retryCount++;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return finalPath;
      }
      throw error;
    }
  }

  throw new Error(
    `ファイル名の生成に失敗しました。${maxRetries}回試行しましたが、すべて既存のファイル名と衝突しています。`
  );
}

export async function saveFileWithUniqueNameIfExists(
  outputPath: string,
  data: Uint8Array,
  maxRetries = 3
): Promise<string> {
  const finalPath = await generateUniqueFilePath(outputPath, maxRetries);
  await fs.writeFile(finalPath, data);
  return finalPath;
}

export async function loadContextFile(contextPath?: string): Promise<string> {
  if (!contextPath) return "";
  try {
    return await fs.readFile(contextPath, "utf-8");
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(`コンテキストファイルが見つかりません: ${contextPath}`);
    }
    if (error instanceof Error) {
      throw new Error(`コンテキストファイルの読み込みに失敗しました: ${error.message}`);
    }
    throw new Error(`コンテキストファイルの読み込みに失敗しました: ${String(error)}`);
  }
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
