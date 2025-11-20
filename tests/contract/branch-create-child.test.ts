/**
 * Contract Test: Branch Creation in Child Repo (T014)
 *
 * Validates that `/speck.branch create` in a multi-repo child context:
 * - Exits with code 0 on success
 * - Creates .speck/branches.json in child repo (not root)
 * - Populates parentSpecId field correctly
 *
 * Feature: 009-multi-repo-stacked (User Story 1)
 * Layer: 1 (Contract)
 * Created: 2025-11-19
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import {
  createMultiRepoTestFixture,
  type MultiRepoTestFixture
} from "../helpers/multi-repo-fixtures.ts";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { $ } from "bun";

describe("Contract: Branch creation in child repo", () => {
  let fixture: MultiRepoTestFixture;

  beforeEach(async () => {
    // Set up multi-repo environment with one child
    fixture = await createMultiRepoTestFixture([
      { name: "backend-service" }
    ], "007-multi-repo-monorepo-support");
  });

  afterEach(async () => {
    await fixture.cleanup();
  });

  test("T014: Branch creation in child repo exits with code 0", async () => {
    const childRepo = fixture.childRepos.get("backend-service")!;

    // Navigate to child repo and create branch
    const result = await $`
      cd ${childRepo} && \
      bun run ${process.cwd()}/.speck/scripts/branch-command.ts create nprbst/auth-db --base main --spec 009-multi-repo-stacked
    `.nothrow();

    // Contract: Exit code 0 on success
    expect(result.exitCode).toBe(0);
  });

  test("T014: Branch creation creates .speck/branches.json in child repo", async () => {
    const childRepo = fixture.childRepos.get("backend-service")!;
    const branchesJsonPath = path.join(childRepo, ".speck", "branches.json");

    // Verify branches.json does NOT exist yet
    expect(existsSync(branchesJsonPath)).toBe(false);

    // Create branch in child repo
    await $`
      cd ${childRepo} && \
      bun run ${process.cwd()}/.speck/scripts/branch-command.ts create nprbst/auth-db --base main --spec 009-multi-repo-stacked
    `.quiet();

    // Contract: branches.json created in child repo (not root)
    expect(existsSync(branchesJsonPath)).toBe(true);

    // Verify NOT created in root
    const rootBranchesJsonPath = path.join(fixture.rootDir, ".speck", "branches.json");
    expect(existsSync(rootBranchesJsonPath)).toBe(false);
  });

  test("T014: Branch creation populates parentSpecId field", async () => {
    const childRepo = fixture.childRepos.get("backend-service")!;
    const branchesJsonPath = path.join(childRepo, ".speck", "branches.json");

    // Create branch in child repo
    await $`
      cd ${childRepo} && \
      bun run ${process.cwd()}/.speck/scripts/branch-command.ts create nprbst/auth-db --base main --spec 009-multi-repo-stacked
    `.quiet();

    // Read branches.json
    const content = await readFile(branchesJsonPath, "utf-8");
    const branchMapping = JSON.parse(content);

    // Contract: parentSpecId field present
    expect(branchMapping.branches).toHaveLength(1);
    expect(branchMapping.branches[0].parentSpecId).toBe("007-multi-repo-monorepo-support");
  });

  test("T014: Branch creation with existing branches preserves parentSpecId", async () => {
    const childRepo = fixture.childRepos.get("backend-service")!;
    const branchesJsonPath = path.join(childRepo, ".speck", "branches.json");

    // Create first branch
    await $`
      cd ${childRepo} && \
      bun run ${process.cwd()}/.speck/scripts/branch-command.ts create nprbst/auth-db --base main --spec 009-multi-repo-stacked
    `.quiet();

    // Create second branch stacked on first
    await $`
      cd ${childRepo} && \
      bun run ${process.cwd()}/.speck/scripts/branch-command.ts create nprbst/auth-api --base nprbst/auth-db
    `.quiet();

    // Read branches.json
    const content = await readFile(branchesJsonPath, "utf-8");
    const branchMapping = JSON.parse(content);

    // Contract: Both branches have parentSpecId
    expect(branchMapping.branches).toHaveLength(2);
    expect(branchMapping.branches[0].parentSpecId).toBe("007-multi-repo-monorepo-support");
    expect(branchMapping.branches[1].parentSpecId).toBe("007-multi-repo-monorepo-support");
  });
});
