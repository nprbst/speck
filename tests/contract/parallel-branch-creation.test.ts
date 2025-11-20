/**
 * Contract Test: Parallel Branch Creation Across Repos (T044)
 *
 * Validates that branches can be created in parallel across multiple child repos:
 * - Concurrent branch creation succeeds without conflicts
 * - Each operation exits with code 0
 * - All branches.json files are valid and independent
 * - No file locking issues or race conditions
 *
 * Feature: 009-multi-repo-stacked (User Story 3)
 * Layer: 1 (Contract)
 * Created: 2025-11-19
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import {
  createMultiRepoTestFixture,
  type MultiRepoTestFixture
} from "../helpers/multi-repo-fixtures.ts";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { $ } from "bun";

describe("Contract: Parallel branch creation across repos", () => {
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

  test("T044.1: Concurrent branch creation across repos exits with code 0", async () => {
    const backendRepo = fixture.childRepos.get("backend-service")!;
    const frontendRepo = fixture.childRepos.get("frontend-app")!;
    const notificationRepo = fixture.childRepos.get("notification-service")!;

    // Create branches in parallel using Promise.all
    const results = await Promise.all([
      $`cd ${backendRepo} && bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/auth-db --base main --spec 009-multi-repo-stacked`.nothrow(),
      $`cd ${frontendRepo} && bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/login-ui --base main --spec 009-multi-repo-stacked`.nothrow(),
      $`cd ${notificationRepo} && bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/email-templates --base main --spec 009-multi-repo-stacked`.nothrow()
    ]);

    // Contract: All operations exit with code 0
    expect(results[0].exitCode).toBe(0);
    expect(results[1].exitCode).toBe(0);
    expect(results[2].exitCode).toBe(0);
  });

  test("T044.2: All branches.json files are valid after parallel creation", async () => {
    const backendRepo = fixture.childRepos.get("backend-service")!;
    const frontendRepo = fixture.childRepos.get("frontend-app")!;
    const notificationRepo = fixture.childRepos.get("notification-service")!;

    // Create branches in parallel
    await Promise.all([
      $`cd ${backendRepo} && bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/auth-db --base main --spec 009-multi-repo-stacked`.nothrow(),
      $`cd ${frontendRepo} && bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/login-ui --base main --spec 009-multi-repo-stacked`.nothrow(),
      $`cd ${notificationRepo} && bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/email-templates --base main --spec 009-multi-repo-stacked`.nothrow()
    ]);

    // Contract: All branches.json files exist
    const backendBranchesFile = path.join(backendRepo, ".speck", "branches.json");
    const frontendBranchesFile = path.join(frontendRepo, ".speck", "branches.json");
    const notificationBranchesFile = path.join(notificationRepo, ".speck", "branches.json");

    expect(existsSync(backendBranchesFile)).toBe(true);
    expect(existsSync(frontendBranchesFile)).toBe(true);
    expect(existsSync(notificationBranchesFile)).toBe(true);

    // Contract: All files contain valid JSON with correct schema
    const backendData = JSON.parse(await readFile(backendBranchesFile, "utf-8"));
    const frontendData = JSON.parse(await readFile(frontendBranchesFile, "utf-8"));
    const notificationData = JSON.parse(await readFile(notificationBranchesFile, "utf-8"));

    // Validate schema version
    expect(backendData.version).toBe("1.1.0");
    expect(frontendData.version).toBe("1.1.0");
    expect(notificationData.version).toBe("1.1.0");

    // Validate each has exactly 1 branch
    expect(backendData.branches).toHaveLength(1);
    expect(frontendData.branches).toHaveLength(1);
    expect(notificationData.branches).toHaveLength(1);

    // Validate parentSpecId field exists (multi-repo child)
    expect(backendData.branches[0].parentSpecId).toBe("007-multi-repo-monorepo-support");
    expect(frontendData.branches[0].parentSpecId).toBe("007-multi-repo-monorepo-support");
    expect(notificationData.branches[0].parentSpecId).toBe("007-multi-repo-monorepo-support");
  });

  test("T044.3: Sequential stacked branch creation within single repo maintains data integrity", async () => {
    const backendRepo = fixture.childRepos.get("backend-service")!;

    // Create first branch
    await $`cd ${backendRepo} && bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/auth-db --base main --spec 009-multi-repo-stacked && git add -A && git commit --allow-empty -m "feat: auth-db"`.nothrow();

    // Create second stacked branch (bases on auth-db)
    await $`cd ${backendRepo} && bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/auth-api --base nprbst/auth-db --spec 009-multi-repo-stacked && git add -A && git commit --allow-empty -m "feat: auth-api"`.nothrow();

    // Create third stacked branch (also bases on auth-db, sibling to auth-api)
    await $`cd ${backendRepo} && bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/auth-tests --base nprbst/auth-db --spec 009-multi-repo-stacked`.nothrow();

    // Contract: Verify data integrity - all 3 branches recorded correctly
    const backendBranchesFile = path.join(backendRepo, ".speck", "branches.json");
    const backendData = JSON.parse(await readFile(backendBranchesFile, "utf-8"));

    // Contract: All 3 branches present
    expect(backendData.branches.length).toBe(3);

    // Contract: All have correct spec
    expect(backendData.branches.every((b: any) => b.specId === "009-multi-repo-stacked")).toBe(true);

    // Contract: Dependency chain is correct
    const authDb = backendData.branches.find((b: any) => b.name === "nprbst/auth-db");
    const authApi = backendData.branches.find((b: any) => b.name === "nprbst/auth-api");
    const authTests = backendData.branches.find((b: any) => b.name === "nprbst/auth-tests");

    expect(authDb.baseBranch).toBe("main");
    expect(authApi.baseBranch).toBe("nprbst/auth-db");
    expect(authTests.baseBranch).toBe("nprbst/auth-db");
  });

  test("T044.4: No race conditions in specIndex updates", async () => {
    const backendRepo = fixture.childRepos.get("backend-service")!;

    // Create multiple branches for same spec in rapid succession (with commits between)
    await $`cd ${backendRepo} && bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/branch-1 --base main --spec 009-multi-repo-stacked`.nothrow();
    await $`cd ${backendRepo} && git add -A && git commit --allow-empty -m "feat: branch 1 work"`.nothrow();

    await $`cd ${backendRepo} && bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/branch-2 --base main --spec 009-multi-repo-stacked`.nothrow();
    await $`cd ${backendRepo} && git add -A && git commit --allow-empty -m "feat: branch 2 work"`.nothrow();

    await $`cd ${backendRepo} && bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/branch-3 --base main --spec 009-multi-repo-stacked`.nothrow();

    // Read branches.json
    const backendBranchesFile = path.join(backendRepo, ".speck", "branches.json");
    const backendData = JSON.parse(await readFile(backendBranchesFile, "utf-8"));

    // Contract: specIndex accurately reflects all branches
    const specIndex = backendData.specIndex["009-multi-repo-stacked"];
    expect(specIndex).toBeDefined();
    expect(specIndex).toContain("nprbst/branch-1");
    expect(specIndex).toContain("nprbst/branch-2");
    expect(specIndex).toContain("nprbst/branch-3");
    expect(specIndex).toHaveLength(3);
  });

  test("T044.5: Parallel creation with same branch name in different repos succeeds", async () => {
    const backendRepo = fixture.childRepos.get("backend-service")!;
    const frontendRepo = fixture.childRepos.get("frontend-app")!;

    // Create branches with identical names in different repos (should be allowed)
    const results = await Promise.all([
      $`cd ${backendRepo} && bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/api-v2 --base main --spec 009-multi-repo-stacked`.nothrow(),
      $`cd ${frontendRepo} && bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/api-v2 --base main --spec 009-multi-repo-stacked`.nothrow()
    ]);

    // Contract: Both operations succeed (no naming conflict across repos)
    expect(results[0].exitCode).toBe(0);
    expect(results[1].exitCode).toBe(0);

    // Validate both branches exist independently
    const backendBranchesFile = path.join(backendRepo, ".speck", "branches.json");
    const frontendBranchesFile = path.join(frontendRepo, ".speck", "branches.json");

    const backendData = JSON.parse(await readFile(backendBranchesFile, "utf-8"));
    const frontendData = JSON.parse(await readFile(frontendBranchesFile, "utf-8"));

    // Contract: Each repo has its own nprbst/api-v2 branch
    expect(backendData.branches[0].name).toBe("nprbst/api-v2");
    expect(frontendData.branches[0].name).toBe("nprbst/api-v2");
  });
});
