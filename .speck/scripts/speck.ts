#!/usr/bin/env bun
/**
 * Speck unified dual-mode CLI
 * Operates in both standalone (CLI) and hook-invoked (JSON stdin) modes
 *
 * Per data-model.md: Identical business logic in both modes, different output formatting
 */

import { Command } from "commander";
import { detectMode, readHookInput } from "./lib/mode-detector";
import { formatHookOutput, passThrough } from "./lib/hook-utils";
import type { CommandContext } from "./lib/types";
import { registry } from "./commands/index";
import { appendFile } from "node:fs/promises";

const SPECK_LOG_FILE = "/private/tmp/.claude-hook-test/speck-hook-log.txt";

const log = async (msg: string) => {
  await appendFile(SPECK_LOG_FILE, `[${new Date().toISOString()}] ${msg}\n`);
};

const program = new Command();

program
  .name("speck")
  .description("Speck unified CLI for feature specification workflow")
  .version("0.1.0");

// Register commands from registry
// echo command
const echoEntry = registry.echo!;
program
  .command("echo <message...>")
  .description(echoEntry.description)
  .action(async (messageArray) => {
    // Commander captures variadic args as an array
    const message = Array.isArray(messageArray) ? messageArray.join(" ") : String(messageArray);

    const context: CommandContext = {
      mode: detectMode(),
      rawCommand: `echo ${message}`,
      workingDirectory: process.cwd(),
      isInteractive: process.stdin.isTTY ?? false,
    };

    const result = await echoEntry.handler({ message }, context);

    if (result.success) {
      console.log(result.output);
    } else {
      console.error(result.errorOutput);
      process.exit(result.exitCode);
    }
  });

// env command
const envEntry = registry.env;
program
  .command("env")
  .description(envEntry.description)
  .action(async () => {
    const context: CommandContext = {
      mode: detectMode(),
      rawCommand: "env",
      workingDirectory: process.cwd(),
      isInteractive: process.stdin.isTTY ?? false,
    };

    const result = await envEntry.handler({}, context);

    if (result.success) {
      console.log(result.output);
    } else {
      console.error(result.errorOutput);
      process.exit(result.exitCode);
    }
  });

/**
 * Main entry point - handles dual-mode operation
 */
async function main() {
  const mode = detectMode();

  if (mode === "hook") {
    await runHookMode();
  } else {
    await runCliMode();
  }
}

/**
 * Hook mode: Read JSON from stdin, execute command, return JSON output
 */
async function runHookMode() {
  try {
    const hookInput = await readHookInput();
    const { command } = hookInput.tool_input;

    await log(`Speck hook called - Command: ${command}`);

    // Only intercept commands matching speck-* pattern
    if (!command.match(/^speck-/)) {
      // Not a virtual command - pass through
      await log(`Skip (not speck-*): ${command}`);
      console.log(JSON.stringify(passThrough()));
      return;
    }

    await log(`Intercepting speck command: ${command}`);

    // Parse command string to extract command name and args
    // "speck-test-hello world" -> commandName="test-hello", args=["world"]
    const commandMatch = command.match(/^speck-(.+?)(?:\s+(.*))?$/);
    if (!commandMatch) {
      console.error("Failed to parse command:", command);
      process.exit(1);
    }

    const [, commandName, argsString = ""] = commandMatch;
    const args = argsString.split(/\s+/).filter((arg) => arg.length > 0);

    // Build argv for Commander: [commandName, ...args]
    const argv = [commandName, ...args];

    // Capture output
    const originalLog = console.log;
    const originalError = console.error;
    let output = "";
    let errorOutput = "";

    console.log = (...args: unknown[]) => {
      output += args.join(" ") + "\n";
    };

    console.error = (...args: unknown[]) => {
      errorOutput += args.join(" ") + "\n";
    };

    // Execute command via Commander
    try {
      await program.parseAsync(argv, { from: "user" });
    } catch (error) {
      // Command execution error - capture in errorOutput
      errorOutput += error instanceof Error ? error.message : String(error);
    }

    // Restore console
    console.log = originalLog;
    console.error = originalError;

    // Return hook output with echo-wrapped result
    const result = output.trim() || errorOutput.trim() || "";
    const hookOutput = formatHookOutput(result, hookInput.tool_input);
    await log(`Returning result: ${result.substring(0, 100)}`);
    console.log(JSON.stringify(hookOutput));
  } catch (error) {
    // Hook-level error - log to stderr, return empty JSON (pass-through)
    await log(`Hook error: ${error instanceof Error ? error.message : String(error)}`);
    console.error("Hook error:", error instanceof Error ? error.message : String(error));
    console.log("{}");
    process.exit(1);
  }
}

/**
 * CLI mode: Normal command-line execution with stdout/stderr
 */
async function runCliMode() {
  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run main if this is the entry point
if (import.meta.main) {
  main();
}
