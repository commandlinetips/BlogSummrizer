import { ImageExtractor } from '../../src/services/ImageExtractor';

describe('ImageExtractor', () => {
  describe('isValidImageUrl', () => {
    it('should validate image URLs', () => {
      expect(ImageExtractor.isValidImageUrl('https://example.com/image.jpg')).toBe(true);
      expect(ImageExtractor.isValidImageUrl('https://example.com/image.png')).toBe(true);
      expect(ImageExtractor.isValidImageUrl('https://example.com/image.gif')).toBe(true);
      expect(ImageExtractor.isValidImageUrl('https://example.com/image.webp')).toBe(true);
    });

    it('should reject non-image URLs', () => {
      expect(ImageExtractor.isValidImageUrl('https://example.com/article')).toBe(false);
      expect(ImageExtractor.isValidImageUrl('https://example.com/page.html')).toBe(false);
    });

    it('should reject invalid URLs', () => {
      expect(ImageExtractor.isValidImageUrl('not-a-url')).toBe(false);
    });
  });

  describe('resolveImageUrl', () => {
    it('should keep absolute URLs as-is', () => {
      const url = 'https://cdn.example.com/image.jpg';
      const pageUrl = 'https://news.example.com/article';
      expect(ImageExtractor.resolveImageUrl(url, pageUrl)).toBe(url);
    });

    it('should resolve protocol-relative URLs', () => {
      const url = '//cdn.example.com/image.jpg';
      const pageUrl = 'https://news.example.com/article';
      const result = ImageExtractor.resolveImageUrl(url, pageUrl);
      expect(result).toBe('https://cdn.example.com/image.jpg');
    });

    it('should resolve relative URLs', () => {
      const url = '/images/photo.jpg';
      const pageUrl = 'https://news.example.com/article';
      const result = ImageExtractor.resolveImageUrl(url, pageUrl);
      expect(result).toBe('https://news.example.com/images/photo.jpg');
    });

    it('should resolve relative paths with parent directories', () => {
      const url = '../images/photo.jpg';
      const pageUrl = 'https://news.example.com/blog/article';
      const result = ImageExtractor.resolveImageUrl(url, pageUrl);
      expect(result).toBe('https://news.example.com/images/photo.jpg');
    });
  });

  describe('getHighestResolutionUrl', () => {
    it('should extract image from simple srcset', () => {
      const srcset = 'image-small.jpg 1x, image-large.jpg 2x';
      const result = ImageExtractor.getHighestResolutionUrl(srcset);
      expect(result).toBe('image-large.jpg');
    });

    it('should extract image from width-based srcset', () => {
      const srcset = 'image-400w.jpg 400w, image-800w.jpg 800w, image-1200w.jpg 1200w';
      const result = ImageExtractor.getHighestResolutionUrl(srcset);
      expect(result).toBe('image-1200w.jpg');
    });

    it('should return null for empty srcset', () => {
      const result = ImageExtractor.getHighestResolutionUrl('');
      expect(result).toBeNull();
    });

    it('should return null for undefined srcset', () => {
      const result = ImageExtractor.getHighestResolutionUrl(undefined);
      expect(result).toBeNull();
    });
  });
});
