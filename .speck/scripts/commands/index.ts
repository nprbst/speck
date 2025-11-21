/**
 * Centralized command registry
 * Maps virtual command names to handler implementations
 *
 * This registry enables the hook router to dynamically lookup and execute commands
 * without hardcoding command names in the hook script.
 */

import type { CommandRegistry } from "../lib/types";
import { echoHandler } from "./echo";
import { envHandler } from "./env";
import { branchHandler, parseBranchArgs } from "./branch";
import { checkPrerequisitesHandler, parseCheckPrerequisitesArgs } from "./check-prerequisites";
import { createNewFeatureHandler, parseCreateNewFeatureArgs } from "./create-new-feature";
import { setupPlanHandler, parseSetupPlanArgs } from "./setup-plan";
import { linkRepoHandler, parseLinkRepoArgs } from "./link-repo";

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
  echo: {
    handler: echoHandler,
    description: "Echo back the provided message",
    version: "1.0.0",
  },
  env: {
    handler: envHandler,
    description: "Show Speck environment and configuration info",
    version: "1.0.0",
  },
  branch: {
    handler: branchHandler,
    parseArgs: parseBranchArgs,
    description: "Manage stacked feature branches",
    version: "1.0.0",
  },
  "check-prerequisites": {
    handler: checkPrerequisitesHandler,
    parseArgs: parseCheckPrerequisitesArgs,
    description: "Validate feature directory structure and prerequisites",
    version: "1.0.0",
  },
  "create-new-feature": {
    handler: createNewFeatureHandler,
    parseArgs: parseCreateNewFeatureArgs,
    description: "Create new feature specification directory",
    version: "1.0.0",
  },
  "setup-plan": {
    handler: setupPlanHandler,
    parseArgs: parseSetupPlanArgs,
    description: "Initialize planning workflow",
    version: "1.0.0",
  },
  "link-repo": {
    handler: linkRepoHandler,
    parseArgs: parseLinkRepoArgs,
    description: "Link repository to multi-repo speck root",
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
