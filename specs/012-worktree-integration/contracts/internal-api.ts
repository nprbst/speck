// @ts-nocheck - Contract file (specification only, not production code)
/**
 * Internal API Contracts for Worktree Integration
 *
 * This file defines TypeScript function signatures for internal APIs that implement
 * worktree operations. These are NOT exposed to CLI users, but are used internally
 * by Speck commands and scripts.
 *
 * Implementation location: TBD (likely src/worktree/ or .speck/scripts/worktree/)
 */

import type {
  SpeckConfig,
  WorktreeConfig,
  FileRule,
  PackageManager,
  IDEEditor,
  WorktreeMetadata,
  WorktreeState,
  IDEInfo,
} from "./config-schema";

// ============================================================================
// Configuration Management
// ============================================================================

/**
 * Load Speck configuration from disk with validation
 *
 * @param repoPath - Absolute path to repository root
 * @returns Validated SpeckConfig with defaults applied
 * @throws Error if config exists but is invalid
 */
export async function loadConfig(repoPath: string): Promise<SpeckConfig>;

/**
 * Save Speck configuration to disk with validation
 *
 * @param repoPath - Absolute path to repository root
 * @param config - SpeckConfig to save
 * @throws Error if config is invalid or write fails
 */
export async function saveConfig(
  repoPath: string,
  config: SpeckConfig
): Promise<void>;

/**
 * Migrate configuration from older versions to current schema
 *
 * @param repoPath - Absolute path to repository root
 * @returns true if migration was performed, false if already current
 * @throws Error if migration fails
 */
export async function migrateConfig(repoPath: string): Promise<boolean>;

/**
 * Interactive configuration setup wizard
 *
 * @param repoPath - Absolute path to repository root
 * @param useDefaults - If true, skip prompts and use defaults
 * @param minimal - If true, create minimal config (only enable worktrees)
 * @returns Created SpeckConfig
 * @throws Error if user cancels or setup fails
 */
export async function interactiveSetup(
  repoPath: string,
  useDefaults?: boolean,
  minimal?: boolean
): Promise<SpeckConfig>;

// ============================================================================
// Git Worktree Operations
// ============================================================================

/**
 * Options for worktree creation
 */
export interface CreateWorktreeOptions {
  repoPath: string;           // Absolute path to main repository
  branchName: string;         // Branch name (without prefix)
  branchPrefix?: string;      // Optional prefix (e.g., "specs/")
  worktreePath?: string;      // Custom worktree path (overrides config)
  reuseExisting?: boolean;    // Reuse existing directory if present
  force?: boolean;            // Force creation, removing existing if needed
  skipDeps?: boolean;         // Skip dependency installation
  skipIDE?: boolean;          // Skip IDE launch
  onProgress?: (message: string, percent: number) => void; // Progress callback
}

/**
 * Result of worktree creation
 */
export interface CreateWorktreeResult {
  success: boolean;
  worktreePath: string;       // Absolute path to created worktree
  metadata: WorktreeMetadata; // Runtime metadata
  errors?: string[];          // Non-fatal errors (e.g., IDE launch failed)
}

/**
 * Create a Git worktree for a branch
 *
 * This is the main worktree creation function that orchestrates:
 * 1. Git worktree add
 * 2. File copy/symlink operations
 * 3. Dependency installation (if enabled)
 * 4. IDE launch (if enabled)
 *
 * @param options - Worktree creation options
 * @returns Result of creation operation
 * @throws Error if critical step fails (git add, file operations, deps)
 */
export async function createWorktree(
  options: CreateWorktreeOptions
): Promise<CreateWorktreeResult>;

/**
 * Options for worktree removal
 */
export interface RemoveWorktreeOptions {
  repoPath: string;           // Absolute path to main repository
  branchName: string;         // Branch name
  force?: boolean;            // Force removal even with uncommitted changes
  deleteBranch?: boolean;     // Also delete the branch
}

/**
 * Result of worktree removal
 */
export interface RemoveWorktreeResult {
  success: boolean;
  worktreePath: string;       // Path that was removed
  branchDeleted?: boolean;    // Whether branch was also deleted
}

/**
 * Remove a Git worktree
 *
 * @param options - Worktree removal options
 * @returns Result of removal operation
 * @throws Error if worktree doesn't exist or removal fails
 */
