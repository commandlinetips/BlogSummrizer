# Quick Setup Checklist - Paywalled Article Extractor with Local Ollama

## Pre-Development Verification

### ✅ Verify Ollama Installation
```bash
# Check if Ollama is installed
ollama version

# Expected output: ollama version X.X.X

# Start Ollama (if not running)
ollama serve

# In another terminal, verify connection
curl http://localhost:11434/api/tags

# Expected output: JSON with your installed models
```

### ✅ Verify Your Models
```bash
ollama list

# You should see these models:
# qwen3:4b (2.5 GB) ✓
# llama3.1 (4.9 GB) ✓
# mistral (4.4 GB) ✓
```

### ✅ Test Model Inference (Optional)
```bash
# Quick test with qwen3:4b (fast)
ollama run qwen3:4b "Summarize this in one sentence: The quick brown fox jumped over the lazy dog."

# Or test llama3.1
ollama run llama3.1 "Summarize this in one sentence: The quick brown fox jumped over the lazy dog."
```

---

## Project Initialization

### ✅ Step 1: Create Project Structure
```bash
# Create main project directory
mkdir article-extractor
cd article-extractor

# Create subdirectories
mkdir -p src/{services,utils,config,cli}
mkdir -p tests/{unit,integration}
mkdir -p config
mkdir -p output/{articles,images,cache}
mkdir -p docs
mkdir -p logs

# Initialize git
git init
```

### ✅ Step 2: Initialize Node.js Project
```bash
# Create package.json
npm init -y

# Or with more options:
npm init
# Project name: article-extractor
# Version: 0.1.0
# Description: Extract and summarize paywalled articles
# Entry point: dist/index.js
# Test command: jest
# License: MIT
```

### ✅ Step 3: Install Core Dependencies

```bash
# Browser automation
npm install puppeteer

# HTTP client (for Ollama)
npm install axios

# CLI framework
npm install commander chalk ora

# Markdown processing
npm install turndown gray-matter

# Image processing
npm install sharp

# Utilities
npm install dotenv zod lodash

# Development dependencies
npm install -D typescript @types/node @types/puppeteer ts-node tsconfig-paths
npm install -D eslint prettier
npm install -D jest @types/jest ts-jest
npm install -D @typescript-eslint/eslint-plugin @typescript-eslint/parser
```

### ✅ Step 4: Setup TypeScript Configuration
```bash
# Generate tsconfig.json
npx tsc --init

# Then edit tsconfig.json with:
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "tests", "dist"]
}
```

---

## Development Setup

### ✅ Step 5: Create Configuration Files

**config/default.json**:
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
    "fallbackModels": ["mistral", "qwen3:4b"],
    "summaryLength": "medium",
    "temperature": 0.5,
    "timeout": 120000,
    "streaming": true,
    "caching": true,
    "cacheDir": "./cache/summaries"
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
    "createSubfolders": true,
    "deduplication": "url-hash"
  },
  "logging": {
    "level": "info",
    "format": "text",
    "file": "./logs/app.log"
  }
}
```

**.env.example**:
```bash
# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_PRIMARY_MODEL=llama3.1
OLLAMA_TIMEOUT=120000

# Browser Configuration
BROWSER_HEADLESS=true
BROWSER_TIMEOUT=30000

# Output Configuration
OUTPUT_DIR=./output/articles
CACHE_DIR=./cache

# Logging
LOG_LEVEL=info
```

### ✅ Step 6: Create .gitignore
```
# Dependencies
node_modules/
package-lock.json
yarn.lock

# Build
dist/
*.tsbuildinfo

# Environment
.env
.env.local

# Output
output/
cache/
logs/

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Cookies (security)
cookies.json
cookies.*.json
```

---

## Package.json Scripts

### ✅ Step 7: Update package.json Scripts
```json
{
  "scripts": {
    "build": "tsc",
    "dev": "ts-node src/index.ts",
    "start": "node dist/index.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "lint": "eslint src --ext .ts",
    "format": "prettier --write src/**/*.ts",
    "check-ollama": "ts-node src/utils/check-ollama.ts",
    "extract": "ts-node src/cli/index.ts extract",
    "batch": "ts-node src/cli/index.ts batch"
  },
  "keywords": ["article", "extractor", "summarizer", "paywall", "ollama"],
  "author": "Your Name",
  "license": "MIT"
}
```

---

## Ollama Health Check

### ✅ Step 8: Create Ollama Verification Script

**src/utils/check-ollama.ts**:
```typescript
import axios from 'axios';

