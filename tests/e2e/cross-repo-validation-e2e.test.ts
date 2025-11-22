/**
 * E2E Test: Cross-Repo Branch Dependency Validation (T027)
 *
 * Validates that attempts to create branches with base branches from different
 * repositories are properly rejected with clear error messages and suggested alternatives.
 *
 * Feature: 009-multi-repo-stacked (User Story 1)
 * Layer: 3 (E2E)
 * Created: 2025-11-19
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { $ } from "bun";
import type { MultiRepoTestFixture } from "../helpers/multi-repo-fixtures";
import { createMultiRepoTestFixture } from "../helpers/multi-repo-fixtures";

describe("E2E: Cross-repo branch dependency validation", () => {
  let fixture: MultiRepoTestFixture;

  beforeEach(async () => {
    // Set up multi-repo environment with two children
    fixture = await createMultiRepoTestFixture([
      { name: "backend-service" },
      { name: "frontend-app" }
    ], "007-multi-repo-monorepo-support");
  });

  afterEach(async () => {
    await fixture.cleanup();
  });

  test("T027: Reject cross-repo base branch with clear error message", async () => {
    const backendRepo = fixture.childRepos.get("backend-service")!;
    const frontendRepo = fixture.childRepos.get("frontend-app")!;

    // Create a branch in backend repo
    await $`
      cd ${backendRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/backend-auth --base main --spec 009-multi-repo-stacked
    `.quiet();

    // Attempt to create branch in frontend repo with base from backend
    const result = await $`
      cd ${frontendRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/frontend-auth --base nprbst/backend-auth --spec 009-multi-repo-stacked
    `.nothrow();

    // E2E: Verify command failed
    expect(result.exitCode).toBe(1);

    const stderr = result.stderr.toString();

    // E2E: Verify error message contains key information
    expect(stderr).toContain("does not exist");
    expect(stderr).toContain("nprbst/backend-auth");
  });

  test("T027: Error message includes helpful alternatives", async () => {
    const backendRepo = fixture.childRepos.get("backend-service")!;
    const frontendRepo = fixture.childRepos.get("frontend-app")!;

    // Create a branch in backend repo
    await $`
      cd ${backendRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/api-layer --base main --spec 009-multi-repo-stacked
    `.quiet();

    // Attempt cross-repo dependency
    const result = await $`
      cd ${frontendRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/ui-layer --base nprbst/api-layer --spec 009-multi-repo-stacked
    `.nothrow();

    const stderr = result.stderr.toString();

    // E2E: Verify error includes actionable guidance
    // The error should suggest using main or another valid base
    expect(stderr).toContain("nprbst/api-layer");
    expect(result.exitCode).not.toBe(0);
  });

  test("T027: Valid local base branch works correctly", async () => {
    const backendRepo = fixture.childRepos.get("backend-service")!;

    // Create first branch
    await $`
      cd ${backendRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/db-layer --base main --spec 009-multi-repo-stacked
    `.quiet();

    await $`
      cd ${backendRepo} && \
      git add .speck/branches.json && \
      git commit -m "Add db layer"
    `.quiet();

    // Create second branch based on first (same repo - should work)
    const result = await $`
      cd ${backendRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/api-layer --base nprbst/db-layer --spec 009-multi-repo-stacked
    `;

    // E2E: Verify success
    expect(result.exitCode).toBe(0);
    const stdout = result.stdout.toString();
    expect(stdout).toContain("✓ Created stacked branch");
    expect(stdout).toContain("nprbst/api-layer");
    expect(stdout).toContain("Based on: nprbst/db-layer");
  });

  test("T027: Base branch validation works with main branch", async () => {
    const frontendRepo = fixture.childRepos.get("frontend-app")!;

    // Create branch based on main (always valid)
    const result = await $`
      cd ${frontendRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/login-ui --base main --spec 009-multi-repo-stacked
    `;

    // E2E: Verify success
    expect(result.exitCode).toBe(0);
    const stdout = result.stdout.toString();
    expect(stdout).toContain("✓ Created stacked branch");
    expect(stdout).toContain("nprbst/login-ui");
    expect(stdout).toContain("Based on: main");
  });

  test("T027: Non-existent local base branch also fails with error", async () => {
    const backendRepo = fixture.childRepos.get("backend-service")!;

    // Attempt to use non-existent base branch
    const result = await $`
      cd ${backendRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/new-feature --base nprbst/does-not-exist --spec 009-multi-repo-stacked
    `.nothrow();

    // E2E: Verify command failed
    expect(result.exitCode).toBe(1);

    const stderr = result.stderr.toString();

    // E2E: Verify error message mentions the missing branch
    expect(stderr).toContain("does not exist");
    expect(stderr).toContain("nprbst/does-not-exist");
  });
});
