/**
 * E2E Test: Branch Operation Isolation Between Child Repos (T049)
 *
 * Validates that branch operations (create, update, delete) in one child
 * repository have zero impact on other child repositories:
 * - Branch creation isolation
 * - Branch updates don't propagate
 * - SpecIndex independence
 * - Git branch isolation
 *
 * Feature: 009-multi-repo-stacked (User Story 3)
 * Layer: 3 (E2E)
 * Created: 2025-11-20
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { $ } from "bun";
import path from "node:path";
import { readFile } from "node:fs/promises";
import type { MultiRepoTestFixture } from "../helpers/multi-repo-fixtures";
import { createMultiRepoTestFixture } from "../helpers/multi-repo-fixtures";

describe("E2E: Branch operations in one child don't affect another", () => {
  let fixture: MultiRepoTestFixture;

  beforeEach(async () => {
    // Set up multi-repo environment with two child repos
    fixture = await createMultiRepoTestFixture([
      { name: "child-a" },
      { name: "child-b" }
    ], "007-multi-repo-monorepo-support");
  });

  afterEach(async () => {
    await fixture.cleanup();
  });

  test("T049.1: Creating branches in child-a doesn't affect child-b", async () => {
    const childA = fixture.childRepos.get("child-a")!;
    const childB = fixture.childRepos.get("child-b")!;

    // Create initial branch in child-b first
    await $`cd ${childB} && bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/initial-branch --base main --spec 009-multi-repo-stacked`;

    // Read child-b's initial state
    const childBPathBefore = path.join(childB, ".speck", "branches.json");
    const childBDataBefore = JSON.parse(await readFile(childBPathBefore, "utf-8"));
    const childBTimestampBefore = childBDataBefore.branches[0].updatedAt;

    // Create multiple branches in child-a
    await $`cd ${childA} && bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/branch-1 --base main --spec 009-multi-repo-stacked && git add -A && git commit --allow-empty -m "feat: branch 1"`;
    await $`cd ${childA} && bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/branch-2 --base main --spec 009-multi-repo-stacked && git add -A && git commit --allow-empty -m "feat: branch 2"`;
    await $`cd ${childA} && bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/branch-3 --base main --spec 009-multi-repo-stacked`;

    // E2E: Verify child-a has 3 branches
    const childAPath = path.join(childA, ".speck", "branches.json");
    const childAData = JSON.parse(await readFile(childAPath, "utf-8"));
    expect(childAData.branches).toHaveLength(3);

    // E2E: Verify child-b still has exactly 1 branch
    const childBDataAfter = JSON.parse(await readFile(childBPathBefore, "utf-8"));
    expect(childBDataAfter.branches).toHaveLength(1);
    expect(childBDataAfter.branches[0].name).toBe("nprbst/initial-branch");

    // E2E: Verify child-b's branch metadata unchanged (timestamp should be identical)
    expect(childBDataAfter.branches[0].updatedAt).toBe(childBTimestampBefore);

    // E2E: Verify child-b doesn't contain any of child-a's branches
    const childBBranchNames = childBDataAfter.branches.map((b: any) => b.name);
    expect(childBBranchNames).not.toContain("nprbst/branch-1");
    expect(childBBranchNames).not.toContain("nprbst/branch-2");
    expect(childBBranchNames).not.toContain("nprbst/branch-3");
  });

  test("T049.2: SpecIndex updates are repo-specific", async () => {
    const childA = fixture.childRepos.get("child-a")!;
    const childB = fixture.childRepos.get("child-b")!;

    // Create branches for spec 009 in child-a
    await $`cd ${childA} && bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/a-branch-1 --base main --spec 009-multi-repo-stacked && git add -A && git commit --allow-empty -m "feat: a1"`;
    await $`cd ${childA} && bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/a-branch-2 --base main --spec 009-multi-repo-stacked`;

    // Create branches for spec 008 in child-b (different spec)
    await $`cd ${childB} && bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/b-branch-1 --base main --spec 008-stacked-pr-support && git add -A && git commit --allow-empty -m "feat: b1"`;
    await $`cd ${childB} && bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/b-branch-2 --base main --spec 008-stacked-pr-support`;

    // E2E: Verify child-a's specIndex only has spec 009
    const childAData = JSON.parse(await readFile(path.join(childA, ".speck", "branches.json"), "utf-8"));
    expect(Object.keys(childAData.specIndex)).toHaveLength(1);
    expect(childAData.specIndex["009-multi-repo-stacked"]).toBeDefined();
    expect(childAData.specIndex["009-multi-repo-stacked"]).toHaveLength(2);
    expect(childAData.specIndex["008-stacked-pr-support"]).toBeUndefined();

    // E2E: Verify child-b's specIndex only has spec 008
    const childBData = JSON.parse(await readFile(path.join(childB, ".speck", "branches.json"), "utf-8"));
    expect(Object.keys(childBData.specIndex)).toHaveLength(1);
    expect(childBData.specIndex["008-stacked-pr-support"]).toBeDefined();
    expect(childBData.specIndex["008-stacked-pr-support"]).toHaveLength(2);
    expect(childBData.specIndex["009-multi-repo-stacked"]).toBeUndefined();
  });

  test("T049.3: Git branches are repo-specific", async () => {
    const childA = fixture.childRepos.get("child-a")!;
    const childB = fixture.childRepos.get("child-b")!;

    // Create branch in child-a
    await $`cd ${childA} && bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/feature-x --base main --spec 009-multi-repo-stacked`;

    // E2E: Verify git branch exists in child-a
    const childAGitBranches = await $`git -C ${childA} branch --list`.text();
    expect(childAGitBranches).toContain("nprbst/feature-x");

    // E2E: Verify git branch does NOT exist in child-b
    const childBGitBranches = await $`git -C ${childB} branch --list`.text();
    expect(childBGitBranches).not.toContain("nprbst/feature-x");

    // Create different branch in child-b
    await $`cd ${childB} && bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/feature-y --base main --spec 009-multi-repo-stacked`;

    // E2E: Verify git branch exists in child-b
    const childBGitBranchesAfter = await $`git -C ${childB} branch --list`.text();
    expect(childBGitBranchesAfter).toContain("nprbst/feature-y");

    // E2E: Verify git branch does NOT exist in child-a
    const childAGitBranchesAfter = await $`git -C ${childA} branch --list`.text();
    expect(childAGitBranchesAfter).not.toContain("nprbst/feature-y");
  });

  test("T049.4: Rapid sequential operations maintain isolation", async () => {
    const childA = fixture.childRepos.get("child-a")!;
    const childB = fixture.childRepos.get("child-b")!;

    // Rapidly alternate operations between repos
    await $`cd ${childA} && bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/a1 --base main --spec 009-multi-repo-stacked && git add -A && git commit --allow-empty -m "feat: a1"`;
    await $`cd ${childB} && bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/b1 --base main --spec 009-multi-repo-stacked && git add -A && git commit --allow-empty -m "feat: b1"`;
    await $`cd ${childA} && bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/a2 --base main --spec 009-multi-repo-stacked && git add -A && git commit --allow-empty -m "feat: a2"`;
    await $`cd ${childB} && bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/b2 --base main --spec 009-multi-repo-stacked && git add -A && git commit --allow-empty -m "feat: b2"`;
    await $`cd ${childA} && bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/a3 --base main --spec 009-multi-repo-stacked`;
    await $`cd ${childB} && bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/b3 --base main --spec 009-multi-repo-stacked`;

    // E2E: Verify final state - each repo has exactly 3 branches
    const childAData = JSON.parse(await readFile(path.join(childA, ".speck", "branches.json"), "utf-8"));
    const childBData = JSON.parse(await readFile(path.join(childB, ".speck", "branches.json"), "utf-8"));

    expect(childAData.branches).toHaveLength(3);
    expect(childBData.branches).toHaveLength(3);

    // E2E: Verify child-a only has "a" branches
    const childANames = childAData.branches.map((b: any) => b.name);
    expect(childANames).toContain("nprbst/a1");
    expect(childANames).toContain("nprbst/a2");
    expect(childANames).toContain("nprbst/a3");
    expect(childANames).not.toContain("nprbst/b1");
    expect(childANames).not.toContain("nprbst/b2");
    expect(childANames).not.toContain("nprbst/b3");

    // E2E: Verify child-b only has "b" branches
    const childBNames = childBData.branches.map((b: any) => b.name);
    expect(childBNames).toContain("nprbst/b1");
    expect(childBNames).toContain("nprbst/b2");
    expect(childBNames).toContain("nprbst/b3");
    expect(childBNames).not.toContain("nprbst/a1");
    expect(childBNames).not.toContain("nprbst/a2");
    expect(childBNames).not.toContain("nprbst/a3");
  });

  test("T049.5: Concurrent branch list operations show correct data per repo", async () => {
    const childA = fixture.childRepos.get("child-a")!;
    const childB = fixture.childRepos.get("child-b")!;

    // Setup: Create branches in both repos
    await $`cd ${childA} && bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/alpha --base main --spec 009-multi-repo-stacked`;
    await $`cd ${childB} && bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/beta --base main --spec 009-multi-repo-stacked`;

    // E2E: Run branch list in both repos
    const childAList = await $`cd ${childA} && bun run ${fixture.scriptsDir}/branch-command.ts list`.nothrow();
    const childBList = await $`cd ${childB} && bun run ${fixture.scriptsDir}/branch-command.ts list`.nothrow();

    const childAOutput = childAList.stdout.toString();
    const childBOutput = childBList.stdout.toString();

    // E2E: Verify child-a list only shows alpha
    expect(childAOutput).toContain("nprbst/alpha");
    expect(childAOutput).not.toContain("nprbst/beta");

    // E2E: Verify child-b list only shows beta
    expect(childBOutput).toContain("nprbst/beta");
    expect(childBOutput).not.toContain("nprbst/alpha");
  });
});
