import * as fs from "node:fs/promises";
import * as path from "node:path";
import { Command, Option } from "commander";
import { getAzureConfig, loadConfig } from "../../utils/config.js";
import type { ImageFormatConfig, ImageQualityConfig, ImageSizeConfig, ImageStyleConfig } from "../../utils/config.js";
import { loadContextFile, saveFileWithUniqueNameIfExists } from "../../utils/file.js";
import { AzureChatClient } from "../../utils/azure-chat.js";
import { AzureImageClient } from "../../utils/azure-image.js";
import { LogDestination, Logger, LogLevel } from "../../utils/logger.js";
import { createErrorOutput, createSuccessOutput, printJson } from "../../utils/output.js";
import { getPreset } from "../../utils/preset.js";

interface GenOptions {
  context?: string;
  output?: string;
  size: string;
  quality: string;
  style: string;
  format: string;
  debug: boolean;
  json: boolean;
  dryRun: boolean;
  preset?: string;
}

const VALID_FORMATS = ["png", "jpg", "webp"];

function validateImageFormat(ext: string, specifiedFormat?: string) {
  if (!VALID_FORMATS.includes(ext)) {
    throw new Error(`サポートされていない画像フォーマットです: ${ext}`);
  }
  if (specifiedFormat && ext !== specifiedFormat) {
    throw new Error(
      `出力ファイルの拡張子(${ext})と指定されたフォーマット(${specifiedFormat})が一致しません`
    );
  }
}

