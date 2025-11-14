# Article Extractor with Local Ollama - Refined Implementation Guide

## 📋 Overview

Refined PRD and tasks for building a **paywalled article extraction tool** using:
- **Browser Automation**: Puppeteer for rendering JavaScript-heavy paywalls
- **Local LLM**: Ollama models for offline article summarization
- **Cookie Authentication**: Legitimate access using paid account cookies

**Key Advantage**: No API costs, complete privacy, offline-capable, fast inference

---

## 🎯 Model Selection (Your Ollama Models)

### ⭐ RECOMMENDED: llama3.1 (4.9GB)
- **Best Balance** of speed and quality
- ~25 seconds per 2000-word article
- Excellent for production use

### ⚡ FAST OPTION: qwen3:4b (2.5GB)
- **3x faster** than llama3.1
- ~10 seconds per 2000-word article
- Good quality, great for batch processing

### 🎨 QUALITY OPTION: mistral (4.4GB)
- **Highest quality** output
- ~30 seconds per 2000-word article
- Use when quality matters more than speed

### ❌ NOT RECOMMENDED:
- codellama, deepseek-coder, starcoder2 (code-focused)
- llava (overkill, slow)
- gemma3:1b, nomic-embed-text (too small/embeddings-only)

**See OLLAMA_MODEL_GUIDE.md for detailed analysis**

---

## 📚 Documentation Files

### 1. **PRD.md** (Product Requirements)
- ✅ Problem statement
- ✅ Solution architecture
- ✅ Feature breakdown
- ✅ Technology stack (updated for Ollama)
- ✅ User flows
- ✅ Success metrics
- ✅ MVP scope

**Key Changes from Original**:
- Replaced "Claude/GPT API" with "Local Ollama"
- Added Ollama model options (llama3.1, mistral, qwen3:4b)
- Removed API cost risks, added memory/VRAM risks
- Emphasized offline-first, privacy-first approach

---

### 2. **TASKS.md** (Implementation Breakdown)
- ✅ 15 detailed tasks across 6 phases
- ✅ Step-by-step implementation instructions
- ✅ Dependency lists
- ✅ Configuration examples
- ✅ 6-week timeline

**Key Changes from Original**:

**Task 3.1 (LLM Integration)** - COMPLETELY REWRITTEN:
- Old: Claude/OpenAI API integration
- New: Ollama local client with HTTP API
- Includes model detection, fallback chain, streaming support
- Error handling for Ollama-specific issues
- Setup instructions for downloading models

**Other Updates**:
- CLI options updated for Ollama (--llm-model, --llm-url, --summary)
- Configuration examples show Ollama setup
- Error handling section includes Ollama-specific errors

---

### 3. **OLLAMA_MODEL_GUIDE.md** (NEW - Model Analysis)
- ✅ Detailed breakdown of your 11 Ollama models
- ✅ Tier ranking for article summarization
- ✅ Speed vs Quality comparison
- ✅ Resource requirements analysis
- ✅ Recommended configurations
- ✅ Performance benchmarks
- ✅ Model selection algorithm

**This is crucial** because choosing the wrong model affects:
- Processing speed (10s vs 30s per article)
- Summary quality
- System resource requirements
- Fallback behavior

---

### 4. **SETUP_CHECKLIST.md** (NEW - Quick Start)
- ✅ Pre-development verification
- ✅ Project initialization steps
- ✅ Dependency installation
- ✅ Configuration file creation
- ✅ Ollama health check script
- ✅ System requirements verification
- ✅ Troubleshooting guide

**Use this BEFORE starting implementation** to ensure your environment is ready.

---

## 🚀 Quick Start Path

### Phase 0: Pre-Development (Do This First)
```bash
# 1. Verify Ollama
ollama list
# Should show: qwen3:4b, llama3.1, mistral, etc.

# 2. Follow SETUP_CHECKLIST.md
# This creates your project structure and verifies everything

# 3. Run health check
npm run check-ollama
```

### Phase 1: Foundation (Week 1)
1. **Task 1.1**: Project Setup
2. **Task 1.2**: Cookie Manager
3. **Task 1.3**: Browser Engine

### Phase 2: Content Extraction (Week 2)
4. **Task 2.1**: Article Text Extraction
5. **Task 2.2**: Image Extraction

### Phase 3: Ollama Integration (Week 3) ⭐ KEY DIFFERENCE
6. **Task 3.1**: Local Ollama LLM Integration
   - Ollama health check
   - Model detection
   - Fallback chain logic
   - Summarization prompts (optimized for local models)
7. **Task 3.2**: Markdown Generator
8. **Task 3.3**: File Output

