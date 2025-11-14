import puppeteer, { Browser, Page } from 'puppeteer';
import { Cookie } from './CookieManager';
import { config } from '../config/index.js';

export enum PaywallType {
  SOFT_OVERLAY = 'soft-overlay',
  CLIENT_HARD = 'client-hard',
  SERVER_SIDE = 'server-side',
  NONE = 'none',
}

export interface PageLoadOptions {
  url: string;
  cookies?: Cookie[];
  waitFor?: string;
  waitForSelector?: string;
  timeout?: number;
  retries?: number;
}

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:91.0) Gecko/20100101 Firefox/91.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15',
];

export class BrowserEngine {
  private browser: Browser | null = null;
  private launchOptions: Record<string, unknown>;

  constructor(launchOptions?: Record<string, unknown>) {
    this.launchOptions = {
      headless: config.browser.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
      ...launchOptions,
    };
  }

  /**
   * Launch browser instance
   */
  async launch(): Promise<Browser> {
    if (this.browser) {
      return this.browser;
    }

    this.browser = await puppeteer.launch(this.launchOptions);
    return this.browser;
  }

  /**
   * Close browser instance
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Get random user agent
   */
  private getRandomUserAgent(): string {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  }

  /**
   * Add random delay (anti-detection)
   */
  private async addRandomDelay(minMs = 100, maxMs = 2000): Promise<void> {
    const delay = Math.random() * (maxMs - minMs) + minMs;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Inject cookies into page
   */
  private async injectCookies(page: Page, cookies: Cookie[]): Promise<void> {
    if (cookies.length === 0) return;

    const puppeteerCookies = cookies.map(cookie => ({
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path || '/',
      secure: cookie.secure !== false,
      httpOnly: cookie.httpOnly !== false,
      sameSite: (cookie.sameSite || 'Lax') as 'Strict' | 'Lax' | 'None',
      expires: cookie.expires ? cookie.expires / 1000 : undefined,
    }));

    await page.setCookie(...puppeteerCookies);
  }

  /**
   * Setup anti-detection measures
   */
  private async setupAntiDetection(page: Page): Promise<void> {
    // Set user agent
    await page.setUserAgent(this.getRandomUserAgent());

    // Set extra headers
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    });

    // Block trackers and ads
    await page.on('request', request => {
      const resourceType = request.resourceType();
      const url = request.url();

      if (
        resourceType === 'image' ||
        resourceType === 'stylesheet' ||
        resourceType === 'font' ||
        resourceType === 'media'
      ) {
        request.abort();
      } else if (
        url.includes('analytics') ||
        url.includes('doubleclick') ||
        url.includes('ads') ||
        url.includes('tracking')
      ) {
        request.abort();
      } else {
        request.continue();
      }
    });

    // Stealth mode
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty((window as any).navigator, 'webdriver', {
        get: () => false,
      });
    });
  }

  /**
   * Load page with retries
   */
  async loadPageWithCookies(options: PageLoadOptions): Promise<Page> {
    const browser = await this.launch();
    const page = await browser.newPage();
    const timeout = options.timeout || config.browser.timeout;
    const retries = options.retries || config.browser.retries;

    page.setDefaultTimeout(timeout);
    page.setDefaultNavigationTimeout(timeout);

    try {
      // Setup anti-detection if enabled
      if (config.browser.antiDetection) {
        await this.setupAntiDetection(page);
      }

      // Inject cookies before navigation
      if (options.cookies && options.cookies.length > 0) {
        await this.injectCookies(page, options.cookies);
      }

      // Navigate to page with retries
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          if (config.browser.antiDetection && attempt > 1) {
            await this.addRandomDelay(500, 2000);
          }

          await page.goto(options.url, {
            waitUntil: 'networkidle2',
          });
          break;
        } catch (error) {
          if (attempt === retries) {
            throw error;
          }
        }
      }

      // Wait for specific selector if provided
      if (options.waitForSelector) {
        await page.waitForSelector(options.waitForSelector, { timeout });
      }

      // Wait for network idle or timeout
      if (options.waitFor) {
        if (options.waitFor === 'network') {
          await page.waitForNavigation({ waitUntil: 'networkidle2' });
        } else if (options.waitFor === 'load') {
          await page.waitForNavigation({ waitUntil: 'load' });
        }
      }

      return page;
    } catch (error) {
      await page.close();
      throw error;
    }
  }

  /**
   * Detect paywall type on page
   */
  async detectPaywall(page: Page): Promise<PaywallType> {
    try {
      // Check for common paywall patterns
      const content = await page.content();

      // Check for common soft paywall indicators
      const softPaywallPatterns = [
        /subscribe|sign\s*in|log\s*in|paywall/i,
        /metered|wall|modal.*close/i,
      ];

      if (softPaywallPatterns.some(p => p.test(content))) {
        // Try to detect if content is actually hidden
        const bodyText = await page.evaluate(() => document.body.innerText);
        if (bodyText.length < 500) {
          // Likely blocked content
          return PaywallType.SOFT_OVERLAY;
        }
      }

      // If we got content, no paywall
      return PaywallType.NONE;
    } catch (_error) {
      return PaywallType.NONE;
    }
  }

  /**
   * Take screenshot for debugging
   */
  async screenshot(page: Page, path?: string): Promise<Buffer> {
    return page.screenshot({ path }) as Promise<Buffer>;
  }

  /**
   * Execute custom JavaScript on page
   */
  async executeScript<T>(page: Page, script: string | (() => T)): Promise<T> {
    return page.evaluate(script);
  }

  /**
   * Wait for element and get text
   */
  async getElementText(page: Page, selector: string): Promise<string | null> {
    try {
      await page.waitForSelector(selector, { timeout: config.browser.timeout });
      return page.evaluate(sel => {
        const element = (document as any).querySelector(sel);
        return element?.textContent || null;
      }, selector);
    } catch (_error) {
      return null;
    }
  }

  /**
   * Get page metrics
   */
  async getMetrics(page: Page): Promise<Record<string, number>> {
    const metrics = await page.metrics();
    return metrics as unknown as Record<string, number>;
  }
}
