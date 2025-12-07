import { describe, expect, it, beforeEach, afterEach, spyOn } from "bun:test";

// We need to test the logger module
// Import after setting up environment
describe("logger", () => {
  let originalEnv: NodeJS.ProcessEnv;
  let consoleLogSpy: ReturnType<typeof spyOn>;
  let consoleErrorSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    originalEnv = { ...process.env };
    // Clear any existing log settings
    delete process.env.SPECK_DEBUG;
    delete process.env.SPECK_LOG_LEVEL;

    // Spy on console methods
    consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe("log levels", () => {
    it("should default to info level", async () => {
      // Re-import to get fresh module with clean env
      const { logger } = await import("../../plugins/speck-reviewer/cli/src/logger");
      expect(logger.getLevel()).toBe("info");
    });

    it("should enable debug level with SPECK_DEBUG=1", async () => {
      process.env.SPECK_DEBUG = "1";
      // Clear module cache and re-import
      delete require.cache[require.resolve("../../plugins/speck-reviewer/cli/src/logger")];
      const { logger } = await import("../../plugins/speck-reviewer/cli/src/logger");
      expect(logger.getLevel()).toBe("debug");
    });

    it("should respect SPECK_LOG_LEVEL environment variable", async () => {
      process.env.SPECK_LOG_LEVEL = "warn";
      delete require.cache[require.resolve("../../plugins/speck-reviewer/cli/src/logger")];
      const { logger } = await import("../../plugins/speck-reviewer/cli/src/logger");
      expect(logger.getLevel()).toBe("warn");
    });

    it("should prefer SPECK_LOG_LEVEL over SPECK_DEBUG", async () => {
      process.env.SPECK_DEBUG = "1";
      process.env.SPECK_LOG_LEVEL = "error";
      delete require.cache[require.resolve("../../plugins/speck-reviewer/cli/src/logger")];
      const { logger } = await import("../../plugins/speck-reviewer/cli/src/logger");
      expect(logger.getLevel()).toBe("error");
    });
  });

  describe("logging methods", () => {
    it("should log info messages to stdout", async () => {
      const { logger } = await import("../../plugins/speck-reviewer/cli/src/logger");
      logger.info("test message");
      expect(consoleLogSpy).toHaveBeenCalledWith("test message");
    });

    it("should log error messages to stderr", async () => {
      const { logger } = await import("../../plugins/speck-reviewer/cli/src/logger");
      logger.error("error message");
      expect(consoleErrorSpy).toHaveBeenCalledWith("Error: error message");
    });

    it("should log warn messages to stderr", async () => {
      const { logger } = await import("../../plugins/speck-reviewer/cli/src/logger");
      logger.warn("warning message");
      expect(consoleErrorSpy).toHaveBeenCalledWith("Warning: warning message");
    });

    it("should not log debug messages at info level", async () => {
      const { logger } = await import("../../plugins/speck-reviewer/cli/src/logger");
      logger.debug("debug message");
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it("should log debug messages when SPECK_DEBUG=1", async () => {
      process.env.SPECK_DEBUG = "1";
      delete require.cache[require.resolve("../../plugins/speck-reviewer/cli/src/logger")];
      const { logger } = await import("../../plugins/speck-reviewer/cli/src/logger");
      logger.debug("debug message");
      expect(consoleErrorSpy).toHaveBeenCalled();
      const call = consoleErrorSpy.mock.calls[0]?.[0] as string;
      expect(call).toContain("[DEBUG]");
      expect(call).toContain("debug message");
    });
  });

  describe("json output", () => {
    it("should output formatted JSON", async () => {
      const { logger } = await import("../../plugins/speck-reviewer/cli/src/logger");
      const data = { foo: "bar", count: 42 };
      logger.json(data);
      expect(consoleLogSpy).toHaveBeenCalledWith(JSON.stringify(data, null, 2));
    });
  });

  describe("message formatting", () => {
    it("should append additional arguments to message", async () => {
      const { logger } = await import("../../plugins/speck-reviewer/cli/src/logger");
      logger.info("message", "arg1", 42);
      expect(consoleLogSpy).toHaveBeenCalledWith("message arg1 42");
    });

    it("should include timestamp in debug mode", async () => {
      process.env.SPECK_DEBUG = "1";
      delete require.cache[require.resolve("../../plugins/speck-reviewer/cli/src/logger")];
      const { logger } = await import("../../plugins/speck-reviewer/cli/src/logger");
      logger.debug("test");
      const call = consoleErrorSpy.mock.calls[0]?.[0] as string;
      // Should have ISO timestamp format
      expect(call).toMatch(/\[\d{4}-\d{2}-\d{2}T/);
    });
  });
});
