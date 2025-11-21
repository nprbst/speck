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

// Import the actual script main functions directly
import { main as checkPrerequisitesMain } from "../check-prerequisites";
import { main as createNewFeatureMain } from "../create-new-feature";
import { main as setupPlanMain } from "../setup-plan";
import { main as linkRepoMain } from "../link-repo";
import { main as branchMain } from "../branch-command";
import { main as envMain } from "../env-command";

/**
 * Command registry mapping command names to handlers
 *
 * Key format: Command name without "speck-" prefix (e.g., "env" for "speck-env")
 * Value: CommandRegistryEntry with handler, description, version, main function
 */
export const registry: CommandRegistry = {
  echo: {
    handler: echoHandler,
    description: "Echo back the provided message",
    version: "1.0.0",
  },
  env: {
    handler: envHandler,
    main: envMain,
    description: "Show Speck environment and configuration info",
    version: "1.0.0",
  },
  branch: {
    main: branchMain,
    description: "Manage stacked feature branches",
    version: "1.0.0",
  },
  "check-prerequisites": {
    main: checkPrerequisitesMain,
    description: "Validate feature directory structure and prerequisites",
    version: "1.0.0",
  },
  "create-new-feature": {
    main: createNewFeatureMain,
    description: "Create new feature specification directory",
    version: "1.0.0",
  },
  "setup-plan": {
    main: setupPlanMain,
    description: "Initialize planning workflow",
    version: "1.0.0",
  },
  "link-repo": {
    main: linkRepoMain,
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
