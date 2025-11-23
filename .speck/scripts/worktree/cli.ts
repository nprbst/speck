#!/usr/bin/env bun

/**
 * CLI Entry Point for Worktree Operations
 *
 * Provides command-line interface for worktree management.
 * Used by slash commands (/speck:specify, /speck:branch) to create worktrees.
 */

import { parseArgs } from "util";
import { createWorktree } from "./create";
import { removeWorktree } from "./remove";
import { listWorktrees } from "./git";
import { loadConfig } from "./config";

const USAGE = `
Speck Worktree CLI

Usage:
  bun .speck/scripts/worktree/cli.ts create --branch <name> --repo-path <path> [options]
  bun .speck/scripts/worktree/cli.ts remove --branch <name> --repo-path <path>
  bun .speck/scripts/worktree/cli.ts list --repo-path <path>

Commands:
  create    Create a new worktree for a branch
  remove    Remove an existing worktree
  list      List all worktrees

Options:
  --branch <name>         Branch name for the worktree
  --repo-path <path>      Path to repository root
  --worktree-path <path>  Custom worktree path (default: .speck/worktrees/<branch>)
  --no-ide                Skip IDE auto-launch (override config)
  --no-deps               Skip dependency installation (override config)
  --reuse                 Reuse existing worktree directory if it exists
  --json                  Output results as JSON
  --help                  Show this help message

Examples:
  # Create worktree for feature branch
  bun .speck/scripts/worktree/cli.ts create --branch 001-user-auth --repo-path .

  # Create worktree with custom path
  bun .speck/scripts/worktree/cli.ts create --branch 002-api --repo-path . --worktree-path ./custom/path

  # Remove worktree
  bun .speck/scripts/worktree/cli.ts remove --branch 001-user-auth --repo-path .
`;

interface CliArgs {
  command?: string;
  branch?: string;
  "repo-path"?: string;
  "worktree-path"?: string;
  "no-ide"?: boolean;
  "no-deps"?: boolean;
  reuse?: boolean;
  json?: boolean;
  help?: boolean;
}

async function main() {
  const args = process.argv.slice(2);

  // Show help if no args
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log(USAGE);
    process.exit(0);
  }

  // Parse command (first positional arg)
  const command = args[0];
  if (!["create", "remove", "list"].includes(command)) {
    console.error(`Error: Unknown command '${command}'`);
    console.log(USAGE);
    process.exit(1);
  }

  // Parse named arguments
  const { values } = parseArgs({
    args: args.slice(1),
    options: {
      branch: { type: "string" },
      "repo-path": { type: "string" },
      "worktree-path": { type: "string" },
      "no-ide": { type: "boolean", default: false },
      "no-deps": { type: "boolean", default: false },
      reuse: { type: "boolean", default: false },
      json: { type: "boolean", default: false },
      help: { type: "boolean", default: false },
    },
    strict: true,
    allowPositionals: false,
  }) as { values: CliArgs };

  const repoPath = values["repo-path"] || ".";
  const outputJson = values.json ?? false;

  try {
    switch (command) {
      case "create": {
        if (!values.branch || !repoPath) {
          throw new Error("--branch and --repo-path are required for 'create' command");
        }

        // Load configuration to check if worktree is enabled
        const config = await loadConfig(repoPath);

        if (!config.worktree?.enabled) {
          if (outputJson) {
            console.log(JSON.stringify({
              success: false,
              message: "Worktree integration is disabled in .speck/config.json",
              skipped: true,
            }));
          } else {
            console.log("⚠ Worktree integration is disabled. Set worktree.enabled = true in .speck/config.json");
          }
          process.exit(0);
        }

        const result = await createWorktree({
          repoPath,
          branchName: values.branch,
          worktreePath: values["worktree-path"],
          skipIDE: values["no-ide"],
          skipDeps: values["no-deps"],
          reuseExisting: values.reuse ?? false,
        });

        if (outputJson) {
          console.log(JSON.stringify({
            success: result.success,
            worktreePath: result.worktreePath,
            branchName: result.metadata.branchName,
            status: result.metadata.status,
            errors: result.errors,
          }, null, 2));
        } else {
          if (result.success) {
            console.log(`✓ Created worktree at ${result.worktreePath}`);
            if (config.worktree.ide?.autoLaunch && !values["no-ide"]) {
              console.log(`✓ Launched ${config.worktree.ide.editor}`);
            }
          } else {
            console.error(`✗ Failed to create worktree:`);
            result.errors?.forEach((err) => console.error(`  - ${err}`));
            process.exit(1);
          }
        }
        break;
      }

      case "remove": {
        if (!values.branch || !repoPath) {
          throw new Error("--branch and --repo-path are required for 'remove' command");
        }

        await removeWorktree(repoPath, values.branch, { force: false });

        if (outputJson) {
          console.log(JSON.stringify({ success: true, branchName: values.branch }));
        } else {
          console.log(`✓ Removed worktree for branch ${values.branch}`);
        }
        break;
      }

      case "list": {
        if (!repoPath) {
          throw new Error("--repo-path is required for 'list' command");
        }

        const worktrees = await listWorktrees(repoPath);

        if (outputJson) {
          console.log(JSON.stringify({ worktrees }, null, 2));
        } else {
          if (worktrees.length === 0) {
            console.log("No worktrees found");
          } else {
            console.log(`Found ${worktrees.length} worktree(s):\n`);
            worktrees.forEach((wt) => {
              console.log(`  ${wt.branch || "(main)"}`);
              console.log(`    Path: ${wt.path}`);
              console.log();
            });
          }
        }
        break;
      }
    }
  } catch (error) {
    if (outputJson) {
      console.log(JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }));
    } else {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
    process.exit(1);
  }
}

main();
