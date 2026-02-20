# Imgen 設計ドキュメント

> 作成日: 2026-02-20
> ステータス: 承認済み

## 概要

Imgen は ergon (Google AI API ベースのメディア生成 CLI) の Azure OpenAI 版クローンである。
Phase 1 として gpt-image-1.5 と gpt-5.1 を使用した画像系3コマンド（生成・編集・説明）を実装する。

### 設計方針

- **ergon フォーク型**: ergon と同じプロジェクト構造・パターンを踏襲し、API 層のみ差し替え
- **スコープ**: Phase 1（画像系のみ: gen/edit/explain）
- **Azure 接続**: interior-agent と同じエンドポイント・デプロイを使用
- **言語**: 日本語のみ（i18n 層は省略）
- **スキル対応**: Claude Code 等の AI エージェントから利用可能な SKILL.md を含む

### 参考資料

- [ergon 機能の OpenAI API 模倣可能性調査](/Volumes/Data/dev/ergon/docs/openai-migration-feasibility.md)
- [Azure Sora 記事](https://zenn.dev/chips0711/articles/2d39ceb72038e3)
- [GPT-image-1 記事](https://zenn.dev/chips0711/articles/28eee04b8f2cfd)
- [AzureOpenAI.fm 記事](https://zenn.dev/microsoft/articles/927e8b8628c665)

---

## 1. プロジェクト構造

```
/Volumes/Data/dev/imgen/
├── src/
│   ├── index.ts                    # エントリポイント (#!/usr/bin/env node)
│   ├── commands/
│   │   ├── index.ts                # createMainCommand() - コマンド登録
│   │   ├── image/
│   │   │   ├── index.ts            # imageCommand() 親コマンド
│   │   │   ├── gen.ts              # image gen <theme>
│   │   │   ├── edit.ts             # image edit <file> <prompt>
│   │   │   └── explain.ts          # image explain <file>
│   │   ├── configure.ts            # API設定
│   │   ├── preset.ts               # プリセット管理
│   │   └── log.ts                  # ログ表示
│   └── utils/
│       ├── azure-image.ts          # gpt-image-1.5 API クライアント (生成+編集)
│       ├── azure-chat.ts           # gpt-5.1 クライアント (プロンプト拡張/説明/ファイル名)
│       ├── config.ts               # ~/.imgen/config.json 管理
│       ├── preset.ts               # プリセット管理
│       ├── file.ts                 # ファイル操作ユーティリティ
│       ├── image.ts                # 画像処理ヘルパー
│       ├── logger.ts               # ログシステム
│       └── output.ts               # JSON出力フォーマッタ
├── skills/
│   └── imgen/
│       └── SKILL.md                # AI エージェント用スキル定義
├── .agents/
│   └── skills/
│       └── imgen -> ../../skills/imgen
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── .env.example
└── CLAUDE.md
```

---

## 2. コマンド体系

```
imgen [command] [subcommand] [options]

コマンド:
  image gen <theme>           テキストから画像生成
    -s, --size <size>         サイズ (1024x1024, 1536x1024, 1024x1536)
    -q, --quality <quality>   品質 (low, medium, high)
    -t, --style <style>       スタイル (vivid, natural)
    -f, --format <format>     形式 (png, jpg, webp)
    -o, --output <path>       出力先
    -p, --preset <name>       プリセット適用
    --json                    JSON出力
    --dry-run                 実行せず設定表示

  image edit <file> <prompt>  画像をAI編集
    -o, --output <path>       出力先
    -f, --format <format>     形式
    -s, --size <size>         出力サイズ
    --json                    JSON出力
    --dry-run                 実行せず設定表示

  image explain <file>        画像の説明生成
    -l, --lang <lang>         出力言語 (ja,en,zh,ko,es,fr,de,it,pt,ru)
    -f, --format <format>     出力形式 (markdown, json)
    -c, --context <context>   コンテキスト情報
    -o, --output <path>       出力先

  configure                   API設定 (対話式)
  preset list|create|delete|show  プリセット管理
  log                         ログ表示
```

### ergon との対応関係

| ergon | imgen | 変更点 |
|---|---|---|
| `ergon image gen` | `imgen image gen` | エンジン選択 → サイズ/品質/スタイル指定に変更 |
| `ergon image edit` | `imgen image edit` | nano-banana → Azure Images Edit API |
| `ergon image explain` | `imgen image explain` | Gemini → gpt-5.1 Chat Completions |
| `-e, --engine` | `-q, --quality` + `-t, --style` | OpenAI のパラメータ体系に合わせる |
| `-a, --aspect-ratio` | `-s, --size` | OpenAI はサイズ指定（アスペクト比ではなく） |

---

## 3. API クライアント層

### azure-image.ts — 画像生成・編集

```
AzureImageClient
├── constructor(config: AzureConfig)
├── generateImage(options)    → Uint8Array   # POST /images/generations (SDK経由)
└── editImage(options)        → Uint8Array   # POST /images/edits (REST直接)
```

**画像生成**: openai SDK の `AzureOpenAI` クラスを使用。

```typescript
const client = new AzureOpenAI({ endpoint, apiKey, apiVersion, deployment });
const response = await client.images.generate({
  model: deploymentName,
  prompt,
  n: 1,
  size: "1024x1024",
  quality: "high",
  style: "vivid",
  response_format: "b64_json",
});
```

**画像編集**: Azure SDK の img2img 対応が不安定なため REST API 直接呼び出し。

```typescript
const url = `${endpoint}/openai/deployments/${imageDeployment}/images/edits?api-version=${imageApiVersion}`;
const formData = new FormData();
formData.append("image", imageBlob);
formData.append("prompt", editPrompt);
formData.append("size", size);
const response = await fetch(url, {
  method: "POST",
  headers: { "api-key": apiKey },
  body: formData,
});
```

### azure-chat.ts — テキスト処理

```
AzureChatClient
├── constructor(config: AzureConfig)
├── generatePrompt(theme, style?)   → string      # プロンプト拡張
├── generateFileName(theme)         → string      # ファイル名生成
└── generateExplanation(image, lang, context?) → string  # 画像説明
```

全て `AzureOpenAI` SDK の Chat Completions API。画像説明のみマルチモーダル入力。

### AzureConfig 型

```typescript
interface AzureConfig {
  endpoint: string;           // AZURE_OPENAI_ENDPOINT
  apiKey: string;             // AZURE_OPENAI_API_KEY
  deploymentName: string;     // AZURE_OPENAI_DEPLOYMENT_NAME (gpt-5.1)
  imageDeploymentName: string;// AZURE_OPENAI_DEPLOYMENT_NAME_IMAGE (gpt-image-1.5)
  apiVersion: string;         // AZURE_OPENAI_API_VERSION
  imageApiVersion: string;    // AZURE_OPENAI_IMAGE_API_VERSION
}
```

解決順序: 環境変数 → `~/.imgen/config.json` → エラー

---

## 4. 設定・ログ・プリセット

### 設定ファイル (~/.imgen/config.json)

```typescript
interface Config {
  azureEndpoint?: string;
  azureApiKey?: string;
  azureDeploymentName?: string;
  azureImageDeploymentName?: string;
  azureApiVersion?: string;
  azureImageApiVersion?: string;
  defaultOutputDir?: string;
  defaultImageSize?: "1024x1024" | "1536x1024" | "1024x1536";
  defaultImageQuality?: "low" | "medium" | "high";
  defaultImageStyle?: "vivid" | "natural";
  defaultImageFormat?: "png" | "jpg" | "webp";
  logLevel?: "debug" | "info" | "warn" | "error";
}
```

### プリセット

```typescript
const BUILTIN_PRESETS = {
  "builtin:square":    { size: "1024x1024", quality: "high", style: "vivid" },
  "builtin:landscape": { size: "1536x1024", quality: "high", style: "vivid" },
  "builtin:portrait":  { size: "1024x1536", quality: "high", style: "vivid" },
  "builtin:draft":     { size: "1024x1024", quality: "low",  style: "natural" },
  "builtin:photo":     { size: "1536x1024", quality: "high", style: "natural" },
};
```

### ログ

- シングルトン Logger（ergon と同じパターン）
- デュアル出力: ファイル (JSON) + コンソール (カラー)
- 保存先: `~/.imgen/logs/`

### 出力フォーマット

```typescript
// 成功
{ success: true, command: "image gen", result: { path, format, size, quality, style } }

// エラー
{ success: false, command: "image gen", error: { message, code? } }
```

---

## 5. テスト

vitest + コロケーション:

```
src/utils/config.test.ts      # 設定の読み書き、環境変数解決
src/utils/preset.test.ts      # プリセットCRUD、ビルトイン
src/utils/output.test.ts      # JSON出力フォーマット
src/utils/file.test.ts        # ファイル操作ユーティリティ
src/utils/azure-image.test.ts # APIクライアント（モック）
src/utils/azure-chat.test.ts  # Chatクライアント（モック）
```

---

## 6. パッケージ構成

### 依存パッケージ

| パッケージ | 用途 | ergon での対応 |
|---|---|---|
| `openai` | AzureOpenAI SDK (画像生成 + Chat) | `@google/genai` |
| `commander` | CLI フレームワーク | 同じ |
| `chalk` | ターミナルカラー | 同じ |
| `inquirer` | 対話式プロンプト | 同じ |
| `fs-extra` | ファイル操作 | 同じ |
| `zod` | バリデーション | 同じ |
| `cli-table3` | テーブル表示 | 同じ |

### package.json

```json
{
  "name": "imgen",
  "version": "0.1.0",
  "type": "module",
  "bin": { "imgen": "dist/index.js" },
  "engines": { "node": ">=18.0.0" },
  "scripts": {
    "dev": "tsx src/index.ts",
    "build": "tsup src/index.ts --format esm --dts",
    "test": "vitest run",
    "check": "tsc --noEmit",
    "lint": "eslint src/",
    "format": "prettier --write src/",
    "check-all": "npm run check && npm run lint && npm test"
  }
}
```

---

## 7. スキル定義

`skills/imgen/SKILL.md` に AI エージェント向けのスキル定義を配置。
`.agents/skills/imgen` からシンボリックリンク。

---

## 8. 将来の拡張 (Phase 2/3)

- **Phase 2**: Sora 2 による動画生成 (`imgen video gen`)
- **Phase 3**: gpt-4o-mini-tts によるナレーション (`imgen narration gen`)

これらは本設計のコマンド階層・API クライアントパターンに沿って追加可能。
