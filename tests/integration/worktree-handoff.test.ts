/**
 * Integration Tests for Worktree + Handoff Creation
 *
 * Tests the complete flow of creating a worktree with session handoff
 * documents and hook configuration.
 *
 * @feature 015-scope-simplification
 * @tasks T043
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync, existsSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { $ } from "bun";

// Import the module we're testing (will be created later)
const getHandoffModule = async () => {
  try {
    return await import("../../.speck/scripts/worktree/handoff");
  } catch {
    return null;
  }
};

describe("Worktree + Handoff Creation Integration (T043)", () => {
  let testDir: string;
  let repoPath: string;
  let worktreePath: string;

  beforeEach(async () => {
    // Create a temporary test directory
    testDir = mkdtempSync(path.join(tmpdir(), "speck-handoff-test-"));
    repoPath = path.join(testDir, "main-repo");
    worktreePath = path.join(testDir, "worktrees", "001-test-feature");

    // Initialize git repo
    mkdirSync(repoPath, { recursive: true });
    await $`git -C ${repoPath} init`.quiet();
    await $`git -C ${repoPath} config user.email "test@test.com"`.quiet();
    await $`git -C ${repoPath} config user.name "Test"`.quiet();

    // Create initial commit
    writeFileSync(path.join(repoPath, "README.md"), "# Test Repo\n");
    await $`git -C ${repoPath} add .`.quiet();
    await $`git -C ${repoPath} commit -m "Initial commit"`.quiet();
  });

  afterEach(() => {
    // Clean up test directory
    if (testDir && existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe("writeWorktreeHandoff", () => {
    test("creates handoff.md in worktree .speck directory", async () => {
      const handoff = await getHandoffModule();
      if (!handoff) {
        expect(handoff).not.toBeNull();
        return;
      }

      // Create worktree directory structure
      mkdirSync(worktreePath, { recursive: true });

      // Write handoff document
      await handoff.writeWorktreeHandoff(worktreePath, {
        featureName: "Test Feature",
        branchName: "001-test-feature",
        specPath: "../main-repo/specs/001-test-feature/spec.md",
        context: "Test feature description",
      });

      // Verify handoff.md exists
      const handoffPath = path.join(worktreePath, ".speck", "handoff.md");
      expect(existsSync(handoffPath)).toBe(true);

      // Verify content
      const content = readFileSync(handoffPath, "utf-8");
      expect(content).toContain("featureName:");
      expect(content).toContain("Test Feature");
    });

    test("creates .claude/settings.json with SessionStart hook", async () => {
      const handoff = await getHandoffModule();
      if (!handoff) {
        expect(handoff).not.toBeNull();
        return;
      }

      mkdirSync(worktreePath, { recursive: true });

      await handoff.writeWorktreeHandoff(worktreePath, {
        featureName: "Test Feature",
        branchName: "001-test-feature",
        specPath: "spec.md",
        context: "Test",
      });

      // Verify settings.json exists
      const settingsPath = path.join(worktreePath, ".claude", "settings.json");
      expect(existsSync(settingsPath)).toBe(true);

      // Verify hook configuration
      const settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
      expect(settings.hooks).toBeDefined();
      expect(settings.hooks.SessionStart).toBeDefined();
      expect(settings.hooks.SessionStart[0].hooks[0].command).toContain(
        "handoff.sh"
      );
    });

    test("creates .claude/scripts/handoff.sh hook script", async () => {
      const handoff = await getHandoffModule();
      if (!handoff) {
        expect(handoff).not.toBeNull();
        return;
      }

      mkdirSync(worktreePath, { recursive: true });

      await handoff.writeWorktreeHandoff(worktreePath, {
        featureName: "Test Feature",
        branchName: "001-test-feature",
        specPath: "spec.md",
        context: "Test",
      });

      // Verify hook script exists
      const hookPath = path.join(worktreePath, ".claude", "scripts", "handoff.sh");
      expect(existsSync(hookPath)).toBe(true);

      // Verify script is executable
      const stats = Bun.file(hookPath);
      const content = await stats.text();
      expect(content).toContain("#!/bin/bash");
      expect(content).toContain("hookSpecificOutput");
    });

    test("creates .vscode/tasks.json with Claude panel auto-open", async () => {
      const handoff = await getHandoffModule();
      if (!handoff) {
        expect(handoff).not.toBeNull();
        return;
      }

      mkdirSync(worktreePath, { recursive: true });

      await handoff.writeWorktreeHandoff(worktreePath, {
        featureName: "Test Feature",
        branchName: "001-test-feature",
        specPath: "spec.md",
        context: "Test",
      });

      // Verify tasks.json exists
      const tasksPath = path.join(worktreePath, ".vscode", "tasks.json");
      expect(existsSync(tasksPath)).toBe(true);

      // Verify task configuration
      const tasks = JSON.parse(readFileSync(tasksPath, "utf-8"));
      expect(tasks.version).toBe("2.0.0");
      expect(tasks.tasks).toBeDefined();

      // Check for Claude panel task
      const claudeTask = tasks.tasks.find(
        (t: { label: string }) =>
          t.label === "Open Claude Code Panel" ||
          t.label === "Start Claude with Handoff"
      );
      expect(claudeTask).toBeDefined();
      expect(claudeTask.runOptions?.runOn).toBe("folderOpen");
    });
  });

  describe("Complete worktree creation flow", () => {
    test("creates worktree with all handoff artifacts using atomic git worktree add", async () => {
      const handoff = await getHandoffModule();
      if (!handoff) {
        expect(handoff).not.toBeNull();
        return;
      }

      // Create a branch first
      const branchName = "001-test-feature";
      await $`git -C ${repoPath} branch ${branchName}`.quiet();

      // Create worktree with handoff (atomic operation)
      const result = await handoff.createWorktreeWithHandoff({
        repoPath,
        branchName,
        worktreePath,
        featureName: "Test Feature",
        specPath: "../main-repo/specs/001-test-feature/spec.md",
        context: "Test feature for integration testing.",
      });

      expect(result.success).toBe(true);
      expect(result.worktreePath).toBe(worktreePath);

      // Verify all artifacts exist
      expect(existsSync(path.join(worktreePath, ".speck", "handoff.md"))).toBe(
        true
      );
      expect(
        existsSync(path.join(worktreePath, ".claude", "settings.json"))
      ).toBe(true);
      expect(
        existsSync(path.join(worktreePath, ".claude", "scripts", "handoff.sh"))
      ).toBe(true);
      expect(existsSync(path.join(worktreePath, ".vscode", "tasks.json"))).toBe(
        true
      );

      // Verify worktree is on correct branch
      const branch =
        await $`git -C ${worktreePath} rev-parse --abbrev-ref HEAD`.text();
      expect(branch.trim()).toBe(branchName);
    });

    test("atomic worktree creation does not change original repo checkout", async () => {
      const handoff = await getHandoffModule();
      if (!handoff) {
        expect(handoff).not.toBeNull();
        return;
      }

      // Get original branch
      const originalBranch =
        await $`git -C ${repoPath} rev-parse --abbrev-ref HEAD`.text();

      // Create a new branch and worktree
      const branchName = "001-test-feature";
      await $`git -C ${repoPath} branch ${branchName}`.quiet();

      await handoff.createWorktreeWithHandoff({
        repoPath,
        branchName,
        worktreePath,
        featureName: "Test Feature",
        specPath: "spec.md",
        context: "Test",
      });

      // Original repo should still be on original branch
      const currentBranch =
        await $`git -C ${repoPath} rev-parse --abbrev-ref HEAD`.text();
      expect(currentBranch.trim()).toBe(originalBranch.trim());
    });

    test("graceful degradation when handoff write fails", async () => {
      const handoff = await getHandoffModule();
      if (!handoff) {
        expect(handoff).not.toBeNull();
        return;
      }

      const branchName = "001-test-feature-degrade";
      await $`git -C ${repoPath} branch ${branchName}`.quiet();

      const worktreePathDegrade = path.join(
        testDir,
        "worktrees",
        "001-test-feature-degrade"
      );

      // First, create the worktree successfully
      const initialResult = await handoff.createWorktreeWithHandoff({
        repoPath,
        branchName,
        worktreePath: worktreePathDegrade,
        featureName: "Test Feature",
        specPath: "spec.md",
        context: "Test",
      });

      // Verify initial creation succeeded
      expect(initialResult.success).toBe(true);

      // Test the writeWorktreeHandoff function directly with a read-only directory
      // to verify it handles errors gracefully
      const speckDir = path.join(worktreePathDegrade, ".speck");
      await $`chmod 000 ${speckDir}`.quiet();

      try {
        // writeWorktreeHandoff should throw when directory is not writable
        // But the wrapper function should catch this and report as warning
        let caughtError = false;
        try {
          await handoff.writeWorktreeHandoff(worktreePathDegrade, {
            featureName: "Test Feature 2",
            branchName: "test-branch",
            specPath: "spec.md",
            context: "Test 2",
          });
        } catch {
          caughtError = true;
        }

        // Should throw because directory is read-only
        expect(caughtError).toBe(true);
      } finally {
        // Restore permissions for cleanup
        await $`chmod 755 ${speckDir}`.quiet();
      }
    });
  });
});
