/**
 * Common path resolution and feature detection utilities
 *
 * Bun TypeScript implementation of common.sh
 *
 * Transformation Date: 2025-11-15
 * Source: upstream/v0.0.85/.specify/scripts/bash/common.sh
 * Strategy: Pure TypeScript (native path/fs operations)
 *
 * Changes from v0.0.84 to v0.0.85:
 * - Upstream added CDPATH="" to cd commands (security fix for bash path traversal)
 * - TypeScript implementation already immune: uses import.meta.dir and path.resolve()
 * - No code changes needed, only documentation updated to track v0.0.85
 *
 * All functions use pure TypeScript/Node.js APIs for maximum maintainability.
 */

import { existsSync } from "node:fs";
import { readdirSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { $ } from "bun";

// [SPECK-EXTENSION:START] Multi-repo detection
/**
 * Speck configuration - detected mode and paths
 */
export interface SpeckConfig {
  mode: 'single-repo' | 'multi-repo';
  speckRoot: string;     // Directory containing specs/
  repoRoot: string;      // Git repository root
  specsDir: string;      // Full path to specs/
}
// [SPECK-EXTENSION:END]

/**
 * Feature paths returned by getFeaturePaths()
 */
export interface FeaturePaths {
  // [SPECK-EXTENSION:START] Multi-repo fields
  MODE: 'single-repo' | 'multi-repo';
  SPECK_ROOT: string;
  SPECS_DIR: string;
  // [SPECK-EXTENSION:END]
  REPO_ROOT: string;
  CURRENT_BRANCH: string;
  HAS_GIT: string;
  FEATURE_DIR: string;
  FEATURE_SPEC: string;
  IMPL_PLAN: string;
  TASKS: string;
  RESEARCH: string;
  DATA_MODEL: string;
  QUICKSTART: string;
  CONTRACTS_DIR: string;
}

/**
 * Detect if running from a plugin installation
 *
 * Checks for CLAUDE_PLUGIN_ROOT environment variable (set by Claude Code)
 * or path patterns indicating plugin installation.
 *
 * Plugin installations are located at:
 * - ~/.claude/plugins/marketplaces/<marketplace-name>/
 * - ~/.config/claude-code/plugins/<plugin-name>/
 *
 * Development installations have scripts at:
 * - <repo>/.speck/scripts/
 */
export function isPluginInstallation(): boolean {
  // Check for CLAUDE_PLUGIN_ROOT environment variable first
  if (process.env.CLAUDE_PLUGIN_ROOT) {
    return true;
  }

  // Fallback to path-based detection
  const scriptDir = import.meta.dir;
  return scriptDir.includes("/.claude/plugins/") ||
         scriptDir.includes("/.config/claude-code/plugins/");
}

/**
 * Get plugin root directory (where scripts/templates/commands live)
 *
 * In plugin installations: Uses CLAUDE_PLUGIN_ROOT env var or path resolution
 * In development: <repo-root>/
 */
export function getPluginRoot(): string {
  // Use CLAUDE_PLUGIN_ROOT if available (preferred method)
  if (process.env.CLAUDE_PLUGIN_ROOT) {
    return process.env.CLAUDE_PLUGIN_ROOT;
  }

  const scriptDir = import.meta.dir;

  if (isPluginInstallation()) {
    // In plugin: scripts are in <plugin-root>/.speck/scripts/common/
    // Navigate up from .speck/scripts/common to plugin root
    return path.resolve(scriptDir, "../../..");
  } else {
    // In development: scripts are in .speck/scripts/common/
    // Navigate up to repo root
    return path.resolve(scriptDir, "../../..");
  }
}

/**
 * Get templates directory path (works in both dev and plugin contexts)
 *
 * Plugin installations: <plugin-root>/templates/
 * Development: <repo-root>/.speck/templates/
 */
export function getTemplatesDir(): string {
  const pluginRoot = getPluginRoot();
  if (isPluginInstallation()) {
    return path.join(pluginRoot, "templates");
  } else {
    return path.join(pluginRoot, ".speck/templates");
  }
}

/**
 * Get scripts directory path (works in both dev and plugin contexts)
 *
 * Both use the same structure: <root>/.speck/scripts/
 */
export function getScriptsDir(): string {
  const pluginRoot = getPluginRoot();
  return path.join(pluginRoot, ".speck/scripts");
}

/**
 * Get memory directory path (works in both dev and plugin contexts)
 *
 * Plugin installations: <plugin-root>/memory/
 * Development: <repo-root>/.speck/memory/
 */
export function getMemoryDir(): string {
  const pluginRoot = getPluginRoot();
  if (isPluginInstallation()) {
    return path.join(pluginRoot, "memory");
  } else {
    return path.join(pluginRoot, ".speck/memory");
  }
}

/**
 * Get repository root directory
 *
 * Attempts to use git first, falls back to script location for non-git repos.
 */
export async function getRepoRoot(): Promise<string> {
  try {
    const result = await $`git rev-parse --show-toplevel`.quiet();
    return result.text().trim();
  } catch {
    // Fall back to script location for non-git repos
    const scriptDir = import.meta.dir;
    // Navigate up from .speck/scripts/common to repo root
    return path.resolve(scriptDir, "../../..");
  }
}

// [SPECK-EXTENSION:START] Multi-repo detection
/**
 * Cache for detectSpeckRoot() to avoid repeated filesystem checks
 */
let cachedConfig: SpeckConfig | null = null;

/**
 * Clear the cached speck configuration
 * Useful when .speck/root symlink is modified
 */
export function clearSpeckCache(): void {
  cachedConfig = null;
}

/**
 * Detect speck root and operating mode
 *
 * Checks for .speck/root symlink to determine if running in multi-repo mode.
 * - Single-repo: No symlink, specs at repo root
 * - Multi-repo: Symlink present, specs at symlink target
 *
 * @returns SpeckConfig with mode, speckRoot, repoRoot, specsDir
 */
export async function detectSpeckRoot(): Promise<SpeckConfig> {
  // Return cached result if available
  if (cachedConfig) {
    return cachedConfig;
  }

  const repoRoot = await getRepoRoot();
  const symlinkPath = path.join(repoRoot, '.speck', 'root');

  try {
    const stats = await fs.lstat(symlinkPath);

    if (!stats.isSymbolicLink()) {
      console.warn(
        'WARNING: .speck/root exists but is not a symlink\n' +
        'Expected: symlink to speck root directory\n' +
        'Found: regular file/directory\n' +
        'Falling back to single-repo mode.\n' +
        'To enable multi-repo: mv .speck/root .speck/root.backup && /speck.link <path>'
      );
      const config: SpeckConfig = {
        mode: 'single-repo',
        speckRoot: repoRoot,
        repoRoot,
        specsDir: path.join(repoRoot, 'specs')
      };
      cachedConfig = config;
      return config;
    }

    // Resolve symlink to absolute path
    const speckRoot = await fs.realpath(symlinkPath);

    // Verify target exists
    await fs.access(speckRoot);

    const config: SpeckConfig = {
      mode: 'multi-repo',
      speckRoot,
      repoRoot,
      specsDir: path.join(speckRoot, 'specs')
    };
    cachedConfig = config;
    return config;

  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // Symlink does not exist - single-repo mode
      const config: SpeckConfig = {
        mode: 'single-repo',
        speckRoot: repoRoot,
        repoRoot,
        specsDir: path.join(repoRoot, 'specs')
      };
      cachedConfig = config;
      return config;
    }

    if (error.code === 'ELOOP') {
      throw new Error(
        'Multi-repo configuration broken: .speck/root contains circular reference\n' +
        'Fix: rm .speck/root && /speck.link <valid-path>'
      );
    }

    // Broken symlink (target does not exist)
    const target = await fs.readlink(symlinkPath).catch(() => 'unknown');
    throw new Error(
      `Multi-repo configuration broken: .speck/root → ${target} (does not exist)\n` +
      'Fix:\n' +
      '  1. Remove broken symlink: rm .speck/root\n' +
      '  2. Link to correct location: /speck.link <path-to-speck-root>'
    );
  }
}
// [SPECK-EXTENSION:END]