async function checkOllamaHealth() {
  try {
    const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    const response = await axios.get(`${baseUrl}/api/tags`, { timeout: 5000 });
    
    const models = response.data.models || [];
    console.log('✅ Ollama is running');
    console.log(`\nInstalled models (${models.length}):`);
    
    models.forEach((model: any) => {
      const name = model.name;
      const size = (model.size / 1024 / 1024 / 1024).toFixed(2);
      console.log(`  - ${name} (${size} GB)`);
    });
    
    // Check for recommended models
    const modelNames = models.map((m: any) => m.name);
    const recommended = ['llama3.1', 'mistral', 'qwen3:4b'];
    const missing = recommended.filter(m => !modelNames.some(name => name.includes(m)));
    
    if (missing.length > 0) {
      console.log(`\n⚠️  Missing recommended models: ${missing.join(', ')}`);
      console.log('\nTo install, run:');
      missing.forEach(m => console.log(`  ollama pull ${m}`));
    }
  } catch (error) {
    console.error('❌ Ollama is not running or not accessible');
    console.error('   Please start Ollama with: ollama serve');
    process.exit(1);
  }
}

checkOllamaHealth();
```

### Run the Check:
```bash
npm run check-ollama
```

---

## Pre-Development Checklist

- [ ] Ollama installed and running
- [ ] Your 3 models confirmed installed (qwen3:4b, llama3.1, mistral)
- [ ] Node.js 18+ installed
- [ ] Project directory created
- [ ] package.json initialized
- [ ] Dependencies installed
- [ ] TypeScript configured
- [ ] Configuration files created
- [ ] .gitignore created
- [ ] Ollama health check passes
- [ ] Scripts added to package.json

---

## Quick Start Commands

Once setup is complete:

```bash
# Verify everything works
npm run check-ollama

# Build the project
npm run build

# Run in development
npm run dev

# Extract a single article
npm run extract -- https://example.com/article --cookies cookies.json

# Help menu
npm run extract -- --help
```

---

## System Requirements Verification

### Minimum Specs:
- **CPU**: Multi-core processor (4+ cores recommended)
- **RAM**: 8GB minimum, 16GB recommended
- **GPU**: Optional but recommended (NVIDIA or AMD for Ollama)
- **Storage**: 
  - Ollama models: ~12-15GB
  - Output cache: ~1-2GB per 100 articles
- **Network**: Internet for initial model downloads only

### Verify Your System:
```bash
# Check available memory
free -h          # Linux
vm_stat           # macOS
wmic OS get TotalVisibleMemorySize  # Windows

# Check disk space
df -h             # Linux/macOS
dir C:\           # Windows

# Verify GPU (optional)
nvidia-smi        # NVIDIA GPUs
rocm-smi          # AMD GPUs
```

---

## Troubleshooting Pre-Development

### ❌ "ollama: command not found"
- Install from https://ollama.ai
- Restart terminal
- Check PATH: `echo $PATH`

### ❌ "Cannot connect to http://localhost:11434"
- Start Ollama: `ollama serve`
- Check it's listening: `netstat -an | grep 11434`
- May need to allow firewall access

### ❌ "Model not found"
- List models: `ollama list`
- Download missing: `ollama pull llama3.1`
- Wait for download to complete

### ❌ "Out of memory" errors
- Use smaller model: qwen3:4b instead of llama3.1
- Close other applications
- Check GPU VRAM: `nvidia-smi`

### ❌ npm install fails
- Clear cache: `npm cache clean --force`
- Delete node_modules: `rm -rf node_modules`
- Reinstall: `npm install`
- Check Node version: `node --version` (need 18+)

---

## Next Steps

1. **Complete this checklist**
2. **Follow TASKS.md starting with Task 1.1**
3. **Implement Phase 1 (Foundation & Infrastructure)**
4. **Test OllamaClient implementation**
5. **Then proceed to Phase 2 (Content Extraction)**

---

## File Structure After Setup

```
article-extractor/
├── src/
│   ├── services/
│   │   ├── CookieManager.ts
│   │   ├── BrowserEngine.ts
│   │   ├── OllamaClient.ts (NEXT TO IMPLEMENT)
│   │   └── ... (other services)
│   ├── cli/
│   │   └── index.ts
│   ├── utils/
│   │   └── check-ollama.ts
│   ├── config/
│   │   └── index.ts
│   └── index.ts
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── config/
│   ├── default.json
│   ├── development.json
│   └── .env.example
├── output/
│   ├── articles/
│   ├── images/
│   └── cache/
├── docs/
├── logs/
├── .gitignore
├── tsconfig.json
├── jest.config.js
└── package.json
```

---

## Success Indicators

✅ All checks pass:
```bash
✓ Ollama running at http://localhost:11434
✓ 3+ models installed
✓ Node.js 18+ available
✓ npm dependencies installed
✓ TypeScript configured
✓ Configuration files created
✓ Scripts working
```

You're now ready to start implementing! 🚀
