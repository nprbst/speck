/**
 * Integration tests for file operations
 *
 * Tests end-to-end file copy/symlink workflows with real Git repositories
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm, writeFile, mkdir, readlink } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execSync } from "node:child_process";
import { applyFileRules } from "../../.speck/scripts/worktree/file-ops";
import type { FileRule } from "../../.speck/scripts/worktree/config-schema";

describe("File Operations Integration", () => {
  let repoDir: string;
  let worktreeDir: string;

  beforeEach(async () => {
    // Create main repository
    repoDir = await mkdtemp(join(tmpdir(), "test-file-ops-repo-"));

    // Initialize git
    execSync("git init", { cwd: repoDir, stdio: "ignore" });
    execSync('git config user.email "test@example.com"', { cwd: repoDir, stdio: "ignore" });
    execSync('git config user.name "Test User"', { cwd: repoDir, stdio: "ignore" });

    // Create realistic project structure
    await mkdir(join(repoDir, "src"), { recursive: true });
    await mkdir(join(repoDir, "tests"), { recursive: true });
    await mkdir(join(repoDir, "node_modules/package1"), { recursive: true });
    await mkdir(join(repoDir, "docs"), { recursive: true });
    await mkdir(join(repoDir, ".git/hooks"), { recursive: true });

    // Create tracked files
    await writeFile(join(repoDir, "README.md"), "# Project");
    await writeFile(join(repoDir, "package.json"), '{"name":"test"}');
    await writeFile(join(repoDir, "tsconfig.json"), '{"compilerOptions":{}}');
    await writeFile(join(repoDir, "src/index.ts"), "export {}");
    await writeFile(join(repoDir, "src/utils.ts"), "export const util = () => {}");
    await writeFile(join(repoDir, "tests/example.test.ts"), "test('example', () => {})");
    await writeFile(join(repoDir, "docs/README.md"), "# Docs");
    await writeFile(join(repoDir, ".git/hooks/pre-commit"), "#!/bin/sh\necho 'hook'");

    // Track files
    execSync("git add .", { cwd: repoDir, stdio: "ignore" });
    execSync('git commit -m "Initial commit"', { cwd: repoDir, stdio: "ignore" });

    // Create untracked files
    await writeFile(join(repoDir, ".env.local"), "SECRET=123");
    await writeFile(join(repoDir, ".env.development"), "DEBUG=true");
    await writeFile(join(repoDir, "src/draft.ts"), "// WIP");

    // Create node_modules content
    await writeFile(join(repoDir, "node_modules/package1/index.js"), "module.exports = {}");

    // Create worktree directory
    worktreeDir = await mkdtemp(join(tmpdir(), "test-file-ops-worktree-"));
  });

  afterEach(async () => {
    await rm(repoDir, { recursive: true, force: true });
    await rm(worktreeDir, { recursive: true, force: true });
  });

  it("should copy config files and symlink dependencies", async () => {
    const rules: FileRule[] = [
      { pattern: "package.json", action: "copy" },
      { pattern: "tsconfig.json", action: "copy" },
      { pattern: "node_modules", action: "symlink" }
    ];

    const result = await applyFileRules({
      sourcePath: repoDir,
      destPath: worktreeDir,
      rules,
      includeUntracked: false
    });

    // Verify copied files
    expect(result.copiedPaths).toContain("package.json");
    expect(result.copiedPaths).toContain("tsconfig.json");
    expect(result.copiedCount).toBe(2);

    // Verify symlinked directories
    expect(result.symlinkedPaths).toContain("node_modules");
    expect(result.symlinkedCount).toBe(1);

    // Verify files are accessible
    const pkg = await Bun.file(join(worktreeDir, "package.json")).text();
    expect(pkg).toContain("test");

    // Verify symlink points correctly
    const link = await readlink(join(worktreeDir, "node_modules"));
    expect(link).toBeTruthy();

    // Verify content through symlink
    const dep = await Bun.file(join(worktreeDir, "node_modules/package1/index.js")).text();
    expect(dep).toContain("module.exports");
  });

  it("should copy source files but ignore build artifacts", async () => {
    const rules: FileRule[] = [
      { pattern: "src/**/*.ts", action: "copy" },
      { pattern: "dist/**", action: "ignore" },
      { pattern: "build/**", action: "ignore" }
    ];

    const result = await applyFileRules({
      sourcePath: repoDir,
      destPath: worktreeDir,
      rules,
      includeUntracked: false
    });

    // Should copy tracked source files
    expect(result.copiedPaths).toContain("src/index.ts");
    expect(result.copiedPaths).toContain("src/utils.ts");

    // Should not copy untracked draft file
    expect(result.copiedPaths).not.toContain("src/draft.ts");
  });

  it("should handle untracked file inclusion", async () => {
    const rules: FileRule[] = [
      { pattern: ".env*", action: "copy" }
    ];

    // Without includeUntracked
    const result1 = await applyFileRules({
      sourcePath: repoDir,
      destPath: worktreeDir,
      rules,
      includeUntracked: false
    });

    expect(result1.copiedCount).toBe(0);

    // Clear worktree
    await rm(worktreeDir, { recursive: true, force: true });
    worktreeDir = await mkdtemp(join(tmpdir(), "test-file-ops-worktree-"));

    // With includeUntracked
    const result2 = await applyFileRules({
      sourcePath: repoDir,
      destPath: worktreeDir,
      rules,
      includeUntracked: true
    });

    expect(result2.copiedPaths).toContain(".env.local");
    expect(result2.copiedPaths).toContain(".env.development");
    expect(result2.copiedCount).toBe(2);
  });

  it("should apply complex rule combinations", async () => {
    const rules: FileRule[] = [
      // Copy all config files
      { pattern: "*.json", action: "copy" },
      { pattern: "*.md", action: "copy" },

      // Copy source but not drafts
      { pattern: "src/**/*.ts", action: "copy" },
      { pattern: "src/**/draft*", action: "ignore" },

      // Symlink dependencies
      { pattern: "node_modules", action: "symlink" },

      // Ignore git internals
      { pattern: ".git/**", action: "ignore" }
    ];

    const result = await applyFileRules({
      sourcePath: repoDir,
      destPath: worktreeDir,
      rules,
      includeUntracked: true
    });

    // Config files copied
    expect(result.copiedPaths).toContain("package.json");
    expect(result.copiedPaths).toContain("tsconfig.json");
    expect(result.copiedPaths).toContain("README.md");

    // Source files copied (excluding drafts)
    expect(result.copiedPaths).toContain("src/index.ts");
    expect(result.copiedPaths).toContain("src/utils.ts");
    expect(result.copiedPaths).not.toContain("src/draft.ts");

    // Dependencies symlinked
    expect(result.symlinkedPaths).toContain("node_modules");

    // Git internals ignored
    expect(result.copiedPaths).not.toContain(".git/hooks/pre-commit");
  });

  it("should preserve directory structure for nested files", async () => {
    await mkdir(join(repoDir, "src/components/ui"), { recursive: true });
    await writeFile(join(repoDir, "src/components/ui/Button.tsx"), "export const Button = () => {}");
    execSync("git add .", { cwd: repoDir, stdio: "ignore" });
    execSync('git commit -m "Add button"', { cwd: repoDir, stdio: "ignore" });

    const rules: FileRule[] = [
      { pattern: "src/**/*.tsx", action: "copy" }
    ];

    const result = await applyFileRules({
      sourcePath: repoDir,
      destPath: worktreeDir,
      rules,
      includeUntracked: false
    });

    expect(result.copiedPaths).toContain("src/components/ui/Button.tsx");

    // Verify directory structure preserved
    const buttonContent = await Bun.file(join(worktreeDir, "src/components/ui/Button.tsx")).text();
    expect(buttonContent).toContain("Button");
  });

  it("should report progress during operations", async () => {
    const progressMessages: string[] = [];

    const rules: FileRule[] = [
      { pattern: "**/*.ts", action: "copy" },
      { pattern: "node_modules", action: "symlink" }
    ];

    await applyFileRules({
      sourcePath: repoDir,
      destPath: worktreeDir,
      rules,
      includeUntracked: false,
      onProgress: (message) => progressMessages.push(message)
    });

    expect(progressMessages.length).toBeGreaterThan(0);
  });

  it("should handle empty rules array gracefully", async () => {
    const result = await applyFileRules({
      sourcePath: repoDir,
      destPath: worktreeDir,
      rules: [],
      includeUntracked: false
    });

    expect(result.copiedCount).toBe(0);
    expect(result.symlinkedCount).toBe(0);
    expect(result.errors.length).toBe(0);
  });

  it("should handle non-existent patterns gracefully", async () => {
    const rules: FileRule[] = [
      { pattern: "*.nonexistent", action: "copy" },
      { pattern: "missing/**", action: "symlink" }
    ];

    const result = await applyFileRules({
      sourcePath: repoDir,
      destPath: worktreeDir,
      rules,
      includeUntracked: false
    });

    expect(result.copiedCount).toBe(0);
    expect(result.symlinkedCount).toBe(0);
  });
});