/**
 * Get current branch name
 *
 * Priority:
 * 1. SPECIFY_FEATURE environment variable
 * 2. Git branch (if git repo)
 * 3. Latest feature directory in specs/
 * 4. "main" as final fallback
 */
export async function getCurrentBranch(repoRoot: string): Promise<string> {
  // Check environment variable first
  if (process.env.SPECIFY_FEATURE) {
    return process.env.SPECIFY_FEATURE;
  }

  // Try git
  try {
    const result = await $`git rev-parse --abbrev-ref HEAD`.quiet();
    return result.text().trim();
  } catch {
    // For non-git repos, find latest feature directory
    const specsDir = path.join(repoRoot, "specs");

    if (existsSync(specsDir)) {
      let latestFeature = "";
      let highest = 0;

      const dirs = readdirSync(specsDir, { withFileTypes: true });
      for (const dir of dirs) {
        if (dir.isDirectory()) {
          const match = dir.name.match(/^(\d{3})-/);
          if (match) {
            const number = parseInt(match[1], 10);
            if (number > highest) {
              highest = number;
              latestFeature = dir.name;
            }
          }
        }
      }

      if (latestFeature) {
        return latestFeature;
      }
    }

    return "main";
  }
}

/**
 * Check if we have a git repository
 */
export async function hasGit(): Promise<boolean> {
  try {
    await $`git rev-parse --show-toplevel`.quiet();
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate branch name using git check-ref-format (T016)
 *
 * @param branchName - Branch name to validate
 * @returns true if valid git ref name, false otherwise
 */
export async function validateBranchName(branchName: string): Promise<boolean> {
  try {
    const result = await $`git check-ref-format --branch ${branchName}`.quiet();
    return result.exitCode === 0;
  } catch {
    return false;
  }
}

/**
 * Check if on a valid feature branch
 *
 * @param branch - Branch name to check
 * @param hasGitRepo - Whether we have a git repo
 * @returns true if valid, false otherwise (prints error to stderr)
 */
export async function checkFeatureBranch(branch: string, hasGitRepo: boolean, repoRoot: string): Promise<boolean> {
  // For non-git repos, we can't enforce branch naming
  if (!hasGitRepo) {
    console.error("[specify] Warning: Git repository not detected; skipped branch validation");
    return true;
  }

  // [STACKED-PR:START] T015 - Skip NNN-pattern enforcement if branches.json exists
  const branchesFile = path.join(repoRoot, ".speck", "branches.json");
  if (existsSync(branchesFile)) {
    try {
      const content = await fs.readFile(branchesFile, "utf-8");
      const mapping = JSON.parse(content);

      // Check if current branch is in branches.json
      if (mapping.branches && Array.isArray(mapping.branches)) {
        const branchExists = mapping.branches.some((b: any) => b.name === branch);
        if (branchExists) {
          // Branch is in stacked mode - no NNN-pattern required
          return true;
        }
      }
    } catch {
      // If branches.json is malformed, fall through to traditional validation
    }
  }
  // [STACKED-PR:END]

  // Check if branch matches pattern: ###-feature-name
  if (!/^\d{3}-/.test(branch)) {
    console.error(`ERROR: Not on a feature branch. Current branch: ${branch}`);
    console.error("Feature branches should be named like: 001-feature-name");
    return false;
  }

  return true;
}

/**
 * Get feature directory for a branch name
 *
 * Simple helper that joins repo root and specs directory
 */
export function getFeatureDir(repoRoot: string, branchName: string): string {
  return path.join(repoRoot, "specs", branchName);
}

/**
 * Find feature directory by numeric prefix
 *
 * Allows multiple branches to work on the same spec (e.g., 004-fix-bug, 004-add-feature)
 * Both would map to the first directory found starting with "004-"
 *
 * [SPECK-EXTENSION] Updated to accept specsDir parameter for multi-repo support
 * [STACKED-PR] T014 - Check branches.json first before falling back to numeric prefix
 */
export async function findFeatureDirByPrefix(specsDir: string, branchName: string, repoRoot: string): Promise<string> {
  // [STACKED-PR:START] T014 - Check branches.json first
  const branchesFile = path.join(repoRoot, ".speck", "branches.json");
  if (existsSync(branchesFile)) {
    try {
      const content = await fs.readFile(branchesFile, "utf-8");
      const mapping = JSON.parse(content);

      // Find branch in mapping
      if (mapping.branches && Array.isArray(mapping.branches)) {
        const branch = mapping.branches.find((b: any) => b.name === branchName);
        if (branch && branch.specId) {
          // Found in branches.json - use specId
          return path.join(specsDir, branch.specId);
        }
      }
    } catch {
      // If branches.json is malformed, fall through to traditional lookup
    }
  }
  // [STACKED-PR:END]

  // Extract numeric prefix from branch (e.g., "004" from "004-whatever")
  const match = branchName.match(/^(\d{3})-/);
  if (!match) {
    // If branch doesn't have numeric prefix, fall back to exact match
    return path.join(specsDir, branchName);
  }

  const prefix = match[1];

  // Search for directories starting with this prefix
  const matches: string[] = [];
  if (existsSync(specsDir)) {
    const dirs = readdirSync(specsDir, { withFileTypes: true });
    for (const dir of dirs) {
      if (dir.isDirectory() && dir.name.startsWith(`${prefix}-`)) {
        matches.push(dir.name);
      }
    }
  }

  // Handle results
  if (matches.length === 0) {
    // No match found - return the branch name path (will fail later with clear error)
    return path.join(specsDir, branchName);
  } else if (matches.length === 1) {
    // Exactly one match - perfect!
    return path.join(specsDir, matches[0]);
  } else {
    // Multiple matches - this shouldn't happen with proper naming convention
    console.error(`ERROR: Multiple spec directories found with prefix '${prefix}': ${matches.join(", ")}`);
    console.error("Please ensure only one spec directory exists per numeric prefix.");
    return path.join(specsDir, branchName);
  }
}

/**
 * Get all feature-related paths
 *
 * This is the main function used by other scripts to get their working environment.
 *
 * [SPECK-EXTENSION] Updated to use detectSpeckRoot() for multi-repo support
 */
export async function getFeaturePaths(): Promise<FeaturePaths> {
  // [SPECK-EXTENSION:START] Multi-repo path resolution
  const config = await detectSpeckRoot();
  const currentBranch = await getCurrentBranch(config.repoRoot);
  const hasGitRepo = await hasGit();

  // Use prefix-based lookup to support multiple branches per spec
  const featureDir = await findFeatureDirByPrefix(config.specsDir, currentBranch, config.repoRoot);
  const featureName = path.basename(featureDir);

  return {
    MODE: config.mode,
    SPECK_ROOT: config.speckRoot,
    SPECS_DIR: config.specsDir,
    REPO_ROOT: config.repoRoot,
    CURRENT_BRANCH: currentBranch,
    HAS_GIT: hasGitRepo ? "true" : "false",
    FEATURE_DIR: featureDir,
    FEATURE_SPEC: path.join(featureDir, "spec.md"),  // Uses specsDir (shared in multi-repo)
    IMPL_PLAN: path.join(config.repoRoot, "specs", featureName, "plan.md"),  // Always local
    TASKS: path.join(config.repoRoot, "specs", featureName, "tasks.md"),  // Always local
    RESEARCH: path.join(featureDir, "research.md"),  // Uses specsDir (shared in multi-repo)
    DATA_MODEL: path.join(featureDir, "data-model.md"),  // Uses specsDir (shared in multi-repo)
    QUICKSTART: path.join(featureDir, "quickstart.md"),  // Uses specsDir (shared in multi-repo)
    CONTRACTS_DIR: path.join(featureDir, "contracts"),  // Uses specsDir (shared in multi-repo)
  };
  // [SPECK-EXTENSION:END]
}

/**
 * Read workflow mode from constitution.md
 *
 * Searches for: **Default Workflow Mode**: stacked-pr | single-branch
 *
 * @returns "stacked-pr" | "single-branch" | null (if not found)
 */
export async function getDefaultWorkflowMode(): Promise<"stacked-pr" | "single-branch" | null> {
  try {
    const memoryDir = getMemoryDir();
    const constitutionPath = path.join(memoryDir, "constitution.md");

    if (!existsSync(constitutionPath)) {
      return null;
    }

    const content = await fs.readFile(constitutionPath, "utf-8");

    // Search for: **Default Workflow Mode**: stacked-pr
    // or: **Default Workflow Mode**: single-branch
    const match = content.match(/^\*\*Default Workflow Mode\*\*:\s*(stacked-pr|single-branch)\s*$/m);

    if (match && (match[1] === "stacked-pr" || match[1] === "single-branch")) {
      return match[1];
    }

    return null;
  } catch (error) {
    // If file read fails or parsing errors, return null (graceful degradation)
    return null;
  }
}

/**
 * Check if a file exists and print status
 * Used for human-readable output
 */
export function checkFile(filePath: string, label: string): string {
  return existsSync(filePath) ? `  ✓ ${label}` : `  ✗ ${label}`;
}

/**
 * Check if a directory exists and has files
 * Used for human-readable output
 */
export function checkDir(dirPath: string, label: string): string {
  if (!existsSync(dirPath)) {
    return `  ✗ ${label}`;
  }

  try {
    const files = readdirSync(dirPath);
    return files.length > 0 ? `  ✓ ${label}` : `  ✗ ${label}`;
  } catch {
    return `  ✗ ${label}`;
  }
}
