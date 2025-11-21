import { describe, test, expect, beforeEach } from "bun:test";
import { $ } from "bun";
import { createMultiRepoTestSetup } from "../helpers/multi-repo-fixtures";
import type { MultiRepoTestSetup } from "../helpers/multi-repo-fixtures";

/**
 * T050: Contract test for cross-repo base validation error format
 *
 * Validates that attempting to use a base branch from a different repository
 * produces a clear error message with actionable alternatives.
 */

describe("Cross-Repo Base Validation Error Format", () => {
  let fixture: MultiRepoTestSetup;

  beforeEach(async () => {
    fixture = await createMultiRepoTestSetup({
      childRepos: ["backend-service", "frontend-app"],
      rootBranches: [],
      childBranches: {},
    });
  });

  test("T050: Error message includes cross-repo validation failure details", async () => {
    const backendRepo = fixture.childRepos.get("backend-service")!;

    // Try to create branch with non-existent base (simulating cross-repo reference)
    const result = await $`
      cd ${backendRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/test-branch --base nprbst/from-other-repo --spec 009-multi-repo-stacked
    `.nothrow();

    // Contract: Exit code 1 (error)
    expect(result.exitCode).toBe(1);

    // Contract: Error message mentions the invalid base branch
    const stderr = result.stderr.toString();
    expect(stderr).toContain("nprbst/from-other-repo");
    expect(stderr).toContain("does not exist");

    // Contract: Error message mentions cross-repo limitation
    expect(stderr).toContain("Cross-repo");
  });

  test("T050: Error format is consistent across different invalid base branches", async () => {
    const backendRepo = fixture.childRepos.get("backend-service")!;

    // Test with different invalid base branch names
    const invalidBases = ["nprbst/nonexistent", "feature/from-root", "main-other-repo"];

    for (const invalidBase of invalidBases) {
      const result = await $`
        cd ${backendRepo} && \
        bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/test-${invalidBase} --base ${invalidBase} --spec 009-multi-repo-stacked
      `.nothrow();

      expect(result.exitCode).toBe(1);
      expect(result.stderr.toString()).toContain("does not exist");
      expect(result.stderr.toString()).toContain(invalidBase);
    }
  });

  test("T050: Valid base branch in same repo succeeds", async () => {
    const backendRepo = fixture.childRepos.get("backend-service")!;

    // Create first branch successfully
    const result1 = await $`
      cd ${backendRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/base-branch --base main --spec 009-multi-repo-stacked --skip-pr-prompt
    `.quiet();

    expect(result1.exitCode).toBe(0);

    // Create second branch based on first (should succeed)
    const result2 = await $`
      cd ${backendRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/stacked-branch --base nprbst/base-branch --spec 009-multi-repo-stacked --skip-pr-prompt
    `.quiet();

    expect(result2.exitCode).toBe(0);
  });
});
