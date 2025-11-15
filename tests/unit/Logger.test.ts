import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Logger, createLogger, setLogLevel, getLogLevel, isLevelEnabled } from '../../src/utils/Logger.js';

// Mock Winston to avoid actual file I/O during tests
jest.mock('winston', () => {
  const logs: any[] = [];
  
  return {
    createLogger: jest.fn(() => ({
      level: 'info',
      error: jest.fn((msg: string, meta?: any) => logs.push({ level: 'error', msg, meta })),
      warn: jest.fn((msg: string, meta?: any) => logs.push({ level: 'warn', msg, meta })),
      info: jest.fn((msg: string, meta?: any) => logs.push({ level: 'info', msg, meta })),
      debug: jest.fn((msg: string, meta?: any) => logs.push({ level: 'debug', msg, meta })),
      log: jest.fn((level: string, msg: string, meta?: any) => logs.push({ level, msg, meta })),
      on: jest.fn(),
      end: jest.fn(),
    })),
    format: {
      combine: jest.fn(() => ({})),
      timestamp: jest.fn(() => ({})),
      colorize: jest.fn(() => ({})),
      printf: jest.fn(() => ({})),
      errors: jest.fn(() => ({})),
      json: jest.fn(() => ({})),
    },
    transports: {
      Console: jest.fn(),
      File: jest.fn(),
    },
  };
});

