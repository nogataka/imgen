# Imgen Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an Azure OpenAI CLI tool (imgen) that replicates ergon's image gen/edit/explain commands using gpt-image-1.5 and gpt-5.1.

**Architecture:** Commander.js CLI with two API client classes (AzureImageClient for gpt-image-1.5, AzureChatClient for gpt-5.1), config/preset/logging infrastructure mirroring ergon, and an AI agent skill definition. SDK for image generation + Chat Completions; REST API fallback for image editing.

**Tech Stack:** TypeScript, Commander.js, openai (AzureOpenAI), vitest, tsup, chalk, inquirer, fs-extra, zod, cli-table3

---

### Task 1: Project Scaffolding

**Files:**
- Create: `/Volumes/Data/dev/imgen/package.json`
- Create: `/Volumes/Data/dev/imgen/tsconfig.json`
- Create: `/Volumes/Data/dev/imgen/vitest.config.ts`
- Create: `/Volumes/Data/dev/imgen/eslint.config.js`
- Create: `/Volumes/Data/dev/imgen/.prettierrc`
- Create: `/Volumes/Data/dev/imgen/.gitignore`
- Create: `/Volumes/Data/dev/imgen/.env.example`
- Create: `/Volumes/Data/dev/imgen/CLAUDE.md`

**Step 1: Create package.json**

```json
{
  "name": "imgen",
  "version": "0.1.0",
  "description": "Azure OpenAI画像生成・編集・説明CLIツール - gpt-image-1.5 / gpt-5.1",
  "type": "module",
  "bin": {
    "imgen": "dist/index.js"
  },
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "files": [
    "dist"
  ],
  "scripts": {
    "dev": "tsx src/index.ts",
    "build": "tsup src/index.ts --format esm --dts --clean",
    "test": "vitest run",
    "test:watch": "vitest",
    "check": "tsc --noEmit",
    "lint": "eslint src/",
    "lint:fix": "eslint src/ --fix",
    "format": "prettier --write src/",
    "format:check": "prettier --check src/",
    "check-all": "npm run check && npm run lint && npm run format:check && npm run test"
  },
  "keywords": [
    "image",
    "ai",
    "azure",
    "openai",
    "cli"
  ],
  "license": "MIT",
  "engines": {
    "node": ">=18.0.0"
  },
  "dependencies": {
    "chalk": "^5.3.0",
    "cli-table3": "^0.6.5",
    "commander": "^12.1.0",
    "date-fns": "^3.6.0",
    "fs-extra": "^11.2.0",
    "inquirer": "^9.3.7",
    "openai": "^4.80.0",
    "zod": "^3.24.2"
  },
  "devDependencies": {
    "@types/fs-extra": "^11.0.4",
    "@types/inquirer": "^9.0.7",
    "@types/node": "^20.17.0",
    "eslint": "^9.15.0",
    "prettier": "^3.4.0",
    "tsup": "^8.3.5",
    "tsx": "^4.19.2",
    "typescript": "^5.7.0",
    "typescript-eslint": "^8.15.0",
    "vitest": "^2.1.5"
  }
}
```

**Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "allowImportingTsExtensions": true,
    "noEmit": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

