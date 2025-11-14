# Implementation Task Breakdown: Paywalled Article Extractor

## Phase 1: Foundation & Infrastructure

### Task 1.1: Project Setup & Configuration
**Objective**: Initialize project structure with dependencies  
**Deliverables**:
- [ ] Node.js project with package.json
- [ ] Folder structure (src/, tests/, config/, output/)
- [ ] Environment configuration (.env template)
- [ ] TypeScript/ESM setup
- [ ] Git repo with .gitignore

**Tech Stack**:
- Node.js 18+ LTS
- TypeScript for type safety
- ESLint + Prettier for code quality

**Acceptance Criteria**:
- Project builds without errors
- All dependencies resolve
- Dev environment runnable locally

---

### Task 1.2: Cookie Management Module
**Objective**: Handle cookie parsing, validation, storage, and injection  
**Deliverables**:
- [ ] Cookie import from JSON/Netscape format
- [ ] Cookie validation (check HTTP requests with cookies)
- [ ] Secure cookie storage (encrypted config)
- [ ] Cookie expiration detection
- [ ] Cookie injection into browser context

**Implementation Steps**:
1. Create `src/services/CookieManager.ts`
2. Define cookie interfaces (name, value, domain, expiry, etc.)
3. Implement parsers for different formats:
   ```ts
   - parseNetscapeFormat(text: string): Cookie[]
   - parseJsonFormat(json: object): Cookie[]
   ```
4. Add validation:
   ```ts
   - async validateCookies(url: string): Promise<boolean>
   - detectExpiredCookies(): Cookie[]
   ```
5. Add storage:
   ```ts
   - saveCookiesSecurely(cookies: Cookie[]): void
   - loadCookiesSecurely(): Cookie[]
   ```
6. Integrate with browser:
   ```ts
   - injectCookiesIntoBrowser(page, cookies): Promise<void>
   ```

**Dependencies**: `tough-cookie`, `node-fetch`

**Testing**:
- Unit tests for parsers
- Mock HTTP server for validation
- Encryption/decryption tests

---

### Task 1.3: Browser Automation Engine
**Objective**: Create abstraction over Puppeteer for reliable page loading  
**Deliverables**:
- [ ] Browser instance management
- [ ] Page loading with retry logic
- [ ] JavaScript execution and waiting
- [ ] Paywall detection mechanism
- [ ] Anti-bot evasion (user-agent rotation, delays)

**Implementation Steps**:
1. Create `src/services/BrowserEngine.ts`
2. Initialize Puppeteer/Playwright:
   ```ts
   async launchBrowser(): Promise<Browser>
   - headless: true
   - args: ['--no-sandbox', '--disable-setuid-sandbox']
   ```
3. Page loading with cookies:
   ```ts
   async loadPageWithCookies(url: string, cookies: Cookie[]): Promise<Page>
   - Inject cookies before navigation
   - Wait for specific selectors
   - Handle timeouts
   ```
4. Implement paywall detection:
   ```ts
   async detectPaywall(page: Page): Promise<PaywallType | null>
   - Check for overlay/modal elements
   - Look for "subscribe" prompts
   - Test text extraction
   ```
5. Anti-detection measures:
   ```ts
   - randomizeUserAgent()
   - addRandomDelays()
   - setupExtraHTTPHeaders()
   - blockTrackers()
   ```

**Dependencies**: `puppeteer`, `user-agents`

**Configuration**:
```json
{
  "browser": {
    "timeout": 30000,
    "headless": true,
    "antiDetection": true,
    "retries": 3
  }
}
```

**Testing**:
- Mock paywall sites
- Test with real paywalled articles (limited)
- Timeout/retry scenarios

---

## Phase 2: Content Extraction

### Task 2.1: Article Text Extraction
**Objective**: Extract clean article content without boilerplate  
**Deliverables**:
- [ ] DOM parsing for article content
- [ ] Metadata extraction (title, author, date, URL)
- [ ] HTML-to-Markdown conversion
- [ ] Boilerplate removal (ads, related articles)
- [ ] Link preservation

