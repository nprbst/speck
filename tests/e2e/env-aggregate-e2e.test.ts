/**
 * E2E Test: /speck.env from root validates complete aggregate view (T040)
 *
 * Validates the complete end-to-end workflow for viewing aggregate branch
 * status across all repositories in a multi-repo setup, including:
 * - Root repo branch display
 * - Child repo branch aggregation
 * - Tree-based visualization
 * - PR number and status display
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

describe("E2E: /speck.env from root validates complete aggregate view", () => {
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

  test("T040: Display aggregate view with root and child branches", async () => {
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
      git commit -m "Add backend-auth branch"
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

    // Execute env command from root
    const result = await $`
      cd ${rootRepo} && \
      bun run ${fixture.scriptsDir}/env-command.ts
    `;

    const stdout = result.stdout.toString();

    // E2E: Verify multi-repo context indicator
    expect(stdout).toMatch(/Multi-Repo|multi-repo/i);

    // E2E: Verify root repo section
    expect(stdout).toMatch(/Root \(/i);  // Matches "Root (008-stacked-pr-support):"
    expect(stdout).toContain("nprbst/root-feature");
    expect(stdout).toContain("008-stacked-pr-support");

    // E2E: Verify backend child repo section
    expect(stdout).toContain("backend-service");
    expect(stdout).toContain("nprbst/backend-auth");
    expect(stdout).toContain("nprbst/backend-api");

    // E2E: Verify frontend child repo section
    expect(stdout).toContain("frontend-app");
    expect(stdout).toContain("nprbst/frontend-ui");

    // E2E: Verify spec ID displayed for all branches
    expect(stdout).toContain("009-multi-repo-stacked");

    // E2E: Verify status labels
    expect(stdout).toMatch(/active|submitted|merged/i);
  });

  test("T040: Display tree-based visualization for branch stacks", async () => {
    const rootRepo = fixture.rootDir;
    const backendRepo = fixture.childRepos.get("backend-service")!;

    // Create stacked branches in backend repo
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

    // Execute env command from root
    const result = await $`
      cd ${rootRepo} && \
      bun run ${fixture.scriptsDir}/env-command.ts
    `;

    const stdout = result.stdout.toString();

    // E2E: Verify tree visualization characters
    expect(stdout).toMatch(/[└├│─]/); // Tree drawing characters

    // E2E: Verify branch hierarchy displayed
    expect(stdout).toContain("nprbst/layer1");
    expect(stdout).toContain("nprbst/layer2");
    expect(stdout).toContain("nprbst/layer3");

    // E2E: Verify visual hierarchy (indentation or tree structure)
    const layer1Index = stdout.indexOf("nprbst/layer1");
    const layer2Index = stdout.indexOf("nprbst/layer2");
    const layer3Index = stdout.indexOf("nprbst/layer3");

    expect(layer1Index).toBeGreaterThan(-1);
    expect(layer2Index).toBeGreaterThan(layer1Index);
    expect(layer3Index).toBeGreaterThan(layer2Index);
  });

  test("T040: Display branch counts per repository", async () => {
    const rootRepo = fixture.rootDir;
    const backendRepo = fixture.childRepos.get("backend-service")!;
    const frontendRepo = fixture.childRepos.get("frontend-app")!;

    // Create multiple branches in backend
    await $`
      cd ${backendRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/backend-1 --base main --spec 009-multi-repo-stacked
    `.quiet();

    await $`
      cd ${backendRepo} && \
      git add . && \
      git commit -m "Add backend-1"
    `.quiet();

    await $`
      cd ${backendRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/backend-2 --base nprbst/backend-1 --spec 009-multi-repo-stacked
    `.quiet();

    // Create single branch in frontend
    await $`
      cd ${frontendRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/frontend-1 --base main --spec 009-multi-repo-stacked
    `.quiet();

    // Execute env command from root
    const result = await $`
      cd ${rootRepo} && \
      bun run ${fixture.scriptsDir}/env-command.ts
    `;

    const stdout = result.stdout.toString();

    // E2E: Verify branch counts displayed
    // Backend should show 2 branches
    const backendSection = stdout.substring(stdout.indexOf("backend-service"));
    expect(backendSection).toMatch(/2\s+(branch|active)/i);

    // Frontend should show 1 branch
    const frontendSection = stdout.substring(stdout.indexOf("frontend-app"));
    expect(frontendSection).toMatch(/1\s+(branch|active)/i);
  });

  test("T040: Handle child repos with no branches gracefully", async () => {
    const rootRepo = fixture.rootDir;
    const backendRepo = fixture.childRepos.get("backend-service")!;

    // Create branch in backend only
    await $`
      cd ${backendRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/backend-feat --base main --spec 009-multi-repo-stacked
    `.quiet();

    // Frontend has no branches

    // Execute env command from root
    const result = await $`
      cd ${rootRepo} && \
      bun run ${fixture.scriptsDir}/env-command.ts
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

  test("T040: Aggregate view includes PR numbers and status", async () => {
    const rootRepo = fixture.rootDir;
    const backendRepo = fixture.childRepos.get("backend-service")!;
    const branchesJsonPath = path.join(backendRepo, ".speck", "branches.json");

    // Create branch in backend
    await $`
      cd ${backendRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/backend-feat --base main --spec 009-multi-repo-stacked
    `.quiet();

    // Manually update branches.json to set PR number and status
    const { readFile, writeFile } = await import("node:fs/promises");
    const branchData = JSON.parse(await readFile(branchesJsonPath, "utf-8"));
    branchData.branches[0].pr = 42;
    branchData.branches[0].status = "submitted";
    await writeFile(branchesJsonPath, JSON.stringify(branchData, null, 2));

    // Execute env command from root
    const result = await $`
      cd ${rootRepo} && \
      bun run ${fixture.scriptsDir}/env-command.ts
    `;

    const stdout = result.stdout.toString();

    // E2E: Verify PR number displayed
    expect(stdout).toContain("42");
    expect(stdout).toMatch(/PR\s*#?42|#42/i);

    // E2E: Verify status displayed
    expect(stdout).toContain("submitted");
  });
});