**Step 3: Create vitest.config.ts**

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/index.ts"],
    },
    testTimeout: 30000,
  },
});
```

**Step 4: Create eslint.config.js**

```javascript
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["dist/**", "node_modules/**", "*.js"],
  },
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "no-console": "off",
    },
  }
);
```

**Step 5: Create .prettierrc**

```json
{
  "semi": true,
  "singleQuote": false,
  "trailingComma": "es5",
  "tabWidth": 2,
  "useTabs": false,
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

**Step 6: Create .gitignore**

```
node_modules/
dist/
.env
*.log
.DS_Store
coverage/
```

**Step 7: Create .env.example**

```
# Azure OpenAI
AZURE_OPENAI_API_KEY="your-api-key"
AZURE_OPENAI_ENDPOINT="https://your-resource.openai.azure.com"
AZURE_OPENAI_DEPLOYMENT_NAME="gpt-5.1"
AZURE_OPENAI_DEPLOYMENT_NAME_IMAGE="gpt-image-1.5"
AZURE_OPENAI_API_VERSION="2024-02-15-preview"
AZURE_OPENAI_IMAGE_API_VERSION="2025-04-01-preview"
```

**Step 8: Create CLAUDE.md**

```markdown
# CLAUDE.md - Guide for Development with imgen

## Build & Test Commands
- `npm run dev -- <command>` - Run development server
- `npm test` - Run all tests
- `npm test -- src/utils/file.test.ts` - Run specific test
- `npm run check` - Type check all code
- `npm run build` - Build for production

## Code Style Guidelines
- **Types**: Use strong typing with explicit annotations for parameters and returns
- **Naming**: camelCase for functions/variables, PascalCase for classes/types, ALL_CAPS for constants
- **Functions**: Small, focused with descriptive names indicating action
- **Error Handling**: Try/catch with proper type narrowing, descriptive messages
- **Testing**: Use vitest with describe/it/expect
- **Documentation**: JSDoc comments for public APIs
- **Formatting**: 100 char line width, 2 space indent, double quotes

## Project Structure
- `/src/commands/` - CLI commands
- `/src/utils/` - Shared utilities
- `.test.ts` files alongside implementation
```

**Step 9: Install dependencies**

Run: `cd /Volumes/Data/dev/imgen && npm install`
Expected: Dependencies installed successfully

**Step 10: Verify TypeScript compiles**

Run: `cd /Volumes/Data/dev/imgen && mkdir -p src && echo 'console.log("hello");' > src/index.ts && npx tsc --noEmit`
Expected: No errors (remove placeholder after)

**Step 11: Commit**

```bash
cd /Volumes/Data/dev/imgen
git add package.json tsconfig.json vitest.config.ts eslint.config.js .prettierrc .gitignore .env.example CLAUDE.md
git commit -m "chore: project scaffolding with TypeScript, vitest, eslint, prettier"
```

---

### Task 2: Output Utilities

**Files:**
- Create: `src/utils/output.ts`
- Create: `src/utils/output.test.ts`

**Step 1: Write the failing test**

Create `src/utils/output.test.ts`:

```typescript
import { describe, expect, it, vi } from "vitest";
import {
  createErrorOutput,
  createSuccessOutput,
  printJson,
  type JsonErrorOutput,
  type JsonSuccessOutput,
} from "./output.js";

describe("output", () => {
  describe("createSuccessOutput", () => {
    it("should create success output with result", () => {
      const output = createSuccessOutput("test", { data: "value" });
      expect(output).toEqual({
        success: true,
        command: "test",
        result: { data: "value" },
      });
    });

    it("should create success output with complex result", () => {
      const result = {
        path: "/path/to/file.png",
        format: "png",
        size: "1024x1024",
      };
      const output = createSuccessOutput("image gen", result);
      expect(output.success).toBe(true);
      expect(output.command).toBe("image gen");
      expect(output.result).toEqual(result);
    });
  });

  describe("createErrorOutput", () => {
    it("should create error output with message", () => {
      const output = createErrorOutput("test", "Something went wrong");
      expect(output).toEqual({
        success: false,
        command: "test",
        error: { message: "Something went wrong" },
      });
    });

    it("should create error output with message and code", () => {
      const output = createErrorOutput("test", "File not found", "FILE_NOT_FOUND");
      expect(output).toEqual({
        success: false,
        command: "test",
        error: { message: "File not found", code: "FILE_NOT_FOUND" },
      });
    });

    it("should not include code when undefined", () => {
      const output = createErrorOutput("test", "Error message", undefined);
      expect(output.error).not.toHaveProperty("code");
    });
  });

  describe("printJson", () => {
    it("should print JSON to console", () => {
      const spy = vi.spyOn(console, "log").mockImplementation(() => {});
      const output: JsonSuccessOutput<{ data: string }> = {
        success: true,
        command: "test",
        result: { data: "value" },
      };
      printJson(output);
      expect(spy).toHaveBeenCalledWith(JSON.stringify(output, null, 2));
      spy.mockRestore();
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd /Volumes/Data/dev/imgen && npx vitest run src/utils/output.test.ts`
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

Create `src/utils/output.ts`:

```typescript
export interface JsonSuccessOutput<T> {
  success: true;
  command: string;
  result: T;
}

export interface JsonErrorOutput {
  success: false;
  command: string;
  error: {
    message: string;
    code?: string;
  };
}

export type JsonOutput<T> = JsonSuccessOutput<T> | JsonErrorOutput;

export function createSuccessOutput<T>(command: string, result: T): JsonSuccessOutput<T> {
  return { success: true, command, result };
}

export function createErrorOutput(
  command: string,
  message: string,
  code?: string
): JsonErrorOutput {
  return {
    success: false,
    command,
    error: { message, ...(code ? { code } : {}) },
  };
}

export function printJson<T>(output: JsonOutput<T>): void {
  console.log(JSON.stringify(output, null, 2));
}
```

**Step 4: Run test to verify it passes**

Run: `cd /Volumes/Data/dev/imgen && npx vitest run src/utils/output.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
cd /Volumes/Data/dev/imgen
git add src/utils/output.ts src/utils/output.test.ts
git commit -m "feat: add JSON output utilities with tests"
```

---

### Task 3: File Utilities

**Files:**
- Create: `src/utils/file.ts`
- Create: `src/utils/file.test.ts`

**Step 1: Write the failing test**

Create `src/utils/file.test.ts`: (same as ergon's file.test.ts, identical logic)

```typescript
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  fileExists,
  generateUniqueFilePath,
  loadContextFile,
  saveFileWithUniqueNameIfExists,
} from "./file.js";

describe("file utilities", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "imgen-test-file-"));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe("generateUniqueFilePath", () => {
    it("should return original path when file does not exist", async () => {
      const testPath = path.join(tempDir, "test.txt");
      const result = await generateUniqueFilePath(testPath);
      expect(result).toBe(testPath);
    });

    it("should add random number when file exists", async () => {
      const testPath = path.join(tempDir, "test.txt");
      await fs.writeFile(testPath, "data");
      const result = await generateUniqueFilePath(testPath);
      expect(result).not.toBe(testPath);
      expect(result).toMatch(/test-\d{4}\.txt$/);
    });
  });

  describe("saveFileWithUniqueNameIfExists", () => {
    it("should save to original path when file does not exist", async () => {
      const testPath = path.join(tempDir, "save.txt");
      const data = new TextEncoder().encode("data");
      const saved = await saveFileWithUniqueNameIfExists(testPath, data);
      expect(saved).toBe(testPath);
      const content = await fs.readFile(testPath);
      expect(content).toEqual(Buffer.from(data));
    });

    it("should save with unique name when file exists", async () => {
      const testPath = path.join(tempDir, "save.txt");
      await fs.writeFile(testPath, "existing");
      const data = new TextEncoder().encode("new");
      const saved = await saveFileWithUniqueNameIfExists(testPath, data);
      expect(saved).not.toBe(testPath);
    });
  });

  describe("loadContextFile", () => {
    it("should return empty string for undefined", async () => {
      expect(await loadContextFile(undefined)).toBe("");
    });

    it("should return file content", async () => {
      const p = path.join(tempDir, "ctx.txt");
      await fs.writeFile(p, "context");
      expect(await loadContextFile(p)).toBe("context");
    });

    it("should throw for missing file", async () => {
      await expect(loadContextFile(path.join(tempDir, "nope.txt"))).rejects.toThrow(
        "コンテキストファイルが見つかりません"
      );
    });
  });

  describe("fileExists", () => {
    it("should return true for existing file", async () => {
      const p = path.join(tempDir, "exists.txt");
      await fs.writeFile(p, "x");
      expect(await fileExists(p)).toBe(true);
    });

    it("should return false for missing file", async () => {
      expect(await fileExists(path.join(tempDir, "nope.txt"))).toBe(false);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd /Volumes/Data/dev/imgen && npx vitest run src/utils/file.test.ts`
Expected: FAIL

**Step 3: Write implementation**

Create `src/utils/file.ts`: (same as ergon — this is pure utility code with no API dependencies)

```typescript
import * as fs from "node:fs/promises";

export async function generateUniqueFilePath(
  outputPath: string,
  maxRetries = 3
): Promise<string> {
  let finalPath = outputPath;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      await fs.stat(finalPath);
      const baseName = finalPath.slice(0, finalPath.lastIndexOf("."));
      const ext = finalPath.slice(finalPath.lastIndexOf("."));
      const rand = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
      finalPath = `${baseName}-${rand}${ext}`;
      retryCount++;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return finalPath;
      }
      throw error;
    }
  }

  throw new Error(
    `ファイル名の生成に失敗しました。${maxRetries}回試行しましたが、すべて既存のファイル名と衝突しています。`
  );
}

export async function saveFileWithUniqueNameIfExists(
  outputPath: string,
  data: Uint8Array,
  maxRetries = 3
): Promise<string> {
  const finalPath = await generateUniqueFilePath(outputPath, maxRetries);
  await fs.writeFile(finalPath, data);
  return finalPath;
}

export async function loadContextFile(contextPath?: string): Promise<string> {
  if (!contextPath) return "";
  try {
    return await fs.readFile(contextPath, "utf-8");
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(`コンテキストファイルが見つかりません: ${contextPath}`);
    }
    if (error instanceof Error) {
      throw new Error(`コンテキストファイルの読み込みに失敗しました: ${error.message}`);
    }
    throw new Error(`コンテキストファイルの読み込みに失敗しました: ${String(error)}`);
  }
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd /Volumes/Data/dev/imgen && npx vitest run src/utils/file.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
cd /Volumes/Data/dev/imgen
git add src/utils/file.ts src/utils/file.test.ts
git commit -m "feat: add file utilities with tests"
```

---

### Task 4: Image Utilities

**Files:**
- Create: `src/utils/image.ts`
- Create: `src/utils/image.test.ts`

**Step 1: Write the failing test**

Create `src/utils/image.test.ts`:

```typescript
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getMimeType, readImageFile } from "./image.js";

describe("getMimeType", () => {
  it("should return correct MIME type for each format", () => {
    expect(getMimeType("test.jpg")).toBe("image/jpeg");
    expect(getMimeType("test.jpeg")).toBe("image/jpeg");
    expect(getMimeType("test.png")).toBe("image/png");
    expect(getMimeType("test.gif")).toBe("image/gif");
    expect(getMimeType("test.webp")).toBe("image/webp");
  });

  it("should throw for unsupported format", () => {
    expect(() => getMimeType("test.txt")).toThrow("サポートされていないファイル形式です");
  });
});

describe("readImageFile", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "imgen-test-image-"));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("should read image and return base64", async () => {
    const p = path.join(tempDir, "test.jpg");
    await fs.writeFile(p, Buffer.from([1, 2, 3, 4]));
    const result = await readImageFile(p);
    expect(result.data).toBe("AQIDBA==");
    expect(result.mimeType).toBe("image/jpeg");
  });

  it("should throw for missing file", async () => {
    await expect(readImageFile(path.join(tempDir, "nope.jpg"))).rejects.toThrow(
      "画像ファイルの読み込みに失敗しました"
    );
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd /Volumes/Data/dev/imgen && npx vitest run src/utils/image.test.ts`
Expected: FAIL

**Step 3: Write implementation**

Create `src/utils/image.ts`:

```typescript
import * as fs from "node:fs/promises";

export interface ImageData {
  data: string;
  mimeType: string;
}

export async function readImageFile(filePath: string): Promise<ImageData> {
  try {
    const buffer = await fs.readFile(filePath);
    return {
      data: buffer.toString("base64"),
      mimeType: getMimeType(filePath),
    };
  } catch (error: unknown) {
    if (error instanceof Error && error.message.startsWith("サポートされていない")) {
      throw error;
    }
    throw new Error(
      `画像ファイルの読み込みに失敗しました: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export function getMimeType(filePath: string): string {
  const ext = filePath.toLowerCase().split(".").pop();
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
  };
  if (ext && map[ext]) return map[ext];
  throw new Error(`サポートされていないファイル形式です: .${ext}`);
}
```

**Step 4: Run test to verify it passes**

Run: `cd /Volumes/Data/dev/imgen && npx vitest run src/utils/image.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
cd /Volumes/Data/dev/imgen
git add src/utils/image.ts src/utils/image.test.ts
git commit -m "feat: add image read utilities with tests"
```

---

### Task 5: Logger

**Files:**
- Create: `src/utils/logger.ts`

No test for logger (ergon also doesn't test it — filesystem + console side effects).

**Step 1: Write implementation**

Create `src/utils/logger.ts`: (adapted from ergon — change `.ergon` to `.imgen`)

```typescript
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { format } from "date-fns";

export enum LogLevel {
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
}

export enum LogDestination {
  FILE = "FILE",
  CONSOLE = "CONSOLE",
  BOTH = "BOTH",
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: unknown;
}

export interface LoggerConfig {
  destination: LogDestination;
  minLevel: LogLevel;
}

export interface LoggerOptions {
  name: string;
  config?: Partial<LoggerConfig>;
}

export class Logger {
  private static instances: Map<string, Logger> = new Map();
  private static globalConfig: LoggerConfig = {
    destination: LogDestination.CONSOLE,
    minLevel: LogLevel.INFO,
  };
  private static currentContext = "default";

  private logDir: string;
  private currentLogFile: string;

  private constructor(private name: string) {
    const home = os.homedir();
    this.logDir = path.join(home, ".imgen", "logs");
    this.currentLogFile = this.generateLogFileName();
  }

  public static setGlobalConfig(config: Partial<LoggerConfig>): void {
    Logger.globalConfig = { ...Logger.globalConfig, ...config };
  }

  public static setContext(name: string): void {
    Logger.currentContext = name;
  }

  public static getInstance(options: LoggerOptions): Logger {
    const { name } = options;
    if (!Logger.instances.has(name)) {
      Logger.instances.set(name, new Logger(name));
    }
    return Logger.instances.get(name)!;
  }

  private generateLogFileName(): string {
    return path.join(this.logDir, `${this.name}-${format(new Date(), "yyyy-MM-dd")}.log`);
  }

  private async ensureLogDirectory(): Promise<void> {
    await fs.mkdir(this.logDir, { recursive: true });
  }

  private formatLogEntry(level: LogLevel, message: string, data?: unknown): LogEntry {
    return { timestamp: new Date().toISOString(), level, message, data };
  }

  private shouldLog(level: LogLevel): boolean {
    const priority: Record<LogLevel, number> = {
      [LogLevel.DEBUG]: 0,
      [LogLevel.INFO]: 1,
      [LogLevel.WARN]: 2,
      [LogLevel.ERROR]: 3,
    };
    return priority[level] >= priority[Logger.globalConfig.minLevel];
  }

  private async writeLog(entry: LogEntry): Promise<void> {
    if (!this.shouldLog(entry.level)) return;

    const { destination } = Logger.globalConfig;
    if (destination === LogDestination.CONSOLE || destination === LogDestination.BOTH) {
      this.writeToConsole(entry);
    }
    if (destination === LogDestination.FILE || destination === LogDestination.BOTH) {
      await this.writeToFile(entry);
    }
  }

  private writeToConsole(entry: LogEntry): void {
    const ts = entry.timestamp.replace("T", " ").replace(/\.\d+Z$/, "");
    const dataStr = entry.data ? ` ${JSON.stringify(entry.data)}` : "";
    const msg = `[${ts}] [${this.name}] [${entry.level}] ${entry.message}${dataStr}`;
    switch (entry.level) {
      case LogLevel.DEBUG: console.debug(msg); break;
      case LogLevel.INFO: console.info(msg); break;
      case LogLevel.WARN: console.warn(msg); break;
      case LogLevel.ERROR: console.error(msg); break;
    }
  }

  private async writeToFile(entry: LogEntry): Promise<void> {
    await this.ensureLogDirectory();
    try {
      await fs.appendFile(this.currentLogFile, JSON.stringify(entry) + "\n");
    } catch (error: unknown) {
      console.error(`ログの書き込みに失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  debug(message: string, data?: unknown): Promise<void> {
    return this.writeLog(this.formatLogEntry(LogLevel.DEBUG, message, data));
  }
  info(message: string, data?: unknown): Promise<void> {
    return this.writeLog(this.formatLogEntry(LogLevel.INFO, message, data));
  }
  warn(message: string, data?: unknown): Promise<void> {
    return this.writeLog(this.formatLogEntry(LogLevel.WARN, message, data));
  }
  error(message: string, data?: unknown): Promise<void> {
    return this.writeLog(this.formatLogEntry(LogLevel.ERROR, message, data));
  }

  static debug(message: string, data?: unknown): Promise<void> {
    return Logger.getInstance({ name: Logger.currentContext }).debug(message, data);
  }
  static info(message: string, data?: unknown): Promise<void> {
    return Logger.getInstance({ name: Logger.currentContext }).info(message, data);
  }
  static warn(message: string, data?: unknown): Promise<void> {
    return Logger.getInstance({ name: Logger.currentContext }).warn(message, data);
  }
  static error(message: string, data?: unknown): Promise<void> {
    return Logger.getInstance({ name: Logger.currentContext }).error(message, data);
  }

  getLatestLogFilePath(): string {
    return this.currentLogFile;
  }

  async getLogEntries(minLevel: LogLevel = LogLevel.INFO, maxEntries = 100): Promise<LogEntry[]> {
    try {
      await this.ensureLogDirectory();
      const content = await fs.readFile(this.currentLogFile, "utf-8");
      const lines = content.trim().split("\n");
      const priority: Record<LogLevel, number> = {
        [LogLevel.DEBUG]: 0, [LogLevel.INFO]: 1, [LogLevel.WARN]: 2, [LogLevel.ERROR]: 3,
      };
      const entries: LogEntry[] = [];
      for (let i = lines.length - 1; i >= 0 && entries.length < maxEntries; i--) {
        try {
          const entry = JSON.parse(lines[i]) as LogEntry;
          if (priority[entry.level] >= priority[minLevel]) entries.unshift(entry);
        } catch { continue; }
      }
      return entries;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
  }
}
```

**Step 2: Verify type check**

Run: `cd /Volumes/Data/dev/imgen && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
cd /Volumes/Data/dev/imgen
git add src/utils/logger.ts
git commit -m "feat: add logger with file and console output"
```

---

### Task 6: Language Types

**Files:**
- Create: `src/lang.ts`
- Create: `src/lang.test.ts`

**Step 1: Write the failing test**

Create `src/lang.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { LANGUAGE_DESCRIPTIONS } from "./lang.js";

describe("LANGUAGE_DESCRIPTIONS", () => {
  it("should have all supported languages", () => {
    expect(LANGUAGE_DESCRIPTIONS).toEqual({
      ja: "日本語", en: "英語", zh: "中国語", ko: "韓国語",
      es: "スペイン語", fr: "フランス語", de: "ドイツ語",
      it: "イタリア語", ru: "ロシア語", vi: "ベトナム語",
    });
  });

  it("should have 10 languages", () => {
    expect(Object.keys(LANGUAGE_DESCRIPTIONS).length).toBe(10);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd /Volumes/Data/dev/imgen && npx vitest run src/lang.test.ts`
Expected: FAIL

**Step 3: Write implementation**

Create `src/lang.ts`:

```typescript
export type SupportedLanguage =
  | "ja" | "en" | "zh" | "ko"
  | "es" | "fr" | "de" | "it" | "ru" | "vi";

export const LANGUAGE_DESCRIPTIONS: Record<SupportedLanguage, string> = {
  ja: "日本語", en: "英語", zh: "中国語", ko: "韓国語",
  es: "スペイン語", fr: "フランス語", de: "ドイツ語",
  it: "イタリア語", ru: "ロシア語", vi: "ベトナム語",
} as const;
```

**Step 4: Run test to verify it passes**

Run: `cd /Volumes/Data/dev/imgen && npx vitest run src/lang.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
cd /Volumes/Data/dev/imgen
git add src/lang.ts src/lang.test.ts
git commit -m "feat: add language types and descriptions"
```

---

### Task 7: Config Management

**Files:**
- Create: `src/utils/config.ts`
- Create: `src/utils/config.test.ts`

**Step 1: Write the failing test**

Create `src/utils/config.test.ts`:

```typescript
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_CONFIG,
  getAzureConfig,
  getConfigDir,
  getConfigPath,
  getConfigValue,
  loadConfig,
  saveConfig,
} from "./config.js";

describe("config", () => {
  let tempDir: string;
  let origHome: string | undefined;
  let origKey: string | undefined;
  let origEndpoint: string | undefined;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "imgen-test-config-"));
    origHome = process.env.HOME;
    origKey = process.env.AZURE_OPENAI_API_KEY;
    origEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
    process.env.HOME = tempDir;
    delete process.env.AZURE_OPENAI_API_KEY;
    delete process.env.AZURE_OPENAI_ENDPOINT;
    delete process.env.AZURE_OPENAI_DEPLOYMENT_NAME;
    delete process.env.AZURE_OPENAI_DEPLOYMENT_NAME_IMAGE;
    delete process.env.AZURE_OPENAI_API_VERSION;
    delete process.env.AZURE_OPENAI_IMAGE_API_VERSION;
  });

  afterEach(async () => {
    process.env.HOME = origHome;
    if (origKey) process.env.AZURE_OPENAI_API_KEY = origKey;
    else delete process.env.AZURE_OPENAI_API_KEY;
    if (origEndpoint) process.env.AZURE_OPENAI_ENDPOINT = origEndpoint;
    else delete process.env.AZURE_OPENAI_ENDPOINT;
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe("getConfigDir", () => {
    it("should return ~/.imgen", () => {
      expect(getConfigDir()).toBe(path.join(tempDir, ".imgen"));
    });
  });

  describe("getConfigPath", () => {
    it("should return ~/.imgen/config.json", () => {
      expect(getConfigPath()).toBe(path.join(tempDir, ".imgen", "config.json"));
    });
  });

  describe("loadConfig / saveConfig", () => {
    it("should return null when no config file", async () => {
      expect(await loadConfig()).toBeNull();
    });

    it("should save and load config", async () => {
      await saveConfig({ azureEndpoint: "https://test.openai.azure.com" });
      const config = await loadConfig();
      expect(config?.azureEndpoint).toBe("https://test.openai.azure.com");
    });
  });

  describe("getConfigValue", () => {
    it("should return saved value", async () => {
      await saveConfig({ defaultImageSize: "1536x1024" });
      expect(await getConfigValue("defaultImageSize")).toBe("1536x1024");
    });

    it("should return default when not set", async () => {
      expect(await getConfigValue("defaultImageSize")).toBe(DEFAULT_CONFIG.defaultImageSize);
    });
  });

  describe("getAzureConfig", () => {
    it("should resolve from environment variables", async () => {
      process.env.AZURE_OPENAI_API_KEY = "test-key";
      process.env.AZURE_OPENAI_ENDPOINT = "https://test.openai.azure.com";
      process.env.AZURE_OPENAI_DEPLOYMENT_NAME = "gpt-5.1";
      process.env.AZURE_OPENAI_DEPLOYMENT_NAME_IMAGE = "gpt-image-1.5";
      process.env.AZURE_OPENAI_API_VERSION = "2024-02-15-preview";
      process.env.AZURE_OPENAI_IMAGE_API_VERSION = "2025-04-01-preview";

      const config = await getAzureConfig();
      expect(config.apiKey).toBe("test-key");
      expect(config.endpoint).toBe("https://test.openai.azure.com");
      expect(config.deploymentName).toBe("gpt-5.1");
      expect(config.imageDeploymentName).toBe("gpt-image-1.5");
    });

    it("should resolve from config file", async () => {
      await saveConfig({
        azureApiKey: "file-key",
        azureEndpoint: "https://file.openai.azure.com",
        azureDeploymentName: "gpt-5.1",
        azureImageDeploymentName: "gpt-image-1.5",
        azureApiVersion: "2024-02-15-preview",
        azureImageApiVersion: "2025-04-01-preview",
      });
      const config = await getAzureConfig();
      expect(config.apiKey).toBe("file-key");
      expect(config.endpoint).toBe("https://file.openai.azure.com");
    });

    it("should throw when no config available", async () => {
      await expect(getAzureConfig()).rejects.toThrow();
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd /Volumes/Data/dev/imgen && npx vitest run src/utils/config.test.ts`
Expected: FAIL

**Step 3: Write implementation**

Create `src/utils/config.ts`:

```typescript
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import type { SupportedLanguage } from "../lang.js";

export type ImageSizeConfig = "1024x1024" | "1536x1024" | "1024x1536";
export type ImageQualityConfig = "low" | "medium" | "high";
export type ImageStyleConfig = "vivid" | "natural";
export type ImageFormatConfig = "png" | "jpg" | "webp";
export type LogLevelConfig = "debug" | "info" | "warn" | "error";

export interface Config {
  azureEndpoint?: string;
  azureApiKey?: string;
  azureDeploymentName?: string;
  azureImageDeploymentName?: string;
  azureApiVersion?: string;
  azureImageApiVersion?: string;
  defaultOutputDir?: string;
  defaultLanguage?: SupportedLanguage;
  defaultImageSize?: ImageSizeConfig;
  defaultImageQuality?: ImageQualityConfig;
  defaultImageStyle?: ImageStyleConfig;
  defaultImageFormat?: ImageFormatConfig;
  logLevel?: LogLevelConfig;
}

export const DEFAULT_CONFIG = {
  defaultLanguage: "ja" as SupportedLanguage,
  defaultImageSize: "1024x1024" as ImageSizeConfig,
  defaultImageQuality: "high" as ImageQualityConfig,
  defaultImageStyle: "vivid" as ImageStyleConfig,
  defaultImageFormat: "png" as ImageFormatConfig,
  logLevel: "info" as LogLevelConfig,
};

export interface AzureConfig {
  endpoint: string;
  apiKey: string;
  deploymentName: string;
  imageDeploymentName: string;
  apiVersion: string;
  imageApiVersion: string;
}

export function getConfigDir(): string {
  return path.join(os.homedir(), ".imgen");
}

export function getConfigPath(): string {
  return path.join(getConfigDir(), "config.json");
}

export async function loadConfig(): Promise<Config | null> {
  try {
    const text = await fs.readFile(getConfigPath(), "utf-8");
    return JSON.parse(text) as Config;
  } catch {
    return null;
  }
}

export async function saveConfig(config: Config): Promise<void> {
  const configPath = getConfigPath();
  await fs.mkdir(path.dirname(configPath), { recursive: true });
  await fs.writeFile(configPath, JSON.stringify(config, null, 2));
}

export async function getConfigValue<K extends keyof Config>(
  key: K
): Promise<Config[K] | undefined> {
  const config = await loadConfig();
  if (config && config[key] !== undefined) return config[key];
  return (DEFAULT_CONFIG as Record<string, unknown>)[key] as Config[K] | undefined;
}

export async function getAzureConfig(): Promise<AzureConfig> {
  const config = await loadConfig();

  const endpoint =
    process.env.AZURE_OPENAI_ENDPOINT || config?.azureEndpoint;
  const apiKey =
    process.env.AZURE_OPENAI_API_KEY || config?.azureApiKey;
  const deploymentName =
    process.env.AZURE_OPENAI_DEPLOYMENT_NAME || config?.azureDeploymentName;
  const imageDeploymentName =
    process.env.AZURE_OPENAI_DEPLOYMENT_NAME_IMAGE || config?.azureImageDeploymentName;
  const apiVersion =
    process.env.AZURE_OPENAI_API_VERSION || config?.azureApiVersion || "2024-02-15-preview";
  const imageApiVersion =
    process.env.AZURE_OPENAI_IMAGE_API_VERSION || config?.azureImageApiVersion || "2025-04-01-preview";

  if (!endpoint || !apiKey || !deploymentName || !imageDeploymentName) {
    throw new Error(
      "Azure OpenAI の設定が見つかりません。`imgen configure` コマンドで設定するか、環境変数を設定してください。"
    );
  }

  return { endpoint, apiKey, deploymentName, imageDeploymentName, apiVersion, imageApiVersion };
}
```

**Step 4: Run test to verify it passes**

Run: `cd /Volumes/Data/dev/imgen && npx vitest run src/utils/config.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
cd /Volumes/Data/dev/imgen
git add src/utils/config.ts src/utils/config.test.ts
git commit -m "feat: add Azure OpenAI config management with tests"
```

---

### Task 8: Preset Management

**Files:**
- Create: `src/utils/preset.ts`
- Create: `src/utils/preset.test.ts`

**Step 1: Write the failing test**

Create `src/utils/preset.test.ts`:

```typescript
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  BUILTIN_PRESETS,
  deletePreset,
  getPreset,
  listAllPresets,
  savePreset,
} from "./preset.js";

describe("preset", () => {
  let tempDir: string;
  let origHome: string | undefined;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "imgen-test-preset-"));
    origHome = process.env.HOME;
    process.env.HOME = tempDir;
  });

  afterEach(async () => {
    process.env.HOME = origHome;
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("should have builtin presets", () => {
    expect(BUILTIN_PRESETS["builtin:square"]).toEqual({
      size: "1024x1024", quality: "high", style: "vivid",
    });
    expect(BUILTIN_PRESETS["builtin:landscape"]).toEqual({
      size: "1536x1024", quality: "high", style: "vivid",
    });
  });

  it("should get builtin preset", async () => {
    expect(await getPreset("builtin:square")).toEqual({
      size: "1024x1024", quality: "high", style: "vivid",
    });
  });

  it("should save and get user preset", async () => {
    await savePreset("test", { size: "1024x1536", quality: "low", style: "natural" });
    expect(await getPreset("test")).toEqual({
      size: "1024x1536", quality: "low", style: "natural",
    });
  });

  it("should return null for missing preset", async () => {
    expect(await getPreset("nope")).toBeNull();
  });

  it("should delete user preset", async () => {
    await savePreset("test", { size: "1024x1024" });
    expect(await deletePreset("test")).toBe(true);
    expect(await getPreset("test")).toBeNull();
  });

  it("should reject deleting builtin preset", async () => {
    await expect(deletePreset("builtin:square")).rejects.toThrow();
  });

  it("should list all presets", async () => {
    await savePreset("custom", { size: "1024x1024" });
    const all = await listAllPresets();
    expect(all.some((p) => p.name === "builtin:square" && p.builtin)).toBe(true);
    expect(all.some((p) => p.name === "custom" && !p.builtin)).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd /Volumes/Data/dev/imgen && npx vitest run src/utils/preset.test.ts`
Expected: FAIL

**Step 3: Write implementation**

Create `src/utils/preset.ts`:

```typescript
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { getConfigDir } from "./config.js";
import type { ImageSizeConfig, ImageQualityConfig, ImageStyleConfig, ImageFormatConfig } from "./config.js";

export interface ImagePreset {
  size?: ImageSizeConfig;
  quality?: ImageQualityConfig;
  style?: ImageStyleConfig;
  format?: ImageFormatConfig;
}

export interface Presets {
  [name: string]: ImagePreset;
}

export const BUILTIN_PRESETS: Presets = {
  "builtin:square":    { size: "1024x1024", quality: "high", style: "vivid" },
  "builtin:landscape": { size: "1536x1024", quality: "high", style: "vivid" },
  "builtin:portrait":  { size: "1024x1536", quality: "high", style: "vivid" },
  "builtin:draft":     { size: "1024x1024", quality: "low",  style: "natural" },
  "builtin:photo":     { size: "1536x1024", quality: "high", style: "natural" },
};

export function getPresetsPath(): string {
  return path.join(getConfigDir(), "presets.json");
}

export async function loadPresets(): Promise<Presets> {
  try {
    const text = await fs.readFile(getPresetsPath(), "utf-8");
    return JSON.parse(text) as Presets;
  } catch {
    return {};
  }
}

export async function savePresets(presets: Presets): Promise<void> {
  const p = getPresetsPath();
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, JSON.stringify(presets, null, 2));
}

export async function getPreset(name: string): Promise<ImagePreset | null> {
  if (name.startsWith("builtin:") && BUILTIN_PRESETS[name]) return BUILTIN_PRESETS[name];
  const presets = await loadPresets();
  return presets[name] || null;
}

export async function savePreset(name: string, preset: ImagePreset): Promise<void> {
  if (name.startsWith("builtin:")) throw new Error("ビルトインプリセットは上書きできません");
  const presets = await loadPresets();
  presets[name] = preset;
  await savePresets(presets);
}

export async function deletePreset(name: string): Promise<boolean> {
  if (name.startsWith("builtin:")) throw new Error("ビルトインプリセットは削除できません");
  const presets = await loadPresets();
  if (!presets[name]) return false;
  delete presets[name];
  await savePresets(presets);
  return true;
}

export async function listAllPresets(): Promise<{ name: string; preset: ImagePreset; builtin: boolean }[]> {
  const result: { name: string; preset: ImagePreset; builtin: boolean }[] = [];
  for (const [name, preset] of Object.entries(BUILTIN_PRESETS)) {
    result.push({ name, preset, builtin: true });
  }
  const presets = await loadPresets();
  for (const [name, preset] of Object.entries(presets)) {
    result.push({ name, preset, builtin: false });
  }
  return result;
}
```

**Step 4: Run test to verify it passes**

Run: `cd /Volumes/Data/dev/imgen && npx vitest run src/utils/preset.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
cd /Volumes/Data/dev/imgen
git add src/utils/preset.ts src/utils/preset.test.ts
git commit -m "feat: add preset management with builtin presets and tests"
```

---

### Task 9: Azure Chat Client (gpt-5.1)

**Files:**
- Create: `src/utils/azure-chat.ts`
- Create: `src/utils/azure-chat.test.ts`

**Step 1: Write the failing test**

Create `src/utils/azure-chat.test.ts`:

```typescript
import { describe, expect, it, vi, beforeEach } from "vitest";
import { AzureChatClient } from "./azure-chat.js";
import type { AzureConfig } from "./config.js";

// Mock the openai module
vi.mock("openai", () => {
  const mockCreate = vi.fn();
  return {
    AzureOpenAI: vi.fn().mockImplementation(() => ({
      chat: { completions: { create: mockCreate } },
    })),
    __mockCreate: mockCreate,
  };
});

const TEST_CONFIG: AzureConfig = {
  endpoint: "https://test.openai.azure.com",
  apiKey: "test-key",
  deploymentName: "gpt-5.1",
  imageDeploymentName: "gpt-image-1.5",
  apiVersion: "2024-02-15-preview",
  imageApiVersion: "2025-04-01-preview",
};

describe("AzureChatClient", () => {
  let client: AzureChatClient;
  let mockCreate: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const openaiModule = await import("openai");
    mockCreate = (openaiModule as unknown as { __mockCreate: ReturnType<typeof vi.fn> }).__mockCreate;
    mockCreate.mockReset();
    client = new AzureChatClient(TEST_CONFIG);
  });

  describe("generatePrompt", () => {
    it("should return expanded prompt", async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: "A detailed prompt for image generation" } }],
      });
      const result = await client.generatePrompt("cute cat");
      expect(result).toBe("A detailed prompt for image generation");
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });
  });

  describe("generateFileName", () => {
    it("should return sanitized filename", async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: "cute-cat-mascot" } }],
      });
      const result = await client.generateFileName("cute cat mascot");
      expect(result).toMatch(/^[a-z0-9-]+$/);
    });
  });

  describe("generateExplanation", () => {
    it("should call with multimodal content", async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: "This image shows a cat." } }],
      });
      const result = await client.generateExplanation(
        { data: "base64data", mimeType: "image/png" },
        "en"
      );
      expect(result).toBe("This image shows a cat.");
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd /Volumes/Data/dev/imgen && npx vitest run src/utils/azure-chat.test.ts`
Expected: FAIL

**Step 3: Write implementation**

Create `src/utils/azure-chat.ts`:

```typescript
import { AzureOpenAI } from "openai";
import type { AzureConfig } from "./config.js";
import type { ImageData } from "./image.js";
import { Logger } from "./logger.js";

export class AzureChatClient {
  private client: AzureOpenAI;
  private deploymentName: string;
  private logger: Logger;

  constructor(config: AzureConfig) {
    this.client = new AzureOpenAI({
      endpoint: config.endpoint,
      apiKey: config.apiKey,
      apiVersion: config.apiVersion,
      deployment: config.deploymentName,
    });
    this.deploymentName = config.deploymentName;
    this.logger = Logger.getInstance({ name: "azure-chat" });
  }

  async generatePrompt(theme: string, context = ""): Promise<string> {
    if (!theme) throw new Error("テーマが空です");

    const prompt = `
Generate a detailed image generation prompt based on the following information.

Theme: ${theme}
${context ? `Context:\n${context}\n` : ""}
Please generate a prompt that meets the following criteria:
1. Include specific and detailed descriptions
2. Clearly specify the image style and atmosphere
3. Include all necessary elements
4. Output in English
5. Focus on visual elements and composition
6. Include lighting and color descriptions
7. Specify the mood and emotional tone
8. Limit the output to approximately 1500 characters

Prompt:
`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.deploymentName,
        messages: [{ role: "user", content: prompt }],
      });
      return response.choices[0]?.message?.content ?? "";
    } catch (error) {
      this.logger.error("プロンプト生成に失敗しました", { error });
      throw new Error("プロンプトの生成に失敗しました");
    }
  }

  async generateFileName(theme: string, maxLength = 40): Promise<string> {
    if (!theme) throw new Error("テーマが空です");

    try {
      const response = await this.client.chat.completions.create({
        model: this.deploymentName,
        messages: [
          {
            role: "user",
            content: `以下のテーマから画像のファイル名を生成してください。英小文字とハイフンのみ、${maxLength}文字以内。拡張子なし。\n\nテーマ: ${theme}\n\nファイル名:`,
          },
        ],
      });

      let fileName = (response.choices[0]?.message?.content ?? "").trim();
      fileName = fileName
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
      if (fileName.length > maxLength) fileName = fileName.substring(0, maxLength);
      return fileName || "image";
    } catch (error) {
      this.logger.error("ファイル名生成に失敗しました", { error });
      throw new Error("ファイル名の生成に失敗しました");
    }
  }

  async generateExplanation(
    imageData: ImageData,
    lang = "ja",
    context?: string
  ): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.deploymentName,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: `data:${imageData.mimeType};base64,${imageData.data}` },
              },
              {
                type: "text",
                text: `この画像について、${lang}で詳細な説明を生成してください。${context ? `\n\nコンテキスト情報:\n${context}` : ""}`,
              },
            ],
          },
        ],
      });
      return response.choices[0]?.message?.content ?? "";
    } catch (error) {
      this.logger.error("画像説明の生成に失敗しました", { error });
      throw new Error("画像の説明生成に失敗しました");
    }
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd /Volumes/Data/dev/imgen && npx vitest run src/utils/azure-chat.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
cd /Volumes/Data/dev/imgen
git add src/utils/azure-chat.ts src/utils/azure-chat.test.ts
git commit -m "feat: add Azure Chat client (gpt-5.1) with tests"
```

---

### Task 10: Azure Image Client (gpt-image-1.5)

**Files:**
- Create: `src/utils/azure-image.ts`
- Create: `src/utils/azure-image.test.ts`

**Step 1: Write the failing test**

Create `src/utils/azure-image.test.ts`:

```typescript
import { describe, expect, it, vi, beforeEach } from "vitest";
import { AzureImageClient } from "./azure-image.js";
import type { AzureConfig } from "./config.js";

vi.mock("openai", () => {
  const mockGenerate = vi.fn();
  return {
    AzureOpenAI: vi.fn().mockImplementation(() => ({
      images: { generate: mockGenerate },
    })),
    __mockGenerate: mockGenerate,
  };
});

const TEST_CONFIG: AzureConfig = {
  endpoint: "https://test.openai.azure.com",
  apiKey: "test-key",
  deploymentName: "gpt-5.1",
  imageDeploymentName: "gpt-image-1.5",
  apiVersion: "2024-02-15-preview",
  imageApiVersion: "2025-04-01-preview",
};

describe("AzureImageClient", () => {
  let client: AzureImageClient;
  let mockGenerate: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const mod = await import("openai");
    mockGenerate = (mod as unknown as { __mockGenerate: ReturnType<typeof vi.fn> }).__mockGenerate;
    mockGenerate.mockReset();
    client = new AzureImageClient(TEST_CONFIG);
  });

  describe("generateImage", () => {
    it("should return image data from base64 response", async () => {
      const b64 = Buffer.from([1, 2, 3]).toString("base64");
      mockGenerate.mockResolvedValue({
        data: [{ b64_json: b64 }],
      });

      const result = await client.generateImage("a cat", {});
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBe(3);
    });

    it("should throw when no data returned", async () => {
      mockGenerate.mockResolvedValue({ data: [] });
      await expect(client.generateImage("a cat", {})).rejects.toThrow("画像データが見つかりません");
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd /Volumes/Data/dev/imgen && npx vitest run src/utils/azure-image.test.ts`
Expected: FAIL

**Step 3: Write implementation**

Create `src/utils/azure-image.ts`:

```typescript
import { AzureOpenAI } from "openai";
import type { AzureConfig } from "./config.js";
import { Logger } from "./logger.js";

export type ImageSize = "1024x1024" | "1536x1024" | "1024x1536";
export type ImageQuality = "low" | "medium" | "high";
export type ImageStyle = "vivid" | "natural";

export interface GenerateImageOptions {
  size?: ImageSize;
  quality?: ImageQuality;
  style?: ImageStyle;
}

export interface EditImageOptions {
  size?: ImageSize;
}

export class AzureImageClient {
  private client: AzureOpenAI;
  private config: AzureConfig;
  private logger: Logger;

  constructor(config: AzureConfig) {
    this.config = config;
    this.client = new AzureOpenAI({
      endpoint: config.endpoint,
      apiKey: config.apiKey,
      apiVersion: config.imageApiVersion,
      deployment: config.imageDeploymentName,
    });
    this.logger = Logger.getInstance({ name: "azure-image" });
  }

  async generateImage(prompt: string, options: GenerateImageOptions): Promise<Uint8Array> {
    const {
      size = "1024x1024",
      quality = "high",
      style = "vivid",
    } = options;

    this.logger.debug("画像生成リクエスト", { prompt: prompt.substring(0, 100), size, quality, style });

    try {
      const response = await this.client.images.generate({
        model: this.config.imageDeploymentName,
        prompt,
        n: 1,
        size,
        quality,
        style,
        response_format: "b64_json",
      });

      if (!response.data || response.data.length === 0 || !response.data[0].b64_json) {
        throw new Error("画像データが見つかりません");
      }

      const b64 = response.data[0].b64_json;
      const binary = atob(b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    } catch (error) {
      if (error instanceof Error && error.message === "画像データが見つかりません") throw error;
      this.logger.error("画像生成に失敗しました", { error });
      throw new Error(`画像生成に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async editImage(
    imageBuffer: Buffer,
    prompt: string,
    options: EditImageOptions = {}
  ): Promise<Uint8Array> {
    const { size = "1024x1024" } = options;

    this.logger.debug("画像編集リクエスト (REST API)", { prompt: prompt.substring(0, 100), size });

    const url = `${this.config.endpoint}/openai/deployments/${this.config.imageDeploymentName}/images/edits?api-version=${this.config.imageApiVersion}`;

    const blob = new Blob([imageBuffer], { type: "image/png" });
    const formData = new FormData();
    formData.append("image", blob, "image.png");
    formData.append("prompt", prompt);
    formData.append("size", size);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "api-key": this.config.apiKey },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Azure API error (${response.status}): ${errorText}`);
      }

      const json = (await response.json()) as { data?: { b64_json?: string }[] };

      if (!json.data || json.data.length === 0 || !json.data[0].b64_json) {
        throw new Error("画像データが見つかりません");
      }

      const b64 = json.data[0].b64_json;
      const binary = atob(b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    } catch (error) {
      if (error instanceof Error && error.message === "画像データが見つかりません") throw error;
      this.logger.error("画像編集に失敗しました", { error });
      throw new Error(`画像編集に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd /Volumes/Data/dev/imgen && npx vitest run src/utils/azure-image.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
cd /Volumes/Data/dev/imgen
git add src/utils/azure-image.ts src/utils/azure-image.test.ts
git commit -m "feat: add Azure Image client (gpt-image-1.5) with SDK + REST fallback"
```

---

### Task 11: CLI Commands — image explain

**Files:**
- Create: `src/commands/image/explain.ts`

**Step 1: Write implementation**

Create `src/commands/image/explain.ts`:

```typescript
import * as fs from "node:fs/promises";
import { Command } from "commander";
import { LANGUAGE_DESCRIPTIONS, type SupportedLanguage } from "../../lang.js";
import { getAzureConfig, loadConfig } from "../../utils/config.js";
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
        const config = await loadConfig();
        const lang = (options.lang === "ja" && config?.defaultLanguage)
          ? config.defaultLanguage
          : options.lang;

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
```

**Step 2: Verify type check**

Run: `cd /Volumes/Data/dev/imgen && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
cd /Volumes/Data/dev/imgen
git add src/commands/image/explain.ts
git commit -m "feat: add image explain command"
```

---

### Task 12: CLI Commands — image gen

**Files:**
- Create: `src/commands/image/gen.ts`

**Step 1: Write implementation**

Create `src/commands/image/gen.ts`. This is the main image generation command, adapting ergon's gen.ts to use Azure OpenAI. Follow the exact pattern from ergon but replace Imagen/Gemini calls with AzureImageClient/AzureChatClient. Include: preset support, dry-run, json output, output path resolution, unique filename generation.

Core flow:
1. Parse options (size, quality, style, format, preset)
2. Load config, resolve effective values (CLI → preset → config → defaults)
3. If dry-run, display settings and return
4. Call `AzureChatClient.generatePrompt()` to expand theme
5. Call `AzureImageClient.generateImage()` with expanded prompt
6. Call `AzureChatClient.generateFileName()` to name the output file
7. Save with `saveFileWithUniqueNameIfExists()`
8. Output result (JSON or human-readable)

**Step 2: Verify type check**

Run: `cd /Volumes/Data/dev/imgen && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
cd /Volumes/Data/dev/imgen
git add src/commands/image/gen.ts
git commit -m "feat: add image gen command with Azure gpt-image-1.5"
```

---

### Task 13: CLI Commands — image edit

**Files:**
- Create: `src/commands/image/edit.ts`

**Step 1: Write implementation**

Create `src/commands/image/edit.ts`. Similar to ergon's edit.ts but uses `AzureImageClient.editImage()` (REST API). Includes: input file validation, dry-run, json output, output path resolution.

Core flow:
1. Validate input file exists and is supported format (jpg, jpeg, png, gif, webp)
2. If dry-run, display settings and return
3. Read input image as Buffer
4. Call `AzureImageClient.editImage()` with buffer + prompt
5. Call `AzureChatClient.generateFileName()` for output name
6. Save with `saveFileWithUniqueNameIfExists()`
7. Output result

**Step 2: Verify type check**

Run: `cd /Volumes/Data/dev/imgen && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
cd /Volumes/Data/dev/imgen
git add src/commands/image/edit.ts
git commit -m "feat: add image edit command with Azure REST API"
```

---

### Task 14: CLI Commands — image parent, configure, preset, log

**Files:**
- Create: `src/commands/image/index.ts`
- Create: `src/commands/configure.ts`
- Create: `src/commands/preset.ts`
- Create: `src/commands/log.ts`

**Step 1: Write image/index.ts**

```typescript
import { Command } from "commander";
import { imageEditCommand } from "./edit.js";
import { imageExplainCommand } from "./explain.js";
import { imageGenCommand } from "./gen.js";

export function imageCommand(): Command {
  const image = new Command("image").description("画像生成・編集・説明 (gpt-image-1.5 / gpt-5.1)");
  image.addCommand(imageGenCommand());
  image.addCommand(imageEditCommand());
  image.addCommand(imageExplainCommand());
  return image;
}
```

**Step 2: Write configure.ts**

Adapt from ergon's configure.ts: replace Google API key prompts with Azure connection prompts (endpoint, apiKey, deploymentName, imageDeploymentName, apiVersion, imageApiVersion). Replace defaultImageEngine/aspectRatio with size/quality/style. Remove audio voice setting.

**Step 3: Write preset.ts**

Adapt from ergon's preset.ts: change options to match imgen preset fields (size, quality, style, format).

**Step 4: Write log.ts**

Copy from ergon with `.ergon` → `.imgen` path change.

**Step 5: Verify type check**

Run: `cd /Volumes/Data/dev/imgen && npx tsc --noEmit`
Expected: No errors

**Step 6: Commit**

```bash
cd /Volumes/Data/dev/imgen
git add src/commands/image/index.ts src/commands/configure.ts src/commands/preset.ts src/commands/log.ts
git commit -m "feat: add image parent command, configure, preset, and log commands"
```

---

### Task 15: Main Command and Entry Point

**Files:**
- Create: `src/commands/index.ts`
- Create: `src/index.ts`

**Step 1: Write commands/index.ts**

```typescript
import { Command } from "commander";
import { configureCommand } from "./configure.js";
import { imageCommand } from "./image/index.js";
import { logCommand } from "./log.js";
import { presetCommand } from "./preset.js";

export function createMainCommand(): Command {
  const program = new Command()
    .name("imgen")
    .version("0.1.0")
    .description("Azure OpenAI 画像生成・編集・説明ツール - gpt-image-1.5 / gpt-5.1")
    .addHelpText("before", `
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   imgen - Azure OpenAI Image Generation CLI                   ║
║                                                               ║
║   gpt-image-1.5    画像生成・編集                              ║
║   gpt-5.1          プロンプト拡張・画像説明                     ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`)
    .addHelpText("after", `
使用例:
  $ imgen image gen "夕日の海辺" -q high -t vivid
  $ imgen image gen "可愛い猫" -s 1024x1024 -p builtin:square
  $ imgen image edit photo.png "背景を青空に"
  $ imgen image explain screenshot.png -l en

クイックスタート:
  1. 設定: imgen configure
  2. 画像生成: imgen image gen "テーマ"
`)
    .action(() => {
      program.help();
    });

  program.addCommand(imageCommand());
  program.addCommand(presetCommand());
  program.addCommand(configureCommand());
  program.addCommand(logCommand());

  return program;
}
```

**Step 2: Write src/index.ts**

```typescript
#!/usr/bin/env node

import { createMainCommand } from "./commands/index.js";

async function runCli() {
  try {
    const program = createMainCommand();
    await program.parseAsync(process.argv);
  } catch (error: unknown) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

runCli();
```

**Step 3: Verify type check and build**

Run: `cd /Volumes/Data/dev/imgen && npx tsc --noEmit`
Expected: No errors

Run: `cd /Volumes/Data/dev/imgen && npm run dev -- --help`
Expected: Help text displayed with banner

**Step 4: Commit**

```bash
cd /Volumes/Data/dev/imgen
git add src/commands/index.ts src/index.ts
git commit -m "feat: add main command router and entry point"
```

---

### Task 16: Skill Definition

**Files:**
- Create: `skills/imgen/SKILL.md`
- Create: `.agents/skills/imgen` (symlink)

**Step 1: Write SKILL.md**

Create `skills/imgen/SKILL.md` with frontmatter and usage documentation covering all 3 image commands, options, workflow patterns, and common options.

**Step 2: Create symlink**

```bash
cd /Volumes/Data/dev/imgen
mkdir -p .agents/skills
ln -s ../../skills/imgen .agents/skills/imgen
```

**Step 3: Commit**

```bash
cd /Volumes/Data/dev/imgen
git add skills/imgen/SKILL.md .agents/skills/imgen
git commit -m "feat: add AI agent skill definition"
```

---

### Task 17: Run All Tests and Final Verification

**Step 1: Run full test suite**

Run: `cd /Volumes/Data/dev/imgen && npm test`
Expected: All tests pass

**Step 2: Run type check**

Run: `cd /Volumes/Data/dev/imgen && npm run check`
Expected: No errors

**Step 3: Run build**

Run: `cd /Volumes/Data/dev/imgen && npm run build`
Expected: dist/ created successfully

**Step 4: Test CLI help**

Run: `cd /Volumes/Data/dev/imgen && npm run dev -- --help`
Run: `cd /Volumes/Data/dev/imgen && npm run dev -- image --help`
Run: `cd /Volumes/Data/dev/imgen && npm run dev -- image gen --help`
Expected: All help texts display correctly

**Step 5: Test dry-run**

Run: `cd /Volumes/Data/dev/imgen && npm run dev -- image gen "test" --dry-run`
Expected: Dry-run output showing config without API call

**Step 6: Final commit**

```bash
cd /Volumes/Data/dev/imgen
git add -A
git commit -m "chore: final verification - all tests pass, build succeeds"
```
