#!/usr/bin/env bun
/**
 * speck-review CLI entry point
 * AI-powered PR review with Speck-aware context
 */

import { logger } from "@speck/common/logger";
import packageJson from "../package.json";

const VERSION = packageJson.version;

// Command handlers type
type CommandHandler = (args: string[]) => Promise<void>;

// Command registry
const commands: Record<string, CommandHandler> = {
  help: async () => {
    printHelp();
  },

  version: async () => {
    console.log(`speck-review ${VERSION}`);
  },

  // Phase 4: User Story 2 - Cluster Analysis
  analyze: async (args) => {
    const { analyzeCommand } = await import("./commands/analyze");
    await analyzeCommand(args);
  },

  // State management
  state: async (args) => {
    const { stateCommand } = await import("./commands/state");
    await stateCommand(args);
  },

  // File listing
  files: async (args) => {
    const { filesCommand } = await import("./commands/files");
    await filesCommand(args);
  },

  // Phase 5: User Story 3 - Speck Context
  "spec-context": async () => {
    const { specContextCommand } = await import("./commands/spec-context");
    await specContextCommand();
  },

  // Phase 6: User Story 4 - Comment Management
  comment: async (args) => {
    const { commentCommand } = await import("./commands/comment");
    await commentCommand(args);
  },

  "comment-reply": async (args) => {
    const { commentReplyCommand } = await import("./commands/comment");
    await commentReplyCommand(args);
  },

  "comment-delete": async (args) => {
    const { commentDeleteCommand } = await import("./commands/comment");
    await commentDeleteCommand(args);
  },

  "list-comments": async () => {
    const { listCommentsCommand } = await import("./commands/comment");
    await listCommentsCommand();
  },

  review: async (args) => {
    const { reviewCommand } = await import("./commands/review");
    await reviewCommand(args);
  },

  // Phase 8: User Story 6 - Self-Review Mode
  "check-self-review": async (args) => {
    const { checkSelfReviewCommand } = await import("./commands/check-self-review");
    await checkSelfReviewCommand(args);
  },

  // Phase 9b: POC Parity - Utility Commands (FR-027)
  link: async (args) => {
    const { linkCommand } = await import("./commands/link");
    await linkCommand(args);
  },

  actions: async () => {
    const { actionsCommand } = await import("./commands/actions");
    await actionsCommand();
  },

  "run-actions": async () => {
    const { runActionsCommand } = await import("./commands/actions");
    await runActionsCommand();
  },

  "review-table": async (args) => {
    const { reviewTableCommand } = await import("./commands/review-table");
    await reviewTableCommand(args);
  },

  "submit-actions": async (args) => {
    const { submitActionsCommand } = await import("./commands/actions");
    await submitActionsCommand(args);
  },

  logs: async () => {
    const { logsCommand } = await import("./commands/logs");
    await logsCommand();
  },
};

// Help text
function printHelp(): void {
  console.log(`
speck-review v${VERSION}
AI-powered PR review with Speck-aware context

USAGE:
  speck-review <command> [arguments]

COMMANDS:
  analyze [pr-number]       Analyze PR and output clustered file groupings
  state [show|clear]        Manage review session state
  files                     List changed files with metadata
  spec-context              Load Speck specification for current branch

  comment <file> <line> <body>    Post a line comment
  comment-reply <id> <body>       Reply to a comment thread
  comment-delete <id>             Delete a comment
  list-comments                   List all PR comments

  review <event> [body]     Submit review (approve|request-changes|comment)
  check-self-review <author> Check if current user is PR author

  link <file> [line]        Generate file:line navigation reference
  actions                   Display navigation action menu
  run-actions               Display review action menu
  review-table [--example]  Generate formatted comment table
  submit-actions [body]     Display submit review menu
  logs                      Display log file locations and debug info

  help, --help, -h          Show this help message
  version, --version, -v    Show version

ENVIRONMENT:
  SPECK_DEBUG=1             Enable debug logging
  SPECK_LOG_LEVEL           Set log level (debug|info|warn|error)
  SPECK_STATE_PATH          Override state file location

EXAMPLES:
  speck-review analyze 142
  speck-review state show
  speck-review comment src/auth.ts 42 "Consider adding rate limiting"
  speck-review review approve

For more information: https://github.com/nprbst/speck
`);
}

// Main entry point
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Handle --version/-v
  if (args.includes("--version") || args.includes("-v")) {
    await commands.version([]);
    return;
  }

  // Handle --help/-h
  if (args.includes("--help") || args.includes("-h") || args.length === 0) {
    await commands.help([]);
    return;
  }

  const command = args[0];
  const commandArgs = args.slice(1);

  logger.debug(`Running command: ${command}`, commandArgs);

  if (!command) {
    printHelp();
    process.exit(0);
  }

  const handler = commands[command];
  if (!handler) {
    logger.error(`Unknown command: ${command}`);
    console.error(`Run 'speck-review help' for usage information.`);
    process.exit(1);
  }

  try {
    await handler(commandArgs);
  } catch (error) {
    if (error instanceof Error) {
      logger.error(error.message);
      logger.debug("Stack trace:", error.stack);
    } else {
      logger.error(String(error));
    }
    process.exit(1);
  }
}

// Run
main();
