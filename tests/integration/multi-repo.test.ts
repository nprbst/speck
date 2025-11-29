/**
 * Multi-Repo Mode Integration Tests
 *
 * Feature: 015-scope-simplification (Phase 9: US7)
 * Purpose: Verify multi-repo functionality is retained and works correctly
 * Created: 2025-11-29
 *
 * These tests verify:
 * - T084: Multi-repo detection in check-prerequisites is unaffected
 * - T085: Shared spec access works in multi-repo mode
 * - T086: parentSpecId is retained in simplified branches.json
 * - T088: No multi-repo code was accidentally removed
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { $ } from "bun";
import * as path from "path";
import {
  createMultiRepoTestFixture,
  createTestBranchEntry,
  type MultiRepoTestFixture,
} from "../helpers/multi-repo-fixtures";

describe("Multi-repo mode integration (Feature 015 Phase 9)", () => {
  let fixture: MultiRepoTestFixture;

  beforeEach(async () => {
    fixture = await createMultiRepoTestFixture([{ name: "test-child" }]);
  });

  afterEach(async () => {
    await fixture.cleanup();
  });

  test("T084: Multi-repo detection returns correct MODE in check-prerequisites", async () => {
    const childDir = fixture.childRepos.get("test-child");
    if (!childDir) throw new Error("Child repo not found");

    // Create required directories and files
    const featureName = "009-multi-repo-stacked";
    const rootSpecDir = path.join(fixture.rootDir, "specs", featureName);
    const childSpecDir = path.join(childDir, "specs", featureName);

    await $`mkdir -p ${rootSpecDir}`.quiet();
    await $`mkdir -p ${childSpecDir}`.quiet();
    await Bun.write(path.join(rootSpecDir, "spec.md"), "# Test spec");

    // Checkout feature branch
    await $`git -C ${childDir} checkout -b ${featureName}`.quiet();

    // Run check-prerequisites with --json
    const checkScript = path.join(fixture.scriptsDir, "check-prerequisites.ts");
    const result = await $`cd ${childDir} && bun run ${checkScript} --json --skip-plan-check`.quiet();
    const output = JSON.parse(result.text());

    // Verify MODE is "multi-repo" when in child repo
    expect(output.ok).toBe(true);
    expect(output.result.MODE).toBe("multi-repo");
  });

  test("T085: Shared spec access - child repo reads spec.md from root repo", async () => {
    const childDir = fixture.childRepos.get("test-child");
    if (!childDir) throw new Error("Child repo not found");

    // Use NNN-feature-name format for branch validation
    const featureName = "015-shared-spec";
    const rootSpecDir = path.join(fixture.rootDir, "specs", featureName);
    const childSpecDir = path.join(childDir, "specs", featureName);

    // Create shared spec in root
    await $`mkdir -p ${rootSpecDir}`.quiet();
    await $`mkdir -p ${childSpecDir}`.quiet();

    const sharedSpecContent = `# Shared Feature Specification

## Overview
This specification is shared across all child repositories.

## Requirements
- FR-001: Requirement accessible from child
- FR-002: Implementation artifacts stay local
`;
    await Bun.write(path.join(rootSpecDir, "spec.md"), sharedSpecContent);

    // Create plan.md in child (required for check-prerequisites)
    await Bun.write(path.join(childSpecDir, "plan.md"), "# Plan");

    // Checkout feature branch using NNN-feature-name format
    await $`git -C ${childDir} checkout -b ${featureName}`.quiet();

    // Run check-prerequisites to verify AVAILABLE_DOCS includes root spec
    const checkScript = path.join(fixture.scriptsDir, "check-prerequisites.ts");
    const result = await $`cd ${childDir} && bun run ${checkScript} --json`.quiet();
    const output = JSON.parse(result.text());

    // Normalize paths for macOS /private/var comparison
    const normalizePath = (p: string) => p.replace(/^\/private/, "");

    expect(output.ok).toBe(true);
    expect(output.result.MODE).toBe("multi-repo");

    // FEATURE_DIR should point to root repo (shared spec location)
    expect(normalizePath(output.result.FEATURE_DIR)).toBe(normalizePath(rootSpecDir));

    // IMPL_PLAN and TASKS should point to child repo
    expect(normalizePath(output.result.IMPL_PLAN)).toContain(normalizePath(childDir));
    expect(normalizePath(output.result.TASKS)).toContain(normalizePath(childDir));
  });

  test("T086: parentSpecId is retained in branches.json v2.0.0 schema", async () => {
    const childDir = fixture.childRepos.get("test-child");
    if (!childDir) throw new Error("Child repo not found");

    // Create branches.json with parentSpecId
    const branchesPath = path.join(childDir, ".speck", "branches.json");
    const now = new Date().toISOString();

    const branchMapping = {
      version: "2.0.0",
      branches: [
        {
          name: "feature/child-implementation",
          specId: "009-multi-repo-stacked",
          createdAt: now,
          updatedAt: now,
          parentSpecId: "007-multi-repo-monorepo-support",
        },
      ],
      specIndex: {
        "009-multi-repo-stacked": ["feature/child-implementation"],
      },
    };

    await Bun.write(branchesPath, JSON.stringify(branchMapping, null, 2));

    // Read back and verify
    const content = await Bun.file(branchesPath).text();
    const parsed = JSON.parse(content);

    expect(parsed.version).toBe("2.0.0");
    expect(parsed.branches[0].parentSpecId).toBe("007-multi-repo-monorepo-support");
    expect(parsed.branches[0].specId).toBe("009-multi-repo-stacked");

    // Verify no stacked PR fields exist (baseBranch, status, pr)
    expect(parsed.branches[0]).not.toHaveProperty("baseBranch");
    expect(parsed.branches[0]).not.toHaveProperty("status");
    expect(parsed.branches[0]).not.toHaveProperty("pr");
  });

  test("T088a: detectSpeckRoot() correctly identifies multi-repo mode via .speck/root symlink", async () => {
    const childDir = fixture.childRepos.get("test-child");
    if (!childDir) throw new Error("Child repo not found");

    // Import the paths module from the fixture's scripts directory
    const pathsModule = await import(path.join(fixture.scriptsDir, "common/paths.ts"));

    // Clear cache to ensure fresh detection
    pathsModule.clearSpeckCache();

    // Save original cwd and change to child repo
    const originalCwd = process.cwd();
    process.chdir(childDir);

    try {
      const config = await pathsModule.detectSpeckRoot();

      // Normalize paths for macOS /private/var
      const normalizePath = (p: string) => p.replace(/^\/private/, "");

      expect(config.mode).toBe("multi-repo");
      expect(normalizePath(config.speckRoot)).toBe(normalizePath(fixture.rootDir));
      expect(normalizePath(config.repoRoot)).toBe(normalizePath(childDir));
    } finally {
      process.chdir(originalCwd);
      pathsModule.clearSpeckCache();
    }
  });

  test("T088b: isMultiRepoChild() returns true for child repos", async () => {
    const childDir = fixture.childRepos.get("test-child");
    if (!childDir) throw new Error("Child repo not found");

    const pathsModule = await import(path.join(fixture.scriptsDir, "common/paths.ts"));
    pathsModule.clearSpeckCache();

    const originalCwd = process.cwd();
    process.chdir(childDir);

    try {
      const isChild = await pathsModule.isMultiRepoChild();
      expect(isChild).toBe(true);
    } finally {
      process.chdir(originalCwd);
      pathsModule.clearSpeckCache();
    }
  });

  test("T088c: findChildRepos() discovers child repos via .speck-link-* symlinks", async () => {
    const pathsModule = await import(path.join(fixture.scriptsDir, "common/paths.ts"));

    const childRepos = await pathsModule.findChildRepos(fixture.rootDir);

    // Normalize paths for comparison
    const normalizePath = (p: string) => p.replace(/^\/private/, "");
    const normalizedChildRepos = childRepos.map(normalizePath);
    const expectedChildDir = normalizePath(fixture.childRepos.get("test-child")!);

    expect(normalizedChildRepos).toContain(expectedChildDir);
  });

  test("T088d: getMultiRepoContext() returns correct context type for child repos", async () => {
    const childDir = fixture.childRepos.get("test-child");
    if (!childDir) throw new Error("Child repo not found");

    const pathsModule = await import(path.join(fixture.scriptsDir, "common/paths.ts"));
    pathsModule.clearSpeckCache();

    const originalCwd = process.cwd();
    process.chdir(childDir);

    try {
      const context = await pathsModule.getMultiRepoContext();

      expect(context.mode).toBe("multi-repo");
      expect(context.context).toBe("child");
      expect(context.childRepoName).toBe("test-child");
    } finally {
      process.chdir(originalCwd);
      pathsModule.clearSpeckCache();
    }
  });

  test("T088e: Branch mapper preserves parentSpecId during operations", async () => {
    const childDir = fixture.childRepos.get("test-child");
    if (!childDir) throw new Error("Child repo not found");

    // Import branch-mapper from project root (not fixture - fixture doesn't have node_modules)
    const branchMapper = await import("../../.speck/scripts/common/branch-mapper.ts");

    // Create a branch entry with parentSpecId
    const entry = branchMapper.createBranchEntry(
      "feature/with-parent",
      "009-multi-repo-stacked",
      "007-multi-repo-monorepo-support"
    );

    // Verify parentSpecId is preserved
    expect(entry.parentSpecId).toBe("007-multi-repo-monorepo-support");
    expect(entry.name).toBe("feature/with-parent");
    expect(entry.specId).toBe("009-multi-repo-stacked");

    // Create mapping and add entry
    let mapping = branchMapper.createEmptyBranchMapping();
    mapping = branchMapper.addBranchEntry(mapping, entry);

    // Verify entry in mapping
    const found = branchMapper.findBranchEntry(mapping, "feature/with-parent");
    expect(found).not.toBeNull();
    expect(found!.parentSpecId).toBe("007-multi-repo-monorepo-support");

    // Write and read back
    await branchMapper.writeBranches(childDir, mapping);
    const readMapping = await branchMapper.readBranches(childDir);

    const readEntry = branchMapper.findBranchEntry(readMapping, "feature/with-parent");
    expect(readEntry).not.toBeNull();
    expect(readEntry!.parentSpecId).toBe("007-multi-repo-monorepo-support");
  });
});

describe("Multi-repo root repo detection", () => {
  let fixture: MultiRepoTestFixture;

  beforeEach(async () => {
    fixture = await createMultiRepoTestFixture([
      { name: "backend-service" },
      { name: "frontend-app" },
    ]);
  });

  afterEach(async () => {
    await fixture.cleanup();
  });

  test("Root repo with child symlinks is detected as multi-repo mode", async () => {
    const pathsModule = await import(path.join(fixture.scriptsDir, "common/paths.ts"));
    pathsModule.clearSpeckCache();

    const originalCwd = process.cwd();
    process.chdir(fixture.rootDir);

    try {
      const config = await pathsModule.detectSpeckRoot();

      // Normalize paths
      const normalizePath = (p: string) => p.replace(/^\/private/, "");

      expect(config.mode).toBe("multi-repo");
      expect(normalizePath(config.speckRoot)).toBe(normalizePath(fixture.rootDir));
      expect(normalizePath(config.repoRoot)).toBe(normalizePath(fixture.rootDir));
    } finally {
      process.chdir(originalCwd);
      pathsModule.clearSpeckCache();
    }
  });

  test("findChildReposWithNames() returns map of name → path", async () => {
    const pathsModule = await import(path.join(fixture.scriptsDir, "common/paths.ts"));

    const childMap = await pathsModule.findChildReposWithNames(fixture.rootDir);

    expect(childMap.size).toBe(2);
    expect(childMap.has("backend-service")).toBe(true);
    expect(childMap.has("frontend-app")).toBe(true);

    // Verify paths are correct
    const normalizePath = (p: string) => p.replace(/^\/private/, "");
    expect(normalizePath(childMap.get("backend-service")!)).toBe(
      normalizePath(fixture.childRepos.get("backend-service")!)
    );
    expect(normalizePath(childMap.get("frontend-app")!)).toBe(
      normalizePath(fixture.childRepos.get("frontend-app")!)
    );
  });

  test("getMultiRepoContext() returns 'root' context for root repo", async () => {
    const pathsModule = await import(path.join(fixture.scriptsDir, "common/paths.ts"));
    pathsModule.clearSpeckCache();

    const originalCwd = process.cwd();
    process.chdir(fixture.rootDir);

    try {
      const context = await pathsModule.getMultiRepoContext();

      expect(context.mode).toBe("multi-repo");
      expect(context.context).toBe("root");
      expect(context.childRepoName).toBeNull();
      expect(context.parentSpecId).toBeNull();
    } finally {
      process.chdir(originalCwd);
      pathsModule.clearSpeckCache();
    }
  });
});

describe("Multi-repo branches.json aggregation", () => {
  let fixture: MultiRepoTestFixture;

  beforeEach(async () => {
    // Create fixture with pre-populated branches
    fixture = await createMultiRepoTestFixture([
      {
        name: "backend",
        branches: [
          createTestBranchEntry("feature/api-v2", "009-multi-repo-stacked", "007-multi-repo-monorepo-support"),
        ],
      },
      {
        name: "frontend",
        branches: [
          createTestBranchEntry("feature/new-ui", "009-multi-repo-stacked", "007-multi-repo-monorepo-support"),
        ],
      },
    ]);
  });

  afterEach(async () => {
    await fixture.cleanup();
  });

  test("getAggregatedBranchStatus() collects branches across repos", async () => {
    // Import branch-mapper from project root (fixture doesn't have node_modules)
    const branchMapper = await import("../../.speck/scripts/common/branch-mapper.ts");

    const aggregated = await branchMapper.getAggregatedBranchStatus(
      fixture.rootDir,
      fixture.rootDir
    );

    // Check child repos are collected
    expect(aggregated.childRepos.size).toBe(2);
    expect(aggregated.childRepos.has("backend")).toBe(true);
    expect(aggregated.childRepos.has("frontend")).toBe(true);

    // Check backend branches
    const backend = aggregated.childRepos.get("backend")!;
    expect(backend.branchCount).toBe(1);
    const backendBranch = backend.branches[0];
    expect(backendBranch).toBeDefined();
    expect(backendBranch!.name).toBe("feature/api-v2");
    expect(backendBranch!.parentSpecId).toBe("007-multi-repo-monorepo-support");

    // Check frontend branches
    const frontend = aggregated.childRepos.get("frontend")!;
    expect(frontend.branchCount).toBe(1);
    const frontendBranch = frontend.branches[0];
    expect(frontendBranch).toBeDefined();
    expect(frontendBranch!.name).toBe("feature/new-ui");
    expect(frontendBranch!.parentSpecId).toBe("007-multi-repo-monorepo-support");
  });
});
