import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { FileOutput } from '../../src/services/FileOutput.js';
import { ArticleMetadata } from '../../src/services/ContentExtractor.js';
import { LocalImage } from '../../src/services/ImageDownloader.js';
import { SummarizationResult } from '../../src/services/OllamaClient.js';

describe('FileOutput', () => {
  const testDir = './test_output';
  const testMetadata: ArticleMetadata = {
    title: 'Test Article',
    author: 'Test Author',
    publishDate: new Date('2024-01-15'),
    sourceUrl: 'https://example.com/article',
    description: 'Test description',
  };

  const testImages: LocalImage[] = [
    {
      src: 'https://example.com/image1.jpg',
      alt: 'Test Image',
      localPath: path.join(testDir, 'temp', 'image1.jpg'),
      relativePath: 'images/image1.jpg',
      isFeatureImage: true,
      width: 1200,
      height: 800,
      hash: 'abc123def456',
      optimized: true,
    },
  ];

  const testSummary: SummarizationResult = {
    summary: 'Test summary content',
    model: 'llama3.1',
    processingTime: 2000,
  };

  beforeEach(() => {
    // Create temp directory for test images
    if (!fs.existsSync(path.join(testDir, 'temp'))) {
      fs.mkdirSync(path.join(testDir, 'temp'), { recursive: true });
    }
    // Create dummy image file
    fs.writeFileSync(path.join(testDir, 'temp', 'image1.jpg'), Buffer.from('fake image'));
  });

  afterEach(() => {
    // Clean up test output
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  describe('saveOriginalArticle', () => {
    it('should create output directory structure', () => {
      const result = FileOutput.saveOriginalArticle(testMetadata, '# Content', []);

      expect(fs.existsSync(path.dirname(result))).toBe(true);
    });

    it('should save markdown file with correct naming', () => {
      const result = FileOutput.saveOriginalArticle(testMetadata, '# Content', []);

      expect(result).toMatch(/original_test_article(_\d+)?\.md$/);
      expect(result).toContain('original_test_article');
      expect(fs.existsSync(result)).toBe(true);
    });

    it('should include article metadata in output', () => {
      const markdown = '## Test Section\n\nContent here.';
      const result = FileOutput.saveOriginalArticle(testMetadata, markdown, testImages);

      const content = fs.readFileSync(result, 'utf-8');
      expect(content).toContain('# Test Article');
      expect(content).toContain('**Author**: Test Author');
      expect(content).toContain('## Test Section');
    });

    it('should include image references', () => {
      const result = FileOutput.saveOriginalArticle(testMetadata, 'Content', testImages);

      const content = fs.readFileSync(result, 'utf-8');
      expect(content).toContain('## Images');
      expect(content).toContain('./images/');
    });

    it('should handle duplicate filenames', () => {
      const result1 = FileOutput.saveOriginalArticle(testMetadata, 'Content 1', []);
      const result2 = FileOutput.saveOriginalArticle(testMetadata, 'Content 2', []);

      expect(result1).not.toBe(result2);
      expect(fs.existsSync(result1)).toBe(true);
      expect(fs.existsSync(result2)).toBe(true);
    });
  });

  describe('saveSummarizedArticle', () => {
    it('should save summarized article with correct naming', () => {
      const result = FileOutput.saveSummarizedArticle(testMetadata, testSummary, []);

      expect(result).toMatch(/summarized_test_article(_\d+)?\.md$/);
      expect(result).toContain('summarized_test_article');
      expect(fs.existsSync(result)).toBe(true);
    });

    it('should include summary content', () => {
      const result = FileOutput.saveSummarizedArticle(testMetadata, testSummary, []);

      const content = fs.readFileSync(result, 'utf-8');
      expect(content).toContain('# Test Article - Summary');
      expect(content).toContain('Test summary content');
    });

    it('should include model information', () => {
      const result = FileOutput.saveSummarizedArticle(testMetadata, testSummary, []);

      const content = fs.readFileSync(result, 'utf-8');
      expect(content).toContain('llama3.1');
      expect(content).toContain('### Article Information');
    });

    it('should include original markdown link when provided', () => {
      const originalPath = '/path/to/original.md';
      const result = FileOutput.saveSummarizedArticle(
        testMetadata,
        testSummary,
        [],
        originalPath
      );

      const content = fs.readFileSync(result, 'utf-8');
      expect(content).toContain('Read Full Article');
    });

    it('should format processing time correctly', () => {
      const result = FileOutput.saveSummarizedArticle(testMetadata, testSummary, []);

      const content = fs.readFileSync(result, 'utf-8');
      expect(content).toContain('2.00s');
    });
  });

  describe('saveImages', () => {
    it('should create images directory', () => {
      const result = FileOutput.saveImages(testImages, testMetadata);

      const imagesDir = path.join(path.dirname(result[0].localPath), '..');
      expect(fs.existsSync(imagesDir)).toBe(true);
    });

    it('should copy image files', () => {
      const result = FileOutput.saveImages(testImages, testMetadata);

      expect(result.length).toBe(testImages.length);
      expect(fs.existsSync(result[0].localPath)).toBe(true);
    });

    it('should update relative paths', () => {
      const result = FileOutput.saveImages(testImages, testMetadata);

      expect(result[0].relativePath).toMatch(/^images\//);
      expect(result[0].relativePath).toMatch(/\.jpg$/);
    });

    it('should preserve image metadata', () => {
      const result = FileOutput.saveImages(testImages, testMetadata);

      expect(result[0].src).toBe(testImages[0].src);
      expect(result[0].alt).toBe(testImages[0].alt);
      expect(result[0].isFeatureImage).toBe(testImages[0].isFeatureImage);
    });

    it('should handle empty image list', () => {
      const result = FileOutput.saveImages([], testMetadata);

      expect(result).toEqual([]);
    });
  });

  describe('saveCompleteArticle', () => {
    it('should save both original and summarized versions', async () => {
      const result = await FileOutput.saveCompleteArticle(
        testMetadata,
        '# Original Content',
        testSummary,
        testImages
      );

      expect(fs.existsSync(result.originalMarkdownPath)).toBe(true);
      expect(fs.existsSync(result.summarizedMarkdownPath)).toBe(true);
    });

    it('should return ArticleOutput with correct paths', async () => {
      const result = await FileOutput.saveCompleteArticle(
        testMetadata,
        'Content',
        testSummary,
        testImages
      );

      expect(result).toHaveProperty('originalMarkdownPath');
      expect(result).toHaveProperty('summarizedMarkdownPath');
      expect(result).toHaveProperty('imageDirectory');
      expect(result).toHaveProperty('images');
      expect(result).toHaveProperty('articleTitle');
    });

    it('should set correct article title', async () => {
      const result = await FileOutput.saveCompleteArticle(
        testMetadata,
        'Content',
        testSummary,
        testImages
      );

      expect(result.articleTitle).toBe('Test Article');
    });

    it('should preserve images through process', async () => {
      const result = await FileOutput.saveCompleteArticle(
        testMetadata,
        'Content',
        testSummary,
        testImages
      );

      expect(result.images.length).toBe(testImages.length);
      expect(result.images[0].src).toBe(testImages[0].src);
    });

    it('should create image directory', async () => {
      const result = await FileOutput.saveCompleteArticle(
        testMetadata,
        'Content',
        testSummary,
        testImages
      );

      expect(fs.existsSync(result.imageDirectory)).toBe(true);
    });

    it('should work without images', async () => {
      const result = await FileOutput.saveCompleteArticle(
        testMetadata,
        'Content',
        testSummary,
        []
      );

      expect(result.images.length).toBe(0);
      expect(fs.existsSync(result.originalMarkdownPath)).toBe(true);
      expect(fs.existsSync(result.summarizedMarkdownPath)).toBe(true);
    });
  });

  describe('getArticleStats', () => {
    it('should calculate word counts', async () => {
      const result = await FileOutput.saveCompleteArticle(
        testMetadata,
        'This is original content with words.',
        testSummary,
        []
      );

      const stats = FileOutput.getArticleStats(result);

      expect(stats).toHaveProperty('originalWords');
      expect(stats).toHaveProperty('summarizedWords');
      expect((stats.originalWords as number) > 0).toBe(true);
    });

    it('should calculate compression ratio', async () => {
      const result = await FileOutput.saveCompleteArticle(
        testMetadata,
        'Original content is longer and has more words.',
        testSummary,
        []
      );

      const stats = FileOutput.getArticleStats(result);

      expect(stats.compressionRatio).toMatch(/%$/);
    });

    it('should include image count', async () => {
      const result = await FileOutput.saveCompleteArticle(
        testMetadata,
        'Content',
        testSummary,
        testImages
      );

      const stats = FileOutput.getArticleStats(result);

      expect(stats.imageCount).toBe(testImages.length);
    });

    it('should include file information', async () => {
      const result = await FileOutput.saveCompleteArticle(
        testMetadata,
        'Content',
        testSummary,
        testImages
      );

      const stats = FileOutput.getArticleStats(result);

      expect(stats).toHaveProperty('articleTitle');
      expect(stats).toHaveProperty('originalFile');
      expect(stats).toHaveProperty('summarizedFile');
      expect(stats).toHaveProperty('imageDirectory');
    });
  });

  describe('cleanupOldArticles', () => {
    it('should not delete recent articles', async () => {
      const result = await FileOutput.saveCompleteArticle(
        testMetadata,
        'Content',
        testSummary,
        []
      );

      const deletedCount = FileOutput.cleanupOldArticles(testDir, 30);

      expect(deletedCount).toBe(0);
      expect(fs.existsSync(result.originalMarkdownPath)).toBe(true);
    });

    it('should handle non-existent directory', () => {
      const deletedCount = FileOutput.cleanupOldArticles('./non_existent_dir', 30);

      expect(deletedCount).toBe(0);
    });

    it('should return deletion count', async () => {
      // Create old file
      const oldDir = path.join(testDir, 'old_articles');
      fs.mkdirSync(oldDir, { recursive: true });
      const oldFile = path.join(oldDir, 'old.md');
      fs.writeFileSync(oldFile, 'old content');

      // Set modification time to past
      const pastTime = Date.now() - 60 * 24 * 60 * 60 * 1000; // 60 days ago
      fs.utimesSync(oldFile, pastTime / 1000, pastTime / 1000);

      const deletedCount = FileOutput.cleanupOldArticles(testDir, 30);

      expect(deletedCount).toBeGreaterThan(0);
      expect(fs.existsSync(oldFile)).toBe(false);
    });
  });

  describe('Directory Structure', () => {
    it('should create consistent directory structure across calls', async () => {
      const article1 = await FileOutput.saveCompleteArticle(
        { ...testMetadata, publishDate: new Date('2024-01-15') },
        'Content 1',
        testSummary,
        []
      );

      const article2 = await FileOutput.saveCompleteArticle(
        { ...testMetadata, publishDate: new Date('2024-01-15'), title: 'Different Article' },
        'Content 2',
        testSummary,
        []
      );

      const dir1 = path.dirname(article1.originalMarkdownPath);
      const dir2 = path.dirname(article2.originalMarkdownPath);

      // Same date and source should be in same directory
      expect(dir1).toBe(dir2);
    });

    it('should organize by date', async () => {
      const result = await FileOutput.saveCompleteArticle(
        testMetadata,
        'Content',
        testSummary,
        []
      );

      const pathComponents = result.originalMarkdownPath.split(path.sep);
      expect(pathComponents).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/2024/),
          expect.stringMatching(/[A-Z][a-z]+/), // Month name
        ])
      );
    });
  });
});