async function resolveOutputPath(
  outputPath: string | undefined,
  defaultFormat: string,
  fileName: string
): Promise<{ path: string; format: string }> {
  let format = defaultFormat;

  if (!outputPath) {
    return { path: `${fileName}.${format}`, format };
  }

  try {
    const stat = await fs.stat(outputPath);
    if (stat.isDirectory()) {
      return { path: path.join(outputPath, `${fileName}.${format}`), format };
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }

  const ext = path.extname(outputPath).toLowerCase().slice(1);
  if (ext) {
    validateImageFormat(ext, defaultFormat);
    format = ext;
  } else {
    outputPath = `${outputPath}.${format}`;
  }

  return { path: outputPath, format };
}

export function imageGenCommand(): Command {
  return new Command("gen")
    .description("テキストから画像を生成")
    .argument("<theme>", "画像生成のテーマ")
    .option("-c, --context <file>", "コンテキストファイルのパス")
    .option("-o, --output <path>", "出力パス（ファイルまたはディレクトリ）")
    .addOption(
      new Option("-s, --size <size>", "画像サイズ")
        .choices(["1024x1024", "1536x1024", "1024x1536"])
        .default("1024x1024")
    )
    .addOption(
      new Option("-q, --quality <quality>", "画像品質")
        .choices(["low", "medium", "high"])
        .default("high")
    )
    .addOption(
      new Option("-t, --style <style>", "画像スタイル")
        .choices(["vivid", "natural"])
        .default("vivid")
    )
    .addOption(
      new Option("-f, --format <format>", "画像フォーマット")
        .choices(["png", "jpg", "webp"])
        .default("png")
    )
    .option("-d, --debug", "デバッグモード", false)
    .option("--json", "JSON形式で出力", false)
    .option("--dry-run", "実行せずに設定を確認", false)
    .option("-p, --preset <name>", "プリセット名")
    .action(async (theme: string, options: GenOptions) => {
      if (!theme) {
        console.log("テーマを指定してください");
        process.exit(1);
      }

      // Preset application
      let presetSize: string | undefined;
      let presetQuality: string | undefined;
      let presetStyle: string | undefined;
      let presetFormat: string | undefined;

      if (options.preset) {
        const preset = await getPreset(options.preset);
        if (!preset) {
          const errorMsg = `プリセット '${options.preset}' が見つかりません。\nimgen preset list で一覧を確認してください。`;
          if (options.json) {
            printJson(createErrorOutput("image gen", errorMsg, "PRESET_NOT_FOUND"));
          } else {
            console.error("エラー:", errorMsg);
          }
          process.exit(1);
        }
        presetSize = preset.size;
        presetQuality = preset.quality;
        presetStyle = preset.style;
        presetFormat = preset.format;
      }

      // Load config defaults
      const config = await loadConfig();

      // Resolve effective values: CLI > preset > config > defaults
      const effectiveSize = (options.size !== "1024x1024"
        ? options.size
        : presetSize || config?.defaultImageSize || options.size) as ImageSizeConfig;

      const effectiveQuality = (options.quality !== "high"
        ? options.quality
        : presetQuality || config?.defaultImageQuality || options.quality) as ImageQualityConfig;

      const effectiveStyle = (options.style !== "vivid"
        ? options.style
        : presetStyle || config?.defaultImageStyle || options.style) as ImageStyleConfig;

      const effectiveFormat = (options.format !== "png"
        ? options.format
        : presetFormat || config?.defaultImageFormat || options.format) as ImageFormatConfig;

      // Logger setup
      Logger.setGlobalConfig({
        destination: LogDestination.BOTH,
        minLevel: options.debug ? LogLevel.DEBUG : LogLevel.INFO,
      });
      const logger = Logger.getInstance({ name: "image-gen" });

      // Dry-run mode
      if (options.dryRun) {
        const dryRunInfo = {
          theme,
          size: effectiveSize,
          quality: effectiveQuality,
          style: effectiveStyle,
          format: effectiveFormat,
          output: options.output || `(自動生成).${effectiveFormat}`,
          ...(options.preset ? { preset: options.preset } : {}),
          ...(options.context ? { context: options.context } : {}),
        };

        if (options.json) {
          printJson(createSuccessOutput("image gen", { dryRun: true, ...dryRunInfo }));
        } else {
          console.log("\n[DRY-RUN] 画像生成");
          console.log("  テーマ:", theme);
          if (options.preset) console.log("  プリセット:", options.preset);
          console.log("  サイズ:", effectiveSize);
          console.log("  品質:", effectiveQuality);
          console.log("  スタイル:", effectiveStyle);
          console.log("  フォーマット:", effectiveFormat);
          if (options.context) console.log("  コンテキスト:", options.context);
          console.log("  出力先:", options.output || `(自動生成).${effectiveFormat}`);
          console.log("\nAPIは呼び出されません。実行するには --dry-run を外してください。");
        }
        return;
      }

      try {
        const azureConfig = await getAzureConfig();
        const chatClient = new AzureChatClient(azureConfig);
        const imageClient = new AzureImageClient(azureConfig);

        // Generate expanded prompt
        const context = await loadContextFile(options.context);
        const prompt = await chatClient.generatePrompt(theme, context);

        if (options.debug) {
          await logger.debug("生成されたプロンプト", { prompt, theme });
        }

        // Generate image
        const imageData = await imageClient.generateImage(prompt, {
          size: effectiveSize,
          quality: effectiveQuality,
          style: effectiveStyle,
        });

        // Generate filename
        const fileName = await chatClient.generateFileName(theme);

        // Resolve output path
        const { path: outputPath, format } = await resolveOutputPath(
          options.output,
          effectiveFormat,
          fileName
        );

        // Save file
        const finalOutputPath = await saveFileWithUniqueNameIfExists(outputPath, imageData);

        await logger.info("画像を生成しました", {
          path: finalOutputPath,
          format,
          size: effectiveSize,
          quality: effectiveQuality,
          style: effectiveStyle,
          ...(options.preset ? { preset: options.preset } : {}),
        });

        if (options.json) {
          printJson(
            createSuccessOutput("image gen", {
              path: finalOutputPath,
              format,
              size: effectiveSize,
              quality: effectiveQuality,
              style: effectiveStyle,
              ...(options.preset ? { preset: options.preset } : {}),
            })
          );
        } else {
          console.log(`画像を生成しました: ${finalOutputPath}`);
        }
      } catch (error: unknown) {
        if (error instanceof Error) {
          await logger.error("画像生成に失敗しました", { error: error.message });
          if (options.json) {
            printJson(createErrorOutput("image gen", error.message));
          } else {
            console.error("エラー:", error.message);
          }
        } else {
          await logger.error("不明なエラーが発生しました");
          if (options.json) {
            printJson(createErrorOutput("image gen", "不明なエラーが発生しました"));
          } else {
            console.error("不明なエラーが発生しました");
          }
        }
        process.exit(1);
      }
    });
}
