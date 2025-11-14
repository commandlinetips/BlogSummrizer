# Product Requirements Document: Paywalled Article Extractor with Summaries

## Executive Summary
A CLI/API tool that uses browser automation with paid account cookies to access paywalled articles, extract content with images, generate AI summaries, and output structured markdown files.

## 1. Problem Statement
Users with valid paid subscriptions to news/article platforms cannot easily:
- Programmatically access articles they have legitimate access to
- Extract full article content with embedded images
- Generate quick summaries for knowledge management
- Create persistent markdown records with all associated media

Current solutions either:
- Require manual browser interaction
- Lack image preservation capabilities
- Don't generate summaries automatically
- Use ethically questionable paywall bypass methods

## 2. Solution Overview
Build an automation tool that:
1. **Authenticates** using existing paid-account cookies (legally legitimate)
2. **Renders** articles in a real browser (handles JavaScript-heavy paywalls)
3. **Extracts** full article text + all images
4. **Summarizes** content using LLM (Claude/GPT)
5. **Generates** a markdown file with:
   - Article metadata (title, author, date, source URL)
   - Summary (2-3 paragraphs)
   - Embedded article images
   - Full article text (optional, for archival)

## 3. Key Features

### 3.1 Authentication Layer
- **Cookie Import**: Load cookies from browser export or JSON file
- **Cookie Validation**: Verify cookies grant access before processing
- **Session Management**: Maintain persistent sessions across requests
- **Timeout Handling**: Refresh cookies if expired

### 3.2 Browser Automation
- **Headless Browser**: Use Puppeteer (Node.js) or Playwright for rendering
- **JavaScript Execution**: Full page rendering to bypass client-side paywalls
- **Dynamic Loading**: Wait for lazy-loaded content
- **Cookie Injection**: Insert cookies before navigation
- **Anti-Detection**: Mimic human behavior (random delays, user-agent rotation)

### 3.3 Content Extraction
- **Text Extraction**: Remove boilerplate (headers, footers, ads)
- **Image Extraction**: Download all article images
- **Metadata Parsing**: Title, author, publication date, source URL
- **Link Preservation**: Maintain reference links in markdown
- **HTML Cleaning**: Convert to clean markdown

### 3.4 Summarization Engine (Local Ollama)
- **LLM Integration**: Local Ollama models (no API keys required)
- **Model Support**:
  - **Primary**: `llama3.1` (4.9GB) - Best balance of speed/quality
  - **Fast Mode**: `qwen3:4b` (2.5GB) - Quick summaries, lower resources
  - **Quality Mode**: `mistral` (4.4GB) - Nuanced understanding
  - Auto-fallback if model unavailable
- **Smart Summarization**:
  - Executive summary (2-3 paragraphs)
  - Key points extraction
  - Optional TL;DR (one-liner)
- **Customizable Length**: Short/Medium/Long summary options
- **Offline-First**: Runs locally, no internet required after model download

### 3.5 Markdown Output
- **Structured Format**:
  ```
  # [Article Title]
  
  **Source**: [Publication Name] | [URL]  
  **Author**: [Name] | **Date**: [Published Date]
  
  ## Summary
  [AI-generated summary]
  
  ## Images
  [Embedded images with captions]
  
  ## Full Article
  [Original article text]
  ```
- **Image Embedding**: Relative paths, downloadable to local folder
- **File Organization**: Organized by publication/date

### 3.6 Error Handling
- Paywall detection failures
- Session expiration
- Image download failures
- Summarization API rate limits
- Graceful degradation

## 4. Technical Stack

### Recommended Architecture
```
┌─────────────────────────────────────┐
│     CLI / API Entry Point           │
│  (Node.js with Commander.js)        │
└────────────────┬────────────────────┘
                 │
     ┌───────────┼───────────┐
     │           │           │
┌────▼───┐ ┌────▼───┐ ┌───▼─────┐
│ Cookie │ │Browser │ │   LLM   │
│Manager │ │Engine  │ │ Client  │
└────┬───┘ └────┬───┘ └───┬─────┘
     │          │         │
     └──────────┼─────────┘
              │
      ┌───────▼────────┐
      │  Content Store │
      │ (Markdown/IMG) │
      └────────────────┘
```

