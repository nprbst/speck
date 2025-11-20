/**
 * Contract Test: /speck.env aggregate status output format
 *
 * Tests that env-command.ts produces correct multi-repo aggregate status display
 * when invoked from multi-repo root context.
 *
 * Success Criteria:
 * - Output includes "Branch Stack Status (Multi-Repo)" section
 * - Root repo branches displayed separately
 * - Each child repo displayed with repo name header
 * - Per-repo summaries include: feature, branch count, status counts
 * - Tree visualization shows dependency chains
 *
 * Task: T028 [P] [US2]
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import {
  createMultiRepoTestSetup,
  cleanupMultiRepoTest,
  executeScript
} from "../helpers/multi-repo-fixtures";
import * as fs from "fs";
import * as path from "path";

describe("env-command.ts - Aggregate Status Output Format", () => {
  let testSetup: any;

  beforeEach(async () => {
    // Create multi-repo setup: root + 2 child repos with branches
    testSetup = await createMultiRepoTestSetup({
      childRepos: ["backend-service", "frontend-app"],
      rootBranches: [
        { name: "nprbst/root-feature", specId: "008-stacked-pr-support", baseBranch: "main", status: "active" }
      ],
      childBranches: {
        "backend-service": [
          { name: "nprbst/auth-db", specId: "009-multi-repo-stacked", baseBranch: "main", status: "merged", pr: 50, parentSpecId: "007-multi-repo-monorepo-support" },
          { name: "nprbst/auth-api", specId: "009-multi-repo-stacked", baseBranch: "nprbst/auth-db", status: "active", pr: 51, parentSpecId: "007-multi-repo-monorepo-support" }
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

  test("displays multi-repo header when run from root", async () => {
    const result = await executeScript(
      path.join(testSetup.speckRoot, ".speck/scripts/env-command.ts"),
      [],
      { cwd: testSetup.speckRoot }
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Branch Stack Status (Multi-Repo)");
  });

  test("displays root repository section", async () => {
    const result = await executeScript(
      path.join(testSetup.speckRoot, ".speck/scripts/env-command.ts"),
      [],
      { cwd: testSetup.speckRoot }
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/Root \(008-stacked-pr-support\)/);
    expect(result.stdout).toMatch(/1 active/);
  });

  test("displays each child repository with header", async () => {
    const result = await executeScript(
      path.join(testSetup.speckRoot, ".speck/scripts/env-command.ts"),
      [],
      { cwd: testSetup.speckRoot }
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Child: backend-service");
    expect(result.stdout).toContain("Child: frontend-app");
  });

  test("displays per-repo summaries with feature and counts", async () => {
    const result = await executeScript(
      path.join(testSetup.speckRoot, ".speck/scripts/env-command.ts"),
      [],
      { cwd: testSetup.speckRoot }
    );

    expect(result.exitCode).toBe(0);

    // Backend service: 2 branches (1 merged, 1 active)
    const backendSection = extractSection(result.stdout, "Child: backend-service");
    expect(backendSection).toContain("009-multi-repo-stacked");
    expect(backendSection).toMatch(/1 active.*1 merged/s);

    // Frontend app: 1 branch (1 submitted)
    const frontendSection = extractSection(result.stdout, "Child: frontend-app");
    expect(frontendSection).toContain("009-multi-repo-stacked");
    expect(frontendSection).toMatch(/1 submitted/);
  });

  test("displays tree visualization for dependency chains", async () => {
    const result = await executeScript(
      path.join(testSetup.speckRoot, ".speck/scripts/env-command.ts"),
      [],
      { cwd: testSetup.speckRoot }
    );

    expect(result.exitCode).toBe(0);

    // Backend service tree: auth-db → auth-api
    const backendSection = extractSection(result.stdout, "Child: backend-service");
    expect(backendSection).toMatch(/└─ nprbst\/auth-db.*→ PR #50/);
    expect(backendSection).toMatch(/nprbst\/auth-api.*→ PR #51/);
  });

  test("handles empty child repos gracefully", async () => {
    // Create child repo without branches.json
    const emptyChild = path.join(testSetup.speckRoot, "empty-child");
    await fs.promises.mkdir(path.join(emptyChild, ".git"), { recursive: true });
    await fs.promises.symlink(
      emptyChild,
      path.join(testSetup.speckRoot, ".speck-link-empty-child")
    );

    const result = await executeScript(
      path.join(testSetup.speckRoot, ".speck/scripts/env-command.ts"),
      [],
      { cwd: testSetup.speckRoot }
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout).not.toContain("Child: empty-child");
  });

  test("displays PR numbers and status for each branch", async () => {
    const result = await executeScript(
      path.join(testSetup.speckRoot, ".speck/scripts/env-command.ts"),
      [],
      { cwd: testSetup.speckRoot }
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/PR #50/);
    expect(result.stdout).toMatch(/PR #51/);
    expect(result.stdout).toMatch(/PR #52/);
    expect(result.stdout).toMatch(/merged|active|submitted/);
  });

  test("exit code is 0 on successful display", async () => {
    const result = await executeScript(
      path.join(testSetup.speckRoot, ".speck/scripts/env-command.ts"),
      [],
      { cwd: testSetup.speckRoot }
    );

    expect(result.exitCode).toBe(0);
  });
});

/**
 * Extract text section between a header and the next header or end of output
 */
function extractSection(output: string, header: string): string {
  const lines = output.split("\n");
  const startIdx = lines.findIndex(line => line.includes(header));
  if (startIdx === -1) return "";

  const endIdx = lines.slice(startIdx + 1).findIndex(line =>
    line.match(/^(Root|Child:|\w+:)/)
  );

  return lines.slice(startIdx, endIdx === -1 ? undefined : startIdx + 1 + endIdx).join("\n");
}
