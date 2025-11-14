import chalk from 'chalk';
import { Ora } from 'ora';
import { BrowserEngine } from '../../services/BrowserEngine.js';
import { CookieManager } from '../../services/CookieManager.js';
import { ContentExtractor } from '../../services/ContentExtractor.js';
import { ImageExtractor } from '../../services/ImageExtractor.js';
import { ImageDownloader } from '../../services/ImageDownloader.js';
import { OllamaClient } from '../../services/OllamaClient.js';
import { FileOutput } from '../../services/FileOutput.js';

export interface ExtractOptions {
  cookies?: string;
  model?: string;
  summary?: boolean;
  images?: boolean;
  length?: 'short' | 'medium' | 'long';
  output?: string;
}

export async function extractSingleArticle(
  url: string,
  options: ExtractOptions,
  spinner: Ora
): Promise<void> {
  let browser: BrowserEngine | null = null;

  try {
    // Step 1: Load cookies
    spinner.text = chalk.blue('Loading cookies...');
    spinner.prefixText = chalk.gray('[1/6]');

    let cookies: any[] = [];
    if (options.cookies) {
      cookies = CookieManager.loadCookiesFromFile(options.cookies);
      spinner.succeed(chalk.green(`Loaded ${cookies.length} cookies`));
    } else {
      spinner.warn(chalk.yellow('No cookies provided - may not access paywalled content'));
    }

    // Step 2: Load page
    spinner.start(chalk.blue('Loading article page...'));
    spinner.prefixText = chalk.gray('[2/6]');

    browser = new BrowserEngine();
    const page = await browser.loadPageWithCookies({
      url,
      cookies,
      timeout: 30000,
    });

    spinner.succeed(chalk.green('Page loaded successfully'));

    // Step 3: Extract content
    spinner.start(chalk.blue('Extracting article content...'));
    spinner.prefixText = chalk.gray('[3/6]');

    const containerSelector = await ContentExtractor.identifyArticleContainer(page);
    const content = await ContentExtractor.extractContent(page, url, containerSelector || undefined);

    spinner.succeed(
      chalk.green(`Extracted: "${content.metadata.title}" (${ContentExtractor.getWordCount(content.text)} words)`)
    );

    // Step 4: Extract and download images
    let images: any[] = [];
    if (options.images !== false) {
      spinner.start(chalk.blue('Extracting and downloading images...'));
      spinner.prefixText = chalk.gray('[4/6]');

      const pageImages = await ImageExtractor.extractDownloadableImages(page, url, containerSelector || undefined);
      if (pageImages.length > 0) {
        const tempImagesDir = './temp_images';
        images = await ImageDownloader.downloadImages(pageImages, tempImagesDir);
        spinner.succeed(chalk.green(`Downloaded ${images.length} images`));
      } else {
        spinner.warn(chalk.yellow('No images found'));
      }
    } else {
      console.log(chalk.gray('Image extraction skipped'));
    }

    // Step 5: Generate summary
    let summaryResult = null;
    if (options.summary !== false) {
      spinner.start(chalk.blue('Generating AI summary...'));
      spinner.prefixText = chalk.gray('[5/6]');

      const ollamaClient = new OllamaClient();
      const isRunning = await ollamaClient.isRunning();

      if (!isRunning) {
        spinner.warn(chalk.yellow('Ollama server not running - skipping summary'));
      } else {
        const model = options.model || 'llama3.1';
        try {
          summaryResult = await ollamaClient.generateSummary(content.text, {
            model,
            length: (options.length || 'medium') as 'short' | 'medium' | 'long',
          });
          spinner.succeed(chalk.green(`Summary generated with ${model} (${(summaryResult.processingTime / 1000).toFixed(1)}s)`));
        } catch (error) {
          spinner.warn(chalk.yellow(`Summary generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      }
    } else {
      console.log(chalk.gray('Summarization skipped'));
    }

    // Step 6: Save files
    spinner.start(chalk.blue('Saving article and images...'));
    spinner.prefixText = chalk.gray('[6/6]');

    const articleOutput = await FileOutput.saveCompleteArticle(
      content.metadata,
      content.markdown,
      summaryResult || { summary: '[Summarization skipped]', model: 'N/A', processingTime: 0 },
      images
    );

    spinner.succeed(chalk.green('Article and files saved'));

    // Close browser
    if (browser) {
      await browser.close();
    }

    // Print summary
    console.log(chalk.bold.cyan('\n✅ Extraction Complete!\n'));
    const stats = FileOutput.getArticleStats(articleOutput);

    console.log(chalk.bold('Article Details:'));
    console.log(chalk.gray(`  Title: ${stats.articleTitle}`));
    console.log(chalk.gray(`  Original: ${stats.originalWords} words`));
    console.log(chalk.gray(`  Summary: ${stats.summarizedWords} words (${stats.compressionRatio})`));
    console.log(chalk.gray(`  Images: ${stats.imageCount}`));

    console.log(chalk.bold('\nOutput Files:'));
    console.log(chalk.green(`  📄 Original: ${stats.originalFile}`));
    console.log(chalk.green(`  📋 Summary: ${stats.summarizedFile}`));
    console.log(chalk.green(`  🖼️  Images: ${stats.imageDirectory}/`));

    console.log(chalk.bold('\nPaths:'));
    console.log(chalk.cyan(`  ${articleOutput.originalMarkdownPath}`));
    console.log(chalk.cyan(`  ${articleOutput.summarizedMarkdownPath}\n`));
  } catch (error) {
    if (browser) {
      try {
        await browser.close();
      } catch (_e) {
        // Ignore cleanup errors
      }
    }
    throw error;
  }
}
