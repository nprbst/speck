/**
 * Multi-Step Test: Session Isolation Between Different Repos (T069)
 *
 * Validates that operations in one repository do not affect another repository's
 * session state, metadata, or branch tracking.
 *
 * Tests verify:
 * - Branch operations in repo A don't affect repo B
 * - Each repo maintains independent .speck/branches.json
 * - Context detection is repo-specific
 * - Aggregate views correctly isolate per-repo data
 *
 * Feature: 009-multi-repo-stacked (Phase 8)
 * Layer: 4 (Multi-Step Workflow)
 * Created: 2025-11-20
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { $ } from "bun";
import path from "node:path";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import type { MultiRepoTestFixture } from "../helpers/multi-repo-fixtures";
import { createMultiRepoTestFixture } from "../helpers/multi-repo-fixtures";

describe("Multi-Step: Session isolation between repos", () => {
  let fixture: MultiRepoTestFixture;

  beforeEach(async () => {
    // Set up multi-repo environment with two children
    fixture = await createMultiRepoTestFixture([
      { name: "backend-service" },
      { name: "frontend-app" }
    ], "007-multi-repo-monorepo-support");
  });

  afterEach(async () => {
    await fixture?.cleanup();
  });

  test("T069: Branch creation in repo A does not affect repo B", async () => {
    const repoA = fixture.childRepos.get("backend-service")!;
    const repoB = fixture.childRepos.get("frontend-app")!;
    const repoABranchesPath = path.join(repoA, ".speck", "branches.json");
    const repoBBranchesPath = path.join(repoB, ".speck", "branches.json");

    // Step 1: Create branches in repo A
    await $`
      cd ${repoA} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/repo-a-branch-1 --base main --spec 009-multi-repo-stacked
    `.quiet();

    await $`
      cd ${repoA} && \
      git add .speck/branches.json && \
      git commit -m "Add repo-a-branch-1"
    `.quiet();

    await $`
      cd ${repoA} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/repo-a-branch-2 --base nprbst/repo-a-branch-1 --spec 009-multi-repo-stacked
    `.quiet();

    // Step 2: Verify repo A has branches
    expect(existsSync(repoABranchesPath)).toBe(true);
    const repoABranches = JSON.parse(await readFile(repoABranchesPath, "utf-8"));
    expect(repoABranches.branches).toHaveLength(2);
    expect(repoABranches.branches[0].name).toBe("nprbst/repo-a-branch-1");
    expect(repoABranches.branches[1].name).toBe("nprbst/repo-a-branch-2");

    // Step 3: Verify repo B has NO branches (isolated)
    expect(existsSync(repoBBranchesPath)).toBe(false);

    // Step 4: Create branches in repo B
    await $`
      cd ${repoB} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/repo-b-branch-1 --base main --spec 009-multi-repo-stacked
    `.quiet();

    // Step 5: Verify repo B now has its own branches
    expect(existsSync(repoBBranchesPath)).toBe(true);
    const repoBBranches = JSON.parse(await readFile(repoBBranchesPath, "utf-8"));
    expect(repoBBranches.branches).toHaveLength(1);
    expect(repoBBranches.branches[0].name).toBe("nprbst/repo-b-branch-1");

    // Step 6: Verify repo A unaffected (still has 2 branches)
    const repoABranchesAfter = JSON.parse(await readFile(repoABranchesPath, "utf-8"));
    expect(repoABranchesAfter.branches).toHaveLength(2);

    // Step 7: Verify isolation - repo A branches don't appear in repo B file
    expect(repoBBranches.branches[0].name).not.toContain("repo-a");
    expect(repoABranchesAfter.branches.some((b: any) => b.name.includes("repo-b"))).toBe(false);
  });

  test("T069: specIndex isolation between repos", async () => {
    const repoA = fixture.childRepos.get("backend-service")!;
    const repoB = fixture.childRepos.get("frontend-app")!;

    // Create branches in repo A for two different specs
    await $`
      cd ${repoA} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/spec-009-a --base main --spec 009-multi-repo-stacked
    `.quiet();

    await $`
      cd ${repoA} && \
      git add .speck/branches.json && \
      git commit -m "Add spec-009-a"
    `.quiet();

    await $`
      cd ${repoA} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/spec-008-a --base main --spec 008-stacked-pr-support
    `.quiet();

    // Create branches in repo B for same specs
    await $`
      cd ${repoB} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/spec-009-b --base main --spec 009-multi-repo-stacked
    `.quiet();

    await $`
      cd ${repoB} && \
      git add .speck/branches.json && \
      git commit -m "Add spec-009-b"
    `.quiet();

    await $`
      cd ${repoB} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/spec-008-b --base main --spec 008-stacked-pr-support
    `.quiet();

    // Verify specIndex isolation
    const repoABranchesPath = path.join(repoA, ".speck", "branches.json");
    const repoBBranchesPath = path.join(repoB, ".speck", "branches.json");

    const repoABranches = JSON.parse(await readFile(repoABranchesPath, "utf-8"));
    const repoBBranches = JSON.parse(await readFile(repoBBranchesPath, "utf-8"));

    // Repo A specIndex only has repo A branches
    expect(repoABranches.specIndex["009-multi-repo-stacked"]).toContain("nprbst/spec-009-a");
    expect(repoABranches.specIndex["008-stacked-pr-support"]).toContain("nprbst/spec-008-a");
    expect(repoABranches.specIndex["009-multi-repo-stacked"]).not.toContain("nprbst/spec-009-b");

    // Repo B specIndex only has repo B branches
    expect(repoBBranches.specIndex["009-multi-repo-stacked"]).toContain("nprbst/spec-009-b");
    expect(repoBBranches.specIndex["008-stacked-pr-support"]).toContain("nprbst/spec-008-b");
    expect(repoBBranches.specIndex["009-multi-repo-stacked"]).not.toContain("nprbst/spec-009-a");
  });

  test("T069: Git operations isolated per repository", async () => {
    const repoA = fixture.childRepos.get("backend-service")!;
    const repoB = fixture.childRepos.get("frontend-app")!;

    // Create branch in repo A
    await $`
      cd ${repoA} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/isolated-a --base main --spec 009-multi-repo-stacked
    `.quiet();

    // Verify git branch exists in repo A
    const repoAGitBranches = await $`git -C ${repoA} branch --list nprbst/isolated-a`.text();
    expect(repoAGitBranches).toContain("nprbst/isolated-a");

    // Verify git branch does NOT exist in repo B
    const repoBGitBranches = await $`git -C ${repoB} branch --list nprbst/isolated-a`.text();
    expect(repoBGitBranches.trim()).toBe("");

    // Create different branch in repo B
    await $`
      cd ${repoB} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/isolated-b --base main --spec 009-multi-repo-stacked
    `.quiet();

    // Verify git branch exists in repo B
    const repoBGitBranchesAfter = await $`git -C ${repoB} branch --list nprbst/isolated-b`.text();
    expect(repoBGitBranchesAfter).toContain("nprbst/isolated-b");

    // Verify git branch does NOT exist in repo A
    const repoAGitBranchesAfter = await $`git -C ${repoA} branch --list nprbst/isolated-b`.text();
    expect(repoAGitBranchesAfter.trim()).toBe("");
  });

  test("T069: Status commands show isolated repo-specific data", async () => {
    const repoA = fixture.childRepos.get("backend-service")!;
    const repoB = fixture.childRepos.get("frontend-app")!;

    // Create branches in repo A
    await $`
      cd ${repoA} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/status-a --base main --spec 009-multi-repo-stacked
    `.quiet();

    // Status from repo A should only show repo A branches
    const statusA = await $`
      cd ${repoA} && \
      bun run ${fixture.scriptsDir}/branch-command.ts status
    `;

    const statusAOutput = statusA.stdout.toString();
    expect(statusAOutput).toContain("nprbst/status-a");
    expect(statusAOutput).not.toContain("status-b");

    // Create branches in repo B
    await $`
      cd ${repoB} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/status-b --base main --spec 009-multi-repo-stacked
    `.quiet();

    // Status from repo B should only show repo B branches
    const statusB = await $`
      cd ${repoB} && \
      bun run ${fixture.scriptsDir}/branch-command.ts status
    `;

    const statusBOutput = statusB.stdout.toString();
    expect(statusBOutput).toContain("nprbst/status-b");
    expect(statusBOutput).not.toContain("status-a");
  });

  test("T069: Aggregate view correctly groups isolated repos", async () => {
    const repoA = fixture.childRepos.get("backend-service")!;
    const repoB = fixture.childRepos.get("frontend-app")!;

    // Create branches in both repos
    await $`
      cd ${repoA} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/agg-a --base main --spec 009-multi-repo-stacked
    `.quiet();

    await $`
      cd ${repoB} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/agg-b --base main --spec 009-multi-repo-stacked
    `.quiet();

    // Aggregate status from root should show both repos separately
    const aggStatus = await $`
      cd ${fixture.rootDir} && \
      bun run ${fixture.scriptsDir}/branch-command.ts status --all
    `;

    const aggOutput = aggStatus.stdout.toString();

    // Verify both repos present
    expect(aggOutput).toContain("backend-service");
    expect(aggOutput).toContain("frontend-app");

    // Verify branches grouped correctly
    expect(aggOutput).toContain("nprbst/agg-a");
    expect(aggOutput).toContain("nprbst/agg-b");

    // Verify "Child:" markers for grouping
    expect(aggOutput).toContain("Child:");
  });

  test("T069: Parent spec ID isolation per repository", async () => {
    const repoA = fixture.childRepos.get("backend-service")!;
    const repoB = fixture.childRepos.get("frontend-app")!;

    // Both repos should have same parent spec (from fixture setup)
    // but their branches.json files should be independent

    // Create branch in repo A
    await $`
      cd ${repoA} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/parent-test-a --base main --spec 009-multi-repo-stacked
    `.quiet();

    const repoABranchesPath = path.join(repoA, ".speck", "branches.json");
    const repoABranches = JSON.parse(await readFile(repoABranchesPath, "utf-8"));

    expect(repoABranches.branches[0].parentSpecId).toBe("007-multi-repo-monorepo-support");

    // Create branch in repo B
    await $`
      cd ${repoB} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/parent-test-b --base main --spec 009-multi-repo-stacked
    `.quiet();

    const repoBBranchesPath = path.join(repoB, ".speck", "branches.json");
    const repoBBranches = JSON.parse(await readFile(repoBBranchesPath, "utf-8"));

    expect(repoBBranches.branches[0].parentSpecId).toBe("007-multi-repo-monorepo-support");

    // Both have same parent spec but completely independent files
    expect(repoABranches.branches[0].name).toBe("nprbst/parent-test-a");
    expect(repoBBranches.branches[0].name).toBe("nprbst/parent-test-b");
    expect(repoABranches.branches).toHaveLength(1);
    expect(repoBBranches.branches).toHaveLength(1);
  });

  test("T069: Concurrent operations in different repos maintain isolation", async () => {
    const repoA = fixture.childRepos.get("backend-service")!;
    const repoB = fixture.childRepos.get("frontend-app")!;

    // Simulate concurrent operations (sequential in test, but validates isolation)

    // Time T1: Create branch in repo A
    await $`
      cd ${repoA} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/concurrent-a-1 --base main --spec 009-multi-repo-stacked
    `.quiet();

    // Time T2: Create branch in repo B (before A commits)
    await $`
      cd ${repoB} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/concurrent-b-1 --base main --spec 009-multi-repo-stacked
    `.quiet();

    // Time T3: Create another branch in repo A
    await $`
      cd ${repoA} && \
      git add .speck/branches.json && \
      git commit -m "Add concurrent-a-1"
    `.quiet();

    await $`
      cd ${repoA} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/concurrent-a-2 --base nprbst/concurrent-a-1 --spec 009-multi-repo-stacked
    `.quiet();

    // Time T4: Create another branch in repo B
    await $`
      cd ${repoB} && \
      git add .speck/branches.json && \
      git commit -m "Add concurrent-b-1"
    `.quiet();

    await $`
      cd ${repoB} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/concurrent-b-2 --base nprbst/concurrent-b-1 --spec 009-multi-repo-stacked
    `.quiet();

    // Verify final state: both repos have 2 branches each, completely isolated
    const repoABranchesPath = path.join(repoA, ".speck", "branches.json");
    const repoBBranchesPath = path.join(repoB, ".speck", "branches.json");

    const repoABranches = JSON.parse(await readFile(repoABranchesPath, "utf-8"));
    const repoBBranches = JSON.parse(await readFile(repoBBranchesPath, "utf-8"));

    expect(repoABranches.branches).toHaveLength(2);
    expect(repoBBranches.branches).toHaveLength(2);

    expect(repoABranches.branches[0].name).toBe("nprbst/concurrent-a-1");
    expect(repoABranches.branches[1].name).toBe("nprbst/concurrent-a-2");

    expect(repoBBranches.branches[0].name).toBe("nprbst/concurrent-b-1");
    expect(repoBBranches.branches[1].name).toBe("nprbst/concurrent-b-2");

    // No cross-contamination
    expect(repoABranches.branches.every((b: any) => b.name.includes("-a-"))).toBe(true);
    expect(repoBBranches.branches.every((b: any) => b.name.includes("-b-"))).toBe(true);
  });
});
