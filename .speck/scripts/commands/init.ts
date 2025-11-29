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

import { existsSync, mkdirSync, lstatSync, readlinkSync, unlinkSync, symlinkSync } from "node:fs";
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
 * Get the path to bootstrap.sh relative to this script
 */
function getBootstrapPath(): string {
  // This file is at .speck/scripts/commands/init.ts
  // bootstrap.sh is at src/cli/bootstrap.sh
  const scriptDir = dirname(new URL(import.meta.url).pathname);
  // Go up 3 levels from .speck/scripts/commands to repo root, then to src/cli/bootstrap.sh
  return resolve(scriptDir, "../../../src/cli/bootstrap.sh");
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

  // Step 1: Create .speck/ directory structure
  const gitRoot = findGitRoot();
  let speckDirCreated = false;
  let speckDirPath: string | undefined;
  let needsConstitution = false;

  if (gitRoot) {
    const speckResult = createSpeckDirectory(gitRoot);
    if (speckResult) {
      speckDirCreated = speckResult.created;
      speckDirPath = speckResult.path;
      // Check if constitution.md exists
      const constitutionPath = join(speckResult.path, "memory", "constitution.md");
      needsConstitution = !existsSync(constitutionPath);
    }
  }

  // Step 2: Verify bootstrap.sh exists
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

  // Step 3: Check if CLI already installed correctly
  if (isValidSymlink(SYMLINK_PATH, bootstrapPath)) {
    if (!options.force) {
      return {
        success: true,
        symlinkPath: SYMLINK_PATH,
        targetPath: bootstrapPath,
        inPath,
        alreadyInstalled: true,
        message: speckDirCreated
          ? `✓ Created .speck/ directory\n✓ Speck CLI already installed at ${SYMLINK_PATH}`
          : `Speck is already installed at ${SYMLINK_PATH}`,
        pathInstructions,
        speckDirCreated,
        speckDirPath,
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

  return {
    success: true,
    symlinkPath: SYMLINK_PATH,
    targetPath: bootstrapPath,
    inPath,
    message: messages.join("\n"),
    pathInstructions,
    speckDirCreated,
    speckDirPath,
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
export function main(args: string[]): number {
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
  const exitCode = main(process.argv.slice(2));
  process.exit(exitCode);
}
