/**
 * Centralized logging service with environment-based levels
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: Record<string, unknown> | Error | string | number;
  timestamp: Date;
  userId?: string;
}

class Logger {
  private logLevel: LogLevel;
  
  constructor() {
    // Set log level based on environment
    this.logLevel = process.env.NODE_ENV === 'production' 
      ? LogLevel.ERROR 
      : LogLevel.DEBUG;
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.logLevel;
  }

  private formatMessage(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString();
    const levelName = LogLevel[entry.level];
    const userId = entry.userId ? ` [User: ${entry.userId}]` : '';
    return `[${timestamp}] [${levelName}]${userId} ${entry.message}`;
  }

  private logToConsole(entry: LogEntry) {
    const message = this.formatMessage(entry);
    
    switch (entry.level) {
      case LogLevel.ERROR:
        console.error(message, entry.data);
        break;
      case LogLevel.WARN:
        console.warn(message, entry.data);
        break;
      case LogLevel.INFO:
        console.info(message, entry.data);
        break;
      case LogLevel.DEBUG:
        console.debug(message, entry.data);
        break;
    }
  }

  private async logToService(entry: LogEntry) {
    // In production, you might want to send logs to a service like:
    // - Sentry
    // - LogRocket
    // - DataDog
    // - Custom API endpoint
    
    if (process.env.NODE_ENV === 'production' && entry.level <= LogLevel.WARN) {
      // Only log warnings and errors in production to external service
      try {
        // Example: await fetch('/api/logs', { method: 'POST', body: JSON.stringify(entry) });
      } catch (error) {
        // Fallback to console if external logging fails
        console.error('Failed to log to external service:', error);
      }
    }
  }

  private log(level: LogLevel, message: string, data?: Record<string, unknown> | Error | string | number, userId?: string) {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      level,
      message,
      data,
      timestamp: new Date(),
      userId,
    };

    this.logToConsole(entry);
    this.logToService(entry);
  }

  error(message: string, data?: Record<string, unknown> | Error | string | number, userId?: string) {
    this.log(LogLevel.ERROR, message, data, userId);
  }

  warn(message: string, data?: Record<string, unknown> | Error | string | number, userId?: string) {
    this.log(LogLevel.WARN, message, data, userId);
  }

  info(message: string, data?: Record<string, unknown> | Error | string | number, userId?: string) {
    this.log(LogLevel.INFO, message, data, userId);
  }

  debug(message: string, data?: Record<string, unknown> | Error | string | number, userId?: string) {
    this.log(LogLevel.DEBUG, message, data, userId);
  }

  // Convenience methods for common scenarios
  apiError(endpoint: string, error: Error, userId?: string) {
    this.error(`API Error: ${endpoint}`, { error: error.message, stack: error.stack }, userId);
  }

  authFailure(username: string, reason: string) {
    this.warn(`Authentication failed for user: ${username}`, { reason });
  }

  performanceWarning(operation: string, duration: number, userId?: string) {
    this.warn(`Performance warning: ${operation} took ${duration}ms`, { operation, duration }, userId);
  }
}

// Export singleton instance
export const logger = new Logger();

// Export convenience functions for easier usage
export const { error, warn, info, debug } = logger;