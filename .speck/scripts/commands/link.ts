/**
 * Link Command Handler
 *
 * Links the current directory to a speck root for multi-repo or monorepo setups:
 * 1. Creates .speck/ directory in CWD if needed
 * 2. Creates symlink .speck/root → speck root path
 * 3. Creates reverse symlink at speck root
 * 4. Updates linked-repos.md at speck root
 *
 * Works identically for:
 * - Multi-repo: separate git repos linked to a shared speck root
 * - Monorepo: packages within a single git repo linked to the monorepo root
 *
 * Feature: 015-scope-simplification
 *
 * Usage:
 *   speck link <path> [--json]
 *
 * Options:
 *   --json   Output in JSON format
 */

import {
  existsSync,
  mkdirSync,
  lstatSync,
  readlinkSync,
  unlinkSync,
  symlinkSync,
  readFileSync,
  writeFileSync,
  appendFileSync,
} from "node:fs";
import { join, resolve, relative, basename, isAbsolute } from "node:path";
import { parseArgs } from "util";

// =============================================================================
// Types
// =============================================================================

interface LinkOptions {
  json: boolean;
}

interface LinkResult {
  success: boolean;
  message: string;
  symlinkPath?: string;
  targetPath?: string;
  repoName?: string;
  linkType?: "monorepo" | "multi-repo";
  reverseSymlinkPath?: string;
  linkedReposUpdated?: boolean;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get the git repository root for a given path
 */
function getGitRoot(cwd: string): string | null {
  try {
    const result = Bun.spawnSync(["git", "rev-parse", "--show-toplevel"], {
      cwd,
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
 * Determine if the current directory and target are in the same git repo
 * Returns "monorepo" if same git root, "multi-repo" if different git roots
 */
function detectLinkType(currentPath: string, targetPath: string): "monorepo" | "multi-repo" {
  const currentGitRoot = getGitRoot(currentPath);
  const targetGitRoot = getGitRoot(targetPath);

  // If either isn't in a git repo, treat as multi-repo
  if (!currentGitRoot || !targetGitRoot) {
    return "multi-repo";
  }

  // Compare git roots (normalize paths for comparison)
  return resolve(currentGitRoot) === resolve(targetGitRoot) ? "monorepo" : "multi-repo";
}

/**
 * Get the git remote URL for origin
 */
function getGitRemoteUrl(): string | null {
  try {
    const result = Bun.spawnSync(["git", "remote", "get-url", "origin"], {
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
 * Get repository name from git remote URL or directory name
 */
function getRepoName(): string {
  const remoteUrl = getGitRemoteUrl();
  if (remoteUrl) {
    // Extract repo name from URL like:
    // https://github.com/org/repo.git -> repo
    // git@github.com:org/repo.git -> repo
    const match = remoteUrl.match(/\/([^/]+?)(?:\.git)?$/) || remoteUrl.match(/:([^/]+?)(?:\.git)?$/);
    if (match) {
      return match[1];
    }
  }
  // Fall back to current directory name
  return basename(process.cwd());
}

/**
 * Get git user name
 */
function getGitUserName(): string {
  try {
    const result = Bun.spawnSync(["git", "config", "user.name"], {
      cwd: process.cwd(),
    });
    if (result.exitCode === 0) {
      return result.stdout.toString().trim();
    }
    return "Unknown";
  } catch {
    return "Unknown";
  }
}

/**
 * Get today's date in YYYY-MM-DD format
 */
function getTodayDate(): string {
  const now = new Date();
  return now.toISOString().split("T")[0];
}

/**
 * Adjust relative path for .speck/ directory depth
 * If path is relative, prepend ../ since symlink lives at .speck/root
 */
function adjustPathForSpeckDepth(inputPath: string): string {
  if (isAbsolute(inputPath)) {
    return inputPath;
  }
  // Prepend ../ to account for .speck/ directory
  return join("..", inputPath);
}

/**
 * Check if a symlink exists and points to expected target
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
 * Verify a symlink works by checking if target exists
 */
function verifySymlinkWorks(symlinkPath: string): boolean {
  try {
    // existsSync follows symlinks, so it checks if target exists
    return existsSync(symlinkPath);
  } catch {
    return false;
  }
}

/**
 * Create or update linked-repos.md at speck root
 */
function updateLinkedReposFile(
  speckRootPath: string,
  repoName: string,
  remoteUrl: string | null,
  relativePath: string,
  userName: string,
  todayDate: string,
  linkType: "monorepo" | "multi-repo"
): boolean {
  const linkedReposPath = join(speckRootPath, ".speck", "linked-repos.md");

  // Format link type for display
  const linkTypeLabel = linkType === "monorepo" ? "monorepo package" : "multi-repo child";

  // Entry to add
  const entry = `
### ${repoName}
- **Type**: ${linkTypeLabel}
- **Repository**: \`${remoteUrl || "local"}\`
- **Local Path**: \`${relativePath}\`
- **Linked**: ${todayDate}
- **Contact**: ${userName}
- **Active Features**: None yet
- **Notes**: ${linkType === "monorepo" ? "Package within same git repository" : "Separate git repository"}
`;

  try {
    if (!existsSync(linkedReposPath)) {
      // Create new file with header
      const content = `# Linked Repositories

<!-- Active links are listed below -->
${entry}
## Link Management

To link a new repository:
\`\`\`bash
cd /path/to/child-repo
speck link /path/to/speck-root
\`\`\`
`;
      writeFileSync(linkedReposPath, content);
    } else {
      // Append entry to existing file
      // Read file to check if repo already linked
      const content = readFileSync(linkedReposPath, "utf-8");
      if (content.includes(`### ${repoName}`)) {
        // Already linked, don't duplicate
        return true;
      }
      // Find position before "## Link Management" or append at end
      const linkManagementPos = content.indexOf("## Link Management");
      if (linkManagementPos !== -1) {
        const before = content.slice(0, linkManagementPos);
        const after = content.slice(linkManagementPos);
        writeFileSync(linkedReposPath, before + entry + "\n" + after);
      } else {
        appendFileSync(linkedReposPath, entry);
      }
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Create reverse symlink at speck root pointing back to this repo
 */
function createReverseSymlink(speckRootPath: string, repoName: string, currentRepoPath: string): string | null {
  const reposDir = join(speckRootPath, ".speck", "repos");
  const reverseSymlinkPath = join(reposDir, repoName);

  try {
    // Create repos directory if needed
    if (!existsSync(reposDir)) {
      mkdirSync(reposDir, { recursive: true });
    }

    // Calculate relative path from repos dir to current repo
    const relativePath = relative(reposDir, currentRepoPath);

    // Remove existing symlink if present
    if (existsSync(reverseSymlinkPath)) {
      if (lstatSync(reverseSymlinkPath).isSymbolicLink()) {
        unlinkSync(reverseSymlinkPath);
      } else {
        // Not a symlink, don't overwrite
        return null;
      }
    }

    // Create symlink
    symlinkSync(relativePath, reverseSymlinkPath);
    return reverseSymlinkPath;
  } catch {
    return null;
  }
}

// =============================================================================
// Main Implementation
// =============================================================================

/**
 * Execute the link command
 */
function runLink(targetPath: string, options: LinkOptions): LinkResult {
  // Use current working directory as the location for .speck/
  // This allows both multi-repo (separate git repos) and monorepo (packages in same git repo)
  // to work identically
  const cwd = process.cwd();

  // Step 1: Verify target path exists
  if (!existsSync(targetPath)) {
    return {
      success: false,
      message: `Error: Target path does not exist: ${targetPath}`,
    };
  }

  // Step 2: Verify target has .speck/ directory (is a valid speck root)
  const targetSpeckDir = join(targetPath, ".speck");
  if (!existsSync(targetSpeckDir)) {
    return {
      success: false,
      message: `Error: Target is not a valid speck root (missing .speck/ directory): ${targetPath}
Run 'speck init' in the target directory first.`,
    };
  }

  // Step 3: Adjust path for .speck/ depth
  const adjustedPath = adjustPathForSpeckDepth(targetPath);

  // Step 4: Create .speck/ directory in CWD if it doesn't exist
  const speckDir = join(cwd, ".speck");
  if (!existsSync(speckDir)) {
    mkdirSync(speckDir, { recursive: true });
  }

  // Step 5: Create symlink
  const symlinkPath = join(speckDir, "root");

  // Check if symlink already exists and points to correct target
  if (existsSync(symlinkPath)) {
    if (lstatSync(symlinkPath).isSymbolicLink()) {
      const currentTarget = readlinkSync(symlinkPath);
      if (currentTarget === adjustedPath) {
        // Already linked correctly
        return {
          success: true,
          message: `Already linked to ${targetPath}`,
          symlinkPath,
          targetPath: adjustedPath,
        };
      }
      // Remove existing symlink to update
      unlinkSync(symlinkPath);
    } else {
      return {
        success: false,
        message: `Error: .speck/root exists but is not a symlink. Remove it manually to proceed.`,
      };
    }
  }

  try {
    symlinkSync(adjustedPath, symlinkPath);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Error creating symlink: ${errMsg}`,
    };
  }

  // Step 6: Verify symlink works
  if (!verifySymlinkWorks(symlinkPath)) {
    // Clean up broken symlink
    unlinkSync(symlinkPath);
    return {
      success: false,
      message: `Error: Symlink created but target is not accessible. Check the path: ${targetPath}`,
    };
  }

  // Step 7: Get repository/directory info
  const repoName = getRepoName();
  const remoteUrl = getGitRemoteUrl();
  const userName = getGitUserName();
  const todayDate = getTodayDate();

  // Step 7a: Detect if this is a monorepo package or multi-repo child
  const resolvedTargetPath = resolve(cwd, adjustedPath.replace(/^\.\.\//, ""));
  const linkType = detectLinkType(cwd, resolvedTargetPath);

  // Calculate relative path from speck root to this directory
  const relativeFromRoot = relative(resolvedTargetPath, cwd);

  // Step 8: Create reverse symlink at speck root
  const reverseSymlinkPath = createReverseSymlink(resolvedTargetPath, repoName, cwd);

  // Step 9: Update linked-repos.md
  const linkedReposUpdated = updateLinkedReposFile(
    resolvedTargetPath,
    repoName,
    remoteUrl,
    relativeFromRoot,
    userName,
    todayDate,
    linkType
  );

  // Build success message
  const linkTypeLabel = linkType === "monorepo" ? "monorepo package" : "multi-repo child";
  const messages: string[] = [];
  messages.push(`✓ Linked as ${linkTypeLabel} to speck root: ${targetPath}`);
  messages.push(`  Symlink: .speck/root → ${adjustedPath}`);
  if (reverseSymlinkPath) {
    messages.push(`  Reverse symlink created at speck root`);
  }
  if (linkedReposUpdated) {
    messages.push(`  Updated linked-repos.md`);
  }

  return {
    success: true,
    message: messages.join("\n"),
    symlinkPath,
    targetPath: adjustedPath,
    repoName,
    linkType,
    reverseSymlinkPath: reverseSymlinkPath ?? undefined,
    linkedReposUpdated,
  };
}

/**
 * Format output based on options
 */
function formatOutput(result: LinkResult, options: LinkOptions): string {
  if (options.json) {
    return JSON.stringify(
      {
        ok: result.success,
        result: {
          symlinkPath: result.symlinkPath,
          targetPath: result.targetPath,
          repoName: result.repoName,
          linkType: result.linkType,
          reverseSymlinkPath: result.reverseSymlinkPath,
          linkedReposUpdated: result.linkedReposUpdated,
        },
        message: result.message,
      },
      null,
      2
    );
  }

  return result.message;
}

// =============================================================================
// CLI Entry Point
// =============================================================================

/**
 * Main entry point for CLI invocation
 */
export async function main(args: string[]): Promise<number> {
  // Parse arguments
  const { values, positionals } = parseArgs({
    args,
    options: {
      json: { type: "boolean", default: false },
    },
    allowPositionals: true,
  });

  // Validate positional argument
  if (positionals.length === 0) {
    const errorMsg = "Error: Missing required argument <path>\n\nUsage: speck link <path> [--json]";
    if (values.json) {
      console.log(JSON.stringify({ ok: false, message: errorMsg }, null, 2));
    } else {
      console.error(errorMsg);
    }
    return 1;
  }

  const targetPath = positionals[0];
  const options: LinkOptions = {
    json: values.json ?? false,
  };

  // Run link
  const result = runLink(targetPath, options);

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
