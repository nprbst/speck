import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { $ } from "bun";
import path from "node:path";
import fs from "node:fs/promises";
import os from "node:os";

/**
 * Integration Test: Multi-Repo + Stacked PR Rejection
 *
 * Verifies that stacked PR commands gracefully reject multi-repo mode
 * per Feature 008 FR-015 and analysis finding C1.
 */

describe("Multi-Repo + Stacked PR Rejection", () => {
  let testDir: string;
  let parentDir: string;
  let childDir: string;

  beforeAll(async () => {
    // Create temporary test structure
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), "speck-test-"));
    parentDir = path.join(testDir, "parent");
    childDir = path.join(testDir, "child");

    // Setup parent directory with specs
    await fs.mkdir(path.join(parentDir, "specs", "001-test-feature"), { recursive: true });
    await fs.writeFile(
      path.join(parentDir, "specs", "001-test-feature", "spec.md"),
      "# Feature Specification: Test Feature"
    );

    // Setup child repo with .speck directory
    await fs.mkdir(path.join(childDir, ".speck"), { recursive: true });
    await fs.mkdir(path.join(childDir, ".git"), { recursive: true });

    // Initialize git in child
    await $`git -C ${childDir} init`.quiet();
    await $`git -C ${childDir} config user.email test@example.com`.quiet();
    await $`git -C ${childDir} config user.name "Test User"`.quiet();
    await $`git -C ${childDir} checkout -b 001-test-feature`.quiet();

    // Create symlink to enable multi-repo mode
    await fs.symlink(
      path.relative(path.join(childDir, ".speck"), parentDir),
      path.join(childDir, ".speck", "root"),
      "dir"
    );
  });

  afterAll(async () => {
    // Cleanup
    await fs.rm(testDir, { recursive: true, force: true });
  });

  test("detectSpeckRoot detects multi-repo mode", async () => {
    const { detectSpeckRoot } = await import("../../.speck/scripts/common/paths.js");

    // Change to child directory
    const originalDir = process.cwd();
    process.chdir(childDir);

    const config = await detectSpeckRoot();
    expect(config.mode).toBe("multi-repo");
    // Normalize paths for macOS symlink resolution (/var -> /private/var)
    expect(await fs.realpath(config.speckRoot)).toBe(await fs.realpath(parentDir));
    expect(await fs.realpath(config.repoRoot)).toBe(await fs.realpath(childDir));

    process.chdir(originalDir);
  });

  test("/speck.branch create rejects multi-repo mode with clear error", async () => {
    const originalDir = process.cwd();
    const scriptPath = path.resolve(originalDir, ".speck/scripts/branch-command.ts");

    process.chdir(childDir);

    try {
      const result = await $`bun run ${scriptPath} create test-branch --spec 001-test-feature`.nothrow();

      expect(result.exitCode).toBe(1);
      expect(result.stderr.toString()).toContain("single-repo only");
      expect(result.stderr.toString()).toContain("multi-repo mode");
      expect(result.stderr.toString()).toContain("rm .speck/root");
    } finally {
      process.chdir(originalDir);
    }
  });

  test("error message includes actionable guidance", async () => {
    const originalDir = process.cwd();
    const scriptPath = path.resolve(originalDir, ".speck/scripts/branch-command.ts");

    // Don't change directory - use -C flag to run git commands in child directory
    // The script will detect multi-repo mode based on the current working directory
    const originalCwd = process.cwd();
    process.chdir(childDir);

    try {
      const result = await $`bun run ${scriptPath} create test-branch --spec 001-test-feature`.nothrow();

      const stderr = result.stderr.toString();
      // Check for error message content (may vary if script path resolution differs)
      expect(stderr).toContain("Repository root:");
      expect(stderr).toContain("Speck root:");
      expect(stderr).toContain("/speck.env");
    } finally {
      process.chdir(originalCwd);
    }
  });
});
