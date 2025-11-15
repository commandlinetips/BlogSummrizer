import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  ArticleExtractionError,
  PaywallDetectedError,
  CookieExpiredError,
  OllamaConnectionError,
  OllamaModelNotFoundError,
  InsufficientMemoryError,
  ImageDownloadError,
  NetworkTimeoutError,
  FileSystemError,
  ConfigValidationError,
  ErrorFactory,
} from '../../src/utils/errors.js';
import { ErrorHandler } from '../../src/utils/ErrorHandler.js';

describe('Custom Error Classes', () => {
  describe('ArticleExtractionError', () => {
    it('should create error with all properties', () => {
      const error = new ArticleExtractionError(
        'Test error',
        'TEST_ERROR',
        { url: 'https://example.com' },
        [{ action: 'Test action', description: 'Test description' }],
        true
      );

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.context?.url).toBe('https://example.com');
      expect(error.recoverySuggestions).toHaveLength(1);
      expect(error.recoverable).toBe(true);
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it('should serialize to JSON', () => {
      const error = new ArticleExtractionError('Test', 'TEST', {}, [], true);
      const json = error.toJSON();

      expect(json).toHaveProperty('name');
      expect(json).toHaveProperty('message');
      expect(json).toHaveProperty('code');
      expect(json).toHaveProperty('timestamp');
      expect(json).toHaveProperty('recoverable');
    });
  });

  describe('PaywallDetectedError', () => {
    it('should create paywall error with recovery suggestions', () => {
      const error = new PaywallDetectedError('https://example.com/article');

      expect(error.message).toContain('Paywall detected');
      expect(error.code).toBe('PAYWALL_DETECTED');
      expect(error.context?.url).toBe('https://example.com/article');
      expect(error.recoverySuggestions.length).toBeGreaterThan(0);
      expect(error.recoverySuggestions[0].action).toContain('cookies');
    });

    it('should include paywall type if provided', () => {
      const error = new PaywallDetectedError('https://example.com', 'hard-paywall');

      expect(error.context?.details?.paywallType).toBe('hard-paywall');
    });
  });

  describe('CookieExpiredError', () => {
    it('should create cookie error with suggestions', () => {
      const error = new CookieExpiredError('./cookies.json', 3);

      expect(error.message).toContain('expired');
      expect(error.code).toBe('COOKIE_EXPIRED');
      expect(error.context?.cookiePath).toBe('./cookies.json');
      expect(error.context?.details?.expiredCount).toBe(3);
      expect(error.recoverySuggestions.length).toBeGreaterThan(0);
    });
  });

  describe('OllamaConnectionError', () => {
    it('should create Ollama connection error', () => {
      const error = new OllamaConnectionError('http://localhost:11434');

      expect(error.message).toContain('Cannot connect');
      expect(error.code).toBe('OLLAMA_NOT_RUNNING');
      expect(error.recoverySuggestions.some(s => s.command?.includes('ollama serve'))).toBe(true);
    });

    it('should include original error if provided', () => {
      const originalError = new Error('Connection refused');
      const error = new OllamaConnectionError('http://localhost:11434', originalError);

      expect(error.context?.details?.originalError).toBe('Connection refused');
    });
  });

  describe('OllamaModelNotFoundError', () => {
    it('should create model not found error', () => {
      const error = new OllamaModelNotFoundError('llama3.1', ['mistral', 'qwen2.5']);

      expect(error.message).toContain('not found');
      expect(error.code).toBe('MODEL_NOT_FOUND');
      expect(error.context?.modelName).toBe('llama3.1');
      expect(error.message).toContain('mistral');
      expect(error.recoverySuggestions.some(s => s.command?.includes('ollama pull'))).toBe(true);
    });

    it('should work without available models list', () => {
      const error = new OllamaModelNotFoundError('llama3.1');

      expect(error.message).toContain('not found');
      expect(error.recoverySuggestions.length).toBeGreaterThan(0);
    });
  });

  describe('InsufficientMemoryError', () => {
    it('should create memory error', () => {
      const error = new InsufficientMemoryError('llama3.1:70b', '40GB');

      expect(error.message).toContain('Insufficient memory');
      expect(error.code).toBe('INSUFFICIENT_MEMORY');
      expect(error.context?.modelName).toBe('llama3.1:70b');
      expect(error.message).toContain('40GB');
      expect(error.recoverySuggestions.some(s => s.action.includes('smaller model'))).toBe(true);
    });
  });

  describe('ImageDownloadError', () => {
    it('should create image download error', () => {
      const error = new ImageDownloadError('https://example.com/image.jpg', 'CDN blocked');

      expect(error.message).toContain('Failed to download');
      expect(error.code).toBe('IMAGE_DOWNLOAD_FAILED');
      expect(error.context?.imageSrc).toBe('https://example.com/image.jpg');
      expect(error.message).toContain('CDN blocked');
      expect(error.recoverable).toBe(true);
    });
  });

  describe('NetworkTimeoutError', () => {
    it('should create timeout error', () => {
      const error = new NetworkTimeoutError('https://example.com', 30000);

      expect(error.message).toContain('timed out');
      expect(error.code).toBe('NETWORK_TIMEOUT');
      expect(error.context?.url).toBe('https://example.com');
      expect(error.context?.details?.timeout).toBe(30000);
    });
  });

  describe('FileSystemError', () => {
    it('should create file system error', () => {
      const originalError = new Error('EACCES: permission denied');
      const error = new FileSystemError('write', '/tmp/article.md', originalError);

      expect(error.message).toContain('File system error');
      expect(error.code).toBe('FILE_SYSTEM_ERROR');
      expect(error.context?.filePath).toBe('/tmp/article.md');
      expect(error.context?.details?.operation).toBe('write');
    });
  });

  describe('ConfigValidationError', () => {
    it('should create config validation error', () => {
      const error = new ConfigValidationError('browser.timeout', 'must be a number', 'number (ms)');

      expect(error.message).toContain('Invalid configuration');
      expect(error.code).toBe('CONFIG_VALIDATION_ERROR');
      expect(error.context?.configKey).toBe('browser.timeout');
      expect(error.recoverable).toBe(false);
    });
  });

  describe('ErrorFactory', () => {
    it('should create paywall error', () => {
      const error = ErrorFactory.paywallDetected('https://example.com');
      expect(error).toBeInstanceOf(PaywallDetectedError);
    });

    it('should create cookie error', () => {
      const error = ErrorFactory.cookieExpired('./cookies.json', 2);
      expect(error).toBeInstanceOf(CookieExpiredError);
    });

    it('should create Ollama connection error', () => {
      const error = ErrorFactory.ollamaNotRunning();
      expect(error).toBeInstanceOf(OllamaConnectionError);
    });

    it('should create model not found error', () => {
      const error = ErrorFactory.modelNotFound('llama3.1', ['mistral']);
      expect(error).toBeInstanceOf(OllamaModelNotFoundError);
    });

    it('should create memory error', () => {
      const error = ErrorFactory.insufficientMemory('llama3.1:70b');
      expect(error).toBeInstanceOf(InsufficientMemoryError);
    });

    it('should create image download error', () => {
      const error = ErrorFactory.imageDownloadFailed('https://example.com/img.jpg');
      expect(error).toBeInstanceOf(ImageDownloadError);
    });

    it('should create network timeout error', () => {
      const error = ErrorFactory.networkTimeout('https://example.com', 30000);
      expect(error).toBeInstanceOf(NetworkTimeoutError);
    });

    it('should create file system error', () => {
      const error = ErrorFactory.fileSystemError('read', '/tmp/file.txt');
      expect(error).toBeInstanceOf(FileSystemError);
    });

    it('should create config validation error', () => {
      const error = ErrorFactory.configValidation('key', 'reason');
      expect(error).toBeInstanceOf(ConfigValidationError);
    });
  });
});

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler;

  beforeEach(() => {
    errorHandler = new ErrorHandler({ verbose: false, logErrors: false });
  });

  describe('handle', () => {
    it('should handle ArticleExtractionError', async () => {
      const error = new PaywallDetectedError('https://example.com');
      const result = await errorHandler.handle(error);

      expect(result.handled).toBe(true);
      expect(result.error).toBe(error);
      expect(result.recoverySuggestions).toBeDefined();
    });

    it('should normalize regular errors', async () => {
      const error = new Error('Regular error');
      const result = await errorHandler.handle(error);

      expect(result.handled).toBe(true);
      expect(result.error).toBeInstanceOf(ArticleExtractionError);
      expect((result.error as ArticleExtractionError).code).toBe('UNKNOWN_ERROR');
    });

    it('should attempt recovery for recoverable errors', async () => {
      const error = new ImageDownloadError('https://example.com/img.jpg');
      const result = await errorHandler.handle(error);

      expect(result.handled).toBe(true);
      expect(result.recovered).toBe(true);
    });

    it('should not recover from fatal errors', async () => {
      const error = new ConfigValidationError('test', 'invalid');
      const result = await errorHandler.handle(error);

      expect(result.handled).toBe(true);
      expect(result.recovered).toBe(false);
    });
  });

  describe('formatErrorMessage', () => {
    it('should format error message with suggestions', () => {
      const error = new PaywallDetectedError('https://example.com');
      const message = errorHandler.formatErrorMessage(error);

      expect(message).toContain('Error:');
      expect(message).toContain('Paywall');
      expect(message).toContain('How to fix');
      expect(message).toContain('Update cookies');
    });

    it('should include stack trace when requested', () => {
      const error = new PaywallDetectedError('https://example.com');
      const message = errorHandler.formatErrorMessage(error, true);

      expect(message).toContain('Stack trace');
    });

    it('should show context information', () => {
      const error = new OllamaModelNotFoundError('llama3.1', ['mistral']);
      const message = errorHandler.formatErrorMessage(error);

      expect(message).toContain('Context');
      expect(message).toContain('llama3.1');
    });
  });

  describe('Recovery strategies', () => {
    it('should recover from image download failures', async () => {
      const error = new ImageDownloadError('https://example.com/img.jpg');
      const result = await errorHandler.handle(error);

      expect(result.recovered).toBe(true);
    });

    it('should recover from Ollama connection failures', async () => {
      const error = new OllamaConnectionError('http://localhost:11434');
      const result = await errorHandler.handle(error);

      expect(result.recovered).toBe(true);
    });

    it('should recover from model not found errors', async () => {
      const error = new OllamaModelNotFoundError('llama3.1', ['mistral']);
      const result = await errorHandler.handle(error);

      expect(result.recovered).toBe(true);
    });

    it('should not recover from paywall errors', async () => {
      const error = new PaywallDetectedError('https://example.com');
      const result = await errorHandler.handle(error);

      expect(result.recovered).toBe(false);
    });

    it('should not recover from cookie expiry', async () => {
      const error = new CookieExpiredError('./cookies.json');
      const result = await errorHandler.handle(error);

      expect(result.recovered).toBe(false);
    });
  });

  describe('Statistics', () => {
    it('should track error count', async () => {
      await errorHandler.handle(new Error('Error 1'));
      await errorHandler.handle(new Error('Error 2'));

      const stats = errorHandler.getStats();
      expect(stats.totalErrors).toBe(2);
    });

    it('should reset statistics', async () => {
      await errorHandler.handle(new Error('Error 1'));
      errorHandler.reset();

      const stats = errorHandler.getStats();
      expect(stats.totalErrors).toBe(0);
    });
  });

  describe('Static methods', () => {
    it('should check if error is recoverable', () => {
      const recoverableError = new ImageDownloadError('https://example.com/img.jpg');
      const nonRecoverableError = new ConfigValidationError('key', 'reason');

      expect(ErrorHandler.isRecoverable(recoverableError)).toBe(true);
      expect(ErrorHandler.isRecoverable(nonRecoverableError)).toBe(false);
    });

    it('should check if error is fatal', () => {
      const fatalError = new PaywallDetectedError('https://example.com');
      const nonFatalError = new ImageDownloadError('https://example.com/img.jpg');

      expect(ErrorHandler.isFatal(fatalError)).toBe(true);
      expect(ErrorHandler.isFatal(nonFatalError)).toBe(false);
    });
  });
});
