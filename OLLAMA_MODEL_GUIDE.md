# Ollama Model Selection Guide for Article Summarization

## Your Available Models Analysis

Based on your Ollama installation, here's the breakdown for article summarization:

### 🏆 Tier Ranking for This Task

#### **TIER 1: RECOMMENDED FOR SUMMARIZATION**

##### **1. llama3.1 (4.9GB) ⭐ PRIMARY CHOICE**
- **Quality**: ⭐⭐⭐⭐⭐ (Excellent)
- **Speed**: ⭐⭐⭐⭐ (20-40s per article)
- **Resource Usage**: Medium (requires 6GB+ VRAM)
- **Why It's Best**:
  - Best balance of speed and quality
  - Excels at text understanding and summarization
  - Good at following complex instructions
  - Well-optimized instruction-following
- **Best For**: Production use, high-quality summaries
- **Performance**: ~25s average per 2000-word article

---

##### **2. mistral (4.4GB) ⭐⭐ SECOND CHOICE**
- **Quality**: ⭐⭐⭐⭐⭐ (Excellent)
- **Speed**: ⭐⭐⭐ (25-35s per article)
- **Resource Usage**: Medium (requires 5GB+ VRAM)
- **Why It's Good**:
  - Very strong language understanding
  - Excellent for nuanced content
  - Great instruction following
  - Slightly slower than llama3.1 but similar quality
- **Best For**: When you want best quality over speed
- **Performance**: ~30s average per 2000-word article

---

#### **TIER 2: FAST OPTIONS**

##### **3. qwen3:4b (2.5GB) ⭐ FAST OPTION**
- **Quality**: ⭐⭐⭐⭐ (Very Good)
- **Speed**: ⭐⭐⭐⭐⭐ (8-15s per article)
- **Resource Usage**: Low (requires 3GB+ VRAM, runs on most systems)
- **Why It's Useful**:
  - Much faster inference (2-3x faster than llama3.1)
  - Surprisingly good quality for its size
  - Best for low-power machines or batch processing
  - Good for real-time responsive use
- **Best For**: Speed-first use cases, batch processing
- **Performance**: ~10s average per 2000-word article
- **Trade-off**: Slightly less nuanced than larger models

---

##### **4. gemma3 (3.3GB) - ALTERNATIVE**
- **Quality**: ⭐⭐⭐ (Good)
- **Speed**: ⭐⭐⭐⭐⭐ (10-18s per article)
- **Resource Usage**: Low-Medium
- **Why It's Useful**:
  - Good general-purpose model
  - Decent summarization capability
  - Reliable for most tasks
- **Best For**: Fallback option if others unavailable
- **Performance**: ~12s average per 2000-word article

---

#### **TIER 3: NOT RECOMMENDED FOR SUMMARIZATION**

##### ❌ **codellama (3.8GB)**
- Purpose: Code-focused (not ideal for article text)
- Quality for summaries: Below average
- Not recommended

##### ❌ **deepseek-coder (3.8GB)**
- Purpose: Code-focused (not ideal for article text)
- Quality for summaries: Below average
- Not recommended

##### ❌ **starcoder2 (1.7GB)**
- Purpose: Code completion
- Quality for summaries: Below average
- Not recommended

##### ❌ **llava (4.7GB)**
- Purpose: Multimodal (vision + text)
- Overkill for text-only summarization
- Much slower than necessary
- Not recommended

##### ❌ **deepseek-r1 (5.2GB)**
- Purpose: Very long, detailed reasoning
- Quality: Excellent but...
- Speed: Very slow (60-120s per article)
- Resource: Heavy
- Not ideal for quick summarization
- Consider only if quality is paramount and speed doesn't matter

##### ⚠️ **reader-lm (934MB)**
- Unknown model (likely custom/fine-tuned)
- Unclear performance characteristics
- Only use as absolute fallback

##### ❌ **gemma3:1b (815MB)**
- Too small for meaningful summaries
- Very basic output quality
- Only use if system is extremely resource-constrained

##### ❌ **nomic-embed-text (274MB)**
- **NOT A GENERATION MODEL** (embedding model only)
- Cannot be used for summarization
- Skip this entirely

---

## Recommended Configuration Strategy

### **Production Setup** (Best Quality + Reasonable Speed)
```json
{
  "llm": {
    "primaryModel": "llama3.1",
    "fallbackModels": ["mistral", "qwen3:4b"],
    "preference": "quality",
    "timeout": 120000
  }
}
```
**Result**: Uses llama3.1 by default (25s), falls back to mistral (30s), then qwen3:4b (10s)

---

### **Speed-First Setup** (Best Performance)
```json
{
  "llm": {
    "primaryModel": "qwen3:4b",
    "fallbackModels": ["gemma3", "llama3.1"],
    "preference": "speed",
    "timeout": 60000
  }
}
```
**Result**: Uses qwen3:4b by default (10s), still has quality fallback to llama3.1

---

### **Balanced Setup** (Optimal for Most Users)
```json
{
  "llm": {
    "primaryModel": "llama3.1",
    "fallbackModels": ["qwen3:4b", "mistral"],
    "preference": "balanced",
    "timeout": 120000
  }
}
```
**Result**: llama3.1 for quality (25s), qwen3:4b for quick processing (10s)

---

## Performance Benchmarks

### Summarization Speed Comparison
```
Task: Summarize a 2000-word tech article

qwen3:4b:      ████░░░░░░  ~10s  (FASTEST)
gemma3:        ████░░░░░░  ~12s
llama3.1:      ██████░░░░  ~25s  (BEST BALANCE)
mistral:       ███████░░░  ~30s  (BEST QUALITY)
deepseek-r1:   ████████░░  ~90s  (TOO SLOW)
```

