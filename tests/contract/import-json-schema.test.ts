import { describe, test, expect, beforeEach } from "bun:test";
import { $ } from "bun";
import { createMultiRepoTestSetup } from "../helpers/multi-repo-fixtures";
import type { MultiRepoTestSetup } from "../helpers/multi-repo-fixtures";
import * as fs from "fs";
import * as path from "path";

/**
 * T057: Contract test validates import JSON schema for multi-repo
 *
 * Ensures that imported branches in child repos have correct schema
 * including parentSpecId field for multi-repo tracking.
 */

describe("Branch Import - Multi-Repo JSON Schema", () => {
  let fixture: MultiRepoTestSetup;

  beforeEach(async () => {
    fixture = await createMultiRepoTestSetup({
      childRepos: ["backend-service"],
      rootBranches: [],
      childBranches: {},
    });
  });

  test("T057: Imported branches in child repo include parentSpecId field", async () => {
    const backendRepo = fixture.childRepos.get("backend-service")!;

    // Create manual branch in child repo
    await $`git -C ${backendRepo} checkout -b nprbst/import-test`.quiet();
    await $`git -C ${backendRepo} checkout main`.quiet();

    // Import with --batch
    const result = await $`
      cd ${backendRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts import --batch nprbst/import-test:009-multi-repo-stacked
    `.quiet();

    expect(result.exitCode).toBe(0);

    // Read branches.json
    const branchesPath = path.join(backendRepo, ".speck/branches.json");
    expect(fs.existsSync(branchesPath)).toBe(true);

    const branchesData = JSON.parse(fs.readFileSync(branchesPath, "utf-8"));

    // Contract: Schema version is 1.1.0 (multi-repo)
    expect(branchesData.version).toBe("1.1.0");

    // Contract: Imported branch has parentSpecId
    const importedBranch = branchesData.branches.find(
      (b: any) => b.name === "nprbst/import-test"
    );
    expect(importedBranch).toBeDefined();
    expect(importedBranch).toHaveProperty("parentSpecId");

    // Contract: parentSpecId should reference parent spec
    // For this test fixture, it should be the spec that links to the child
    expect(importedBranch.parentSpecId).toBeTruthy();
    expect(importedBranch.parentSpecId).toMatch(/^\d{3}-/);
  });

  test("T057: Import preserves all required BranchEntry fields", async () => {
    const backendRepo = fixture.childRepos.get("backend-service")!;

    await $`git -C ${backendRepo} checkout -b feature/complete`.quiet();
    await $`git -C ${backendRepo} checkout main`.quiet();

    await $`
      cd ${backendRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts import --batch feature/complete:009-multi-repo-stacked
    `.quiet();

    const branchesPath = path.join(backendRepo, ".speck/branches.json");
    const branchesData = JSON.parse(fs.readFileSync(branchesPath, "utf-8"));

    const imported = branchesData.branches.find(
      (b: any) => b.name === "feature/complete"
    );

    // Contract: All required fields present
    expect(imported).toHaveProperty("name");
    expect(imported).toHaveProperty("specId");
    expect(imported).toHaveProperty("baseBranch");
    expect(imported).toHaveProperty("status");
    expect(imported).toHaveProperty("pr");
    expect(imported).toHaveProperty("createdAt");
    expect(imported).toHaveProperty("updatedAt");
    expect(imported).toHaveProperty("parentSpecId");

    // Contract: Field types correct
    expect(typeof imported.name).toBe("string");
    expect(typeof imported.specId).toBe("string");
    expect(typeof imported.baseBranch).toBe("string");
    expect(["active", "submitted", "merged", "abandoned"]).toContain(imported.status);
    expect(imported.pr === null || typeof imported.pr === "number").toBe(true);
    expect(typeof imported.createdAt).toBe("string");
    expect(typeof imported.updatedAt).toBe("string");
    expect(typeof imported.parentSpecId).toBe("string");
  });

  test("T057: Multiple imports maintain schema consistency", async () => {
    const backendRepo = fixture.childRepos.get("backend-service")!;

    // Import multiple branches
    await $`git -C ${backendRepo} checkout -b branch-1`.quiet();
    await $`git -C ${backendRepo} checkout -b branch-2`.quiet();
    await $`git -C ${backendRepo} checkout -b branch-3`.quiet();
    await $`git -C ${backendRepo} checkout main`.quiet();

    await $`
      cd ${backendRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts import --batch branch-1:009-multi-repo-stacked branch-2:009-multi-repo-stacked branch-3:009-multi-repo-stacked
    `.quiet();

    const branchesPath = path.join(backendRepo, ".speck/branches.json");
    const branchesData = JSON.parse(fs.readFileSync(branchesPath, "utf-8"));

    // Contract: All imported branches have parentSpecId
    const importedBranches = branchesData.branches.filter((b: any) =>
      ["branch-1", "branch-2", "branch-3"].includes(b.name)
    );

    expect(importedBranches.length).toBe(3);
    importedBranches.forEach((branch: any) => {
      expect(branch).toHaveProperty("parentSpecId");
      expect(branch.parentSpecId).toBeTruthy();
    });
  });

  test("T057: Import in single-repo mode does not add parentSpecId", async () => {
    // Create a single-repo setup (no symlinks)
    const singleRepoRoot = await fs.promises.mkdtemp("/tmp/speck-single-");

    try {
      // Initialize git repo
      await $`git -C ${singleRepoRoot} init`.quiet();
      await $`git -C ${singleRepoRoot} config user.name "Test"`.quiet();
      await $`git -C ${singleRepoRoot} config user.email "test@example.com"`.quiet();
      await $`git -C ${singleRepoRoot} commit --allow-empty -m "initial"`.quiet();

      // Create specs directory
      const specsDir = path.join(singleRepoRoot, "specs/009-multi-repo-stacked");
      await fs.promises.mkdir(specsDir, { recursive: true });
      await fs.promises.writeFile(path.join(specsDir, "spec.md"), "# Test");

      // Copy scripts
      const scriptsSource = fixture.scriptsDir;
      const scriptsDest = path.join(singleRepoRoot, ".speck/scripts");
      await $`cp -r ${scriptsSource} ${scriptsDest}`.quiet();

      // Create manual branch
      await $`git -C ${singleRepoRoot} checkout -b test-branch`.quiet();
      await $`git -C ${singleRepoRoot} checkout main`.quiet();

      // Import
      await $`
        cd ${singleRepoRoot} && \
        bun run .speck/scripts/branch-command.ts import --batch test-branch:009-multi-repo-stacked
      `.quiet();

      const branchesPath = path.join(singleRepoRoot, ".speck/branches.json");
      const branchesData = JSON.parse(fs.readFileSync(branchesPath, "utf-8"));

      const imported = branchesData.branches.find((b: any) => b.name === "test-branch");

      // Contract: Single-repo import should NOT have parentSpecId
      expect(imported).toBeDefined();
      expect(imported.parentSpecId).toBeUndefined();
    } finally {
      // Cleanup
      await $`rm -rf ${singleRepoRoot}`.quiet();
    }
  });

  test("T057: Import validates against JSON schema v1.1.0", async () => {
    const backendRepo = fixture.childRepos.get("backend-service")!;

    await $`git -C ${backendRepo} checkout -b validate-test`.quiet();
    await $`git -C ${backendRepo} checkout main`.quiet();

    await $`
      cd ${backendRepo} && \
      bun run ${fixture.scriptsDir}/branch-command.ts import --batch validate-test:009-multi-repo-stacked
    `.quiet();

    const branchesPath = path.join(backendRepo, ".speck/branches.json");
    const branchesData = JSON.parse(fs.readFileSync(branchesPath, "utf-8"));

    // Contract: Schema structure matches v1.1.0
    expect(branchesData).toHaveProperty("version");
    expect(branchesData).toHaveProperty("branches");
    expect(branchesData).toHaveProperty("specIndex");

    // Contract: specIndex is updated
    expect(branchesData.specIndex).toHaveProperty("009-multi-repo-stacked");
    expect(branchesData.specIndex["009-multi-repo-stacked"]).toContain("validate-test");
  });
});