**Implementation Steps**:
1. Create `src/services/ContentExtractor.ts`
2. Identify article container:
   ```ts
   async identifyArticleContainer(page: Page): Promise<HTMLElement>
   - Try common selectors: article, [role="main"], .content, .post
   - Evaluate DOM structure
   - Return most likely container
   ```
3. Extract metadata:
   ```ts
   async extractMetadata(page: Page): Promise<ArticleMetadata>
   - title: page.title() or og:title
   - author: from byline, structured data
   - publishDate: from meta tags, article datetime
   - sourceUrl: current page URL
   ```
4. Clean HTML:
   ```ts
   cleanArticleHTML(html: string): string
   - Remove script/style tags
   - Remove ad containers
   - Remove comment sections
   - Remove "related articles"
   ```
5. Convert to Markdown:
   ```ts
   htmlToMarkdown(html: string): string
   - Use Turndown.js or similar
   - Preserve links
   - Proper heading hierarchy
   ```

**Dependencies**: `jsdom`, `cheerio`, `turndown`, `html-to-text`

**Testing**:
- Sample HTML from different news sites
- Validate metadata extraction accuracy
- Check markdown formatting

---

### Task 2.2: Image Extraction & Download
**Objective**: Identify, download, and embed article images  
**Deliverables**:
- [ ] Image discovery (article body + featured images)
- [ ] Image download with retry logic
- [ ] Local storage organization
- [ ] Image optimization (resize, compress)
- [ ] Markdown embedding with relative paths

**Implementation Steps**:
1. Create `src/services/ImageExtractor.ts` and `src/services/ImageDownloader.ts`
2. Find images in article:
   ```ts
   async extractImages(page: Page, containerSelector: string): Promise<Image[]>
   - Find all <img> tags within article
   - Extract srcset for responsive images
   - Get image alt text
   - Include featured image (og:image)
   ```
3. Download images:
   ```ts
   async downloadImages(images: Image[], outputDir: string): Promise<LocalImage[]>
   - Create unique filenames
   - Handle timeouts
   - Retry failed downloads
   - Skip duplicates (by hash)
   ```
4. Optimize images:
   ```ts
   async optimizeImage(filepath: string): Promise<void>
   - Resize large images (max 1200px width)
   - Compress (80% quality)
   - Convert WebP → PNG if needed
   ```
5. Track in markdown:
   ```ts
   generateImageMarkdown(images: LocalImage[]): string
   - ![alt text](./images/image1.png)
   - Include caption if available
   ```

**Dependencies**: `sharp`, `axios`, `crypto` (for hashing)

**Configuration**:
```json
{
  "images": {
    "maxWidth": 1200,
    "quality": 80,
    "outputFolder": "./output/images",
    "maxConcurrent": 5,
    "timeout": 10000
  }
}
```

**Testing**:
- Various image formats (JPEG, PNG, WebP, SVG)
- Large image files
- Missing/broken image URLs
- Relative vs absolute URLs

---

## Phase 3: Summarization & Output

### Task 3.1: Local Ollama LLM Integration
**Objective**: Generate article summaries using local Ollama models  
**Deliverables**:
- [ ] Ollama client (HTTP to localhost:11434)
- [ ] Model detection and availability checking
- [ ] Model selection logic with fallback chain
- [ ] Prompt engineering for article summarization
- [ ] Progress streaming for long operations
- [ ] Caching to avoid duplicate summaries
- [ ] Graceful degradation if Ollama unavailable

**Model Recommendation & Benchmarks**:
```
PRIMARY (Best Balance):
- llama3.1 (4.9GB): ~20-40s per article, excellent quality
  
FAST MODE (Speed Priority):
- qwen3:4b (2.5GB): ~8-15s per article, good quality
  
QUALITY MODE (Quality Priority):
- mistral (4.4GB): ~25-35s per article, best nuance

FALLBACK CHAIN:
1. llama3.1 (if available)
2. mistral (if available)
3. qwen3:4b (if available)
4. gemma3 (minimal fallback)
5. Return unsummarized article if no models available
```

