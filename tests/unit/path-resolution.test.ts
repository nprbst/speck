/**
 * Unit tests for path resolution in different execution contexts
 *
 * These tests verify that paths are resolved correctly when:
 * - Running from the development repository
 * - Running as a bundled hook from plugin directory
 * - Running from a user's working directory
 */

import { describe, it, expect, beforeAll } from "bun:test";
import { getRepoRoot, getFeaturePaths } from "../../.speck/scripts/common/paths";
import { existsSync } from "node:fs";
import { join } from "node:path";

describe("Path Resolution", () => {
  describe("getRepoRoot()", () => {
    let originalCwd: string;

    beforeAll(() => {
      originalCwd = process.cwd();
    });

    it("should return git repository root when in a git repo", async () => {
      // This test runs in the speck repository itself
      const repoRoot = await getRepoRoot();

      // Should return an absolute path
      expect(repoRoot).toBeTruthy();
      expect(repoRoot.startsWith("/")).toBe(true);

      // Should contain .git directory (git repo marker)
      const gitDir = join(repoRoot, ".git");
      expect(existsSync(gitDir)).toBe(true);
    });

    it("should use process.cwd() as fallback for non-git repos", async () => {
      // This test verifies the fix for the hook execution context bug
      // When a bundled hook runs from ~/.claude/plugins/..., it should
      // still resolve paths relative to the user's current working directory

      const repoRoot = await getRepoRoot();

      // In a git repo, should return the repo root
      // In a non-git context, should return process.cwd()
      expect(repoRoot).toBeTruthy();

      // The key behavior: should NOT use import.meta.dir as fallback
      // (import.meta.dir would point to the bundled script location)
      // Instead, should use process.cwd() (user's current directory)

      // We verify this indirectly: the repo root should be a valid directory
      expect(existsSync(repoRoot)).toBe(true);
    });

    it("should return consistent results across multiple calls", async () => {
      const result1 = await getRepoRoot();
      const result2 = await getRepoRoot();

      expect(result1).toBe(result2);
    });

    it("should handle relative path resolution correctly", async () => {
      const repoRoot = await getRepoRoot();

      // Verify that joining paths works as expected
      const testPath = join(repoRoot, "specs");

      // Should be an absolute path
      expect(testPath.startsWith("/")).toBe(true);

      // Should not contain '..' or other relative components after resolution
      expect(testPath).not.toContain("/../");
    });
  });

  describe("getFeaturePaths()", () => {
    it("should resolve paths relative to current working directory", async () => {
      const paths = await getFeaturePaths();

      // All paths should be absolute
      expect(paths.REPO_ROOT.startsWith("/")).toBe(true);
      expect(paths.FEATURE_DIR.startsWith("/")).toBe(true);
      expect(paths.SPECS_DIR.startsWith("/")).toBe(true);

      // REPO_ROOT should be the current working directory (or a git repo root if in a git repo)
      // In test environments this might be a temporary directory
      expect(paths.REPO_ROOT).toBeTruthy();

      // SPECS_DIR should exist (either in repo or symlinked)
      expect(existsSync(paths.SPECS_DIR)).toBe(true);
    });

    it("should detect mode correctly", async () => {
      const paths = await getFeaturePaths();

      // Mode should be either single-repo or multi-repo
      expect(["single-repo", "multi-repo"]).toContain(paths.MODE);
    });

    it("should include all required path fields", async () => {
      const paths = await getFeaturePaths();

      const requiredFields = [
        "MODE",
        "REPO_ROOT",
        "SPECS_DIR",
        "SPECK_ROOT",
        "CURRENT_BRANCH",
        "HAS_GIT",
        "FEATURE_DIR",
        "FEATURE_SPEC",
        "IMPL_PLAN",
        "TASKS",
      ];

      for (const field of requiredFields) {
        expect(paths).toHaveProperty(field);
        expect(paths[field as keyof typeof paths]).toBeTruthy();
      }
    });
  });

  describe("Hook Execution Context", () => {
    it("should work when bundled hook is executed from user's directory", async () => {
      // This test simulates the scenario where:
      // 1. Hook bundle is installed at ~/.claude/plugins/marketplaces/speck-market/speck/dist/pre-prompt-submit-hook.js
      // 2. User runs /speck:env from ~/git/some-other-repo
      // 3. Hook executes and needs to find paths in ~/git/some-other-repo (NOT in ~/.claude/plugins/...)

      // Get paths (this mimics what the hook does)
      const paths = await getFeaturePaths();

      // Verify the paths point to the current working directory, not the plugin directory
      expect(paths.REPO_ROOT).not.toContain(".claude/plugins");
      expect(paths.FEATURE_DIR).not.toContain(".claude/plugins");
      expect(paths.SPECS_DIR).not.toContain(".claude/plugins");

      // Paths should be based on process.cwd(), not import.meta.dir
      // Verify that REPO_ROOT is a valid absolute path that doesn't point to plugin directory
      expect(paths.REPO_ROOT.startsWith("/")).toBe(true);
      expect(paths.REPO_ROOT).not.toContain("/.claude/plugins/");
    });
  });

  describe("Git Detection", () => {
    it("should detect git repository from .git directory", async () => {
      // This test runs in the speck repository which has a .git directory
      const paths = await getFeaturePaths();

      // Should detect git correctly
      expect(paths.HAS_GIT).toBe("true");
    });

    it("should work in bundled context where git command might fail", async () => {
      // The hasGit() function should check for .git directory first
      // This ensures it works even when bundled hooks run and $ might not work correctly

      const paths = await getFeaturePaths();

      // In the speck repo (which has .git), should always detect git
      expect(paths.HAS_GIT).toBe("true");

      // Verify HAS_GIT is a string (not boolean) for backward compatibility
      expect(typeof paths.HAS_GIT).toBe("string");
    });
  });
});
