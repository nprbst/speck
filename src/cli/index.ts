#!/usr/bin/env bun

/**
 * Speck CLI - Main Entry Point
 *
 * Single entry point for the Speck CLI with Commander.js-based argument parsing.
 * Supports both human-readable output and JSON/hook modes for programmatic use.
 *
 * Feature: 015-scope-simplification
 * Tasks: T020-T027
 *
 * Usage:
 *   speck [options] [command] [command-options]
 *
 * Global Options:
 *   --json    Output structured JSON for LLM parsing
 *   --hook    Output hook-formatted response for Claude Code hooks
 *   --help    Show help for command
 *   --version Show version number
 */

import { Command } from 'commander';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';

// Import command handlers (lazy-loaded for performance)
const lazyCheckPrerequisites = (): Promise<
  typeof import('../../.speck/scripts/check-prerequisites.ts')
> => import('../../.speck/scripts/check-prerequisites.ts');
const lazyCreateNewFeature = (): Promise<
  typeof import('../../.speck/scripts/create-new-feature.ts')
> => import('../../.speck/scripts/create-new-feature.ts');
const lazyEnvCommand = (): Promise<typeof import('../../.speck/scripts/env-command.ts')> =>
  import('../../.speck/scripts/env-command.ts');
const lazyInitCommand = (): Promise<typeof import('../../.speck/scripts/commands/init.ts')> =>
  import('../../.speck/scripts/commands/init.ts');
const lazyLinkCommand = (): Promise<typeof import('../../.speck/scripts/commands/link.ts')> =>
  import('../../.speck/scripts/commands/link.ts');
const lazyLaunchIDECommand = (): Promise<
  typeof import('../../.speck/scripts/worktree/cli-launch-ide.ts')
> => import('../../.speck/scripts/worktree/cli-launch-ide.ts');
const lazySetupPlan = (): Promise<typeof import('../../.speck/scripts/setup-plan.ts')> =>
  import('../../.speck/scripts/setup-plan.ts');
const lazyUpdateAgentContext = (): Promise<
  typeof import('../../.speck/scripts/update-agent-context.ts')
> => import('../../.speck/scripts/update-agent-context.ts');
const lazyNextFeature = (): Promise<typeof import('../../.speck/scripts/next-feature.ts')> =>
  import('../../.speck/scripts/next-feature.ts');

/**
 * Output mode for CLI commands
 */
type OutputMode = 'human' | 'json' | 'hook';

/**
 * Global CLI state
 */
interface GlobalState {
  outputMode: OutputMode;
}

const globalState: GlobalState = {
  outputMode: 'human',
};

/**
 * Get package version from package.json
 */
function getVersion(): string {
  try {
    // Try multiple possible locations for package.json
    const possiblePaths = [
      join(dirname(import.meta.path), '../../package.json'),
      join(dirname(import.meta.path), '../../../package.json'),
      join(process.cwd(), 'package.json'),
    ];

    for (const pkgPath of possiblePaths) {
      if (existsSync(pkgPath)) {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as { version?: string };
        if (pkg.version) {
          return pkg.version;
        }
      }
    }
    return '0.0.0';
  } catch {
    return '0.0.0';
  }
}

/**
 * Process global options and set output mode
 */
function processGlobalOptions(options: { json?: boolean; hook?: boolean }): void {
  // --hook takes precedence over --json
  if (options.hook) {
    globalState.outputMode = 'hook';
  } else if (options.json) {
    globalState.outputMode = 'json';
  } else {
    globalState.outputMode = 'human';
  }
}

/**
 * Build argument array for subcommand, including global flags
 */
