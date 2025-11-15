import * as fs from 'fs';
import * as path from 'path';
import { config } from '../config/index.js';
import { ArticleMetadata, ContentExtractor } from './ContentExtractor.js';
import { LocalImage } from './ImageDownloader.js';
import { MarkdownGenerator } from './MarkdownGenerator.js';

export interface ArticleOutput {
  originalMarkdownPath: string;
  summarizedMarkdownPath: string;
  imageDirectory: string;
  images: LocalImage[];
  articleTitle: string;
}

export class FileOutput {
  /**
   * Create directory if it doesn't exist
   */
  private static ensureDir(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * Generate directory structure
   */
  private static generateOutputPath(metadata: ArticleMetadata): string {
    const baseDir = config.output.baseDir || './output/articles';

    if (config.output.structure === 'date/publication') {
      // Structure: output/articles/2024/November/example.com/
      const date = metadata.publishDate || new Date();
      const year = date.getFullYear();
      const month = date.toLocaleString('en-US', { month: 'long' });
      const domain = new URL(metadata.sourceUrl).hostname.replace('www.', '');

      return path.join(baseDir, String(year), month, domain);
    } else {
      // Structure: output/articles/example.com/2024/November/
      const date = metadata.publishDate || new Date();
      const year = date.getFullYear();
      const month = date.toLocaleString('en-US', { month: 'long' });
      const domain = new URL(metadata.sourceUrl).hostname.replace('www.', '');

      return path.join(baseDir, domain, String(year), month);
    }
  }

  /**
   * Generate unique filename to avoid conflicts
   */
  private static generateUniqueFilename(
    directory: string,
    baseFilename: string
  ): string {
    let filename = baseFilename;
    let counter = 1;

    while (fs.existsSync(path.join(directory, filename))) {
      // Insert counter before extension
      const [name, ext] = baseFilename.split(/(\.[^.]+)$/);
      filename = `${name}_${counter}${ext}`;
      counter++;
    }

    return filename;
  }

  /**
   * Save original article markdown
   */
  static saveOriginalArticle(
    metadata: ArticleMetadata,
    markdown: string,
    images: LocalImage[] = []
  ): string {
    const outputDir = this.generateOutputPath(metadata);
    this.ensureDir(outputDir);

    // Generate filename
    const baseFilename = MarkdownGenerator.generateSafeFilename(metadata.title, 'original');
    const filename = this.generateUniqueFilename(outputDir, baseFilename);
    const filePath = path.join(outputDir, filename);

    // Replace image URLs in markdown with local paths
    let processedMarkdown = markdown;
    if (images.length > 0) {
      processedMarkdown = ContentExtractor.replaceImageUrls(markdown, images);
    }

    // Generate markdown content with images
    const content = MarkdownGenerator.generateOriginalArticle(metadata, processedMarkdown, images, {
      includeImages: true,
      includeMetadata: true,
      imageBasePath: './images',
    });

    // Write file
    fs.writeFileSync(filePath, content, 'utf-8');

    return filePath;
  }

  /**
   * Save summarized article markdown
   */
  static saveSummarizedArticle(
    metadata: ArticleMetadata,
    summaryResult: any, // SummarizationResult
    images: LocalImage[] = [],
    originalMarkdownPath?: string
  ): string {
    const outputDir = this.generateOutputPath(metadata);
    this.ensureDir(outputDir);

    // Generate filename
    const baseFilename = MarkdownGenerator.generateSafeFilename(metadata.title, 'summarized');
    const filename = this.generateUniqueFilename(outputDir, baseFilename);
    const filePath = path.join(outputDir, filename);

    // Convert to relative path if original markdown is in same directory
    let originalMarkdownUrl = originalMarkdownPath;
    if (originalMarkdownPath && originalMarkdownPath.startsWith(outputDir)) {
      originalMarkdownUrl = path.relative(path.dirname(filePath), originalMarkdownPath);
    }

    // Generate markdown content
    const content = MarkdownGenerator.generateSummaryArticle(
      metadata,
      summaryResult,
      images,
      originalMarkdownUrl,
      {
        includeImages: true,
        includeMetadata: true,
        imageBasePath: './images',
      }
    );

    // Write file
    fs.writeFileSync(filePath, content, 'utf-8');

    return filePath;
  }

  /**
   * Save images for article
   */
  static saveImages(
    images: LocalImage[],
    metadata: ArticleMetadata
  ): LocalImage[] {
    const outputDir = this.generateOutputPath(metadata);
    const imagesDir = path.join(outputDir, 'images');
    this.ensureDir(imagesDir);

    const savedImages: LocalImage[] = [];

    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      const newFilename = MarkdownGenerator.generateImageFilename(
        metadata.title,
        i,
        path.extname(image.localPath)
      );
      const newPath = path.join(imagesDir, newFilename);

      try {
        // Copy image file
        fs.copyFileSync(image.localPath, newPath);

        // Update image path
        savedImages.push({
          ...image,
          localPath: newPath,
          relativePath: path.relative(outputDir, newPath),
        });
      } catch (error) {
        console.error(`Failed to copy image ${image.src}:`, error);
      }
    }

    return savedImages;
  }

