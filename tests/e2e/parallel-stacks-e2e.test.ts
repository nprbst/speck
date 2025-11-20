/**
 * E2E Test: Parallel Branch Workflows in Multiple Child Repos (T048)
 *
 * Validates complete end-to-end parallel stacked branch workflows across
 * multiple child repositories without interference:
 * - Create stacked branches in multiple repos simultaneously
 * - Verify each repo maintains independent branches.json
 * - Verify aggregate status displays all repos correctly
 * - Verify branch name collisions are handled (disambiguation)
 *
 * Feature: 009-multi-repo-stacked (User Story 3)
 * Layer: 3 (E2E)
 * Created: 2025-11-20
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { $ } from "bun";
import path from "node:path";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import type { MultiRepoTestFixture } from "../helpers/multi-repo-fixtures";
import { createMultiRepoTestFixture } from "../helpers/multi-repo-fixtures";

describe("E2E: Parallel branch workflows in multiple child repos", () => {
  let fixture: MultiRepoTestFixture;

  beforeEach(async () => {
    // Set up multi-repo environment with three child repos
    fixture = await createMultiRepoTestFixture([
      { name: "backend-service" },
      { name: "frontend-app" },
      { name: "notification-service" }
    ], "007-multi-repo-monorepo-support");
  });

  afterEach(async () => {
    await fixture.cleanup();
  });

  test("T048.1: Create parallel stacked branches across three child repos", async () => {
    const backendRepo = fixture.childRepos.get("backend-service")!;
    const frontendRepo = fixture.childRepos.get("frontend-app")!;
    const notificationRepo = fixture.childRepos.get("notification-service")!;

    // Create stacked branches in backend-service
    await $`cd ${backendRepo} && bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/auth-db --base main --spec 009-multi-repo-stacked`;
    await $`cd ${backendRepo} && git add -A && git commit --allow-empty -m "feat: auth db"`;
    await $`cd ${backendRepo} && bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/auth-api --base nprbst/auth-db --spec 009-multi-repo-stacked`;
    await $`cd ${backendRepo} && git add -A && git commit --allow-empty -m "feat: auth api"`;

    // Create stacked branches in frontend-app (parallel work)
    await $`cd ${frontendRepo} && bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/login-ui --base main --spec 009-multi-repo-stacked`;
    await $`cd ${frontendRepo} && git add -A && git commit --allow-empty -m "feat: login ui"`;
    await $`cd ${frontendRepo} && bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/profile-ui --base nprbst/login-ui --spec 009-multi-repo-stacked`;
    await $`cd ${frontendRepo} && git add -A && git commit --allow-empty -m "feat: profile ui"`;

    // Create single branch in notification-service
    await $`cd ${notificationRepo} && bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/email-templates --base main --spec 009-multi-repo-stacked`;

    // E2E: Verify each repo has independent branches.json
    const backendBranchesPath = path.join(backendRepo, ".speck", "branches.json");
    const frontendBranchesPath = path.join(frontendRepo, ".speck", "branches.json");
    const notificationBranchesPath = path.join(notificationRepo, ".speck", "branches.json");

    expect(existsSync(backendBranchesPath)).toBe(true);
    expect(existsSync(frontendBranchesPath)).toBe(true);
    expect(existsSync(notificationBranchesPath)).toBe(true);

    // E2E: Verify branch counts per repo
    const backendData = JSON.parse(await readFile(backendBranchesPath, "utf-8"));
    const frontendData = JSON.parse(await readFile(frontendBranchesPath, "utf-8"));
    const notificationData = JSON.parse(await readFile(notificationBranchesPath, "utf-8"));

    expect(backendData.branches).toHaveLength(2);
    expect(frontendData.branches).toHaveLength(2);
    expect(notificationData.branches).toHaveLength(1);

    // E2E: Verify stacking relationships
    const backendBranches = backendData.branches;
    expect(backendBranches.find((b: any) => b.name === "nprbst/auth-db").baseBranch).toBe("main");
    expect(backendBranches.find((b: any) => b.name === "nprbst/auth-api").baseBranch).toBe("nprbst/auth-db");

    const frontendBranches = frontendData.branches;
    expect(frontendBranches.find((b: any) => b.name === "nprbst/login-ui").baseBranch).toBe("main");
    expect(frontendBranches.find((b: any) => b.name === "nprbst/profile-ui").baseBranch).toBe("nprbst/login-ui");

    // E2E: Verify parentSpecId in all child repos
    expect(backendBranches.every((b: any) => b.parentSpecId === "007-multi-repo-monorepo-support")).toBe(true);
    expect(frontendBranches.every((b: any) => b.parentSpecId === "007-multi-repo-monorepo-support")).toBe(true);
    expect(notificationData.branches.every((b: any) => b.parentSpecId === "007-multi-repo-monorepo-support")).toBe(true);
  });

  test("T048.2: Aggregate status view displays all repos correctly", async () => {
    const backendRepo = fixture.childRepos.get("backend-service")!;
    const frontendRepo = fixture.childRepos.get("frontend-app")!;
    const notificationRepo = fixture.childRepos.get("notification-service")!;

    // Create branches in all three repos
    await $`cd ${backendRepo} && bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/backend-work --base main --spec 009-multi-repo-stacked`;
    await $`cd ${frontendRepo} && bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/frontend-work --base main --spec 009-multi-repo-stacked`;
    await $`cd ${notificationRepo} && bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/notification-work --base main --spec 009-multi-repo-stacked`;

    // Run env command from root to get aggregate status
    const envResult = await $`
      cd ${fixture.rootDir} && \
      bun run ${fixture.scriptsDir}/env-command.ts
    `;

    const stdout = envResult.stdout.toString();

    // E2E: Verify aggregate status section exists
    expect(stdout).toContain("Branch Stack Status");

    // E2E: Verify all three child repos are listed
    expect(stdout).toContain("backend-service");
    expect(stdout).toContain("frontend-app");
    expect(stdout).toContain("notification-service");

    // E2E: Verify branch counts are displayed
    expect(stdout).toMatch(/1\s+active/); // Each repo has 1 active branch
  });

  test("T048.3: Branch name collision disambiguation across repos", async () => {
    const backendRepo = fixture.childRepos.get("backend-service")!;
    const frontendRepo = fixture.childRepos.get("frontend-app")!;

    // Create branches with identical names in different repos
    await $`cd ${backendRepo} && bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/api-v2 --base main --spec 009-multi-repo-stacked`;
    await $`cd ${frontendRepo} && bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/api-v2 --base main --spec 009-multi-repo-stacked`;

    // E2E: Verify both branches exist independently
    const backendData = JSON.parse(await readFile(path.join(backendRepo, ".speck", "branches.json"), "utf-8"));
    const frontendData = JSON.parse(await readFile(path.join(frontendRepo, ".speck", "branches.json"), "utf-8"));

    expect(backendData.branches[0].name).toBe("nprbst/api-v2");
    expect(frontendData.branches[0].name).toBe("nprbst/api-v2");

    // E2E: Run branch list --all to see disambiguation
    const listResult = await $`
      cd ${fixture.rootDir} && \
      bun run ${fixture.scriptsDir}/branch-command.ts list --all
    `.nothrow();

    const listOutput = listResult.stdout.toString();

    // E2E: Verify repos are grouped separately (disambiguation)
    expect(listOutput).toContain("backend-service");
    expect(listOutput).toContain("frontend-app");
    expect(listOutput).toContain("nprbst/api-v2");
  });

  test("T048.4: Operations in one child don't affect another child", async () => {
    const backendRepo = fixture.childRepos.get("backend-service")!;
    const frontendRepo = fixture.childRepos.get("frontend-app")!;

    // Create branch in backend
    await $`cd ${backendRepo} && bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/backend-branch --base main --spec 009-multi-repo-stacked`;

    // Read backend branches.json
    const backendDataBefore = JSON.parse(await readFile(path.join(backendRepo, ".speck", "branches.json"), "utf-8"));
    expect(backendDataBefore.branches).toHaveLength(1);

    // Create branch in frontend
    await $`cd ${frontendRepo} && bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/frontend-branch --base main --spec 009-multi-repo-stacked`;

    // Read backend branches.json again
    const backendDataAfter = JSON.parse(await readFile(path.join(backendRepo, ".speck", "branches.json"), "utf-8"));

    // E2E: Backend branches.json unchanged
    expect(backendDataAfter.branches).toHaveLength(1);
    expect(backendDataAfter.branches[0].name).toBe("nprbst/backend-branch");

    // E2E: Frontend has its own branch
    const frontendData = JSON.parse(await readFile(path.join(frontendRepo, ".speck", "branches.json"), "utf-8"));
    expect(frontendData.branches).toHaveLength(1);
    expect(frontendData.branches[0].name).toBe("nprbst/frontend-branch");
  });
});
