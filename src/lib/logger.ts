// src/lib/logger.ts

type LogLevel = "debug" | "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

function log(level: LogLevel, message: string, context?: LogContext) {
  const payload = {
    level,
    message,
    context,
    timestamp: new Date().toISOString(),
  };

  // In future you can send this to a logging service.
  // Keep it structured so it's easy to parse.
  // Avoid putting PII or HTML in context.
  // For now: just console.
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(payload));
}

export const logger = {
  debug(message: string, context?: LogContext) {
    log("debug", message, context);
  },
  info(message: string, context?: LogContext) {
    log("info", message, context);
  },
  warn(message: string, context?: LogContext) {
    log("warn", message, context);
  },
  error(message: string, context?: LogContext) {
    log("error", message, context);
  },
};