**Implementation Steps**:
1. Create `src/services/OllamaClient.ts`
2. Ollama health check:
   ```ts
   async checkOllamaHealth(baseUrl: string = 'http://localhost:11434'): Promise<boolean>
   - Ping Ollama server
   - Return true if accessible
   ```
3. List available models:
   ```ts
   async getAvailableModels(): Promise<string[]>
   - Call GET /api/tags
   - Return installed model names
   ```
4. Model selection:
   ```ts
   selectBestModel(available: string[], preference?: 'speed'|'quality'): string
   - If preference='speed': use qwen3:4b > gemma3:1b
   - If preference='quality': use llama3.1 > mistral > qwen3:4b
   - Default: try llama3.1, fallback to others
   ```
5. Summarization with streaming:
   ```ts
   async summarize(text: string, options: SummaryOptions): Promise<Summary>
   - Stream response from Ollama
   - Track inference time
   - Handle timeouts (max 120s per article)
   ```
6. Prompt templates (optimized for local models):
   ```ts
   const SUMMARY_PROMPT = `
   You are a professional article summarizer.
   
   Summarize the following article in 2-3 clear paragraphs.
   Focus on key insights, main points, and important conclusions.
   Make the summary accessible to someone unfamiliar with the topic.
   
   ARTICLE:
   {TEXT}
   
   SUMMARY:
   `
   
   const KEYPOINTS_PROMPT = `
   Extract 3-5 key points from this article:
   {TEXT}
   
   Key Points:
   - `
   ```
7. Caching layer:
   ```ts
   async getSummary(articleUrl: string, text: string): Promise<Summary>
   - Check cache first (by URL hash)
   - Generate if not found
   - Store in cache (SQLite or JSON)
   ```

**Dependencies**: 
- `axios` (HTTP client for Ollama API)
- `node-cache` (optional, in-memory cache)
- `better-sqlite3` (optional, persistent cache)

**Configuration**:
```json
{
  "llm": {
    "type": "ollama",
    "baseUrl": "http://localhost:11434",
    "primaryModel": "llama3.1",
    "fallbackModels": ["mistral", "qwen3:4b", "gemma3"],
    "summaryLength": "medium",
    "temperature": 0.5,
    "topP": 0.9,
    "topK": 40,
    "timeout": 120000,
    "streaming": true,
    "caching": true,
    "cacheDir": "./cache/summaries"
  }
}
```

**Error Handling**:
```ts
- OllamaNotRunningError: Ollama server unavailable
- ModelNotFoundError: Requested model not installed
- TimeoutError: Summarization exceeded timeout
- InsufficientVRAMError: Model too large for GPU (fallback to slower model)
```

**Testing**:
- Mock Ollama HTTP responses
- Test model fallback chain
- Prompt quality evaluation
- Cache hit/miss scenarios
- Timeout handling
- Offline mode (skip summarization gracefully)

**Setup Instructions for Users**:
```bash
# Install Ollama from https://ollama.ai
# Ensure it's running (ollama serve)

# Download recommended models:
ollama pull llama3.1       # ~5GB, best for summaries
ollama pull qwen3:4b       # ~2.5GB, lightweight option
ollama pull mistral        # ~4.4GB, alternative quality

# Verify installation:
ollama list
```

---

### Task 3.2: Markdown Generator
**Objective**: Create publication-ready markdown files with all components  
**Deliverables**:
- [ ] Structured markdown template
- [ ] Metadata insertion
- [ ] Image embedding with captions
- [ ] Summary formatting
- [ ] Full article text preservation
- [ ] Table of contents generation

**Implementation Steps**:
1. Create `src/services/MarkdownGenerator.ts`
2. Define markdown structure:
   ```md
   # Article Title
   
   **Source**: [Publication](url) | **Author**: Name | **Date**: 2024-01-15
   
   ## Summary
   [Generated summary]
   
   ## Key Points
   - Point 1
   - Point 2
   
   ## Images
   ![Alt text](./images/img1.png)
   
   ## Full Article
   [Article content]
   
   ---
   **Source URL**: [Link]
   **Extracted**: 2024-01-15
   ```
