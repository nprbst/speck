/**
 * Contract Test: /speck.branch list --all output grouping
 *
 * Tests that branch-command.ts list command with --all flag produces
 * correct output format with repo grouping.
 *
 * Success Criteria:
 * - Output groups branches by repository (root, then children alphabetically)
 * - Each group has repo header
 * - Branch details include: name, base, spec, PR#, status
 * - Table format is consistent across repos
 * - Exit code 0 on success
 *
 * Task: T029 [P] [US2]
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import {
  createMultiRepoTestSetup,
  cleanupMultiRepoTest,
  executeScript
} from "../helpers/multi-repo-fixtures";
import * as path from "path";

describe("branch-command.ts list --all - Repo Grouping", () => {
  let testSetup: any;

  beforeEach(async () => {
    testSetup = await createMultiRepoTestSetup({
      childRepos: ["backend-service", "frontend-app"],
      rootBranches: [
        { name: "nprbst/core-refactor", specId: "008-stacked-pr-support", baseBranch: "main", status: "active", pr: 38 }
      ],
      childBranches: {
        "backend-service": [
          { name: "nprbst/auth-db", specId: "009-multi-repo-stacked", baseBranch: "main", status: "merged", pr: 50, parentSpecId: "007-multi-repo-monorepo-support" },
          { name: "nprbst/auth-api", specId: "009-multi-repo-stacked", baseBranch: "nprbst/auth-db", status: "active", parentSpecId: "007-multi-repo-monorepo-support" }
        ],
        "frontend-app": [
          { name: "nprbst/login-ui", specId: "009-multi-repo-stacked", baseBranch: "main", status: "submitted", pr: 52, parentSpecId: "007-multi-repo-monorepo-support" }
        ]
      }
    });
  });

  afterEach(async () => {
    await cleanupMultiRepoTest(testSetup);
  });

  test("exit code is 0 when --all flag provided", async () => {
    const result = await executeScript(
      path.join(testSetup.speckRoot, ".speck/scripts/branch-command.ts"),
      ["list", "--all"],
      { cwd: testSetup.speckRoot }
    );

    expect(result.exitCode).toBe(0);
  });

  test("displays root repository group header", async () => {
    const result = await executeScript(
      path.join(testSetup.speckRoot, ".speck/scripts/branch-command.ts"),
      ["list", "--all"],
      { cwd: testSetup.speckRoot }
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/Root Repository:/);
  });

  test("displays child repository group headers", async () => {
    const result = await executeScript(
      path.join(testSetup.speckRoot, ".speck/scripts/branch-command.ts"),
      ["list", "--all"],
      { cwd: testSetup.speckRoot }
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Child: backend-service");
    expect(result.stdout).toContain("Child: frontend-app");
  });

  test("groups branches by repository", async () => {
    const result = await executeScript(
      path.join(testSetup.speckRoot, ".speck/scripts/branch-command.ts"),
      ["list", "--all"],
      { cwd: testSetup.speckRoot }
    );

    expect(result.exitCode).toBe(0);

    const lines = result.stdout.split("\n");
    let currentGroup = "";
    const groupedBranches: Record<string, string[]> = {
      root: [],
      "backend-service": [],
      "frontend-app": []
    };

    for (const line of lines) {
      if (line.includes("Root Repository")) {
        currentGroup = "root";
      } else if (line.includes("Child: backend-service")) {
        currentGroup = "backend-service";
      } else if (line.includes("Child: frontend-app")) {
        currentGroup = "frontend-app";
      } else if (line.includes("nprbst/") && currentGroup) {
        groupedBranches[currentGroup]?.push(line);
      }
    }

    expect(groupedBranches.root).toHaveLength(1);
    expect(groupedBranches["backend-service"]).toHaveLength(2);
    expect(groupedBranches["frontend-app"]).toHaveLength(1);
  });

  test("includes all branch details in table format", async () => {
    const result = await executeScript(
      path.join(testSetup.speckRoot, ".speck/scripts/branch-command.ts"),
      ["list", "--all"],
      { cwd: testSetup.speckRoot }
    );

    expect(result.exitCode).toBe(0);

    // Check for table headers
    expect(result.stdout).toMatch(/Branch.*Base.*Spec.*PR#.*Status/);

    // Check root branch details
    expect(result.stdout).toMatch(/nprbst\/core-refactor.*main.*008-stacked-pr-support.*38.*active/);

    // Check backend service branches
    expect(result.stdout).toMatch(/nprbst\/auth-db.*main.*009-multi-repo-stacked.*50.*merged/);
    expect(result.stdout).toMatch(/nprbst\/auth-api.*nprbst\/auth-db.*009-multi-repo-stacked.*-.*active/);

    // Check frontend app branch
    expect(result.stdout).toMatch(/nprbst\/login-ui.*main.*009-multi-repo-stacked.*52.*submitted/);
  });

  test("displays empty message when no branches exist", async () => {
    // Create clean multi-repo setup with no branches
    const emptySetup = await createMultiRepoTestSetup({
      childRepos: ["empty-child"],
      rootBranches: [],
      childBranches: {}
    });

    const result = await executeScript(
      path.join(emptySetup.speckRoot, ".speck/scripts/branch-command.ts"),
      ["list", "--all"],
      { cwd: emptySetup.speckRoot }
    );

    await cleanupMultiRepoTest(emptySetup);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/No branches found|no tracked branches/i);
  });

  test("handles missing PR numbers with dash placeholder", async () => {
    const result = await executeScript(
      path.join(testSetup.speckRoot, ".speck/scripts/branch-command.ts"),
      ["list", "--all"],
      { cwd: testSetup.speckRoot }
    );

    expect(result.exitCode).toBe(0);

    // nprbst/auth-api has no PR number
    const authApiLine = result.stdout.split("\n").find(line => line.includes("nprbst/auth-api"));
    expect(authApiLine).toMatch(/-\s+(active|submitted|merged)/);
  });

  test("sorts child repos alphabetically", async () => {
    const result = await executeScript(
      path.join(testSetup.speckRoot, ".speck/scripts/branch-command.ts"),
      ["list", "--all"],
      { cwd: testSetup.speckRoot }
    );

    expect(result.exitCode).toBe(0);

    const childHeaders = result.stdout
      .split("\n")
      .filter(line => line.includes("Child:"))
      .map(line => line.match(/Child: (.+)/)?.[1]);

    expect(childHeaders).toEqual(["backend-service", "frontend-app"]);
  });

  test("table columns are aligned consistently", async () => {
    const result = await executeScript(
      path.join(testSetup.speckRoot, ".speck/scripts/branch-command.ts"),
      ["list", "--all"],
      { cwd: testSetup.speckRoot }
    );

    expect(result.exitCode).toBe(0);

    // Check that table has consistent column spacing
    const tableLines = result.stdout.split("\n").filter(line =>
      line.match(/nprbst\//)
    );

    // All lines should have similar structure (whitespace-separated columns)
    const columnCounts = tableLines.map(line =>
      line.trim().split(/\s{2,}/).length
    );

    expect(new Set(columnCounts).size).toBeLessThanOrEqual(2); // Allow header vs data variation
  });
});
