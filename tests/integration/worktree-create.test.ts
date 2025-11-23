/**
 * Integration tests for worktree creation
 *
 * Tests the core worktree creation workflow end-to-end.
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { $ } from "bun";
import { createWorktree } from "../../.speck/scripts/worktree/create";
import { saveConfig } from "../../.speck/scripts/worktree/config";
import { DEFAULT_SPECK_CONFIG } from "../../.speck/scripts/worktree/config-schema";
import { listWorktrees } from "../../.speck/scripts/worktree/git";

describe("Worktree Creation", () => {
  let testDir: string;
  let repoPath: string;

  beforeEach(async () => {
    // Create temporary directory for test
    testDir = mkdtempSync(join(tmpdir(), "worktree-create-test-"));
    repoPath = join(testDir, "test-repo");

    // Initialize a Git repository
    await $`mkdir -p ${repoPath}`.quiet();
    await $`git -C ${repoPath} init`.quiet();
    await $`git -C ${repoPath} config user.email "test@example.com"`.quiet();
    await $`git -C ${repoPath} config user.name "Test User"`.quiet();

    // Create initial commit
    await $`touch ${repoPath}/README.md`.quiet();
    await $`git -C ${repoPath} add .`.quiet();
    await $`git -C ${repoPath} commit -m "Initial commit"`.quiet();

    // Save default config
    await saveConfig(repoPath, DEFAULT_SPECK_CONFIG);
  });

  afterEach(() => {
    // Cleanup test directory
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  test("should create a basic worktree for a new branch", async () => {
    // Create a test branch
    const branchName = "001-test-feature";
    await $`git -C ${repoPath} branch ${branchName}`.quiet();

    // Create worktree
    const result = await createWorktree({
      repoPath,
      branchName,
    });

    // Verify result
    expect(result.success).toBe(true);
    expect(result.worktreePath).toBeDefined();
    expect(result.metadata.branchName).toBe(branchName);
    expect(result.metadata.status).toBe("ready");

    // Verify worktree was created in Git
    const worktrees = await listWorktrees(repoPath);
    expect(worktrees.length).toBe(2); // Main + new worktree
    expect(worktrees[1].branch).toBe(branchName);
  });

  test("should handle branch prefix correctly", async () => {
    const branchName = "002-another-feature";
    const branchPrefix = "feature/";

    // Create branch with prefix
    await $`git -C ${repoPath} branch ${branchPrefix}${branchName}`.quiet();

    // Create worktree
    const result = await createWorktree({
      repoPath,
      branchName,
      branchPrefix,
    });

    expect(result.success).toBe(true);
    expect(result.metadata.branchName).toBe(`${branchPrefix}${branchName}`);
  });

  test("should fail if branch does not exist", async () => {
    expect(async () => {
      await createWorktree({
        repoPath,
        branchName: "nonexistent-branch",
      });
    }).toThrow();
  });

  test("should fail if worktree already exists for branch", async () => {
    const branchName = "003-duplicate-test";
    await $`git -C ${repoPath} branch ${branchName}`.quiet();

    // Create first worktree
    await createWorktree({
      repoPath,
      branchName,
    });

    // Try to create second worktree for same branch
    expect(async () => {
      await createWorktree({
        repoPath,
        branchName,
      });
    }).toThrow();
  });

  test("should cleanup stale worktrees before creation", async () => {
    const branchName = "004-cleanup-test";
    const tempBranchName = "005-temp";

    // Create branches
    await $`git -C ${repoPath} branch ${branchName}`.quiet();
    await $`git -C ${repoPath} branch ${tempBranchName}`.quiet();

    // Create and then manually delete a worktree directory
    const result1 = await createWorktree({
      repoPath,
      branchName: tempBranchName,
    });

    // Manually delete the worktree directory (simulating stale reference)
    rmSync(result1.worktreePath, { recursive: true, force: true });

    // Create new worktree - should succeed after pruning stale references
    const result2 = await createWorktree({
      repoPath,
      branchName,
    });

    expect(result2.success).toBe(true);
  });

  test("should handle custom worktree path", async () => {
    const branchName = "006-custom-path";
    const customPath = join(testDir, "custom-worktree-location");

    await $`git -C ${repoPath} branch ${branchName}`.quiet();

    const result = await createWorktree({
      repoPath,
      branchName,
      worktreePath: customPath,
    });

    expect(result.success).toBe(true);
    expect(result.worktreePath).toBe(customPath);
  });
});