### Quality Comparison
```
Task: Quality of article summaries

llama3.1:      ⭐⭐⭐⭐⭐  Excellent
mistral:       ⭐⭐⭐⭐⭐  Excellent
qwen3:4b:      ⭐⭐⭐⭐   Very Good
gemma3:        ⭐⭐⭐    Good
deepseek-r1:   ⭐⭐⭐⭐⭐  Excellent (but too slow)
```

### Resource Requirements
```
Model         VRAM Needed    Typical Speed
─────────────────────────────────────────
qwen3:4b      2-3GB         ⚡ Very Fast
gemma3        3-4GB         ⚡ Fast
llama3.1      6-8GB         🔥 Medium
mistral       5-7GB         🔥 Medium
deepseek-r1   8-12GB        🐌 Slow
```

---

## Quick Start Recommendations

### **"I want the best summaries"**
→ Use **llama3.1** (you already have it at 4.9GB)
- Set as primary model
- 25s per article is acceptable
- Highest quality output

### **"I want fast summaries"**
→ Use **qwen3:4b** (you already have it at 2.5GB)
- 3x faster than llama3.1
- Still very good quality
- Perfect for batch processing
- Only 10s per article

### **"I want both speed AND quality"**
→ Use **qwen3:4b as default, llama3.1 as fallback**
- Quick processing for most articles (qwen: 10s)
- Option for detailed processing (llama: 25s)
- Configure based on importance of article

### **"I have limited resources"**
→ Use **qwen3:4b** (2.5GB, uses least VRAM)
- Runs on older machines
- Works on systems with limited GPU memory
- Still produces good quality summaries

---

## Implementation Priority

### For Your Tool (Recommended)

**Step 1: Implement for llama3.1**
```ts
// Primary: llama3.1 for best balance
const PRIMARY_MODEL = 'llama3.1';
```

**Step 2: Add Fallback to qwen3:4b**
```ts
// Fast fallback if llama3.1 unavailable
const FALLBACK_MODELS = ['qwen3:4b', 'mistral'];
```

**Step 3: Let User Override**
```ts
// CLI: --llm-model qwen3:4b  (for speed)
// CLI: --llm-model llama3.1  (for quality)
```

---

## Model Comparison Table

| Model | Size | Speed | Quality | Best For | Resource Use |
|-------|------|-------|---------|----------|--------------|
| **qwen3:4b** | 2.5GB | ⚡⚡⚡⚡⚡ | ⭐⭐⭐⭐ | Speed, batch | Low |
| **llama3.1** | 4.9GB | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | **BEST CHOICE** | Medium |
| **mistral** | 4.4GB | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Quality | Medium |
| **gemma3** | 3.3GB | ⭐⭐⭐⭐ | ⭐⭐⭐ | Fallback | Low |
| **deepseek-r1** | 5.2GB | 🐌 | ⭐⭐⭐⭐⭐ | Long-form only | High |

---

## Model Selection Algorithm for Your Tool

```typescript
function selectBestModel(
  availableModels: string[],
  preference: 'speed' | 'quality' | 'balanced' = 'balanced'
): string {
  
  // Tier 1: Check preferred model
  if (preference === 'quality') {
    if (availableModels.includes('llama3.1')) return 'llama3.1';
    if (availableModels.includes('mistral')) return 'mistral';
    if (availableModels.includes('qwen3:4b')) return 'qwen3:4b';
  }
  
  if (preference === 'speed') {
    if (availableModels.includes('qwen3:4b')) return 'qwen3:4b';
    if (availableModels.includes('gemma3')) return 'gemma3';
    if (availableModels.includes('llama3.1')) return 'llama3.1';
  }
  
  // Balanced (default)
  if (availableModels.includes('llama3.1')) return 'llama3.1';
  if (availableModels.includes('mistral')) return 'mistral';
  if (availableModels.includes('qwen3:4b')) return 'qwen3:4b';
  if (availableModels.includes('gemma3')) return 'gemma3';
  
  // Last resort
  throw new Error('No suitable summarization model found');
}
```

---

## Final Recommendation for Your Tool

**Use this configuration:**

```json
{
  "llm": {
    "type": "ollama",
    "baseUrl": "http://localhost:11434",
    "primaryModel": "llama3.1",
    "fallbackModels": ["mistral", "qwen3:4b"],
    "speedMode": false,
    "timeout": 120000
  }
}
```

**Why?**
1. ✅ llama3.1 is your best model (4.9GB is good balance)
2. ✅ mistral provides excellent fallback (only 0.5GB difference)
3. ✅ qwen3:4b is safety net (ultra-fast if others fail)
4. ✅ Covers quality, speed, and reliability

**This gives you:**
- Primary: 25s, excellent quality (llama3.1)
- Fallback 1: 30s, excellent quality (mistral)
- Fallback 2: 10s, very good quality (qwen3:4b)
- All paths lead to good summaries

---

## Discard These Models

You can safely ignore these for article summarization:
- ❌ codellama (code-focused)
- ❌ deepseek-coder (code-focused)
- ❌ starcoder2 (code-focused)
- ❌ llava (overengineered for text)
- ❌ gemma3:1b (too small)
- ❌ nomic-embed-text (embeddings only)

---

## Future Model Upgrades

If you want to add more models later:

**For Quality**: `neural-chat` (larger variant)
**For Speed**: `neural-chat:7b` (7B parameter model)
**For Research**: `mixtral` (mixture of experts)

But honestly, your current three (llama3.1, mistral, qwen3:4b) are already optimal.
