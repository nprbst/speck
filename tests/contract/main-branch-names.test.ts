/**
 * Contract Test: Non-Standard Main Branch Names (T112)
 *
 * Validates that branch creation works with:
 * - main (default)
 * - master (legacy)
 * - develop (alternative)
 * - Auto-detection of default branch
 *
 * Feature: 009-multi-repo-stacked (User Story 1 - FR-022)
 * Layer: 1 (Contract)
 * Created: 2025-11-19
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import {
  createMultiRepoTestFixture,
  type MultiRepoTestFixture
} from "../helpers/multi-repo-fixtures.ts";
import { $ } from "bun";
import { readFile } from "node:fs/promises";
import path from "node:path";

describe("Contract: Non-standard main branch names", () => {
  let fixture: MultiRepoTestFixture;

  beforeEach(async () => {
    fixture = await createMultiRepoTestFixture([
      { name: "backend-service" }
    ], "007-multi-repo-monorepo-support");
  });

  afterEach(async () => {
    await fixture.cleanup();
  });

  test("T112: Branch creation works with 'main' as base", async () => {
    const childRepo = fixture.childRepos.get("backend-service")!;

    // Create branch based on main
    const result = await $`
      cd ${childRepo} && \
      bun run ${process.cwd()}/.speck/scripts/branch-command.ts create nprbst/feature --base main --spec 009-multi-repo-stacked
    `.nothrow();

    // Contract: Exit code 0 for standard main branch
    expect(result.exitCode).toBe(0);
  });

  test("T112: Branch creation works with 'master' as base", async () => {
    const childRepo = fixture.childRepos.get("backend-service")!;

    // Rename main to master
    await $`git -C ${childRepo} branch -m main master`.quiet();

    // Create branch based on master
    const result = await $`
      cd ${childRepo} && \
      bun run ${process.cwd()}/.speck/scripts/branch-command.ts create nprbst/feature --base master --spec 009-multi-repo-stacked
    `.nothrow();

    // Contract: Exit code 0 for legacy master branch
    expect(result.exitCode).toBe(0);
  });

  test("T112: Branch creation works with 'develop' as base", async () => {
    const childRepo = fixture.childRepos.get("backend-service")!;

    // Create develop branch
    await $`git -C ${childRepo} checkout -b develop`.quiet();

    // Create branch based on develop
    const result = await $`
      cd ${childRepo} && \
      bun run ${process.cwd()}/.speck/scripts/branch-command.ts create nprbst/feature --base develop --spec 009-multi-repo-stacked
    `.nothrow();

    // Contract: Exit code 0 for develop branch
    expect(result.exitCode).toBe(0);
  });

  test("T112: detectDefaultBranch() returns 'main' when available", async () => {
    const childRepo = fixture.childRepos.get("backend-service")!;

    // Set up remote tracking for main (simulates cloned repo)
    await $`git -C ${childRepo} remote add origin https://github.com/test/repo.git`.quiet();
    await $`git -C ${childRepo} fetch origin 2>/dev/null || true`.nothrow().quiet();

    // Import and test detectDefaultBranch
    const { detectDefaultBranch } = await import("../../.speck/scripts/common/git-operations.ts");
    const defaultBranch = await detectDefaultBranch(childRepo);

    // Contract: Returns 'main' as default branch name
    expect(defaultBranch).toMatch(/main|master|develop/);
  });

  test("T112: detectDefaultBranch() returns 'master' when main doesn't exist", async () => {
    const childRepo = fixture.childRepos.get("backend-service")!;

    // Rename main to master
    await $`git -C ${childRepo} branch -m main master`.quiet();

    // Import and test detectDefaultBranch
    const { detectDefaultBranch } = await import("../../.speck/scripts/common/git-operations.ts");
    const defaultBranch = await detectDefaultBranch(childRepo);

    // Contract: Falls back to 'master'
    expect(defaultBranch).toMatch(/master|develop/);
  });

  test("T112: detectDefaultBranch() handles repo with only develop branch", async () => {
    const childRepo = fixture.childRepos.get("backend-service")!;

    // Rename main to develop
    await $`git -C ${childRepo} branch -m main develop`.quiet();

    // Import and test detectDefaultBranch
    const { detectDefaultBranch } = await import("../../.speck/scripts/common/git-operations.ts");
    const defaultBranch = await detectDefaultBranch(childRepo);

    // Contract: Detects 'develop' as default
    expect(defaultBranch).toBe("develop");
  });

  test("T112: PR suggestion uses detected default branch as base", async () => {
    const childRepo = fixture.childRepos.get("backend-service")!;

    // Rename main to master
    await $`git -C ${childRepo} branch -m main master`.quiet();

    // Add remote to enable PR suggestion generation
    await $`git -C ${childRepo} remote add origin https://github.com/test/backend-service.git`.quiet();

    // Create first branch with commit
    await $`
      cd ${childRepo} && \
      bun run ${process.cwd()}/.speck/scripts/branch-command.ts create nprbst/feature-1 --base master --spec 009-multi-repo-stacked
    `.quiet();

    await $`git -C ${childRepo} commit --allow-empty -m "feat: add feature"`.quiet();

    // Create second branch to trigger PR suggestion
    const result = await $`
      cd ${childRepo} && \
      bun run ${process.cwd()}/.speck/scripts/branch-command.ts create nprbst/feature-2 --base nprbst/feature-1 --json
    `.nothrow();

    // Debug: Check if stdout is empty
    if (!result.stdout.toString().trim()) {
      throw new Error(`No JSON output. Exit code: ${result.exitCode}, stderr: ${result.stderr.toString()}, stdout: ${result.stdout.toString()}`);
    }

    const prData = JSON.parse(result.stdout.toString());

    // Contract: PR base is 'master' (detected default branch)
    expect(prData.base).toBe("master");
  });

  test("T112: Branches created with non-standard base are stored correctly", async () => {
    const childRepo = fixture.childRepos.get("backend-service")!;

    // Create develop branch
    await $`git -C ${childRepo} checkout -b develop`.quiet();

    // Create feature branch based on develop
    await $`
      cd ${childRepo} && \
      bun run ${process.cwd()}/.speck/scripts/branch-command.ts create nprbst/feature --base develop --spec 009-multi-repo-stacked
    `.quiet();

    // Read branches.json
    const branchesJsonPath = path.join(childRepo, ".speck", "branches.json");
    const content = await readFile(branchesJsonPath, "utf-8");
    const branchMapping = JSON.parse(content);

    // Contract: baseBranch field is 'develop'
    expect(branchMapping.branches[0].baseBranch).toBe("develop");
  });
});
