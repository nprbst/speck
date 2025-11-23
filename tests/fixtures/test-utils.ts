/**
 * Test utilities for worktree integration tests
 *
 * Provides utilities for:
 * - Creating temporary Git repositories for testing
 * - Mocking IDE launch commands
 * - Mocking package manager commands
 * - Cleanup helpers
 */

import { $ } from "bun";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Creates a temporary Git repository for testing
 *
 * @param options Configuration options
 * @returns Object with repo path and cleanup function
 */
export async function createTempGitRepo(options: {
  /** Initialize with commits */
  withCommits?: boolean;
  /** Create initial branch name (default: "main") */
  initialBranch?: string;
  /** Add initial files */
  withFiles?: string[];
} = {}): Promise<{ path: string; cleanup: () => Promise<void> }> {
  const prefix = join(tmpdir(), "speck-test-");
  const repoPath = await mkdtemp(prefix);

  try {
    // Initialize Git repo
    await $`git init ${options.initialBranch ? `-b ${options.initialBranch}` : ""} ${repoPath}`.quiet();

    // Configure Git user for commits
    await $`git -C ${repoPath} config user.email "test@example.com"`.quiet();
    await $`git -C ${repoPath} config user.name "Test User"`.quiet();

    // Add initial files if requested
    if (options.withFiles && options.withFiles.length > 0) {
      for (const file of options.withFiles) {
        const filePath = join(repoPath, file);
        await Bun.write(filePath, `# ${file}\n\nTest content`);
      }
    }

    // Create initial commit if requested
    if (options.withCommits) {
      // Create a dummy file if no files specified
      if (!options.withFiles || options.withFiles.length === 0) {
        await Bun.write(join(repoPath, "README.md"), "# Test Repository\n");
      }

      await $`git -C ${repoPath} add .`.quiet();
      await $`git -C ${repoPath} commit -m "Initial commit"`.quiet();
    }

    return {
      path: repoPath,
      cleanup: async () => {
        await rm(repoPath, { recursive: true, force: true });
      },
    };
  } catch (error) {
    // Cleanup on error
    await rm(repoPath, { recursive: true, force: true });
    throw error;
  }
}

/**
 * Mock IDE command executor
 *
 * Captures IDE launch commands without executing them
 */
export class MockIDELauncher {
  private commands: Array<{
    ide: string;
    command: string;
    args: string[];
    workingDir: string;
  }> = [];

  /**
   * Mock IDE execution - captures command without running it
   */
  async execute(ide: string, command: string, args: string[], workingDir: string): Promise<void> {
    this.commands.push({ ide, command, args, workingDir });
  }

  /**
   * Get all captured commands
   */
  getCapturedCommands() {
    return [...this.commands];
  }

  /**
   * Check if a specific IDE was launched
   */
  wasLaunched(ide: string): boolean {
    return this.commands.some((cmd) => cmd.ide === ide);
  }

  /**
   * Reset captured commands
   */
  reset() {
    this.commands = [];
  }
}

/**
 * Mock package manager executor
 *
 * Captures package manager commands without executing them
 */
export class MockPackageManager {
  private commands: Array<{
    manager: string;
    command: string;
    args: string[];
    workingDir: string;
    exitCode: number;
    stdout: string;
    stderr: string;
  }> = [];

  private nextExitCode = 0;
  private nextStdout = "";
  private nextStderr = "";

  /**
   * Set the result for the next command execution
   */
  setNextResult(exitCode: number, stdout = "", stderr = "") {
    this.nextExitCode = exitCode;
    this.nextStdout = stdout;
    this.nextStderr = stderr;
  }

  /**
   * Mock package manager execution - captures command without running it
   */
  async execute(
    manager: string,
    command: string,
    args: string[],
    workingDir: string
  ): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    const result = {
      manager,
      command,
      args,
      workingDir,
      exitCode: this.nextExitCode,
      stdout: this.nextStdout,
      stderr: this.nextStderr,
    };

    this.commands.push(result);

    // Reset for next call
    const output = {
      exitCode: this.nextExitCode,
      stdout: this.nextStdout,
      stderr: this.nextStderr,
    };
    this.nextExitCode = 0;
    this.nextStdout = "";
    this.nextStderr = "";

    return output;
  }

  /**
   * Get all captured commands
   */
  getCapturedCommands() {
    return [...this.commands];
  }

  /**
   * Check if a specific package manager was used
   */
  wasUsed(manager: string): boolean {
    return this.commands.some((cmd) => cmd.manager === manager);
  }

  /**
   * Reset captured commands
   */
  reset() {
    this.commands = [];
    this.nextExitCode = 0;
    this.nextStdout = "";
    this.nextStderr = "";
  }
}

/**
 * Helper to assert Git version meets minimum requirements
 */
export async function assertGitVersion(minVersion = "2.5.0"): Promise<void> {
  try {
    const { stdout } = await $`git --version`.quiet();
    const versionMatch = stdout.toString().match(/git version (\d+\.\d+\.\d+)/);

    if (!versionMatch) {
      throw new Error("Could not determine Git version");
    }

    const version = versionMatch[1];
    const [major, minor] = version.split(".").map(Number);
    const [minMajor, minMinor] = minVersion.split(".").map(Number);

    if (major < minMajor || (major === minMajor && minor < minMinor)) {
      throw new Error(
        `Git version ${version} is below minimum required version ${minVersion}`
      );
    }
  } catch (error) {
    throw new Error(`Git is not available or version check failed: ${error}`);
  }
}

/**
 * Create a test fixture file structure
 *
 * @param baseDir Base directory to create structure in
 * @param structure Object describing file structure
 */
export async function createFileStructure(
  baseDir: string,
  structure: Record<string, string | Record<string, any>>
): Promise<void> {
  for (const [name, content] of Object.entries(structure)) {
    const path = join(baseDir, name);

    if (typeof content === "string") {
      // It's a file
      await Bun.write(path, content);
    } else {
      // It's a directory
      await $`mkdir -p ${path}`.quiet();
      await createFileStructure(path, content);
    }
  }
}

/**
 * Wait for a condition to be true
 *
 * @param condition Function that returns true when condition is met
 * @param timeout Maximum time to wait in milliseconds
 * @param interval Check interval in milliseconds
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 100
): Promise<void> {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(`Timeout waiting for condition after ${timeout}ms`);
}
