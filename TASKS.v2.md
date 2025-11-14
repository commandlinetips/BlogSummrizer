# TASKS.v2.md - Phase 3.2+ Implementation Roadmap

## Current Status
- **Phase**: 3.1 Complete → Phase 3.2 Initiation
- **Tests Passing**: 28 ✅
- **Build Status**: Clean ✅
- **Services Implemented**: 6 core services

---

## Phase 3.2: Output Management & Formatting

### Task 3.2.1: File Output Manager
**Objective**: Organize extracted articles with proper directory structure and naming conventions

**Requirements**:
```
Output Structure:
articles/
├── original_article_1.md          (Original article copy)
├── summarised_article_1.md        (LLM summarized + metadata)
├── original_article_2.md
├── summarised_article_2.md
└── images/
    ├── article_1_image_1.jpg
    ├── article_1_image_2.jpg
    ├── article_2_image_1.png
    └── ...
```

**Deliverables**:
- [ ] Directory structure creation (articles/, images/)
- [ ] File naming convention: `original_[slug].md` and `summarised_[slug].md`
- [ ] Image naming: `[article_slug]_[image_index].[ext]`
- [ ] Deduplication by URL hash (prevent duplicates)
- [ ] Metadata JSON file for each article (manifest)
- [ ] Date-based organization (optional secondary structure)

**Implementation Steps**:
1. Create `src/services/OutputManager.ts`
2. Define interfaces:
   ```ts
   interface OutputConfig {
     baseDir: string;
     structureByDate: boolean;
     deduplicateByHash: boolean;
   }
   
   interface FileOutput {
     originalPath: string;
     summarisedPath: string;
     imagesPath: string[];
     metadataPath: string;
   }
   ```

3. Implement methods:
   ```ts
   async createOutputStructure(baseDir: string): Promise<void>
   async generateSlug(title: string, url: string): Promise<string>
   async saveOriginalArticle(content: string, slug: string): Promise<string>
   async saveSummarisedArticle(content: string, slug: string): Promise<string>
   async saveImages(images: LocalImage[], slug: string): Promise<string[]>
   async saveMetadata(article: Article, summary: Summary, slug: string): Promise<void>
   async checkDuplicate(url: string): Promise<boolean>
   ```

4. Slug generation logic:
   - Extract title or URL
   - Remove special characters
   - Convert to lowercase with hyphens
   - Add timestamp for uniqueness if duplicate

**Configuration**:
```json
{
  "output": {
    "baseDir": "./articles",
    "imagesDir": "./articles/images",
    "structureByDate": false,
    "deduplicateByHash": true,
    "deduplicationFile": "./articles/.manifest.json"
  }
}
```

**Testing**:
- [ ] Directory creation (Windows/Linux/Mac)
- [ ] Slug generation with special characters
- [ ] Duplicate detection
- [ ] File path handling across platforms
- [ ] Concurrent file writes

**Dependencies**: `fs-extra` (if needed for cross-platform support)

---

### Task 3.2.2: Markdown Generator
**Objective**: Create two markdown files per article - original and summarised

**Deliverables**:
- [ ] `original_[article_name].md` - Exact copy with metadata header
- [ ] `summarised_[article_name].md` - Formatted + summarised version with metadata

**File Formats**:

**Original Article (original_article_name.md)**:
```markdown
---
title: Article Title
source: Publication Name
author: Author Name
date: 2024-01-15
url: https://example.com/article
extracted: 2024-01-15T10:30:00Z
---

# Article Title

[Original article content - HTML converted to Markdown]

---

**Source**: [Publication](https://example.com)
**Author**: Author Name
**Date**: 2024-01-15
**Original URL**: [Link](https://example.com/article)
```

**Summarised Article (summarised_article_name.md)**:
```markdown
---
title: Article Title
source: Publication Name
author: Author Name
date: 2024-01-15
url: https://example.com/article
extracted: 2024-01-15T10:30:00Z
readingTime: 3 minutes (original article)
summaryLength: medium
model: llama3.1
---

# Article Title: Summary

**Source**: [Publication](https://example.com) | **Author**: Author Name | **Date**: 2024-01-15 | **Reading Time**: 3 min

## Executive Summary

[2-3 paragraph summary from LLM]

## Key Points

- Key insight 1
- Key insight 2
- Key insight 3

## Featured Image

![Featured Image](./images/article_slug_0.jpg)

## Full Article

[Complete original article content]

---

**Metadata**:
- **Source URL**: [Link](https://example.com/article)
- **Publication**: Publication Name
- **Author**: Author Name
- **Published**: 2024-01-15
- **Extracted**: 2024-01-15T10:30:00Z
- **Summarisation Model**: llama3.1
- **Summary Length**: medium (customizable)
```

**Implementation Steps**:
1. Create `src/services/MarkdownGenerator.ts`
2. Methods:
   ```ts
   async generateOriginalMarkdown(article: Article, imageUrls: string[]): Promise<string>
   async generateSummarisedMarkdown(
     article: Article, 
     summary: Summary, 
     imageUrls: string[],
     modelUsed: string
   ): Promise<string>
   
   private formatFrontmatter(metadata: ArticleMetadata): string
   private formatSummarySection(summary: Summary): string
   private formatKeyPoints(summary: Summary): string
   private formatMetadataFooter(article: Article, model: string): string
   ```

