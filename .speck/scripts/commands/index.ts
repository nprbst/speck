/**
 * Centralized command registry
 * Maps virtual command names to handler implementations
 *
 * This registry enables the hook router to dynamically lookup and execute commands
 * without hardcoding command names in the hook script.
 */

import type { CommandRegistry } from "../lib/types";
import { testHelloHandler, parseTestHelloArgs } from "./test-hello";
import { envHandler } from "./env";

/**
 * Command registry mapping command names to handlers
 *
 * Key format: Command name without "speck-" prefix (e.g., "env" for "speck-env")
 * Value: CommandRegistryEntry with handler, optional parser, description, version
 *
 * @example
 * To add a new command:
 * ```typescript
 * import { myCommandHandler } from "./my-command";
 *
 * export const registry: CommandRegistry = {
 *   ...registry,
 *   "my-command": {
 *     handler: myCommandHandler,
 *     description: "My command description",
 *     version: "1.0.0"
 *   }
 * };
 * ```
 */
export const registry: CommandRegistry = {
  "test-hello": {
    handler: testHelloHandler,
    parseArgs: parseTestHelloArgs,
    description: "POC test command for hook validation",
    version: "0.1.0",
  },
  env: {
    handler: envHandler,
    description: "Show Speck environment and configuration info",
    version: "1.0.0",
  },
};

/**
 * Lookup command handler by name
 *
 * @param commandName - Command name without prefix (e.g., "env", "branch")
 * @returns CommandRegistryEntry if found, undefined otherwise
 */
export function getCommand(commandName: string) {
  return registry[commandName];
}

/**
 * Check if command exists in registry
 *
 * @param commandName - Command name to check
 * @returns true if command exists, false otherwise
 */
export function hasCommand(commandName: string): boolean {
  return commandName in registry;
}

/**
 * List all registered command names
 *
 * @returns Array of command names
 */
export function listCommands(): string[] {
  return Object.keys(registry);
}
