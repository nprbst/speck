#!/usr/bin/env bun
/**
 * speck-changes CLI entry point
 * OpenSpec change management workflow for Speck
 */

import { createScopedLogger } from '@speck/common';

const VERSION = '1.0.0';
const logger = createScopedLogger('speck-changes');

// Command handlers type - returns exit code
type CommandHandler = (args: string[]) => Promise<number>;

// Command registry with lazy imports
const commands: Record<string, CommandHandler> = {
  help: async () => {
    printHelp();
    return 0;
  },

  version: async () => {
    console.log(`speck-changes ${VERSION}`);
    return 0;
  },

  // Create a new change proposal
  propose: async (args) => {
    const { runPropose } = await import('./commands/propose');
    return runPropose(args);
  },

  // Apply changes from a proposal
  apply: async (args) => {
    const { runApply } = await import('./commands/apply');
    return runApply(args);
  },

  // List all change proposals
  list: async (args) => {
    const { runList } = await import('./commands/list');
    return runList(args);
  },

  // Show details of a change
  show: async (args) => {
    const { runShow } = await import('./commands/show');
    return runShow(args);
  },

  // Validate a change proposal
  validate: async (args) => {
    const { runValidate } = await import('./commands/validate');
    return runValidate(args);
  },

  // Archive a completed change
  archive: async (args) => {
    const { runArchive } = await import('./commands/archive');
    return runArchive(args);
  },

  // Migrate changes between formats
  migrate: async (args) => {
    const { runMigrate } = await import('./commands/migrate');
    return runMigrate(args);
  },

  // Check upstream for new releases
  'check-upstream': async (args) => {
    const { runCheckUpstream } = await import('./commands/check-upstream');
    return runCheckUpstream(args);
  },

  // Pull upstream release
  'pull-upstream': async (args) => {
    const { runPullUpstream } = await import('./commands/pull-upstream');
    return runPullUpstream(args);
  },

  // Transform upstream release
  'transform-upstream': async (args) => {
    const { runTransformUpstream } = await import('./commands/transform-upstream');
    return runTransformUpstream(args);
  },
};

// Help text
function printHelp(): void {
  console.log(`
speck-changes v${VERSION}
OpenSpec change management workflow for Speck

USAGE:
  speck-changes <command> [arguments]

COMMANDS:
  propose <name>            Create a new change proposal
  apply <name>              Apply changes from a proposal
  list [--all]              List all change proposals
  show <name>               Show details of a change
  validate <name>           Validate a change proposal
  archive <name>            Archive a completed change

  migrate [--dry-run]       Migrate changes between formats
  check-upstream            Check for new OpenSpec releases
  pull-upstream             Pull upstream release
  transform-upstream        Transform upstream release

  help, --help, -h          Show this help message
  version, --version, -v    Show version

OPTIONS (global):
  --json                    Output in JSON format
  --help                    Show command help

EXAMPLES:
  speck-changes propose add-auth
  speck-changes propose add-auth --with-design
  speck-changes list
  speck-changes list --all --json
  speck-changes show add-auth
  speck-changes validate add-auth
  speck-changes apply add-auth
  speck-changes archive add-auth

For more information: https://github.com/nprbst/speck
`);
}

// Main entry point
async function main(): Promise<number> {
  const args = process.argv.slice(2);

  // Handle --version/-v
  if (args.includes('--version') || args.includes('-v')) {
    return commands['version']!([]);
  }

  // Handle --help/-h or no args
  if (args.includes('--help') || args.includes('-h') || args.length === 0) {
    return commands['help']!([]);
  }

  const command = args[0];
  const commandArgs = args.slice(1);

  logger.debug(`Running command: ${command}`, commandArgs);

  if (!command) {
    printHelp();
    return 0;
  }

  const handler = commands[command];
  if (!handler) {
    logger.error(`Unknown command: ${command}`);
    console.error(`Run 'speck-changes help' for usage information.`);
    return 1;
  }

  try {
    return await handler(commandArgs);
  } catch (error) {
    if (error instanceof Error) {
      logger.error(error.message);
      logger.debug('Stack trace:', error.stack);
    } else {
      logger.error(String(error));
    }
    return 1;
  }
}

// Run and exit with code
main()
  .then((code) => process.exit(code))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
