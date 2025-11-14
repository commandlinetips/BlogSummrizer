import chalk from 'chalk';
import { Ora } from 'ora';
import fs from 'fs/promises';
import { extractSingleArticle, type ExtractOptions } from './extract.js';

interface BatchOptions extends ExtractOptions {
  parallel?: string;
}

export async function batchExtract(
  filePath: string,
  options: BatchOptions,
  spinner: Ora
): Promise<void> {
  try {
    // Read URLs from file
    spinner.text = chalk.blue('Reading URLs from file...');
    const content = await fs.readFile(filePath, 'utf-8');
    const urls = content
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'));

    if (urls.length === 0) {
      spinner.fail(chalk.red('No URLs found in file'));
      throw new Error(`No valid URLs in ${filePath}`);
    }

    spinner.succeed(chalk.green(`Found ${urls.length} URLs to process`));

    const parallelCount = parseInt(options.parallel || '1', 10) || 1;
    console.log(
      chalk.cyan(`\nProcessing ${urls.length} articles (${parallelCount} parallel)...\n`)
    );

    // Process URLs in batches
    for (let i = 0; i < urls.length; i += parallelCount) {
      const batch = urls.slice(i, i + parallelCount);
      const batchNum = Math.floor(i / parallelCount) + 1;
      const totalBatches = Math.ceil(urls.length / parallelCount);

      console.log(chalk.cyan(`\n[Batch ${batchNum}/${totalBatches}]`));

      const promises = batch.map((url) =>
        extractSingleArticle(url, options, spinner).catch((error) => {
          console.error(chalk.red(`Error processing ${url}:`), error instanceof Error ? error.message : error);
        })
      );

      await Promise.all(promises);
    }

    console.log(chalk.green.bold(`\n✅ Batch extraction complete! Processed ${urls.length} articles\n`));
  } catch (error) {
    spinner.fail(chalk.red('Batch extraction failed'));
    throw error;
  }
}
