/**
 * Custom error classes for Article Extractor
 * Provides specific error types with recovery suggestions
 */

export interface ErrorContext {
  url?: string;
  cookiePath?: string;
  modelName?: string;
  imageSrc?: string;
  filePath?: string;
  configKey?: string;
  details?: Record<string, unknown>;
}

export interface RecoverySuggestion {
  action: string;
  command?: string;
  description: string;
}

/**
 * Base error class for all article extraction errors
 */
export class ArticleExtractionError extends Error {
  public readonly code: string;
  public readonly context?: ErrorContext;
  public readonly recoverySuggestions: RecoverySuggestion[];
  public readonly timestamp: Date;
  public readonly recoverable: boolean;

  constructor(
    message: string,
    code: string,
    context?: ErrorContext,
    recoverySuggestions: RecoverySuggestion[] = [],
    recoverable = true
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.context = context;
    this.recoverySuggestions = recoverySuggestions;
    this.timestamp = new Date();
    this.recoverable = recoverable;

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      recoverySuggestions: this.recoverySuggestions,
      timestamp: this.timestamp.toISOString(),
      recoverable: this.recoverable,
      stack: this.stack,
    };
  }
}

/**
 * Thrown when a paywall is detected and cannot be bypassed
 */
export class PaywallDetectedError extends ArticleExtractionError {
  constructor(url: string, paywallType?: string) {
    super(
      `Paywall detected on ${url}. Unable to access article content.`,
      'PAYWALL_DETECTED',
      { url, details: { paywallType } },
      [
        {
          action: 'Update cookies',
          description: 'Your authentication cookies may be expired or invalid.',
          command: 'Export fresh cookies from your browser and update the cookies file',
        },
        {
          action: 'Verify subscription',
          description: 'Ensure you have an active subscription to the publication.',
        },
        {
          action: 'Try alternative URL',
          description: 'Some articles may have alternative URLs (e.g., AMP versions).',
        },
      ],
      true
    );
  }
}

/**
 * Thrown when cookies are expired or invalid
 */
export class CookieExpiredError extends ArticleExtractionError {
  constructor(cookiePath?: string, expiredCount?: number) {
    super(
      `Session cookies have expired. ${expiredCount ? `Found ${expiredCount} expired cookies.` : ''}`,
      'COOKIE_EXPIRED',
      { cookiePath, details: { expiredCount } },
      [
        {
          action: 'Export fresh cookies',
          description: 'Export new cookies from your browser where you are logged in.',
          command: 'Use browser extension like "EditThisCookie" or "Get cookies.txt"',
        },
        {
          action: 'Check cookie format',
          description: 'Ensure cookies are in Netscape or JSON format.',
        },
        {
          action: 'Verify login status',
          description: 'Make sure you are logged in to the publication in your browser.',
        },
      ],
      true
    );
  }
}

/**
 * Thrown when Ollama server is not running or unreachable
 */
export class OllamaConnectionError extends ArticleExtractionError {
  constructor(baseUrl: string, originalError?: Error) {
    super(
      `Cannot connect to Ollama server at ${baseUrl}. Server may not be running.`,
      'OLLAMA_NOT_RUNNING',
      { details: { baseUrl, originalError: originalError?.message } },
      [
        {
          action: 'Start Ollama server',
          description: 'Ollama must be running to generate summaries.',
          command: 'ollama serve',
        },
        {
          action: 'Check Ollama installation',
          description: 'Verify Ollama is installed on your system.',
          command: 'ollama --version',
        },
        {
          action: 'Verify server URL',
          description: `Check that Ollama is running on ${baseUrl}`,
          command: 'curl http://localhost:11434/api/tags',
        },
        {
          action: 'Skip summarization',
          description: 'You can extract articles without summarization using --no-summary flag',
        },
      ],
      true
    );
  }
}

/**
 * Thrown when requested Ollama model is not available
 */
export class OllamaModelNotFoundError extends ArticleExtractionError {
  constructor(modelName: string, availableModels?: string[]) {
    const availableList = availableModels?.length
      ? `Available models: ${availableModels.join(', ')}`
      : '';

    super(
      `Model "${modelName}" not found. ${availableList}`,
      'MODEL_NOT_FOUND',
      { modelName, details: { availableModels } },
      [
        {
          action: 'Pull the model',
          description: `Download the ${modelName} model from Ollama.`,
          command: `ollama pull ${modelName}`,
        },
        {
          action: 'List available models',
          description: 'See which models are already installed.',
          command: 'ollama list',
        },
        {
          action: 'Use available model',
          description: availableModels?.length
            ? `Try one of these: ${availableModels.slice(0, 3).join(', ')}`
            : 'Choose from models shown in "ollama list"',
        },
      ],
      true
    );
  }
}

/**
 * Thrown when system doesn't have enough memory for the model
 */
