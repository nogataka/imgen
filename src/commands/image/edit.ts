import * as fs from "node:fs/promises";
import * as path from "node:path";
import { Command, Option } from "commander";
import { getAzureConfig } from "../../utils/config.js";
import type { ImageSizeConfig } from "../../utils/config.js";
import { fileExists, saveFileWithUniqueNameIfExists } from "../../utils/file.js";
import { AzureChatClient } from "../../utils/azure-chat.js";
import { AzureImageClient } from "../../utils/azure-image.js";
import { createErrorOutput, createSuccessOutput, printJson } from "../../utils/output.js";

interface EditOptions {
  output?: string;
  format: string;
  size: string;
  json: boolean;
  dryRun: boolean;
}

const SUPPORTED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp"];

export function imageEditCommand(): Command {
  return new Command("edit")
    .description("画像をAI編集")
    .argument("<file>", "編集する画像ファイルのパス")
    .argument("<prompt>", "編集の指示")
    .option("-o, --output <path>", "出力パス")
    .addOption(
      new Option("-f, --format <format>", "出力フォーマット")
        .choices(["png", "jpg", "webp"])
        .default("png")
    )
    .addOption(
      new Option("-s, --size <size>", "出力サイズ")
        .choices(["1024x1024", "1536x1024", "1024x1536"])
        .default("1024x1024")
    )
    .option("--json", "JSON形式で出力", false)
    .option("--dry-run", "実行せずに設定を確認", false)
    .action(async (filePath: string, prompt: string, options: EditOptions) => {
      // Validate input file
      const ext = path.extname(filePath).toLowerCase();
      if (!SUPPORTED_EXTENSIONS.includes(ext)) {
        const msg = `サポートされていないファイル形式です: ${ext}`;
        if (options.json) {
          printJson(createErrorOutput("image edit", msg));
        } else {
          console.error("エラー:", msg);
        }
        process.exit(1);
      }

      if (!(await fileExists(filePath))) {
        const msg = `ファイルが見つかりません: ${filePath}`;
        if (options.json) {
          printJson(createErrorOutput("image edit", msg));
        } else {
          console.error("エラー:", msg);
        }
        process.exit(1);
      }

      const effectiveSize = options.size as ImageSizeConfig;
      const effectiveFormat = options.format;

      // Dry-run
      if (options.dryRun) {
        const info = {
          file: filePath,
          prompt,
          size: effectiveSize,
          format: effectiveFormat,
          output: options.output || "(自動生成)",
        };

        if (options.json) {
          printJson(createSuccessOutput("image edit", { dryRun: true, ...info }));
        } else {
          console.log("\n[DRY-RUN] 画像編集");
          console.log("  入力:", filePath);
          console.log("  プロンプト:", prompt);
          console.log("  サイズ:", effectiveSize);
          console.log("  フォーマット:", effectiveFormat);
          console.log("  出力先:", options.output || "(自動生成)");
          console.log("\nAPIは呼び出されません。実行するには --dry-run を外してください。");
        }
        return;
      }

      try {
        const azureConfig = await getAzureConfig();
        const chatClient = new AzureChatClient(azureConfig);
        const imageClient = new AzureImageClient(azureConfig);

        // Read input image
        const imageBuffer = Buffer.from(await fs.readFile(filePath));

        // Edit image via REST API
        const editedData = await imageClient.editImage(imageBuffer, prompt, {
          size: effectiveSize,
        });

        // Generate filename
        const baseName = path.basename(filePath, ext);
        const fileName = await chatClient.generateFileName(`${baseName} edited`);

        // Resolve output path
        let outputPath: string;
        if (options.output) {
          try {
            const stat = await fs.stat(options.output);
            if (stat.isDirectory()) {
              outputPath = path.join(options.output, `${fileName}.${effectiveFormat}`);
            } else {
              outputPath = options.output;
            }
          } catch {
            outputPath = options.output;
          }
        } else {
          outputPath = `${fileName}.${effectiveFormat}`;
        }

        // Save file
        const finalPath = await saveFileWithUniqueNameIfExists(outputPath, editedData);

        if (options.json) {
          printJson(
            createSuccessOutput("image edit", {
              input: filePath,
              path: finalPath,
              format: effectiveFormat,
              size: effectiveSize,
            })
          );
        } else {
          console.log(`画像を編集しました: ${finalPath}`);
        }
      } catch (error: unknown) {
        if (error instanceof Error) {
          if (options.json) {
            printJson(createErrorOutput("image edit", error.message));
          } else {
            console.error("エラー:", error.message);
          }
        } else {
          if (options.json) {
            printJson(createErrorOutput("image edit", "不明なエラーが発生しました"));
          } else {
            console.error("不明なエラーが発生しました");
          }
        }
        process.exit(1);
      }
    });
}
