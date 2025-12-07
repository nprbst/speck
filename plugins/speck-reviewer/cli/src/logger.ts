/**
 * Logger for speck-review CLI
 * Supports debug/info/warn/error levels with SPECK_DEBUG environment variable
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function getLogLevel(): LogLevel {
  const envLevel = process.env.SPECK_LOG_LEVEL?.toLowerCase();
  if (envLevel && envLevel in LOG_LEVELS) {
    return envLevel as LogLevel;
  }
  // SPECK_DEBUG=1 enables debug logging
  if (process.env.SPECK_DEBUG === "1") {
    return "debug";
  }
  return "info";
}

function shouldLog(level: LogLevel): boolean {
  const currentLevel = getLogLevel();
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

function formatTimestamp(): string {
  return new Date().toISOString();
}

function formatMessage(level: LogLevel, message: string, ...args: unknown[]): string {
  const timestamp = process.env.SPECK_DEBUG === "1" ? `[${formatTimestamp()}] ` : "";
  const prefix = level === "debug" ? "[DEBUG] " : "";
  const formattedArgs = args.length > 0 ? " " + args.map(String).join(" ") : "";
  return `${timestamp}${prefix}${message}${formattedArgs}`;
}

export const logger = {
  debug(message: string, ...args: unknown[]): void {
    if (shouldLog("debug")) {
      console.error(formatMessage("debug", message, ...args));
    }
  },

  info(message: string, ...args: unknown[]): void {
    if (shouldLog("info")) {
      console.log(formatMessage("info", message, ...args));
    }
  },

  warn(message: string, ...args: unknown[]): void {
    if (shouldLog("warn")) {
      console.error(formatMessage("warn", `Warning: ${message}`, ...args));
    }
  },

  error(message: string, ...args: unknown[]): void {
    if (shouldLog("error")) {
      console.error(formatMessage("error", `Error: ${message}`, ...args));
    }
  },

  /** Log structured JSON output (for machine-readable responses) */
  json(data: unknown): void {
    console.log(JSON.stringify(data, null, 2));
  },

  /** Get current log level */
  getLevel(): LogLevel {
    return getLogLevel();
  },
};

export default logger;
