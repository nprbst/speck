/**
 * Integration tests for virtual command invocation
 * Tests User Story 1: Seamless Virtual Command Invocation
 */

import { describe, test, expect } from "bun:test";
import { $ } from "bun";
import path from "node:path";

const CLI_PATH = path.join(import.meta.dir, "../../.speck/scripts/speck.ts");

describe("Virtual Command Invocation", () => {
  test("speck-env command works via CLI", async () => {
    const result = await $`bun run ${CLI_PATH} env`.nothrow();

    expect(result.exitCode).toBe(0);
    expect(result.stdout.toString()).toContain("Speck Environment");
    expect(result.stdout.toString()).toContain("Speck Root:");
  });

  test("speck-branch command accepts list subcommand", async () => {
    const result = await $`bun run ${CLI_PATH} branch list`.nothrow();

    // Should execute without error (may have empty output if no branches)
    expect(result.exitCode).toBe(0);
  });

  test("speck-analyze command can be invoked", async () => {
    const result = await $`bun run ${CLI_PATH} analyze --help`.nothrow();

    // Should execute without error
    expect([0, 1]).toContain(result.exitCode); // May return 1 if help triggers exit
  });

  test("hook mode intercepts speck-env command", async () => {
    const hookInput = JSON.stringify({
      tool_name: "Bash",
      tool_input: {
        command: "speck-env"
      }
    });

    const result = await $`echo ${hookInput} | bun run ${CLI_PATH} --hook`.nothrow();

    expect(result.exitCode).toBe(0);

    const output = JSON.parse(result.stdout.toString());
    expect(output).toHaveProperty("hookSpecificOutput");
    expect(output.hookSpecificOutput).toHaveProperty("updatedInput");
  });

  test("hook mode intercepts speck-branch command", async () => {
    const hookInput = JSON.stringify({
      tool_name: "Bash",
      tool_input: {
        command: "speck-branch list"
      }
    });

    const result = await $`echo ${hookInput} | bun run ${CLI_PATH} --hook`.nothrow();

    expect(result.exitCode).toBe(0);

    // Extract the last line which should be JSON
    const lines = result.stdout.toString().trim().split('\n');
    const jsonLine = lines[lines.length - 1];
    const output = JSON.parse(jsonLine);
    expect(output).toHaveProperty("hookSpecificOutput");
  });

  test("hook mode passes through non-speck commands", async () => {
    const hookInput = JSON.stringify({
      tool_name: "Bash",
      tool_input: {
        command: "ls -la"
      }
    });

    const result = await $`echo ${hookInput} | bun run ${CLI_PATH} --hook`.nothrow();

    expect(result.exitCode).toBe(0);

    const output = result.stdout.toString().trim();
    // Should return empty JSON object (pass-through)
    expect(output).toBe("{}");
  });

  test("all registered commands are accessible", async () => {
    const commands = ["env", "branch", "check-prerequisites", "create-new-feature", "setup-plan", "link-repo"];

    for (const cmd of commands) {
      const result = await $`bun run ${CLI_PATH} ${cmd} --help`.nothrow();

      // Command should be recognized (exit code 0 or 1 is acceptable)
      expect([0, 1]).toContain(result.exitCode);
    }
  });
});

describe("Command Argument Parsing", () => {
  test("branch command with arguments", async () => {
    const hookInput = JSON.stringify({
      tool_name: "Bash",
      tool_input: {
        command: "speck-branch list"
      }
    });

    const result = await $`echo ${hookInput} | bun run ${CLI_PATH} --hook`.nothrow();

    expect(result.exitCode).toBe(0);
    // Should return JSON hook output (not empty pass-through)
    const lines = result.stdout.toString().trim().split('\n');
    const jsonLine = lines[lines.length - 1];
    expect(jsonLine).not.toBe("{}");
  });

  test("handles quoted arguments correctly", async () => {
    const hookInput = JSON.stringify({
      tool_name: "Bash",
      tool_input: {
        command: 'speck-echo "hello world"'
      }
    });

    const result = await $`echo ${hookInput} | bun run ${CLI_PATH} --hook`.nothrow();

    expect(result.exitCode).toBe(0);

    const output = JSON.parse(result.stdout.toString());
    // Should preserve quoted string as single argument
    expect(output.hookSpecificOutput.updatedInput.command).toContain("hello world");
  });
});
