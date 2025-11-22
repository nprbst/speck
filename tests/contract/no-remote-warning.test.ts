/**
 * Contract Test: No-Remote Warning (T109)
 *
 * Validates that child repos without git remote:
 * - Allow branch creation (exit code 0)
 * - Display warning to stderr
 * - Warning explains PR creation unavailable
 * - Suggests how to configure remote
 *
 * Feature: 009-multi-repo-stacked (User Story 1 - FR-020)
 * Layer: 1 (Contract)
 * Created: 2025-11-19
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import {
  createMultiRepoTestFixture,
  commitChanges,
  type MultiRepoTestFixture
} from "../helpers/multi-repo-fixtures.ts";
import { $ } from "bun";
import { writeFile } from "node:fs/promises";
import path from "node:path";

describe("Contract: No-remote warning", () => {
  let fixture: MultiRepoTestFixture;

  beforeEach(async () => {
    // Create child repo WITHOUT remote URL (local-only)
    fixture = await createMultiRepoTestFixture([
      { name: "local-service" } // No remoteUrl specified
    ], "007-multi-repo-monorepo-support");
  });

  afterEach(async () => {
    await fixture?.cleanup();
  });

  test("T109: Branch creation succeeds despite missing remote", async () => {
    const childRepo = fixture.childRepos.get("local-service")!;

    // Create branch in repo without remote
    const result = await $`
      cd ${childRepo} && \
      bun run ${process.cwd()}/.speck/scripts/branch-command.ts create nprbst/feature --base main --spec 009-multi-repo-stacked
    `.nothrow();

    // Contract: Exit code 0 (success, not error)
    expect(result.exitCode).toBe(0);
  });

  test("T109: Warning appears in stderr when no remote configured", async () => {
    const childRepo = fixture.childRepos.get("local-service")!;

    // Create first branch with commit
    await $`
      cd ${childRepo} && \
      bun run ${process.cwd()}/.speck/scripts/branch-command.ts create nprbst/feature-1 --base main --spec 009-multi-repo-stacked
    `.quiet();

    await writeFile(path.join(childRepo, "feature.ts"), "export const feature = {};");
    await commitChanges(childRepo, "feat: add feature");

    // Create second branch (triggers PR suggestion logic)
    const result = await $`
      cd ${childRepo} && \
      bun run ${process.cwd()}/.speck/scripts/branch-command.ts create nprbst/feature-2 --base nprbst/feature-1
    `.nothrow();

    const stderr = result.stderr.toString();

    // Contract: Warning about missing remote
    expect(stderr).toContain("No remote configured");
    expect(stderr).toContain("Branch created");
  });

  test("T109: Warning explains PR creation unavailable", async () => {
    const childRepo = fixture.childRepos.get("local-service")!;

    // Create first branch with commit
    await $`
      cd ${childRepo} && \
      bun run ${process.cwd()}/.speck/scripts/branch-command.ts create nprbst/feature-1 --base main --spec 009-multi-repo-stacked
    `.quiet();

    await writeFile(path.join(childRepo, "feature.ts"), "export const feature = {};");
    await commitChanges(childRepo, "feat: add feature");

    // Create second branch
    const result = await $`
      cd ${childRepo} && \
      bun run ${process.cwd()}/.speck/scripts/branch-command.ts create nprbst/feature-2 --base nprbst/feature-1
    `.nothrow();

    const stderr = result.stderr.toString();

    // Contract: Mentions PR creation unavailable
    expect(stderr).toMatch(/PR.*unavailable|cannot.*create.*PR/i);
  });

  test("T109: Warning suggests how to configure remote", async () => {
    const childRepo = fixture.childRepos.get("local-service")!;

    // Create first branch with commit
    await $`
      cd ${childRepo} && \
      bun run ${process.cwd()}/.speck/scripts/branch-command.ts create nprbst/feature-1 --base main --spec 009-multi-repo-stacked
    `.quiet();

    await writeFile(path.join(childRepo, "feature.ts"), "export const feature = {};");
    await commitChanges(childRepo, "feat: add feature");

    // Create second branch
    const result = await $`
      cd ${childRepo} && \
      bun run ${process.cwd()}/.speck/scripts/branch-command.ts create nprbst/feature-2 --base nprbst/feature-1
    `.nothrow();

    const stderr = result.stderr.toString();

    // Contract: Suggests git remote add command
    expect(stderr).toContain("git remote add");
  });

  test("T109: No warning when remote is configured", async () => {
    // Create new fixture with remote configured
    const fixtureWithRemote = await createMultiRepoTestFixture([
      { name: "remote-service", remoteUrl: "https://github.com/test/remote-service.git" }
    ], "007-multi-repo-monorepo-support");

    const childRepo = fixtureWithRemote.childRepos.get("remote-service")!;

    // Create first branch with commit
    await $`
      cd ${childRepo} && \
      bun run ${process.cwd()}/.speck/scripts/branch-command.ts create nprbst/feature-1 --base main --spec 009-multi-repo-stacked
    `.quiet();

    await writeFile(path.join(childRepo, "feature.ts"), "export const feature = {};");
    await commitChanges(childRepo, "feat: add feature");

    // Create second branch
    const result = await $`
      cd ${childRepo} && \
      bun run ${process.cwd()}/.speck/scripts/branch-command.ts create nprbst/feature-2 --base nprbst/feature-1
    `.nothrow();

    const stderr = result.stderr.toString();

    // Contract: No "No remote configured" warning
    expect(stderr).not.toContain("No remote configured");

    await fixtureWithRemote.cleanup();
  });

  test("T109: Warning format matches FR-020 specification", async () => {
    const childRepo = fixture.childRepos.get("local-service")!;

    // Create first branch with commit
    await $`
      cd ${childRepo} && \
      bun run ${process.cwd()}/.speck/scripts/branch-command.ts create nprbst/feature-1 --base main --spec 009-multi-repo-stacked
    `.quiet();

    await writeFile(path.join(childRepo, "feature.ts"), "export const feature = {};");
    await commitChanges(childRepo, "feat: add feature");

    // Create second branch
    const result = await $`
      cd ${childRepo} && \
      bun run ${process.cwd()}/.speck/scripts/branch-command.ts create nprbst/feature-2 --base nprbst/feature-1
    `.nothrow();

    const stderr = result.stderr.toString();

    // Contract: Warning follows FR-020 format
    // "No remote configured. Branch created locally. PR creation unavailable."
    expect(stderr).toContain("No remote configured");
    expect(stderr).toContain("Branch created");
    expect(stderr).toContain("PR creation unavailable");
  });

  test("T109: branches.json created even without remote", async () => {
    const childRepo = fixture.childRepos.get("local-service")!;

    // Create branch
    await $`
      cd ${childRepo} && \
      bun run ${process.cwd()}/.speck/scripts/branch-command.ts create nprbst/feature --base main --spec 009-multi-repo-stacked
    `.quiet();

    // Contract: branches.json exists
    const branchesJsonPath = path.join(childRepo, ".speck", "branches.json");
    const { existsSync } = await import("node:fs");
    expect(existsSync(branchesJsonPath)).toBe(true);
  });

  test("T109: Branch stacking works without remote", async () => {
    const childRepo = fixture.childRepos.get("local-service")!;

    // Create first branch
    await $`
      cd ${childRepo} && \
      bun run ${process.cwd()}/.speck/scripts/branch-command.ts create nprbst/feature-1 --base main --spec 009-multi-repo-stacked
    `.quiet();

    // Create second branch stacked on first
    const result = await $`
      cd ${childRepo} && \
      bun run ${process.cwd()}/.speck/scripts/branch-command.ts create nprbst/feature-2 --base nprbst/feature-1
    `.nothrow();

    // Contract: Branch creation succeeds
    expect(result.exitCode).toBe(0);

    // Verify both branches tracked
    const { readBranches } = await import("../../.speck/scripts/common/branch-mapper.ts");
    const mapping = await readBranches(childRepo);
    expect(mapping.branches).toHaveLength(2);
  });
});
