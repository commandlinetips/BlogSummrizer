/**
 * ErrorHandler - Centralized error handling with recovery strategies
 */

import {
  ArticleExtractionError,
  PaywallDetectedError,
  CookieExpiredError,
  OllamaConnectionError,
  OllamaModelNotFoundError,
  ImageDownloadError,
  NetworkTimeoutError,
  ConfigValidationError,
  RecoverySuggestion,
} from './errors.js';

export interface ErrorHandlerOptions {
  verbose?: boolean;
  exitOnFatal?: boolean;
  logErrors?: boolean;
  onError?: (error: ArticleExtractionError) => void;
}

export interface ErrorHandlingResult {
  handled: boolean;
  recovered: boolean;
  error: Error;
  recoverySuggestions?: RecoverySuggestion[];
  fallbackData?: unknown;
}

/**
 * Centralized error handler with recovery strategies
 */
export class ErrorHandler {
  private options: ErrorHandlerOptions;
  private errorCount = 0;
  private recoveryAttempts: Map<string, number> = new Map();

  constructor(options: ErrorHandlerOptions = {}) {
    this.options = {
      verbose: false,
      exitOnFatal: false,
      logErrors: true,
      ...options,
    };
  }

  /**
   * Handle any error with recovery strategies
   */
  async handle(error: Error, context?: Record<string, unknown>): Promise<ErrorHandlingResult> {
    this.errorCount++;

    // Convert to ArticleExtractionError if it isn't already
    const extractionError = this.normalizeError(error);

    // Log the error
    if (this.options.logErrors) {
      this.logError(extractionError, context);
    }

    // Call custom error handler if provided
    if (this.options.onError) {
      this.options.onError(extractionError);
    }

    // Determine if we should attempt recovery
    const result: ErrorHandlingResult = {
      handled: true,
      recovered: false,
      error: extractionError,
      recoverySuggestions: extractionError.recoverySuggestions,
    };

    // Try recovery based on error type
    if (extractionError.recoverable) {
      const recovered = await this.attemptRecovery(extractionError);
      result.recovered = recovered;
    }

    // Exit if fatal error and exitOnFatal is true
    if (!extractionError.recoverable && this.options.exitOnFatal) {
      process.exit(1);
    }

    return result;
  }

  /**
   * Normalize any error to ArticleExtractionError
   */
  private normalizeError(error: Error): ArticleExtractionError {
    if (error instanceof ArticleExtractionError) {
      return error;
    }

    // Convert standard errors to ArticleExtractionError
    return new ArticleExtractionError(
      error.message,
      'UNKNOWN_ERROR',
      { details: { originalError: error.name, stack: error.stack } },
      [
        {
          action: 'Check logs',
          description: 'Review error logs for more details.',
        },
        {
          action: 'Report issue',
          description: 'This may be an unexpected error. Consider reporting it.',
        },
      ],
      true
    );
  }

  /**
   * Attempt to recover from error
   */
  private async attemptRecovery(error: ArticleExtractionError): Promise<boolean> {
    const errorCode = error.code;
    const attemptCount = this.recoveryAttempts.get(errorCode) || 0;

    // Prevent infinite recovery loops
    if (attemptCount >= 3) {
      if (this.options.verbose) {
        console.warn(`⚠️  Max recovery attempts reached for ${errorCode}`);
      }
      return false;
    }

    this.recoveryAttempts.set(errorCode, attemptCount + 1);

    try {
      switch (true) {
        case error instanceof ImageDownloadError:
          return this.recoverFromImageError(error);

        case error instanceof OllamaConnectionError:
          return this.recoverFromOllamaConnection(error);

        case error instanceof OllamaModelNotFoundError:
          return this.recoverFromModelNotFound(error);

        case error instanceof NetworkTimeoutError:
          return this.recoverFromNetworkTimeout(error);

        case error instanceof PaywallDetectedError:
          return this.recoverFromPaywall(error);

        case error instanceof CookieExpiredError:
          return this.recoverFromCookieExpiry(error);

        default:
          return false;
      }
    } catch (recoveryError) {
      if (this.options.verbose) {
        console.error('Recovery attempt failed:', recoveryError);
      }
      return false;
    }
  }

  /**
   * Graceful degradation for image download failures
   */
  private recoverFromImageError(_error: ImageDownloadError): boolean {
    if (this.options.verbose) {
      console.warn(`⚠️  Skipping failed image: ${_error.context?.imageSrc}`);
      console.log('   → Continuing without this image');
    }
    // Recovery: Continue without the failed image
    return true;
  }

  /**
   * Handle Ollama connection failures
   */
  private recoverFromOllamaConnection(_error: OllamaConnectionError): boolean {
    if (this.options.verbose) {
      console.warn('⚠️  Ollama server not available');
      console.log('   → Article will be saved without summary');
    }
    // Recovery: Continue without summarization
    return true;
  }

