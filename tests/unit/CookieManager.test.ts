import { CookieManager, Cookie } from '../../src/services/CookieManager';

describe('CookieManager', () => {
  describe('parseNetscapeFormat', () => {
    it('should parse Netscape format cookies', () => {
      const netscapeText = `# Netscape HTTP Cookie File
.github.com	TRUE	/	TRUE	1735689600	user_session	abc123
.github.com	TRUE	/	TRUE	1735689600	logged_in	yes`;

      const cookies = CookieManager.parseNetscapeFormat(netscapeText);

      expect(cookies).toHaveLength(2);
      expect(cookies[0].name).toBe('user_session');
      expect(cookies[0].value).toBe('abc123');
      expect(cookies[0].domain).toBe('.github.com');
      expect(cookies[0].secure).toBe(true);
    });

    it('should skip comment lines', () => {
      const netscapeText = `# This is a comment
# Another comment
.example.com	TRUE	/	TRUE	1735689600	test	value`;

      const cookies = CookieManager.parseNetscapeFormat(netscapeText);
      expect(cookies).toHaveLength(1);
    });

    it('should skip empty lines', () => {
      const netscapeText = `.example.com	TRUE	/	TRUE	1735689600	test	value

.example.com	TRUE	/	TRUE	1735689600	test2	value2`;

      const cookies = CookieManager.parseNetscapeFormat(netscapeText);
      expect(cookies).toHaveLength(2);
    });
  });

  describe('parseJsonFormat', () => {
    it('should parse JSON format cookies', () => {
      const jsonCookies = [
        {
          name: 'session_id',
          value: 'xyz789',
          domain: '.example.com',
          path: '/',
          secure: true,
          httpOnly: true,
        },
      ];

      const cookies = CookieManager.parseJsonFormat(jsonCookies);

      expect(cookies).toHaveLength(1);
      expect(cookies[0].name).toBe('session_id');
      expect(cookies[0].value).toBe('xyz789');
    });

    it('should throw error if not an array', () => {
      const invalidJson = { name: 'test' };

      expect(() => CookieManager.parseJsonFormat(invalidJson as any)).toThrow(
        'JSON must be an array'
      );
    });
  });

  describe('detectExpiredCookies', () => {
    it('should identify expired cookies', () => {
      const pastTime = Date.now() - 86400000; // 1 day ago
      const futureTime = Date.now() + 86400000; // 1 day from now

      const cookies: Cookie[] = [
        { name: 'expired', value: 'val', domain: '.example.com', expires: pastTime },
        { name: 'valid', value: 'val', domain: '.example.com', expires: futureTime },
      ];

      const expired = CookieManager.detectExpiredCookies(cookies);

      expect(expired).toHaveLength(1);
      expect(expired[0].name).toBe('expired');
    });

    it('should return empty array if no cookies are expired', () => {
      const futureTime = Date.now() + 86400000;

      const cookies: Cookie[] = [
        { name: 'valid', value: 'val', domain: '.example.com', expires: futureTime },
      ];

      const expired = CookieManager.detectExpiredCookies(cookies);

      expect(expired).toHaveLength(0);
    });

    it('should ignore cookies without expiry', () => {
      const cookies: Cookie[] = [
        { name: 'session', value: 'val', domain: '.example.com' },
      ];

      const expired = CookieManager.detectExpiredCookies(cookies);

      expect(expired).toHaveLength(0);
    });
  });

  describe('filterCookiesByDomain', () => {
    it('should filter cookies by domain', () => {
      const cookies: Cookie[] = [
        { name: 'cookie1', value: 'val', domain: '.example.com' },
        { name: 'cookie2', value: 'val', domain: '.github.com' },
        { name: 'cookie3', value: 'val', domain: '.example.com' },
      ];

      const filtered = CookieManager.filterCookiesByDomain(cookies, 'example.com');

      expect(filtered).toHaveLength(2);
      expect(filtered.every(c => c.domain.includes('example.com'))).toBe(true);
    });
  });

  describe('toPuppeteerFormat', () => {
    it('should convert to Puppeteer format', () => {
      const cookies: Cookie[] = [
        {
          name: 'test_cookie',
          value: 'test_value',
          domain: '.example.com',
          path: '/',
          secure: true,
          httpOnly: true,
          expires: 1735689600000,
        },
      ];

      const puppeteerCookies = CookieManager.toPuppeteerFormat(cookies);

      expect(puppeteerCookies).toHaveLength(1);
      expect(puppeteerCookies[0].name).toBe('test_cookie');
      expect(puppeteerCookies[0].expires).toBe(1735689600); // Should be in seconds
    });
  });

  describe('mergeCookies', () => {
    it('should merge cookie arrays with later values taking precedence', () => {
      const cookies1: Cookie[] = [
        { name: 'cookie1', value: 'old_value', domain: '.example.com' },
        { name: 'cookie2', value: 'val2', domain: '.example.com' },
      ];

      const cookies2: Cookie[] = [
        { name: 'cookie1', value: 'new_value', domain: '.example.com' },
        { name: 'cookie3', value: 'val3', domain: '.example.com' },
      ];

      const merged = CookieManager.mergeCookies([cookies1, cookies2]);

      expect(merged).toHaveLength(3);
      const cookie1 = merged.find(c => c.name === 'cookie1');
      expect(cookie1?.value).toBe('new_value');
    });
  });
});
