import { Page } from 'puppeteer';

export interface Image {
  src: string;
  alt?: string;
  title?: string;
  srcset?: string;
  isFeatureImage?: boolean;
}

export class ImageExtractor {
  /**
   * Extract images from article
   */
  static async extractImages(
    page: Page,
    containerSelector?: string
  ): Promise<Image[]> {
    const images = await page.evaluate(selector => {
      const container = selector ? document.querySelector(selector) : document.body;
      if (!container) return [];

      const images: Image[] = [];

      // Get all images in container
      container.querySelectorAll('img').forEach((img: HTMLImageElement) => {
        const src = img.getAttribute('src') || img.getAttribute('data-src') || '';
        if (src) {
          images.push({
            src,
            alt: img.getAttribute('alt') || undefined,
            title: img.getAttribute('title') || undefined,
            srcset: img.getAttribute('srcset') || undefined,
          });
        }
      });

      return images;
    }, containerSelector);

    // Add featured/og image if available
    const ogImage = await page.evaluate(() => {
      const og = document.querySelector('meta[property="og:image"]');
      return og?.getAttribute('content');
    });

    if (ogImage && !images.some(img => img.src === ogImage)) {
      images.unshift({
        src: ogImage,
        isFeatureImage: true,
      });
    }

    // Remove duplicates
    const unique = Array.from(
      new Map(images.map(img => [img.src, img])).values()
    );

    return unique;
  }

  /**
   * Validate image URL
   */
  static isValidImageUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
      const path = urlObj.pathname.toLowerCase();
      return imageExtensions.some(ext => path.endsWith(ext));
    } catch (_error) {
      return false;
    }
  }

  /**
   * Resolve relative URLs to absolute
   */
  static resolveImageUrl(imageUrl: string, pageUrl: string): string {
    try {
      // If already absolute, return as-is
      if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        return imageUrl;
      }

      // Handle protocol-relative URLs
      if (imageUrl.startsWith('//')) {
        const pageUrlObj = new URL(pageUrl);
        return `${pageUrlObj.protocol}${imageUrl}`;
      }

      // Handle relative URLs
      const pageUrlObj = new URL(pageUrl);
      return new URL(imageUrl, pageUrlObj.origin).toString();
    } catch (_error) {
      return imageUrl;
    }
  }

  /**
   * Get highest resolution image from srcset
   */
  static getHighestResolutionUrl(srcset: string | undefined): string | null {
    if (!srcset) return null;

    const images = srcset.split(',').map(img => {
      const [src, descriptor] = img.trim().split(/\s+/);
      const multiplier = descriptor ? parseFloat(descriptor) : 1;
      return { src, multiplier };
    });

    // Sort by multiplier descending
    images.sort((a, b) => b.multiplier - a.multiplier);

    return images[0]?.src || null;
  }

  /**
   * Extract image URLs suitable for downloading
   */
  static async extractDownloadableImages(
    page: Page,
    pageUrl: string,
    containerSelector?: string
  ): Promise<Image[]> {
    const images = await this.extractImages(page, containerSelector);

    return images
      .map(img => {
        // Prefer highest resolution from srcset
        const highRes = this.getHighestResolutionUrl(img.srcset);
        const finalUrl = highRes || img.src;

        return {
          ...img,
          src: this.resolveImageUrl(finalUrl, pageUrl),
        };
      })
      .filter(img => this.isValidImageUrl(img.src));
  }
}