  /**
   * Handle model not found errors
   */
  private recoverFromModelNotFound(error: OllamaModelNotFoundError): boolean {
    const availableModels = error.context?.details?.availableModels as string[] | undefined;

    if (availableModels && availableModels.length > 0) {
      if (this.options.verbose) {
        console.warn(`⚠️  Model "${error.context?.modelName}" not found`);
        console.log(`   → Fallback to: ${availableModels[0]}`);
      }
      // Recovery: Use first available model
      return true;
    }

    if (this.options.verbose) {
      console.warn('⚠️  No models available');
      console.log('   → Skipping summarization');
    }
    // Recovery: Skip summarization
    return true;
  }

  /**
   * Retry network timeouts with exponential backoff
   */
  private async recoverFromNetworkTimeout(error: NetworkTimeoutError): Promise<boolean> {
    const attemptCount = this.recoveryAttempts.get(error.code) || 0;

    if (attemptCount < 3) {
      const backoffMs = Math.pow(2, attemptCount) * 1000; // 1s, 2s, 4s

      if (this.options.verbose) {
        console.warn(`⚠️  Network timeout (attempt ${attemptCount + 1}/3)`);
        console.log(`   → Retrying in ${backoffMs / 1000}s...`);
      }

      await this.sleep(backoffMs);
      return true; // Signal to retry
    }

    if (this.options.verbose) {
      console.error('✗ Max retry attempts reached for network timeout');
    }
    return false;
  }

  /**
   * Handle paywall detection
   */
  private recoverFromPaywall(_error: PaywallDetectedError): boolean {
    if (this.options.verbose) {
      console.error('✗ Paywall detected - cannot access content');
      console.log('   Please update your authentication cookies');
    }
    // Cannot recover from paywall without user intervention
    return false;
  }

  /**
   * Handle cookie expiration
   */
  private recoverFromCookieExpiry(_error: CookieExpiredError): boolean {
    if (this.options.verbose) {
      console.error('✗ Session cookies expired');
      console.log('   Please export fresh cookies from your browser');
    }
    // Cannot recover without user providing new cookies
    return false;
  }

  /**
   * Format error message for console output
   */
  formatErrorMessage(error: ArticleExtractionError, includeStack = false): string {
    let message = `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `❌ Error: ${error.name}\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    message += `💬 ${error.message}\n\n`;

    // Add context if available
    if (error.context && Object.keys(error.context).length > 0) {
      message += `📋 Context:\n`;
      for (const [key, value] of Object.entries(error.context)) {
        if (key !== 'details' && value) {
          message += `   • ${key}: ${value}\n`;
        }
      }
      message += '\n';
    }

    // Add recovery suggestions
    if (error.recoverySuggestions.length > 0) {
      message += `💡 How to fix:\n\n`;
      error.recoverySuggestions.forEach((suggestion, index) => {
        message += `   ${index + 1}. ${suggestion.action}\n`;
        message += `      ${suggestion.description}\n`;
        if (suggestion.command) {
          message += `      $ ${suggestion.command}\n`;
        }
        message += '\n';
      });
    }

    // Add stack trace if requested
    if (includeStack && error.stack) {
      message += `📚 Stack trace:\n${error.stack}\n\n`;
    }

    message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

    return message;
  }

  /**
   * Log error to console
   */
  private logError(error: ArticleExtractionError, context?: Record<string, unknown>): void {
    if (this.options.verbose) {
      console.error(this.formatErrorMessage(error, true));
    } else {
      console.error(this.formatErrorMessage(error, false));
    }

    if (context && this.options.verbose) {
      console.log('Additional context:', context);
    }
  }

  /**
   * Sleep utility for retry backoff
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Reset error counters
   */
  reset(): void {
    this.errorCount = 0;
    this.recoveryAttempts.clear();
  }

  /**
   * Get error statistics
   */
  getStats(): { totalErrors: number; recoveryAttempts: Record<string, number> } {
    return {
      totalErrors: this.errorCount,
      recoveryAttempts: Object.fromEntries(this.recoveryAttempts),
    };
  }

  /**
   * Check if error is recoverable
   */
  static isRecoverable(error: Error): boolean {
    if (error instanceof ArticleExtractionError) {
      return error.recoverable;
    }
    return true; // Assume other errors are recoverable
  }

  /**
   * Check if error is fatal (requires user intervention)
   */
  static isFatal(error: Error): boolean {
    return (
      error instanceof PaywallDetectedError ||
      error instanceof CookieExpiredError ||
      error instanceof ConfigValidationError
    );
  }
}

/**
 * Global error handler instance (singleton)
 */
let globalErrorHandler: ErrorHandler | null = null;

/**
 * Get or create global error handler
 */
export function getGlobalErrorHandler(options?: ErrorHandlerOptions): ErrorHandler {
  if (!globalErrorHandler) {
    globalErrorHandler = new ErrorHandler(options);
  }
  return globalErrorHandler;
}

/**
 * Set global error handler
 */
export function setGlobalErrorHandler(handler: ErrorHandler): void {
  globalErrorHandler = handler;
}

/**
 * Quick error handling function
 */
export async function handleError(
  error: Error,
  context?: Record<string, unknown>
): Promise<ErrorHandlingResult> {
  const handler = getGlobalErrorHandler();
  return handler.handle(error, context);
}
