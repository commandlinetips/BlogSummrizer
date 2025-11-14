#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { extractSingleArticle } from './commands/extract.js';
import { batchExtract } from './commands/batch.js';
import { listArticles } from './commands/list.js';
import { cleanupCommand } from './commands/cleanup.js';
import { checkStatus } from './commands/status.js';

const program = new Command();

// Header with branding
console.log(chalk.cyan.bold('\n╔════════════════════════════════════════════════════════╗'));
console.log(chalk.cyan.bold('║     📰  Article Extractor with Local Ollama  📰        ║'));
console.log(chalk.cyan.bold('║      Extract & Summarize Paywalled Articles             ║'));
console.log(chalk.cyan.bold('╚════════════════════════════════════════════════════════╝\n'));

program
  .name('article-extractor')
  .description(chalk.gray('CLI tool to extract, summarize, and archive paywalled articles'))
  .version('0.1.0');

// Extract command
program
  .command('extract <url>')
  .alias('e')
  .description(chalk.green('Extract and summarize a single article'))
  .option('-c, --cookies <file>', 'Path to cookies file (JSON or Netscape format)')
  .option('-m, --model <model>', 'Ollama model to use (default: llama3.1)')
  .option('--no-summary', 'Skip summarization, extract content only')
  .option('--no-images', 'Skip image extraction')
  .option('-l, --length <length>', 'Summary length: short, medium, long (default: medium)', 'medium')
  .option('-o, --output <dir>', 'Output directory (default: ./output/articles)')
  .action(async (url, options) => {
    const spinner = ora({
      text: chalk.blue('Initializing extraction...'),
      prefixText: chalk.gray('[1/5]'),
    }).start();

    try {
      await extractSingleArticle(url, options, spinner);
    } catch (error) {
      spinner.fail(chalk.red('Extraction failed'));
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Batch command
program
  .command('batch <file>')
  .alias('b')
  .description(chalk.green('Extract and summarize multiple articles from a file'))
  .option('-c, --cookies <file>', 'Path to cookies file')
  .option('-m, --model <model>', 'Ollama model to use (default: llama3.1)')
  .option('--no-summary', 'Skip summarization')
  .option('-o, --output <dir>', 'Output directory')
  .option('--parallel <number>', 'Number of parallel downloads (default: 1)', '1')
  .action(async (file, options) => {
    const spinner = ora({
      text: chalk.blue('Starting batch extraction...'),
      prefixText: chalk.gray('[1/5]'),
    }).start();

    try {
      await batchExtract(file, options, spinner);
    } catch (error) {
      spinner.fail(chalk.red('Batch extraction failed'));
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// List command
program
  .command('list [directory]')
  .alias('ls')
  .description(chalk.yellow('List all extracted articles'))
  .option('--sort <field>', 'Sort by: date, title, size (default: date)', 'date')
  .option('--limit <number>', 'Limit results (default: 10)', '10')
  .action(async (directory, options) => {
    try {
      await listArticles(directory, options);
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Cleanup command
program
  .command('cleanup [directory]')
  .alias('clean')
  .description(chalk.yellow('Remove articles older than specified days'))
  .option('--days <number>', 'Remove articles older than N days (default: 30)', '30')
  .option('--dry-run', 'Show what would be deleted without deleting')
  .action(async (directory, options) => {
    try {
      await cleanupCommand(directory, options);
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Status/Info command
program
  .command('status')
  .alias('st')
  .description(chalk.cyan('Check system status (Ollama, models, etc.)'))
  .action(async () => {
    const spinner = ora(chalk.blue('Checking system status...')).start();
    try {
      await checkStatus(spinner);
    } catch (error) {
      spinner.fail(chalk.red('Status check failed'));
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Help for extract with example
program
  .command('example')
  .alias('ex')
  .description(chalk.cyan('Show usage examples'))
  .action(() => {
    console.log(chalk.bold.cyan('\n📚 Usage Examples:\n'));

    console.log(chalk.green('1. Extract a single article with summary:'));
    console.log(chalk.gray('   $ article-extractor extract https://example.com/article\\'));
    console.log(chalk.gray('     --cookies cookies.json --model llama3.1\n'));

    console.log(chalk.green('2. Extract without summary (content only):'));
    console.log(chalk.gray('   $ article-extractor extract https://example.com/article --no-summary\n'));

    console.log(chalk.green('3. Batch extract from URL list:'));
    console.log(chalk.gray('   $ article-extractor batch urls.txt --cookies cookies.json\n'));

    console.log(chalk.green('4. List all extracted articles:'));
    console.log(chalk.gray('   $ article-extractor list\n'));

    console.log(chalk.green('5. Check system status:'));
    console.log(chalk.gray('   $ article-extractor status\n'));

    console.log(chalk.green('6. Clean up old articles:'));
    console.log(chalk.gray('   $ article-extractor cleanup --days 30\n'));
  });

program.parse(process.argv);

// Show help if no command provided
if (process.argv.length < 3) {
  program.outputHelp();
}
