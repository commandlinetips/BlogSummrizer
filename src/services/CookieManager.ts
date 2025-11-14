import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import axios from 'axios';

export interface Cookie {
  name: string;
  value: string;
  domain: string;
  path?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
  expires?: number;
}

export interface CookieValidationResult {
  valid: boolean;
  message: string;
  expiredCookies: Cookie[];
}

export class CookieManager {
  /**
   * Parse cookies from Netscape format (browser export)
   * Format: domain flag path secure expiration name value
   */
  static parseNetscapeFormat(text: string): Cookie[] {
    const cookies: Cookie[] = [];
    const lines = text.split('\n');

    for (const line of lines) {
      // Skip comments and empty lines
      if (line.startsWith('#') || line.trim() === '') {
        continue;
      }

      const parts = line.split('\t');
      if (parts.length < 7) {
        continue;
      }

      const [domain, _flag, path, secure, expiration, name, value] = parts;

      cookies.push({
        name,
        value,
        domain,
        path: path === '/' ? '/' : path,
        secure: secure === 'TRUE',
        expires: parseInt(expiration) > 0 ? parseInt(expiration) * 1000 : undefined,
      });
    }

    return cookies;
  }

  /**
   * Parse cookies from JSON format
   */
  static parseJsonFormat(json: Record<string, unknown>[]): Cookie[] {
    if (!Array.isArray(json)) {
      throw new Error('JSON must be an array of cookie objects');
    }

    return json.map((item: any) => ({
      name: item.name || '',
      value: item.value || '',
      domain: item.domain || '',
      path: item.path || '/',
      secure: item.secure !== false,
      httpOnly: item.httpOnly !== false,
      sameSite: item.sameSite || 'Lax',
      expires: item.expirationDate || item.expires,
    }));
  }

  /**
   * Load cookies from file (auto-detect format)
   */
  static loadCookiesFromFile(filePath: string): Cookie[] {
    try {
      const content = readFileSync(resolve(filePath), 'utf-8');

      // Try JSON format first
      if (content.trim().startsWith('[') || content.trim().startsWith('{')) {
        const json = JSON.parse(content);
        const cookiesArray = Array.isArray(json) ? json : [json];
        return this.parseJsonFormat(cookiesArray);
      }

      // Fall back to Netscape format
      return this.parseNetscapeFormat(content);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`Failed to parse cookies file: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Detect expired cookies
   */
  static detectExpiredCookies(cookies: Cookie[]): Cookie[] {
    const now = Date.now();
    return cookies.filter(cookie => cookie.expires && cookie.expires < now);
  }

  /**
   * Check if cookies are valid by making a test request
   */
  static async validateCookies(
    testUrl: string,
    cookies: Cookie[],
    timeout = 10000
  ): Promise<CookieValidationResult> {
    // Detect expired cookies
    const expiredCookies = this.detectExpiredCookies(cookies);

    if (expiredCookies.length > 0) {
      return {
        valid: false,
        message: `${expiredCookies.length} cookie(s) have expired`,
        expiredCookies,
      };
    }

    try {
      // Format cookies for HTTP request
      const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');

      const response = await axios.get(testUrl, {
        headers: {
          Cookie: cookieString,
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        timeout,
        validateStatus: () => true, // Don't throw on any status code
      });

      // Check for common indicators of authentication failure
      if (response.status === 401 || response.status === 403) {
        return {
          valid: false,
          message: `Authentication failed (HTTP ${response.status})`,
          expiredCookies: [],
        };
      }

      // Check for paywall/login redirects
      const body = response.data.toString().toLowerCase();
      if (
        body.includes('login') ||
        body.includes('sign in') ||
        body.includes('authenticate')
      ) {
        return {
          valid: false,
          message: 'Detected login/authentication page - cookies may be invalid',
          expiredCookies: [],
        };
      }

      return {
        valid: true,
        message: 'Cookies appear to be valid',
        expiredCookies: [],
      };
    } catch (error) {
      return {
        valid: false,
        message: `Failed to validate cookies: ${error instanceof Error ? error.message : 'Unknown error'}`,
        expiredCookies: [],
      };
    }
  }

  /**
   * Save cookies to JSON file
   */
  static saveCookiesToFile(cookies: Cookie[], filePath: string): void {
    try {
      const json = JSON.stringify(cookies, null, 2);
      writeFileSync(resolve(filePath), json, 'utf-8');
    } catch (error) {
      throw new Error(
        `Failed to save cookies: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Filter cookies by domain
   */
  static filterCookiesByDomain(cookies: Cookie[], domain: string): Cookie[] {
    return cookies.filter(
      cookie =>
        domain.includes(cookie.domain) || cookie.domain.includes(new URL(`https://${domain}`).hostname)
    );
  }

  /**
   * Convert cookies to Puppeteer format
   */
  static toPuppeteerFormat(
    cookies: Cookie[]
  ): Array<Record<string, unknown>> {
    return cookies.map(cookie => ({
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path || '/',
      secure: cookie.secure !== false,
      httpOnly: cookie.httpOnly !== false,
      sameSite: cookie.sameSite || 'Lax',
      expires: cookie.expires ? cookie.expires / 1000 : undefined,
    }));
  }

  /**
   * Merge multiple cookie arrays, preferring more recent/valid cookies
   */
  static mergeCookies(cookieArrays: Cookie[][]): Cookie[] {
    const merged: Record<string, Cookie> = {};

    // Later arrays override earlier ones
    for (const cookies of cookieArrays) {
      for (const cookie of cookies) {
        const key = `${cookie.domain}:${cookie.name}`;
        merged[key] = cookie;
      }
    }

    return Object.values(merged);
  }
}
