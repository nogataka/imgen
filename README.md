# imgen

Azure OpenAI を使った画像生成・編集・説明 CLI ツール。gpt-image-1.5 による画像生成/編集と、gpt-5.1 によるプロンプト拡張・ファイル名生成・画像説明を提供します。

## インストール

```bash
npm install -g @nogataka/imgen
```

## セットアップ

### 環境変数（推奨）

```bash
export AZURE_OPENAI_ENDPOINT="https://your-resource.openai.azure.com"
export AZURE_OPENAI_API_KEY="your-api-key"
export AZURE_OPENAI_DEPLOYMENT_NAME="gpt-5.1"
export AZURE_OPENAI_DEPLOYMENT_NAME_IMAGE="gpt-image-1.5"
export AZURE_OPENAI_API_VERSION="2024-02-15-preview"
export AZURE_OPENAI_IMAGE_API_VERSION="2025-04-01-preview"
```

### 対話式設定

```bash
imgen configure
```

Azure OpenAI の接続情報やデフォルト値を対話的に設定できます。設定は `~/.imgen/config.json` に保存されます。

環境変数が設定されている場合、環境変数が優先されます。

## 使い方

### 画像生成

テキストから画像を生成します。プロンプトは gpt-5.1 で自動拡張されます。

```bash
imgen image gen "夕日の海辺の風景"
imgen image gen "可愛い猫のマスコット" -s 1536x1024 -q high
imgen image gen "ミニマルなロゴ" -c context.md -o logo.png
imgen image gen "商品写真" -p builtin:landscape
```

| オプション | 短縮 | 説明 | デフォルト |
|-----------|------|------|-----------|
| `--size <size>` | `-s` | `1024x1024`, `1536x1024`, `1024x1536` | `1024x1024` |
| `--quality <quality>` | `-q` | `low`, `medium`, `high` | `high` |
| `--format <format>` | `-f` | `png`, `jpg`, `webp` | `png` |
| `--preset <name>` | `-p` | プリセット名 | - |
| `--context <path>` | `-c` | コンテキストファイル (.md/.txt) | - |
| `--output <path>` | `-o` | 出力先ファイルまたはディレクトリ | カレントディレクトリ |
| `--json` | | JSON 形式で出力 | - |
| `--dry-run` | | API を呼ばずに設定を確認 | - |
| `--debug` | `-d` | デバッグログを有効化 | - |

### 画像編集

既存の画像を自然言語の指示で AI 編集します。

```bash
imgen image edit photo.jpg "背景を青空に変更"
imgen image edit portrait.png "アニメスタイルに変換" -s 1536x1024
imgen image edit image.png "色を鮮やかに" -o edited/
```

