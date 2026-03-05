import { Command } from "commander";
import { imageCommand } from "./image/index.js";

export function createMainCommand(): Command {
  const program = new Command()
    .name("imgen")
    .version("0.4.0")
    .description("OpenAI 画像生成・編集・説明ツール - gpt-image-1.5 / gpt-5.1")
    .addHelpText(
      "before",
      `
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   imgen - OpenAI Image Generation CLI                         ║
║                                                               ║
║   gpt-image-1.5    画像生成・編集                              ║
║   gpt-5.1          プロンプト拡張・画像説明                     ║
║                                                               ║
║   Supports: OpenAI API / Azure OpenAI                         ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`
    )
    .addHelpText(
      "after",
      `
使用例:
  $ imgen image gen "夕日の海辺" -q high -s 1536x1024
  $ imgen image gen "可愛い猫" -s 1024x1024 -p builtin:square
  $ imgen image edit photo.png "背景を青空に"
  $ imgen image explain screenshot.png -l en

クイックスタート:
  OpenAI:       export OPENAI_API_KEY="sk-..."
  Azure OpenAI: export AZURE_OPENAI_API_KEY="..."
  画像生成:     imgen image gen "テーマ"
`
    )
    .action(() => {
      program.help();
    });

  program.addCommand(imageCommand());

  return program;
}