3. Generate template:
   ```ts
   async generateMarkdown(article: Article, summary: Summary): Promise<string>
   - Build frontmatter (YAML)
   - Insert metadata
   - Include summary
   - Embed images with captions
   - Append full text
   ```
4. Front matter support:
   ```yaml
   ---
   title: Article Title
   source: Publication Name
   author: Author Name
   date: 2024-01-15
   url: https://...
   summary: One-liner
   tags: [tech, news]
   ---
   ```

**Dependencies**: `gray-matter`, `markdown-it`

**Testing**:
- Markdown validation (syntax correctness)
- Rendering in different viewers (GitHub, Obsidian, Notion)
- Link integrity
- Image path validation

---

### Task 3.3: File Output & Organization
**Objective**: Save and organize output files with proper naming/structure  
**Deliverables**:
- [ ] File naming strategy (date-based, slug-based)
- [ ] Directory organization by publication/topic
- [ ] Batch processing support
- [ ] Deduplication logic
- [ ] Export formats (Markdown, HTML, PDF optional)

**Implementation Steps**:
1. Create `src/services/OutputManager.ts`
2. Define naming convention:
   ```ts
   generateFilename(article: Article): string
   // Output: 2024-01-15_article-title-slug.md
   ```
3. Directory structure:
   ```
   output/
   ├── 2024/
   │   └── January/
   │       ├── The Guardian/
   │       │   └── 2024-01-15_article.md
   │       └── MIT Tech Review/
   │           └── 2024-01-15_article.md
   └── images/
       ├── article-1/
       │   └── img1.png
   ```
4. Save with metadata:
   ```ts
   async saveArticle(article: Article, summary: Summary): Promise<SaveResult>
   - Create directory structure
   - Save markdown file
   - Save images in subfolder
   - Generate manifest (JSON with metadata)
   ```
5. Batch processing:
   ```ts
   async processBatch(urls: string[]): Promise<BatchResult>
   - Process multiple URLs
   - Parallel with concurrency limit
   - Return summary report
   ```

**Configuration**:
```json
{
  "output": {
    "baseDir": "./articles",
    "structure": "date/publication",
    "naming": "slug",
    "createSubfolders": true,
    "formats": ["markdown", "html"],
    "deduplication": "url-hash"
  }
}
```

**Testing**:
- File creation and organization
- Path handling (Windows/Linux/Mac)
- Duplicate detection
- Special character handling in filenames

---

## Phase 4: CLI & Integration

### Task 4.1: CLI Interface (Commander.js)
**Objective**: User-friendly command-line interface  
**Deliverables**:
- [ ] Command structure
- [ ] Argument parsing and validation
- [ ] Help documentation
- [ ] Progress indicators
- [ ] Error messaging

**Implementation Steps**:
1. Create `src/cli/index.ts`
2. Define commands:
   ```bash
   # Single article
   article-extractor extract <url> --cookies <file> --output <dir>
   
   # Batch processing
   article-extractor batch --urls <file.txt> --cookies <file>
   
   # Setup
   article-extractor setup --help
   ```
3. Options:
   ```bash
   --cookies, -c <file>       Path to cookies JSON file
   --output, -o <dir>         Output directory
   --summary <length>         none|short|medium|long
   --llm <provider>           claude|openai
   --format <type>            markdown|html|both
   --images                   Download images (default: true)
   --verbose, -v              Verbose logging
   ```
4. Progress display:
   ```ts
   - Show spinner while loading
   - Progress bar for image downloads
   - Final summary report
   ```

**Dependencies**: `commander`, `ora` (spinners), `chalk` (colors)

