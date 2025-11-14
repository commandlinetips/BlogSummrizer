import { OllamaClient } from '../../src/services/OllamaClient';

describe('OllamaClient', () => {
  let client: OllamaClient;

  beforeEach(() => {
    // Use a test base URL that won't connect
    client = new OllamaClient('http://localhost:9999');
  });

  describe('isRunning', () => {
    it('should return false if server is not running', async () => {
      const isRunning = await client.isRunning();
      expect(isRunning).toBe(false);
    });
  });

  describe('estimateTokens', () => {
    it('should estimate token count', async () => {
      const text = 'This is a test sentence for token estimation.';
      const tokens = await client.estimateTokens(text);

      // Rough estimate: ~1 token per 4 characters
      const expectedTokens = Math.ceil(text.length / 4);
      expect(tokens).toBe(expectedTokens);
    });

    it('should estimate tokens for longer text', async () => {
      const text = 'The quick brown fox jumped over the lazy dog. ' + 'This is a longer text. '.repeat(10);
      const tokens = await client.estimateTokens(text);

      const expectedTokens = Math.ceil(text.length / 4);
      expect(tokens).toBe(expectedTokens);
    });

    it('should handle empty text', async () => {
      const tokens = await client.estimateTokens('');
      expect(tokens).toBe(0);
    });
  });

  describe('selectBestModel', () => {
    it('should return null if server is not running', async () => {
      const model = await client.selectBestModel(['llama3.1', 'mistral']);
      expect(model).toBeNull();
    });
  });

  describe('hasModel', () => {
    it('should return false if server is not running', async () => {
      const hasModel = await client.hasModel('llama3.1');
      expect(hasModel).toBe(false);
    });
  });
});
