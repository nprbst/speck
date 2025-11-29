/**
 * Init Command Handler
 *
 * Initializes Speck in the current repository:
 * 1. Creates the .speck/ directory structure
 * 2. Creates a symlink at ~/.local/bin/speck pointing to the bootstrap script,
 *    making the `speck` CLI globally available.
 *
 * Feature: 015-scope-simplification
 * Tasks: T059-T064
 *
 * Usage:
 *   speck init [--force] [--json]
 *
 * Options:
 *   --force  Force reinstall even if symlink exists
 *   --json   Output in JSON format
 */

import { existsSync, mkdirSync, lstatSync, readlinkSync, unlinkSync, symlinkSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { homedir } from "node:os";
import { parseArgs } from "util";

// =============================================================================
// Types
// =============================================================================

interface InitOptions {
  force: boolean;
  json: boolean;
}

interface InitResult {
  success: boolean;
  symlinkPath: string;
  targetPath: string;
  inPath: boolean;
  message: string;
  alreadyInstalled?: boolean;
  pathInstructions?: string;
  speckDirCreated?: boolean;
  speckDirPath?: string;
  nextStep?: string;
  permissionsConfigured?: number;  // Number of permissions added (0 = none added)
}

interface ClaudeSettings {
  permissions?: {
    allow?: string[];
    deny?: string[];
    ask?: string[];
  };
  [key: string]: unknown;
}

// =============================================================================
// Constants
// =============================================================================

const LOCAL_BIN_DIR = join(homedir(), ".local", "bin");
const SYMLINK_PATH = join(LOCAL_BIN_DIR, "speck");

// .speck/ directory structure to create
const SPECK_SUBDIRS = [
  "memory",     // For constitution.md and other memory files
  "scripts",    // For custom scripts
];

// Default permissions to add to .claude/settings.local.json
// These are commands that are commonly needed and safe to auto-approve
const DEFAULT_ALLOWED_PERMISSIONS = [
  // Plugin template access
  "Read(~/.claude/plugins/marketplaces/speck-market/speck/templates/**)",

  // Git read-only commands (safe for status/diff/log inspection)
  "Bash(git diff:*)",
  "Bash(git fetch:*)",
  "Bash(git log:*)",
  "Bash(git ls-remote:*)",
  "Bash(git ls:*)",
  "Bash(git status)",
] as const;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Find the git repository root from the current working directory
 */
function findGitRoot(): string | null {
  try {
    const result = Bun.spawnSync(["git", "rev-parse", "--show-toplevel"], {
      cwd: process.cwd(),
    });
    if (result.exitCode === 0) {
      return result.stdout.toString().trim();
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Create the .speck/ directory structure in the repository
 * Returns the path to .speck/ if created or already exists, null on error
 */
function createSpeckDirectory(repoRoot: string): { created: boolean; path: string } | null {
  const speckDir = join(repoRoot, ".speck");

  try {
    const alreadyExists = existsSync(speckDir);

    // Create .speck/ and subdirectories
    for (const subdir of SPECK_SUBDIRS) {
      const subdirPath = join(speckDir, subdir);
      if (!existsSync(subdirPath)) {
        mkdirSync(subdirPath, { recursive: true });
      }
    }

    return { created: !alreadyExists, path: speckDir };
  } catch {
    return null;
  }
}

/**
 * Get the path to bootstrap.sh
 *
 * When running from:
 * - Development: .speck/scripts/commands/init.ts → src/cli/bootstrap.sh
 * - Plugin bundle: dist/speck-cli.js → src/cli/bootstrap.sh (same relative structure)
 * - Plugin install: ~/.claude/plugins/.../speck/dist/speck-cli.js → src/cli/bootstrap.sh
 */
function getBootstrapPath(): string {
  const scriptPath = new URL(import.meta.url).pathname;
  const scriptDir = dirname(scriptPath);

  // Check multiple possible locations
  const candidates = [
    // From bundled CLI at dist/speck-cli.js → ../src/cli/bootstrap.sh
    resolve(scriptDir, "../src/cli/bootstrap.sh"),
    // From dev at .speck/scripts/commands/init.ts → ../../../src/cli/bootstrap.sh
    resolve(scriptDir, "../../../src/cli/bootstrap.sh"),
    // From plugin install: look for src/cli/bootstrap.sh relative to plugin root
    resolve(scriptDir, "../../src/cli/bootstrap.sh"),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  // Fall back to first candidate (will fail with helpful error)
  return candidates[0] ?? resolve(scriptDir, "../src/cli/bootstrap.sh");
}

/**
 * Check if ~/.local/bin is in the user's PATH
 */
function isInPath(): boolean {
  const pathDirs = (process.env.PATH || "").split(":");
  return pathDirs.includes(LOCAL_BIN_DIR);
}

/**
 * Get shell-specific PATH setup instructions
 */
function getPathInstructions(): string {
  const shell = process.env.SHELL || "/bin/bash";
  const shellName = shell.includes("zsh") ? "zsh" : "bash";
  const rcFile = shellName === "zsh" ? "~/.zshrc" : "~/.bashrc";

  return `Add ~/.local/bin to your PATH by adding this line to ${rcFile}:

  export PATH="$HOME/.local/bin:$PATH"

Then reload your shell config:

  source ${rcFile}`;
}

/**
 * Check if a path is a symlink pointing to expected target
 */
function isValidSymlink(symlinkPath: string, expectedTarget: string): boolean {
  try {
    if (!existsSync(symlinkPath)) return false;
    if (!lstatSync(symlinkPath).isSymbolicLink()) return false;
    const target = readlinkSync(symlinkPath);
    return target === expectedTarget;
  } catch {
    return false;
  }
}

/**
 * Check if path exists and is a regular file
 */
function isRegularFile(path: string): boolean {
  try {
    return existsSync(path) && lstatSync(path).isFile() && !lstatSync(path).isSymbolicLink();
  } catch {
    return false;
  }
}

/**
 * Configure .claude/settings.local.json with default allowed permissions
 * Uses settings.local.json because:
 * 1. The plugin install path is machine-specific
 * 2. settings.local.json is gitignored by Claude Code
 * 3. Uses ~ for home directory which Claude Code expands
 *
 * Returns the number of permissions added, 0 if all already configured or on error
 */
function configurePluginPermissions(repoRoot: string): number {
  // Use settings.local.json for machine-specific config (gitignored by Claude Code)
  const settingsPath = join(repoRoot, ".claude", "settings.local.json");

  try {
    // Ensure .claude directory exists
    const claudeDir = join(repoRoot, ".claude");
    if (!existsSync(claudeDir)) {
      mkdirSync(claudeDir, { recursive: true });
    }

    // Load existing settings or create new
    let settings: ClaudeSettings = {};
    if (existsSync(settingsPath)) {
      const content = readFileSync(settingsPath, "utf-8");
      settings = JSON.parse(content) as ClaudeSettings;
    }

    // Ensure permissions.allow array exists
    if (!settings.permissions) {
      settings.permissions = {};
    }
    if (!settings.permissions.allow) {
      settings.permissions.allow = [];
    }

    // Add any missing permissions from the default list
    let addedCount = 0;
    for (const permission of DEFAULT_ALLOWED_PERMISSIONS) {
      if (!settings.permissions.allow.includes(permission)) {
        settings.permissions.allow.push(permission);
        addedCount++;
      }
    }

    // Only write if we added something
    if (addedCount > 0) {
      writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n");
    }

    return addedCount;
  } catch {
    return 0;
  }
}

// =============================================================================
// Main Implementation
// =============================================================================

/**
 * Execute the init command
 */
function runInit(options: InitOptions): InitResult {
  const bootstrapPath = getBootstrapPath();
  const inPath = isInPath();
  const pathInstructions = inPath ? undefined : getPathInstructions();

  // Step 1: Verify git repository exists
  const gitRoot = findGitRoot();
  if (!gitRoot) {
    return {
      success: false,
      symlinkPath: SYMLINK_PATH,
      targetPath: bootstrapPath,
      inPath,
      message: `Error: Not in a git repository.

Speck requires a git repository to function. Please either:
  1. Initialize a git repository: git init
  2. Navigate to an existing git repository

Then run 'speck init' again.`,
      pathInstructions,
    };
  }

  // Step 2: Create .speck/ directory structure
  let speckDirCreated = false;
  let speckDirPath: string | undefined;
  let needsConstitution = false;

  const speckResult = createSpeckDirectory(gitRoot);
  if (speckResult) {
    speckDirCreated = speckResult.created;
    speckDirPath = speckResult.path;
    // Check if constitution.md exists
    const constitutionPath = join(speckResult.path, "memory", "constitution.md");
    needsConstitution = !existsSync(constitutionPath);
  }

  // Step 2b: Configure plugin permissions in .claude/settings.local.json
  const permissionsConfigured = configurePluginPermissions(gitRoot);

  // Step 3: Verify bootstrap.sh exists
  if (!existsSync(bootstrapPath)) {
    return {
      success: false,
      symlinkPath: SYMLINK_PATH,
      targetPath: bootstrapPath,
      inPath,
      message: `Error: Bootstrap script not found at ${bootstrapPath}`,
      pathInstructions,
      speckDirCreated,
      speckDirPath,
    };
  }

  // Step 4: Check if CLI already installed correctly
  if (isValidSymlink(SYMLINK_PATH, bootstrapPath)) {
    if (!options.force) {
      const alreadyInstalledMessages: string[] = [];
      if (speckDirCreated) {
        alreadyInstalledMessages.push(`✓ Created .speck/ directory`);
      }
      alreadyInstalledMessages.push(`✓ Speck CLI already installed at ${SYMLINK_PATH}`);
      if (permissionsConfigured > 0) {
        alreadyInstalledMessages.push(`✓ Added ${permissionsConfigured} permission(s) to .claude/settings.local.json`);
      }
      return {
        success: true,
        symlinkPath: SYMLINK_PATH,
        targetPath: bootstrapPath,
        inPath,
        alreadyInstalled: true,
        message: alreadyInstalledMessages.join("\n"),
        pathInstructions,
        speckDirCreated,
        speckDirPath,
        permissionsConfigured,
        nextStep: needsConstitution ? "Run /speck:constitution to set up your project principles." : undefined,
      };
    }
    // Force flag: remove and recreate
    unlinkSync(SYMLINK_PATH);
  }

  // Handle existing file at symlink path
  if (existsSync(SYMLINK_PATH)) {
    if (isRegularFile(SYMLINK_PATH)) {
      if (!options.force) {
        return {
          success: false,
          symlinkPath: SYMLINK_PATH,
          targetPath: bootstrapPath,
          inPath,
          message: `Error: Regular file exists at ${SYMLINK_PATH}. Use --force to replace.`,
          pathInstructions,
          speckDirCreated,
          speckDirPath,
        };
      }
    }
    // Remove existing file/symlink
    unlinkSync(SYMLINK_PATH);
  }

  // Create ~/.local/bin directory if needed
  if (!existsSync(LOCAL_BIN_DIR)) {
    mkdirSync(LOCAL_BIN_DIR, { recursive: true });
  }

  // Create symlink
  try {
    symlinkSync(bootstrapPath, SYMLINK_PATH);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      symlinkPath: SYMLINK_PATH,
      targetPath: bootstrapPath,
      inPath,
      message: `Error creating symlink: ${errMsg}`,
      pathInstructions,
      speckDirCreated,
      speckDirPath,
    };
  }

  // Build success message
  const messages: string[] = [];
  if (speckDirCreated) {
    messages.push(`✓ Created .speck/ directory at ${speckDirPath}`);
  } else if (speckDirPath) {
    messages.push(`✓ .speck/ directory exists at ${speckDirPath}`);
  }
  messages.push(`✓ Speck CLI installed to ${SYMLINK_PATH}`);
  if (permissionsConfigured > 0) {
    messages.push(`✓ Added ${permissionsConfigured} permission(s) to .claude/settings.local.json`);
  }

  return {
    success: true,
    symlinkPath: SYMLINK_PATH,
    targetPath: bootstrapPath,
    inPath,
    message: messages.join("\n"),
    pathInstructions,
    speckDirCreated,
    speckDirPath,
    permissionsConfigured,
    nextStep: needsConstitution ? "Run /speck:constitution to set up your project principles." : undefined,
  };
}

/**
 * Format output based on options
 */
function formatOutput(result: InitResult, options: InitOptions): string {
  if (options.json) {
    return JSON.stringify(
      {
        ok: result.success,
        result: {
          symlinkPath: result.symlinkPath,
          targetPath: result.targetPath,
          inPath: result.inPath,
          alreadyInstalled: result.alreadyInstalled,
          speckDirCreated: result.speckDirCreated,
          speckDirPath: result.speckDirPath,
          permissionsConfigured: result.permissionsConfigured,
        },
        message: result.message,
        pathInstructions: result.pathInstructions,
        nextStep: result.nextStep,
      },
      null,
      2
    );
  }

  let output = result.message;

  if (result.success && !result.inPath && result.pathInstructions) {
    output += `\n\n⚠️  Warning: ~/.local/bin is not in your PATH\n\n${result.pathInstructions}`;
  }

  if (result.success && result.nextStep) {
    output += `\n\n📋 Next step: ${result.nextStep}`;
  }

  return output;
}

// =============================================================================
// CLI Entry Point
// =============================================================================

/**
 * Main entry point for CLI invocation
 */
export async function main(args: string[]): Promise<number> {
  // Parse arguments
  const { values } = parseArgs({
    args,
    options: {
      force: { type: "boolean", default: false },
      json: { type: "boolean", default: false },
    },
    allowPositionals: true,
  });

  const options: InitOptions = {
    force: values.force ?? false,
    json: values.json ?? false,
  };

  // Run init
  const result = runInit(options);

  // Output result
  console.log(formatOutput(result, options));

  return result.success ? 0 : 1;
}

// Run if executed directly
if (import.meta.main) {
  main(process.argv.slice(2)).then((exitCode) => {
    process.exit(exitCode);
  });
}