**Updated CLI Options for Ollama**:
```bash
--llm-model <name>         Ollama model to use (auto-detect if not specified)
--llm-url <url>            Ollama server URL (default: http://localhost:11434)
--summary <mode>           none|speed|quality|medium (speed=qwen, quality=llama)
--check-ollama             Verify Ollama is running before processing
```

**Testing**:
- Command parsing
- Invalid argument handling
- Help output accuracy

---

### Task 4.2: Error Handling & Logging
**Objective**: Robust error handling and user-friendly logging  
**Deliverables**:
- [ ] Structured logging (levels: debug, info, warn, error)
- [ ] Error codes and messages
- [ ] Recovery suggestions
- [ ] Debug mode
- [ ] Log file output

**Implementation Steps**:
1. Create `src/utils/Logger.ts`
2. Logging levels:
   ```ts
   logger.debug('Detailed info')
   logger.info('Normal operation')
   logger.warn('Warning: potential issue')
   logger.error('Error with recovery steps')
   ```
3. Error handling:
   ```ts
   class PaywallDetectionError extends Error { }
   class CookieExpiredError extends Error { }
   class ImageDownloadError extends Error { }
   class SummarizationError extends Error { }
   ```
4. Recovery logic:
   ```ts
   try {
     await processArticle(url)
   } catch (error) {
     if (error instanceof CookieExpiredError) {
       logger.warn('Cookies expired. Refresh and retry.')
     }
   }
   ```

**Dependencies**: `winston`, `pino` (logging libraries)

**Configuration**:
```json
{
  "logging": {
    "level": "info",
    "format": "json",
    "file": "./logs/app.log",
    "maxFileSize": "10m"
  }
}
```

**Ollama-Specific Errors**:
- `OLLAMA_NOT_RUNNING`: Ollama server not responding
  - Recovery: Show user instructions to start Ollama
  - Fallback: Skip summarization, process rest of article
- `MODEL_NOT_FOUND`: Selected model not installed
  - Recovery: Show available models from `ollama list`
  - Fallback: Use first available model
- `INSUFFICIENT_MEMORY`: GPU/RAM too low for model
  - Recovery: Suggest faster model (qwen3:4b)
  - Fallback: Skip summarization

---

### Task 4.3: Configuration Management
**Objective**: Flexible configuration system  
**Deliverables**:
- [ ] Config file support (.env, JSON, YAML)
- [ ] Environment variable overrides
- [ ] Config validation with Zod
- [ ] Defaults fallback

**Implementation Steps**:
1. Create `src/config/index.ts`
2. Config sources (priority order):
   - CLI arguments (highest)
   - Environment variables
   - Config file (config.json/yaml)
   - Defaults (lowest)
3. Schema validation:
   ```ts
   const configSchema = z.object({
     browser: z.object({
       timeout: z.number().min(5000),
       headless: z.boolean()
     }),
     llm: z.object({
       provider: z.enum(['claude', 'openai']),
       apiKey: z.string()
     })
   })
   ```

**File Structure**:
```
config/
├── default.json
├── development.json
├── production.json
└── .env.example

# Example default.json with Ollama config:
{
  "browser": {
    "timeout": 30000,
    "headless": true
  },
  "llm": {
    "type": "ollama",
    "baseUrl": "http://localhost:11434",
    "primaryModel": "llama3.1",
    "fallbackModels": ["mistral", "qwen3:4b"],
    "timeout": 120000
  },
  "output": {
    "baseDir": "./articles"
  }
}
```

---

## Phase 5: Testing & Documentation

### Task 5.1: Unit & Integration Tests
**Objective**: Comprehensive test coverage  
**Deliverables**:
- [ ] Unit tests (>80% coverage)
- [ ] Integration tests
- [ ] E2E tests with mock sites
- [ ] Test fixtures

**Test Structure**:
```
tests/
├── unit/
│   ├── CookieManager.test.ts
│   ├── ContentExtractor.test.ts
│   └── MarkdownGenerator.test.ts
├── integration/
│   ├── BrowserEngine.integration.test.ts
│   └── Pipeline.integration.test.ts
└── fixtures/
    ├── sample-articles/
    └── mock-cookies.json
```

