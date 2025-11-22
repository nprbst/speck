/**
 * Multi-Step Test: Session Context Preservation Across Commands (T068)
 *
 * Validates that session context (feature ID, repo mode, parent spec) is
 * maintained correctly across multiple command invocations within the same
 * workflow session.
 *
 * Tests verify:
 * - Multi-repo mode detection persists
 * - Parent spec ID remains consistent
 * - Current feature context preserved
 * - Working directory changes handled correctly
 *
 * Feature: 009-multi-repo-stacked (Phase 8)
 * Layer: 4 (Multi-Step Workflow)
 * Created: 2025-11-20
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { $ } from "bun";
import path from "node:path";
import { readFile } from "node:fs/promises";
import type { MultiRepoTestFixture } from "../helpers/multi-repo-fixtures";
import { createMultiRepoTestFixture } from "../helpers/multi-repo-fixtures";

describe("Multi-Step: Session context preservation", () => {
  let fixture: MultiRepoTestFixture;

  beforeEach(async () => {
    // Set up multi-repo environment
    fixture = await createMultiRepoTestFixture([
      { name: "backend-service" }
    ], "007-multi-repo-monorepo-support");
  });

  afterEach(async () => {
    await fixture.cleanup();
  });

  test("T068: Context preserved across branch operations in child repo", async () => {
    const childRepo = fixture.childRepos.get("backend-service")!;

    // Operation 1: Create first branch
    const result1 = await $`
      cd ${childRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/branch-1 --base main --spec 009-multi-repo-stacked
    `;

    expect(result1.stdout.toString()).toContain("✓ Created stacked branch");

    // Read branches.json to capture context
    const branchesJsonPath = path.join(childRepo, ".speck", "branches.json");
    const branchMapping1 = JSON.parse(await readFile(branchesJsonPath, "utf-8"));
    const parentSpecId1 = branchMapping1.branches[0].parentSpecId;

    expect(parentSpecId1).toBe("007-multi-repo-monorepo-support");

    // Commit
    await $`
      cd ${childRepo} && \
      git add .speck/branches.json && \
      git commit -m "Add branch-1"
    `.quiet();

    // Operation 2: Create second branch (should preserve same context)
    const result2 = await $`
      cd ${childRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/branch-2 --base nprbst/branch-1 --spec 009-multi-repo-stacked
    `;

    expect(result2.stdout.toString()).toContain("✓ Created stacked branch");

    // Verify context preserved
    const branchMapping2 = JSON.parse(await readFile(branchesJsonPath, "utf-8"));
    const parentSpecId2 = branchMapping2.branches[1].parentSpecId;

    expect(parentSpecId2).toBe("007-multi-repo-monorepo-support");
    expect(parentSpecId2).toBe(parentSpecId1); // Same as first operation

    // Commit
    await $`
      cd ${childRepo} && \
      git add .speck/branches.json && \
      git commit -m "Add branch-2"
    `.quiet();

    // Operation 3: List branches (should detect same context)
    const result3 = await $`
      cd ${childRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts list
    `;

    const listOutput = result3.stdout.toString();
    expect(listOutput).toContain("nprbst/branch-1");
    expect(listOutput).toContain("nprbst/branch-2");

    // Operation 4: Status command (should show consistent parent spec)
    const result4 = await $`
      cd ${childRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts status
    `;

    const statusOutput = result4.stdout.toString();
    // Verify status command runs successfully
    expect(result4.exitCode).toBe(0);
    // Status output should show branch information (format may vary)
    expect(statusOutput).toContain("009-multi-repo-stacked");

    // Verify all operations used consistent context
    expect(branchMapping2.branches[0].parentSpecId).toBe("007-multi-repo-monorepo-support");
    expect(branchMapping2.branches[1].parentSpecId).toBe("007-multi-repo-monorepo-support");
  });

  test("T068: Context preserved when switching directories within session", async () => {
    const childRepo = fixture.childRepos.get("backend-service")!;

    // Operation 1: Create branch from child repo
    await $`
      cd ${childRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/child-branch --base main --spec 009-multi-repo-stacked
    `.quiet();

    // Operation 2: View status from root (different directory)
    const rootStatusResult = await $`
      cd ${fixture.rootDir} && \
      bun run ${fixture.scriptsDir}/branch-command.ts status --all
    `;

    const rootStatusOutput = rootStatusResult.stdout.toString();

    // Should show child repo's branch
    expect(rootStatusOutput).toContain("backend-service");
    expect(rootStatusOutput).toContain("nprbst/child-branch");

    // Operation 3: Return to child and create another branch
    await $`
      cd ${childRepo} && \
      git add .speck/branches.json && \
      git commit -m "Add child-branch"
    `.quiet();

    await $`
      cd ${childRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/child-branch-2 --base nprbst/child-branch --spec 009-multi-repo-stacked
    `.quiet();

    // Operation 4: Verify context still consistent
    const branchesJsonPath = path.join(childRepo, ".speck", "branches.json");
    const branchMapping = JSON.parse(await readFile(branchesJsonPath, "utf-8"));

    expect(branchMapping.branches[0].parentSpecId).toBe("007-multi-repo-monorepo-support");
    expect(branchMapping.branches[1].parentSpecId).toBe("007-multi-repo-monorepo-support");
  });

  test("T068: Multi-repo mode detection consistent across operations", async () => {
    const childRepo = fixture.childRepos.get("backend-service")!;

    // Note: In test fixtures, .speck-link symlink is created at test root, not in child repo
    // Multi-repo detection works via bidirectional symlinks created by createMultiRepoTestFixture

    // Operation 1: env command should detect multi-repo child context
    const envResult1 = await $`
      cd ${childRepo} && \
      bun run ${fixture.scriptsDir}/env-command.ts
    `;

    const envOutput1 = envResult1.stdout.toString();
    expect(envOutput1).toContain("Multi-repo");
    expect(envOutput1).toContain("Child");
    expect(envOutput1).toContain("007-multi-repo-monorepo-support");

    // Operation 2: Create branch (should use same context detection)
    await $`
      cd ${childRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/test-branch --base main --spec 009-multi-repo-stacked
    `.quiet();

    // Operation 3: env command again (should show same context)
    const envResult2 = await $`
      cd ${childRepo} && \
      bun run ${fixture.scriptsDir}/env-command.ts
    `;

    const envOutput2 = envResult2.stdout.toString();
    expect(envOutput2).toContain("Multi-repo");
    expect(envOutput2).toContain("Child");
    expect(envOutput2).toContain("007-multi-repo-monorepo-support");

    // Verify outputs are consistent
    expect(envOutput1).toContain("Child");
    expect(envOutput2).toContain("Child");
  });

  test("T068: Feature spec ID preserved across workflow steps", async () => {
    const childRepo = fixture.childRepos.get("backend-service")!;
    const featureSpecId = "009-multi-repo-stacked";

    // Step 1: Create branch with feature spec
    await $`
      cd ${childRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/feature-1 --base main --spec ${featureSpecId}
    `.quiet();

    const branchesJsonPath = path.join(childRepo, ".speck", "branches.json");
    const branchMapping1 = JSON.parse(await readFile(branchesJsonPath, "utf-8"));

    expect(branchMapping1.branches[0].specId).toBe(featureSpecId);

    // Step 2: Create second branch (same feature spec)
    await $`
      cd ${childRepo} && \
      git add .speck/branches.json && \
      git commit -m "Add feature-1"
    `.quiet();

    await $`
      cd ${childRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/feature-2 --base nprbst/feature-1 --spec ${featureSpecId}
    `.quiet();

    const branchMapping2 = JSON.parse(await readFile(branchesJsonPath, "utf-8"));

    expect(branchMapping2.branches[1].specId).toBe(featureSpecId);

    // Step 3: List branches for feature
    const listResult = await $`
      cd ${childRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts list
    `;

    const listOutput = listResult.stdout.toString();
    expect(listOutput).toContain("nprbst/feature-1");
    expect(listOutput).toContain("nprbst/feature-2");

    // Verify specIndex maintains consistency
    expect(branchMapping2.specIndex[featureSpecId]).toContain("nprbst/feature-1");
    expect(branchMapping2.specIndex[featureSpecId]).toContain("nprbst/feature-2");
  });

  test("T068: Working directory state preserved after git operations", async () => {
    const childRepo = fixture.childRepos.get("backend-service")!;

    // Get initial branch
    const initialBranch = await $`git -C ${childRepo} rev-parse --abbrev-ref HEAD`.text();
    expect(initialBranch.trim()).toBe("main");

    // Operation 1: Create and checkout new branch
    await $`
      cd ${childRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/test-wd --base main --spec 009-multi-repo-stacked
    `.quiet();

    // Verify currently on new branch
    const currentBranch = await $`git -C ${childRepo} rev-parse --abbrev-ref HEAD`.text();
    expect(currentBranch.trim()).toBe("nprbst/test-wd");

    // Commit on new branch
    await $`
      cd ${childRepo} && \
      git add .speck/branches.json && \
      git commit -m "Add test-wd branch"
    `.quiet();

    // Operation 2: Create another branch from this one
    await $`
      cd ${childRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/test-wd-2 --base nprbst/test-wd --spec 009-multi-repo-stacked
    `.quiet();

    // Verify now on second new branch
    const finalBranch = await $`git -C ${childRepo} rev-parse --abbrev-ref HEAD`.text();
    expect(finalBranch.trim()).toBe("nprbst/test-wd-2");

    // Verify working directory state is clean
    const gitStatus = await $`git -C ${childRepo} status --porcelain`.text();
    // Should only have uncommitted branches.json
    expect(gitStatus).toContain("branches.json");
  });
});
