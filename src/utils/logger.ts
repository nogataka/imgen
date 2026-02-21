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
      case LogLevel.DEBUG:
        console.debug(msg);
        break;
      case LogLevel.INFO:
        console.info(msg);
        break;
      case LogLevel.WARN:
        console.warn(msg);
        break;
      case LogLevel.ERROR:
        console.error(msg);
        break;
    }
  }

  private async writeToFile(entry: LogEntry): Promise<void> {
    await this.ensureLogDirectory();
    try {
      await fs.appendFile(this.currentLogFile, JSON.stringify(entry) + "\n");
    } catch (error: unknown) {
      console.error(
        `ログの書き込みに失敗しました: ${error instanceof Error ? error.message : String(error)}`
      );
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
        [LogLevel.DEBUG]: 0,
        [LogLevel.INFO]: 1,
        [LogLevel.WARN]: 2,
        [LogLevel.ERROR]: 3,
      };
      const entries: LogEntry[] = [];
      for (let i = lines.length - 1; i >= 0 && entries.length < maxEntries; i--) {
        try {
          const entry = JSON.parse(lines[i]) as LogEntry;
          if (priority[entry.level] >= priority[minLevel]) entries.unshift(entry);
        } catch {
          continue;
        }
      }
      return entries;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
  }
}