対応入力形式: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`

| オプション | 短縮 | 説明 | デフォルト |
|-----------|------|------|-----------|
| `--size <size>` | `-s` | 出力サイズ | `1024x1024` |
| `--format <format>` | `-f` | `png`, `jpg`, `webp` | `png` |
| `--output <path>` | `-o` | 出力先 | カレントディレクトリ |
| `--json` | | JSON 形式で出力 | - |
| `--dry-run` | | 設定確認のみ | - |

### 画像説明

画像の内容を指定した言語で説明します。

```bash
imgen image explain screenshot.png
imgen image explain photo.jpg -l en
imgen image explain chart.png -c "Q4 sales report" -f json -o description.json
```

| オプション | 短縮 | 説明 | デフォルト |
|-----------|------|------|-----------|
| `--lang <lang>` | `-l` | 出力言語（下記参照） | `ja` |
| `--format <format>` | `-f` | `markdown`, `json` | `markdown` |
| `--context <text>` | `-c` | コンテキスト（テキストまたはファイルパス） | - |
| `--output <path>` | `-o` | 出力ファイル（省略時は標準出力） | - |

対応言語: `ja`(日本語), `en`(英語), `zh`(中国語), `ko`(韓国語), `es`(スペイン語), `fr`(フランス語), `de`(ドイツ語), `it`(イタリア語), `ru`(ロシア語), `vi`(ベトナム語)

## プリセット

よく使う設定をプリセットとして保存・呼び出しできます。

### ビルトインプリセット

| 名前 | サイズ | 品質 | 用途 |
|------|--------|------|------|
| `builtin:square` | 1024x1024 | high | 正方形、アイコン |
| `builtin:landscape` | 1536x1024 | high | 横長、風景 |
| `builtin:portrait` | 1024x1536 | high | 縦長、ポートレート |
| `builtin:draft` | 1024x1024 | low | 下書き、プロトタイプ |
| `builtin:photo` | 1536x1024 | high | 商品写真 |

### カスタムプリセット

```bash
imgen preset save myhd -s 1536x1024 -q high -f png
imgen preset list
imgen preset delete myhd
```

プリセットは `~/.imgen/presets.json` に保存されます。

## ログ

操作ログは `~/.imgen/logs/` に JSON Lines 形式で保存されます。

```bash
imgen log                    # 直近 20 件
imgen log -n 50 -l debug    # 直近 50 件（DEBUG 以上）
imgen log -l error           # エラーのみ
```

## 設定の優先順位

1. CLI オプション（最優先）
2. プリセット値（`-p` 指定時）
3. 設定ファイル（`~/.imgen/config.json`）
4. デフォルト値

## SDK として使う

imgen は CLI だけでなく、Node.js ライブラリとしても利用できます。スライドジェネレーターや LLM ツールなど、他のアプリケーションから画像生成・編集・説明機能を呼び出せます。

```bash
npm install @nogataka/imgen
```

```typescript
import {
  AzureImageClient,
  AzureChatClient,
  getAzureConfig,
  saveFileWithUniqueNameIfExists,
} from "@nogataka/imgen/sdk";

// Azure OpenAI 設定を取得（環境変数 or ~/.imgen/config.json）
const config = await getAzureConfig();

// 画像生成
const imageClient = new AzureImageClient(config);
const imageBytes = await imageClient.generateImage("夕日の海辺", {
  size: "1536x1024",
  quality: "high",
});
const savedPath = await saveFileWithUniqueNameIfExists("sunset.png", imageBytes);

// プロンプト拡張・画像説明
const chatClient = new AzureChatClient(config);
const prompt = await chatClient.generatePrompt("可愛い猫のマスコット");
const fileName = await chatClient.generateFileName("可愛い猫のマスコット");

// 画像編集
import * as fs from "node:fs/promises";
const photo = Buffer.from(await fs.readFile("photo.jpg"));
const edited = await imageClient.editImage(photo, "背景を青空に変更");

// 画像説明
import { readImageFile } from "@nogataka/imgen/sdk";
const imgData = await readImageFile("screenshot.png");
const explanation = await chatClient.generateExplanation(imgData, "ja");
```

### LLM ツールとしての組み込み例

```typescript
import { AzureImageClient, AzureChatClient, getAzureConfig, saveFileWithUniqueNameIfExists } from "@nogataka/imgen/sdk";

const generateImageTool = {
  name: "generate_image",
  description: "テキストから画像を生成する",
  execute: async ({ theme }: { theme: string }) => {
    const config = await getAzureConfig();
    const chat = new AzureChatClient(config);
    const image = new AzureImageClient(config);

    const prompt = await chat.generatePrompt(theme);
    const fileName = await chat.generateFileName(theme);
    const bytes = await image.generateImage(prompt, { size: "1024x1024", quality: "high" });
    const path = await saveFileWithUniqueNameIfExists(`${fileName}.png`, bytes);
    return { path };
  },
};
```

## 開発

```bash
git clone https://github.com/nogataka/imgen.git
cd imgen
npm install
cp .env.example .env  # Azure OpenAI の認証情報を記入

npm run dev -- image gen "テスト"   # 開発実行
npm test                            # テスト
npm run check                       # 型チェック
npm run lint                        # ESLint
npm run check-all                   # 全チェック（型+lint+format+テスト）
npm run build                       # ビルド
```

## ライセンス

MIT
