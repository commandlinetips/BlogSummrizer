import axios, { AxiosInstance } from 'axios';
import { config } from '../config/index.js';

export interface OllamaModelInfo {
  name: string;
  size: number;
  digest: string;
  modifiedAt: string;
}

export interface SummarizationOptions {
  model?: string;
  length?: 'short' | 'medium' | 'long';
  temperature?: number;
  timeout?: number;
}

export interface SummarizationResult {
  summary: string;
  model: string;
  tokensUsed?: number;
  processingTime: number;
}

export class OllamaClient {
  private client: AxiosInstance;
  private baseUrl: string;
  private availableModels: OllamaModelInfo[] | null = null;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || config.llm.baseUrl || 'http://localhost:11434';

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: config.llm.timeout || 120000,
    });
  }

  /**
   * Check if Ollama server is running
   */
  async isRunning(): Promise<boolean> {
    try {
      await this.client.get('/api/tags', { timeout: 5000 });
      return true;
    } catch (_error) {
      return false;
    }
  }

  /**
   * Get list of available models
   */
  async getAvailableModels(): Promise<OllamaModelInfo[]> {
    try {
      if (this.availableModels !== null) {
        return this.availableModels;
      }
      const response = await this.client.get('/api/tags');
      const models = response.data.models || [];
      this.availableModels = models;
      return models;
    } catch (error) {
      throw new Error(
        `Failed to fetch Ollama models: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Check if a specific model is available
   */
  async hasModel(modelName: string): Promise<boolean> {
    try {
      const models = await this.getAvailableModels();
      return models.some(m => m.name.includes(modelName));
    } catch (_error) {
      return false;
    }
  }

  /**
   * Select best available model from list of preferences
   */
  async selectBestModel(preferredModels: string[]): Promise<string | null> {
    try {
      const models = await this.getAvailableModels();
      const modelNames = models.map(m => m.name);

      for (const preferred of preferredModels) {
        if (modelNames.some(name => name.includes(preferred))) {
          return preferred;
        }
      }

      // Fallback to first available model
      return modelNames[0] || null;
    } catch (_error) {
      return null;
    }
  }

  /**
   * Generate summary using Ollama
   */
  async generateSummary(
    text: string,
    options: SummarizationOptions = {}
  ): Promise<SummarizationResult> {
    const model = options.model || config.llm.primaryModel;
    const temperature = options.temperature ?? config.llm.temperature ?? 0.5;
    const timeout = options.timeout || config.llm.timeout || 120000;

    const summaryLength = options.length || config.llm.summaryLength || 'medium';
    const lengthInstructions = {
      short: 'Provide a one-paragraph summary (2-3 sentences)',
      medium: 'Provide a 2-3 paragraph summary with key points',
      long: 'Provide a comprehensive 4-5 paragraph summary with all key points and details',
    };

    const prompt = `${lengthInstructions[summaryLength]}.

Article:
${text}

Summary:`;

    try {
      const startTime = Date.now();

      const response = await this.client.post(
        '/api/generate',
        {
          model,
          prompt,
          temperature,
          stream: false,
        },
        { timeout }
      );

      const processingTime = Date.now() - startTime;

      if (!response.data.response) {
        throw new Error('Empty response from Ollama');
      }

      return {
        summary: response.data.response.trim(),
        model,
        tokensUsed: response.data.prompt_eval_count,
        processingTime,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      // Provide helpful error messages
      if (message.includes('ECONNREFUSED')) {
        throw new Error(
          `Ollama server not running at ${this.baseUrl}. Please start Ollama: ollama serve`
        );
      }

      if (message.includes(`Model '${model}' not found`)) {
        throw new Error(
          `Model '${model}' not found. Available models: ${await this.getAvailableModels().then(m => m.map(x => x.name).join(', '))}`
        );
      }

      throw new Error(`Summarization failed: ${message}`);
    }
  }

  /**
   * Stream-based summarization (for real-time updates)
   */
  async *generateSummaryStream(
    text: string,
    options: SummarizationOptions = {}
  ): AsyncGenerator<string, void, unknown> {
    const model = options.model || config.llm.primaryModel;
    const temperature = options.temperature ?? config.llm.temperature ?? 0.5;

    const summaryLength = options.length || config.llm.summaryLength || 'medium';
    const lengthInstructions = {
      short: 'Provide a one-paragraph summary (2-3 sentences)',
      medium: 'Provide a 2-3 paragraph summary with key points',
      long: 'Provide a comprehensive 4-5 paragraph summary with all key points and details',
    };

    const prompt = `${lengthInstructions[summaryLength]}.

Article:
${text}

Summary:`;

    try {
      const response = await this.client.post(
        '/api/generate',
        {
          model,
          prompt,
          temperature,
          stream: true,
        },
        {
          responseType: 'stream',
        }
      );

      for await (const chunk of response.data) {
        const lines = chunk.toString().trim().split('\n');
        for (const line of lines) {
          try {
            const json = JSON.parse(line);
            if (json.response) {
              yield json.response;
            }
          } catch (_error) {
            // Skip invalid JSON lines
          }
        }
      }
    } catch (error) {
      throw new Error(
        `Stream summarization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Pull a model from Ollama registry
   */
  async pullModel(modelName: string): Promise<void> {
    try {
      const response = await this.client.post(
        '/api/pull',
        { name: modelName },
        { timeout: 300000 } // 5 minutes for download
      );

      if (response.data.status !== 'success') {
        throw new Error(`Failed to pull model: ${response.data.status}`);
      }
    } catch (error) {
      throw new Error(
        `Failed to pull model '${modelName}': ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Generate with fallback to alternative models
   */
  async generateSummaryWithFallback(
    text: string,
    options: SummarizationOptions = {}
  ): Promise<SummarizationResult> {
    const primaryModel = options.model || config.llm.primaryModel;
    const fallbackModels = config.llm.fallbackModels || [];
    const modelsToTry = [primaryModel, ...fallbackModels];

    let lastError: Error | null = null;

    for (const model of modelsToTry) {
      try {
        const hasModel = await this.hasModel(model);
        if (!hasModel) {
          console.warn(`Model ${model} not available, trying next...`);
          continue;
        }

        return await this.generateSummary(text, { ...options, model });
      } catch (error) {
        lastError = error as Error;
        console.warn(`Failed with model ${model}: ${lastError.message}`);
        continue;
      }
    }

    // All models failed
    throw new Error(
      `All summarization models failed. Last error: ${lastError?.message || 'Unknown error'}`
    );
  }

  /**
   * Estimate token count for text
   */
  async estimateTokens(text: string): Promise<number> {
    // Rough estimate: ~1 token per 4 characters
    return Math.ceil(text.length / 4);
  }

  /**
   * Get model information
   */
  async getModelInfo(modelName: string): Promise<OllamaModelInfo | null> {
    const models = await this.getAvailableModels();
    return models.find(m => m.name.includes(modelName)) || null;
  }
}
