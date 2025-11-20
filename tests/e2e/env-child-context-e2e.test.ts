/**
 * E2E Test: /speck.env from child validates local stack with parent context (T042)
 *
 * Validates the complete end-to-end workflow for viewing environment status
 * from a child repository, including:
 * - Child context indicator
 * - Parent spec reference
 * - Local branch stack display (not aggregate)
 * - Proper isolation from other child repos
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

describe("E2E: /speck.env from child validates local stack with parent context", () => {
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

  test("T042: Display child context indicator", async () => {
    const backendRepo = fixture.childRepos.get("backend-service")!;

    // Create branch in backend child repo
    await $`
      cd ${backendRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/backend-feat --base main --spec 009-multi-repo-stacked
    `.quiet();

    // Execute env command from child repo
    const result = await $`
      cd ${backendRepo} && \
      bun run ${fixture.scriptsDir}/env-command.ts
    `;

    const stdout = result.stdout.toString();

    // E2E: Verify child context indicator
    expect(stdout).toMatch(/Child|child/i);
    expect(stdout).toContain("backend-service");

    // E2E: Verify NOT multi-repo aggregate view (no "Multi-Repo" header)
    expect(stdout).not.toMatch(/Multi-Repo.*Status/i);
  });

  test("T042: Display parent spec reference", async () => {
    const backendRepo = fixture.childRepos.get("backend-service")!;

    // Create branch in backend child repo
    await $`
      cd ${backendRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/backend-feat --base main --spec 009-multi-repo-stacked
    `.quiet();

    // Execute env command from child repo
    const result = await $`
      cd ${backendRepo} && \
      bun run ${fixture.scriptsDir}/env-command.ts
    `;

    const stdout = result.stdout.toString();

    // E2E: Verify parent spec ID displayed
    expect(stdout).toContain("007-multi-repo-monorepo-support");
    expect(stdout).toMatch(/Parent.*Spec|Parent.*007/i);
  });

  test("T042: Display local branch stack only (not aggregate)", async () => {
    const backendRepo = fixture.childRepos.get("backend-service")!;
    const frontendRepo = fixture.childRepos.get("frontend-app")!;

    // Create branches in backend child repo
    await $`
      cd ${backendRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/backend-layer1 --base main --spec 009-multi-repo-stacked
    `.quiet();

    await $`
      cd ${backendRepo} && \
      git add . && \
      git commit -m "Add backend-layer1"
    `.quiet();

    await $`
      cd ${backendRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/backend-layer2 --base nprbst/backend-layer1 --spec 009-multi-repo-stacked
    `.quiet();

    // Create branch in frontend child repo (should NOT appear in backend's env output)
    await $`
      cd ${frontendRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/frontend-feat --base main --spec 009-multi-repo-stacked
    `.quiet();

    // Execute env command from backend child repo
    const result = await $`
      cd ${backendRepo} && \
      bun run ${fixture.scriptsDir}/env-command.ts
    `;

    const stdout = result.stdout.toString();

    // E2E: Verify backend branches displayed
    expect(stdout).toContain("nprbst/backend-layer1");
    expect(stdout).toContain("nprbst/backend-layer2");

    // E2E: Verify frontend branches NOT displayed (isolation)
    expect(stdout).not.toContain("nprbst/frontend-feat");
    expect(stdout).not.toContain("frontend-app");
  });

  test("T042: Display tree visualization for local stack", async () => {
    const backendRepo = fixture.childRepos.get("backend-service")!;

    // Create stacked branches in backend
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

    // Execute env command from child repo
    const result = await $`
      cd ${backendRepo} && \
      bun run ${fixture.scriptsDir}/env-command.ts
    `;

    const stdout = result.stdout.toString();

    // E2E: Verify tree visualization characters
    expect(stdout).toMatch(/[└├│─]/); // Tree drawing characters

    // E2E: Verify all local branches displayed in hierarchy
    expect(stdout).toContain("nprbst/layer1");
    expect(stdout).toContain("nprbst/layer2");
    expect(stdout).toContain("nprbst/layer3");

    // E2E: Verify hierarchical ordering
    const layer1Index = stdout.indexOf("nprbst/layer1");
    const layer2Index = stdout.indexOf("nprbst/layer2");
    const layer3Index = stdout.indexOf("nprbst/layer3");

    expect(layer1Index).toBeGreaterThan(-1);
    expect(layer2Index).toBeGreaterThan(layer1Index);
    expect(layer3Index).toBeGreaterThan(layer2Index);
  });

  test("T042: Display branch counts for local repo", async () => {
    const backendRepo = fixture.childRepos.get("backend-service")!;

    // Create multiple branches in backend
    await $`
      cd ${backendRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/feat1 --base main --spec 009-multi-repo-stacked
    `.quiet();

    await $`
      cd ${backendRepo} && \
      git add . && \
      git commit -m "Add feat1"
    `.quiet();

    await $`
      cd ${backendRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/feat2 --base nprbst/feat1 --spec 009-multi-repo-stacked
    `.quiet();

    await $`
      cd ${backendRepo} && \
      git add . && \
      git commit -m "Add feat2"
    `.quiet();

    await $`
      cd ${backendRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/feat3 --base nprbst/feat2 --spec 009-multi-repo-stacked
    `.quiet();

    // Execute env command from child repo
    const result = await $`
      cd ${backendRepo} && \
      bun run ${fixture.scriptsDir}/env-command.ts
    `;

    const stdout = result.stdout.toString();

    // E2E: Verify branch count displayed (3 branches)
    expect(stdout).toMatch(/3\s+(branch|active)/i);
  });

  test("T042: Display PR numbers and status for local branches", async () => {
    const backendRepo = fixture.childRepos.get("backend-service")!;
    const branchesJsonPath = path.join(backendRepo, ".speck", "branches.json");
    const { readFile, writeFile } = await import("node:fs/promises");

    // Create branch in backend
    await $`
      cd ${backendRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/backend-feat --base main --spec 009-multi-repo-stacked
    `.quiet();

    // Update PR number and status
    const branchData = JSON.parse(await readFile(branchesJsonPath, "utf-8"));
    branchData.branches[0].pr = 42;
    branchData.branches[0].status = "submitted";
    await writeFile(branchesJsonPath, JSON.stringify(branchData, null, 2));

    // Execute env command from child repo
    const result = await $`
      cd ${backendRepo} && \
      bun run ${fixture.scriptsDir}/env-command.ts
    `;

    const stdout = result.stdout.toString();

    // E2E: Verify PR number displayed
    expect(stdout).toContain("42");
    expect(stdout).toMatch(/PR\s*#?42|#42/i);

    // E2E: Verify status displayed
    expect(stdout).toContain("submitted");
  });

  test("T042: Display spec ID for local branches", async () => {
    const backendRepo = fixture.childRepos.get("backend-service")!;

    // Create branch in backend
    await $`
      cd ${backendRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/backend-feat --base main --spec 009-multi-repo-stacked
    `.quiet();

    // Execute env command from child repo
    const result = await $`
      cd ${backendRepo} && \
      bun run ${fixture.scriptsDir}/env-command.ts
    `;

    const stdout = result.stdout.toString();

    // E2E: Verify spec ID displayed
    expect(stdout).toContain("009-multi-repo-stacked");
  });

  test("T042: Handle child repo with no branches gracefully", async () => {
    const backendRepo = fixture.childRepos.get("backend-service")!;

    // Execute env command from child repo with no branches
    const result = await $`
      cd ${backendRepo} && \
      bun run ${fixture.scriptsDir}/env-command.ts
    `;

    const stdout = result.stdout.toString();

    // E2E: Verify child context still shown
    expect(stdout).toMatch(/Child|child/i);
    expect(stdout).toContain("backend-service");

    // E2E: Verify parent spec reference still shown
    expect(stdout).toContain("007-multi-repo-monorepo-support");

    // E2E: Verify "no branches" message or empty branch list
    expect(stdout).toMatch(/no branches|0 branches|Branch Stack.*:\s*$/im);
  });

  test("T042: Display current git branch information", async () => {
    const backendRepo = fixture.childRepos.get("backend-service")!;

    // Create and checkout branch
    await $`
      cd ${backendRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/backend-feat --base main --spec 009-multi-repo-stacked
    `.quiet();

    // Execute env command from child repo
    const result = await $`
      cd ${backendRepo} && \
      bun run ${fixture.scriptsDir}/env-command.ts
    `;

    const stdout = result.stdout.toString();

    // E2E: Verify current branch displayed (should be on nprbst/backend-feat after creation)
    expect(stdout).toContain("nprbst/backend-feat");
  });

  test("T042: Verify isolation - child env does not show root repo branches", async () => {
    const rootRepo = fixture.rootDir;
    const backendRepo = fixture.childRepos.get("backend-service")!;

    // Create branch in root repo
    await $`
      cd ${rootRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/root-feat --base main --spec 008-stacked-pr-support
    `.quiet();

    // Create branch in backend child repo
    await $`
      cd ${backendRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/backend-feat --base main --spec 009-multi-repo-stacked
    `.quiet();

    // Execute env command from child repo
    const result = await $`
      cd ${backendRepo} && \
      bun run ${fixture.scriptsDir}/env-command.ts
    `;

    const stdout = result.stdout.toString();

    // E2E: Verify backend branch displayed
    expect(stdout).toContain("nprbst/backend-feat");

    // E2E: Verify root branch NOT displayed (isolation)
    expect(stdout).not.toContain("nprbst/root-feat");
    expect(stdout).not.toContain("008-stacked-pr-support");

    // E2E: Verify NO root repo section
    expect(stdout).not.toMatch(/Root Repository|Root repo/i);
  });
});
