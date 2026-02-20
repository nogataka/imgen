import { Command } from "commander";
import {
  deletePreset,
  getPresetsPath,
  listAllPresets,
  savePreset,
  type ImagePreset,
} from "../utils/preset.js";

export function presetCommand(): Command {
  const preset = new Command("preset").description("画像生成プリセットを管理します");

  preset
    .command("list")
    .description("プリセット一覧を表示")
    .option("--json", "JSON形式で出力")
    .action(async (options: { json?: boolean }) => {
      try {
        const presets = await listAllPresets();

        if (options.json) {
          console.log(JSON.stringify(presets, null, 2));
          return;
        }

        console.log(`\nプリセット一覧 (${getPresetsPath()})\n`);

        if (presets.length === 0) {
          console.log("プリセットがありません。");
          return;
        }

        const builtins = presets.filter((p) => p.builtin);
        if (builtins.length > 0) {
          console.log("ビルトインプリセット:");
          for (const { name, preset } of builtins) {
            console.log(`  ${name}`);
            formatPreset(preset, "    ");
          }
          console.log();
        }

        const userDefined = presets.filter((p) => !p.builtin);
        if (userDefined.length > 0) {
          console.log("ユーザー定義プリセット:");
          for (const { name, preset } of userDefined) {
            console.log(`  ${name}`);
            formatPreset(preset, "    ");
          }
        }
      } catch (error: unknown) {
        if (error instanceof Error) {
          console.error("エラー:", error.message);
        } else {
          console.error("不明なエラーが発生しました");
        }
        process.exit(1);
      }
    });

  preset
    .command("save <name>")
    .description("新しいプリセットを保存")
    .option("-s, --size <size>", "画像サイズ (1024x1024, 1536x1024, 1024x1536)")
    .option("-q, --quality <quality>", "画像品質 (low, medium, high)")
    .option("-t, --style <style>", "画像スタイル (vivid, natural)")
    .option("-f, --format <format>", "画像フォーマット (png, jpg, webp)")
    .action(
      async (
        name: string,
        options: {
          size?: string;
          quality?: string;
          style?: string;
          format?: string;
        }
      ) => {
        try {
          const preset: ImagePreset = {};

          if (options.size) preset.size = options.size as ImagePreset["size"];
          if (options.quality) preset.quality = options.quality as ImagePreset["quality"];
          if (options.style) preset.style = options.style as ImagePreset["style"];
          if (options.format) preset.format = options.format as ImagePreset["format"];

          if (Object.keys(preset).length === 0) {
            console.error("エラー: 少なくとも1つのオプションを指定してください");
            process.exit(1);
          }

          await savePreset(name, preset);
          console.log(`プリセット '${name}' を保存しました。`);
        } catch (error: unknown) {
          if (error instanceof Error) {
            console.error("エラー:", error.message);
          } else {
            console.error("不明なエラーが発生しました");
          }
          process.exit(1);
        }
      }
    );

  preset
    .command("delete <name>")
    .description("プリセットを削除")
    .action(async (name: string) => {
      try {
        const deleted = await deletePreset(name);
        if (deleted) {
          console.log(`プリセット '${name}' を削除しました。`);
        } else {
          console.error(`プリセット '${name}' が見つかりません。`);
          process.exit(1);
        }
      } catch (error: unknown) {
        if (error instanceof Error) {
          console.error("エラー:", error.message);
        } else {
          console.error("不明なエラーが発生しました");
        }
        process.exit(1);
      }
    });

  return preset;
}

function formatPreset(preset: ImagePreset, indent: string): void {
  if (preset.size) console.log(`${indent}サイズ: ${preset.size}`);
  if (preset.quality) console.log(`${indent}品質: ${preset.quality}`);
  if (preset.style) console.log(`${indent}スタイル: ${preset.style}`);
  if (preset.format) console.log(`${indent}フォーマット: ${preset.format}`);
}
