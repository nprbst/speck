/**
 * E2E Test: Branch Import in Child Repo Complete Workflow (T063)
 *
 * Validates the complete end-to-end workflow for importing existing git branches
 * in a multi-repo child repository, including:
 * - Branch import with parentSpecId
 * - Batch mode import
 * - Interactive mode prompt
 * - Metadata persistence with correct schema version
 *
 * Feature: 009-multi-repo-stacked (User Story 5)
 * Layer: 3 (E2E)
 * Created: 2025-11-20
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { $ } from "bun";
import path from "node:path";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import type { MultiRepoTestFixture } from "../helpers/multi-repo-fixtures";
import { createMultiRepoTestFixture } from "../helpers/multi-repo-fixtures";

describe("E2E: Complete branch import workflow in child repo", () => {
  let fixture: MultiRepoTestFixture;

  beforeEach(async () => {
    // Set up multi-repo environment with one child
    fixture = await createMultiRepoTestFixture([
      { name: "backend-service" }
    ], "007-multi-repo-monorepo-support");
  });

  afterEach(async () => {
    await fixture?.cleanup();
  });

  test("T063: Complete workflow - import single branch in child repo", async () => {
    const childRepo = fixture.childRepos.get("backend-service")!;
    const branchesJsonPath = path.join(childRepo, ".speck", "branches.json");

    // Create manual git branch (not using speck)
    await $`git -C ${childRepo} checkout -b feature/auth-system`.quiet();
    await $`git -C ${childRepo} checkout main`.quiet();

    // Execute import with batch mode
    const result = await $`
      cd ${childRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts import --batch feature/auth-system:009-multi-repo-stacked
    `;

    const stdout = result.stdout.toString();

    // E2E: Verify success indicators in output
    expect(stdout).toContain("✓ Imported feature/auth-system");
    expect(stdout).toContain("009-multi-repo-stacked");
    expect(stdout).toContain("Import complete");
    expect(stdout).toContain("Imported: 1");

    // E2E: Verify branches.json created with correct structure
    expect(existsSync(branchesJsonPath)).toBe(true);

    const content = await readFile(branchesJsonPath, "utf-8");
    const branchMapping = JSON.parse(content);

    // E2E: Verify schema version is 1.1.0 (multi-repo)
    expect(branchMapping.version).toBe("1.1.0");
    expect(branchMapping.branches).toHaveLength(1);

    const importedBranch = branchMapping.branches[0];
    expect(importedBranch.name).toBe("feature/auth-system");
    expect(importedBranch.baseBranch).toBe("main");
    expect(importedBranch.specId).toBe("009-multi-repo-stacked");
    expect(importedBranch.status).toBe("active");

    // E2E: Critical - verify parentSpecId is set for child repo
    expect(importedBranch.parentSpecId).toBe("007-multi-repo-monorepo-support");

    // E2E: Verify required fields present
    expect(importedBranch.createdAt).toBeDefined();
    expect(importedBranch.updatedAt).toBeDefined();
    expect(importedBranch.pr).toBe(null);
  });

  test("T063: Complete workflow - import multiple branches with batch mode", async () => {
    const childRepo = fixture.childRepos.get("backend-service")!;
    const branchesJsonPath = path.join(childRepo, ".speck", "branches.json");

    // Create multiple manual git branches
    await $`git -C ${childRepo} checkout -b feature/auth`.quiet();
    await $`git -C ${childRepo} checkout -b feature/api`.quiet();
    await $`git -C ${childRepo} checkout -b feature/ui`.quiet();
    await $`git -C ${childRepo} checkout main`.quiet();

    // Execute batch import for all branches
    const result = await $`
      cd ${childRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts import --batch \
        feature/auth:009-multi-repo-stacked \
        feature/api:009-multi-repo-stacked \
        feature/ui:009-multi-repo-stacked
    `;

    const stdout = result.stdout.toString();

    // E2E: Verify all branches imported
    expect(stdout).toContain("✓ Imported feature/auth");
    expect(stdout).toContain("✓ Imported feature/api");
    expect(stdout).toContain("✓ Imported feature/ui");
    expect(stdout).toContain("Imported: 3");

    // E2E: Verify all branches in branches.json with parentSpecId
    const content = await readFile(branchesJsonPath, "utf-8");
    const branchMapping = JSON.parse(content);

    expect(branchMapping.branches).toHaveLength(3);

    const branchNames = branchMapping.branches.map((b: any) => b.name);
    expect(branchNames).toContain("feature/auth");
    expect(branchNames).toContain("feature/api");
    expect(branchNames).toContain("feature/ui");

    // E2E: Verify all have parentSpecId
    branchMapping.branches.forEach((branch: any) => {
      expect(branch.parentSpecId).toBe("007-multi-repo-monorepo-support");
      expect(branch.specId).toBe("009-multi-repo-stacked");
    });
  });

  test("T063: Complete workflow - interactive mode shows prompt with exit code 3", async () => {
    const childRepo = fixture.childRepos.get("backend-service")!;

    // Create manual git branch
    await $`git -C ${childRepo} checkout -b feature/new-feature`.quiet();
    await $`git -C ${childRepo} checkout main`.quiet();

    // Execute import without --batch flag (interactive mode)
    const result = await $`
      cd ${childRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts import
    `.nothrow();

    const stdout = result.stdout.toString();
    const stderr = result.stderr.toString();

    // E2E: Verify interactive prompt triggered
    expect(result.exitCode).toBe(3);

    // E2E: Verify branch information displayed
    expect(stdout).toContain("feature/new-feature");
    expect(stdout).toContain("Available specs:");
    expect(stdout).toContain("009-multi-repo-stacked");

    // E2E: Verify JSON output for agent parsing
    expect(stderr).toContain("type");
    expect(stderr).toContain("import-prompt");
  });

  test("T063: Complete workflow - import with inferred base branch", async () => {
    const childRepo = fixture.childRepos.get("backend-service")!;
    const branchesJsonPath = path.join(childRepo, ".speck", "branches.json");

    // Create a base branch and a stacked branch
    await $`git -C ${childRepo} checkout -b feature/base`.quiet();
    await $`git -C ${childRepo} commit --allow-empty -m "base commit"`.quiet();

    await $`git -C ${childRepo} checkout -b feature/stacked`.quiet();
    await $`git -C ${childRepo} commit --allow-empty -m "stacked commit"`.quiet();
    await $`git -C ${childRepo} checkout main`.quiet();

    // Import both branches
    const result = await $`
      cd ${childRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts import --batch \
        feature/base:009-multi-repo-stacked \
        feature/stacked:009-multi-repo-stacked
    `;

    const stdout = result.stdout.toString();

    // E2E: Verify both branches imported
    expect(stdout).toContain("✓ Imported feature/base");
    expect(stdout).toContain("✓ Imported feature/stacked");

    // E2E: Verify base branch inference
    const content = await readFile(branchesJsonPath, "utf-8");
    const branchMapping = JSON.parse(content);

    const baseBranch = branchMapping.branches.find((b: any) => b.name === "feature/base");
    const stackedBranch = branchMapping.branches.find((b: any) => b.name === "feature/stacked");

    // Both should have main as base (simple inference for now)
    expect(baseBranch.baseBranch).toBe("main");
    expect(stackedBranch.baseBranch).toBe("main");
  });

  test("T063: Complete workflow - import skips default branch (main)", async () => {
    const childRepo = fixture.childRepos.get("backend-service")!;

    // Only main branch exists (created by fixture)
    // Run import - should exit cleanly with message
    const result = await $`
      cd ${childRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts import
    `.nothrow();

    const stdout = result.stdout.toString();

    // E2E: Verify no import attempted (main excluded)
    expect(result.exitCode).toBe(0);
    expect(stdout).toMatch(/No branches found|All branches are already in stacked mode/);
  });

  test("T063: Complete workflow - specIndex updated correctly", async () => {
    const childRepo = fixture.childRepos.get("backend-service")!;
    const branchesJsonPath = path.join(childRepo, ".speck", "branches.json");

    // Create and import branch
    await $`git -C ${childRepo} checkout -b feature/test`.quiet();
    await $`git -C ${childRepo} checkout main`.quiet();

    await $`
      cd ${childRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts import --batch feature/test:009-multi-repo-stacked
    `.quiet();

    // E2E: Verify specIndex contains the branch
    const content = await readFile(branchesJsonPath, "utf-8");
    const branchMapping = JSON.parse(content);

    expect(branchMapping.specIndex).toHaveProperty("009-multi-repo-stacked");
    expect(branchMapping.specIndex["009-multi-repo-stacked"]).toContain("feature/test");
  });

  test("T063: Complete workflow - import preserves existing branches", async () => {
    const childRepo = fixture.childRepos.get("backend-service")!;
    const branchesJsonPath = path.join(childRepo, ".speck", "branches.json");

    // Create first branch using speck
    await $`
      cd ${childRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/existing --base main --spec 009-multi-repo-stacked
    `.quiet();

    // Create second branch manually
    await $`git -C ${childRepo} checkout -b feature/imported`.quiet();
    await $`git -C ${childRepo} checkout main`.quiet();

    // Import the manual branch
    await $`
      cd ${childRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts import --batch feature/imported:009-multi-repo-stacked
    `.quiet();

    // E2E: Verify both branches present
    const content = await readFile(branchesJsonPath, "utf-8");
    const branchMapping = JSON.parse(content);

    expect(branchMapping.branches).toHaveLength(2);

    const branchNames = branchMapping.branches.map((b: any) => b.name);
    expect(branchNames).toContain("nprbst/existing");
    expect(branchNames).toContain("feature/imported");

    // E2E: Verify both have parentSpecId
    branchMapping.branches.forEach((branch: any) => {
      expect(branch.parentSpecId).toBe("007-multi-repo-monorepo-support");
    });
  });
});
