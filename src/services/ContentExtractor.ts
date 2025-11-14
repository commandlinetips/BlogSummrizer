import { Page } from 'puppeteer';
import { JSDOM } from 'jsdom';
import TurndownService from 'turndown';

export interface ArticleMetadata {
  title: string;
  author?: string;
  publishDate?: Date;
  sourceUrl: string;
  description?: string;
  imageUrl?: string;
}

export interface ExtractedContent {
  metadata: ArticleMetadata;
  html: string;
  markdown: string;
  text: string;
}

const ARTICLE_SELECTORS = [
  'article',
  '[role="main"]',
  '.content',
  '.article',
  '.post',
  '.entry-content',
  '.main-content',
  '.story-body',
  '[itemprop="articleBody"]',
];

const BOILERPLATE_SELECTORS = [
  'script',
  'style',
  'nav',
  'footer',
  '.advertisement',
  '.ads',
  '.sidebar',
  '.related-articles',
  '.comments',
  '.comment-section',
  '[data-ad-slot]',
  '.widget',
  '.tracking',
];

export class ContentExtractor {
  /**
   * Identify article container by trying common selectors
   */
  static async identifyArticleContainer(page: Page): Promise<string | null> {
    for (const selector of ARTICLE_SELECTORS) {
      try {
        const exists = await page.$(selector);
        if (exists) {
          return selector;
        }
      } catch (_error) {
        continue;
      }
    }
    return null;
  }

  /**
   * Extract metadata from page
   */
  static async extractMetadata(page: Page, url: string): Promise<ArticleMetadata> {
    const metadata = await page.evaluate(() => {
      const getMeta = (name: string) => {
        const nameEl = document.querySelector(`meta[name="${name}"]`)?.getAttribute('content');
        const propEl = document.querySelector(`meta[property="${name}"]`)?.getAttribute('content');
        return nameEl || propEl || null;
      };

      return {
        title:
          getMeta('og:title') ||
          document.querySelector('h1')?.textContent ||
          document.title,
        author:
          getMeta('author') ||
          document.querySelector('[itemprop="author"]')?.textContent ||
          document.querySelector('.author')?.textContent,
        publishDate:
          getMeta('article:published_time') ||
          getMeta('datePublished') ||
          document.querySelector('[itemprop="datePublished"]')?.getAttribute('content'),
        description: getMeta('og:description') || getMeta('description'),
        imageUrl: getMeta('og:image'),
      };
    });

    return {
      title: metadata.title?.trim() || 'Untitled Article',
      author: metadata.author?.trim(),
      publishDate: metadata.publishDate ? new Date(metadata.publishDate) : undefined,
      sourceUrl: url,
      description: metadata.description?.trim(),
      imageUrl: metadata.imageUrl || undefined,
    };
  }

  /**
   * Get page HTML content
   */
  static async getPageHtml(page: Page): Promise<string> {
    return page.content();
  }

  /**
   * Clean HTML of boilerplate content
   */
  static cleanHtml(html: string): string {
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // Remove boilerplate elements
    for (const selector of BOILERPLATE_SELECTORS) {
      document.querySelectorAll(selector).forEach((el: Element) => el.remove());
    }

    // Remove elements with hidden attributes
    document.querySelectorAll('[style*="display:none"], [hidden]').forEach((el: Element) => el.remove());

    // Remove empty paragraphs and divs
    document.querySelectorAll('p, div').forEach((el: Element) => {
      if (!el.textContent?.trim()) {
        el.remove();
      }
    });

    return document.body.innerHTML;
  }

  /**
   * Extract article content
   */
  static async extractArticleContent(
    page: Page,
    containerSelector?: string
  ): Promise<string> {
    let html: string;

    if (containerSelector) {
      html = await page.evaluate(selector => {
        const el = document.querySelector(selector);
        return el?.innerHTML || '';
      }, containerSelector);
    } else {
      // Try to find article container or use body
      const selector = await this.identifyArticleContainer(page);
      html = await page.evaluate(sel => {
        const el = sel ? document.querySelector(sel) : document.body;
        return el?.innerHTML || '';
      }, selector);
    }

    return this.cleanHtml(html);
  }

  /**
   * Convert HTML to Markdown
   */
  static htmlToMarkdown(html: string): string {
    const turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      emDelimiter: '*',
      strongDelimiter: '**',
    });

    // Add rules for better link handling
    turndownService.addRule('links', {
      filter: 'a',
      replacement: (content: string, node: any) => {
        const href = (node as HTMLElement).getAttribute('href') || '';
        return `[${content}](${href})`;
      },
    });

    // Add rule for images
    turndownService.addRule('images', {
      filter: 'img',
      replacement: (_content: string, node: any) => {
        const src = (node as HTMLElement).getAttribute('src') || '';
        const alt = (node as HTMLElement).getAttribute('alt') || '';
        return `![${alt}](${src})`;
      },
    });

    return turndownService.turndown(html).trim();
  }

  /**
   * Extract plain text from HTML
   */
  static htmlToText(html: string): string {
    const dom = new JSDOM(html);
    const text = dom.window.document.body.textContent || '';

    // Clean up whitespace
    return text
      .split('\n')
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 0)
      .join('\n');
  }

  /**
   * Full content extraction pipeline
   */
  static async extractContent(
    page: Page,
    url: string,
    containerSelector?: string
  ): Promise<ExtractedContent> {
    const [metadata, htmlContent] = await Promise.all([
      this.extractMetadata(page, url),
      this.extractArticleContent(page, containerSelector),
    ]);

    const markdown = this.htmlToMarkdown(htmlContent);
    const text = this.htmlToText(htmlContent);

    return {
      metadata,
      html: htmlContent,
      markdown,
      text,
    };
  }

  /**
   * Get word count
   */
  static getWordCount(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Get reading time in minutes (average 200 words/min)
   */
  static getReadingTime(text: string): number {
    const wordCount = this.getWordCount(text);
    return Math.ceil(wordCount / 200);
  }
}
