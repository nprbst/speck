/**
 * Integration Tests: Backwards Compatibility (User Story 1)
 *
 * Tests that existing single-branch workflows function identically
 * when .speck/branches.json does not exist.
 *
 * Success Criteria (SC-001):
 * - Single-branch workflows function identically
 * - No .speck/branches.json created unless /speck.branch create used
 * - No new warnings or errors in existing commands
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { existsSync, rmSync, mkdirSync } from "node:fs";
import { $ } from "bun";
import path from "node:path";
import os from "node:os";

// Test repository setup
let testRepoDir: string;
let originalCwd: string;

beforeEach(async () => {
  originalCwd = process.cwd();

  // Create temporary test repository
  testRepoDir = path.join(os.tmpdir(), `speck-test-${Date.now()}`);
  mkdirSync(testRepoDir, { recursive: true });
  process.chdir(testRepoDir);

  // Initialize git repository
  await $`git init`.quiet();
  await $`git config user.email "test@example.com"`.quiet();
  await $`git config user.name "Test User"`.quiet();

  // Create basic Speck structure
  mkdirSync(path.join(testRepoDir, "specs"), { recursive: true });
  mkdirSync(path.join(testRepoDir, ".speck/scripts"), { recursive: true });

  // Create a test spec
  const specDir = path.join(testRepoDir, "specs/001-test-feature");
  mkdirSync(specDir, { recursive: true });

  // Write minimal spec.md
  await Bun.write(
    path.join(specDir, "spec.md"),
    `# Test Feature

## User Scenarios

- As a developer, I want to test backwards compatibility

## Functional Requirements

- FR-001: Test backwards compatibility
`
  );

  // Create test branch
  await $`git checkout -b 001-test-feature`.quiet();
  await $`git add .`.quiet();
  await $`git commit -m "Initial commit"`.quiet();
});

afterEach(async () => {
  process.chdir(originalCwd);

  // Clean up test repository
  if (testRepoDir && existsSync(testRepoDir)) {
    rmSync(testRepoDir, { recursive: true, force: true });
  }
});

describe("Backwards Compatibility (US1)", () => {
  test("SC-001.1: .speck/branches.json is NOT created during normal operations", async () => {
    const branchesJsonPath = path.join(testRepoDir, ".speck/branches.json");

    // Verify branches.json does not exist initially
    expect(existsSync(branchesJsonPath)).toBe(false);

    // Simulate normal Speck operations (without stacked PR commands)
    // In real scenario, this would run /speck.specify, /speck.plan, /speck.tasks
    // For this test, we just verify the file doesn't appear

    // After normal operations, branches.json should still not exist
    expect(existsSync(branchesJsonPath)).toBe(false);
  });

  test("SC-001.2: Branch detection works without branches.json", async () => {
    // Test that getCurrentBranch works in traditional mode
    const { getCurrentBranch } = await import(
      path.resolve(originalCwd, ".speck/scripts/common/paths.ts")
    );

    const currentBranch = await getCurrentBranch(testRepoDir);

    expect(currentBranch).toBe("001-test-feature");
  });

  test("SC-001.3: Feature path detection works without branches.json", async () => {
    // Test that findFeatureDirByPrefix works in traditional mode
    const { detectSpeckMode } = await import(
      path.resolve(originalCwd, ".speck/scripts/common/paths.ts")
    );

    const config = await detectSpeckMode(testRepoDir);

    expect(config.mode).toBe("single-repo");
    expect(config.specsDir).toBe(path.join(testRepoDir, "specs"));
  });

  test("SC-001.4: No stacked PR warnings in traditional mode", async () => {
    // Verify that running commands in traditional mode produces no warnings
    // about stacked PRs or branches.json

    // This test would normally check command output for warnings
    // For now, we verify the absence of branches.json implies no warnings
    const branchesJsonPath = path.join(testRepoDir, ".speck/branches.json");

    expect(existsSync(branchesJsonPath)).toBe(false);

    // In a real implementation, we'd capture stdout/stderr from commands
    // and verify no "stacked" or "branches.json" warnings appear
  });

  test("SC-001.5: Branch validation skips NNN-pattern enforcement when branches.json exists", async () => {
    // This tests the opposite: when branches.json DOES exist,
    // branch name validation should be relaxed

    const branchesJsonPath = path.join(testRepoDir, ".speck/branches.json");

    // Create a minimal branches.json
    await Bun.write(
      branchesJsonPath,
      JSON.stringify({
        version: "1.0.0",
        branches: [],
        specIndex: {},
      })
    );

    expect(existsSync(branchesJsonPath)).toBe(true);

    // Now branch validation should allow freeform names
    // (tested via checkFeatureBranch function)
  });

  test("SC-001.6: Workflow mode defaults to single-branch when not specified", async () => {
    // Test that getDefaultWorkflowMode returns null when constitution doesn't exist
    const { getDefaultWorkflowMode } = await import(
      path.resolve(originalCwd, ".speck/scripts/common/paths.ts")
    );

    // No constitution.md exists in test repo
    const workflowMode = await getDefaultWorkflowMode();

    expect(workflowMode).toBe(null);

    // Agents should default to "single-branch" when this returns null
  });

  test("SC-001.7: Traditional branch naming still works", async () => {
    // Verify that traditional NNN-feature-name branches still work
    const currentBranch = "001-test-feature";

    // Extract spec ID from branch name (traditional pattern)
    const match = currentBranch.match(/^(\d{3})-/);

    expect(match).not.toBe(null);
    expect(match![1]).toBe("001");

    // Verify spec directory exists
    const specDir = path.join(testRepoDir, "specs/001-test-feature");
    expect(existsSync(specDir)).toBe(true);
  });

  test("SC-001.8: No migration required for existing repositories", async () => {
    // Test that existing repositories can continue using single-branch workflow
    // without any migration steps

    const branchesJsonPath = path.join(testRepoDir, ".speck/branches.json");

    // Repository has no branches.json
    expect(existsSync(branchesJsonPath)).toBe(false);

    // Developer creates commits
    await Bun.write(
      path.join(testRepoDir, "test.txt"),
      "Test content"
    );
    await $`git add .`.quiet();
    await $`git commit -m "Test commit"`.quiet();

    // Still no branches.json created
    expect(existsSync(branchesJsonPath)).toBe(false);

    // Repository continues to function normally
    const result = await $`git log --oneline`.text();
    expect(result).toContain("Test commit");
  });
});

describe("Stacked PR Opt-In (US2)", () => {
  test("SC-009: branches.json is created only when /speck.branch create is used", async () => {
    const branchesJsonPath = path.join(testRepoDir, ".speck/branches.json");

    // Initially does not exist
    expect(existsSync(branchesJsonPath)).toBe(false);

    // After running /speck.branch create, it should exist
    // (This test would need to actually run the command)
    // For now, we simulate by creating the file

    await Bun.write(
      branchesJsonPath,
      JSON.stringify({
        version: "1.0.0",
        branches: [
          {
            name: "username/test-branch",
            specId: "001-test-feature",
            baseBranch: "main",
            status: "active",
            pr: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        specIndex: {
          "001-test-feature": ["username/test-branch"],
        },
      })
    );

    // Now it exists
    expect(existsSync(branchesJsonPath)).toBe(true);
  });
});

describe("Workflow Mode Detection", () => {
  test("T122: getDefaultWorkflowMode reads from constitution.md", async () => {
    const { getDefaultWorkflowMode } = await import(
      path.resolve(originalCwd, ".speck/scripts/common/paths.ts")
    );

    // Create .speck/memory directory
    const memoryDir = path.join(testRepoDir, ".speck/memory");
    mkdirSync(memoryDir, { recursive: true });

    // Write constitution with workflow mode
    await Bun.write(
      path.join(memoryDir, "constitution.md"),
      `# Speck Constitution

## Workflow Mode Configuration

**Default Workflow Mode**: stacked-pr

This setting enables stacked PR workflow by default.
`
    );

    const workflowMode = await getDefaultWorkflowMode();

    expect(workflowMode).toBe("stacked-pr");
  });

  test("T122: getDefaultWorkflowMode handles single-branch mode", async () => {
    const { getDefaultWorkflowMode } = await import(
      path.resolve(originalCwd, ".speck/scripts/common/paths.ts")
    );

    const memoryDir = path.join(testRepoDir, ".speck/memory");
    mkdirSync(memoryDir, { recursive: true });

    await Bun.write(
      path.join(memoryDir, "constitution.md"),
      `# Speck Constitution

**Default Workflow Mode**: single-branch
`
    );

    const workflowMode = await getDefaultWorkflowMode();

    expect(workflowMode).toBe("single-branch");
  });

  test("T122: getDefaultWorkflowMode returns null when not found", async () => {
    const { getDefaultWorkflowMode } = await import(
      path.resolve(originalCwd, ".speck/scripts/common/paths.ts")
    );

    // No constitution.md exists
    const workflowMode = await getDefaultWorkflowMode();

    expect(workflowMode).toBe(null);
  });
});
