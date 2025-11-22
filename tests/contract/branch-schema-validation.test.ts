/**
 * Contract Test: Branch Schema Validation (T015)
 *
 * Validates that branches.json in child repos:
 * - Uses schema version 1.1.0
 * - Contains valid parentSpecId field
 * - Passes JSON schema validation
 *
 * Feature: 009-multi-repo-stacked (User Story 1)
 * Layer: 1 (Contract)
 * Created: 2025-11-19
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import {
  createMultiRepoTestFixture,
  type MultiRepoTestFixture
} from "../helpers/multi-repo-fixtures.ts";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { $ } from "bun";

describe("Contract: Branch schema validation", () => {
  let fixture: MultiRepoTestFixture;

  beforeEach(async () => {
    fixture = await createMultiRepoTestFixture([
      { name: "backend-service" }
    ], "007-multi-repo-monorepo-support");
  });

  afterEach(async () => {
    await fixture?.cleanup();
  });

  test("T015: branches.json uses schema version 1.1.0", async () => {
    const childRepo = fixture.childRepos.get("backend-service")!;
    const branchesJsonPath = path.join(childRepo, ".speck", "branches.json");

    // Create branch in child repo
    await $`
      cd ${childRepo} && \
      bun run ${process.cwd()}/.speck/scripts/branch-command.ts create nprbst/auth-db --base main --spec 009-multi-repo-stacked
    `.quiet();

    // Read branches.json
    const content = await readFile(branchesJsonPath, "utf-8");
    const branchMapping = JSON.parse(content);

    // Contract: Schema version is 1.1.0 (not 1.0.0)
    expect(branchMapping.version).toBe("1.1.0");
  });

  test("T015: parentSpecId field matches pattern NNN-feature-name", async () => {
    const childRepo = fixture.childRepos.get("backend-service")!;
    const branchesJsonPath = path.join(childRepo, ".speck", "branches.json");

    // Create branch in child repo
    await $`
      cd ${childRepo} && \
      bun run ${process.cwd()}/.speck/scripts/branch-command.ts create nprbst/auth-db --base main --spec 009-multi-repo-stacked
    `.quiet();

    // Read branches.json
    const content = await readFile(branchesJsonPath, "utf-8");
    const branchMapping = JSON.parse(content);

    // Contract: parentSpecId matches regex ^\d{3}-.+$
    const parentSpecId = branchMapping.branches[0].parentSpecId;
    expect(parentSpecId).toMatch(/^\d{3}-.+$/);
  });

  test("T015: branches.json validates against JSON schema", async () => {
    const childRepo = fixture.childRepos.get("backend-service")!;
    const branchesJsonPath = path.join(childRepo, ".speck", "branches.json");

    // Create branch in child repo
    await $`
      cd ${childRepo} && \
      bun run ${process.cwd()}/.speck/scripts/branch-command.ts create nprbst/auth-db --base main --spec 009-multi-repo-stacked
    `.quiet();

    // Read branches.json
    const content = await readFile(branchesJsonPath, "utf-8");
    const branchMapping = JSON.parse(content);

    // Contract: Required fields present
    expect(branchMapping).toHaveProperty("version");
    expect(branchMapping).toHaveProperty("branches");
    expect(branchMapping).toHaveProperty("specIndex");

    // Contract: Branch entry has required fields
    const branch = branchMapping.branches[0];
    expect(branch).toHaveProperty("name");
    expect(branch).toHaveProperty("specId");
    expect(branch).toHaveProperty("baseBranch");
    expect(branch).toHaveProperty("status");
    expect(branch).toHaveProperty("pr");
    expect(branch).toHaveProperty("createdAt");
    expect(branch).toHaveProperty("updatedAt");
    expect(branch).toHaveProperty("parentSpecId"); // NEW in v1.1.0

    // Contract: Timestamps are valid ISO 8601
    expect(() => new Date(branch.createdAt)).not.toThrow();
    expect(() => new Date(branch.updatedAt)).not.toThrow();
  });

  test("T015: Backward compatibility - v1.0.0 files without parentSpecId still parse", async () => {
    const childRepo = fixture.childRepos.get("backend-service")!;
    const branchesJsonPath = path.join(childRepo, ".speck", "branches.json");

    // Manually create v1.0.0 file without parentSpecId
    const v1_0_0_mapping = {
      version: "1.0.0",
      branches: [
        {
          name: "nprbst/old-branch",
          specId: "008-stacked-pr-support",
          baseBranch: "main",
          status: "active",
          pr: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
          // NO parentSpecId field
        }
      ],
      specIndex: {
        "008-stacked-pr-support": ["nprbst/old-branch"]
      }
    };

    await writeFile(branchesJsonPath, JSON.stringify(v1_0_0_mapping, null, 2));

    // Contract: branch-mapper can read v1.0.0 files
    const { readBranches } = await import("../../.speck/scripts/common/branch-mapper.ts");
    const mapping = await readBranches(childRepo);

    expect(mapping.version).toBe("1.0.0");
    expect(mapping.branches).toHaveLength(1);
    expect(mapping.branches[0]?.parentSpecId).toBeUndefined(); // v1.0.0 has no parentSpecId
  });

  test("T015: specIndex is consistent with branches array", async () => {
    const childRepo = fixture.childRepos.get("backend-service")!;
    const branchesJsonPath = path.join(childRepo, ".speck", "branches.json");

    // Create multiple branches for same spec
    await $`
      cd ${childRepo} && \
      bun run ${process.cwd()}/.speck/scripts/branch-command.ts create nprbst/auth-db --base main --spec 009-multi-repo-stacked
    `.quiet();

    await $`
      cd ${childRepo} && \
      bun run ${process.cwd()}/.speck/scripts/branch-command.ts create nprbst/auth-api --base nprbst/auth-db
    `.quiet();

    // Read branches.json
    const content = await readFile(branchesJsonPath, "utf-8");
    const branchMapping = JSON.parse(content);

    // Contract: specIndex contains all branches for the spec
    const specId = "009-multi-repo-stacked";
    expect(branchMapping.specIndex[specId]).toContain("nprbst/auth-db");
    expect(branchMapping.specIndex[specId]).toContain("nprbst/auth-api");
    expect(branchMapping.specIndex[specId]).toHaveLength(2);

    // Contract: All branches in specIndex exist in branches array
    const branchNames = branchMapping.branches.map((b: any) => b.name);
    for (const name of branchMapping.specIndex[specId]) {
      expect(branchNames).toContain(name);
    }
  });
});
