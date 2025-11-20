import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { join } from "path";
import { $ } from "bun";
import fs from "fs/promises";

/**
 * Integration Test: /speck.env invokes env-command.ts with multi-repo detection
 *
 * Task: T038 [P] [US2]
 * Layer: 2 (Integration)
 *
 * Purpose: Verify that /speck.env slash command correctly invokes env-command.ts
 *          and detects multi-repo context, displaying aggregate branch status.
 */

describe("Integration: /speck.env with multi-repo detection", () => {
  let testRoot: string;
  let rootRepo: string;
  let childRepo: string;

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

    // Setup child repository
    childRepo = join(testRoot, "child-repo");
    await fs.mkdir(childRepo, { recursive: true });
    await $`git init`.cwd(childRepo);
    await $`git config user.name "Test User"`.cwd(childRepo);
    await $`git config user.email "test@example.com"`.cwd(childRepo);

    // Link child repo to root (multi-repo setup)
    await fs.symlink(childRepo, join(rootRepo, ".speck-link-child-repo"));

    // Create .speck/root symlink in child repo pointing to root
    await fs.mkdir(join(childRepo, ".speck"), { recursive: true });
    await fs.symlink(rootRepo, join(childRepo, ".speck/root"));

    // Create branches.json in root repo
    const rootBranchesJson = {
      version: "1.1.0",
      branches: [
        {
          name: "nprbst/root-feature",
          specId: "008-stacked-pr-support",
          baseBranch: "main",
          status: "active",
          pr: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      specIndex: {
        "008-stacked-pr-support": ["nprbst/root-feature"],
      },
    };
    await fs.mkdir(join(rootRepo, ".speck"), { recursive: true });
    await fs.writeFile(
      join(rootRepo, ".speck/branches.json"),
      JSON.stringify(rootBranchesJson, null, 2)
    );

    // Create branches.json in child repo
    const childBranchesJson = {
      version: "1.1.0",
      branches: [
        {
          name: "nprbst/child-feature",
          specId: "009-multi-repo-stacked",
          baseBranch: "main",
          status: "active",
          pr: 42,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          parentSpecId: "008-stacked-pr-support",
        },
      ],
      specIndex: {
        "009-multi-repo-stacked": ["nprbst/child-feature"],
      },
    };
    await fs.writeFile(
      join(childRepo, ".speck/branches.json"),
      JSON.stringify(childBranchesJson, null, 2)
    );
  });

  afterAll(async () => {
    // Cleanup test workspace
    await fs.rm(testRoot, { recursive: true, force: true });
  });

  test("invokes env-command.ts from root context", async () => {
    // Execute env-command.ts directly (simulating slash command delegation)
    const envCommandPath = join(rootRepo, ".speck/scripts/env-command.ts");

    const result = await $`bun run ${envCommandPath}`.cwd(rootRepo).nothrow();

    // Verify script invoked successfully
    expect(result.exitCode).toBe(0);

    // Verify output contains multi-repo context indicator
    const stdout = result.stdout.toString();
    expect(stdout).toContain("Multi-Repo");
  });

  test("detects multi-repo context from root", async () => {
    const envCommandPath = join(rootRepo, ".speck/scripts/env-command.ts");

    const result = await $`bun run ${envCommandPath}`.cwd(rootRepo).nothrow();

    expect(result.exitCode).toBe(0);

    const stdout = result.stdout.toString();

    // Verify root repo branches displayed
    expect(stdout).toContain("nprbst/root-feature");
    expect(stdout).toContain("008-stacked-pr-support");

    // Verify child repo branches displayed in aggregate view
    expect(stdout).toContain("child-repo");
    expect(stdout).toContain("nprbst/child-feature");
    expect(stdout).toContain("009-multi-repo-stacked");
  });

  test("detects child context when running from child repo", async () => {
    const envCommandPath = join(childRepo, ".speck/scripts/env-command.ts");

    // Copy .speck/scripts to child repo for this test
    await fs.mkdir(join(childRepo, ".speck/scripts"), { recursive: true });
    await $`cp -r ${join(rootRepo, ".speck/scripts")}/* ${join(childRepo, ".speck/scripts")}/`.nothrow();

    const result = await $`bun run ${envCommandPath}`.cwd(childRepo).nothrow();

    // Log stderr for debugging if test fails
    if (result.exitCode !== 0) {
      console.error("STDERR:", result.stderr.toString());
      console.error("STDOUT:", result.stdout.toString());
    }

    expect(result.exitCode).toBe(0);

    const stdout = result.stdout.toString();

    // Verify child context indicator
    expect(stdout).toContain("Child");
    expect(stdout).toContain("child-repo");

    // Verify parent spec reference
    expect(stdout).toContain("008-stacked-pr-support");

    // Verify only local branches shown (not aggregate)
    expect(stdout).toContain("nprbst/child-feature");
    expect(stdout).not.toContain("nprbst/root-feature");
  });

  test("displays aggregate status with correct formatting", async () => {
    const envCommandPath = join(rootRepo, ".speck/scripts/env-command.ts");

    const result = await $`bun run ${envCommandPath}`.cwd(rootRepo).nothrow();

    expect(result.exitCode).toBe(0);

    const stdout = result.stdout.toString();

    // Verify tree-based visualization format
    expect(stdout).toMatch(/└─|├─/); // Tree characters

    // Verify PR numbers displayed
    expect(stdout).toContain("PR #42");

    // Verify status labels
    expect(stdout).toContain("active");
  });
});
