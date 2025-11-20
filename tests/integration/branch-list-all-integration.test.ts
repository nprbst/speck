import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { join } from "path";
import { $ } from "bun";
import fs from "fs/promises";

/**
 * Integration Test: /speck.branch list --all aggregates child repos
 *
 * Task: T039 [P] [US2]
 * Layer: 2 (Integration)
 *
 * Purpose: Verify that /speck.branch list --all command correctly invokes
 *          branch-command.ts and aggregates branches across all child repos.
 */

describe("Integration: /speck.branch list --all aggregates child repos", () => {
  let testRoot: string;
  let rootRepo: string;
  let childRepoA: string;
  let childRepoB: string;

  beforeAll(async () => {
    // Create isolated test workspace
    testRoot = join(import.meta.dir, `../.test-workspace-${Date.now()}`);
    await fs.mkdir(testRoot, { recursive: true });

    // Copy .speck/scripts into test workspace for complete isolation
    const speckScriptsSource = join(import.meta.dir, "../../.speck/scripts");
    const speckScriptsDest = join(testRoot, ".speck/scripts");
    await fs.mkdir(join(testRoot, ".speck"), { recursive: true });
    await $`cp -r ${speckScriptsSource} ${speckScriptsDest}`.cwd(testRoot);

    // Setup root repository
    rootRepo = testRoot;
    await fs.mkdir(join(rootRepo, "specs"), { recursive: true });
    await $`git init`.cwd(rootRepo);
    await $`git config user.name "Test User"`.cwd(rootRepo);
    await $`git config user.email "test@example.com"`.cwd(rootRepo);

    // Setup child repository A
    childRepoA = join(testRoot, "child-repo-a");
    await fs.mkdir(childRepoA, { recursive: true });
    await $`git init`.cwd(childRepoA);
    await $`git config user.name "Test User"`.cwd(childRepoA);
    await $`git config user.email "test@example.com"`.cwd(childRepoA);

    // Setup child repository B
    childRepoB = join(testRoot, "child-repo-b");
    await fs.mkdir(childRepoB, { recursive: true });
    await $`git init`.cwd(childRepoB);
    await $`git config user.name "Test User"`.cwd(childRepoB);
    await $`git config user.email "test@example.com"`.cwd(childRepoB);

    // Link child repos to root
    await fs.symlink(childRepoA, join(rootRepo, ".speck-link-child-repo-a"));
    await fs.symlink(childRepoB, join(rootRepo, ".speck-link-child-repo-b"));

    // Create .speck/root symlinks in child repos pointing to root
    await fs.mkdir(join(childRepoA, ".speck"), { recursive: true });
    await fs.symlink(rootRepo, join(childRepoA, ".speck/root"));
    await fs.mkdir(join(childRepoB, ".speck"), { recursive: true });
    await fs.symlink(rootRepo, join(childRepoB, ".speck/root"));

    // Create branches.json in root repo (2 branches)
    const rootBranchesJson = {
      version: "1.1.0",
      branches: [
        {
          name: "nprbst/root-feat-1",
          specId: "008-stacked-pr-support",
          baseBranch: "main",
          status: "active",
          pr: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          name: "nprbst/root-feat-2",
          specId: "008-stacked-pr-support",
          baseBranch: "nprbst/root-feat-1",
          status: "submitted",
          pr: 10,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      specIndex: {
        "008-stacked-pr-support": ["nprbst/root-feat-1", "nprbst/root-feat-2"],
      },
    };
    await fs.mkdir(join(rootRepo, ".speck"), { recursive: true });
    await fs.writeFile(
      join(rootRepo, ".speck/branches.json"),
      JSON.stringify(rootBranchesJson, null, 2)
    );

    // Create branches.json in child repo A (2 branches)
    const childABranchesJson = {
      version: "1.1.0",
      branches: [
        {
          name: "nprbst/child-a-feat-1",
          specId: "009-multi-repo-stacked",
          baseBranch: "main",
          status: "merged",
          pr: 42,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          parentSpecId: "008-stacked-pr-support",
        },
        {
          name: "nprbst/child-a-feat-2",
          specId: "009-multi-repo-stacked",
          baseBranch: "nprbst/child-a-feat-1",
          status: "active",
          pr: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          parentSpecId: "008-stacked-pr-support",
        },
      ],
      specIndex: {
        "009-multi-repo-stacked": ["nprbst/child-a-feat-1", "nprbst/child-a-feat-2"],
      },
    };
    await fs.writeFile(
      join(childRepoA, ".speck/branches.json"),
      JSON.stringify(childABranchesJson, null, 2)
    );

    // Create branches.json in child repo B (1 branch)
    const childBBranchesJson = {
      version: "1.1.0",
      branches: [
        {
          name: "nprbst/child-b-feat",
          specId: "009-multi-repo-stacked",
          baseBranch: "main",
          status: "submitted",
          pr: 55,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          parentSpecId: "008-stacked-pr-support",
        },
      ],
      specIndex: {
        "009-multi-repo-stacked": ["nprbst/child-b-feat"],
      },
    };
    await fs.writeFile(
      join(childRepoB, ".speck/branches.json"),
      JSON.stringify(childBBranchesJson, null, 2)
    );
  });

  afterAll(async () => {
    // Cleanup test workspace
    await fs.rm(testRoot, { recursive: true, force: true });
  });

  test("invokes branch-command.ts with list --all arguments", async () => {
    const branchCommandPath = join(rootRepo, ".speck/scripts/branch-command.ts");

    const result = await $`bun run ${branchCommandPath} list --all`.cwd(rootRepo).nothrow();

    // Verify script invoked successfully
    expect(result.exitCode).toBe(0);

    const stdout = result.stdout.toString();

    // Verify --all flag processed (aggregate view enabled)
    expect(stdout).toContain("child-repo-a");
    expect(stdout).toContain("child-repo-b");
  });

  test("aggregates branches from root and all child repos", async () => {
    const branchCommandPath = join(rootRepo, ".speck/scripts/branch-command.ts");

    const result = await $`bun run ${branchCommandPath} list --all`.cwd(rootRepo).nothrow();

    expect(result.exitCode).toBe(0);

    const stdout = result.stdout.toString();

    // Verify root repo branches
    expect(stdout).toContain("nprbst/root-feat-1");
    expect(stdout).toContain("nprbst/root-feat-2");

    // Verify child repo A branches
    expect(stdout).toContain("nprbst/child-a-feat-1");
    expect(stdout).toContain("nprbst/child-a-feat-2");

    // Verify child repo B branches
    expect(stdout).toContain("nprbst/child-b-feat");
  });

  test("groups branches by repository", async () => {
    const branchCommandPath = join(rootRepo, ".speck/scripts/branch-command.ts");

    const result = await $`bun run ${branchCommandPath} list --all`.cwd(rootRepo).nothrow();

    expect(result.exitCode).toBe(0);

    const stdout = result.stdout.toString();

    // Verify repo grouping headers
    expect(stdout).toMatch(/Root Repository|Root repo/i);
    expect(stdout).toMatch(/child-repo-a/i);
    expect(stdout).toMatch(/child-repo-b/i);

    // Verify branches appear under correct repo sections
    // (Root section before child sections)
    const rootSection = stdout.indexOf("Root");
    const childASection = stdout.indexOf("child-repo-a");
    const childBSection = stdout.indexOf("child-repo-b");

    expect(rootSection).toBeGreaterThan(-1);
    expect(childASection).toBeGreaterThan(rootSection);
    expect(childBSection).toBeGreaterThan(rootSection);
  });

  test("displays PR numbers and status for all branches", async () => {
    const branchCommandPath = join(rootRepo, ".speck/scripts/branch-command.ts");

    const result = await $`bun run ${branchCommandPath} list --all`.cwd(rootRepo).nothrow();

    expect(result.exitCode).toBe(0);

    const stdout = result.stdout.toString();

    // Verify PR numbers displayed
    expect(stdout).toContain("10"); // Root PR
    expect(stdout).toContain("42"); // Child A PR
    expect(stdout).toContain("55"); // Child B PR

    // Verify status labels
    expect(stdout).toContain("active");
    expect(stdout).toContain("submitted");
    expect(stdout).toContain("merged");
  });

  test("handles child repos with no branches gracefully", async () => {
    // Create child repo C with no branches.json
    const childRepoC = join(testRoot, "child-repo-c");
    await fs.mkdir(childRepoC, { recursive: true });
    await $`git init`.cwd(childRepoC);
    await $`git config user.name "Test User"`.cwd(childRepoC);
    await $`git config user.email "test@example.com"`.cwd(childRepoC);
    await fs.symlink(childRepoC, join(rootRepo, ".speck-link-child-repo-c"));
    await fs.mkdir(join(childRepoC, ".speck"), { recursive: true });
    await fs.symlink(rootRepo, join(childRepoC, ".speck/root"));

    const branchCommandPath = join(rootRepo, ".speck/scripts/branch-command.ts");

    const result = await $`bun run ${branchCommandPath} list --all`.cwd(rootRepo).nothrow();

    expect(result.exitCode).toBe(0);

    const stdout = result.stdout.toString();

    // Verify child repo C either:
    // 1. Not shown (no branches to list), or
    // 2. Shown with "no branches" message
    const hasChildC = stdout.includes("child-repo-c");
    if (hasChildC) {
      expect(stdout).toMatch(/no branches|0 branches/i);
    }
  });

  test("disambiguates branches with same name across repos", async () => {
    // Modify child repo B to have same branch name as child repo A
    const childBBranchesJson = {
      version: "1.1.0",
      branches: [
        {
          name: "nprbst/child-a-feat-1", // Same name as child A
          specId: "009-multi-repo-stacked",
          baseBranch: "main",
          status: "active",
          pr: 99,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          parentSpecId: "008-stacked-pr-support",
        },
      ],
      specIndex: {
        "009-multi-repo-stacked": ["nprbst/child-a-feat-1"],
      },
    };
    await fs.writeFile(
      join(childRepoB, ".speck/branches.json"),
      JSON.stringify(childBBranchesJson, null, 2)
    );

    const branchCommandPath = join(rootRepo, ".speck/scripts/branch-command.ts");

    const result = await $`bun run ${branchCommandPath} list --all`.cwd(rootRepo).nothrow();

    expect(result.exitCode).toBe(0);

    const stdout = result.stdout.toString();

    // Verify both branches shown with repo grouping for disambiguation
    expect(stdout).toContain("child-repo-a");
    expect(stdout).toContain("child-repo-b");

    // Both should show same branch name but under different repo sections
    const childASection = stdout.substring(stdout.indexOf("child-repo-a"));
    const childBSection = stdout.substring(stdout.indexOf("child-repo-b"));

    expect(childASection).toContain("nprbst/child-a-feat-1");
    expect(childBSection).toContain("nprbst/child-a-feat-1");

    // Verify different PR numbers to confirm they're different branches
    expect(childASection).toContain("42");
    expect(childBSection).toContain("99");
  });
});
