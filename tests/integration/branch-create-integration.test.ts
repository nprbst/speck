/**
 * Integration Test: Branch Create in Multi-Repo Child (T024)
 *
 * Verifies that `/speck.branch create` command properly invokes
 * branch-command.ts with correct arguments in multi-repo child context.
 *
 * Feature: 009-multi-repo-stacked (User Story 1)
 * Layer: 2 (Integration)
 * Created: 2025-11-19
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { $ } from "bun";
import path from "node:path";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import type { MultiRepoTestFixture } from "../helpers/multi-repo-fixtures";
import { createMultiRepoTestFixture } from "../helpers/multi-repo-fixtures";

describe("Integration: Branch creation in multi-repo child", () => {
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

  test("T024: /speck.branch create invokes branch-command.ts with correct args", async () => {
    const childRepo = fixture.childRepos.get("backend-service")!;
    const branchesJsonPath = path.join(childRepo, ".speck", "branches.json");

    // Execute branch creation via isolated script
    const result = await $`
      cd ${childRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/auth-db --base main --spec 009-multi-repo-stacked
    `.nothrow();

    // Integration test: Verify command succeeded
    expect(result.exitCode).toBe(0);

    // Verify branches.json was created
    expect(existsSync(branchesJsonPath)).toBe(true);

    // Verify the branch entry has correct structure
    const content = await readFile(branchesJsonPath, "utf-8");
    const branchMapping = JSON.parse(content);

    expect(branchMapping.branches).toHaveLength(1);
    expect(branchMapping.branches[0].name).toBe("nprbst/auth-db");
    expect(branchMapping.branches[0].baseBranch).toBe("main");
    expect(branchMapping.branches[0].specId).toBe("009-multi-repo-stacked");
    expect(branchMapping.branches[0].parentSpecId).toBe("007-multi-repo-monorepo-support");
  });

  test("T024: Branch creation in child repo does not affect root repo", async () => {
    const childRepo = fixture.childRepos.get("backend-service")!;
    const rootBranchesJsonPath = path.join(fixture.rootDir, ".speck", "branches.json");

    // Create branch in child repo
    await $`
      cd ${childRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/child-branch --base main --spec 009-multi-repo-stacked
    `.quiet();

    // Verify root repo branches.json NOT created
    expect(existsSync(rootBranchesJsonPath)).toBe(false);
  });

  test("T024: Multiple branch creations in child repo build correct stack", async () => {
    const childRepo = fixture.childRepos.get("backend-service")!;
    const branchesJsonPath = path.join(childRepo, ".speck", "branches.json");

    // Create first branch
    await $`
      cd ${childRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/auth-db --base main --spec 009-multi-repo-stacked
    `.quiet();

    // Commit the branches.json change to avoid uncommitted changes warning
    await $`
      cd ${childRepo} && \
      git add .speck/branches.json && \
      git commit -m "Add first branch"
    `.quiet();

    // Create second branch stacked on first
    await $`
      cd ${childRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/auth-api --base nprbst/auth-db --spec 009-multi-repo-stacked
    `.quiet();

    // Verify both branches exist with correct relationships
    const content = await readFile(branchesJsonPath, "utf-8");
    const branchMapping = JSON.parse(content);

    expect(branchMapping.branches).toHaveLength(2);

    const firstBranch = branchMapping.branches.find((b: any) => b.name === "nprbst/auth-db");
    const secondBranch = branchMapping.branches.find((b: any) => b.name === "nprbst/auth-api");

    expect(firstBranch.baseBranch).toBe("main");
    expect(secondBranch.baseBranch).toBe("nprbst/auth-db");

    // Both should have same parentSpecId
    expect(firstBranch.parentSpecId).toBe("007-multi-repo-monorepo-support");
    expect(secondBranch.parentSpecId).toBe("007-multi-repo-monorepo-support");
  });

  test("T024: Branch creation validates arguments correctly", async () => {
    const childRepo = fixture.childRepos.get("backend-service")!;

    // Test missing branch name
    const result1 = await $`
      cd ${childRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create
    `.nothrow();

    expect(result1.exitCode).not.toBe(0);
    expect(result1.stderr.toString()).toContain("Branch name required");

    // Test invalid spec ID
    const result2 = await $`
      cd ${childRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create test-branch --spec invalid-spec
    `.nothrow();

    expect(result2.exitCode).not.toBe(0);
    expect(result2.stderr.toString()).toContain("Spec directory not found");
  });
});
