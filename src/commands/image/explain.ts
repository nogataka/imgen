import * as fs from "node:fs/promises";
import { Command } from "commander";
import { LANGUAGE_DESCRIPTIONS, type SupportedLanguage } from "../../lang.js";
import { getAzureConfig } from "../../utils/config.js";
import { AzureChatClient } from "../../utils/azure-chat.js";
import { readImageFile } from "../../utils/image.js";

interface ExplainOptions {
  lang: string;
  format: "markdown" | "json";
  context?: string;
  output?: string;
}

export function imageExplainCommand(): Command {
  return new Command("explain")
    .description("画像の内容を説明")
    .argument("<file>", "画像ファイルのパス")
    .option(
      "-l, --lang <lang>",
      `出力言語 (${Object.keys(LANGUAGE_DESCRIPTIONS).join(", ")})`,
      "ja"
    )
    .option("-f, --format <format>", "出力フォーマット (markdown | json)", "markdown")
    .option("-c, --context <context>", "コンテキスト情報")
    .option("-o, --output <path>", "出力ファイルパス")
    .action(async (filePath: string, options: ExplainOptions) => {
      try {
        const lang = options.lang;

        const validLangs = Object.keys(LANGUAGE_DESCRIPTIONS) as SupportedLanguage[];
        const effectiveLang = validLangs.includes(lang as SupportedLanguage) ? lang : "ja";

        const azureConfig = await getAzureConfig();
        const chatClient = new AzureChatClient(azureConfig);
        const imageData = await readImageFile(filePath);

        let context: string | undefined;
        if (options.context) {
          if (options.context.endsWith(".md") || options.context.endsWith(".txt")) {
            context = await fs.readFile(options.context, "utf-8");
          } else {
            context = options.context;
          }
        }

        const explanation = await chatClient.generateExplanation(imageData, effectiveLang, context);

        let output: string;
        if (options.format === "json") {
          output = JSON.stringify({ file: filePath, type: "image", explanation }, null, 2);
        } else {
          output = `# ${filePath}\n\n**種類:** 画像\n\n${explanation}`;
        }

        if (options.output) {
          await fs.writeFile(options.output, output, "utf-8");
          console.log(`説明を保存しました: ${options.output}`);
        } else {
          console.log(output);
        }
      } catch (error: unknown) {
        console.error("エラー:", error instanceof Error ? error.message : "不明なエラー");
        process.exit(1);
      }
    });
}
