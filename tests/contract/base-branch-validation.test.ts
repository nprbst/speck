/**
 * Contract Test: Base Branch Validation (T017)
 *
 * Validates that cross-repo base branch dependencies are rejected:
 * - Exit code 1 when base branch doesn't exist in current repo
 * - Error message explains cross-repo limitation
 * - Suggests alternatives for cross-repo coordination
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
import { $ } from "bun";

describe("Contract: Base branch validation", () => {
  let fixture: MultiRepoTestFixture;

  beforeEach(async () => {
    // Create multi-repo with two child repos
    fixture = await createMultiRepoTestFixture([
      { name: "backend-service" },
      { name: "frontend-app" }
    ], "007-multi-repo-monorepo-support");
  });

  afterEach(async () => {
    await fixture.cleanup();
  });

  test("T017: Creating branch with non-existent base exits with code 1", async () => {
    const childRepo = fixture.childRepos.get("backend-service")!;

    // Attempt to create branch with non-existent base
    const result = await $`
      cd ${childRepo} && \
      bun run ${process.cwd()}/.speck/scripts/branch-command.ts create nprbst/auth-api --base nprbst/non-existent
    `.nothrow();

    // Contract: Exit code 1 indicates validation error
    expect(result.exitCode).toBe(1);
  });

  test("T017: Error message explains cross-repo limitation", async () => {
    const childRepo = fixture.childRepos.get("backend-service")!;

    // Attempt to create branch with non-existent base
    const result = await $`
      cd ${childRepo} && \
      bun run ${process.cwd()}/.speck/scripts/branch-command.ts create nprbst/auth-api --base nprbst/from-other-repo
    `.nothrow();

    const stderr = result.stderr.toString();

    // Contract: Error message mentions cross-repo dependencies
    expect(stderr).toContain("does not exist");
    expect(stderr).toContain("current repository");
  });

  test("T017: Error message suggests alternatives", async () => {
    const childRepo = fixture.childRepos.get("backend-service")!;

    // Attempt to create branch with non-existent base
    const result = await $`
      cd ${childRepo} && \
      bun run ${process.cwd()}/.speck/scripts/branch-command.ts create nprbst/auth-api --base nprbst/non-existent
    `.nothrow();

    const stderr = result.stderr.toString();

    // Contract: Error message includes at least 2 alternatives
    expect(stderr).toContain("Alternatives");
    expect(stderr.match(/\d\./g)?.length).toBeGreaterThanOrEqual(2);
  });

  test("T017: Valid local base branch succeeds", async () => {
    const childRepo = fixture.childRepos.get("backend-service")!;

    // Create first branch
    await $`
      cd ${childRepo} && \
      bun run ${process.cwd()}/.speck/scripts/branch-command.ts create nprbst/auth-db --base main --spec 009-multi-repo-stacked
    `.quiet();

    // Create second branch based on first (valid local base)
    const result = await $`
      cd ${childRepo} && \
      bun run ${process.cwd()}/.speck/scripts/branch-command.ts create nprbst/auth-api --base nprbst/auth-db
    `.nothrow();

    // Contract: Exit code 0 for valid local base
    expect(result.exitCode).toBe(0);
  });

  test("T017: Base branch validation happens before git operations", async () => {
    const childRepo = fixture.childRepos.get("backend-service")!;

    // Attempt to create branch with invalid base
    const result = await $`
      cd ${childRepo} && \
      bun run ${process.cwd()}/.speck/scripts/branch-command.ts create nprbst/auth-api --base nprbst/invalid
    `.nothrow();

    // Contract: Git branch should NOT be created
    const gitBranches = await $`git -C ${childRepo} branch --list nprbst/auth-api`.quiet();
    expect(gitBranches.text().trim()).toBe("");
  });

  test("T017: Validation allows tracked branches as base", async () => {
    const childRepo = fixture.childRepos.get("backend-service")!;

    // Create first branch
    await $`
      cd ${childRepo} && \
      bun run ${process.cwd()}/.speck/scripts/branch-command.ts create nprbst/auth-db --base main --spec 009-multi-repo-stacked
    `.quiet();

    // Create second branch based on tracked branch
    const result = await $`
      cd ${childRepo} && \
      bun run ${process.cwd()}/.speck/scripts/branch-command.ts create nprbst/auth-api --base nprbst/auth-db
    `.nothrow();

    // Contract: Tracked branches are valid bases
    expect(result.exitCode).toBe(0);
  });

  test("T017: Validation rejects branches from other child repos", async () => {
    const backendRepo = fixture.childRepos.get("backend-service")!;
    const frontendRepo = fixture.childRepos.get("frontend-app")!;

    // Create branch in backend repo
    await $`
      cd ${backendRepo} && \
      bun run ${process.cwd()}/.speck/scripts/branch-command.ts create nprbst/backend-auth --base main --spec 009-multi-repo-stacked
    `.quiet();

    // Attempt to create branch in frontend repo using backend branch as base
    const result = await $`
      cd ${frontendRepo} && \
      bun run ${process.cwd()}/.speck/scripts/branch-command.ts create nprbst/frontend-auth --base nprbst/backend-auth
    `.nothrow();

    // Contract: Cross-repo base branches rejected with exit code 1
    expect(result.exitCode).toBe(1);

    const stderr = result.stderr.toString();
    expect(stderr).toContain("does not exist");
  });

  test("T017: Validation allows main/master/develop as base branches", async () => {
    const childRepo = fixture.childRepos.get("backend-service")!;

    // Test with main
    const result1 = await $`
      cd ${childRepo} && \
      bun run ${process.cwd()}/.speck/scripts/branch-command.ts create nprbst/feature-1 --base main --spec 009-multi-repo-stacked
    `.nothrow();
    expect(result1.exitCode).toBe(0);

    // Create develop branch and test
    await $`git -C ${childRepo} branch develop`.quiet();
    const result2 = await $`
      cd ${childRepo} && \
      bun run ${process.cwd()}/.speck/scripts/branch-command.ts create nprbst/feature-2 --base develop
    `.nothrow();
    expect(result2.exitCode).toBe(0);
  });
});
