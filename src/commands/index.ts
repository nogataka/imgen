import { Command } from "commander";
import { configureCommand } from "./configure.js";
import { imageCommand } from "./image/index.js";
import { logCommand } from "./log.js";
import { presetCommand } from "./preset.js";

export function createMainCommand(): Command {
  const program = new Command()
    .name("imgen")
    .version("0.2.0")
    .description("Azure OpenAI 画像生成・編集・説明ツール - gpt-image-1.5 / gpt-5.1")
    .addHelpText(
      "before",
      `
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   imgen - Azure OpenAI Image Generation CLI                   ║
║                                                               ║
║   gpt-image-1.5    画像生成・編集                              ║
║   gpt-5.1          プロンプト拡張・画像説明                     ║
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
  1. 設定: imgen configure
  2. 画像生成: imgen image gen "テーマ"
`
    )
    .action(() => {
      program.help();
    });

  program.addCommand(imageCommand());
  program.addCommand(presetCommand());
  program.addCommand(configureCommand());
  program.addCommand(logCommand());

  return program;
}
