/**
 * Configuration loader with validation and environment variable support
 */

import dotenv from 'dotenv';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { validateConfig, getDefaultConfig, type Config } from './schema.js';
import { ConfigValidationError } from '../utils/errors.js';

// Load environment variables
dotenv.config();

/**
 * Load and validate configuration from file and environment variables
 */
function loadConfig(): Config {
  try {
    let baseConfig: any = {};

    // Try to load config file
    const defaultConfigPath = resolve('config/default.json');
    
    if (existsSync(defaultConfigPath)) {
      try {
        const configContent = readFileSync(defaultConfigPath, 'utf-8');
        baseConfig = JSON.parse(configContent);
      } catch (error) {
        console.warn('Warning: Could not read config/default.json, using defaults');
        if (error instanceof Error) {
          console.warn('Reason:', error.message);
        }
        baseConfig = {};
      }
    } else {
      console.warn('Warning: config/default.json not found, using defaults');
    }

    // Merge with environment variable overrides
    const config: any = {
      browser: {
        ...(baseConfig.browser || {}),
        headless: process.env.BROWSER_HEADLESS 
          ? process.env.BROWSER_HEADLESS === 'true'
          : baseConfig.browser?.headless,
        timeout: process.env.BROWSER_TIMEOUT
          ? parseInt(process.env.BROWSER_TIMEOUT, 10)
          : baseConfig.browser?.timeout,
        retries: process.env.BROWSER_RETRIES
          ? parseInt(process.env.BROWSER_RETRIES, 10)
          : baseConfig.browser?.retries,
      },
      llm: {
        ...(baseConfig.llm || {}),
        type: process.env.LLM_TYPE || baseConfig.llm?.type || 'ollama',
        baseUrl: process.env.OLLAMA_BASE_URL || baseConfig.llm?.baseUrl,
        primaryModel: process.env.OLLAMA_PRIMARY_MODEL || baseConfig.llm?.primaryModel,
        fallbackModels: process.env.OLLAMA_FALLBACK_MODELS
          ? process.env.OLLAMA_FALLBACK_MODELS.split(',')
          : baseConfig.llm?.fallbackModels,
        summaryLength: process.env.SUMMARY_LENGTH || baseConfig.llm?.summaryLength,
        temperature: process.env.LLM_TEMPERATURE
          ? parseFloat(process.env.LLM_TEMPERATURE)
          : baseConfig.llm?.temperature,
        timeout: process.env.OLLAMA_TIMEOUT
          ? parseInt(process.env.OLLAMA_TIMEOUT, 10)
          : baseConfig.llm?.timeout,
      },
      images: {
        ...(baseConfig.images || {}),
        maxWidth: process.env.IMAGE_MAX_WIDTH
          ? parseInt(process.env.IMAGE_MAX_WIDTH, 10)
          : baseConfig.images?.maxWidth,
        quality: process.env.IMAGE_QUALITY
          ? parseInt(process.env.IMAGE_QUALITY, 10)
          : baseConfig.images?.quality,
        maxConcurrent: process.env.IMAGE_MAX_CONCURRENT
          ? parseInt(process.env.IMAGE_MAX_CONCURRENT, 10)
          : baseConfig.images?.maxConcurrent,
      },
      output: {
        ...(baseConfig.output || {}),
        baseDir: process.env.OUTPUT_DIR || baseConfig.output?.baseDir,
        structure: process.env.OUTPUT_STRUCTURE || baseConfig.output?.structure,
        naming: process.env.OUTPUT_NAMING || baseConfig.output?.naming,
      },
      logging: {
        ...(baseConfig.logging || {}),
        level: process.env.LOG_LEVEL || baseConfig.logging?.level,
        format: process.env.LOG_FORMAT || baseConfig.logging?.format,
        file: process.env.LOG_FILE || baseConfig.logging?.file,
      },
    };

    // Validate configuration
    const validation = validateConfig(config);
    
    if (!validation.success) {
      console.error('Configuration validation failed:\n');
      validation.errors.forEach(err => console.error(`  • ${err}`));
      console.error('\nPlease check your config/default.json file and environment variables.\n');
      console.error('Common fixes:');
      console.error('  • Ensure all required fields are present');
      console.error('  • Check that numeric values are within valid ranges');
      console.error('  • Verify URLs are properly formatted\n');

      throw new ConfigValidationError(
        'configuration',
        validation.errors.join(', '),
        'See error details above'
      );
    }

    return validation.data;
  } catch (error) {
    if (error instanceof ConfigValidationError) {
      throw error;
    }

    // For other errors, provide helpful context
    console.error('Failed to load configuration:', error);
    console.error('\nAttempting to use default configuration...\n');
    
    try {
      return getDefaultConfig();
    } catch (defaultError) {
      throw new ConfigValidationError(
        'configuration',
        'Failed to load config and defaults',
        'Please check config/default.json exists and is valid JSON'
      );
    }
  }
}

/**
 * Get environment-specific config overrides
 */
export function getEnvOverrides(): Partial<Config> {
  const overrides: any = {};

  // Browser overrides
  if (process.env.BROWSER_HEADLESS !== undefined) {
    overrides.browser = {
      ...overrides.browser,
      headless: process.env.BROWSER_HEADLESS === 'true',
    };
  }

  // LLM overrides
  if (process.env.OLLAMA_BASE_URL) {
    overrides.llm = {
      ...overrides.llm,
      baseUrl: process.env.OLLAMA_BASE_URL,
    };
  }

  // Output overrides
  if (process.env.OUTPUT_DIR) {
    overrides.output = {
      ...overrides.output,
      baseDir: process.env.OUTPUT_DIR,
    };
  }

  return overrides;
}

/**
 * Reload configuration (useful for testing or runtime updates)
 */
export function reloadConfig(): Config {
  return loadConfig();
}

/**
 * Validate a partial config object (useful for CLI options)
 */
export function validatePartialConfig(partialConfig: Partial<Config>): boolean {
  try {
    // Merge with defaults for validation
    const defaults = getDefaultConfig();
    const merged = {
      ...defaults,
      ...partialConfig,
    };
    
    const validation = validateConfig(merged);
    return validation.success;
  } catch {
    return false;
  }
}

// Export the loaded and validated configuration
export const config = loadConfig();

// Export types and utilities
export type { Config } from './schema.js';
export { getDefaultConfig, validateConfig as validateConfigSchema } from './schema.js';