export async function removeWorktree(
  options: RemoveWorktreeOptions
): Promise<RemoveWorktreeResult>;

/**
 * Worktree information from git worktree list
 */
export interface GitWorktreeInfo {
  path: string;               // Absolute path
  branch: string;             // Branch name (or "detached HEAD")
  commit: string;             // Short commit hash
  prunable?: string;          // Reason if prunable
}

/**
 * List all worktrees in the repository
 *
 * @param repoPath - Absolute path to repository root
 * @returns Array of worktree information
 */
export async function listWorktrees(
  repoPath: string
): Promise<GitWorktreeInfo[]>;

/**
 * Prune result
 */
export interface PruneWorktreesResult {
  prunedCount: number;
  prunedPaths: string[];
}

/**
 * Cleanup stale worktree references
 *
 * Runs `git worktree prune` to remove administrative files for
 * worktrees that were manually deleted.
 *
 * @param repoPath - Absolute path to repository root
 * @param dryRun - If true, show what would be pruned without removing
 * @returns Prune operation result
 */
export async function pruneWorktrees(
  repoPath: string,
  dryRun?: boolean
): Promise<PruneWorktreesResult>;

/**
 * Check if a worktree exists for a branch
 *
 * @param repoPath - Absolute path to repository root
 * @param branchName - Branch name to check
 * @returns Absolute path if worktree exists, null otherwise
 */
export async function getWorktreePath(
  repoPath: string,
  branchName: string
): Promise<string | null>;

/**
 * Check if a directory is a worktree
 *
 * @param path - Absolute path to directory
 * @returns true if directory is a worktree
 */
export async function isWorktree(path: string): Promise<boolean>;

// ============================================================================
// File Operations
// ============================================================================

/**
 * Options for file operations
 */
export interface ApplyFileRulesOptions {
  sourcePath: string;         // Absolute path to source (main repo)
  destPath: string;           // Absolute path to destination (worktree)
  rules: FileRule[];          // File rules to apply
  includeUntracked?: boolean; // Include untracked files in copy operations
  onProgress?: (message: string) => void; // Progress callback
}

/**
 * Result of file operations
 */
export interface ApplyFileRulesResult {
  copiedCount: number;        // Number of files copied
  copiedPaths: string[];      // Relative paths of copied files
  symlinkedCount: number;     // Number of directories symlinked
  symlinkedPaths: string[];   // Relative paths of symlinked directories
  errors: Array<{             // Non-fatal errors
    path: string;
    error: string;
  }>;
}

/**
 * Apply file copy/symlink rules to worktree
 *
 * This function:
 * 1. Matches files using glob patterns
 * 2. Copies files matching { action: "copy" } rules
 * 3. Symlinks directories matching { action: "symlink" } rules
 * 4. Skips files matching { action: "ignore" } rules
 * 5. Includes untracked files if includeUntracked=true
 *
 * @param options - File operation options
 * @returns Result of file operations
 */
export async function applyFileRules(
  options: ApplyFileRulesOptions
): Promise<ApplyFileRulesResult>;

/**
 * Match files against glob patterns
 *
 * @param basePath - Absolute path to search in
 * @param patterns - Array of glob patterns
 * @returns Array of relative paths matching patterns
 */
export async function matchFiles(
  basePath: string,
  patterns: string[]
): Promise<string[]>;

/**
 * Get untracked files from git
 *
 * @param repoPath - Absolute path to repository
 * @returns Array of relative paths to untracked files
 */
export async function getUntrackedFiles(repoPath: string): Promise<string[]>;

/**
 * Copy files from source to destination
 *
 * @param sourcePath - Absolute path to source directory
 * @param destPath - Absolute path to destination directory
 * @param files - Array of relative file paths to copy
 * @param concurrency - Number of concurrent copy operations
 */
export async function copyFiles(
  sourcePath: string,
  destPath: string,
  files: string[],
  concurrency?: number
): Promise<void>;

/**
 * Create symlinks for directories
 *
 * @param sourcePath - Absolute path to source directory
 * @param destPath - Absolute path to destination directory
 * @param directories - Array of relative directory paths to symlink
 */
export async function symlinkDirectories(
  sourcePath: string,
  destPath: string,
  directories: string[]
): Promise<void>;

// ============================================================================
// Dependency Installation
// ============================================================================

