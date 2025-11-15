/**
 * Logging utility using Winston
 * Provides structured logging with multiple transports
 */

import winston from 'winston';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { config } from '../config/index.js';

// Log levels (in order of priority)
export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

/**
 * Custom log format for console output
 */
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    
    // Add metadata if present
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    
    return msg;
  })
);

/**
 * JSON format for file output
 */
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

/**
 * Text format for file output
 */
const textFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    // Add metadata if present
    if (Object.keys(metadata).length > 0) {
      msg += ` | ${JSON.stringify(metadata)}`;
    }
    
    return msg;
  })
);

/**
 * Create transports based on configuration
 */
function createTransports(): winston.transport[] {
  const transports: winston.transport[] = [
    // Console transport (always enabled)
    new winston.transports.Console({
      format: consoleFormat,
    }),
  ];

  // File transport (if configured)
  if (config.logging.file) {
    const logDir = dirname(config.logging.file);
    
    // Ensure log directory exists
    if (!existsSync(logDir)) {
      mkdirSync(logDir, { recursive: true });
    }

    const fileTransport = new winston.transports.File({
      filename: config.logging.file,
      format: config.logging.format === 'json' ? fileFormat : textFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true,
    });

    transports.push(fileTransport);
  }

  return transports;
}

/**
 * Create Winston logger instance
 */
const logger = winston.createLogger({
  level: config.logging.level,
  transports: createTransports(),
  exitOnError: false,
});

/**
 * Logger class with convenience methods
 */
export class Logger {
  private context?: string;

  constructor(context?: string) {
    this.context = context;
  }

  /**
   * Add context to log metadata
   */
  private addContext(metadata?: Record<string, unknown>): Record<string, unknown> {
    if (this.context) {
      return { ...metadata, context: this.context };
    }
    return metadata || {};
  }

  /**
   * Log error message
   */
  error(message: string, metadata?: Record<string, unknown>): void {
    logger.error(message, this.addContext(metadata));
  }

  /**
   * Log warning message
   */
  warn(message: string, metadata?: Record<string, unknown>): void {
    logger.warn(message, this.addContext(metadata));
  }

  /**
   * Log info message
   */
  info(message: string, metadata?: Record<string, unknown>): void {
    logger.info(message, this.addContext(metadata));
  }

  /**
   * Log debug message
   */
  debug(message: string, metadata?: Record<string, unknown>): void {
    logger.debug(message, this.addContext(metadata));
  }

  /**
   * Log with custom level
   */
  log(level: LogLevel, message: string, metadata?: Record<string, unknown>): void {
    logger.log(level, message, this.addContext(metadata));
  }

  /**
   * Create a child logger with additional context
   */
  child(context: string): Logger {
    const childContext = this.context ? `${this.context}:${context}` : context;
    return new Logger(childContext);
  }

  /**
   * Time an operation
   */
  time(label: string): () => void {
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      this.debug(`${label} completed`, { duration: `${duration}ms` });
    };
  }

  /**
   * Log an operation start
   */
  startOperation(operation: string, metadata?: Record<string, unknown>): void {
    this.info(`Starting: ${operation}`, this.addContext(metadata));
  }

  /**
   * Log an operation completion
   */
  endOperation(operation: string, duration?: number, metadata?: Record<string, unknown>): void {
    const meta = { ...this.addContext(metadata) };
    if (duration !== undefined) {
      meta.duration = `${duration}ms`;
    }
    this.info(`Completed: ${operation}`, meta);
  }

  /**
   * Log an operation failure
   */
  failOperation(operation: string, error: Error, metadata?: Record<string, unknown>): void {
    this.error(`Failed: ${operation}`, {
      ...this.addContext(metadata),
      error: error.message,
      stack: error.stack,
    });
  }
}

/**
 * Global logger instance
 */
export const globalLogger = new Logger();

/**
 * Create a logger with context
 */
export function createLogger(context: string): Logger {
  return new Logger(context);
}

/**
 * Set log level at runtime
 */
export function setLogLevel(level: LogLevel): void {
  logger.level = level;
  globalLogger.info(`Log level changed to: ${level}`);
}

/**
 * Get current log level
 */
export function getLogLevel(): string {
  return logger.level;
}

/**
 * Flush logs (ensure all logs are written)
 */
export async function flushLogs(): Promise<void> {
  return new Promise((resolve) => {
    logger.on('finish', resolve);
    logger.end();
  });
}

/**
 * Check if a log level is enabled
 */
export function isLevelEnabled(level: LogLevel): boolean {
  const levels: Record<LogLevel, number> = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
  };

  const currentLevelValue = levels[logger.level as LogLevel] ?? 2;
  const checkLevelValue = levels[level];

  return checkLevelValue <= currentLevelValue;
}

// Export default logger
export default globalLogger;
