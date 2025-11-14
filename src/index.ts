/**
 * Article Extractor - Main Entry Point
 * A tool to extract and summarize paywalled articles using browser automation and local Ollama
 */

import { config } from './config/index.js';

console.log('Article Extractor initialized');
console.log(`LLM: ${config.llm.type} - ${config.llm.primaryModel}`);
console.log(`Browser timeout: ${config.browser.timeout}ms`);
console.log(`Output directory: ${config.output.baseDir}`);
