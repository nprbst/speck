import { describe, test, expect, beforeEach } from "bun:test";
import { $ } from "bun";
import { createMultiRepoTestSetup } from "../helpers/multi-repo-fixtures";
import type { MultiRepoTestSetup } from "../helpers/multi-repo-fixtures";

/**
 * T051: Contract test validates error message includes alternatives
 *
 * Ensures that cross-repo validation errors provide actionable alternatives
 * to help developers resolve the issue.
 */

describe("Cross-Repo Error Alternatives", () => {
  let fixture: MultiRepoTestSetup;

  beforeEach(async () => {
    fixture = await createMultiRepoTestSetup({
      childRepos: ["backend-service", "frontend-app"],
      rootBranches: [],
      childBranches: {},
    });
  });

  test("T051: Error message includes at least 3 alternative solutions", async () => {
    const backendRepo = fixture.childRepos.get("backend-service")!;

    const result = await $`
      cd ${backendRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/test --base nprbst/invalid --spec 009-multi-repo-stacked
    `.nothrow();

    expect(result.exitCode).toBe(1);

    const stderr = result.stderr.toString();

    // Contract: Must include "Alternatives:" section
    expect(stderr).toMatch(/Alternatives:/i);

    // Contract: Must include at least 3 numbered alternatives
    expect(stderr).toMatch(/1\./);
    expect(stderr).toMatch(/2\./);
    expect(stderr).toMatch(/3\./);
  });

  test("T051: Alternatives mention merging to main", async () => {
    const backendRepo = fixture.childRepos.get("backend-service")!;

    const result = await $`
      cd ${backendRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/test --base nprbst/invalid --spec 009-multi-repo-stacked
    `.nothrow();

    const stderr = result.stderr.toString();

    // Contract: Alternative 1 should mention completing work and merging
    expect(stderr).toMatch(/merge.*main/i);
  });

  test("T051: Alternatives mention shared contracts/APIs", async () => {
    const backendRepo = fixture.childRepos.get("backend-service")!;

    const result = await $`
      cd ${backendRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/test --base nprbst/invalid --spec 009-multi-repo-stacked
    `.nothrow();

    const stderr = result.stderr.toString();

    // Contract: Alternative 2 should mention shared contracts or APIs
    expect(stderr).toMatch(/contract|API/i);
  });

  test("T051: Alternatives mention manual coordination", async () => {
    const backendRepo = fixture.childRepos.get("backend-service")!;

    const result = await $`
      cd ${backendRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/test --base nprbst/invalid --spec 009-multi-repo-stacked
    `.nothrow();

    const stderr = result.stderr.toString();

    // Contract: Alternative 3 should mention manual PR coordination
    expect(stderr).toMatch(/manual.*coordinate|coordinate.*manual/i);
  });

  test("T051: Error message is helpful and actionable", async () => {
    const backendRepo = fixture.childRepos.get("backend-service")!;

    const result = await $`
      cd ${backendRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/test --base backend-branch-from-other-repo --spec 009-multi-repo-stacked
    `.nothrow();

    const stderr = result.stderr.toString();

    // Contract: Message should explain WHY cross-repo dependencies aren't supported
    expect(stderr).toMatch(/not supported/i);

    // Contract: Message should be formatted for readability (contains newlines/structure)
    expect(stderr.split('\n').length).toBeGreaterThan(3);
  });
});