**Testing Stack**: `Jest`, `Supertest` (API testing), `Puppeteer testing utils`

---

### Task 5.2: Documentation
**Objective**: Complete user and developer documentation  
**Deliverables**:
- [ ] README.md with quick start
- [ ] API documentation
- [ ] CLI help (built into tool)
- [ ] Architecture guide
- [ ] Cookie export guides (for different browsers)
- [ ] Troubleshooting guide
- [ ] Example outputs

**Documentation Structure**:
```
docs/
├── README.md              # Main readme
├── QUICKSTART.md          # 5-minute setup
├── CLI.md                 # Command reference
├── ARCHITECTURE.md        # Design decisions
├── COOKIE-SETUP.md        # Browser-specific guides
├── TROUBLESHOOTING.md     # Common issues
├── API.md                 # TypeScript API reference
└── EXAMPLES.md            # Sample usage
```

---

## Phase 6: Deployment & Refinement

### Task 6.1: Package & Distribute
**Objective**: Make tool installable and runnable  
**Deliverables**:
- [ ] NPM package (optional)
- [ ] Docker image
- [ ] Standalone executable (pkg)
- [ ] GitHub releases

**Outputs**:
- `npm install article-extractor` (if published)
- Docker: `docker build -t article-extractor .`
- Executable: `./article-extractor-linux-x64`

---

### Task 6.2: Performance Optimization
**Objective**: Speed and resource efficiency  
**Deliverables**:
- [ ] Benchmark suite
- [ ] Memory profiling
- [ ] Parallel processing optimization
- [ ] Caching optimization

**Benchmarks**:
- Single article extraction: < 60s target
- Image download: < 10s for typical article
- Summarization: < 30s
- Markdown generation: < 2s

---

## Implementation Order (Recommended)

### **Week 1: Foundation**
1. Task 1.1 - Project Setup
2. Task 1.2 - Cookie Manager
3. Task 1.3 - Browser Engine

### **Week 2: Extraction**
4. Task 2.1 - Content Extraction
5. Task 2.2 - Image Extraction

### **Week 3: Intelligence & Output**
6. Task 3.1 - LLM Integration
7. Task 3.2 - Markdown Generator
8. Task 3.3 - File Output

### **Week 4: Interface & Polish**
9. Task 4.1 - CLI Interface
10. Task 4.2 - Error Handling
11. Task 4.3 - Configuration

### **Week 5: Quality**
12. Task 5.1 - Testing
13. Task 5.2 - Documentation

### **Week 6: Release**
14. Task 6.1 - Packaging
15. Task 6.2 - Optimization

---

## Success Checklist

### Core Functionality
- [ ] Extract text from paywalled articles
- [ ] Download and embed images
- [ ] Generate coherent summaries
- [ ] Create valid markdown files
- [ ] Handle cookie authentication
- [ ] Support 5+ paywall types

### Quality
- [ ] >80% test coverage
- [ ] Zero known security issues
- [ ] Complete documentation
- [ ] < 60s per article processing
- [ ] Handles edge cases gracefully

### Release Readiness
- [ ] Works on Windows/Mac/Linux
- [ ] Clear installation instructions
- [ ] Example outputs provided
- [ ] Troubleshooting guide complete
- [ ] GitHub repo with proper structure

---

## Known Challenges & Solutions

| Challenge | Solution |
|-----------|----------|
| Paywall detection variability | Multiple detection strategies, fallback manual testing |
| Cookie expiration | Auto-refresh with user notification |
| Image CDN blocking | Proxy rotation, retry with backoff |
| LLM cost overruns | Token counting, usage alerts |
| JavaScript complexity | Full Puppeteer rendering, extended timeouts |

---

## Post-Launch Roadmap

1. **User Feedback Integration** (Week 7)
2. **Performance Tuning** (Week 8)
3. **Advanced Features**: Batch scheduling, webhooks
4. **Browser Extension** (Optional)
5. **Web UI Dashboard** (Optional)

