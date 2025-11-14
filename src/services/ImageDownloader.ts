import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import sharp from 'sharp';
import { config } from '../config/index.js';
import { Image } from './ImageExtractor.js';

export interface LocalImage extends Image {
  localPath: string;
  relativePath: string;
  hash: string;
  optimized: boolean;
  width?: number;
  height?: number;
}

export class ImageDownloader {
  /**
   * Create output directory if it doesn't exist
   */
  private static ensureDir(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * Generate safe filename from URL
   */
  private static generateFilename(url: string, index: number): string {
    const hash = crypto.createHash('md5').update(url).digest('hex').substring(0, 8);
    const extension = path.extname(new URL(url).pathname) || '.jpg';
    return `image-${index}-${hash}${extension}`;
  }

  /**
   * Calculate file hash
   */
  private static async hashFile(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);

      stream.on('error', reject);
      stream.on('data', chunk => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
    });
  }

  /**
   * Download image from URL
   */
  static async downloadImage(
    url: string,
    _outputPath?: string,
    timeout = config.images.timeout
  ): Promise<Buffer> {
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      return response.data;
    } catch (error) {
      throw new Error(
        `Failed to download image from ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Optimize image
   */
  static async optimizeImage(
    inputPath: string,
    outputPath: string
  ): Promise<{ width: number; height: number }> {
    const maxWidth = config.images.maxWidth;
    const quality = config.images.quality;

    try {
      const metadata = await sharp(inputPath).metadata();

      // Resize if wider than max width
      if (metadata.width && metadata.width > maxWidth) {
        await sharp(inputPath)
          .resize(maxWidth, null, { withoutEnlargement: true })
          .jpeg({ quality })
          .toFile(outputPath);
      } else {
        // Just compress
        await sharp(inputPath).jpeg({ quality }).toFile(outputPath);
      }

      const finalMetadata = await sharp(outputPath).metadata();
      return {
        width: finalMetadata.width || 0,
        height: finalMetadata.height || 0,
      };
    } catch (error) {
      throw new Error(
        `Failed to optimize image: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Download and process a single image
   */
  static async processImage(
    image: Image,
    index: number,
    outputDir: string
  ): Promise<LocalImage> {
    this.ensureDir(outputDir);

    const filename = this.generateFilename(image.src, index);
    const localPath = path.join(outputDir, filename);
    const relativePath = path.join('images', filename);

    try {
      // Download
      const buffer = await this.downloadImage(image.src);
      const tempPath = path.join(outputDir, `temp-${filename}`);
      fs.writeFileSync(tempPath, buffer);

      // Calculate hash
      const hash = await this.hashFile(tempPath);

      // Optimize
      const dimensions = await this.optimizeImage(tempPath, localPath);

      // Clean up temp
      fs.unlinkSync(tempPath);

      return {
        ...image,
        localPath,
        relativePath,
        hash,
        optimized: true,
        width: dimensions.width,
        height: dimensions.height,
      };
    } catch (error) {
      throw new Error(
        `Failed to process image ${image.src}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Download multiple images with concurrency control
   */
  static async downloadImages(
    images: Image[],
    outputDir: string,
    maxConcurrent = config.images.maxConcurrent
  ): Promise<LocalImage[]> {
    this.ensureDir(outputDir);

    const results: LocalImage[] = [];
    const hashes = new Set<string>();

    // Process in batches
    for (let i = 0; i < images.length; i += maxConcurrent) {
      const batch = images.slice(i, i + maxConcurrent);

      const batchResults = await Promise.allSettled(
        batch.map((_image, index) => this.processImage(_image, i + index, outputDir))
      );

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          // Skip duplicates by hash
          if (!hashes.has(result.value.hash)) {
            hashes.add(result.value.hash);
            results.push(result.value);
          }
        }
        // Log failures but continue
      }
    }

    return results;
  }

  /**
   * Generate markdown for images
   */
  static generateImageMarkdown(images: LocalImage[]): string {
    if (images.length === 0) return '';

    let markdown = '## Images\n\n';

    for (const image of images) {
      if (image.isFeatureImage) {
        markdown += `![Featured Image](${image.relativePath})\n\n`;
      } else if (image.alt) {
        markdown += `![${image.alt}](${image.relativePath})\n`;
        if (image.title) {
          markdown += `*${image.title}*\n\n`;
        } else {
          markdown += '\n';
        }
      } else {
        markdown += `![Image](${image.relativePath})\n\n`;
      }
    }

    return markdown;
  }

  /**
   * Clean up downloaded images
   */
  static async cleanupImages(outputDir: string): Promise<void> {
    try {
      if (fs.existsSync(outputDir)) {
        fs.rmSync(outputDir, { recursive: true });
      }
    } catch (error) {
      console.error(
        `Failed to cleanup images: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
