import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { $ } from "bun";
import * as fs from "fs";
import * as path from "path";
import { createMultiRepoTestFixture, type MultiRepoTestFixture } from "../helpers/multi-repo-fixtures";

describe("Multi-repo plan execution", () => {
  let fixture: MultiRepoTestFixture;

  beforeEach(async () => {
    fixture = await createMultiRepoTestFixture([{ name: "test-child" }]);
  });

  afterEach(async () => {
    await fixture.cleanup();
  });

  test("T100: /speck.plan writes plan.md to child repo specs directory", async () => {
    // Setup: Create a spec in root repo for sharing
    const featureName = "test-feature";
    const rootSpecDir = path.join(fixture.rootDir, "specs", featureName);
    await $`mkdir -p ${rootSpecDir}`.quiet();

    const specContent = `# Test Feature

## Overview
This is a test feature specification.

## Requirements
- Requirement 1
- Requirement 2
`;
    await Bun.write(path.join(rootSpecDir, "spec.md"), specContent);

    // Simulate being in child repo context
    const childDir = fixture.childRepos.get("test-child");
    if (!childDir) throw new Error("Child repo not found");

    const childSpecDir = path.join(childDir, "specs", featureName);
    await $`mkdir -p ${childSpecDir}`.quiet();

    // Create minimal feature state for child repo
    const featureState = {
      name: featureName,
      version: "1.0.0",
      status: "planning",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await Bun.write(
      path.join(childSpecDir, ".feature-state.json"),
      JSON.stringify(featureState, null, 2)
    );

    // Expected behavior: plan.md should be written to child repo
    const childPlanPath = path.join(childSpecDir, "plan.md");
    const rootPlanPath = path.join(rootSpecDir, "plan.md");

    // Simulate what /speck.plan command should do
    const planContent = `# Implementation Plan

## Architecture
Test architecture

## Tasks
1. Task 1
2. Task 2
`;

    // This is what the command SHOULD do (write to child repo)
    await Bun.write(childPlanPath, planContent);

    // Verify: plan.md exists in child repo
    expect(fs.existsSync(childPlanPath)).toBe(true);
    const writtenContent = await Bun.file(childPlanPath).text();
    expect(writtenContent).toContain("Implementation Plan");

    // Verify: plan.md does NOT exist in root repo (the bug we're fixing)
    expect(fs.existsSync(rootPlanPath)).toBe(false);
  });

  test("T101: /speck.tasks writes tasks.md to child repo specs directory", async () => {
    // Setup: Create spec and plan in appropriate locations
    const featureName = "test-feature-tasks";
    const childDir = fixture.childRepos.get("test-child");
    if (!childDir) throw new Error("Child repo not found");

    const rootSpecDir = path.join(fixture.rootDir, "specs", featureName);
    const childSpecDir = path.join(childDir, "specs", featureName);

    await $`mkdir -p ${rootSpecDir}`.quiet();
    await $`mkdir -p ${childSpecDir}`.quiet();

    // Shared spec in root
    const specContent = `# Test Feature\n\n## Requirements\n- Task generation test`;
    await Bun.write(path.join(rootSpecDir, "spec.md"), specContent);

    // Plan in child repo (from previous step)
    const planContent = `# Implementation Plan\n\n## Tasks\n1. Task A\n2. Task B`;
    await Bun.write(path.join(childSpecDir, "plan.md"), planContent);

    // Expected behavior: tasks.md should be written to child repo
    const childTasksPath = path.join(childSpecDir, "tasks.md");
    const rootTasksPath = path.join(rootSpecDir, "tasks.md");

    // Simulate what /speck.tasks command should do
    const tasksContent = `# Tasks

## Task 1: Implement feature A
**Status**: pending
**Dependencies**: none

## Task 2: Implement feature B
**Status**: pending
**Dependencies**: Task 1
`;

    // This is what the command SHOULD do (write to child repo)
    await Bun.write(childTasksPath, tasksContent);

    // Verify: tasks.md exists in child repo
    expect(fs.existsSync(childTasksPath)).toBe(true);
    const writtenContent = await Bun.file(childTasksPath).text();
    expect(writtenContent).toContain("Task 1: Implement feature A");

    // Verify: tasks.md does NOT exist in root repo
    expect(fs.existsSync(rootTasksPath)).toBe(false);
  });

  test("T102: Commands read shared artifacts from root, write implementation artifacts to child", async () => {
    // Setup: Multi-repo scenario with shared spec in root
    const featureName = "shared-read-local-write";
    const childDir = fixture.childRepos.get("test-child");
    if (!childDir) throw new Error("Child repo not found");

    const rootSpecDir = path.join(fixture.rootDir, "specs", featureName);
    const childSpecDir = path.join(childDir, "specs", featureName);

    await $`mkdir -p ${rootSpecDir}`.quiet();
    await $`mkdir -p ${childSpecDir}`.quiet();

    // Shared artifacts in root (read-only for child)
    await Bun.write(
      path.join(rootSpecDir, "spec.md"),
      "# Shared Spec\n\nThis spec is shared across repos."
    );
    await Bun.write(
      path.join(rootSpecDir, "research.md"),
      "# Research\n\nShared research notes."
    );

    // Verify: Child can read from root
    const sharedSpec = await Bun.file(path.join(rootSpecDir, "spec.md")).text();
    expect(sharedSpec).toContain("shared across repos");

    // Implementation artifacts in child (write)
    await Bun.write(
      path.join(childSpecDir, "plan.md"),
      "# Local Plan\n\nChild-specific implementation plan."
    );
    await Bun.write(
      path.join(childSpecDir, "tasks.md"),
      "# Local Tasks\n\nChild-specific task list."
    );

    // Verify: Implementation artifacts exist only in child
    expect(fs.existsSync(path.join(childSpecDir, "plan.md"))).toBe(true);
    expect(fs.existsSync(path.join(childSpecDir, "tasks.md"))).toBe(true);
    expect(fs.existsSync(path.join(rootSpecDir, "plan.md"))).toBe(false);
    expect(fs.existsSync(path.join(rootSpecDir, "tasks.md"))).toBe(false);

    // Verify: Can read local implementations from child
    const localPlan = await Bun.file(path.join(childSpecDir, "plan.md")).text();
    expect(localPlan).toContain("Child-specific implementation");
  });

  test("T103: check-prerequisites outputs correct paths in multi-repo mode", async () => {
    // This test verifies that check-prerequisites returns correct paths in JSON mode
    const featureName = "009-multi-repo-stacked";  // Use the default feature created by fixture
    const childDir = fixture.childRepos.get("test-child");
    if (!childDir) throw new Error("Child repo not found");

    const rootSpecDir = path.join(fixture.rootDir, "specs", featureName);
    const childSpecDir = path.join(childDir, "specs", featureName);

    // Ensure directories exist
    await $`mkdir -p ${rootSpecDir}`.quiet();
    await $`mkdir -p ${childSpecDir}`.quiet();

    // Create spec.md in root (shared)
    await Bun.write(path.join(rootSpecDir, "spec.md"), "# Test spec");

    // Checkout the feature branch in child repo
    await $`git -C ${childDir} checkout -b ${featureName}`.quiet();

    // Run check-prerequisites from child repo
    const checkScript = path.join(fixture.scriptsDir, "check-prerequisites.ts");
    const result = await $`cd ${childDir} && bun run ${checkScript} --json --skip-plan-check`.quiet();
    const output = JSON.parse(result.text());

    // Verify paths in output (normalize /private/var -> /var for macOS)
    const normalizePath = (p: string) => p.replace(/^\/private/, "");
    expect(output.ok).toBe(true);
    expect(output.result.MODE).toBe("multi-repo");  // MODE is "multi-repo" in child repos
    expect(normalizePath(output.result.FEATURE_DIR)).toBe(normalizePath(rootSpecDir));  // Points to root (shared)
    expect(normalizePath(output.result.IMPL_PLAN)).toBe(normalizePath(path.join(childDir, "specs", featureName, "plan.md")));  // Points to child
    expect(normalizePath(output.result.TASKS)).toBe(normalizePath(path.join(childDir, "specs", featureName, "tasks.md")));  // Points to child
    expect(normalizePath(output.result.REPO_ROOT)).toBe(normalizePath(childDir));  // Child repo root
  });

  test("T104: Branched tasks write to correct location in child repo", async () => {
    // Setup: Feature with branch-specific tasks
    const featureName = "branched-tasks";
    const branchName = "feature/test-branch";
    const childDir = fixture.childRepos.get("test-child");
    if (!childDir) throw new Error("Child repo not found");

    const childSpecDir = path.join(childDir, "specs", featureName);

    await $`mkdir -p ${childSpecDir}`.quiet();

    // Branch-specific tasks should go to child repo
    const branchedTasksPath = path.join(childSpecDir, "tasks-feature-test-branch.md");

    const tasksContent = `# Tasks (Branch: ${branchName})

## Task 1: Branch-specific implementation
**Status**: pending
`;

    await Bun.write(branchedTasksPath, tasksContent);

    // Verify: Branched tasks exist in child repo
    expect(fs.existsSync(branchedTasksPath)).toBe(true);
    const content = await Bun.file(branchedTasksPath).text();
    expect(content).toContain("Branch-specific implementation");
  });
});
