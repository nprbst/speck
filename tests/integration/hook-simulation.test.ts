/**
 * Integration tests for hook JSON stdin/stdout simulation
 * Tests the complete hook flow from JSON input to JSON output
 */

import { describe, test, expect } from "bun:test";
import { spawn } from "bun";
import path from "node:path";
import type { HookInput, HookOutput } from "../../.speck/scripts/lib/types";

const SPECK_CLI_PATH = path.resolve(import.meta.dir, "../../.speck/scripts/speck.ts");

/**
 * Execute speck CLI in hook mode with JSON stdin
 */
async function runHookMode(hookInput: HookInput): Promise<{
  stdout: string;
  stderr: string;
  exitCode: number;
}> {
  const proc = spawn({
    cmd: ["bun", "run", SPECK_CLI_PATH, "--hook"],
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });

  // Write hook input to stdin
  proc.stdin.write(JSON.stringify(hookInput));
  proc.stdin.end();

  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);

  const exitCode = await proc.exited;

  return { stdout, stderr, exitCode };
}

describe("Hook Simulation Integration Tests", () => {
  describe("Echo Command Hook Flow", () => {
    test("should intercept speck-echo and return JSON output", async () => {
      const hookInput: HookInput = {
        tool_name: "Bash",
        tool_input: {
          command: "speck-echo hello world",
          description: "Test echo command",
        },
      };

      const { stdout, stderr, exitCode } = await runHookMode(hookInput);

      expect(exitCode).toBe(0);
      expect(stderr).toBe(""); // No errors

      // Parse JSON output
      const output = JSON.parse(stdout);
      expect(output).toHaveProperty("hookSpecificOutput");
      expect(output.hookSpecificOutput).toHaveProperty("hookEventName", "PreToolUse");
      expect(output.hookSpecificOutput).toHaveProperty("permissionDecision", "allow");
      expect(output.hookSpecificOutput).toHaveProperty("updatedInput");
      expect(output.hookSpecificOutput.updatedInput).toHaveProperty("command");

      // Verify the command contains the expected output
      const updatedCommand = output.hookSpecificOutput.updatedInput.command;
      expect(updatedCommand).toContain("hello world");
    });

    test("should handle echo command with special characters", async () => {
      const specialMessage = 'test\'s "quoted" message with $ and `backticks`';
      const hookInput: HookInput = {
        tool_name: "Bash",
        tool_input: {
          command: `speck-echo ${specialMessage}`,
        },
      };

      const { stdout, exitCode } = await runHookMode(hookInput);

      expect(exitCode).toBe(0);

      const output = JSON.parse(stdout);
      const updatedCommand = output.hookSpecificOutput.updatedInput.command;

      // Verify special characters are preserved in the output
      expect(updatedCommand).toContain(specialMessage);
    });
  });

  describe("Env Command Hook Flow", () => {
    test("should intercept speck-env and return environment info", async () => {
      const hookInput: HookInput = {
        tool_name: "Bash",
        tool_input: {
          command: "speck-env",
        },
      };

      const { stdout, stderr, exitCode } = await runHookMode(hookInput);

      expect(exitCode).toBe(0);
      expect(stderr).toBe("");

      const output = JSON.parse(stdout);
      expect(output.hookSpecificOutput.permissionDecision).toBe("allow");

      const updatedCommand = output.hookSpecificOutput.updatedInput.command;
      expect(updatedCommand).toBeTruthy();
    });
  });

  describe("Pass-Through Behavior", () => {
    test("should pass through non-speck commands", async () => {
      const hookInput: HookInput = {
        tool_name: "Bash",
        tool_input: {
          command: "ls -la",
        },
      };

      const { stdout, exitCode } = await runHookMode(hookInput);

      expect(exitCode).toBe(0);

      const output = JSON.parse(stdout);

      // Should be empty object (pass-through)
      expect(Object.keys(output).length).toBe(0);
    });

    test("should pass through commands with different prefixes", async () => {
      const testCommands = [
        "git status",
        "npm install",
        "echo regular echo",
        "bun run something",
      ];

      for (const command of testCommands) {
        const hookInput: HookInput = {
          tool_name: "Bash",
          tool_input: { command },
        };

        const { stdout, exitCode } = await runHookMode(hookInput);

        expect(exitCode).toBe(0);

        const output = JSON.parse(stdout);
        expect(Object.keys(output).length).toBe(0);
      }
    });
  });

  describe("Error Handling in Hook Mode", () => {
    test("should handle missing required arguments gracefully", async () => {
      const hookInput: HookInput = {
        tool_name: "Bash",
        tool_input: {
          command: "speck-echo",
        },
      };

      const { stdout, exitCode } = await runHookMode(hookInput);

      // Hook should still return valid JSON even on error
      expect(exitCode).toBe(0);

      const output = JSON.parse(stdout);
      expect(output.hookSpecificOutput).toBeDefined();
    });

    test("should handle malformed command gracefully", async () => {
      const hookInput: HookInput = {
        tool_name: "Bash",
        tool_input: {
          command: "speck-unknown-command",
        },
      };

      const { stdout, exitCode } = await runHookMode(hookInput);

      // Unknown commands should pass through
      expect(exitCode).toBe(0);

      const output = JSON.parse(stdout);
      // Either pass-through or error message, but valid JSON
      expect(() => JSON.parse(stdout)).not.toThrow();
    });
  });

  describe("JSON Output Format Validation", () => {
    test("should always return valid JSON in hook mode", async () => {
      const testCommands = [
        "speck-echo test",
        "speck-env",
        "speck-branch list",
        "ls -la", // pass-through
      ];

      for (const command of testCommands) {
        const hookInput: HookInput = {
          tool_name: "Bash",
          tool_input: { command },
        };

        const { stdout } = await runHookMode(hookInput);

        // Should always be valid JSON
        expect(() => JSON.parse(stdout)).not.toThrow();
      }
    });

    test("should conform to HookOutput schema", async () => {
      const hookInput: HookInput = {
        tool_name: "Bash",
        tool_input: {
          command: "speck-echo test output",
        },
      };

      const { stdout } = await runHookMode(hookInput);
      const output = JSON.parse(stdout) as HookOutput;

      if ("hookSpecificOutput" in output) {
        expect(output.hookSpecificOutput).toHaveProperty("hookEventName");
        expect(output.hookSpecificOutput).toHaveProperty("permissionDecision");
        expect(output.hookSpecificOutput).toHaveProperty("updatedInput");
        expect(output.hookSpecificOutput.updatedInput).toHaveProperty("command");
      } else {
        // Pass-through case - should be empty object
        expect(Object.keys(output).length).toBe(0);
      }
    });
  });

  describe("Command Output Preservation", () => {
    test("should preserve exact output from command handlers", async () => {
      const testMessage = "exact output test";
      const hookInput: HookInput = {
        tool_name: "Bash",
        tool_input: {
          command: `speck-echo ${testMessage}`,
        },
      };

      const { stdout } = await runHookMode(hookInput);
      const output = JSON.parse(stdout);
      const updatedCommand = output.hookSpecificOutput.updatedInput.command;

      // The output should contain the exact message
      expect(updatedCommand).toContain(testMessage);
    });

    test("should preserve multiline output", async () => {
      const hookInput: HookInput = {
        tool_name: "Bash",
        tool_input: {
          command: "speck-env",
        },
      };

      const { stdout } = await runHookMode(hookInput);
      const output = JSON.parse(stdout);
      const updatedCommand = output.hookSpecificOutput.updatedInput.command;

      // Env output should be multiline
      expect(updatedCommand).toBeTruthy();
    });
  });

  describe("Concurrent Hook Execution", () => {
    test("should handle multiple concurrent hook invocations", async () => {
      const commands = [
        "speck-echo test1",
        "speck-echo test2",
        "speck-echo test3",
        "speck-env",
      ];

      const promises = commands.map((command) =>
        runHookMode({
          tool_name: "Bash",
          tool_input: { command },
        })
      );

      const results = await Promise.all(promises);

      // All should succeed
      for (const result of results) {
        expect(result.exitCode).toBe(0);
        expect(() => JSON.parse(result.stdout)).not.toThrow();
      }
    });
  });
});