3. Image embedding:
   - Convert image paths to relative `./images/[name]`
   - Include featured image at top of summarised version
   - Add alt text and captions

4. Metadata handling:
   - YAML front matter with all metadata
   - Reading time calculation (original article)
   - Summary statistics (word count reduction %)

**Testing**:
- [ ] YAML front matter validity
- [ ] Markdown syntax correctness
- [ ] Image path validation (relative links)
- [ ] Rendering in GitHub/Obsidian/Notion
- [ ] Special character handling in metadata

**Dependencies**: Already installed (`gray-matter`)

---

## Phase 4: CLI Interface & Enhanced UX

### Task 4.1: Advanced CLI Interface (Amp-Style)
**Objective**: Create professional, organized CLI with Amp-like UI/UX

**Deliverables**:
- [ ] Amp-style command structure
- [ ] Real-time progress indicators
- [ ] Color-coded output with organized sections
- [ ] Interactive mode with prompts
- [ ] Help documentation
- [ ] Configuration validation before processing

**Commands**:
```bash
# Extract single article
article-extractor extract <url> [options]

# Batch process from file
article-extractor batch <file> [options]

# Configure setup
article-extractor setup

# Check system status
article-extractor status

# View logs
article-extractor logs [--lines N] [--follow]

# List recent extractions
article-extractor list [--limit N]
```

**CLI Output Style**:
```
╔════════════════════════════════════════════════════════════════╗
║           🚀 Paywalled Article Extractor v0.1.0              ║
╚════════════════════════════════════════════════════════════════╝

📋 Article Extraction Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Processing: https://example.com/article

[████████████░░░░] Loading Article (4s)
[████████████████] Extracting Content (6s)
[████████████████] Downloading Images (8s - 3 images)
[████████████████] Generating Summary (12s)

📊 Results
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Article Title
  → Publication: The Guardian
  → Author: John Doe
  → Date: January 15, 2024
  → Words: 2,458 words (3 min read)
  → Summary: 456 words (1 min read - 81% reduction)

📁 Output Files
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Original:   articles/original_article_title.md
  Summarised: articles/summarised_article_title.md
  Images:     articles/images/article_title_*.{jpg,png}

✨ Completed in 32s
```

**Implementation**:
1. Create `src/cli/commands/` directory with:
   - `extract.ts` - Single article extraction
   - `batch.ts` - Batch processing
   - `setup.ts` - Configuration setup
   - `status.ts` - System status check
   - `list.ts` - List recent extractions

2. UI Components:
   ```ts
   // src/cli/ui/
   ├── Spinner.ts       (Progress spinners with messages)
   ├── ProgressBar.ts   (Visual progress tracking)
   ├── Table.ts         (Results display)
   ├── Colors.ts        (Consistent color scheme)
   └── Layout.ts        (Header/footer formatting)
   ```

3. Main CLI entry:
   ```ts
   // src/cli/index.ts
   program
     .version('0.1.0')
     .description('Extract and summarise paywalled articles')
     .command('extract <url>')
     .option('-c, --cookies <file>', 'Path to cookies file')
     .option('-o, --output <dir>', 'Output directory')
     .option('-s, --summary <mode>', 'Summary mode: none|short|medium|long')
     .option('-m, --model <name>', 'Ollama model')
     .option('--check-ollama', 'Verify Ollama before processing')
     .option('-v, --verbose', 'Verbose output')
     .action(handleExtractCommand)
   ```

4. Progress tracking:
   - Spinner for each step (loading, extracting, downloading, summarising)
   - Progress bars for concurrent operations
   - Real-time status updates

**Dependencies**: `ora`, `chalk`, `table` (already in package.json)

**Testing**:
- [ ] Command parsing
- [ ] Help documentation accuracy
- [ ] Progress display on different terminals
- [ ] Color output (TTY detection)
- [ ] Error message clarity

---

### Task 4.2: Configuration Management UI
**Objective**: Interactive setup and configuration

**Deliverables**:
- [ ] `setup` command for initial configuration
- [ ] Interactive prompts for:
  - Cookie file location
  - Output directory
  - Ollama model preference
  - Summary length preference
- [ ] Configuration validation
- [ ] Config file generation (.env)

**Setup Flow**:
```bash
$ article-extractor setup

╔════════════════════════════════════════════════════════════════╗
║              ⚙️  Initial Configuration Setup                 ║
╚════════════════════════════════════════════════════════════════╝

? Where are your browser cookies? (./cookies.json): 
? Output directory for articles? (./articles): 
? Ollama server URL? (http://localhost:11434): 
? Preferred summary length? (medium):
  ❯ short    (Quick 2-3 bullet points)
    medium   (2-3 paragraph summary)
    long     (Detailed 4-5 paragraph summary)
    none     (No summarisation)

? Download images? (Y/n): 
? Enable verbose logging? (Y/n): 

✓ Configuration saved to .env

Next steps:
  1. Place your cookies.json in ./cookies.json
  2. Run: article-extractor extract <url>
  3. Check .env for advanced configuration
```