### Phase 4: CLI & Interface (Week 4)
9. **Task 4.1**: CLI Commands
10. **Task 4.2**: Error Handling
11. **Task 4.3**: Configuration

### Phase 5: Quality (Week 5)
12. **Task 5.1**: Testing
13. **Task 5.2**: Documentation

### Phase 6: Release (Week 6)
14. **Task 6.1**: Packaging
15. **Task 6.2**: Performance

---

## 🔑 Key Differences from Original Design

| Aspect | Original | Refined (Ollama) |
|--------|----------|------------------|
| **LLM** | Claude API / OpenAI | Local Ollama models |
| **Cost** | $$ per API call | Free (local) |
| **Privacy** | Data sent to cloud | All data local |
| **Speed** | Network latency (~2-5s) | Instant inference |
| **Rate Limits** | API-based limits | None |
| **Offline** | ❌ Requires internet | ✅ Works offline |
| **Model Flexibility** | 2 choices | 3+ choices (llama, mistral, qwen) |
| **Setup Complexity** | API keys required | Download models once |
| **Dependency** | 3rd party services | Self-hosted |

---

## 💻 Implementation Architecture

### System Design with Ollama
```
┌─────────────────────────────┐
│   CLI Entry Point           │
│ (Commander.js)              │
└──────────────┬──────────────┘
               │
    ┌──────────┼──────────┐
    │          │          │
┌───▼──┐  ┌───▼──┐  ┌───▼──────┐
│Cookie│  │Browser  │ │OllamaClient
│Mgr   │  │Engine   │ │(Local HTTP)
└───┬──┘  └───┬──┘  └───┬──────┘
    │         │         │
    └─────────┼─────────┘
              │
    ┌─────────▼──────────┐
    │  Content Processor │
    │ (Extract + Cache)  │
    └─────────┬──────────┘
              │
    ┌─────────▼──────────┐
    │ Markdown Generator │
    │ (Images + Summary) │
    └────────────────────┘
              │
    ┌─────────▼──────────┐
    │   Output Manager   │
    │  (Save organized)  │
    └────────────────────┘
```

### Ollama Integration Details
```
Your Machine
├── Ollama Server (localhost:11434)
│   ├── llama3.1 (4.9GB) - Primary
│   ├── mistral (4.4GB) - Quality fallback
│   └── qwen3:4b (2.5GB) - Speed fallback
│
└── Article Extractor (Node.js)
    └── OllamaClient
        ├── Health Check (HTTP GET /api/tags)
        ├── Model Selection (pick best available)
        └── Summarization (HTTP POST /api/generate)
```

---

## 📊 Expected Performance

### Time Breakdown (per article)
| Step | Time | Notes |
|------|------|-------|
| Load & render | 15-20s | Browser + cookies |
| Extract text | 2-3s | DOM parsing |
| Download images | 5-10s | Depends on count/size |
| **Summarize (llama3.1)** | **20-25s** | Local inference |
| **Summarize (qwen3:4b)** | **8-15s** | Fast mode |
| Generate markdown | 1-2s | File writing |
| **Total (llama3.1)** | **~45-60s** | ✅ Target met |
| **Total (qwen3:4b)** | **~30-45s** | ⚡ Speed mode |

### Cost Comparison
| Method | Cost | Privacy | Speed | Offline |
|--------|------|---------|-------|---------|
| Claude API | ~$0.50/article | ❌ Cloud | 20s | ❌ |
| OpenAI GPT | ~$0.30/article | ❌ Cloud | 25s | ❌ |
| **Ollama (yours)** | **$0** | **✅ Local** | **10-25s** | **✅ Yes** |

---

## 🔧 Configuration Example

### Start with this config (config/default.json):
```json
{
  "browser": {
    "timeout": 30000,
    "headless": true,
    "retries": 3
  },
  "llm": {
    "type": "ollama",
    "baseUrl": "http://localhost:11434",
    "primaryModel": "llama3.1",
    "fallbackModels": ["mistral", "qwen3:4b"],
    "temperature": 0.5,
    "timeout": 120000,
    "caching": true
  },
  "output": {
    "baseDir": "./output/articles",
    "structure": "date/publication"
  }
}
```

### Example Usage:
```bash
# Default (uses llama3.1)
npm run extract -- https://example.com/article --cookies cookies.json

# Fast mode (uses qwen3:4b)
npm run extract -- https://example.com/article --cookies cookies.json --summary speed

# Quality mode (waits for best result)
npm run extract -- https://example.com/article --cookies cookies.json --summary quality

# Batch processing
npm run batch -- --urls articles.txt --cookies cookies.json
```

