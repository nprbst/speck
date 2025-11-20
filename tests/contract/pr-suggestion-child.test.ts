/**
 * Contract Test: PR Suggestion in Child Repo (T016)
 *
 * Validates that branch creation in child repo:
 * - Exits with code 2 when PR suggestion is triggered
 * - Outputs PR suggestion in JSON format
 * - Auto-prefixes PR title with [repo-name]
 * - Uses child repo's default branch as PR base
 *
 * Feature: 009-multi-repo-stacked (User Story 1)
 * Layer: 1 (Contract)
 * Created: 2025-11-19
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import {
  createMultiRepoTestFixture,
  commitChanges,
  type MultiRepoTestFixture
} from "../helpers/multi-repo-fixtures.ts";
import path from "node:path";
import { $ } from "bun";
import { writeFile } from "node:fs/promises";

describe("Contract: PR suggestion in child repo", () => {
  let fixture: MultiRepoTestFixture;

  beforeEach(async () => {
    fixture = await createMultiRepoTestFixture([
      { name: "backend-service", remoteUrl: "https://github.com/test/backend-service.git" }
    ], "007-multi-repo-monorepo-support");
  });

  afterEach(async () => {
    await fixture.cleanup();
  });

  test("T016: Creating second branch triggers PR suggestion with exit code 2", async () => {
    const childRepo = fixture.childRepos.get("backend-service")!;

    // Create first branch with a commit
    await $`
      cd ${childRepo} && \
      bun run ${process.cwd()}/.speck/scripts/branch-command.ts create nprbst/auth-db --base main --spec 009-multi-repo-stacked
    `.quiet();

    // Add a commit to the branch
    await writeFile(path.join(childRepo, "database.ts"), "export const db = {};");
    await commitChanges(childRepo, "feat: add database schema");

    // Create second branch (should trigger PR suggestion for first)
    const result = await $`
      cd ${childRepo} && \
      bun run ${process.cwd()}/.speck/scripts/branch-command.ts create nprbst/auth-api --base nprbst/auth-db
    `.nothrow();

    // Contract: Exit code 2 indicates PR suggestion available
    expect(result.exitCode).toBe(2);
  });

  test("T016: PR suggestion output contains JSON format", async () => {
    const childRepo = fixture.childRepos.get("backend-service")!;

    // Create first branch with a commit
    await $`
      cd ${childRepo} && \
      bun run ${process.cwd()}/.speck/scripts/branch-command.ts create nprbst/auth-db --base main --spec 009-multi-repo-stacked
    `.quiet();

    await writeFile(path.join(childRepo, "database.ts"), "export const db = {};");
    await commitChanges(childRepo, "feat: add database schema");

    // Create second branch
    const result = await $`
      cd ${childRepo} && \
      bun run ${process.cwd()}/.speck/scripts/branch-command.ts create nprbst/auth-api --base nprbst/auth-db --json
    `.nothrow();

    // Contract: Output is valid JSON
    const output = result.stdout.toString();
    expect(() => JSON.parse(output)).not.toThrow();

    const prData = JSON.parse(output);
    expect(prData).toHaveProperty("branch");
    expect(prData).toHaveProperty("title");
    expect(prData).toHaveProperty("body");
    expect(prData).toHaveProperty("base");
  });

  test("T016: PR title is auto-prefixed with [repo-name]", async () => {
    const childRepo = fixture.childRepos.get("backend-service")!;

    // Create first branch with a commit
    await $`
      cd ${childRepo} && \
      bun run ${process.cwd()}/.speck/scripts/branch-command.ts create nprbst/auth-db --base main --spec 009-multi-repo-stacked
    `.quiet();

    await writeFile(path.join(childRepo, "database.ts"), "export const db = {};");
    await commitChanges(childRepo, "feat: add database schema");

    // Create second branch with JSON output
    const result = await $`
      cd ${childRepo} && \
      bun run ${process.cwd()}/.speck/scripts/branch-command.ts create nprbst/auth-api --base nprbst/auth-db --json
    `.nothrow();

    const prData = JSON.parse(result.stdout.toString());

    // Contract: PR title starts with [backend-service]
    expect(prData.title).toMatch(/^\[backend-service\]/);
  });

  test("T016: PR base is child repo's default branch (main)", async () => {
    const childRepo = fixture.childRepos.get("backend-service")!;

    // Create first branch with a commit
    await $`
      cd ${childRepo} && \
      bun run ${process.cwd()}/.speck/scripts/branch-command.ts create nprbst/auth-db --base main --spec 009-multi-repo-stacked
    `.quiet();

    await writeFile(path.join(childRepo, "database.ts"), "export const db = {};");
    await commitChanges(childRepo, "feat: add database schema");

    // Create second branch with JSON output
    const result = await $`
      cd ${childRepo} && \
      bun run ${process.cwd()}/.speck/scripts/branch-command.ts create nprbst/auth-api --base nprbst/auth-db --json
    `.nothrow();

    const prData = JSON.parse(result.stdout.toString());

    // Contract: PR base is "main" (child's default branch, not parent spec branch)
    expect(prData.base).toBe("main");
  });

  test("T016: PR suggestion includes commit messages in body", async () => {
    const childRepo = fixture.childRepos.get("backend-service")!;

    // Create first branch with multiple commits
    await $`
      cd ${childRepo} && \
      bun run ${process.cwd()}/.speck/scripts/branch-command.ts create nprbst/auth-db --base main --spec 009-multi-repo-stacked
    `.quiet();

    await writeFile(path.join(childRepo, "database.ts"), "export const db = {};");
    await commitChanges(childRepo, "feat: add database schema");

    await writeFile(path.join(childRepo, "migrations.ts"), "export const migrations = [];");
    await commitChanges(childRepo, "feat: add migration system");

    // Create second branch with JSON output
    const result = await $`
      cd ${childRepo} && \
      bun run ${process.cwd()}/.speck/scripts/branch-command.ts create nprbst/auth-api --base nprbst/auth-db --json
    `.nothrow();

    const prData = JSON.parse(result.stdout.toString());

    // Contract: PR body includes commit messages
    expect(prData.body).toContain("database schema");
    expect(prData.body).toContain("migration system");
  });

  test("T016: PR suggestion handles child repo with master as default branch", async () => {
    const childRepo = fixture.childRepos.get("backend-service")!;

    // Rename main to master
    await $`git -C ${childRepo} branch -m main master`.quiet();

    // Create first branch with a commit
    await $`
      cd ${childRepo} && \
      bun run ${process.cwd()}/.speck/scripts/branch-command.ts create nprbst/auth-db --base master --spec 009-multi-repo-stacked
    `.quiet();

    await writeFile(path.join(childRepo, "database.ts"), "export const db = {};");
    await commitChanges(childRepo, "feat: add database schema");

    // Create second branch with JSON output
    const result = await $`
      cd ${childRepo} && \
      bun run ${process.cwd()}/.speck/scripts/branch-command.ts create nprbst/auth-api --base nprbst/auth-db --json
    `.nothrow();

    const prData = JSON.parse(result.stdout.toString());

    // Contract: PR base is "master" (auto-detected default branch)
    expect(prData.base).toBe("master");
  });
});
