/**
 * Structured logging utility for PulseReader API.
 * Provides consistent logging format across the application.
 */

/* eslint-disable no-console */
type LogContext = Record<string, unknown>;

/**
 * Enhanced context builder that includes Cloudflare-specific information
 */
function buildLogContext(context?: LogContext, request?: Request): LogContext {
  const baseContext = {
    ...context,
    timestamp: new Date().toISOString(),
  };

  // Add Cloudflare-specific context if request is available
  if (request) {
    const cfContext = {
      cfRay: request.headers.get("CF-RAY"),
      cfConnectingIp: request.headers.get("CF-Connecting-IP"),
      cfCountry: request.headers.get("CF-IPCountry"),
      cfRequestId: request.headers.get("CF-RAY"),
      userAgent: request.headers.get("User-Agent"),
    };
    return { ...baseContext, ...cfContext };
  }

  return baseContext;
}

/**
 * Log an informational message with optional context.
 */
export function logInfo(message: string, context?: LogContext, request?: Request): void {
  console.log(
    JSON.stringify({
      level: "info",
      message,
      ...buildLogContext(context, request),
    })
  );
}

/**
 * Log an error with stack trace and optional context.
 */
export function logError(message: string, error: unknown, context?: LogContext, request?: Request): void {
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
      ...buildLogContext(context, request),
    })
  );
}

/**
 * Log a warning message with optional context.
 */
export function logWarn(message: string, context?: LogContext, request?: Request): void {
  console.warn(
    JSON.stringify({
      level: "warn",
      message,
      ...buildLogContext(context, request),
    })
  );
}

/**
 * Log a debug message (only in development).
 */
export function logDebug(message: string, context?: LogContext, request?: Request): void {
  if (import.meta.env.DEV) {
    console.debug(
      JSON.stringify({
        level: "debug",
        message,
        ...buildLogContext(context, request),
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

/**
 * Create a request-scoped logger that automatically includes Cloudflare context
 */
export function createRequestLogger(request: Request) {
  return {
    info: (message: string, context?: LogContext) => logInfo(message, context, request),
    error: (message: string, error: unknown, context?: LogContext) => logError(message, error, context, request),
    warn: (message: string, context?: LogContext) => logWarn(message, context, request),
    debug: (message: string, context?: LogContext) => logDebug(message, context, request),
  };
}

/**
 * Cloudflare Functions Tab Logger - optimized for visibility in Functions tab
 * Uses console methods that are prominently displayed in Cloudflare dashboard
 */
export function createCloudflareLogger(request?: Request) {
  const cfRay = request?.headers.get("CF-RAY") || "unknown";
  const prefix = `[${cfRay}]`;

  return {
    log: (level: string, message: string, context?: LogContext) => {
      const contextStr = context ? ` | ${JSON.stringify(context)}` : "";

      // Use console.log for all levels to ensure visibility in Functions tab
      console.log(`${prefix} ${level.toUpperCase()}: ${message}${contextStr}`);
    },

    info: (message: string, context?: LogContext) => {
      console.log(`${prefix} INFO: ${message}${context ? ` | ${JSON.stringify(context)}` : ""}`);
    },

    error: (message: string, error?: unknown, context?: LogContext) => {
      const errorStr = error instanceof Error ? ` | ${error.message}` : error ? ` | ${String(error)}` : "";
      console.error(`${prefix} ERROR: ${message}${errorStr}${context ? ` | ${JSON.stringify(context)}` : ""}`);
    },

    warn: (message: string, context?: LogContext) => {
      console.warn(`${prefix} WARN: ${message}${context ? ` | ${JSON.stringify(context)}` : ""}`);
    },

    debug: (message: string, context?: LogContext) => {
      if (import.meta.env.DEV) {
        console.log(`${prefix} DEBUG: ${message}${context ? ` | ${JSON.stringify(context)}` : ""}`);
      }
    },

    // Special method for critical flow points
    trace: (step: string, details?: Record<string, unknown>) => {
      console.log(`${prefix} TRACE: ${step}${details ? ` | ${JSON.stringify(details)}` : ""}`);
    },
  };
}