export class InsufficientMemoryError extends ArticleExtractionError {
  constructor(modelName: string, requiredMemory?: string) {
    super(
      `Insufficient memory to load model "${modelName}". ${requiredMemory ? `Requires ~${requiredMemory}` : ''}`,
      'INSUFFICIENT_MEMORY',
      { modelName, details: { requiredMemory } },
      [
        {
          action: 'Use smaller model',
          description: 'Try a more lightweight model that fits in your system memory.',
          command: 'Use --model qwen2.5:0.5b or --model tinyllama',
        },
        {
          action: 'Close other applications',
          description: 'Free up system memory by closing unnecessary applications.',
        },
        {
          action: 'Use quantized model',
          description: 'Quantized models (Q4, Q5) use less memory.',
          command: 'ollama pull llama3.2:1b-q4_0',
        },
      ],
      true
    );
  }
}

/**
 * Thrown when image download fails
 */
export class ImageDownloadError extends ArticleExtractionError {
  constructor(imageSrc: string, reason?: string, originalError?: Error) {
    super(
      `Failed to download image: ${imageSrc}. ${reason || originalError?.message || ''}`,
      'IMAGE_DOWNLOAD_FAILED',
      { imageSrc, details: { reason, originalError: originalError?.message } },
      [
        {
          action: 'Continue without image',
          description: 'Article will be saved without this image.',
        },
        {
          action: 'Check network connection',
          description: 'Ensure you have internet connectivity.',
        },
        {
          action: 'Verify image URL',
          description: 'The image URL may be invalid or the CDN may be blocking requests.',
        },
      ],
      true
    );
  }
}

/**
 * Thrown when network request times out
 */
export class NetworkTimeoutError extends ArticleExtractionError {
  constructor(url: string, timeout: number) {
    super(
      `Request to ${url} timed out after ${timeout}ms.`,
      'NETWORK_TIMEOUT',
      { url, details: { timeout } },
      [
        {
          action: 'Increase timeout',
          description: 'Try increasing the timeout for slow networks.',
          command: 'Use --timeout 60000 for 60 second timeout',
        },
        {
          action: 'Check network connection',
          description: 'Verify your internet connection is stable.',
        },
        {
          action: 'Retry request',
          description: 'The server may be temporarily slow or unavailable.',
        },
      ],
      true
    );
  }
}

/**
 * Thrown when file system operations fail
 */
export class FileSystemError extends ArticleExtractionError {
  constructor(operation: string, filePath: string, originalError?: Error) {
    super(
      `File system error during ${operation}: ${filePath}. ${originalError?.message || ''}`,
      'FILE_SYSTEM_ERROR',
      { filePath, details: { operation, originalError: originalError?.message } },
      [
        {
          action: 'Check permissions',
          description: 'Ensure you have write permissions to the output directory.',
          command: 'Check permissions with: ls -la',
        },
        {
          action: 'Check disk space',
          description: 'Verify sufficient disk space is available.',
          command: 'df -h',
        },
        {
          action: 'Verify path exists',
          description: 'Ensure parent directories exist and are writable.',
        },
      ],
      true
    );
  }
}

/**
 * Thrown when configuration is invalid
 */
export class ConfigValidationError extends ArticleExtractionError {
  constructor(configKey: string, reason: string, expectedFormat?: string) {
    super(
      `Invalid configuration for "${configKey}": ${reason}`,
      'CONFIG_VALIDATION_ERROR',
      { configKey, details: { reason, expectedFormat } },
      [
        {
          action: 'Check configuration file',
          description: 'Review your config/default.json or .env file.',
        },
        {
          action: 'Use default value',
          description: expectedFormat ? `Expected format: ${expectedFormat}` : 'Check documentation for correct format.',
        },
        {
          action: 'Reset to defaults',
          description: 'Delete custom config to use default values.',
        },
      ],
      false
    );
  }
}

/**
 * Error factory for creating common errors
 */
export class ErrorFactory {
  static paywallDetected(url: string, type?: string): PaywallDetectedError {
    return new PaywallDetectedError(url, type);
  }

  static cookieExpired(path?: string, count?: number): CookieExpiredError {
    return new CookieExpiredError(path, count);
  }

  static ollamaNotRunning(baseUrl = 'http://localhost:11434', error?: Error): OllamaConnectionError {
    return new OllamaConnectionError(baseUrl, error);
  }

  static modelNotFound(model: string, available?: string[]): OllamaModelNotFoundError {
    return new OllamaModelNotFoundError(model, available);
  }

  static insufficientMemory(model: string, required?: string): InsufficientMemoryError {
    return new InsufficientMemoryError(model, required);
  }

  static imageDownloadFailed(src: string, reason?: string, error?: Error): ImageDownloadError {
    return new ImageDownloadError(src, reason, error);
  }

  static networkTimeout(url: string, timeout: number): NetworkTimeoutError {
    return new NetworkTimeoutError(url, timeout);
  }

  static fileSystemError(operation: string, path: string, error?: Error): FileSystemError {
    return new FileSystemError(operation, path, error);
  }

  static configValidation(key: string, reason: string, format?: string): ConfigValidationError {
    return new ConfigValidationError(key, reason, format);
  }
}
