/**
 * Regression Test: Single-Repo Projects (T083)
 *
 * Validates that Feature 009 changes do not affect single-repo
 * project behavior. All existing single-repo workflows must
 * continue to work exactly as before.
 *
 * Feature: 009-multi-repo-stacked (Phase 11)
 * Layer: Regression
 * Created: 2025-11-20
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { $ } from "bun";
import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";

describe("Regression: Single-repo projects", () => {
  let testDir: string;
  let scriptsDir: string;

  beforeEach(async () => {
    // Create isolated test environment
    testDir = path.join("/tmp", `speck-regression-single-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });

    // Copy .speck scripts to test directory for isolation
    scriptsDir = path.join(testDir, ".speck", "scripts");
    await fs.mkdir(scriptsDir, { recursive: true });
    await $`cp -r ${path.join(process.cwd(), ".speck/scripts")}/* ${scriptsDir}/`.quiet();

    // Initialize git repo
    await $`cd ${testDir} && git init`.quiet();
    await $`cd ${testDir} && git config user.email "test@example.com"`.quiet();
    await $`cd ${testDir} && git config user.name "Test User"`.quiet();
    await $`cd ${testDir} && git commit --allow-empty -m "Initial commit"`.quiet();

    // Create specs directory
    await fs.mkdir(path.join(testDir, "specs", "001-test-feature"), { recursive: true });
    await fs.writeFile(
      path.join(testDir, "specs", "001-test-feature", "spec.md"),
      "# Test Feature"
    );

    // Commit the spec file to avoid uncommitted changes warning
    await $`cd ${testDir} && git add . && git commit -m "Add spec"`.quiet();
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true }).catch(() => {});
  });

  test("T083: Branch creation in single-repo works unchanged", async () => {
    // Create a branch using the branch command
    const result = await $`cd ${testDir} && bun run ${scriptsDir}/branch-command.ts create nprbst/test-branch --base main --spec 001-test-feature`.nothrow();

    // Should succeed
    expect(result.exitCode).toBe(0);

    // Should create branches.json in repo root
    const branchesJsonPath = path.join(testDir, ".speck", "branches.json");
    expect(existsSync(branchesJsonPath)).toBe(true);

    // Should NOT have parentSpecId field (single-repo mode)
    const content = await fs.readFile(branchesJsonPath, "utf-8");
    const data = JSON.parse(content);
    expect(data.branches).toBeDefined();
    expect(data.branches["nprbst/test-branch"]).toBeDefined();
    expect(data.branches["nprbst/test-branch"].parentSpecId).toBeUndefined();
  });

  test("T083: Branch list in single-repo works unchanged", async () => {
    // Create a few branches
    await $`cd ${testDir} && bun run ${scriptsDir}/branch-command.ts create nprbst/branch-1 --base main --spec 001-test-feature`.quiet();
    await $`cd ${testDir} && bun run ${scriptsDir}/branch-command.ts create nprbst/branch-2 --base nprbst/branch-1 --spec 001-test-feature`.quiet();

    // List branches
    const result = await $`cd ${testDir} && bun run ${scriptsDir}/branch-command.ts list`.text();

    // Should show both branches
    expect(result).toContain("nprbst/branch-1");
    expect(result).toContain("nprbst/branch-2");

    // Should NOT show multi-repo grouping
    expect(result).not.toContain("Repository:");
  });

  test("T083: Branch status in single-repo works unchanged", async () => {
    // Create a branch
    await $`cd ${testDir} && bun run ${scriptsDir}/branch-command.ts create nprbst/status-test --base main --spec 001-test-feature`.quiet();

    // Get status
    const result = await $`cd ${testDir} && bun run ${scriptsDir}/branch-command.ts status`.nothrow();

    // Should succeed
    expect(result.exitCode).toBe(0);

    // Should show branch info
    const output = result.stdout.toString();
    expect(output).toContain("nprbst/status-test");
  });

  test("T083: Branch import in single-repo works unchanged", async () => {
    // Create git branches manually
    await $`cd ${testDir} && git checkout -b nprbst/manual-1`.quiet();
    await $`cd ${testDir} && echo "test" > file.txt && git add . && git commit -m "Test"`.quiet();
    await $`cd ${testDir} && git checkout -b nprbst/manual-2`.quiet();
    await $`cd ${testDir} && echo "test2" > file2.txt && git add . && git commit -m "Test 2"`.quiet();
    await $`cd ${testDir} && git checkout main`.quiet();

    // Import branches
    const result = await $`cd ${testDir} && bun run ${scriptsDir}/branch-command.ts import --spec 001-test-feature --yes`.nothrow();

    // Should succeed
    expect(result.exitCode).toBe(0);

    // Should create branches.json
    const branchesJsonPath = path.join(testDir, ".speck", "branches.json");
    expect(existsSync(branchesJsonPath)).toBe(true);

    // Should import both branches
    const content = await fs.readFile(branchesJsonPath, "utf-8");
    const data = JSON.parse(content);
    expect(data.branches["nprbst/manual-1"]).toBeDefined();
    expect(data.branches["nprbst/manual-2"]).toBeDefined();
  });

  test("T083: Env command in single-repo works unchanged", async () => {
    // Create some branches
    await $`cd ${testDir} && bun run ${scriptsDir}/branch-command.ts create nprbst/env-test --base main --spec 001-test-feature`.quiet();

    // Run env command
    const result = await $`cd ${testDir} && bun run ${scriptsDir}/env-command.ts`.nothrow();

    // Should succeed
    expect(result.exitCode).toBe(0);

    // Should show Speck info
    const output = result.stdout.toString();
    expect(output).toContain("Speck");

    // Should NOT show multi-repo indicators
    expect(output).not.toContain("Multi-Repo Root");
    expect(output).not.toContain("Child Repository");
  });

  test("T083: Schema v1.0.0 files still work correctly", async () => {
    // Create a v1.0.0 branches.json manually
    const branchesJsonPath = path.join(testDir, ".speck", "branches.json");
    const v1Schema = {
      version: "1.0.0",
      branches: {
        "nprbst/old-branch": {
          name: "nprbst/old-branch",
          base: "main",
          specId: "001-test-feature",
          createdAt: new Date().toISOString()
        }
      },
      specIndex: { "001-test-feature": 1 }
    };

    await fs.mkdir(path.join(testDir, ".speck"), { recursive: true });
    await fs.writeFile(branchesJsonPath, JSON.stringify(v1Schema, null, 2));

    // Create the git branch
    await $`cd ${testDir} && git checkout -b nprbst/old-branch`.quiet();

    // List branches (should read v1.0.0 schema)
    const result = await $`cd ${testDir} && bun run ${scriptsDir}/branch-command.ts list`.text();

    // Should show the old branch
    expect(result).toContain("nprbst/old-branch");
  });

  test("T083: PR suggestion in single-repo works unchanged", async () => {
    // Create a branch
    await $`cd ${testDir} && bun run ${scriptsDir}/branch-command.ts create nprbst/pr-test --base main --spec 001-test-feature`.quiet();
    await $`cd ${testDir} && git checkout nprbst/pr-test`.quiet();

    // Get PR suggestion
    const result = await $`cd ${testDir} && bun run ${scriptsDir}/branch-command.ts confirm`.nothrow();

    // Should exit with code 2 (PR suggestion mode)
    expect(result.exitCode).toBe(2);

    // Should show PR suggestion
    const output = result.stdout.toString();
    expect(output).toContain("pr-test");

    // Should NOT have [repo-name] prefix (single-repo mode)
    expect(output).not.toMatch(/\[.*\]/);
  });
});
