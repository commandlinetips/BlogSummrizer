import { describe, it, expect } from '@jest/globals';
import { MarkdownGenerator } from '../../src/services/MarkdownGenerator.js';
import { ArticleMetadata } from '../../src/services/ContentExtractor.js';
import { LocalImage } from '../../src/services/ImageDownloader.js';
import { SummarizationResult } from '../../src/services/OllamaClient.js';

describe('MarkdownGenerator', () => {
  const testMetadata: ArticleMetadata = {
    title: 'Test Article Title',
    author: 'John Doe',
    publishDate: new Date('2024-01-15'),
    sourceUrl: 'https://example.com/article/test-article',
    description: 'This is a test article description',
  };

  const testImages: LocalImage[] = [
    {
      src: 'https://example.com/image1.jpg',
      alt: 'Test Image 1',
      title: 'First Image',
      localPath: '/tmp/image1.jpg',
      relativePath: 'images/image1.jpg',
      isFeatureImage: true,
      width: 1200,
      height: 800,
      hash: 'abc123def456',
      optimized: true,
    },
    {
      src: 'https://example.com/image2.jpg',
      alt: 'Test Image 2',
      localPath: '/tmp/image2.jpg',
      relativePath: 'images/image2.jpg',
      isFeatureImage: false,
      hash: 'xyz789uvw012',
      optimized: true,
    },
  ];

  const testSummary: SummarizationResult = {
    summary: 'This is a test summary of the article content.',
    model: 'llama3.1',
    tokensUsed: 150,
    processingTime: 2500,
  };

  describe('generateMetadataHeader', () => {
    it('should generate header with all metadata', () => {
      const header = MarkdownGenerator.generateMetadataHeader(testMetadata);

      expect(header).toContain('# Test Article Title');
      expect(header).toContain('**Author**: John Doe');
      expect(header).toContain('**Published**: January 15, 2024');
      expect(header).toContain('**Source**:');
      expect(header).toContain('[example.com]');
      expect(header).toContain('This is a test article description');
    });

    it('should skip metadata when includeMetadata is false', () => {
      const header = MarkdownGenerator.generateMetadataHeader(testMetadata, false);
      expect(header).toBe('');
    });

    it('should handle missing author', () => {
      const metadataNoAuthor = { ...testMetadata, author: undefined };
      const header = MarkdownGenerator.generateMetadataHeader(metadataNoAuthor);

      expect(header).not.toContain('**Author**');
      expect(header).toContain('**Published**');
    });

    it('should handle missing date', () => {
      const metadataNoDate = { ...testMetadata, publishDate: undefined };
      const header = MarkdownGenerator.generateMetadataHeader(metadataNoDate);

      expect(header).not.toContain('**Published**');
      expect(header).toContain('**Author**');
    });

    it('should extract domain from source URL', () => {
      const header = MarkdownGenerator.generateMetadataHeader(testMetadata);
      expect(header).toContain('example.com');
    });
  });

  describe('generateImagesSection', () => {
    it('should generate images section with featured image first', () => {
      const section = MarkdownGenerator.generateImagesSection(testImages);

      expect(section).toContain('## Images');
      expect(section).toContain('### Featured Image');
      expect(section).toContain('![Test Image 1]');
      expect(section).toContain('![Test Image 2]');
    });

    it('should return empty string for no images', () => {
      const section = MarkdownGenerator.generateImagesSection([]);
      expect(section).toBe('');
    });

    it('should use custom image base path', () => {
      const section = MarkdownGenerator.generateImagesSection(testImages, './custom_images');
      expect(section).toContain('./custom_images/');
    });

    it('should handle images with alt text', () => {
      const section = MarkdownGenerator.generateImagesSection(testImages);
      expect(section).toContain('![Test Image 2]');
    });

    it('should include divider at end', () => {
      const section = MarkdownGenerator.generateImagesSection(testImages);
      expect(section).toContain('---');
    });
  });

  describe('generateOriginalArticle', () => {
    it('should generate complete original article markdown', () => {
      const markdown = '## Content\n\nThis is article content.';
      const result = MarkdownGenerator.generateOriginalArticle(
        testMetadata,
        markdown,
        testImages
      );

      expect(result).toContain('# Test Article Title');
      expect(result).toContain('## Original Article');
      expect(result).toContain('## Content');
      expect(result).toContain('This is article content.');
      expect(result).toContain('Article extracted on');
    });

    it('should include images section when includeImages is true', () => {
      const markdown = 'Test content';
      const result = MarkdownGenerator.generateOriginalArticle(
        testMetadata,
        markdown,
        testImages,
        { includeImages: true }
      );

      expect(result).toContain('## Images');
      expect(result).toContain('Featured Image');
    });

    it('should skip images section when includeImages is false', () => {
      const markdown = 'Test content';
      const result = MarkdownGenerator.generateOriginalArticle(
        testMetadata,
        markdown,
        testImages,
        { includeImages: false }
      );

      expect(result).not.toContain('## Images');
    });

    it('should skip metadata when includeMetadata is false', () => {
      const markdown = 'Test content';
      const result = MarkdownGenerator.generateOriginalArticle(
        testMetadata,
        markdown,
        testImages,
        { includeMetadata: false }
      );

      expect(result).not.toContain('Test Article Title');
    });
  });

  describe('generateSummaryArticle', () => {
    it('should generate summary article with all sections', () => {
      const result = MarkdownGenerator.generateSummaryArticle(
        testMetadata,
        testSummary,
        testImages
      );

      expect(result).toContain('# Test Article Title - Summary');
      expect(result).toContain('👤 **John Doe**');
      expect(result).toContain('## Summary');
      expect(result).toContain('This is a test summary');
      expect(result).toContain('### Article Information');
      expect(result).toContain('llama3.1');
    });

    it('should include featured image', () => {
      const result = MarkdownGenerator.generateSummaryArticle(
        testMetadata,
        testSummary,
        testImages,
        undefined,
        { includeImages: true }
      );

      expect(result).toContain('![Test Image 1]');
    });

    it('should show processing time', () => {
      const result = MarkdownGenerator.generateSummaryArticle(
        testMetadata,
        testSummary,
        testImages
      );

      expect(result).toContain('2.50s');
    });

    it('should show tokens used when available', () => {
      const result = MarkdownGenerator.generateSummaryArticle(
        testMetadata,
        testSummary,
        testImages
      );

      expect(result).toContain('150');
    });

    it('should include source link', () => {
      const result = MarkdownGenerator.generateSummaryArticle(
        testMetadata,
        testSummary,
        testImages
      );

      expect(result).toContain('🔗');
      expect(result).toContain(testMetadata.sourceUrl);
    });
  });

  describe('generateSummaryWithKeyPoints', () => {
    it('should generate summary with TL;DR format', () => {
      const result = MarkdownGenerator.generateSummaryWithKeyPoints(
        testMetadata,
        testSummary,
        testImages
      );

      expect(result).toContain('# Test Article Title');
      expect(result).toContain('## TL;DR');
      expect(result).toContain('This is a test summary');
    });

    it('should include featured image at top', () => {
      const result = MarkdownGenerator.generateSummaryWithKeyPoints(
        testMetadata,
        testSummary,
        testImages,
        { includeImages: true }
      );

      expect(result).toMatch(/TL;DR/);
      const tldrIndex = result.indexOf('## TL;DR');
      const imageIndex = result.indexOf('![Test Image 1]');
      expect(imageIndex).toBeLessThan(tldrIndex);
    });

    it('should include related images section', () => {
      const result = MarkdownGenerator.generateSummaryWithKeyPoints(
        testMetadata,
        testSummary,
        testImages,
        { includeImages: true }
      );

      expect(result).toContain('## Related Images');
      expect(result).toContain('![Test Image 2]');
    });

    it('should include source link at footer', () => {
      const result = MarkdownGenerator.generateSummaryWithKeyPoints(
        testMetadata,
        testSummary,
        testImages
      );

      expect(result).toContain('🔗 Read full article');
      expect(result).toContain('example.com');
    });
  });

  describe('generateSafeFilename', () => {
    it('should generate safe filename for original article', () => {
      const filename = MarkdownGenerator.generateSafeFilename('Test Article Title', 'original');
      expect(filename).toBe('original_test_article_title.md');
    });

    it('should generate safe filename for summarized article', () => {
      const filename = MarkdownGenerator.generateSafeFilename('Test Article Title', 'summarized');
      expect(filename).toBe('summarized_test_article_title.md');
    });

    it('should handle special characters', () => {
      const filename = MarkdownGenerator.generateSafeFilename('Article: "Hello & Goodbye"!', 'original');
      expect(filename).toMatch(/^original_[a-z0-9_]+\.md$/);
    });

    it('should limit filename length', () => {
      const longTitle = 'A'.repeat(100);
      const filename = MarkdownGenerator.generateSafeFilename(longTitle, 'original');
      const titlePart = filename.split('_').slice(1).join('_').replace('.md', '');
      expect(titlePart.length).toBeLessThanOrEqual(50);
    });

    it('should remove leading/trailing underscores', () => {
      const filename = MarkdownGenerator.generateSafeFilename('...Article...', 'original');
      expect(filename).not.toMatch(/^original__/);
      expect(filename).not.toMatch(/__\.md$/);
    });
  });

  describe('generateImageFilename', () => {
    it('should generate image filename with article slug', () => {
      const filename = MarkdownGenerator.generateImageFilename('Test Article', 0, '.jpg');
      expect(filename).toMatch(/^test_article_image_0\.jpg$/);
    });

    it('should handle image index', () => {
      const filename1 = MarkdownGenerator.generateImageFilename('Article', 0, '.jpg');
      const filename2 = MarkdownGenerator.generateImageFilename('Article', 5, '.png');

      expect(filename1).toContain('_image_0');
      expect(filename2).toContain('_image_5');
    });

    it('should preserve extension', () => {
      const jpgFile = MarkdownGenerator.generateImageFilename('Article', 0, '.jpg');
      const pngFile = MarkdownGenerator.generateImageFilename('Article', 0, '.png');
      const webpFile = MarkdownGenerator.generateImageFilename('Article', 0, '.webp');

      expect(jpgFile).toMatch(/\.jpg$/);
      expect(pngFile).toMatch(/\.png$/);
      expect(webpFile).toMatch(/\.webp$/);
    });

    it('should limit slug length', () => {
      const longTitle = 'A'.repeat(100);
      const filename = MarkdownGenerator.generateImageFilename(longTitle, 0, '.jpg');
      const slug = filename.split('_image_')[0];
      expect(slug.length).toBeLessThanOrEqual(40);
    });
  });
});