  /**
   * Save complete article with original and summarized versions
   */
  static async saveCompleteArticle(
    metadata: ArticleMetadata,
    originalMarkdown: string,
    summaryResult: any, // SummarizationResult
    images: LocalImage[] = []
  ): Promise<ArticleOutput> {
    const outputDir = this.generateOutputPath(metadata);
    this.ensureDir(outputDir);

    // Copy and organize images
    const savedImages = this.saveImages(images, metadata);

    // Save original article
    const originalPath = this.saveOriginalArticle(metadata, originalMarkdown, savedImages);

    // Save summarized article
    const summarizedPath = this.saveSummarizedArticle(
      metadata,
      summaryResult,
      savedImages,
      originalPath
    );

    return {
      originalMarkdownPath: originalPath,
      summarizedMarkdownPath: summarizedPath,
      imageDirectory: path.join(outputDir, 'images'),
      images: savedImages,
      articleTitle: metadata.title,
    };
  }

  /**
   * Get article statistics
   */
  static getArticleStats(articleOutput: ArticleOutput): Record<string, unknown> {
    const originalContent = fs.readFileSync(articleOutput.originalMarkdownPath, 'utf-8');
    const summarizedContent = fs.readFileSync(articleOutput.summarizedMarkdownPath, 'utf-8');

    const originalWords = originalContent.split(/\s+/).length;
    const summarizedWords = summarizedContent.split(/\s+/).length;

    return {
      articleTitle: articleOutput.articleTitle,
      originalWords,
      summarizedWords,
      compressionRatio: (summarizedWords / originalWords * 100).toFixed(1) + '%',
      imageCount: articleOutput.images.length,
      originalFile: path.basename(articleOutput.originalMarkdownPath),
      summarizedFile: path.basename(articleOutput.summarizedMarkdownPath),
      imageDirectory: path.basename(articleOutput.imageDirectory),
    };
  }

  /**
   * Generate index file listing all articles
   */
  static generateIndexFile(baseDir = config.output.baseDir): void {
    const indexPath = path.join(baseDir, 'INDEX.md');
    let indexContent = '# Article Extractor - Index\n\n';
    indexContent += `Generated: ${new Date().toISOString()}\n\n`;
    indexContent += '## Articles\n\n';

    const articles = this.findAllArticles(baseDir);

    for (const article of articles) {
      const relPath = path.relative(baseDir, article.summarizedPath);
      indexContent += `- [${article.title}](${relPath})\n`;
    }

    fs.writeFileSync(indexPath, indexContent, 'utf-8');
  }

  /**
   * Find all articles in output directory
   */
  private static findAllArticles(
    baseDir: string,
    results: Array<{ title: string; summarizedPath: string }> = []
  ): Array<{ title: string; summarizedPath: string }> {
    if (!fs.existsSync(baseDir)) {
      return results;
    }

    const entries = fs.readdirSync(baseDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(baseDir, entry.name);

      if (entry.isDirectory()) {
        this.findAllArticles(fullPath, results);
      } else if (entry.name.startsWith('summarized_') && entry.name.endsWith('.md')) {
        // Extract title from filename
        const title = entry.name
          .replace('summarized_', '')
          .replace('.md', '')
          .replace(/_/g, ' ');

        results.push({
          title,
          summarizedPath: fullPath,
        });
      }
    }

    return results;
  }

  /**
   * Clean up old articles
   */
  static cleanupOldArticles(baseDir = config.output.baseDir, daysOld = 30): number {
    const cutoffTime = Date.now() - daysOld * 24 * 60 * 60 * 1000;
    let deletedCount = 0;

    const removeOldFiles = (dir: string): void => {
      if (!fs.existsSync(dir)) return;

      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const stats = fs.statSync(fullPath);

        if (stats.mtimeMs < cutoffTime) {
          if (entry.isDirectory()) {
            fs.rmSync(fullPath, { recursive: true });
          } else {
            fs.unlinkSync(fullPath);
          }
          deletedCount++;
        } else if (entry.isDirectory()) {
          removeOldFiles(fullPath);
        }
      }
    };

    removeOldFiles(baseDir);
    return deletedCount;
  }
}
