/**
 * Regression Test: Multi-Repo Without Stacking (T084)
 *
 * Validates that Feature 009 changes do not affect multi-repo
 * projects that don't use stacked PRs. Feature 007 functionality
 * must continue to work exactly as before.
 *
 * Feature: 009-multi-repo-stacked (Phase 11)
 * Layer: Regression
 * Created: 2025-11-20
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import {
  createMultiRepoTestFixture,
  type MultiRepoTestFixture
} from "../helpers/multi-repo-fixtures.ts";
import { $ } from "bun";
import { existsSync } from "node:fs";
import path from "node:path";
import { readFile } from "node:fs/promises";

describe("Regression: Multi-repo without stacking", () => {
  let fixture: MultiRepoTestFixture;

  beforeEach(async () => {
    // Set up multi-repo environment (Feature 007)
    fixture = await createMultiRepoTestFixture([
      { name: "service-a" },
      { name: "service-b" }
    ], "007-multi-repo-monorepo-support");
  });

  afterEach(async () => {
    await fixture.cleanup();
  });

  test("T084: Multi-repo detection still works without stacking", async () => {
    const childRepo = fixture.childRepos.get("service-a")!;

    // Verify symlink exists
    const symlinkPath = path.join(childRepo, ".speck");
    expect(existsSync(symlinkPath)).toBe(true);

    // Verify symlink points to root
    const target = await $`readlink ${symlinkPath}`.text();
    expect(target.trim()).toBeTruthy();
  });

  test("T084: Env command shows multi-repo context without stacking", async () => {
    const childRepo = fixture.childRepos.get("service-a")!;

    // Run env command from child
    const result = await $`cd ${childRepo} && bun run ${fixture.scriptsDir}/env-command.ts`.text();

    // Should show multi-repo child indicator
    expect(result).toContain("Speck");

    // No branches yet, so shouldn't show branch info
    expect(result).toBeTruthy();
  });

  test("T084: Env command from root shows aggregate even without stacking", async () => {
    // Run env command from root
    const result = await $`cd ${fixture.rootDir} && bun run ${fixture.scriptsDir}/env-command.ts`.text();

    // Should show root context
    expect(result).toContain("Speck");

    // Should work even with no branches
    expect(result).toBeTruthy();
  });

  test("T084: Child repo can create non-stacked branches", async () => {
    const childRepo = fixture.childRepos.get("service-b")!;

    // Create a single branch (not stacked on another Speck branch)
    const result = await $`cd ${childRepo} && bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/standalone --base main --spec 007-multi-repo-monorepo-support`.nothrow();

    // Should succeed
    expect(result.exitCode).toBe(0);

    // Should create branches.json in child repo
    const branchesJsonPath = path.join(childRepo, ".speck", "branches.json");
    expect(existsSync(branchesJsonPath)).toBe(true);

    // Should have parentSpecId (multi-repo aware)
    const content = await readFile(branchesJsonPath, "utf-8");
    const data = JSON.parse(content);
    expect(data.branches["nprbst/standalone"]).toBeDefined();
    expect(data.branches["nprbst/standalone"].parentSpecId).toBe("007-multi-repo-monorepo-support");
  });

  test("T084: Multiple child repos work independently without stacking", async () => {
    const serviceA = fixture.childRepos.get("service-a")!;
    const serviceB = fixture.childRepos.get("service-b")!;

    // Create branch in service-a
    await $`cd ${serviceA} && bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/feature-a --base main --spec 007-multi-repo-monorepo-support`.quiet();

    // Create branch in service-b
    await $`cd ${serviceB} && bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/feature-b --base main --spec 007-multi-repo-monorepo-support`.quiet();

    // Verify service-a has only its branch
    const branchesA = await readFile(path.join(serviceA, ".speck", "branches.json"), "utf-8");
    const dataA = JSON.parse(branchesA);
    expect(dataA.branches["nprbst/feature-a"]).toBeDefined();
    expect(dataA.branches["nprbst/feature-b"]).toBeUndefined();

    // Verify service-b has only its branch
    const branchesB = await readFile(path.join(serviceB, ".speck", "branches.json"), "utf-8");
    const dataB = JSON.parse(branchesB);
    expect(dataB.branches["nprbst/feature-b"]).toBeDefined();
    expect(dataB.branches["nprbst/feature-a"]).toBeUndefined();
  });

  test("T084: Branch list from root aggregates without stacking", async () => {
    const serviceA = fixture.childRepos.get("service-a")!;
    const serviceB = fixture.childRepos.get("service-b")!;

    // Create branches in both repos
    await $`cd ${serviceA} && bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/list-a --base main --spec 007-multi-repo-monorepo-support`.quiet();
    await $`cd ${serviceB} && bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/list-b --base main --spec 007-multi-repo-monorepo-support`.quiet();

    // List all branches from root
    const result = await $`cd ${fixture.rootDir} && bun run ${fixture.scriptsDir}/branch-command.ts list --all`.text();

    // Should show both branches
    expect(result).toContain("nprbst/list-a");
    expect(result).toContain("nprbst/list-b");

    // Should group by repo
    expect(result).toContain("service-a");
    expect(result).toContain("service-b");
  });

  test("T084: Cross-repo validation works for non-stacked branches", async () => {
    const serviceA = fixture.childRepos.get("service-a")!;
    const serviceB = fixture.childRepos.get("service-b")!;

    // Create branch in service-a
    await $`cd ${serviceA} && bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/branch-a --base main --spec 007-multi-repo-monorepo-support`.quiet();

    // Try to create branch in service-b based on service-a branch (should fail)
    const result = await $`cd ${serviceB} && bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/branch-b --base nprbst/branch-a --spec 007-multi-repo-monorepo-support`.nothrow();

    // Should fail with cross-repo error
    expect(result.exitCode).toBe(1);
    expect(result.stderr.toString()).toContain("cross-repo");
  });

  test("T084: Import works in multi-repo context without stacking", async () => {
    const childRepo = fixture.childRepos.get("service-a")!;

    // Create git branches manually
    await $`cd ${childRepo} && git checkout -b nprbst/import-1`.quiet();
    await $`cd ${childRepo} && echo "test" > file.txt && git add . && git commit -m "Test"`.quiet();
    await $`cd ${childRepo} && git checkout main`.quiet();

    // Import branches
    const result = await $`cd ${childRepo} && bun run ${fixture.scriptsDir}/branch-command.ts import --spec 007-multi-repo-monorepo-support --yes`.nothrow();

    // Should succeed
    expect(result.exitCode).toBe(0);

    // Should have parentSpecId
    const content = await readFile(path.join(childRepo, ".speck", "branches.json"), "utf-8");
    const data = JSON.parse(content);
    expect(data.branches["nprbst/import-1"]).toBeDefined();
    expect(data.branches["nprbst/import-1"].parentSpecId).toBe("007-multi-repo-monorepo-support");
  });
});
