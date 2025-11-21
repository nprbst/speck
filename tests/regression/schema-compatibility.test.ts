/**
 * Regression Test: Schema Compatibility (T085)
 *
 * Validates that schema v1.0.0 files continue to work with the
 * updated code, and that the code correctly handles both v1.0.0
 * and v1.1.0 schemas.
 *
 * Feature: 009-multi-repo-stacked (Phase 11)
 * Layer: Regression
 * Created: 2025-11-20
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { $ } from "bun";
import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import {
  createMultiRepoTestFixture,
  type MultiRepoTestFixture
} from "../helpers/multi-repo-fixtures.ts";

describe("Regression: Schema compatibility", () => {
  let testDir: string;
  let scriptsDir: string;

  beforeEach(async () => {
    // Create isolated test environment
    testDir = path.join("/tmp", `speck-regression-schema-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });

    // Copy .speck scripts to test directory for isolation
    scriptsDir = path.join(testDir, ".speck", "scripts");
    await fs.mkdir(scriptsDir, { recursive: true });
    await $`cp -r ${path.join(process.cwd(), ".speck/scripts")}/* ${scriptsDir}/`.quiet();

    // Initialize git repo
    await $`cd ${testDir} && git init`.quiet();
    await $`cd ${testDir} && git config user.email "test@example.com"`.quiet();
    await $`cd ${testDir} && git config user.name "Test User"`.quiet();
    await $`cd ${testDir} && git commit --allow-empty -m "Initial commit"`.quiet();

    // Create specs directory
    await fs.mkdir(path.join(testDir, "specs", "001-test-feature"), { recursive: true });
    await fs.writeFile(
      path.join(testDir, "specs", "001-test-feature", "spec.md"),
      "# Test Feature"
    );
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true }).catch(() => {});
  });

  test("T085: v1.0.0 schema files read correctly", async () => {
    // Create a v1.0.0 branches.json
    const branchesJsonPath = path.join(testDir, ".speck", "branches.json");
    const v1Schema = {
      version: "1.0.0",
      branches: {
        "nprbst/legacy-branch": {
          name: "nprbst/legacy-branch",
          base: "main",
          specId: "001-test-feature",
          createdAt: new Date().toISOString()
        },
        "nprbst/legacy-stack": {
          name: "nprbst/legacy-stack",
          base: "nprbst/legacy-branch",
          specId: "001-test-feature",
          createdAt: new Date().toISOString()
        }
      },
      specIndex: { "001-test-feature": 2 }
    };

    await fs.writeFile(branchesJsonPath, JSON.stringify(v1Schema, null, 2));

    // Create git branches
    await $`cd ${testDir} && git checkout -b nprbst/legacy-branch`.quiet();
    await $`cd ${testDir} && git checkout -b nprbst/legacy-stack`.quiet();
    await $`cd ${testDir} && git checkout main`.quiet();

    // List branches (should read v1.0.0)
    const result = await $`cd ${testDir} && bun run ${scriptsDir}/branch-command.ts list`.text();

    // Should show both branches
    expect(result).toContain("nprbst/legacy-branch");
    expect(result).toContain("nprbst/legacy-stack");
  });

  test("T085: v1.0.0 schema upgrades to v1.1.0 on write", async () => {
    // Create a v1.0.0 branches.json
    const branchesJsonPath = path.join(testDir, ".speck", "branches.json");
    const v1Schema = {
      version: "1.0.0",
      branches: {
        "nprbst/old-branch": {
          name: "nprbst/old-branch",
          base: "main",
          specId: "001-test-feature",
          createdAt: new Date().toISOString()
        }
      },
      specIndex: { "001-test-feature": 1 }
    };

    await fs.writeFile(branchesJsonPath, JSON.stringify(v1Schema, null, 2));
    await $`cd ${testDir} && git checkout -b nprbst/old-branch`.quiet();

    // Create a new branch (will trigger write with v1.1.0)
    await $`cd ${testDir} && git checkout main`.quiet();
    await $`cd ${testDir} && bun run ${scriptsDir}/branch-command.ts create nprbst/new-branch --base main --spec 001-test-feature`.nothrow();

    // Read the updated file
    const content = await fs.readFile(branchesJsonPath, "utf-8");
    const data = JSON.parse(content);

    // Should be upgraded to v1.1.0
    expect(data.version).toBe("1.1.0");

    // Old branches should still be there
    expect(data.branches["nprbst/old-branch"]).toBeDefined();

    // New branch should be there
    expect(data.branches["nprbst/new-branch"]).toBeDefined();
  });

  test("T085: v1.1.0 schema fields are optional", async () => {
    // Create a v1.1.0 branches.json without parentSpecId (single-repo)
    const branchesJsonPath = path.join(testDir, ".speck", "branches.json");
    const v11Schema = {
      version: "1.1.0",
      branches: {
        "nprbst/no-parent": {
          name: "nprbst/no-parent",
          base: "main",
          specId: "001-test-feature",
          createdAt: new Date().toISOString()
          // No parentSpecId field
        }
      },
      specIndex: { "001-test-feature": 1 }
    };

    await fs.writeFile(branchesJsonPath, JSON.stringify(v11Schema, null, 2));
    await $`cd ${testDir} && git checkout -b nprbst/no-parent`.quiet();
    await $`cd ${testDir} && git checkout main`.quiet();

    // List branches (should work fine without parentSpecId)
    const result = await $`cd ${testDir} && bun run ${scriptsDir}/branch-command.ts list`.text();

    // Should show the branch
    expect(result).toContain("nprbst/no-parent");
  });

  test("T085: v1.1.0 schema with parentSpecId works correctly", async () => {
    // Create a v1.1.0 branches.json with parentSpecId
    const branchesJsonPath = path.join(testDir, ".speck", "branches.json");
    const v11Schema = {
      version: "1.1.0",
      branches: {
        "nprbst/with-parent": {
          name: "nprbst/with-parent",
          base: "main",
          specId: "001-test-feature",
          parentSpecId: "000-parent-spec",
          createdAt: new Date().toISOString()
        }
      },
      specIndex: { "001-test-feature": 1 }
    };

    await fs.writeFile(branchesJsonPath, JSON.stringify(v11Schema, null, 2));
    await $`cd ${testDir} && git checkout -b nprbst/with-parent`.quiet();
    await $`cd ${testDir} && git checkout main`.quiet();

    // List branches (should work with parentSpecId)
    const result = await $`cd ${testDir} && bun run ${scriptsDir}/branch-command.ts list`.text();

    // Should show the branch
    expect(result).toContain("nprbst/with-parent");
  });

  test("T085: Mixed v1.0.0 and v1.1.0 branches coexist after upgrade", async () => {
    // Start with v1.0.0
    const branchesJsonPath = path.join(testDir, ".speck", "branches.json");
    const v1Schema = {
      version: "1.0.0",
      branches: {
        "nprbst/v1-branch": {
          name: "nprbst/v1-branch",
          base: "main",
          specId: "001-test-feature",
          createdAt: new Date().toISOString()
        }
      },
      specIndex: { "001-test-feature": 1 }
    };

    await fs.writeFile(branchesJsonPath, JSON.stringify(v1Schema, null, 2));
    await $`cd ${testDir} && git checkout -b nprbst/v1-branch`.quiet();
    await $`cd ${testDir} && git checkout main`.quiet();

    // Add v1.1.0 branch
    await $`cd ${testDir} && bun run ${scriptsDir}/branch-command.ts create nprbst/v11-branch --base main --spec 001-test-feature`.nothrow();

    // Read the file
    const content = await fs.readFile(branchesJsonPath, "utf-8");
    const data = JSON.parse(content);

    // Should be v1.1.0 now
    expect(data.version).toBe("1.1.0");

    // Both branches should exist
    expect(data.branches["nprbst/v1-branch"]).toBeDefined();
    expect(data.branches["nprbst/v11-branch"]).toBeDefined();

    // List should show both
    const result = await $`cd ${testDir} && bun run ${scriptsDir}/branch-command.ts list`.text();
    expect(result).toContain("nprbst/v1-branch");
    expect(result).toContain("nprbst/v11-branch");
  });
});

describe("Regression: Schema compatibility in multi-repo", () => {
  let fixture: MultiRepoTestFixture;

  beforeEach(async () => {
    fixture = await createMultiRepoTestFixture([
      { name: "legacy-repo" }
    ], "009-multi-repo-stacked");
  });

  afterEach(async () => {
    await fixture.cleanup();
  });

  test("T085: Child repo uses v1.1.0 schema with parentSpecId", async () => {
    const childRepo = fixture.childRepos.get("legacy-repo")!;

    // Create branch in child repo
    await $`cd ${childRepo} && bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/child-branch --base main --spec 009-multi-repo-stacked`.nothrow();

    // Read branches.json
    const branchesJsonPath = path.join(childRepo, ".speck", "branches.json");
    const content = await fs.readFile(branchesJsonPath, "utf-8");
    const data = JSON.parse(content);

    // Should use v1.1.0
    expect(data.version).toBe("1.1.0");

    // Should have parentSpecId
    expect(data.branches["nprbst/child-branch"].parentSpecId).toBe("009-multi-repo-stacked");
  });

  test("T085: v1.0.0 child repo upgrades to v1.1.0 correctly", async () => {
    const childRepo = fixture.childRepos.get("legacy-repo")!;

    // Create v1.0.0 branches.json in child
    const branchesJsonPath = path.join(childRepo, ".speck", "branches.json");
    const v1Schema = {
      version: "1.0.0",
      branches: {
        "nprbst/old-child": {
          name: "nprbst/old-child",
          base: "main",
          specId: "009-multi-repo-stacked",
          createdAt: new Date().toISOString()
        }
      },
      specIndex: { "009-multi-repo-stacked": 1 }
    };

    await fs.writeFile(branchesJsonPath, JSON.stringify(v1Schema, null, 2));
    await $`cd ${childRepo} && git checkout -b nprbst/old-child`.quiet();
    await $`cd ${childRepo} && git checkout main`.quiet();

    // Create new branch (triggers upgrade)
    await $`cd ${childRepo} && bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/new-child --base main --spec 009-multi-repo-stacked`.nothrow();

    // Read the updated file
    const content = await fs.readFile(branchesJsonPath, "utf-8");
    const data = JSON.parse(content);

    // Should be v1.1.0
    expect(data.version).toBe("1.1.0");

    // Old branch should exist (without parentSpecId)
    expect(data.branches["nprbst/old-child"]).toBeDefined();

    // New branch should have parentSpecId
    expect(data.branches["nprbst/new-child"]).toBeDefined();
    expect(data.branches["nprbst/new-child"].parentSpecId).toBe("009-multi-repo-stacked");
  });
});