### Technology Choices
| Component | Option 1 | Option 2 |
|-----------|----------|----------|
| Browser Automation | Puppeteer | Playwright |
| Runtime | Node.js 18+ | Bun |
| **LLM Backend** | **Ollama (Local)** | ~~Claude API~~ ~~GPT-4~~ |
| LLM Communication | `ollama` npm package | Direct HTTP to `localhost:11434` |
| Markdown Generation | Marked.js | Pandoc |
| Image Processing | Sharp | ImageMagick |
| CLI Framework | Commander.js | Yargs |
| HTTP Client | Axios | Node-fetch |
| Data Validation | Zod | Yup |

**Why Ollama?**
- ✅ No API costs (free, locally-hosted)
- ✅ No rate limits
- ✅ Works offline
- ✅ Complete privacy (data never leaves your machine)
- ✅ Instant inference (no network latency)
- ✅ Multiple models available

## 5. User Flows

### 5.1 Initial Setup
```
User exports cookies from browser
    ↓
Provides article URL + cookie file
    ↓
System validates cookie access
    ↓
Confirms article is accessible
```

### 5.2 Article Processing
```
Load article URL with cookies
    ↓
Render in headless browser
    ↓
Detect if paywall present
    ↓
Extract text + images
    ↓
Parse metadata
    ↓
Summarize with LLM
    ↓
Generate markdown file
    ↓
Download images to local folder
    ↓
Output complete package
```

## 6. Supported Paywalls
- **Soft Paywalls** (JavaScript overlays): MIT Technology Review, Medium, some news sites
- **Client-Side Hard Paywalls**: Sites that load content then hide it
- **Server-Side (Limited)**: If user is pre-authenticated with cookies

**Not Supported**:
- Server-side paywalls requiring fresh authentication
- Token-based APIs without cookie equivalents

## 7. Success Metrics
- ✅ Successfully extract >90% of article text
- ✅ Preserve >95% of article images
- ✅ Generate summaries within 30 seconds
- ✅ Markdown output renders correctly in all markdown viewers
- ✅ Handle 50+ different paywall types
- ✅ Support batch processing (multiple URLs)

## 8. Non-Functional Requirements

### Performance
- Single article: < 60 seconds (render + extract + summarize)
- Batch processing: Parallel processing with rate limiting
- Image download: Concurrent (max 5 simultaneous)

### Reliability
- Retry logic for transient failures
- Graceful degradation (summary optional)
- Session recovery from cookie expiration

### Security
- Store cookies securely (encrypted config file)
- No credential logging
- HTTPS-only for all requests
- No telemetry/tracking

### Compliance
- Respect robots.txt from paid account perspective
- Only access URLs user has legitimate subscription to
- Clear terms: "For archival of legitimately accessible content"

## 9. MVP Scope (Phase 1)
- Single article extraction
- Manual cookie import
- Basic text + image extraction
- Local Ollama summarization (llama3.1 primary, qwen3:4b fallback)
- Markdown output with images
- Support 5 major paywall types
- Auto-detect and use available Ollama model

## 10. Future Enhancements (Phase 2+)
- Batch URL processing
- Scheduled article downloads
- Web UI dashboard
- Browser extension integration
- Advanced metadata extraction
- Citation generation
- Database storage with full-text search
- Email delivery of summaries
- Webhook integration
- Custom LLM prompt templates

## 11. Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Cookie expiration | Tool stops working | Auto-refresh, user notification |
| Paywall updates break extraction | Lost functionality | Regular testing, modular extractors |
| Ollama not running | Summaries fail | Clear error message, setup guide |
| Required model not downloaded | Processing blocked | Auto-detect available models, fallback chain |
| Insufficient VRAM for model | Out of memory errors | Model selection based on system specs |
| Legal concerns | Takedown risk | Clear ToS, user responsibility |
| Image CDN blocking | Missing images | Retry, fallback URLs |

## 12. Acceptance Criteria
- [ ] CLI accepts URL + cookie file
- [ ] Extracts article text accurately
- [ ] Downloads and embeds images in markdown
- [ ] Generates coherent summaries
- [ ] Creates properly formatted markdown files
- [ ] Handles cookie expiration gracefully
- [ ] Processes batch URLs
- [ ] Comprehensive error messages
- [ ] Works with 5+ different paywall types
- [ ] Complete documentation + examples
