#!/usr/bin/env bun
/**
 * Speck unified dual-mode CLI
 * Operates in both standalone (CLI) and hook-invoked (JSON stdin) modes
 *
 * Per data-model.md: Identical business logic in both modes, different output formatting
 */

import { Command } from "commander";
import type { CommandContext } from "./lib/types";
import { registry } from "./commands/index";
import { CommandError, formatError } from "./lib/error-handler";

/**
 * Helper to detect CLI mode
 */
function detectMode(): "cli" | "hook" {
  // Check for --hook flag or JSON piped input
  if (process.argv.includes("--hook")) {
    return "hook";
  }
  return "cli";
}

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

    const result = await echoEntry.handler!({ message }, context);

    if (result.success) {
      console.log(result.output);
    } else {
      console.error(result.errorOutput);
      process.exit(result.exitCode);
    }
  });

// env command
const envEntry = registry.env;
if (!envEntry) {
  throw new Error("env command not found in registry");
}
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

    const result = await envEntry.handler!({}, context);

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
  .action(async (args: unknown) => {
    const argsArray: string[] = Array.isArray(args) ? (args as string[]) : [String(args)];

    // Handle main-based commands differently
    if (checkPrerequisitesEntry.main) {
      const exitCode = await checkPrerequisitesEntry.main(argsArray);
      process.exit(exitCode);
    } else if (checkPrerequisitesEntry.handler) {
      const commandString = `check-prerequisites ${argsArray.join(" ")}`;
      const context: CommandContext = {
        mode: detectMode(),
        rawCommand: commandString,
        workingDirectory: process.cwd(),
        isInteractive: process.stdin.isTTY ?? false,
      };

      const parsedArgs = checkPrerequisitesEntry.parseArgs!(commandString) as unknown;
      const result = await checkPrerequisitesEntry.handler(parsedArgs, context);

      if (result.success) {
        console.log(result.output);
      } else {
        console.error(result.errorOutput);
        process.exit(result.exitCode);
      }
    }
  });

// create-new-feature command
const createNewFeatureEntry = registry["create-new-feature"]!;
program
  .command("create-new-feature [args...]")
  .description(createNewFeatureEntry.description)
  .allowUnknownOption() // Allow flags to pass through
  .action(async (args: unknown) => {
    const argsArray: string[] = Array.isArray(args) ? (args as string[]) : [String(args)];

    // Handle lazyMain-based commands
    if (createNewFeatureEntry.lazyMain) {
      const mainFn = await createNewFeatureEntry.lazyMain();
      const exitCode = await mainFn(argsArray);
      process.exit(exitCode);
    } else if (createNewFeatureEntry.handler) {
      const commandString = `create-new-feature ${argsArray.join(" ")}`;
      const context: CommandContext = {
        mode: detectMode(),
        rawCommand: commandString,
        workingDirectory: process.cwd(),
        isInteractive: process.stdin.isTTY ?? false,
      };

      const parsedArgs = createNewFeatureEntry.parseArgs!(commandString) as unknown;
      const result = await createNewFeatureEntry.handler(parsedArgs, context);

      if (result.success) {
        console.log(result.output);
      } else {
        console.error(result.errorOutput);
        process.exit(result.exitCode);
      }
    }
  });

// setup-plan command
const setupPlanEntry = registry["setup-plan"]!;
program
  .command("setup-plan [args...]")
  .description(setupPlanEntry.description)
  .allowUnknownOption() // Allow flags to pass through
  .action(async (args: unknown) => {
    const argsArray: string[] = Array.isArray(args) ? (args as string[]) : [String(args)];

    // Handle lazyMain-based commands
    if (setupPlanEntry.lazyMain) {
      const mainFn = await setupPlanEntry.lazyMain();
      const exitCode = await mainFn(argsArray);
      process.exit(exitCode);
    } else if (setupPlanEntry.handler) {
      const commandString = `setup-plan ${argsArray.join(" ")}`;
      const context: CommandContext = {
        mode: detectMode(),
        rawCommand: commandString,
        workingDirectory: process.cwd(),
        isInteractive: process.stdin.isTTY ?? false,
      };

      const parsedArgs = setupPlanEntry.parseArgs!(commandString) as unknown;
      const result = await setupPlanEntry.handler(parsedArgs, context);

      if (result.success) {
        console.log(result.output);
      } else {
        console.error(result.errorOutput);
        process.exit(result.exitCode);
      }
    }
  });

// link-repo command
const linkRepoEntry = registry["link-repo"]!;
program
  .command("link-repo [args...]")
  .description(linkRepoEntry.description)
  .allowUnknownOption() // Allow flags to pass through
  .action(async (args: unknown) => {
    const argsArray: string[] = Array.isArray(args) ? (args as string[]) : [String(args)];

    // Handle lazyMain-based commands
    if (linkRepoEntry.lazyMain) {
      const mainFn = await linkRepoEntry.lazyMain();
      const exitCode = await mainFn(argsArray);
      process.exit(exitCode);
    } else if (linkRepoEntry.handler) {
      const commandString = `link-repo ${argsArray.join(" ")}`;
      const context: CommandContext = {
        mode: detectMode(),
        rawCommand: commandString,
        workingDirectory: process.cwd(),
        isInteractive: process.stdin.isTTY ?? false,
      };

      const parsedArgs = linkRepoEntry.parseArgs!(commandString) as unknown;
      const result = await linkRepoEntry.handler(parsedArgs, context);

      if (result.success) {
        console.log(result.output);
      } else {
        console.error(result.errorOutput);
        process.exit(result.exitCode);
      }
    }
  });

// update-agent-context command
const updateAgentContextEntry = registry["update-agent-context"]!;
program
  .command("update-agent-context [args...]")
  .description(updateAgentContextEntry.description)
  .allowUnknownOption() // Allow flags to pass through
  .action(async (args: unknown) => {
    const argsArray: string[] = Array.isArray(args) ? (args as string[]) : [String(args)];

    // Handle lazyMain-based commands
    if (updateAgentContextEntry.lazyMain) {
      const mainFn = await updateAgentContextEntry.lazyMain();
      const exitCode = await mainFn(argsArray);
      process.exit(exitCode);
    } else if (updateAgentContextEntry.handler) {
      const commandString = `update-agent-context ${argsArray.join(" ")}`;
      const context: CommandContext = {
        mode: detectMode(),
        rawCommand: commandString,
        workingDirectory: process.cwd(),
        isInteractive: process.stdin.isTTY ?? false,
      };

      const parsedArgs = updateAgentContextEntry.parseArgs!(commandString) as unknown;
      const result = await updateAgentContextEntry.handler(parsedArgs, context);

      if (result.success) {
        console.log(result.output);
      } else {
        console.error(result.errorOutput);
        process.exit(result.exitCode);
      }
    }
  });

/**
 * Main entry point - CLI mode only
 */
async function main(): Promise<void> {
  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    // Format error for CLI mode
    const errorMessage = formatError(
      error instanceof Error ? error : new Error(String(error)),
      "cli"
    );

    // Print formatted error
    if (typeof errorMessage === "string") {
      console.error(errorMessage);
    }

    // Exit with appropriate code
    const exitCode = error instanceof CommandError ? error.exitCode : 1;
    process.exit(exitCode);
  }
}

// Run main if this is the entry point
if (import.meta.main) {
  void main();
}