/**
 * Detect package manager from lockfiles and package.json
 *
 * Priority order: bun.lockb → pnpm-lock.yaml → yarn.lock →
 *                 package-lock.json → package.json#packageManager → npm
 *
 * @param projectPath - Absolute path to project directory
 * @returns Detected package manager
 */
export async function detectPackageManager(
  projectPath: string
): Promise<PackageManager>;

/**
 * Options for dependency installation
 */
export interface InstallDependenciesOptions {
  worktreePath: string;       // Absolute path to worktree
  packageManager?: PackageManager; // Override detected package manager
  onProgress?: (line: string) => void; // Progress callback (stdout/stderr)
}

/**
 * Result of dependency installation
 */
export interface InstallDependenciesResult {
  success: boolean;
  packageManager: PackageManager; // Package manager that was used
  duration: number;           // Installation time in milliseconds
  error?: string;             // Error message if failed
}

/**
 * Install dependencies in worktree
 *
 * This function:
 * 1. Detects package manager (or uses provided)
 * 2. Runs appropriate install command (npm ci, yarn install --frozen-lockfile, etc.)
 * 3. Streams output to progress callback
 * 4. Returns result with success status
 *
 * @param options - Installation options
 * @returns Result of installation
 */
export async function installDependencies(
  options: InstallDependenciesOptions
): Promise<InstallDependenciesResult>;

/**
 * Get install command for package manager
 *
 * @param packageManager - Package manager to use
 * @returns Array of command and args (e.g., ["npm", "ci"])
 */
export function getInstallCommand(packageManager: PackageManager): string[];

/**
 * Interpret installation error and provide actionable message
 *
 * @param error - Error output from package manager
 * @param packageManager - Package manager that was used
 * @returns User-friendly error message with suggestions
 */
export function interpretInstallError(
  error: string,
  packageManager: PackageManager
): string;

// ============================================================================
// IDE Launch
// ============================================================================

/**
 * Detect available IDEs on the system
 *
 * Checks for CLI commands in PATH:
 * - code (VSCode)
 * - cursor (Cursor)
 * - webstorm (WebStorm)
 * - idea (IntelliJ IDEA)
 * - pycharm (PyCharm)
 *
 * @returns Array of available IDEs with metadata
 */
export async function detectAvailableIDEs(): Promise<IDEInfo[]>;

/**
 * Options for IDE launch
 */
export interface LaunchIDEOptions {
  worktreePath: string;       // Absolute path to worktree
  editor: IDEEditor;          // Which IDE to launch
  newWindow?: boolean;        // Open in new window (default: true)
}

/**
 * Result of IDE launch
 */
export interface LaunchIDEResult {
  success: boolean;
  editor: IDEEditor;          // Editor that was launched
  command: string;            // Command that was executed
  error?: string;             // Error message if failed
}

/**
 * Launch IDE with worktree as workspace
 *
 * This function:
 * 1. Checks if IDE command is available
 * 2. Constructs appropriate command with args
 * 3. Spawns IDE process
 * 4. Returns immediately (doesn't wait for IDE to close)
 *
 * @param options - IDE launch options
 * @returns Result of launch operation
 */
export async function launchIDE(
  options: LaunchIDEOptions
): Promise<LaunchIDEResult>;

/**
 * Get IDE command and args for launching
 *
 * @param editor - IDE to launch
 * @param worktreePath - Absolute path to worktree
 * @param newWindow - Open in new window
 * @returns Command and args array (e.g., ["code", "-n", "/path/to/worktree"])
 */
export function getIDECommand(
  editor: IDEEditor,
  worktreePath: string,
  newWindow: boolean
): string[];

/**
 * Check if an IDE command is available in PATH
 *
 * @param command - Command to check (e.g., "code", "cursor")
 * @returns true if command is available
 */
export async function isIDEAvailable(command: string): Promise<boolean>;

// ============================================================================
// Validation and Error Checking
// ============================================================================

/**
 * Check if system has sufficient disk space for worktree
 *
 * @param path - Path where worktree will be created
 * @param requiredMB - Required space in megabytes
 * @returns true if sufficient space available
 */
export async function hasSufficientDiskSpace(
  path: string,
  requiredMB: number
): Promise<boolean>;

/**
 * Check if Git version supports worktrees
 *
 * @returns true if Git 2.5+ is available
 */
export async function hasWorktreeSupport(): Promise<boolean>;