function buildSubcommandArgs(
  args: string[],
  options: Record<string, unknown>,
  rawArgs?: string[]
): string[] {
  const result = [...args];

  // Propagate global flags to subcommand
  if (options.json || globalState.outputMode === 'json') {
    result.push('--json');
  }

  // Add other subcommand-specific options
  for (const [key, value] of Object.entries(options)) {
    if (key === 'json' || key === 'hook') continue; // Already handled

    // Special handling for negatable boolean options (--worktree / --no-worktree)
    // Only pass the flag if it was explicitly provided by user, not default
    if (key === 'worktree') {
      // Check if user explicitly passed --worktree or --no-worktree
      const hasWorktreeFlag = rawArgs?.some(
        (arg) => arg === '--worktree' || arg === '--no-worktree'
      );
      if (hasWorktreeFlag) {
        if (value === true) {
          result.push('--worktree');
        } else if (value === false) {
          result.push('--no-worktree');
        }
      }
      // If not explicitly passed, don't add any flag - let script use config default
      continue;
    }

    // Special handling for --no-ide flag (Commander stores as ide: false)
    if (key === 'ide') {
      if (value === false) {
        result.push('--no-ide');
      }
      continue;
    }

    if (value === true) {
      result.push(`--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`);
    } else if (value !== false && value !== undefined) {
      result.push(`--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`, String(value));
    }
  }

  return result;
}

/**
 * Create the main CLI program
 */