describe("DEFAULT_FILE_RULES Integration", () => {
  let repoDir: string;
  let worktreeDir: string;

  beforeEach(async () => {
    repoDir = await mkdtemp(join(tmpdir(), "test-default-rules-"));
    worktreeDir = await mkdtemp(join(tmpdir(), "test-default-worktree-"));

    // Initialize git
    execSync("git init", { cwd: repoDir, stdio: "ignore" });
    execSync('git config user.email "test@example.com"', { cwd: repoDir, stdio: "ignore" });
    execSync('git config user.name "Test User"', { cwd: repoDir, stdio: "ignore" });

    // Create typical Node.js project structure
    await mkdir(join(repoDir, "src"), { recursive: true });
    await mkdir(join(repoDir, "node_modules"), { recursive: true });

    await writeFile(join(repoDir, "package.json"), "{}");
    await writeFile(join(repoDir, "package-lock.json"), "{}");
    await writeFile(join(repoDir, "tsconfig.json"), "{}");
    await writeFile(join(repoDir, ".gitignore"), "node_modules");
    await writeFile(join(repoDir, ".env.example"), "");
    await writeFile(join(repoDir, "src/index.ts"), "");

    execSync("git add .", { cwd: repoDir, stdio: "ignore" });
    execSync('git commit -m "Init"', { cwd: repoDir, stdio: "ignore" });
  });

  afterEach(async () => {
    await rm(repoDir, { recursive: true, force: true });
    await rm(worktreeDir, { recursive: true, force: true });
  });

  it("should apply DEFAULT_FILE_RULES for typical project", async () => {
    // DEFAULT_FILE_RULES from plan.md:
    // - Copy: package.json, package-lock.json, *.config.js, tsconfig.json, .gitignore, .env.example
    // - Symlink: node_modules, .git
    // - Ignore: dist/, build/, *.log
    const DEFAULT_FILE_RULES: FileRule[] = [
      { pattern: "package.json", action: "copy" },
      { pattern: "package-lock.json", action: "copy" },
      { pattern: "*.config.js", action: "copy" },
      { pattern: "tsconfig.json", action: "copy" },
      { pattern: ".gitignore", action: "copy" },
      { pattern: ".env.example", action: "copy" },
      { pattern: "node_modules", action: "symlink" },
      { pattern: ".git", action: "symlink" },
      { pattern: "dist/**", action: "ignore" },
      { pattern: "build/**", action: "ignore" },
      { pattern: "*.log", action: "ignore" }
    ];

    const result = await applyFileRules({
      sourcePath: repoDir,
      destPath: worktreeDir,
      rules: DEFAULT_FILE_RULES,
      includeUntracked: false
    });

    // Verify config files copied
    expect(result.copiedPaths).toContain("package.json");
    expect(result.copiedPaths).toContain("package-lock.json");
    expect(result.copiedPaths).toContain("tsconfig.json");
    expect(result.copiedPaths).toContain(".gitignore");
    expect(result.copiedPaths).toContain(".env.example");

    // Verify directories symlinked
    expect(result.symlinkedPaths).toContain("node_modules");
    expect(result.symlinkedPaths).toContain(".git");
  });
});