/**
 * Validate branch name format
 *
 * @param branchName - Branch name to validate
 * @returns true if valid Git branch name
 */
export function isValidBranchName(branchName: string): boolean;

/**
 * Check if branch exists in repository
 *
 * @param repoPath - Absolute path to repository
 * @param branchName - Branch name to check
 * @returns true if branch exists
 */
export async function branchExists(
  repoPath: string,
  branchName: string
): Promise<boolean>;

/**
 * Check if worktree directory exists and is empty
 *
 * @param path - Absolute path to check
 * @returns "empty" | "exists" | "not_found"
 */
export async function checkWorktreePath(
  path: string
): Promise<"empty" | "exists" | "not_found">;

/**
 * Construct full branch name with optional prefix
 *
 * @param branchName - Base branch name (e.g., "002-user-auth")
 * @param prefix - Optional prefix (e.g., "specs/")
 * @returns Full branch name (e.g., "specs/002-user-auth")
 */
export function constructBranchName(
  branchName: string,
  prefix?: string
): string;

/**
 * Construct worktree path from config and branch name
 *
 * @param repoPath - Absolute path to repository
 * @param config - Worktree configuration
 * @param branchName - Branch name (without prefix)
 * @returns Absolute path to worktree location
 */
export function constructWorktreePath(
  repoPath: string,
  config: WorktreeConfig,
  branchName: string
): string;

// ============================================================================
// Branch Management Integration
// ============================================================================

/**
 * Branch creation options with worktree support
 */
export interface CreateBranchWithWorktreeOptions {
  repoPath: string;
  specNumber: string;         // e.g., "002"
  shortName: string;          // e.g., "user-auth"
  createWorktree?: boolean;   // Override config setting
  promptForApproval?: boolean; // Prompt user for branch name approval (FR-016)
}

/**
 * Create a spec branch with optional worktree
 *
 * This is the high-level function used by /speck:specify and /speck:branch.
 * It handles:
 * 1. Branch name construction with prefix
 * 2. User approval prompt (if enabled)
 * 3. Worktree creation (if enabled)
 * 4. All worktree setup steps (files, deps, IDE)
 *
 * @param options - Branch creation options
 * @returns Result with branch name and optional worktree info
 */
export async function createBranchWithWorktree(
  options: CreateBranchWithWorktreeOptions
): Promise<{
  branchName: string;
  worktree?: CreateWorktreeResult;
}>;

// ============================================================================
// Error Classes
// ============================================================================

/**
 * Base error class for worktree operations
 */
export class WorktreeError extends Error {
  constructor(message: string, public code?: string, public context?: unknown) {
    super(message);
    this.name = "WorktreeError";
  }
}

/**
 * Error when Git worktree operation fails
 */
export class GitWorktreeError extends WorktreeError {
  constructor(message: string, public gitOutput?: string) {
    super(message, "GIT_WORKTREE_ERROR");
    this.name = "GitWorktreeError";
  }
}

/**
 * Error when file operations fail
 */
export class FileOperationError extends WorktreeError {
  constructor(message: string, public path?: string) {
    super(message, "FILE_OPERATION_ERROR", { path });
    this.name = "FileOperationError";
  }
}

/**
 * Error when dependency installation fails
 */
export class DependencyInstallError extends WorktreeError {
  constructor(
    message: string,
    public packageManager: PackageManager,
    public installOutput?: string
  ) {
    super(message, "DEPENDENCY_INSTALL_ERROR", { packageManager });
    this.name = "DependencyInstallError";
  }
}

/**
 * Error when IDE launch fails (non-fatal)
 */
export class IDELaunchError extends WorktreeError {
  constructor(message: string, public editor: IDEEditor) {
    super(message, "IDE_LAUNCH_ERROR", { editor });
    this.name = "IDELaunchError";
  }
}

/**
 * Error when disk space is insufficient
 */
export class DiskSpaceError extends WorktreeError {
  constructor(
    message: string,
    public required: number,
    public available: number
  ) {
    super(message, "DISK_SPACE_ERROR", { required, available });
    this.name = "DiskSpaceError";
  }
}

/**
 * Error when configuration is invalid
 */
export class ConfigValidationError extends WorktreeError {
  constructor(message: string, public validationErrors?: string[]) {
    super(message, "CONFIG_VALIDATION_ERROR", { validationErrors });
    this.name = "ConfigValidationError";
  }
}
