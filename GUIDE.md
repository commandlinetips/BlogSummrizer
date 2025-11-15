# 📖 Paywalled Article Extractor - Complete User Guide

> Extract, summarize, and save paywalled articles you have legitimate access to

**Version**: 1.0.0  
**Status**: Production Ready ✅  
**Tests**: 190/190 passing

---

## 📑 Table of Contents

1. [Quick Start](#quick-start)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Usage Examples](#usage-examples)
5. [CLI Commands](#cli-commands)
6. [Environment Variables](#environment-variables)
7. [Troubleshooting](#troubleshooting)
8. [Advanced Features](#advanced-features)

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ LTS
- **Ollama** (for AI summaries) - [Install](https://ollama.ai)
- **Browser cookies** from a site you're subscribed to

### 5-Minute Setup

```bash
# 1. Install dependencies
npm install

# 2. Start Ollama (in separate terminal)
ollama serve

# 3. Pull a model
ollama pull llama3.1

# 4. Export cookies from your browser
# Use "Get cookies.txt" extension in Chrome/Firefox

# 5. Extract your first article
npm run dev extract https://example.com/article --cookies ./cookies.txt
```

**That's it!** Your article will be saved to `./output/articles/` 🎉

---

## 📦 Installation

### Step 1: Clone & Install

```bash
git clone <your-repo>
cd article-extractor
npm install
```

### Step 2: Install Ollama

**macOS/Linux:**
```bash
curl https://ollama.ai/install.sh | sh
ollama serve
```

**Windows:**
- Download from [ollama.ai](https://ollama.ai)
- Run installer
- Start Ollama from Start menu

### Step 3: Pull AI Models

```bash
# Recommended: Fast & high quality
ollama pull llama3.1

# Alternative: Smaller/faster
ollama pull qwen2.5:0.5b

# Alternative: Better quality
ollama pull mistral
```

### Step 4: Build the Project

```bash
npm run build
```

---

## ⚙️ Configuration

### Config File: `config/default.json`

```json
{
  "browser": {
    "timeout": 30000,
    "headless": true,
    "antiDetection": true,
    "retries": 3
  },
  "llm": {
    "type": "ollama",
    "baseUrl": "http://localhost:11434",
    "primaryModel": "llama3.1",
    "fallbackModels": ["mistral", "qwen2.5:0.5b"],
    "summaryLength": "medium",
    "temperature": 0.5,
    "timeout": 120000
  },
  "images": {
    "maxWidth": 1200,
    "quality": 80,
    "maxConcurrent": 5,
    "timeout": 10000
  },
  "output": {
    "baseDir": "./output/articles",
    "structure": "date/publication",
    "naming": "slug",
    "deduplication": "url-hash"
  },
  "logging": {
    "level": "info",
    "format": "text",
    "file": "./logs/app.log"
  }
}
```

### Environment Variables (`.env`)

```bash
# Browser settings
BROWSER_HEADLESS=true
BROWSER_TIMEOUT=30000

# Ollama settings
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_PRIMARY_MODEL=llama3.1
OLLAMA_FALLBACK_MODELS=mistral,qwen2.5:0.5b

# Summary settings
SUMMARY_LENGTH=medium        # short | medium | long
LLM_TEMPERATURE=0.5         # 0.0 - 1.0

# Output settings
OUTPUT_DIR=./output/articles
OUTPUT_STRUCTURE=date/publication  # date/publication | publication/date

# Logging
LOG_LEVEL=info              # error | warn | info | debug
LOG_FORMAT=text             # text | json
LOG_FILE=./logs/app.log
```

---

## 💡 Usage Examples

### Example 1: Extract Single Article

```bash
npm run dev extract https://example.com/article --cookies ./cookies.txt
```

**Output:**
```
✓ Loading article...
✓ Extracting content...
✓ Downloading images (3 found)...
✓ Generating summary...

📊 Results
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Article Title: "Climate Report 2024"
  → Publication: The Guardian
  → Author: John Doe
  → Words: 2,458 (3 min read)
  → Summary: 456 words (81% reduction)

📁 Saved to:
  Original:   output/articles/2024/November/guardian.com/original_climate_report_2024.md
  Summarized: output/articles/2024/November/guardian.com/summarized_climate_report_2024.md
  Images:     output/articles/2024/November/guardian.com/images/

✨ Completed in 32s
```

### Example 2: Custom Summary Length

```bash
# Short summary (2-3 sentences)
npm run dev extract https://example.com/article \
  --cookies ./cookies.txt \
  --summary short

# Long summary (detailed)
npm run dev extract https://example.com/article \
  --cookies ./cookies.txt \
  --summary long
```

### Example 3: Batch Processing

Create `urls.txt`:
```
https://example.com/article1
https://example.com/article2
https://example.com/article3
```

Run batch:
```bash
npm run dev batch ./urls.txt --cookies ./cookies.txt
```

### Example 4: Skip Summarization (Fast)

```bash
npm run dev extract https://example.com/article \
  --cookies ./cookies.txt \
  --no-summary
```

### Example 5: Custom Output Directory

```bash
npm run dev extract https://example.com/article \
  --cookies ./cookies.txt \
  --output ./my-articles
```

### Example 6: Verbose Logging

```bash
npm run dev extract https://example.com/article \
  --cookies ./cookies.txt \
  --verbose
```

---

## 🛠️ CLI Commands

### `extract` - Extract Single Article

```bash
npm run dev extract <url> [options]
```

**Options:**
- `--cookies <file>` - Path to cookies file (required)
- `--output <dir>` - Output directory (default: `./output/articles`)
- `--summary <mode>` - Summary length: `short`, `medium`, `long` (default: `medium`)
- `--no-summary` - Skip AI summarization
- `--model <name>` - Ollama model to use (default: `llama3.1`)
- `--verbose` - Verbose logging

**Example:**
```bash
npm run dev extract https://nytimes.com/article \
  --cookies ./nytimes-cookies.txt \
  --summary long \
  --verbose
```

---

### `batch` - Batch Process Multiple URLs

```bash
npm run dev batch <file> [options]
```

**URL File Format** (`urls.txt`):
```
https://example.com/article1
https://example.com/article2
# Comments allowed
https://example.com/article3
```

**Options:**
- `--cookies <file>` - Path to cookies file (required)
- `--output <dir>` - Output directory
- `--summary <mode>` - Summary length
- `--concurrent <num>` - Max concurrent extractions (default: 3)

**Example:**
```bash
npm run dev batch ./reading-list.txt \
  --cookies ./cookies.txt \
  --concurrent 5
```

---

### `list` - List Extracted Articles

```bash
npm run dev list [options]
```

**Options:**
- `--dir <path>` - Directory to search (default: `./output/articles`)
- `--limit <num>` - Max results to show (default: 20)
- `--format <type>` - Output format: `table`, `json` (default: `table`)

**Example:**
```bash
npm run dev list --limit 10
```

**Output:**
```
Recent Articles
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Date        Publication    Title
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2024-11-14  The Guardian   Climate Report 2024
2024-11-14  NYTimes        Economic Analysis
2024-11-13  MIT Tech       AI Breakthrough
```

---

### `cleanup` - Remove Old Articles

```bash
npm run dev cleanup [options]
```

**Options:**
- `--days <num>` - Remove articles older than N days (default: 30)
- `--dir <path>` - Directory to clean (default: `./output/articles`)
- `--dry-run` - Preview what will be deleted

**Example:**
```bash
# Preview what will be deleted
npm run dev cleanup --days 60 --dry-run

# Actually delete
npm run dev cleanup --days 60
```

---

### `status` - System Health Check

```bash
npm run dev status
```

**Output:**
```
System Status
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Node.js: v18.17.0
✓ TypeScript: 5.2.2
✓ Ollama: Running (http://localhost:11434)
✓ Available models:
  • llama3.1 (primary)
  • mistral (fallback)
  • qwen2.5:0.5b (fallback)
✓ Output directory: ./output/articles
✓ Log file: ./logs/app.log
✓ Config: Valid

Ready to extract articles! 🚀
```

---

## 🍪 Exporting Cookies

### Chrome (EditThisCookie Extension)

1. Install [EditThisCookie](https://chrome.google.com/webstore)
2. Go to the paywalled site and log in
3. Click EditThisCookie extension
4. Click "Export" → Select "Netscape format"
5. Save as `cookies.txt`

### Firefox (cookies.txt Extension)

1. Install [cookies.txt](https://addons.mozilla.org/en-US/firefox/addon/cookies-txt/)
2. Go to the paywalled site and log in
3. Click extension icon
4. Click "Download" → Save as `cookies.txt`

### Manual Cookie Export (JSON)

Create `cookies.json`:
```json
[
  {
    "name": "session_id",
    "value": "abc123...",
    "domain": ".example.com",
    "path": "/",
    "expires": 1735689600,
    "httpOnly": true,
    "secure": true
  }
]
```

---

## 🌍 Environment Variables Reference

### Complete List

| Variable | Default | Description |
|----------|---------|-------------|
| `BROWSER_HEADLESS` | `true` | Run browser in headless mode |
| `BROWSER_TIMEOUT` | `30000` | Page load timeout (ms) |
| `BROWSER_RETRIES` | `3` | Number of retry attempts |
| `LLM_TYPE` | `ollama` | LLM provider |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama server URL |
| `OLLAMA_PRIMARY_MODEL` | `llama3.1` | Primary model |
| `OLLAMA_FALLBACK_MODELS` | `mistral,qwen2.5:0.5b` | Fallback models (comma-separated) |
| `OLLAMA_TIMEOUT` | `120000` | LLM timeout (ms) |
| `SUMMARY_LENGTH` | `medium` | Summary length (short/medium/long) |
| `LLM_TEMPERATURE` | `0.5` | Model temperature (0.0-1.0) |
| `IMAGE_MAX_WIDTH` | `1200` | Max image width (px) |
| `IMAGE_QUALITY` | `80` | JPEG quality (1-100) |
| `IMAGE_MAX_CONCURRENT` | `5` | Max concurrent downloads |
| `OUTPUT_DIR` | `./output/articles` | Output directory |
| `OUTPUT_STRUCTURE` | `date/publication` | Directory structure |
| `OUTPUT_NAMING` | `slug` | File naming strategy |
| `LOG_LEVEL` | `info` | Log level (error/warn/info/debug) |
| `LOG_FORMAT` | `text` | Log format (text/json) |
| `LOG_FILE` | `./logs/app.log` | Log file path |

---

## 🐛 Troubleshooting

### Problem: "Paywall detected"

**Cause:** Cookies are expired or invalid

**Solution:**
```bash
# 1. Log in to the site in your browser
# 2. Export fresh cookies
# 3. Update the cookies file
# 4. Try again
```

---

### Problem: "Ollama server not running"

**Cause:** Ollama is not started

**Solution:**
```bash
# Start Ollama
ollama serve

# Check if running
curl http://localhost:11434/api/tags
```

---

### Problem: "Model not found"

**Cause:** Model not downloaded

**Solution:**
```bash
# List available models
ollama list

# Pull missing model
ollama pull llama3.1
```

---

### Problem: "Insufficient memory"

**Cause:** Model too large for your system

**Solution:**
```bash
# Use smaller model
export OLLAMA_PRIMARY_MODEL=qwen2.5:0.5b
npm run dev extract <url> --cookies ./cookies.txt
```

---

### Problem: "Image download failed"

**Cause:** Network issues or CDN blocking

**Solution:**
- Images are optional - article still saved
- Check network connection
- Some images may be unavailable

---

### Problem: "Configuration validation error"

**Cause:** Invalid config values

**Solution:**
```bash
# Check config file
cat config/default.json

# Validate manually
npm run dev status

# Reset to defaults
mv config/default.json config/default.json.backup
# Copy from .env.example
```

---

## 🎯 Advanced Features

### Custom Ollama Models

```bash
# Use specific model
npm run dev extract <url> \
  --cookies ./cookies.txt \
  --model mistral

# Use custom local model
npm run dev extract <url> \
  --cookies ./cookies.txt \
  --model my-custom-model:latest
```

### Structured Output

**Directory Structure:**
```
output/articles/
├── 2024/
│   ├── November/
│   │   ├── example.com/
│   │   │   ├── original_article_title.md
│   │   │   ├── summarized_article_title.md
│   │   │   └── images/
│   │   │       ├── article_title_image_0.jpg
│   │   │       └── article_title_image_1.jpg
│   │   └── nytimes.com/
│   └── October/
```

### Markdown Output Format

**Original Article** (`original_*.md`):
```markdown
# Article Title

**Author**: John Doe | **Published**: November 14, 2024
**Source**: [example.com](https://example.com/article)

> Article description/excerpt

---

## Images

### Featured Image
![Featured](./images/article_image_0.jpg)

---

## Original Article

[Full article content in markdown...]

---

*Article extracted on 2024-11-14T10:30:00Z*
```

**Summarized Article** (`summarized_*.md`):
```markdown
# Article Title - Summary

👤 **John Doe** | 📅 Nov 14, 2024 | 🔗 [Source](https://example.com)

![Featured](./images/article_image_0.jpg)

> Article description

## Summary

[AI-generated 2-3 paragraph summary]

---

### Article Information

- **Source**: [example.com](https://example.com)
- **Summarized by**: llama3.1
- **Processing time**: 2.50s
- **Tokens used**: 150
- **Summary generated**: 2024-11-14T10:30:15Z

[📄 Read Full Article](./original_article_title.md)

---

*This is an AI-generated summary. Read the full article for complete details.*
```

---

## 📊 Log Files

**Log Location:** `./logs/app.log`

**View Logs:**
```bash
# Tail logs
tail -f ./logs/app.log

# Search logs
grep "ERROR" ./logs/app.log

# Last 100 lines
tail -n 100 ./logs/app.log
```

**Log Format:**
```
2024-11-14 10:30:15 [INFO]: Starting article extraction
2024-11-14 10:30:16 [INFO]: Loading page: https://example.com/article
2024-11-14 10:30:20 [INFO]: Content extracted: 2458 words
2024-11-14 10:30:22 [INFO]: Downloading 3 images
2024-11-14 10:30:25 [INFO]: Generating summary with llama3.1
2024-11-14 10:30:32 [INFO]: Summary generated in 7.2s
2024-11-14 10:30:33 [INFO]: Article saved to ./output/articles/...
```

---

## 🎓 Tips & Best Practices

### 1. Organize Your Cookies

```bash
# Keep separate cookie files per site
cookies/
├── nytimes.txt
├── guardian.txt
└── medium.txt
```

### 2. Automate with Scripts

```bash
#!/bin/bash
# daily-news.sh

npm run dev batch ./reading-list.txt \
  --cookies ./cookies/nytimes.txt \
  --summary short
```

### 3. Monitor Logs

```bash
# Watch logs in real-time
tail -f ./logs/app.log | grep -E "ERROR|WARN"
```

### 4. Regular Cleanup

```bash
# Add to cron: weekly cleanup
0 0 * * 0 npm run dev cleanup --days 30
```

---

## 📝 License & Legal

**Important:** This tool is for archiving articles from services you have **legitimate paid access** to. Respect copyright and terms of service.

**Recommended Use Cases:**
- ✅ Personal archival of paid subscriptions
- ✅ Offline reading of purchased content
- ✅ Research and note-taking
- ❌ Bypassing paywalls without subscription
- ❌ Redistributing paywalled content
- ❌ Commercial use without permission

---

## 🤝 Support

**Issues?** Check:
1. [Troubleshooting](#troubleshooting) section above
2. Run `npm run dev status` for system check
3. Check `./logs/app.log` for detailed errors
4. Verify cookies are fresh (re-export from browser)

**Happy extracting!** 📚✨

---

*Made with 💜 by your adorable assistant*
