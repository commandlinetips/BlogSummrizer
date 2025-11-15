/**
 * Configuration validation schemas using Zod
 */

import { z } from 'zod';

/**
 * Browser configuration schema
 */
export const BrowserConfigSchema = z.object({
  timeout: z
    .number()
    .min(5000, 'Browser timeout must be at least 5000ms')
    .max(300000, 'Browser timeout cannot exceed 300000ms (5 minutes)')
    .describe('Maximum time to wait for page load in milliseconds'),
  
  headless: z
    .boolean()
    .describe('Run browser in headless mode (no UI)'),
  
  antiDetection: z
    .boolean()
    .optional()
    .default(true)
    .describe('Enable anti-detection measures (user-agent rotation, stealth mode)'),
  
  retries: z
    .number()
    .int()
    .min(1, 'Must retry at least once')
    .max(10, 'Maximum 10 retries allowed')
    .optional()
    .default(3)
    .describe('Number of retry attempts for failed page loads'),
});

/**
 * LLM configuration schema
 */
export const LLMConfigSchema = z.object({
  type: z
    .enum(['ollama', 'claude', 'openai'])
    .describe('LLM provider type'),
  
  baseUrl: z
    .string()
    .url('Base URL must be a valid URL')
    .optional()
    .describe('Base URL for LLM API (e.g., http://localhost:11434 for Ollama)'),
  
  primaryModel: z
    .string()
    .min(1, 'Primary model name cannot be empty')
    .describe('Primary model to use for summarization'),
  
  fallbackModels: z
    .array(z.string().min(1))
    .optional()
    .default([])
    .describe('Fallback models to try if primary fails'),
  
  summaryLength: z
    .enum(['short', 'medium', 'long'])
    .optional()
    .default('medium')
    .describe('Desired length of generated summaries'),
  
  temperature: z
    .number()
    .min(0, 'Temperature must be between 0 and 1')
    .max(1, 'Temperature must be between 0 and 1')
    .optional()
    .default(0.5)
    .describe('Model temperature (creativity vs consistency)'),
  
  timeout: z
    .number()
    .min(10000, 'LLM timeout must be at least 10 seconds')
    .max(600000, 'LLM timeout cannot exceed 10 minutes')
    .optional()
    .default(120000)
    .describe('Maximum time to wait for LLM response in milliseconds'),
  
  streaming: z
    .boolean()
    .optional()
    .default(true)
    .describe('Enable streaming responses from LLM'),
  
  caching: z
    .boolean()
    .optional()
    .default(true)
    .describe('Cache LLM responses for duplicate content'),
  
  cacheDir: z
    .string()
    .optional()
    .default('./cache/summaries')
    .describe('Directory to store cached summaries'),
});

/**
 * Image processing configuration schema
 */
export const ImageConfigSchema = z.object({
  maxWidth: z
    .number()
    .int()
    .min(100, 'Image max width must be at least 100px')
    .max(5000, 'Image max width cannot exceed 5000px')
    .optional()
    .default(1200)
    .describe('Maximum width for resized images'),
  
  quality: z
    .number()
    .int()
    .min(1, 'Image quality must be between 1 and 100')
    .max(100, 'Image quality must be between 1 and 100')
    .optional()
    .default(80)
    .describe('JPEG compression quality (1-100)'),
  
  maxConcurrent: z
    .number()
    .int()
    .min(1, 'Must download at least 1 image at a time')
    .max(20, 'Maximum 20 concurrent image downloads')
    .optional()
    .default(5)
    .describe('Maximum number of concurrent image downloads'),
  
  timeout: z
    .number()
    .min(1000, 'Image download timeout must be at least 1 second')
    .max(120000, 'Image download timeout cannot exceed 2 minutes')
    .optional()
    .default(10000)
    .describe('Timeout for individual image downloads in milliseconds'),
});

/**
 * Output configuration schema
 */
export const OutputConfigSchema = z.object({
  baseDir: z
    .string()
    .min(1, 'Output directory path cannot be empty')
    .optional()
    .default('./output/articles')
    .describe('Base directory for article output'),
  
  structure: z
    .enum(['date/publication', 'publication/date'])
    .optional()
    .default('date/publication')
    .describe('Directory structure organization pattern'),
  
  naming: z
    .enum(['slug', 'id', 'url-hash'])
    .optional()
    .default('slug')
    .describe('File naming strategy'),
  
  createSubfolders: z
    .boolean()
    .optional()
    .default(true)
    .describe('Create subfolders for organization'),
  
  deduplication: z
    .enum(['url-hash', 'content-hash', 'none'])
    .optional()
    .default('url-hash')
    .describe('Strategy to detect duplicate articles'),
});

/**
 * Logging configuration schema
 */
export const LoggingConfigSchema = z.object({
  level: z
    .enum(['debug', 'info', 'warn', 'error'])
    .optional()
    .default('info')
    .describe('Minimum log level to output'),
  
  format: z
    .enum(['text', 'json'])
    .optional()
    .default('text')
    .describe('Log output format'),
  
  file: z
    .string()
    .optional()
    .describe('Path to log file (optional, logs to console if not set)'),
});

/**
 * Complete application configuration schema
 */
export const ConfigSchema = z.object({
  browser: BrowserConfigSchema,
  llm: LLMConfigSchema,
  images: ImageConfigSchema,
  output: OutputConfigSchema,
  logging: LoggingConfigSchema,
});

/**
 * Inferred TypeScript type from schema
 */
export type Config = z.infer<typeof ConfigSchema>;
export type BrowserConfig = z.infer<typeof BrowserConfigSchema>;
export type LLMConfig = z.infer<typeof LLMConfigSchema>;
export type ImageConfig = z.infer<typeof ImageConfigSchema>;
export type OutputConfig = z.infer<typeof OutputConfigSchema>;
export type LoggingConfig = z.infer<typeof LoggingConfigSchema>;

/**
 * Validate config and return detailed error messages
 */
export function validateConfig(config: unknown): { success: true; data: Config } | { success: false; errors: string[] } {
  const result = ConfigSchema.safeParse(config);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errors = result.error.errors.map(err => {
    const path = err.path.join('.');
    const message = err.message;
    return `${path}: ${message}`;
  });
  
  return { success: false, errors };
}

/**
 * Get default configuration
 */
export function getDefaultConfig(): Config {
  return ConfigSchema.parse({
    browser: {
      timeout: 30000,
      headless: true,
    },
    llm: {
      type: 'ollama',
      baseUrl: 'http://localhost:11434',
      primaryModel: 'llama3.1',
      fallbackModels: ['mistral', 'qwen3:4b'],
    },
    images: {},
    output: {},
    logging: {},
  });
}