---

## 📦 Dependencies Overview

### Core Dependencies (14 total)
```json
{
  "puppeteer": "^21.0.0",        // Browser automation
  "axios": "^1.6.0",             // HTTP client (Ollama)
  "commander": "^11.0.0",        // CLI framework
  "chalk": "^5.3.0",             // Colored output
  "ora": "^7.0.0",               // Spinners
  "turndown": "^7.1.1",          // HTML to Markdown
  "sharp": "^0.33.0",            // Image processing
  "zod": "^3.22.0",              // Validation
  "dotenv": "^16.3.1",           // Environment config
  "node-cache": "^5.1.2"         // Optional caching
}
```

### Dev Dependencies (14 total)
```json
{
  "typescript": "^5.2.0",
  "jest": "^29.7.0",
  "ts-jest": "^29.1.1",
  "ts-node": "^10.9.1",
  "eslint": "^8.51.0",
  "prettier": "^3.0.3"
}
```

---

## 🎓 Learning Path

1. **Read PRD.md** (10 min)
   - Understand what you're building
   - Review feature list

2. **Read OLLAMA_MODEL_GUIDE.md** (15 min)
   - Understand why llama3.1 is recommended
   - Learn performance trade-offs

3. **Complete SETUP_CHECKLIST.md** (30 min)
   - Verify Ollama setup
   - Initialize project
   - Create config files

4. **Follow TASKS.md Phase by Phase** (6 weeks)
   - Start with Task 1.1
   - Implement in order
   - Test as you go

---

## ✅ Verification Points

After setup, you should be able to:

```bash
# 1. Check Ollama
npm run check-ollama
# ✓ Ollama is running
# ✓ 3+ models found

# 2. Build project
npm run build
# ✓ TypeScript compiles
# ✓ No errors

# 3. Test Ollama client
npm run dev
# ✓ Successfully connects to Ollama
# ✓ Lists available models
```

---

## 🚨 Common Issues & Solutions

### "Ollama not running"
```bash
# Start it in another terminal
ollama serve
```

### "Model not found: llama3.1"
```bash
# Download it
ollama pull llama3.1
```

### "Out of memory"
```bash
# Use faster model
# In config: "primaryModel": "qwen3:4b"
```

### "npm install fails"
```bash
npm cache clean --force
npm install
```

---

## 📈 Success Metrics

### By End of Week 3 (MVP):
- ✅ Extract articles from paywalled sites
- ✅ Generate summaries with local LLM
- ✅ Create markdown files with images
- ✅ Handle 5+ different paywall types

### By End of Week 6 (Full Release):
- ✅ Batch processing support
- ✅ Complete error handling
- ✅ Full test coverage
- ✅ Production-ready code

---

## 📖 File Reading Order

1. **START HERE**: SETUP_CHECKLIST.md
2. Then: OLLAMA_MODEL_GUIDE.md
3. Then: PRD.md
4. Then: TASKS.md
5. Reference: Individual task files

---

## 🎯 Next Steps

1. Read this README_REFINED.md (you are here)
2. Follow SETUP_CHECKLIST.md to verify your environment
3. Read OLLAMA_MODEL_GUIDE.md to understand model choices
4. Read PRD.md to understand the full design
5. Follow TASKS.md to implement phase by phase

**Estimated Total Time**: 6 weeks of part-time development

---

## 💡 Why Local Ollama?

### vs Cloud APIs (Claude, GPT):
- ❌ Cloud: $$$, rate limited, latency, privacy concerns
- ✅ Ollama: Free, unlimited, instant, complete privacy

### vs Smaller Local Models:
- ❌ Small models: Lower quality summaries
- ✅ llama3.1: Professional-grade output

### vs Larger Models:
- ❌ Larger: Slow (2-5 min per article), more VRAM
- ✅ llama3.1: Fast enough (25s), reasonable VRAM (6-8GB)

**Verdict**: Ollama + llama3.1 = Best balance for this use case

---

## 📞 Troubleshooting Resources

See SETUP_CHECKLIST.md "Troubleshooting Pre-Development" section for:
- Ollama not found
- Connection errors
- Model not available
- Memory issues
- npm installation failures

---

## License & Ethics

⚖️ **This tool is designed for**:
- Users with legitimate paid subscriptions
- Archival of content they have legal access to
- Personal knowledge management
- Research and analysis

⚠️ **NOT for**:
- Bypassing paywalls on content you don't have access to
- Copyright infringement
- Bulk redistribution

**Read COMPLIANCE section in PRD.md for more details**

---

Generated: November 2024
Version: 1.0-Ollama-Optimized
