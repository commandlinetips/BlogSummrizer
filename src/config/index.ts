import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Configuration schema
const configSchema = z.object({
  browser: z.object({
    timeout: z.number().min(5000),
    headless: z.boolean(),
    antiDetection: z.boolean().optional().default(true),
    retries: z.number().min(1).optional().default(3),
  }),
  llm: z.object({
    type: z.enum(['ollama', 'claude', 'openai']),
    baseUrl: z.string().url().optional(),
    primaryModel: z.string(),
    fallbackModels: z.array(z.string()).optional().default([]),
    summaryLength: z.enum(['short', 'medium', 'long']).optional().default('medium'),
    temperature: z.number().min(0).max(1).optional().default(0.5),
    timeout: z.number().min(10000).optional().default(120000),
    streaming: z.boolean().optional().default(true),
    caching: z.boolean().optional().default(true),
    cacheDir: z.string().optional().default('./cache/summaries'),
  }),
  images: z.object({
    maxWidth: z.number().min(100).optional().default(1200),
    quality: z.number().min(1).max(100).optional().default(80),
    maxConcurrent: z.number().min(1).optional().default(5),
    timeout: z.number().min(1000).optional().default(10000),
  }),
  output: z.object({
    baseDir: z.string().optional().default('./output/articles'),
    structure: z.enum(['date/publication', 'publication/date']).optional().default('date/publication'),
    naming: z.enum(['slug', 'id', 'url-hash']).optional().default('slug'),
    createSubfolders: z.boolean().optional().default(true),
    deduplication: z.enum(['url-hash', 'content-hash', 'none']).optional().default('url-hash'),
  }),
  logging: z.object({
    level: z.enum(['debug', 'info', 'warn', 'error']).optional().default('info'),
    format: z.enum(['text', 'json']).optional().default('text'),
    file: z.string().optional(),
  }),
});

type Config = z.infer<typeof configSchema>;

function loadConfig(): Config {
  try {
    // Load default config
    const defaultConfigPath = resolve('config/default.json');
    const defaultConfigContent = readFileSync(defaultConfigPath, 'utf-8');
    const defaultConfig = JSON.parse(defaultConfigContent);

    // Merge with environment variables overrides
    const config: any = {
      ...defaultConfig,
      llm: {
        ...defaultConfig.llm,
        baseUrl: process.env.OLLAMA_BASE_URL || defaultConfig.llm.baseUrl,
        primaryModel: process.env.OLLAMA_PRIMARY_MODEL || defaultConfig.llm.primaryModel,
        timeout: process.env.OLLAMA_TIMEOUT
          ? parseInt(process.env.OLLAMA_TIMEOUT)
          : defaultConfig.llm.timeout,
      },
      browser: {
        ...defaultConfig.browser,
        headless: process.env.BROWSER_HEADLESS !== 'false',
        timeout: process.env.BROWSER_TIMEOUT
          ? parseInt(process.env.BROWSER_TIMEOUT)
          : defaultConfig.browser.timeout,
      },
      output: {
        ...defaultConfig.output,
        baseDir: process.env.OUTPUT_DIR || defaultConfig.output.baseDir,
      },
      logging: {
        ...defaultConfig.logging,
        level: process.env.LOG_LEVEL || defaultConfig.logging.level,
      },
    };

    // Validate against schema
    return configSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Configuration validation error:', error.errors);
      throw new Error('Invalid configuration');
    }
    throw error;
  }
}

export const config = loadConfig();
export type { Config };
