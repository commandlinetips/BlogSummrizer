# Article Extractor with Local Ollama Summaries

A CLI/API tool that uses browser automation with paid account cookies to access paywalled articles, extract content with images, generate AI summaries using local Ollama models, and output structured markdown files.

## Quick Start

### Prerequisites
- Node.js 18+
- Ollama installed and running (`ollama serve`)
- Article platform subscription (for cookie authentication)

### Installation

```bash
# Clone or navigate to project directory
cd article-extractor

# Install dependencies
npm install

# Verify Ollama is running with required models
npm run check-ollama
```

### Basic Usage

```bash
# Extract a single article
npm run extract -- https://example.com/article --cookies cookies.json

# Run in development mode
npm run dev

# Build for production
npm run build
npm start
```

## Features

- **Authentication**: Cookie-based access to paywalled articles
- **Content Extraction**: Full text, images, and metadata
- **Summarization**: Local Ollama LLM for offline summarization
- **Markdown Output**: Structured article files with embedded images
- **Multiple Models**: Support for llama3.1, mistral, qwen3:4b, and more

## Configuration

See `config/default.json` and `.env.example` for available options.

## Project Structure

```
article-extractor/
├── src/
│   ├── services/          # Core business logic
│   ├── cli/               # CLI interface
│   ├── utils/             # Helper utilities
│   ├── config/            # Configuration management
│   └── index.ts           # Entry point
├── tests/                 # Test suites
├── config/                # Configuration files
├── dist/                  # Compiled output
└── output/                # Generated articles
```

## Development

```bash
# Build TypeScript
npm run build

# Run tests
npm test

# Watch mode
npm run test:watch

# Linting
npm run lint

# Format code
npm run format
```

## Ollama Model Selection

**Recommended:** `llama3.1` (4.9GB) - Best balance of speed and quality
**Fast mode:** `qwen3:4b` (2.5GB) - 3x faster, still very good quality
**Quality mode:** `mistral` (4.4GB) - Excellent but slightly slower

See `OLLAMA_MODEL_GUIDE.md` for detailed analysis.

## Documentation

- [PRD.md](./PRD.md) - Product requirements and specification
- [TASKS.md](./TASKS.md) - Implementation task breakdown
- [SETUP_CHECKLIST.md](./SETUP_CHECKLIST.md) - Setup guide
- [OLLAMA_MODEL_GUIDE.md](./OLLAMA_MODEL_GUIDE.md) - Model selection guide

## License

MIT