**Implementation**:
- Use `inquirer` for interactive prompts (add to dependencies)
- Validate all inputs
- Generate .env file
- Store backup of config

---

## Phase 5: Error Handling & Recovery

### Task 5.1: Comprehensive Error Handling
**Objective**: Graceful failures with helpful recovery suggestions

**Error Types & Recovery**:

| Error | Cause | Recovery | User Message |
|-------|-------|----------|--------------|
| `PAYWALL_DETECTED` | Article behind paywall | Update cookies | "Unable to access article. Cookies may be expired. Run `setup` to refresh." |
| `COOKIE_EXPIRED` | Session cookies expired | Refresh browser cookies | "Your session has expired. Please export new cookies from your browser." |
| `OLLAMA_NOT_RUNNING` | Ollama server down | Start Ollama service | "Ollama server not running. Start with: `ollama serve`" |
| `MODEL_NOT_FOUND` | Model not installed | List available models | "Model not found. Available: llama3.1, mistral. Run `ollama pull llama3.1`" |
| `INSUFFICIENT_MEMORY` | GPU/RAM too low | Use smaller model | "Model too large. Try: `--model qwen3:4b` for faster processing." |
| `IMAGE_DOWNLOAD_FAILED` | CDN/network issue | Retry with backoff | "Could not download 2/5 images. Proceeding without them." |
| `TIMEOUT` | Operation took too long | Increase timeout | "Processing took longer than expected. Increase --timeout 120000" |

**Implementation**:
1. Create `src/utils/errors.ts`:
   ```ts
   class ArticleExtractionError extends Error { }
   class PaywallDetectedError extends ArticleExtractionError { }
   class CookieExpiredError extends ArticleExtractionError { }
   class OllamaError extends ArticleExtractionError { }
   class ImageDownloadError extends ArticleExtractionError { }
   ```

2. Error handler with recovery suggestions:
   ```ts
   async function handleError(error: Error, context: ProcessingContext): Promise<void>
   ```

3. Graceful degradation:
   - Missing images → continue without them
   - Ollama unavailable → save article without summary
   - Some cookies expired → retry with valid ones

---

### Task 5.2: Logging & Debugging
**Objective**: Detailed logging for troubleshooting

**Deliverables**:
- [ ] File-based logging (./logs/app.log)
- [ ] Log levels: debug, info, warn, error
- [ ] Verbose CLI flag for console output
- [ ] Log rotation (max 10MB)
- [ ] Structured logs (JSON format option)

**Implementation**:
1. Create `src/utils/Logger.ts` with Winston integration
2. Log levels:
   ```
   DEBUG: Detailed system info (URL resolution, config values)
   INFO:  Normal operation (step completion)
   WARN:  Non-critical issues (missing images, slow response)
   ERROR: Critical issues (extraction failed, paywall detected)
   ```

3. Examples:
   ```
   [2024-01-15 10:30:05] INFO  Starting article extraction...
   [2024-01-15 10:30:06] DEBUG Loaded cookies: 5 valid, 2 expired
   [2024-01-15 10:30:12] INFO  Article extracted: "Climate Report"
   [2024-01-15 10:30:20] WARN  Failed to download 1/6 images
   [2024-01-15 10:30:32] INFO  Summary generated in 12s
   ```

---

## Implementation Timeline

### Week 1: Output Management
- Task 3.2.1: File Output Manager (2 days)
- Task 3.2.2: Markdown Generator (2 days)
- Testing & integration (1 day)

### Week 2: CLI & UX
- Task 4.1: Advanced CLI Interface (2 days)
- Task 4.2: Configuration Management (1 day)
- CLI testing & refinement (1 day)

### Week 3: Error Handling
- Task 5.1: Comprehensive Error Handling (2 days)
- Task 5.2: Logging & Debugging (1 day)
- Integration testing (1 day)

---

## Definition of Done

Each task is complete when:
- [ ] Code written and builds without errors
- [ ] Unit tests pass (>80% coverage)
- [ ] Integration tests written and passing
- [ ] Code reviewed and formatted with ESLint/Prettier
- [ ] Documentation updated
- [ ] No console errors or warnings

---

## Testing Checklist

- [ ] All 28 existing tests still pass
- [ ] 10+ new tests for OutputManager
- [ ] 10+ new tests for MarkdownGenerator
- [ ] 5+ new tests for CLI commands
- [ ] E2E test: URL → extracted files
- [ ] E2E test: Batch processing multiple URLs
- [ ] Test on Windows, macOS, Linux

---

## Success Metrics

- **Quality**: 0 vulnerabilities, >85% test coverage
- **Performance**: < 60s per article processing
- **UX**: Intuitive CLI with helpful error messages
- **Reliability**: Graceful handling of all failure scenarios

---

## Notes

- All timestamps should be ISO 8601 format
- File slugs should be URL-safe (lowercase, hyphens, no spaces)
- Images must use relative paths in markdown
- Metadata should be sufficient for later filtering/organization
- CLI output should be colorful but not overwhelming
