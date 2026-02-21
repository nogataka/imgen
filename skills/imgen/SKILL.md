---
name: imgen
description: Azure OpenAI画像生成CLIツール (gpt-image-1.5 / gpt-5.1)。テキストから画像生成、画像のAI編集、画像の内容説明を行う。Use when the user wants to (1) generate images using Azure OpenAI, (2) edit existing images with AI, (3) explain image contents. Triggers on "画像を生成", "画像を編集", "画像の説明", "generate an image", "edit this image", "describe this image", "imgenで".
---

# imgen - Azure OpenAI Image Generation CLI

> **Note:** Run with `npx tsx /Volumes/Data/dev/imgen/src/index.ts` or `npm run dev --prefix /Volumes/Data/dev/imgen --` during development.

## Quick Reference

```bash
imgen image gen "<prompt>" -q <quality> -s <size>    # 画像生成
imgen image edit <file> "<instruction>"               # 画像編集
imgen image explain <file> -l <lang>                  # 画像説明
imgen log -n <lines> -l <level>                       # ログ表示
imgen configure                                       # 設定
```

## Image Generation

```bash
imgen image gen [options] <theme>
```

### Options

| Option | Values | Default |
|--------|--------|---------|
| `-s, --size` | 1024x1024, 1536x1024, 1024x1536 | 1024x1024 |
| `-q, --quality` | low, medium, high | high |
| `-f, --format` | png, jpg, webp | png |
| `-p, --preset` | preset name | - |
| `-c, --context` | context file path (.md/.txt) | - |
| `-o, --output` | output path (file or directory) | auto |
| `-d, --debug` | enable debug logging | false |
| `--json` | JSON output format | false |
| `--dry-run` | preview settings without API call | false |

### Recommended Settings

| Use Case | Quality | Size |
|----------|---------|------|
| Product photo, landscape | high | 1536x1024 |
| Illustration, icon, mascot | high | 1024x1024 |
| Quick draft, prototype | low | 1024x1024 |
| Portrait, vertical | high | 1024x1536 |

### Examples

```bash
imgen image gen "夕日の海辺の風景" -q high -s 1536x1024
imgen image gen "可愛い猫のマスコット" -p builtin:square
imgen image gen "ミニマルなロゴデザイン" -o logo.png
imgen image gen "complex scene" --dry-run
```

## Image Editing

```bash
imgen image edit [options] <file> <prompt>
```

Edit instructions in natural language:
- Background change: "背景を青空に変更"
- Style transfer: "水彩画風に変換"
- Object modification: "色を鮮やかに"

Supported input formats: .jpg, .jpeg, .png, .gif, .webp

### Options

| Option | Values | Default |
|--------|--------|---------|
| `-s, --size` | 1024x1024, 1536x1024, 1024x1536 | 1024x1024 |
| `-f, --format` | png, jpg, webp | png |
| `-o, --output` | output path | auto |
| `--json` | JSON output format | false |
| `--dry-run` | preview settings without API call | false |

### Examples

```bash
imgen image edit photo.jpg "背景を青空に変更"
imgen image edit portrait.png "アニメスタイルに変換"
imgen image edit photo.png "edit" --dry-run
```

## Image Explanation

```bash
imgen image explain [options] <file>
```

### Options

| Option | Values | Default |
|--------|--------|---------|
| `-l, --lang` | ja, en, zh, ko, es, fr, de, it, ru, vi | ja |
| `-f, --format` | markdown, json | markdown |
| `-c, --context` | context info (text or .md/.txt file path) | - |
| `-o, --output` | output file path | stdout |

### Examples

```bash
imgen image explain screenshot.png
imgen image explain photo.jpg -l en
imgen image explain chart.png -c "Q4 sales report" -f json
```

## Log Viewing

```bash
imgen log [options]
```

### Options

| Option | Values | Default |
|--------|--------|---------|
| `-n, --lines` | number of lines | 20 |
| `-l, --level` | debug, info, warn, error | info |

### Examples

```bash
imgen log
imgen log -n 50 -l debug
imgen log -l error
```

## Workflow Patterns

### Generate, then Edit

```bash
imgen image gen "商品写真のヘッドホン" -q high
imgen image edit headphones.png "白背景にソフトシャドウを追加"
```

### Generate and Explain

```bash
imgen image gen "抽象的なアート"
imgen image explain abstract-art.png -l ja
```

### Preset Workflow

```bash
imgen preset list                                          # プリセット一覧
imgen preset save mypreset -s 1536x1024 -q high -f png     # 保存
imgen image gen "テーマ" -p mypreset                         # 使用
imgen preset delete mypreset                                # 削除
```

## Builtin Presets

| Name | Size | Quality |
|------|------|---------|
| `builtin:square` | 1024x1024 | high |
| `builtin:landscape` | 1536x1024 | high |
| `builtin:portrait` | 1024x1536 | high |
| `builtin:draft` | 1024x1024 | low |
| `builtin:photo` | 1536x1024 | high |

## Configuration

```bash
imgen configure         # Interactive setup
imgen configure --show  # Show current config
imgen configure --reset # Reset all settings
```

### Priority Order

CLI options > Preset values (`-p`) > Config file (`~/.imgen/config.json`) > Default values

### Environment Variables

Environment variables take precedence over config file:

| Variable | Description | Default |
|----------|-------------|---------|
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI resource endpoint | - |
| `AZURE_OPENAI_API_KEY` | Azure OpenAI API key | - |
| `AZURE_OPENAI_DEPLOYMENT_NAME` | Chat model deployment | gpt-5.1 |
| `AZURE_OPENAI_DEPLOYMENT_NAME_IMAGE` | Image model deployment | gpt-image-1.5 |
| `AZURE_OPENAI_API_VERSION` | Chat API version | 2024-02-15-preview |
| `AZURE_OPENAI_IMAGE_API_VERSION` | Image API version | 2025-04-01-preview |

### File Locations

- Config: `~/.imgen/config.json`
- Presets: `~/.imgen/presets.json`
- Logs: `~/.imgen/logs/`
