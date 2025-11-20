/**
 * Contract Test: Independent Branch Stacks Per Child Repo (T043)
 *
 * Validates that each child repository maintains independent `.speck/branches.json` files:
 * - Each child has its own branches.json file
 * - Branch operations in one child don't affect another child
 * - Each branches.json has independent specIndex
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

describe("Contract: Independent branches.json files per child repo", () => {
  let fixture: MultiRepoTestFixture;

  beforeEach(async () => {
    // Set up multi-repo environment with two child repos
    fixture = await createMultiRepoTestFixture([
      { name: "backend-service" },
      { name: "frontend-app" }
    ], "007-multi-repo-monorepo-support");
  });

  afterEach(async () => {
    await fixture.cleanup();
  });

  test("T043.1: Each child repo has independent branches.json file", async () => {
    const backendRepo = fixture.childRepos.get("backend-service")!;
    const frontendRepo = fixture.childRepos.get("frontend-app")!;

    // Create branch in backend-service
    await $`
      cd ${backendRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/auth-db --base main --spec 009-multi-repo-stacked
    `.nothrow();

    // Create branch in frontend-app
    await $`
      cd ${frontendRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/login-ui --base main --spec 009-multi-repo-stacked
    `.nothrow();

    // Contract: Both repos have their own branches.json files
    const backendBranchesFile = path.join(backendRepo, ".speck", "branches.json");
    const frontendBranchesFile = path.join(frontendRepo, ".speck", "branches.json");

    expect(existsSync(backendBranchesFile)).toBe(true);
    expect(existsSync(frontendBranchesFile)).toBe(true);
  });

  test("T043.2: Branch operations in one child don't affect another", async () => {
    const backendRepo = fixture.childRepos.get("backend-service")!;
    const frontendRepo = fixture.childRepos.get("frontend-app")!;

    // Create branch in backend-service
    await $`
      cd ${backendRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/auth-db --base main --spec 009-multi-repo-stacked
    `.nothrow();

    // Read backend branches.json
    const backendBranchesFile = path.join(backendRepo, ".speck", "branches.json");
    const backendData = JSON.parse(await readFile(backendBranchesFile, "utf-8"));

    // Contract: Backend has 1 branch
    expect(backendData.branches).toHaveLength(1);
    expect(backendData.branches[0].name).toBe("nprbst/auth-db");

    // Create branch in frontend-app
    await $`
      cd ${frontendRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/login-ui --base main --spec 009-multi-repo-stacked
    `.nothrow();

    // Re-read backend branches.json
    const backendDataAfter = JSON.parse(await readFile(backendBranchesFile, "utf-8"));

    // Contract: Backend still has only 1 branch (unchanged)
    expect(backendDataAfter.branches).toHaveLength(1);
    expect(backendDataAfter.branches[0].name).toBe("nprbst/auth-db");

    // Read frontend branches.json
    const frontendBranchesFile = path.join(frontendRepo, ".speck", "branches.json");
    const frontendData = JSON.parse(await readFile(frontendBranchesFile, "utf-8"));

    // Contract: Frontend has 1 branch
    expect(frontendData.branches).toHaveLength(1);
    expect(frontendData.branches[0].name).toBe("nprbst/login-ui");
  });

  test("T043.3: Each branches.json has independent specIndex", async () => {
    const backendRepo = fixture.childRepos.get("backend-service")!;
    const frontendRepo = fixture.childRepos.get("frontend-app")!;

    // Create branches in backend-service (spec 009)
    await $`
      cd ${backendRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/auth-db --base main --spec 009-multi-repo-stacked
    `.nothrow();

    // Create branch in frontend-app (different spec - 008)
    await $`
      cd ${frontendRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/login-ui --base main --spec 008-stacked-pr-support
    `.nothrow();

    // Read backend branches.json
    const backendBranchesFile = path.join(backendRepo, ".speck", "branches.json");
    const backendData = JSON.parse(await readFile(backendBranchesFile, "utf-8"));

    // Read frontend branches.json
    const frontendBranchesFile = path.join(frontendRepo, ".speck", "branches.json");
    const frontendData = JSON.parse(await readFile(frontendBranchesFile, "utf-8"));

    // Contract: Backend specIndex only has 009
    expect(Object.keys(backendData.specIndex)).toContain("009-multi-repo-stacked");
    expect(Object.keys(backendData.specIndex)).not.toContain("008-stacked-pr-support");

    // Contract: Frontend specIndex only has 008
    expect(Object.keys(frontendData.specIndex)).toContain("008-stacked-pr-support");
    expect(Object.keys(frontendData.specIndex)).not.toContain("009-multi-repo-stacked");
  });

  test("T043.4: Branches in one child don't appear in another child's branches.json", async () => {
    const backendRepo = fixture.childRepos.get("backend-service")!;
    const frontendRepo = fixture.childRepos.get("frontend-app")!;

    // Create 2 branches in backend-service
    await $`cd ${backendRepo} && bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/backend-1 --base main --spec 009-multi-repo-stacked && git add -A && git commit --allow-empty -m "feat: backend 1"`.nothrow();
    await $`cd ${backendRepo} && bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/backend-2 --base main --spec 009-multi-repo-stacked`.nothrow();

    // Create 1 branch in frontend-app
    await $`cd ${frontendRepo} && bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/frontend-1 --base main --spec 009-multi-repo-stacked`.nothrow();

    // Read backend branches.json
    const backendBranchesFile = path.join(backendRepo, ".speck", "branches.json");
    const backendData = JSON.parse(await readFile(backendBranchesFile, "utf-8"));

    // Read frontend branches.json
    const frontendBranchesFile = path.join(frontendRepo, ".speck", "branches.json");
    const frontendData = JSON.parse(await readFile(frontendBranchesFile, "utf-8"));

    // Contract: Backend has exactly 2 branches
    expect(backendData.branches).toHaveLength(2);
    const backendNames = backendData.branches.map((b: any) => b.name);
    expect(backendNames).toContain("nprbst/backend-1");
    expect(backendNames).toContain("nprbst/backend-2");
    expect(backendNames).not.toContain("nprbst/frontend-1");

    // Contract: Frontend has exactly 1 branch
    expect(frontendData.branches).toHaveLength(1);
    expect(frontendData.branches[0].name).toBe("nprbst/frontend-1");
    expect(frontendData.branches.map((b: any) => b.name)).not.toContain("nprbst/backend-1");
    expect(frontendData.branches.map((b: any) => b.name)).not.toContain("nprbst/backend-2");
  });
});
