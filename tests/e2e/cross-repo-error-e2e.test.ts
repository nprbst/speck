import { describe, test, expect, beforeEach } from "bun:test";
import { $ } from "bun";
import { createMultiRepoTestSetup } from "../helpers/multi-repo-fixtures";
import type { MultiRepoTestSetup } from "../helpers/multi-repo-fixtures";

/**
 * T055: E2E test validates complete error workflow with alternatives displayed
 *
 * End-to-end test for cross-repo branch dependency validation, ensuring
 * the complete user workflow produces clear, actionable error messages.
 */

describe("E2E: Cross-Repo Validation Error Workflow", () => {
  let fixture: MultiRepoTestSetup;

  beforeEach(async () => {
    fixture = await createMultiRepoTestSetup({
      childRepos: ["backend-service", "frontend-app"],
      rootBranches: [],
      childBranches: {
        "backend-service": [
          {
            name: "nprbst/backend-auth",
            baseBranch: "main",
            specId: "009-multi-repo-stacked",
            status: "active",
          },
        ],
      },
    });
  });

  test("T055: Complete workflow - user attempts cross-repo branch and receives clear guidance", async () => {
    const frontendRepo = fixture.childRepos.get("frontend-app")!;

    // E2E Scenario: Developer in frontend-app tries to base their work on backend branch
    const result = await $`
      cd ${frontendRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/frontend-ui --base nprbst/backend-auth --spec 009-multi-repo-stacked
    `.nothrow();

    // E2E: Operation fails with clear exit code
    expect(result.exitCode).toBe(1);

    const stderr = result.stderr.toString();

    // E2E: Error message identifies the invalid base branch
    expect(stderr).toContain("nprbst/backend-auth");
    expect(stderr).toContain("does not exist");

    // E2E: Error explains cross-repo limitation
    expect(stderr).toContain("Cross-repo");
    expect(stderr).toContain("not supported");

    // E2E: Error provides 3 actionable alternatives
    expect(stderr).toMatch(/Alternatives:/);
    expect(stderr).toMatch(/1\./);
    expect(stderr).toMatch(/2\./);
    expect(stderr).toMatch(/3\./);

    // E2E: Alternatives are specific and helpful
    expect(stderr).toMatch(/merge.*main/i);
    expect(stderr).toMatch(/contract|API/i);
    expect(stderr).toMatch(/coordinate/i);
  });

  test("T055: Workflow succeeds when using valid local base branch", async () => {
    const frontendRepo = fixture.childRepos.get("frontend-app")!;

    // E2E Scenario: Developer creates valid stacked branch in frontend repo
    const result1 = await $`
      cd ${frontendRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/login-ui --base main --spec 009-multi-repo-stacked --skip-pr-prompt
    `.quiet();

    expect(result1.exitCode).toBe(0);

    // E2E: Stack another branch on the first one
    const result2 = await $`
      cd ${frontendRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/profile-ui --base nprbst/login-ui --spec 009-multi-repo-stacked --skip-pr-prompt
    `.quiet();

    expect(result2.exitCode).toBe(0);

    // E2E: Verify both branches exist in frontend repo
    const branches = await $`git -C ${frontendRepo} branch --list 'nprbst/*'`.quiet();
    expect(branches.stdout.toString()).toContain("nprbst/login-ui");
    expect(branches.stdout.toString()).toContain("nprbst/profile-ui");
  });

  test("T055: Error message helps developer understand root cause", async () => {
    const backendRepo = fixture.childRepos.get("backend-service")!;
    const frontendRepo = fixture.childRepos.get("frontend-app")!;

    // E2E Setup: Create branch in backend
    await $`
      cd ${backendRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/api-v2 --base main --spec 009-multi-repo-stacked --skip-pr-prompt
    `.quiet();

    // E2E: Attempt to reference backend branch from frontend
    const result = await $`
      cd ${frontendRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/ui-v2 --base nprbst/api-v2 --spec 009-multi-repo-stacked
    `.nothrow();

    expect(result.exitCode).toBe(1);

    const stderr = result.stderr.toString();

    // E2E: Message explains the architectural constraint
    expect(stderr.toLowerCase()).toMatch(/repository|repo/);

    // E2E: Message is formatted for readability
    const lines = stderr.split('\n');
    expect(lines.length).toBeGreaterThan(5);

    // E2E: Each alternative is on its own line for clarity
    const alternativesSection = stderr.substring(stderr.indexOf("Alternatives:"));
    expect(alternativesSection).toMatch(/1\..*\n/);
    expect(alternativesSection).toMatch(/2\..*\n/);
    expect(alternativesSection).toMatch(/3\..*\n/);
  });

  test("T055: Multiple developers in different child repos see consistent errors", async () => {
    const backendRepo = fixture.childRepos.get("backend-service")!;
    const frontendRepo = fixture.childRepos.get("frontend-app")!;

    // E2E: Backend developer attempts invalid base
    const backendResult = await $`
      cd ${backendRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/test1 --base nprbst/nonexistent --spec 009-multi-repo-stacked
    `.nothrow();

    // E2E: Frontend developer attempts invalid base
    const frontendResult = await $`
      cd ${frontendRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/test2 --base nprbst/nonexistent --spec 009-multi-repo-stacked
    `.nothrow();

    // E2E: Both see consistent error messages
    expect(backendResult.exitCode).toBe(1);
    expect(frontendResult.exitCode).toBe(1);

    const backendError = backendResult.stderr.toString();
    const frontendError = frontendResult.stderr.toString();

    // E2E: Error structure is consistent
    expect(backendError).toContain("Cross-repo");
    expect(frontendError).toContain("Cross-repo");

    expect(backendError).toMatch(/Alternatives:/);
    expect(frontendError).toMatch(/Alternatives:/);

    // E2E: Both errors provide same number of alternatives
    const backendAlts = (backendError.match(/\d\./g) || []).length;
    const frontendAlts = (frontendError.match(/\d\./g) || []).length;
    expect(backendAlts).toBe(frontendAlts);
    expect(backendAlts).toBeGreaterThanOrEqual(3);
  });
});
