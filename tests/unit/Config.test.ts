import { describe, it, expect } from '@jest/globals';
import {
  ConfigSchema,
  BrowserConfigSchema,
  LLMConfigSchema,
  ImageConfigSchema,
  OutputConfigSchema,
  LoggingConfigSchema,
  validateConfig,
  getDefaultConfig,
  type Config,
} from '../../src/config/schema.js';

describe('Configuration Schemas', () => {
  describe('BrowserConfigSchema', () => {
    it('should validate valid browser config', () => {
      const config = {
        timeout: 30000,
        headless: true,
        antiDetection: true,
        retries: 3,
      };

      const result = BrowserConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should reject timeout below minimum', () => {
      const config = {
        timeout: 1000, // Below 5000 minimum
        headless: true,
      };

      const result = BrowserConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it('should reject timeout above maximum', () => {
      const config = {
        timeout: 400000, // Above 300000 maximum
        headless: true,
      };

      const result = BrowserConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it('should apply default values', () => {
      const config = {
        timeout: 30000,
        headless: true,
      };

      const result = BrowserConfigSchema.parse(config);
      expect(result.antiDetection).toBe(true);
      expect(result.retries).toBe(3);
    });

    it('should reject invalid retry count', () => {
      const config = {
        timeout: 30000,
        headless: true,
        retries: 0, // Below minimum
      };

      const result = BrowserConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });
  });

  describe('LLMConfigSchema', () => {
    it('should validate valid LLM config', () => {
      const config = {
        type: 'ollama' as const,
        baseUrl: 'http://localhost:11434',
        primaryModel: 'llama3.1',
        fallbackModels: ['mistral', 'qwen3:4b'],
      };

      const result = LLMConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should reject invalid LLM type', () => {
      const config = {
        type: 'invalid-type',
        baseUrl: 'http://localhost:11434',
        primaryModel: 'llama3.1',
      };

      const result = LLMConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it('should reject invalid base URL', () => {
      const config = {
        type: 'ollama' as const,
        baseUrl: 'not-a-url',
        primaryModel: 'llama3.1',
      };

      const result = LLMConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it('should reject empty primary model', () => {
      const config = {
        type: 'ollama' as const,
        baseUrl: 'http://localhost:11434',
        primaryModel: '',
      };

      const result = LLMConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it('should validate temperature range', () => {
      const validConfig = {
        type: 'ollama' as const,
        baseUrl: 'http://localhost:11434',
        primaryModel: 'llama3.1',
        temperature: 0.7,
      };

      expect(LLMConfigSchema.safeParse(validConfig).success).toBe(true);

      const tooLow = { ...validConfig, temperature: -0.1 };
      expect(LLMConfigSchema.safeParse(tooLow).success).toBe(false);

      const tooHigh = { ...validConfig, temperature: 1.1 };
      expect(LLMConfigSchema.safeParse(tooHigh).success).toBe(false);
    });

    it('should apply default values', () => {
      const config = {
        type: 'ollama' as const,
        baseUrl: 'http://localhost:11434',
        primaryModel: 'llama3.1',
      };

      const result = LLMConfigSchema.parse(config);
      expect(result.summaryLength).toBe('medium');
      expect(result.temperature).toBe(0.5);
      expect(result.timeout).toBe(120000);
      expect(result.streaming).toBe(true);
      expect(result.caching).toBe(true);
    });
  });

  describe('ImageConfigSchema', () => {
    it('should validate valid image config', () => {
      const config = {
        maxWidth: 1200,
        quality: 80,
        maxConcurrent: 5,
        timeout: 10000,
      };

      const result = ImageConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should reject invalid quality values', () => {
      const tooLow = { maxWidth: 1200, quality: 0 };
      expect(ImageConfigSchema.safeParse(tooLow).success).toBe(false);

      const tooHigh = { maxWidth: 1200, quality: 101 };
      expect(ImageConfigSchema.safeParse(tooHigh).success).toBe(false);
    });

    it('should reject invalid maxWidth values', () => {
      const tooSmall = { maxWidth: 50, quality: 80 };
      expect(ImageConfigSchema.safeParse(tooSmall).success).toBe(false);

      const tooLarge = { maxWidth: 6000, quality: 80 };
      expect(ImageConfigSchema.safeParse(tooLarge).success).toBe(false);
    });

    it('should apply default values', () => {
      const config = {};
      const result = ImageConfigSchema.parse(config);

      expect(result.maxWidth).toBe(1200);
      expect(result.quality).toBe(80);
      expect(result.maxConcurrent).toBe(5);
      expect(result.timeout).toBe(10000);
    });
  });

  describe('OutputConfigSchema', () => {
    it('should validate valid output config', () => {
      const config = {
        baseDir: './output/articles',
        structure: 'date/publication' as const,
        naming: 'slug' as const,
        createSubfolders: true,
        deduplication: 'url-hash' as const,
      };

      const result = OutputConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should reject invalid structure values', () => {
      const config = {
        baseDir: './output',
        structure: 'invalid-structure',
      };

      const result = OutputConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it('should reject empty baseDir', () => {
      const config = {
        baseDir: '',
      };

      const result = OutputConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it('should apply default values', () => {
      const config = {};
      const result = OutputConfigSchema.parse(config);

      expect(result.baseDir).toBe('./output/articles');
      expect(result.structure).toBe('date/publication');
      expect(result.naming).toBe('slug');
      expect(result.createSubfolders).toBe(true);
      expect(result.deduplication).toBe('url-hash');
    });
  });

  describe('LoggingConfigSchema', () => {
    it('should validate valid logging config', () => {
      const config = {
        level: 'info' as const,
        format: 'json' as const,
        file: './logs/app.log',
      };

      const result = LoggingConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should reject invalid log level', () => {
      const config = {
        level: 'verbose',
      };

      const result = LoggingConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it('should apply default values', () => {
      const config = {};
      const result = LoggingConfigSchema.parse(config);

      expect(result.level).toBe('info');
      expect(result.format).toBe('text');
    });
  });

  describe('Complete ConfigSchema', () => {
    it('should validate complete valid config', () => {
      const config: Config = {
        browser: {
          timeout: 30000,
          headless: true,
          antiDetection: true,
          retries: 3,
        },
        llm: {
          type: 'ollama',
          baseUrl: 'http://localhost:11434',
          primaryModel: 'llama3.1',
          fallbackModels: ['mistral'],
          summaryLength: 'medium',
          temperature: 0.5,
          timeout: 120000,
          streaming: true,
          caching: true,
          cacheDir: './cache',
        },
        images: {
          maxWidth: 1200,
          quality: 80,
          maxConcurrent: 5,
          timeout: 10000,
        },
        output: {
          baseDir: './output',
          structure: 'date/publication',
          naming: 'slug',
          createSubfolders: true,
          deduplication: 'url-hash',
        },
        logging: {
          level: 'info',
          format: 'text',
          file: './logs/app.log',
        },
      };

      const result = ConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should reject config missing required sections', () => {
      const config = {
        browser: { timeout: 30000, headless: true },
        // Missing llm, images, output, logging
      };

      const result = ConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });
  });

  describe('validateConfig helper', () => {
    it('should return success for valid config', () => {
      const config = getDefaultConfig();
      const result = validateConfig(config);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeDefined();
      }
    });

    it('should return errors for invalid config', () => {
      const config = {
        browser: { timeout: 1000 }, // Invalid timeout
        llm: { type: 'ollama', primaryModel: '' }, // Empty model name
        images: {},
        output: {},
        logging: {},
      };

      const result = validateConfig(config);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors.some(err => err.includes('timeout'))).toBe(true);
      }
    });

    it('should format error messages with path', () => {
      const config = {
        browser: { timeout: 30000, headless: true },
        llm: { type: 'invalid-type', primaryModel: 'test' },
        images: {},
        output: {},
        logging: {},
      };

      const result = validateConfig(config);

      expect(result.success).toBe(false);
      if (!result.success) {
        const error = result.errors.find(err => err.includes('llm.type'));
        expect(error).toBeDefined();
      }
    });
  });

  describe('getDefaultConfig', () => {
    it('should return valid default config', () => {
      const config = getDefaultConfig();
      const result = validateConfig(config);

      expect(result.success).toBe(true);
    });

    it('should have expected default values', () => {
      const config = getDefaultConfig();

      expect(config.browser.headless).toBe(true);
      expect(config.browser.retries).toBe(3);
      expect(config.llm.type).toBe('ollama');
      expect(config.llm.primaryModel).toBe('llama3.1');
      expect(config.images.maxWidth).toBe(1200);
      expect(config.output.structure).toBe('date/publication');
      expect(config.logging.level).toBe('info');
    });
  });
});
