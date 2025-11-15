/**
 * Structured logging utility for PulseReader API.
 * Provides consistent logging format across the application.
 */

type LogContext = Record<string, unknown>;

/**
 * Log an informational message with optional context.
 */
export function logInfo(message: string, context?: LogContext): void {
  console.log(
    JSON.stringify({
      level: "info",
      message,
      ...context,
      timestamp: new Date().toISOString(),
    })
  );
}

/**
 * Log an error with stack trace and optional context.
 */
export function logError(message: string, error: unknown, context?: LogContext): void {
  console.error(
    JSON.stringify({
      level: "error",
      message,
      error:
        error instanceof Error
          ? {
              message: error.message,
              stack: error.stack,
              name: error.name,
            }
          : String(error),
      ...context,
      timestamp: new Date().toISOString(),
    })
  );
}

/**
 * Log a warning message with optional context.
 */
export function logWarn(message: string, context?: LogContext): void {
  console.warn(
    JSON.stringify({
      level: "warn",
      message,
      ...context,
      timestamp: new Date().toISOString(),
    })
  );
}

/**
 * Log a debug message (only in development).
 */
export function logDebug(message: string, context?: LogContext): void {
  if (import.meta.env.DEV) {
    console.debug(
      JSON.stringify({
        level: "debug",
        message,
        ...context,
        timestamp: new Date().toISOString(),
      })
    );
  }
}

/**
 * Structured logger object with all logging methods.
 */
export const logger = {
  info: logInfo,
  error: logError,
  warn: logWarn,
  debug: logDebug,
};