function createProgram(): Command {
  const program = new Command();

  program
    .name('speck')
    .description('Speck CLI - Claude Code-Optimized Specification Framework')
    .version(getVersion(), '-V, --version', 'Show version number')
    .option('--json', 'Output structured JSON for LLM parsing')
    .option('--hook', 'Output hook-formatted response for Claude Code hooks')
    .hook('preAction', (thisCommand) => {
      const opts = thisCommand.opts();
      processGlobalOptions(opts);
    });

  // ==========================================================================
  // init command
  // ==========================================================================
  program
    .command('init')
    .description('Install Speck CLI globally via symlink to ~/.local/bin/speck')
    .option('--json', 'Output in JSON format')
    .option('--force', 'Force reinstall even if symlink exists')
    .option('--worktree-enabled <bool>', 'Enable worktree mode (true/false)')
    .option('--ide-autolaunch <bool>', 'Auto-launch IDE when creating features (true/false)')
    .option('--ide-editor <editor>', 'IDE editor choice (vscode/cursor/webstorm/idea/pycharm)')
    .action(async (options: Record<string, unknown>) => {
      const module = await lazyInitCommand();
      const args = buildSubcommandArgs([], options);
      const exitCode = await module.main(args);
      process.exit(exitCode);
    });

  // ==========================================================================
  // link command
  // ==========================================================================
  program
    .command('link')
    .description('Link repository to multi-repo speck root')
    .argument('<path>', 'Path to speck root directory')
    .option('--json', 'Output in JSON format')
    .action(async (path: string, options: Record<string, unknown>) => {
      const module = await lazyLinkCommand();
      const args = [path, ...buildSubcommandArgs([], options)];
      const exitCode = await module.main(args);
      process.exit(exitCode);
    });

  // ==========================================================================
  // create-new-feature command
  // ==========================================================================
  program
    .command('create-new-feature')
    .description('Create a new feature specification directory')
    .argument('<description>', 'Feature description')
    .option('--json', 'Output in JSON format')
    .option('--short-name <name>', 'Custom short name for the branch')
    .option('--number <n>', 'Specify branch number manually', parseInt)
    .option('--shared-spec', 'Create spec at speckRoot (multi-repo shared spec)')
    .option('--local-spec', 'Create spec locally in child repo')
    .option('--worktree', 'Create a worktree for the feature branch (overrides config)')
    .option('--no-worktree', 'Skip worktree creation (overrides config)')
    .option('--no-ide', 'Skip IDE auto-launch')
    .action(async (description: string, options: Record<string, unknown>, command) => {
      const module = await lazyCreateNewFeature();
      // Pass raw args to detect explicit --worktree / --no-worktree flags
      const rawArgs = command.args.concat(process.argv.slice(3));
      const args = [description, ...buildSubcommandArgs([], options, rawArgs)];
      const exitCode = await module.main(args);
      process.exit(exitCode);
    });

  // ==========================================================================
  // check-prerequisites command
  // ==========================================================================
  program
    .command('check-prerequisites')
    .description('Validate feature directory structure and prerequisites')
    .option('--json', 'Output in JSON format')
    .option('--hook', 'Output hook-formatted response')
    .option('--require-tasks', 'Require tasks.md to exist')
    .option('--include-tasks', 'Include tasks.md in available docs list')
    .option('--paths-only', 'Only output path variables')
    .option('--skip-feature-check', 'Skip feature directory validation')
    .option('--skip-plan-check', 'Skip plan.md validation')
    .option('--include-file-contents', 'Include file contents in output')
    .option('--include-workflow-mode', 'Include workflow mode in output')
    .option('--validate-code-quality', 'Validate TypeScript typecheck and ESLint')
    .action(async (options: Record<string, unknown>) => {
      const module = await lazyCheckPrerequisites();
      const args = buildSubcommandArgs([], options);
      const exitCode = await module.main(args);
      process.exit(exitCode);
    });

  // ==========================================================================
  // env command
  // ==========================================================================
  program
    .command('env')
    .description('Show Speck environment and configuration info')
    .option('--json', 'Output as JSON')
    .option('--hook', 'Output hook-formatted response')
    .action(async (options: Record<string, unknown>) => {
      const module = await lazyEnvCommand();
      const args = buildSubcommandArgs([], options);
      const exitCode = await module.main(args);
      process.exit(exitCode);
    });

  // ==========================================================================
  // launch-ide command
  // ==========================================================================
  program
    .command('launch-ide')
    .description('Launch IDE in worktree (for deferred IDE launch)')
    .requiredOption('--worktree-path <path>', 'Path to worktree directory')
    .option('--repo-path <path>', 'Path to repository root for config (default: .)')
    .option('--json', 'Output as JSON')
    .action(async (options: Record<string, unknown>) => {
      const module = await lazyLaunchIDECommand();
      await module.executeLaunchIDECommand({
        worktreePath: options.worktreePath as string,
        repoPath: (options.repoPath as string) || '.',
        json: options.json === true,
      });
    });

  // ==========================================================================
  // setup-plan command
  // ==========================================================================
  program
    .command('setup-plan')
    .description('Set up plan.md for the current feature')
    .option('--json', 'Output in JSON format')
    .action(async (options: Record<string, unknown>) => {
      const module = await lazySetupPlan();
      const args = buildSubcommandArgs([], options);
      const exitCode = await module.main(args);
      process.exit(exitCode);
    });

  // ==========================================================================
  // update-agent-context command
  // ==========================================================================
  program
    .command('update-agent-context')
    .description('Update CLAUDE.md context file with technology stack from current feature')
    .option('--json', 'Output in JSON format')
    .action(async (options: Record<string, unknown>) => {
      const module = await lazyUpdateAgentContext();
      const args = buildSubcommandArgs([], options);
      const exitCode = await module.main(args);
      process.exit(exitCode);
    });

  // ==========================================================================
  // next-feature command
  // ==========================================================================
  program
    .command('next-feature')
    .description('Get next feature number and detect multi-repo mode')
    .option('--json', 'Output in JSON format')
    .option('--short-name <name>', 'Short name to check for existing branches')
    .action(async (options: Record<string, unknown>) => {
      const module = await lazyNextFeature();
      const args = buildSubcommandArgs([], options);
      const exitCode = await module.main(args);
      process.exit(exitCode);
    });

  // ==========================================================================
  // help command (alias for --help)
  // ==========================================================================
  program
    .command('help [command]')
    .description('Display help for command')
    .action((cmdName?: string) => {
      if (cmdName) {
        const cmd = program.commands.find((c) => c.name() === cmdName);
        if (cmd) {
          cmd.help();
        } else {
          console.error(`Unknown command: ${cmdName}`);
          process.exit(1);
        }
      } else {
        program.help();
      }
    });

  // Handle unknown commands
  program.on('command:*', (operands: string[]) => {
    console.error(`error: unknown command '${operands[0]}'`);
    console.error("Run 'speck --help' to see available commands.");
    process.exit(1);
  });

  return program;
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const program = createProgram();

  // Show help if no arguments provided
  if (process.argv.length === 2) {
    program.help();
  }

  await program.parseAsync(process.argv);
}

// Run CLI
main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error('Fatal error:', message);
  process.exit(1);
});
