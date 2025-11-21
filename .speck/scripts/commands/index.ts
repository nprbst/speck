/**
 * Centralized command registry
 * Maps virtual command names to handler implementations
 *
 * This registry enables the hook router to dynamically lookup and execute commands
 * without hardcoding command names in the hook script.
 */

import type { CommandRegistry, MainFunction } from "../lib/types";
import { echoHandler } from "./echo";
import { envHandler } from "./env";

// Lightweight commands: static imports (always loaded)
import { main as checkPrerequisitesMain } from "../check-prerequisites";

// Heavy commands: dynamic imports (lazy-loaded on demand)
// Using arrow functions that return dynamic imports ensures the code is only loaded when called
const lazyBranchMain = async (): Promise<MainFunction> => {
  const module = await import("../branch-command");
  return module.main;
};

const lazyEnvMain = async (): Promise<MainFunction> => {
  const module = await import("../env-command");
  return module.main;
};

const lazyCreateNewFeatureMain = async (): Promise<MainFunction> => {
  const module = await import("../create-new-feature");
  return module.main;
};

const lazySetupPlanMain = async (): Promise<MainFunction> => {
  const module = await import("../setup-plan");
  return module.main;
};

const lazyLinkRepoMain = async (): Promise<MainFunction> => {
  const module = await import("../link-repo");
  return module.main;
};

/**
 * Command registry mapping command names to handlers
 *
 * Key format: Command name without "speck-" prefix (e.g., "env" for "speck-env")
 * Value: CommandRegistryEntry with handler/main/lazyMain, description, version
 *
 * Strategy:
 * - Lightweight commands use `main` (static import, always loaded)
 * - Heavy commands use `lazyMain` (dynamic import, loaded on demand)
 */
export const registry: CommandRegistry = {
  echo: {
    handler: echoHandler,
    description: "Echo back the provided message",
    version: "1.0.0",
  },
  env: {
    handler: envHandler,
    lazyMain: lazyEnvMain,
    description: "Show Speck environment and configuration info",
    version: "1.0.0",
  },
  branch: {
    lazyMain: lazyBranchMain,
    description: "Manage stacked feature branches",
    version: "1.0.0",
  },
  "check-prerequisites": {
    main: checkPrerequisitesMain,
    description: "Validate feature directory structure and prerequisites",
    version: "1.0.0",
  },
  "create-new-feature": {
    lazyMain: lazyCreateNewFeatureMain,
    description: "Create new feature specification directory",
    version: "1.0.0",
  },
  "setup-plan": {
    lazyMain: lazySetupPlanMain,
    description: "Initialize planning workflow",
    version: "1.0.0",
  },
  "link-repo": {
    lazyMain: lazyLinkRepoMain,
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
