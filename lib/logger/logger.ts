/**
 * Logger Infrastructure
 *
 * Provides structured logging with different log levels.
 * In production, this can be extended to integrate with
 * external logging services (Winston, Pino, Datadog, etc.)
 */

export enum LogLevel {
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
}

interface LogContext {
  [key: string]: any;
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class Logger {
  private readonly isDevelopment = process.env.NODE_ENV === "development";
  private readonly minLevel: LogLevel;

  constructor() {
    const envLevel = process.env.LOG_LEVEL?.toUpperCase();
    this.minLevel = this.getLogLevelFromString(envLevel) || LogLevel.INFO;
  }

  private getLogLevelFromString(level?: string): LogLevel | undefined {
    switch (level) {
      case "DEBUG":
        return LogLevel.DEBUG;
      case "INFO":
        return LogLevel.INFO;
      case "WARN":
        return LogLevel.WARN;
      case "ERROR":
        return LogLevel.ERROR;
      default:
        return undefined;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    return levels.indexOf(level) >= levels.indexOf(this.minLevel);
  }

  private formatLogEntry(entry: LogEntry): string {
    if (this.isDevelopment) {
      // Human-readable format for development
      let log = `[${entry.level}] ${entry.timestamp} - ${entry.message}`;
      if (entry.context) {
        log += `
  Context: ${JSON.stringify(entry.context, null, 2)}`;
      }
      if (entry.error) {
        log += `
  Error: ${entry.error.name}: ${entry.error.message}`;
        if (entry.error.stack) {
          log += `
  Stack: ${entry.error.stack}`;
        }
      }
      return log;
    } else {
      // JSON format for production (easier to parse by log aggregation tools)
      return JSON.stringify(entry);
    }
  }

  private log(level: LogLevel, message: string, context?: LogContext, error?: Error) {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...(context && { context }),
      ...(error && {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
      }),
    };

    const formatted = this.formatLogEntry(entry);

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formatted);
        break;
      case LogLevel.INFO:
        console.log(formatted);
        break;
      case LogLevel.WARN:
        console.warn(formatted);
        break;
      case LogLevel.ERROR:
        console.error(formatted);
        break;
    }

    // In production, you would also send logs to external service here
    // Example: await sendToDatadog(entry);
    // Example: await sendToCloudWatch(entry);
  }

  /**
   * Debug level logging
   * Use for detailed debugging information
   */
  debug(message: string, context?: LogContext) {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Info level logging
   * Use for general informational messages
   */
  info(message: string, context?: LogContext) {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Warning level logging
   * Use for potentially harmful situations
   */
  warn(message: string, context?: LogContext) {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * Error level logging
   * Use for error events
   */
  error(message: string, error?: Error, context?: LogContext) {
    this.log(LogLevel.ERROR, message, context, error);
  }

  /**
   * Log API request
   */
  logRequest(method: string, path: string, userId?: string, context?: LogContext) {
    this.info(`API Request: ${method} ${path}`, {
      method,
      path,
      userId,
      ...context,
    });
  }

  /**
   * Log API response
   */
  logResponse(
    method: string,
    path: string,
    status: number,
    duration: number,
    context?: LogContext
  ) {
    this.info(`API Response: ${method} ${path} ${status}`, {
      method,
      path,
      status,
      duration,
      ...context,
    });
  }

  /**
   * Log database query
   */
  logQuery(model: string, operation: string, duration: number, context?: LogContext) {
    this.debug(`DB Query: ${model}.${operation}`, {
      model,
      operation,
      duration,
      ...context,
    });
  }

  /**
   * Log authentication event
   */
  logAuth(event: string, userId?: string, success: boolean = true, context?: LogContext) {
    this.info(`Auth: ${event}`, {
      event,
      userId,
      success,
      ...context,
    });
  }

  /**
   * Log permission check
   */
  logPermission(
    userId: string,
    permission: string,
    granted: boolean,
    context?: LogContext
  ) {
    this.debug(`Permission Check: ${permission}`, {
      userId,
      permission,
      granted,
      ...context,
    });
  }
}

// Export singleton instance
export const logger = new Logger();

// Export convenience functions
export const log = {
  debug: (message: string, context?: LogContext) => logger.debug(message, context),
  info: (message: string, context?: LogContext) => logger.info(message, context),
  warn: (message: string, context?: LogContext) => logger.warn(message, context),
  error: (message: string, error?: Error, context?: LogContext) =>
    logger.error(message, error, context),
};
