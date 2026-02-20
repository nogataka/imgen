---
name: imgen
description: Azure OpenAI画像生成CLIツール (gpt-image-1.5 / gpt-5.1)。テキストから画像生成、画像のAI編集、画像の内容説明を行う。Use when the user wants to (1) generate images using Azure OpenAI, (2) edit existing images with AI, (3) explain image contents. Triggers on "画像を生成", "画像を編集", "画像の説明", "generate an image", "edit this image", "describe this image", "imgenで".
license: MIT
metadata:
  author: hirokidaichi
  version: 0.1.0
---

# imgen - Azure OpenAI Image Generation CLI

> **Note:** Run with `npx tsx /Volumes/Data/dev/imgen/src/index.ts` or `npm run dev --prefix /Volumes/Data/dev/imgen --` during development.

## Quick Reference

```bash
imgen image gen "<prompt>" -q <quality> -t <style>    # 画像生成
imgen image edit <file> "<instruction>"               # 画像編集
imgen image explain <file> -l <lang>                  # 画像説明
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
| `-t, --style` | vivid, natural | vivid |
| `-f, --format` | png, jpg, webp | png |
| `-p, --preset` | preset name | - |
| `-c, --context` | context file path | - |
| `-o, --output` | output path | auto |

### Style Selection Guide

| Use Case | Quality | Style | Size |
|----------|---------|-------|------|
| Product photo, landscape | high | natural | 1536x1024 |
| Illustration, mascot | high | vivid | 1024x1024 |
| Quick draft, prototype | low | natural | 1024x1024 |
| Portrait, vertical | high | vivid | 1024x1536 |

### Examples

```bash
imgen image gen "夕日の海辺の風景" -q high -t vivid -s 1536x1024
imgen image gen "可愛い猫のマスコット" -p builtin:square
imgen image gen "ミニマルなロゴデザイン" -t natural -o logo.png
```

## Image Editing

```bash
imgen image edit [options] <file> <prompt>
```

Edit instructions in natural language:
- Background change: "背景を青空に変更"
- Style transfer: "水彩画風に変換"
- Object modification: "色を鮮やかに"

### Options

| Option | Values | Default |
|--------|--------|---------|
| `-s, --size` | 1024x1024, 1536x1024, 1024x1536 | 1024x1024 |
| `-f, --format` | png, jpg, webp | png |
| `-o, --output` | output path | auto |

### Examples

```bash
imgen image edit photo.jpg "背景を青空に変更"
imgen image edit portrait.png "アニメスタイルに変換"
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
| `-c, --context` | context info (text or file path) | - |
| `-o, --output` | output file path | stdout |

### Examples

```bash
imgen image explain screenshot.png
imgen image explain photo.jpg -l en
imgen image explain chart.png -c "Q4 sales report" -f json
```

## Workflow Patterns

### Generate, then Edit

```bash
imgen image gen "商品写真のヘッドホン" -q high -t natural
imgen image edit headphones.png "白背景にソフトシャドウを追加"
```

### Generate and Explain

```bash
imgen image gen "抽象的なアート" -t vivid
imgen image explain abstract-art.png -l ja
```

### Preset Workflow

```bash
imgen preset list                                      # プリセット一覧
imgen preset save mypreset -s 1536x1024 -q high -t natural  # 保存
imgen image gen "テーマ" -p mypreset                     # 使用
```

### Preview Before Generation

```bash
imgen image gen "complex scene" --dry-run    # 設定確認
imgen image edit photo.png "edit" --dry-run  # API呼び出し前に確認
```

## Builtin Presets

| Name | Size | Quality | Style |
|------|------|---------|-------|
| `builtin:square` | 1024x1024 | high | vivid |
| `builtin:landscape` | 1536x1024 | high | vivid |
| `builtin:portrait` | 1024x1536 | high | vivid |
| `builtin:draft` | 1024x1024 | low | natural |
| `builtin:photo` | 1536x1024 | high | natural |

## Common Options

All commands support:
- `--json` - JSON output for scripting
- `--dry-run` - Preview settings without API call
- `-o, --output <path>` - Specify output path

## Configuration

```bash
imgen configure         # Interactive setup
imgen configure --show  # Show current config
```

Environment variables (higher priority than config file):
- `AZURE_OPENAI_API_KEY`
- `AZURE_OPENAI_ENDPOINT`
- `AZURE_OPENAI_DEPLOYMENT_NAME` (chat model, e.g., gpt-5.1)
- `AZURE_OPENAI_DEPLOYMENT_NAME_IMAGE` (image model, e.g., gpt-image-1.5)
- `AZURE_OPENAI_API_VERSION`
- `AZURE_OPENAI_IMAGE_API_VERSION`
