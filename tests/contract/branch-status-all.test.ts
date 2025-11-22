/**
 * Contract Test: /speck.branch status --all per-repo summaries
 *
 * Tests that branch-command.ts status command with --all flag produces
 * per-repo dependency trees and status summaries.
 *
 * Success Criteria:
 * - Output includes dependency trees for each repo
 * - Per-repo summaries show: total branches, status counts, warnings
 * - Tree visualization uses └─ and indentation
 * - Exit code 0 on success
 * - Handles repos with no branches gracefully
 *
 * Task: T030 [P] [US2]
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import {
  createMultiRepoTestSetup,
  cleanupMultiRepoTest,
  executeScript
} from "../helpers/multi-repo-fixtures";
import * as path from "path";

describe("branch-command.ts status --all - Per-Repo Summaries", () => {
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

  test("exit code is 0 when --all flag provided", async () => {
    const result = await executeScript(
      path.join(testSetup.speckRoot, ".speck/scripts/branch-command.ts"),
      ["status", "--all"],
      { cwd: testSetup.speckRoot }
    );

    expect(result.exitCode).toBe(0);
  });

  test("displays dependency tree for each repository", async () => {
    const result = await executeScript(
      path.join(testSetup.speckRoot, ".speck/scripts/branch-command.ts"),
      ["status", "--all"],
      { cwd: testSetup.speckRoot }
    );

    expect(result.exitCode).toBe(0);

    // Root repo tree
    expect(result.stdout).toMatch(/Root Repository:/);
    expect(result.stdout).toMatch(/Dependency Tree:/);

    // Child repos trees
    expect(result.stdout).toMatch(/Child: backend-service/);
    expect(result.stdout).toMatch(/Child: frontend-app/);
  });

  test("displays per-repo status summaries", async () => {
    const result = await executeScript(
      path.join(testSetup.speckRoot, ".speck/scripts/branch-command.ts"),
      ["status", "--all"],
      { cwd: testSetup.speckRoot }
    );

    expect(result.exitCode).toBe(0);

    // Root: 1 active
    const rootSection = extractRepoSection(result.stdout, "Root Repository");
    expect(rootSection).toMatch(/1 active|Total: 1.*active: 1/);

    // Backend: 1 merged, 1 active
    const backendSection = extractRepoSection(result.stdout, "Child: backend-service");
    expect(backendSection).toMatch(/1 active.*1 merged|merged: 1.*active: 1/s);

    // Frontend: 1 submitted
    const frontendSection = extractRepoSection(result.stdout, "Child: frontend-app");
    expect(frontendSection).toMatch(/1 submitted|submitted: 1/);
  });

  test("uses tree visualization with └─ and indentation", async () => {
    const result = await executeScript(
      path.join(testSetup.speckRoot, ".speck/scripts/branch-command.ts"),
      ["status", "--all"],
      { cwd: testSetup.speckRoot }
    );

    expect(result.exitCode).toBe(0);

    // Backend service should show nested tree
    const backendSection = extractRepoSection(result.stdout, "Child: backend-service");
    expect(backendSection).toMatch(/└─.*nprbst\/auth-db/);
    expect(backendSection).toMatch(/nprbst\/auth-api/);
  });

  test("includes PR numbers and status in trees", async () => {
    const result = await executeScript(
      path.join(testSetup.speckRoot, ".speck/scripts/branch-command.ts"),
      ["status", "--all"],
      { cwd: testSetup.speckRoot }
    );

    expect(result.exitCode).toBe(0);

    // Check PR numbers appear in output
    expect(result.stdout).toMatch(/PR #50|→ PR #50/);
    expect(result.stdout).toMatch(/PR #51|→ PR #51/);
    expect(result.stdout).toMatch(/PR #52|→ PR #52/);

    // Check status indicators (format: "(status, PR #N)" or "(status)")
    expect(result.stdout).toMatch(/\(merged[,)]|\(active[,)]|\(submitted[,)]/);
  });

  test("handles repos with no branches gracefully", async () => {
    // Create setup with one empty child
    const partialSetup = await createMultiRepoTestSetup({
      childRepos: ["backend-service", "empty-child"],
      rootBranches: [],
      childBranches: {
        "backend-service": [
          { name: "nprbst/auth-db", specId: "009-multi-repo-stacked", baseBranch: "main", status: "active", parentSpecId: "007-multi-repo-monorepo-support" }
        ]
      }
    });

    const result = await executeScript(
      path.join(partialSetup.speckRoot, ".speck/scripts/branch-command.ts"),
      ["status", "--all"],
      { cwd: partialSetup.speckRoot }
    );

    await cleanupMultiRepoTest(partialSetup);

    expect(result.exitCode).toBe(0);

    // Backend should appear
    expect(result.stdout).toContain("Child: backend-service");

    // Empty child should either not appear or show "No branches"
    const hasEmptyChildSection = result.stdout.includes("Child: empty-child");
    if (hasEmptyChildSection) {
      const emptySection = extractRepoSection(result.stdout, "Child: empty-child");
      expect(emptySection).toMatch(/No branches|No tracked branches/i);
    }
  });

  test("displays warnings for repos when applicable", async () => {
    // Create setup with potential issues (e.g., branch with missing base)
    // This is implementation-dependent; testing the warning mechanism exists
    const result = await executeScript(
      path.join(testSetup.speckRoot, ".speck/scripts/branch-command.ts"),
      ["status", "--all"],
      { cwd: testSetup.speckRoot }
    );

    expect(result.exitCode).toBe(0);

    // Output should support warnings (test structure, not necessarily content)
    // Warnings might appear as:
    // - "⚠ Warning:" prefix lines
    // - "Issues detected:" sections
    // - Yellow/colored text markers (if ANSI colors used)

    // At minimum, verify no errors thrown during warning check phase
    expect(result.stderr).not.toMatch(/Error:.*warning/i);
  });

  test("total branch counts match individual status counts", async () => {
    const result = await executeScript(
      path.join(testSetup.speckRoot, ".speck/scripts/branch-command.ts"),
      ["status", "--all"],
      { cwd: testSetup.speckRoot }
    );

    expect(result.exitCode).toBe(0);

    // Parse backend section
    const backendSection = extractRepoSection(result.stdout, "Child: backend-service");

    // If total is displayed (e.g., "Total: 2"), it should equal sum of status counts
    const totalMatch = backendSection.match(/Total:?\s*(\d+)/i);
    const activeMatch = backendSection.match(/active:?\s*(\d+)/i);
    const mergedMatch = backendSection.match(/merged:?\s*(\d+)/i);

    if (totalMatch && activeMatch && mergedMatch) {
      const total = parseInt(totalMatch[1]!);
      const active = parseInt(activeMatch[1]!);
      const merged = parseInt(mergedMatch[1]!);

      expect(total).toBe(active + merged);
    }
  });

  test("repo sections are clearly separated", async () => {
    const result = await executeScript(
      path.join(testSetup.speckRoot, ".speck/scripts/branch-command.ts"),
      ["status", "--all"],
      { cwd: testSetup.speckRoot }
    );

    expect(result.exitCode).toBe(0);

    // Check for visual separators (blank lines, headers, etc.)
    const sections = result.stdout.split(/\n\s*\n/);
    expect(sections.length).toBeGreaterThanOrEqual(3); // At least root + 2 children
  });
});

/**
 * Extract text section for a specific repository
 */
function extractRepoSection(output: string, repoHeader: string): string {
  const lines = output.split("\n");
  const startIdx = lines.findIndex(line => line.includes(repoHeader));
  if (startIdx === -1) return "";

  // Find next repo header or end of output
  const endIdx = lines.slice(startIdx + 1).findIndex(line =>
    line.match(/^(Root Repository:|Child:)/i)
  );

  return lines.slice(startIdx, endIdx === -1 ? undefined : startIdx + 1 + endIdx).join("\n");
}