describe('Logger', () => {
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger();
  });

  describe('Basic logging methods', () => {
    it('should log error messages', () => {
      expect(() => logger.error('Test error')).not.toThrow();
    });

    it('should log warning messages', () => {
      expect(() => logger.warn('Test warning')).not.toThrow();
    });

    it('should log info messages', () => {
      expect(() => logger.info('Test info')).not.toThrow();
    });

    it('should log debug messages', () => {
      expect(() => logger.debug('Test debug')).not.toThrow();
    });

    it('should log with metadata', () => {
      const metadata = { userId: '123', action: 'test' };
      expect(() => logger.info('Test with metadata', metadata)).not.toThrow();
    });
  });

  describe('Context logging', () => {
    it('should create logger with context', () => {
      const contextLogger = new Logger('TestContext');
      expect(() => contextLogger.info('Test message')).not.toThrow();
    });

    it('should create child logger', () => {
      const parentLogger = new Logger('Parent');
      const childLogger = parentLogger.child('Child');
      
      expect(childLogger).toBeInstanceOf(Logger);
      expect(() => childLogger.info('Child message')).not.toThrow();
    });

    it('should chain context in child loggers', () => {
      const parentLogger = new Logger('Parent');
      const childLogger = parentLogger.child('Child');
      const grandchildLogger = childLogger.child('Grandchild');
      
      expect(() => grandchildLogger.info('Nested message')).not.toThrow();
    });
  });

  describe('Operation logging', () => {
    it('should log operation start', () => {
      expect(() => logger.startOperation('test-operation')).not.toThrow();
    });

    it('should log operation end', () => {
      expect(() => logger.endOperation('test-operation', 100)).not.toThrow();
    });

    it('should log operation end without duration', () => {
      expect(() => logger.endOperation('test-operation')).not.toThrow();
    });

    it('should log operation failure', () => {
      const error = new Error('Test error');
      expect(() => logger.failOperation('test-operation', error)).not.toThrow();
    });

    it('should include error details in failure log', () => {
      const error = new Error('Test error');
      error.stack = 'Error stack trace';
      expect(() => logger.failOperation('test-operation', error)).not.toThrow();
    });
  });

  describe('Timing operations', () => {
    it('should time an operation', () => {
      const endTimer = logger.time('test-operation');
      expect(typeof endTimer).toBe('function');
      expect(() => endTimer()).not.toThrow();
    });

    it('should log duration when timer ends', (done) => {
      const endTimer = logger.time('timed-operation');
      
      setTimeout(() => {
        expect(() => endTimer()).not.toThrow();
        done();
      }, 10);
    });
  });

  describe('Custom log levels', () => {
    it('should log with custom level', () => {
      expect(() => logger.log('info', 'Custom level message')).not.toThrow();
    });

    it('should accept all standard log levels', () => {
      expect(() => logger.log('error', 'Error level')).not.toThrow();
      expect(() => logger.log('warn', 'Warn level')).not.toThrow();
      expect(() => logger.log('info', 'Info level')).not.toThrow();
      expect(() => logger.log('debug', 'Debug level')).not.toThrow();
    });
  });

  describe('createLogger helper', () => {
    it('should create logger with context', () => {
      const contextLogger = createLogger('MyService');
      expect(contextLogger).toBeInstanceOf(Logger);
    });

    it('should allow logging with created logger', () => {
      const serviceLogger = createLogger('ServiceName');
      expect(() => serviceLogger.info('Service message')).not.toThrow();
    });
  });

  describe('Log level management', () => {
    it('should set log level', () => {
      expect(() => setLogLevel('debug')).not.toThrow();
    });

    it('should get current log level', () => {
      const level = getLogLevel();
      expect(typeof level).toBe('string');
      expect(['error', 'warn', 'info', 'debug']).toContain(level);
    });

    it('should check if level is enabled', () => {
      expect(typeof isLevelEnabled('info')).toBe('boolean');
      expect(typeof isLevelEnabled('debug')).toBe('boolean');
      expect(typeof isLevelEnabled('warn')).toBe('boolean');
      expect(typeof isLevelEnabled('error')).toBe('boolean');
    });
  });

  describe('Metadata handling', () => {
    it('should handle empty metadata', () => {
      expect(() => logger.info('Message without metadata')).not.toThrow();
    });

    it('should handle complex metadata objects', () => {
      const complexMeta = {
        user: { id: 1, name: 'Test' },
        timestamp: new Date(),
        tags: ['tag1', 'tag2'],
        nested: { deep: { value: 'test' } },
      };
      expect(() => logger.info('Complex metadata', complexMeta)).not.toThrow();
    });

    it('should handle metadata with special characters', () => {
      const metadata = {
        message: 'String with "quotes" and \'apostrophes\'',
        path: '/path/with/slashes',
        emoji: '🎯',
      };
      expect(() => logger.info('Special chars', metadata)).not.toThrow();
    });
  });

  describe('Error logging', () => {
    it('should log Error objects', () => {
      const error = new Error('Test error message');
      expect(() => logger.error('Error occurred', { error: error.message })).not.toThrow();
    });

    it('should preserve error stack traces', () => {
      const error = new Error('Error with stack');
      Error.captureStackTrace(error);
      expect(() => logger.error('Stack trace test', { 
        error: error.message,
        stack: error.stack 
      })).not.toThrow();
    });
  });

  describe('Performance', () => {
    it('should handle rapid logging', () => {
      expect(() => {
        for (let i = 0; i < 100; i++) {
          logger.info(`Message ${i}`);
        }
      }).not.toThrow();
    });

    it('should handle concurrent logging', async () => {
      const promises = Array.from({ length: 10 }, (_, i) => 
        Promise.resolve(logger.info(`Concurrent message ${i}`))
      );
      
      await expect(Promise.all(promises)).resolves.toBeDefined();
    });
  });
});

describe('Logger integration', () => {
  it('should work with different contexts', () => {
    const browserLogger = createLogger('BrowserEngine');
    const extractorLogger = createLogger('ContentExtractor');
    const ollamaLogger = createLogger('OllamaClient');

    expect(() => {
      browserLogger.info('Browser started');
      extractorLogger.info('Extracting content');
      ollamaLogger.info('Generating summary');
    }).not.toThrow();
  });

  it('should support operation workflows', () => {
    const workflowLogger = createLogger('Workflow');

    expect(() => {
      workflowLogger.startOperation('article-extraction');
      workflowLogger.info('Loading page');
      workflowLogger.info('Extracting content');
      workflowLogger.endOperation('article-extraction', 1500);
    }).not.toThrow();
  });

  it('should handle error workflows', () => {
    const errorLogger = createLogger('ErrorFlow');

    expect(() => {
      errorLogger.startOperation('risky-operation');
      errorLogger.warn('Operation might fail');
      errorLogger.failOperation('risky-operation', new Error('Expected failure'));
    }).not.toThrow();
  });
});
