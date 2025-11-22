import { describe, test, expect, beforeEach } from "bun:test";
import { $ } from "bun";
import { createMultiRepoTestSetup } from "../helpers/multi-repo-fixtures";
import type { MultiRepoTestSetup } from "../helpers/multi-repo-fixtures";

/**
 * T056: Contract test for import exit code 3 (interactive prompt)
 *
 * Validates that /speck.branch import command exits with code 3
 * when run without --batch flag, signaling need for interactive prompt.
 */

describe("Branch Import - Interactive Prompt Contract", () => {
  let fixture: MultiRepoTestSetup;

  beforeEach(async () => {
    fixture = await createMultiRepoTestSetup({
      childRepos: ["backend-service"],
      rootBranches: [],
      childBranches: {},
    });
  });

  test("T056: Import without --batch exits with code 3", async () => {
    const backendRepo = fixture.childRepos.get("backend-service")!;

    // Create some git branches manually (not via speck)
    await $`git -C ${backendRepo} checkout -b feature/auth`.quiet();
    await $`git -C ${backendRepo} checkout -b feature/api`.quiet();
    await $`git -C ${backendRepo} checkout main`.quiet();

    // Run import without --batch flag
    const result = await $`
      cd ${backendRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts import
    `.nothrow();

    // Contract: Exit code 3 signals interactive prompt needed
    expect(result.exitCode).toBe(3);
  });

  test("T056: Import outputs JSON to stderr for agent parsing", async () => {
    const backendRepo = fixture.childRepos.get("backend-service")!;

    // Create manual branches
    await $`git -C ${backendRepo} checkout -b nprbst/feature-1`.quiet();
    await $`git -C ${backendRepo} checkout main`.quiet();

    const result = await $`
      cd ${backendRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts import
    `.nothrow();

    expect(result.exitCode).toBe(3);

    // Contract: JSON output on stderr
    const stderr = result.stderr.toString();
    expect(() => JSON.parse(stderr)).not.toThrow();

    const importData = JSON.parse(stderr);

    // Contract: JSON schema structure
    expect(importData).toHaveProperty("type");
    expect(importData.type).toBe("import-prompt");
    expect(importData).toHaveProperty("branches");
    expect(importData).toHaveProperty("availableSpecs");
    expect(Array.isArray(importData.branches)).toBe(true);
    expect(Array.isArray(importData.availableSpecs)).toBe(true);
  });

  test("T056: Import lists branches with inferred base branches", async () => {
    const backendRepo = fixture.childRepos.get("backend-service")!;

    // Create branch hierarchy
    await $`git -C ${backendRepo} checkout -b feature/base`.quiet();
    await $`git -C ${backendRepo} commit --allow-empty -m "base"`.quiet();
    await $`git -C ${backendRepo} checkout -b feature/stacked`.quiet();
    await $`git -C ${backendRepo} checkout main`.quiet();

    const result = await $`
      cd ${backendRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts import
    `.nothrow();

    expect(result.exitCode).toBe(3);

    const importData = JSON.parse(result.stderr.toString());

    // Contract: Each branch has name, upstream, inferredBase
    expect(importData.branches.length).toBeGreaterThan(0);
    importData.branches.forEach((branch: any) => {
      expect(branch).toHaveProperty("name");
      expect(branch).toHaveProperty("inferredBase");
    });
  });

  test("T056: Import with no new branches shows message and exits 0", async () => {
    const backendRepo = fixture.childRepos.get("backend-service")!;

    // No manual branches created, only main exists

    const result = await $`
      cd ${backendRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts import
    `.nothrow();

    // Contract: Exit code 0 when nothing to import
    expect(result.exitCode).toBe(0);
    expect(result.stdout.toString()).toMatch(/No branches found|All branches are already in stacked mode/);
  });

  test("T056: Import with --batch flag does not exit with code 3", async () => {
    const backendRepo = fixture.childRepos.get("backend-service")!;

    // Create manual branch
    await $`git -C ${backendRepo} checkout -b feature/test`.quiet();
    await $`git -C ${backendRepo} checkout main`.quiet();

    // Run with --batch flag
    const result = await $`
      cd ${backendRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts import --batch feature/test:009-multi-repo-stacked
    `.nothrow();

    // Contract: Batch mode should not exit with code 3
    expect(result.exitCode).not.toBe(3);
    expect(result.exitCode).toBe(0);
  });
});
