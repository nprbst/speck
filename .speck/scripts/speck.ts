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

// branch command
const branchEntry = registry.branch;
program
  .command("branch [args...]")
  .description(branchEntry.description)
  .allowUnknownOption() // Allow flags like --all to pass through
  .action(async (args) => {
    const argsArray = Array.isArray(args) ? args : [args];
    const commandString = `branch ${argsArray.join(" ")}`;

    const context: CommandContext = {
      mode: detectMode(),
      rawCommand: commandString,
      workingDirectory: process.cwd(),
      isInteractive: process.stdin.isTTY ?? false,
    };

    const parsedArgs = branchEntry.parseArgs!(commandString);
    const result = await branchEntry.handler(parsedArgs, context);

    if (result.success) {
      console.log(result.output);
    } else {
      console.error(result.errorOutput);
      process.exit(result.exitCode);
    }
  });

// check-prerequisites command
const checkPrerequisitesEntry = registry["check-prerequisites"]!;
program
  .command("check-prerequisites [args...]")
  .description(checkPrerequisitesEntry.description)
  .allowUnknownOption() // Allow --json, --require-tasks, etc. to pass through
  .action(async (args) => {
    const argsArray = Array.isArray(args) ? args : [args];
    const commandString = `check-prerequisites ${argsArray.join(" ")}`;

    const context: CommandContext = {
      mode: detectMode(),
      rawCommand: commandString,
      workingDirectory: process.cwd(),
      isInteractive: process.stdin.isTTY ?? false,
    };

    const parsedArgs = checkPrerequisitesEntry.parseArgs!(commandString);
    const result = await checkPrerequisitesEntry.handler(parsedArgs, context);

    if (result.success) {
      console.log(result.output);
    } else {
      console.error(result.errorOutput);
      process.exit(result.exitCode);
    }
  });

// create-new-feature command
const createNewFeatureEntry = registry["create-new-feature"]!;
program
  .command("create-new-feature [args...]")
  .description(createNewFeatureEntry.description)
  .allowUnknownOption() // Allow flags to pass through
  .action(async (args) => {
    const argsArray = Array.isArray(args) ? args : [args];
    const commandString = `create-new-feature ${argsArray.join(" ")}`;

    const context: CommandContext = {
      mode: detectMode(),
      rawCommand: commandString,
      workingDirectory: process.cwd(),
      isInteractive: process.stdin.isTTY ?? false,
    };

    const parsedArgs = createNewFeatureEntry.parseArgs!(commandString);
    const result = await createNewFeatureEntry.handler(parsedArgs, context);

    if (result.success) {
      console.log(result.output);
    } else {
      console.error(result.errorOutput);
      process.exit(result.exitCode);
    }
  });

// setup-plan command
const setupPlanEntry = registry["setup-plan"]!;
program
  .command("setup-plan [args...]")
  .description(setupPlanEntry.description)
  .allowUnknownOption() // Allow flags to pass through
  .action(async (args) => {
    const argsArray = Array.isArray(args) ? args : [args];
    const commandString = `setup-plan ${argsArray.join(" ")}`;

    const context: CommandContext = {
      mode: detectMode(),
      rawCommand: commandString,
      workingDirectory: process.cwd(),
      isInteractive: process.stdin.isTTY ?? false,
    };

    const parsedArgs = setupPlanEntry.parseArgs!(commandString);
    const result = await setupPlanEntry.handler(parsedArgs, context);

    if (result.success) {
      console.log(result.output);
    } else {
      console.error(result.errorOutput);
      process.exit(result.exitCode);
    }
  });

// link-repo command
const linkRepoEntry = registry["link-repo"]!;
program
  .command("link-repo [args...]")
  .description(linkRepoEntry.description)
  .allowUnknownOption() // Allow flags to pass through
  .action(async (args) => {
    const argsArray = Array.isArray(args) ? args : [args];
    const commandString = `link-repo ${argsArray.join(" ")}`;

    const context: CommandContext = {
      mode: detectMode(),
      rawCommand: commandString,
      workingDirectory: process.cwd(),
      isInteractive: process.stdin.isTTY ?? false,
    };

    const parsedArgs = linkRepoEntry.parseArgs!(commandString);
    const result = await linkRepoEntry.handler(parsedArgs, context);

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
    // "speck-check-prerequisites --json" -> commandName="check-prerequisites", args=["--json"]
    const commandMatch = command.match(/^speck-(.+?)(?:\s+(.*))?$/);
    if (!commandMatch) {
      console.error("Failed to parse command:", command);
      process.exit(1);
    }

    const [, commandName, argsString = ""] = commandMatch;
    const args = argsString.split(/\s+/).filter((arg) => arg.length > 0);

    // Lookup command in registry
    const commandEntry = registry[commandName];
    if (!commandEntry) {
      await log(`Unknown command: ${commandName}`);
      console.error(`Unknown command: ${commandName}`);
      console.log(JSON.stringify(passThrough()));
      return;
    }

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

    // Execute command using main/lazyMain function if available, otherwise fall back to handler
    let exitCode = 0;
    try {
      if (commandEntry.main) {
        // Static main function - already loaded
        exitCode = await commandEntry.main(args);
      } else if (commandEntry.lazyMain) {
        // Lazy-loaded main function - load on demand
        const mainFn = await commandEntry.lazyMain();
        exitCode = await mainFn(args);
      } else if (commandEntry.handler) {
        // Handler-based command (legacy/simple commands)
        const context: CommandContext = {
          mode: "hook",
          rawCommand: command,
          workingDirectory: process.cwd(),
          isInteractive: false,
        };
        const parsedArgs = commandEntry.parseArgs ? commandEntry.parseArgs(command) : {};
        const result = await commandEntry.handler(parsedArgs, context);
        exitCode = result.exitCode;
        if (result.success && result.output) {
          output += result.output;
        }
        if (!result.success && result.errorOutput) {
          errorOutput += result.errorOutput;
        }
      } else {
        throw new Error(`Command ${commandName} has no main, lazyMain, or handler`);
      }
    } catch (error) {
      // Command execution error - capture in errorOutput
      errorOutput += error instanceof Error ? error.message : String(error);
      exitCode = 1;
    }

    // Restore console
    console.log = originalLog;
    console.error = originalError;

    // Return hook output with captured result
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
