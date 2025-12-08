import { describe, expect, it, beforeEach, afterEach, spyOn } from 'bun:test';
import { LogLevel } from '@speck/common/logger';

// Test the unified logger module from @speck/common
describe('logger', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let consoleLogSpy: ReturnType<typeof spyOn>;
  let consoleErrorSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    originalEnv = { ...process.env };
    // Clear any existing log settings
    delete process.env.SPECK_DEBUG;
    delete process.env.SPECK_LOG_LEVEL;

    // Spy on console methods
    consoleLogSpy = spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('log levels', () => {
    it('should default to info level', async () => {
      // Re-import to get fresh module with clean env
      const { logger } = await import('@speck/common/logger');
      expect(logger.getLevel()).toBe(LogLevel.INFO);
    });

    it('should enable debug level with SPECK_DEBUG=1', async () => {
      process.env.SPECK_DEBUG = '1';
      // Clear module cache and re-import
      delete require.cache[require.resolve('@speck/common/logger')];
      const { logger } = await import('@speck/common/logger');
      expect(logger.getLevel()).toBe(LogLevel.DEBUG);
    });

    it('should respect SPECK_LOG_LEVEL environment variable', async () => {
      process.env.SPECK_LOG_LEVEL = 'warn';
      delete require.cache[require.resolve('@speck/common/logger')];
      const { logger } = await import('@speck/common/logger');
      expect(logger.getLevel()).toBe(LogLevel.WARN);
    });

    it('should prefer SPECK_DEBUG over SPECK_LOG_LEVEL', async () => {
      process.env.SPECK_DEBUG = '1';
      process.env.SPECK_LOG_LEVEL = 'error';
      delete require.cache[require.resolve('@speck/common/logger')];
      const { logger } = await import('@speck/common/logger');
      // SPECK_DEBUG=1 takes precedence (enables debug regardless of SPECK_LOG_LEVEL)
      expect(logger.getLevel()).toBe(LogLevel.DEBUG);
    });
  });

  describe('logging methods', () => {
    it('should log info messages to stdout with formatting', async () => {
      const { logger } = await import('@speck/common/logger');
      logger.info('test message');
      expect(consoleLogSpy).toHaveBeenCalled();
      const call = consoleLogSpy.mock.calls[0]?.[0] as string;
      expect(call).toContain('INFO');
      expect(call).toContain('test message');
    });

    it('should log error messages to stderr with formatting', async () => {
      const { logger } = await import('@speck/common/logger');
      logger.error('error message');
      expect(consoleErrorSpy).toHaveBeenCalled();
      const call = consoleErrorSpy.mock.calls[0]?.[0] as string;
      expect(call).toContain('ERROR');
      expect(call).toContain('error message');
    });

    it('should log warn messages to stderr with formatting', async () => {
      const { logger } = await import('@speck/common/logger');
      logger.warn('warning message');
      expect(consoleErrorSpy).toHaveBeenCalled();
      const call = consoleErrorSpy.mock.calls[0]?.[0] as string;
      expect(call).toContain('WARN');
      expect(call).toContain('warning message');
    });

    it('should not log debug messages at info level', async () => {
      const { logger } = await import('@speck/common/logger');
      logger.debug('debug message');
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should log debug messages when SPECK_DEBUG=1', async () => {
      process.env.SPECK_DEBUG = '1';
      delete require.cache[require.resolve('@speck/common/logger')];
      const { logger } = await import('@speck/common/logger');
      logger.debug('debug message');
      expect(consoleErrorSpy).toHaveBeenCalled();
      const call = consoleErrorSpy.mock.calls[0]?.[0] as string;
      expect(call).toContain('DEBUG');
      expect(call).toContain('debug message');
    });
  });

  describe('json output', () => {
    it('should output formatted JSON', async () => {
      const { logger } = await import('@speck/common/logger');
      const data = { foo: 'bar', count: 42 };
      logger.json(data);
      expect(consoleLogSpy).toHaveBeenCalledWith(JSON.stringify(data, null, 2));
    });
  });

  describe('message formatting', () => {
    it('should include data as JSON when provided', async () => {
      const { logger } = await import('@speck/common/logger');
      logger.info('message', { key: 'value' });
      expect(consoleLogSpy).toHaveBeenCalled();
      const call = consoleLogSpy.mock.calls[0]?.[0] as string;
      expect(call).toContain('message');
      expect(call).toContain('"key":"value"');
    });

    it('should include timestamp in debug mode', async () => {
      process.env.SPECK_DEBUG = '1';
      delete require.cache[require.resolve('@speck/common/logger')];
      const { logger } = await import('@speck/common/logger');
      logger.debug('test');
      const call = consoleErrorSpy.mock.calls[0]?.[0] as string;
      // Should have ISO timestamp format
      expect(call).toMatch(/\[\d{4}-\d{2}-\d{2}T/);
    });
  });
});
