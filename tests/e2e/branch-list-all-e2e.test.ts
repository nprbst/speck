/**
 * E2E Test: /speck.branch list --all validates repo grouping and disambiguation (T041)
 *
 * Validates the complete end-to-end workflow for listing branches across
 * all repositories with proper grouping and disambiguation, including:
 * - Branch listing from all repos
 * - Repository grouping headers
 * - Branch name disambiguation
 * - PR numbers and status display
 *
 * Feature: 009-multi-repo-stacked (User Story 2)
 * Layer: 3 (E2E)
 * Created: 2025-11-19
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { $ } from "bun";
import path from "node:path";
import type { MultiRepoTestFixture } from "../helpers/multi-repo-fixtures";
import { createMultiRepoTestFixture } from "../helpers/multi-repo-fixtures";

describe("E2E: /speck.branch list --all validates repo grouping and disambiguation", () => {
  let fixture: MultiRepoTestFixture;

  beforeEach(async () => {
    // Set up multi-repo environment with two children
    fixture = await createMultiRepoTestFixture([
      { name: "backend-service" },
      { name: "frontend-app" }
    ], "007-multi-repo-monorepo-support");
  });

  afterEach(async () => {
    await fixture.cleanup();
  });

  test("T041: List all branches with repository grouping", async () => {
    const rootRepo = fixture.rootDir;
    const backendRepo = fixture.childRepos.get("backend-service")!;
    const frontendRepo = fixture.childRepos.get("frontend-app")!;

    // Create branch in root repo
    await $`
      cd ${rootRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/root-feature --base main --spec 008-stacked-pr-support --skip-pr-prompt
    `.quiet();

    // Create branches in backend child repo
    await $`
      cd ${backendRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/backend-auth --base main --spec 009-multi-repo-stacked
    `.quiet();

    await $`
      cd ${backendRepo} && \
      git add . && \
      git commit -m "Add backend-auth"
    `.quiet();

    await $`
      cd ${backendRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/backend-api --base nprbst/backend-auth --spec 009-multi-repo-stacked
    `.quiet();

    // Create branch in frontend child repo
    await $`
      cd ${frontendRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/frontend-ui --base main --spec 009-multi-repo-stacked
    `.quiet();

    // Execute branch list --all from root
    const result = await $`
      cd ${rootRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts list --all
    `;

    const stdout = result.stdout.toString();

    // E2E: Verify repository grouping headers
    expect(stdout).toMatch(/Root Repository|Root repo/i);
    expect(stdout).toContain("backend-service");
    expect(stdout).toContain("frontend-app");

    // E2E: Verify all branches listed
    expect(stdout).toContain("nprbst/root-feature");
    expect(stdout).toContain("nprbst/backend-auth");
    expect(stdout).toContain("nprbst/backend-api");
    expect(stdout).toContain("nprbst/frontend-ui");

    // E2E: Verify spec IDs displayed
    expect(stdout).toContain("008-stacked-pr-support");
    expect(stdout).toContain("009-multi-repo-stacked");
  });

  test("T041: Verify repository section ordering (root first, then children)", async () => {
    const rootRepo = fixture.rootDir;
    const backendRepo = fixture.childRepos.get("backend-service")!;
    const frontendRepo = fixture.childRepos.get("frontend-app")!;

    // Create branches in all repos
    await $`
      cd ${rootRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/root-feat --base main --spec 008-stacked-pr-support --skip-pr-prompt
    `.quiet();

    await $`
      cd ${backendRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/backend-feat --base main --spec 009-multi-repo-stacked
    `.quiet();

    await $`
      cd ${frontendRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/frontend-feat --base main --spec 009-multi-repo-stacked
    `.quiet();

    // Execute branch list --all from root
    const result = await $`
      cd ${rootRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts list --all
    `;

    const stdout = result.stdout.toString();

    // E2E: Verify section ordering
    const rootIndex = stdout.search(/Root Repository|Root repo/i);
    const backendIndex = stdout.indexOf("backend-service");
    const frontendIndex = stdout.indexOf("frontend-app");

    expect(rootIndex).toBeGreaterThan(-1);
    expect(backendIndex).toBeGreaterThan(rootIndex);
    expect(frontendIndex).toBeGreaterThan(rootIndex);
  });

  test("T041: Disambiguate branches with same name across repos", async () => {
    const rootRepo = fixture.rootDir;
    const backendRepo = fixture.childRepos.get("backend-service")!;
    const frontendRepo = fixture.childRepos.get("frontend-app")!;
    const { readFile, writeFile } = await import("node:fs/promises");

    // Create branch with same name in both child repos
    await $`
      cd ${backendRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/feature-v2 --base main --spec 009-multi-repo-stacked
    `.quiet();

    await $`
      cd ${frontendRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/feature-v2 --base main --spec 009-multi-repo-stacked
    `.quiet();

    // Set different PR numbers to verify they're distinct
    const backendBranchesPath = path.join(backendRepo, ".speck", "branches.json");
    const frontendBranchesPath = path.join(frontendRepo, ".speck", "branches.json");

    const backendData = JSON.parse(await readFile(backendBranchesPath, "utf-8"));
    backendData.branches[0].pr = 42;
    backendData.branches[0].status = "submitted";
    await writeFile(backendBranchesPath, JSON.stringify(backendData, null, 2));

    const frontendData = JSON.parse(await readFile(frontendBranchesPath, "utf-8"));
    frontendData.branches[0].pr = 99;
    frontendData.branches[0].status = "active";
    await writeFile(frontendBranchesPath, JSON.stringify(frontendData, null, 2));

    // Execute branch list --all from root
    const result = await $`
      cd ${rootRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts list --all
    `;

    const stdout = result.stdout.toString();

    // E2E: Verify both branches shown under different repo sections
    expect(stdout).toContain("backend-service");
    expect(stdout).toContain("frontend-app");

    // E2E: Extract repo sections
    const backendStart = stdout.indexOf("backend-service");
    const frontendStart = stdout.indexOf("frontend-app");
    const backendSection = stdout.substring(backendStart, frontendStart);
    const frontendSection = stdout.substring(frontendStart);

    // E2E: Verify both sections contain same branch name
    expect(backendSection).toContain("nprbst/feature-v2");
    expect(frontendSection).toContain("nprbst/feature-v2");

    // E2E: Verify different PR numbers confirm disambiguation
    expect(backendSection).toContain("42");
    expect(frontendSection).toContain("99");

    // E2E: Verify different statuses
    expect(backendSection).toContain("submitted");
    expect(frontendSection).toContain("active");
  });

  test("T041: Display PR numbers and status for all branches", async () => {
    const rootRepo = fixture.rootDir;
    const backendRepo = fixture.childRepos.get("backend-service")!;
    const frontendRepo = fixture.childRepos.get("frontend-app")!;
    const { readFile, writeFile } = await import("node:fs/promises");

    // Create branches in both child repos
    await $`
      cd ${backendRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/backend-feat --base main --spec 009-multi-repo-stacked
    `.quiet();

    await $`
      cd ${frontendRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/frontend-feat --base main --spec 009-multi-repo-stacked
    `.quiet();

    // Update PR numbers and statuses
    const backendBranchesPath = path.join(backendRepo, ".speck", "branches.json");
    const frontendBranchesPath = path.join(frontendRepo, ".speck", "branches.json");

    const backendData = JSON.parse(await readFile(backendBranchesPath, "utf-8"));
    backendData.branches[0].pr = 100;
    backendData.branches[0].status = "merged";
    await writeFile(backendBranchesPath, JSON.stringify(backendData, null, 2));

    const frontendData = JSON.parse(await readFile(frontendBranchesPath, "utf-8"));
    frontendData.branches[0].pr = 101;
    frontendData.branches[0].status = "submitted";
    await writeFile(frontendBranchesPath, JSON.stringify(frontendData, null, 2));

    // Execute branch list --all from root
    const result = await $`
      cd ${rootRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts list --all
    `;

    const stdout = result.stdout.toString();

    // E2E: Verify PR numbers displayed
    expect(stdout).toContain("100");
    expect(stdout).toContain("101");

    // E2E: Verify status labels displayed
    expect(stdout).toContain("merged");
    expect(stdout).toContain("submitted");
  });

  test("T041: Handle child repos with no branches gracefully", async () => {
    const rootRepo = fixture.rootDir;
    const backendRepo = fixture.childRepos.get("backend-service")!;

    // Create branch in backend only
    await $`
      cd ${backendRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/backend-feat --base main --spec 009-multi-repo-stacked
    `.quiet();

    // Frontend has no branches

    // Execute branch list --all from root
    const result = await $`
      cd ${rootRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts list --all
    `;

    const stdout = result.stdout.toString();

    // E2E: Verify backend shown with branch
    expect(stdout).toContain("backend-service");
    expect(stdout).toContain("nprbst/backend-feat");

    // E2E: Verify frontend either not shown or shown with "no branches" message
    const hasFrontend = stdout.includes("frontend-app");
    if (hasFrontend) {
      expect(stdout).toMatch(/no branches|0 branches/i);
    }
  });

  test("T041: Display base branch information for each branch", async () => {
    const rootRepo = fixture.rootDir;
    const backendRepo = fixture.childRepos.get("backend-service")!;

    // Create stacked branches
    await $`
      cd ${backendRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/layer1 --base main --spec 009-multi-repo-stacked
    `.quiet();

    await $`
      cd ${backendRepo} && \
      git add . && \
      git commit -m "Add layer1"
    `.quiet();

    await $`
      cd ${backendRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/layer2 --base nprbst/layer1 --spec 009-multi-repo-stacked
    `.quiet();

    await $`
      cd ${backendRepo} && \
      git add . && \
      git commit -m "Add layer2"
    `.quiet();

    await $`
      cd ${backendRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/layer3 --base nprbst/layer2 --spec 009-multi-repo-stacked
    `.quiet();

    // Execute branch list --all from root
    const result = await $`
      cd ${rootRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts list --all
    `;

    const stdout = result.stdout.toString();

    // E2E: Verify all branches listed
    expect(stdout).toContain("nprbst/layer1");
    expect(stdout).toContain("nprbst/layer2");
    expect(stdout).toContain("nprbst/layer3");

    // E2E: Verify base branch information displayed
    expect(stdout).toContain("main"); // layer1's base
  });

  test("T041: List command works from child repo (local view only)", async () => {
    const backendRepo = fixture.childRepos.get("backend-service")!;
    const frontendRepo = fixture.childRepos.get("frontend-app")!;

    // Create branches in both repos
    await $`
      cd ${backendRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/backend-feat --base main --spec 009-multi-repo-stacked
    `.quiet();

    await $`
      cd ${frontendRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/frontend-feat --base main --spec 009-multi-repo-stacked
    `.quiet();

    // Execute branch list --all from child repo (should still show aggregate)
    const result = await $`
      cd ${backendRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts list --all
    `;

    const stdout = result.stdout.toString();

    // E2E: When --all used from child, should still show aggregate view
    expect(stdout).toContain("backend-service");
    expect(stdout).toContain("nprbst/backend-feat");

    // Should also show other child repos when --all is used
    expect(stdout).toContain("frontend-app");
    expect(stdout).toContain("nprbst/frontend-feat");
  });
});
