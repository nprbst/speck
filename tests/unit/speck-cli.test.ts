/**
 * Unit tests for dual-mode CLI operation
 * Tests CLI mode and hook mode with identical business logic
 */

import { describe, test, expect, beforeEach } from "bun:test";
import { echoHandler } from "../../.speck/scripts/commands/echo";
import { envHandler } from "../../.speck/scripts/commands/env";
import type { CommandContext } from "../../.speck/scripts/lib/types";

describe("Dual-Mode CLI Operation", () => {
  describe("Echo Command", () => {
    test("should return message in CLI mode", async () => {
      const context: CommandContext = {
        mode: "cli",
        rawCommand: "echo test message",
        workingDirectory: process.cwd(),
        isInteractive: true,
      };

      const result = await echoHandler({ message: "test message" }, context);

      expect(result.success).toBe(true);
      expect(result.output).toBe("test message");
      expect(result.errorOutput).toBe(null);
      expect(result.exitCode).toBe(0);
      expect(result.metadata).toEqual({ message: "test message" });
    });

    test("should return message in hook mode", async () => {
      const context: CommandContext = {
        mode: "hook",
        rawCommand: "echo test message",
        workingDirectory: process.cwd(),
        isInteractive: false,
      };

      const result = await echoHandler({ message: "test message" }, context);

      expect(result.success).toBe(true);
      expect(result.output).toBe("test message");
      expect(result.errorOutput).toBe(null);
      expect(result.exitCode).toBe(0);
      expect(result.metadata).toEqual({ message: "test message" });
    });

    test("should produce identical results in both modes", async () => {
      const cliContext: CommandContext = {
        mode: "cli",
        rawCommand: "echo identical test",
        workingDirectory: process.cwd(),
        isInteractive: true,
      };

      const hookContext: CommandContext = {
        mode: "hook",
        rawCommand: "echo identical test",
        workingDirectory: process.cwd(),
        isInteractive: false,
      };

      const cliResult = await echoHandler({ message: "identical test" }, cliContext);
      const hookResult = await echoHandler({ message: "identical test" }, hookContext);

      // Business logic should be identical
      expect(cliResult.success).toBe(hookResult.success);
      expect(cliResult.output).toBe(hookResult.output);
      expect(cliResult.errorOutput).toBe(hookResult.errorOutput);
      expect(cliResult.exitCode).toBe(hookResult.exitCode);
      expect(cliResult.metadata).toEqual(hookResult.metadata);
    });

    test("should fail with missing required argument", async () => {
      const context: CommandContext = {
        mode: "cli",
        rawCommand: "echo",
        workingDirectory: process.cwd(),
        isInteractive: true,
      };

      const result = await echoHandler({ message: "" }, context);

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(result.errorOutput).toContain("Missing required argument: message");
    });

    test("should handle special characters correctly", async () => {
      const context: CommandContext = {
        mode: "cli",
        rawCommand: "echo test's \"quoted\" message",
        workingDirectory: process.cwd(),
        isInteractive: true,
      };

      const specialMessage = 'test\'s "quoted" message with $ and `backticks`';
      const result = await echoHandler({ message: specialMessage }, context);

      expect(result.success).toBe(true);
      expect(result.output).toBe(specialMessage);
    });
  });

  describe("Env Command", () => {
    test("should return environment info in CLI mode", async () => {
      const context: CommandContext = {
        mode: "cli",
        rawCommand: "env",
        workingDirectory: process.cwd(),
        isInteractive: true,
      };

      const result = await envHandler({}, context);

      expect(result.success).toBe(true);
      expect(result.output).toContain("Speck Environment");
      expect(result.output).toContain("Speck Root:");
      expect(result.output).toContain("Repo Root:");
      expect(result.output).toContain("Execution Mode: cli");
      expect(result.errorOutput).toBe(null);
      expect(result.exitCode).toBe(0);
    });

    test("should return environment info in hook mode", async () => {
      const context: CommandContext = {
        mode: "hook",
        rawCommand: "env",
        workingDirectory: process.cwd(),
        isInteractive: false,
      };

      const result = await envHandler({}, context);

      expect(result.success).toBe(true);
      expect(result.output).toContain("Speck Environment");
      expect(result.output).toContain("Execution Mode: hook");
      expect(result.errorOutput).toBe(null);
      expect(result.exitCode).toBe(0);
    });

    test("should include metadata in result", async () => {
      const context: CommandContext = {
        mode: "cli",
        rawCommand: "env",
        workingDirectory: process.cwd(),
        isInteractive: true,
      };

      const result = await envHandler({}, context);

      expect(result.metadata).toBeDefined();
      expect(result.metadata).toHaveProperty("speckRoot");
      expect(result.metadata).toHaveProperty("repoRoot");
      expect(result.metadata).toHaveProperty("executionMode");
      expect(result.metadata?.executionMode).toBe("cli");
    });

    test("should reflect context.mode in both output and metadata", async () => {
      const cliContext: CommandContext = {
        mode: "cli",
        rawCommand: "env",
        workingDirectory: process.cwd(),
        isInteractive: true,
      };

      const hookContext: CommandContext = {
        mode: "hook",
        rawCommand: "env",
        workingDirectory: process.cwd(),
        isInteractive: false,
      };

      const cliResult = await envHandler({}, cliContext);
      const hookResult = await envHandler({}, hookContext);

      expect(cliResult.metadata?.executionMode).toBe("cli");
      expect(hookResult.metadata?.executionMode).toBe("hook");
    });
  });

  describe("Error Handling", () => {
    test("should format errors consistently in CLI mode", async () => {
      const context: CommandContext = {
        mode: "cli",
        rawCommand: "echo",
        workingDirectory: process.cwd(),
        isInteractive: true,
      };

      const result = await echoHandler({ message: "" }, context);

      expect(result.success).toBe(false);
      expect(result.errorOutput).toBeDefined();
      expect(typeof result.errorOutput).toBe("string");
      expect(result.exitCode).toBeGreaterThan(0);
    });

    test("should format errors consistently in hook mode", async () => {
      const context: CommandContext = {
        mode: "hook",
        rawCommand: "echo",
        workingDirectory: process.cwd(),
        isInteractive: false,
      };

      const result = await echoHandler({ message: "" }, context);

      expect(result.success).toBe(false);
      expect(result.errorOutput).toBeDefined();
      expect(typeof result.errorOutput).toBe("string");
      expect(result.exitCode).toBeGreaterThan(0);
    });

    test("should produce identical error results in both modes", async () => {
      const cliContext: CommandContext = {
        mode: "cli",
        rawCommand: "echo",
        workingDirectory: process.cwd(),
        isInteractive: true,
      };

      const hookContext: CommandContext = {
        mode: "hook",
        rawCommand: "echo",
        workingDirectory: process.cwd(),
        isInteractive: false,
      };

      const cliResult = await echoHandler({ message: "" }, cliContext);
      const hookResult = await echoHandler({ message: "" }, hookContext);

      // Error handling should be identical
      expect(cliResult.success).toBe(hookResult.success);
      expect(cliResult.errorOutput).toBe(hookResult.errorOutput);
      expect(cliResult.exitCode).toBe(hookResult.exitCode);
    });
  });

  describe("Output Consistency", () => {
    test("should maintain output format across modes", async () => {
      const testCases = [
        { message: "simple" },
        { message: "with spaces" },
        { message: "with\nnewlines" },
        { message: "with\ttabs" },
      ];

      for (const testCase of testCases) {
        const cliContext: CommandContext = {
          mode: "cli",
          rawCommand: `echo ${testCase.message}`,
          workingDirectory: process.cwd(),
          isInteractive: true,
        };

        const hookContext: CommandContext = {
          mode: "hook",
          rawCommand: `echo ${testCase.message}`,
          workingDirectory: process.cwd(),
          isInteractive: false,
        };

        const cliResult = await echoHandler(testCase, cliContext);
        const hookResult = await echoHandler(testCase, hookContext);

        expect(cliResult.output).toBe(hookResult.output);
      }
    });
  });
});
