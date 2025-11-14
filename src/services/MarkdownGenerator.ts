import { ArticleMetadata } from './ContentExtractor.js';
import { LocalImage } from './ImageDownloader.js';
import { SummarizationResult } from './OllamaClient.js';

export interface MarkdownOptions {
  includeImages?: boolean;
  includeMetadata?: boolean;
  imageBasePath?: string;
}

export class MarkdownGenerator {
  /**
   * Generate markdown for article metadata
   */
  static generateMetadataHeader(metadata: ArticleMetadata, includeMetadata = true): string {
    if (!includeMetadata) return '';

    let header = '';

    // Article title as h1
    header += `# ${metadata.title}\n\n`;

    // Metadata line
    const parts: string[] = [];

    if (metadata.author) {
      parts.push(`**Author**: ${metadata.author}`);
    }

    if (metadata.publishDate) {
      const dateStr = metadata.publishDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      parts.push(`**Published**: ${dateStr}`);
    }

    if (parts.length > 0) {
      header += parts.join(' | ') + '\n\n';
    }

    // Source URL
    header += `**Source**: [${new URL(metadata.sourceUrl).hostname}](${metadata.sourceUrl})\n\n`;

    // Description if available
    if (metadata.description) {
      header += `> ${metadata.description}\n\n`;
    }

    // Divider
    header += '---\n\n';

    return header;
  }

  /**
   * Generate images section in markdown
   */
  static generateImagesSection(
    images: LocalImage[],
    imageBasePath = './images'
  ): string {
    if (images.length === 0) return '';

    let section = '## Images\n\n';

    for (const image of images) {
      const imagePath = `${imageBasePath}/${image.relativePath.split('/').pop()}`;

      if (image.isFeatureImage) {
        section += `### Featured Image\n`;
        section += `![${image.alt || 'Featured Image'}](${imagePath})\n\n`;
      } else if (image.alt) {
        section += `![${image.alt}](${imagePath})\n`;
        if (image.title) {
          section += `*${image.title}*\n\n`;
        } else {
          section += '\n';
        }
      } else {
        section += `![Image](${imagePath})\n\n`;
      }
    }

    return section + '---\n\n';
  }

  /**
   * Generate original article markdown
   */
  static generateOriginalArticle(
    metadata: ArticleMetadata,
    markdown: string,
    images: LocalImage[] = [],
    options: MarkdownOptions = {}
  ): string {
    let content = '';

    // Add metadata header
    content += this.generateMetadataHeader(metadata, options.includeMetadata !== false);

    // Add images section if present
    if (options.includeImages !== false && images.length > 0) {
      content += this.generateImagesSection(images, options.imageBasePath);
    }

    // Add article content
    content += '## Original Article\n\n';
    content += markdown;

    // Footer
    content += '\n\n---\n';
    content += `*Article extracted on ${new Date().toISOString()}*\n`;

    return content;
  }

