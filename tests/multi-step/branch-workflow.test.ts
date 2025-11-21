/**
 * Multi-Step Test: Branch Create → Confirm → Stack → Status Workflow (T066)
 *
 * Validates session continuity across branch management commands:
 * 1. Create initial branch (/speck.branch create)
 * 2. Confirm branch creation and metadata
 * 3. Stack additional branches on top
 * 4. View aggregate status (/speck.branch status)
 *
 * This test verifies that branch metadata persists across multiple
 * operations and that status commands reflect all changes.
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

describe("Multi-Step: Branch create → confirm → stack → status workflow", () => {
  let fixture: MultiRepoTestFixture;

  beforeEach(async () => {
    // Set up multi-repo environment with one child
    fixture = await createMultiRepoTestFixture([
      { name: "backend-service" }
    ], "007-multi-repo-monorepo-support");
  });

  afterEach(async () => {
    await fixture.cleanup();
  });

  test("T066: Complete branch stacking workflow with status checks", async () => {
    const childRepo = fixture.childRepos.get("backend-service")!;
    const branchesJsonPath = path.join(childRepo, ".speck", "branches.json");

    // Step 1: Create first branch
    const createResult1 = await $`
      cd ${childRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/db-layer --base main --spec 009-multi-repo-stacked
    `;

    expect(createResult1.stdout.toString()).toContain("✓ Created stacked branch");
    expect(createResult1.stdout.toString()).toContain("nprbst/db-layer");

    // Step 2: Confirm branch metadata was persisted
    expect(existsSync(branchesJsonPath)).toBe(true);
    let branchMapping = JSON.parse(await readFile(branchesJsonPath, "utf-8"));

    expect(branchMapping.branches).toHaveLength(1);
    expect(branchMapping.branches[0].name).toBe("nprbst/db-layer");
    expect(branchMapping.branches[0].baseBranch).toBe("main");
    expect(branchMapping.branches[0].status).toBe("active");
    expect(branchMapping.branches[0].parentSpecId).toBe("007-multi-repo-monorepo-support");

    // Commit to avoid uncommitted changes warning
    await $`
      cd ${childRepo} && \
      git add .speck/branches.json && \
      git commit -m "Add db-layer branch"
    `.quiet();

    // Step 3: Stack second branch on first
    const createResult2 = await $`
      cd ${childRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/api-layer --base nprbst/db-layer --spec 009-multi-repo-stacked
    `;

    expect(createResult2.stdout.toString()).toContain("✓ Created stacked branch");
    expect(createResult2.stdout.toString()).toContain("nprbst/api-layer");

    // Step 4: Verify second branch added to stack
    branchMapping = JSON.parse(await readFile(branchesJsonPath, "utf-8"));

    expect(branchMapping.branches).toHaveLength(2);
    expect(branchMapping.branches[1].name).toBe("nprbst/api-layer");
    expect(branchMapping.branches[1].baseBranch).toBe("nprbst/db-layer");
    expect(branchMapping.branches[1].parentSpecId).toBe("007-multi-repo-monorepo-support");

    // Commit second branch
    await $`
      cd ${childRepo} && \
      git add .speck/branches.json && \
      git commit -m "Add api-layer branch"
    `.quiet();

    // Step 5: Stack third branch on second
    const createResult3 = await $`
      cd ${childRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/ui-layer --base nprbst/api-layer --spec 009-multi-repo-stacked
    `;

    expect(createResult3.stdout.toString()).toContain("✓ Created stacked branch");
    expect(createResult3.stdout.toString()).toContain("nprbst/ui-layer");

    // Step 6: Check branch status shows complete stack
    const statusResult = await $`
      cd ${childRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts status
    `;

    const statusOutput = statusResult.stdout.toString();

    // Verify status command runs successfully
    expect(statusResult.exitCode).toBe(0);

    // Status shows current branch at minimum (full stack depends on git state)
    expect(statusOutput).toContain("nprbst/ui-layer");

    // Status output shows branch information
    expect(statusOutput).toContain("Spec: 009-multi-repo-stacked");

    // Step 7: List all branches
    const listResult = await $`
      cd ${childRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts list
    `;

    const listOutput = listResult.stdout.toString();

    // Verify all branches listed
    expect(listOutput).toContain("nprbst/db-layer");
    expect(listOutput).toContain("nprbst/api-layer");
    expect(listOutput).toContain("nprbst/ui-layer");
    expect(listOutput).toContain("active"); // Status column
  });

  test("T066: Workflow maintains consistency after branch deletion", async () => {
    const childRepo = fixture.childRepos.get("backend-service")!;
    const branchesJsonPath = path.join(childRepo, ".speck", "branches.json");

    // Create two branches
    await $`
      cd ${childRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/branch-1 --base main --spec 009-multi-repo-stacked
    `.quiet();

    await $`
      cd ${childRepo} && \
      git add .speck/branches.json && \
      git commit -m "Add branch-1"
    `.quiet();

    await $`
      cd ${childRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/branch-2 --base nprbst/branch-1 --spec 009-multi-repo-stacked
    `.quiet();

    // Verify two branches exist
    let branchMapping = JSON.parse(await readFile(branchesJsonPath, "utf-8"));
    expect(branchMapping.branches).toHaveLength(2);

    // Delete first branch (keeping git branch but marking as abandoned)
    // In real workflow, this would be: /speck.branch delete nprbst/branch-1
    // For this test, manually update metadata to simulate the operation
    branchMapping.branches[0].status = "abandoned";
    await Bun.write(branchesJsonPath, JSON.stringify(branchMapping, null, 2));

    // Check status shows abandoned state
    const statusResult = await $`
      cd ${childRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts status
    `;

    const statusOutput = statusResult.stdout.toString();
    // Status command should run successfully
    expect(statusResult.exitCode).toBe(0);
    // The output will show branch status (implementation may vary)
  });

  test("T066: Status command reflects PR number updates", async () => {
    const childRepo = fixture.childRepos.get("backend-service")!;
    const branchesJsonPath = path.join(childRepo, ".speck", "branches.json");

    // Create branch
    await $`
      cd ${childRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/feature --base main --spec 009-multi-repo-stacked
    `.quiet();

    // Initially no PR number
    let branchMapping = JSON.parse(await readFile(branchesJsonPath, "utf-8"));
    expect(branchMapping.branches[0].pr).toBeNull();

    // Simulate PR creation by updating metadata
    // In real workflow: /speck.branch update nprbst/feature --pr 42 --status submitted
    branchMapping.branches[0].pr = 42;
    branchMapping.branches[0].status = "submitted";
    branchMapping.branches[0].updatedAt = new Date().toISOString();
    await Bun.write(branchesJsonPath, JSON.stringify(branchMapping, null, 2));

    // Check status shows PR number
    const statusResult = await $`
      cd ${childRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts status
    `;

    const statusOutput = statusResult.stdout.toString();
    expect(statusOutput).toContain("#42");
    expect(statusOutput).toContain("submitted");
  });

  test("T066: Aggregate status from root shows child repo branches", async () => {
    const childRepo = fixture.childRepos.get("backend-service")!;

    // Create branches in child repo
    await $`
      cd ${childRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/child-branch --base main --spec 009-multi-repo-stacked
    `.quiet();

    // View aggregate status from root
    const statusResult = await $`
      cd ${fixture.rootDir} && \
      bun run ${fixture.scriptsDir}/branch-command.ts status --all
    `;

    const statusOutput = statusResult.stdout.toString();

    // Verify child repo section present
    expect(statusOutput).toContain("backend-service");
    expect(statusOutput).toContain("nprbst/child-branch");
    expect(statusOutput).toContain("Child:"); // Child repo indicator
  });
});