  /**
   * Generate summary markdown with metadata
   */
  static generateSummaryArticle(
    metadata: ArticleMetadata,
    summary: SummarizationResult,
    images: LocalImage[] = [],
    originalArticleUrl?: string,
    options: MarkdownOptions = {}
  ): string {
    let content = '';

    // Custom title for summary
    content += `# ${metadata.title} - Summary\n\n`;

    // Quick metadata
    const parts: string[] = [];
    if (metadata.author) {
      parts.push(`👤 **${metadata.author}**`);
    }
    if (metadata.publishDate) {
      const dateStr = metadata.publishDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
      parts.push(`📅 ${dateStr}`);
    }
    parts.push(`🔗 [Source](${metadata.sourceUrl})`);

    if (parts.length > 0) {
      content += parts.join(' | ') + '\n\n';
    }

    // Featured image if available
    if (options.includeImages !== false && images.length > 0) {
      const featuredImage = images.find(img => img.isFeatureImage) || images[0];
      if (featuredImage) {
        const imagePath = `${options.imageBasePath || './images'}/${featuredImage.relativePath.split('/').pop()}`;
        content += `![${featuredImage.alt || 'Featured'}](${imagePath})\n\n`;
      }
    }

    // Description/teaser
    if (metadata.description) {
      content += `> ${metadata.description}\n\n`;
    }

    // Summary section
    content += '## Summary\n\n';
    content += summary.summary + '\n\n';

    // Metadata about the summary
    content += '---\n\n';
    content += '### Article Information\n\n';
    content += `- **Source**: [${new URL(metadata.sourceUrl).hostname}](${metadata.sourceUrl})\n`;
    content += `- **Summarized by**: ${summary.model}\n`;
    content += `- **Processing time**: ${(summary.processingTime / 1000).toFixed(2)}s\n`;
    if (summary.tokensUsed) {
      content += `- **Tokens used**: ${summary.tokensUsed}\n`;
    }
    content += `- **Summary generated**: ${new Date().toISOString()}\n`;

    // Links to other files
    if (originalArticleUrl) {
      content += `\n[📄 Read Full Article](${originalArticleUrl})\n`;
    }

    // Footer
    content += '\n---\n';
    content += `*This is an AI-generated summary. [Read the full article for complete details.](${metadata.sourceUrl})*\n`;

    return content;
  }

  /**
   * Generate a summary with key points
   */
  static generateSummaryWithKeyPoints(
    metadata: ArticleMetadata,
    summary: SummarizationResult,
    images: LocalImage[] = [],
    options: MarkdownOptions = {}
  ): string {
    let content = '';

    // Title
    content += `# ${metadata.title}\n\n`;

    // Quick facts
    const facts: string[] = [];
    if (metadata.author) facts.push(`**Author**: ${metadata.author}`);
    if (metadata.publishDate) {
      const dateStr = metadata.publishDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
      facts.push(`**Published**: ${dateStr}`);
    }
    facts.push(`**Source**: [${new URL(metadata.sourceUrl).hostname}](${metadata.sourceUrl})`);

    if (facts.length > 0) {
      content += facts.join(' • ') + '\n\n';
    }

    // Featured image
    if (options.includeImages !== false && images.length > 0) {
      const featuredImage = images.find(img => img.isFeatureImage) || images[0];
      if (featuredImage) {
        const imagePath = `${options.imageBasePath || './images'}/${featuredImage.relativePath.split('/').pop()}`;
        content += `![${featuredImage.alt || 'Featured'}](${imagePath})\n\n`;
      }
    }

    // TL;DR
    content += '## TL;DR\n\n';
    content += summary.summary + '\n\n';

    // Additional images
    if (options.includeImages !== false && images.length > 1) {
      const otherImages = images.filter(img => !img.isFeatureImage).slice(0, 3);
      if (otherImages.length > 0) {
        content += '## Related Images\n\n';
        for (const image of otherImages) {
          const imagePath = `${options.imageBasePath || './images'}/${image.relativePath.split('/').pop()}`;
          content += `![${image.alt || 'Image'}](${imagePath})\n`;
        }
        content += '\n';
      }
    }

    // Footer with source
    content += '---\n\n';
    content += `[🔗 Read full article on ${new URL(metadata.sourceUrl).hostname}](${metadata.sourceUrl})\n`;

    return content;
  }

  /**
   * Generate safe filename from article title
   */
  static generateSafeFilename(title: string, type: 'original' | 'summarized' = 'original'): string {
    // Remove special characters and convert to lowercase
    let slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .substring(0, 50);

    if (type === 'original') {
      return `original_${slug}.md`;
    } else {
      return `summarized_${slug}.md`;
    }
  }

  /**
   * Generate image filename with article name
   */
  static generateImageFilename(articleTitle: string, index: number, extension: string): string {
    const slug = articleTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .substring(0, 40);

    return `${slug}_image_${index}${extension}`;
  }
}
