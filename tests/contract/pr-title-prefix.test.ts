/**
 * Contract Test: PR Title Prefix Format (T113)
 *
 * Validates that PR titles in child repos are auto-prefixed with:
 * - Format: [repo-name] Original Title
 * - Repo name extracted from directory name
 * - Preserves original title text
 *
 * Feature: 009-multi-repo-stacked (User Story 1 - FR-014)
 * Layer: 1 (Contract)
 * Created: 2025-11-19
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import {
  createMultiRepoTestFixture,
  commitChanges,
  type MultiRepoTestFixture
} from "../helpers/multi-repo-fixtures.ts";
import { $ } from "bun";
import { writeFile } from "node:fs/promises";
import path from "node:path";

describe("Contract: PR title prefix format", () => {
  let fixture: MultiRepoTestFixture;

  beforeEach(async () => {
    fixture = await createMultiRepoTestFixture([
      { name: "backend-service", remoteUrl: "https://github.com/test/backend-service.git" },
      { name: "frontend-app", remoteUrl: "https://github.com/test/frontend-app.git" }
    ], "007-multi-repo-monorepo-support");
  });

  afterEach(async () => {
    await fixture.cleanup();
  });

  test("T113: PR title is prefixed with [repo-name]", async () => {
    const childRepo = fixture.childRepos.get("backend-service")!;

    // Create branch with commit
    await $`
      cd ${childRepo} && \
      bun run ${process.cwd()}/.speck/scripts/branch-command.ts create nprbst/auth-db --base main --spec 009-multi-repo-stacked
    `.quiet();

    await writeFile(path.join(childRepo, "auth.ts"), "export const auth = {};");
    await commitChanges(childRepo, "feat: add authentication system");

    // Create second branch to trigger PR suggestion
    const result = await $`
      cd ${childRepo} && \
      bun run ${process.cwd()}/.speck/scripts/branch-command.ts create nprbst/auth-api --base nprbst/auth-db --json
    `.nothrow();

    const prData = JSON.parse(result.stdout.toString());

    // Contract: Title starts with [backend-service]
    expect(prData.title).toMatch(/^\[backend-service\]/);
  });

  test("T113: PR title prefix uses child repo directory name", async () => {
    const frontendRepo = fixture.childRepos.get("frontend-app")!;

    // Create branch with commit
    await $`
      cd ${frontendRepo} && \
      bun run ${process.cwd()}/.speck/scripts/branch-command.ts create nprbst/login-ui --base main --spec 009-multi-repo-stacked
    `.quiet();

    await writeFile(path.join(frontendRepo, "login.tsx"), "export const Login = () => {};");
    await commitChanges(frontendRepo, "feat: add login component");

    // Create second branch to trigger PR suggestion
    const result = await $`
      cd ${frontendRepo} && \
      bun run ${process.cwd()}/.speck/scripts/branch-command.ts create nprbst/profile-ui --base nprbst/login-ui --json
    `.nothrow();

    const prData = JSON.parse(result.stdout.toString());

    // Contract: Title uses 'frontend-app' (not 'backend-service')
    expect(prData.title).toMatch(/^\[frontend-app\]/);
  });

  test("T113: PR title prefix preserves original commit message", async () => {
    const childRepo = fixture.childRepos.get("backend-service")!;

    // Create branch with specific commit message
    await $`
      cd ${childRepo} && \
      bun run ${process.cwd()}/.speck/scripts/branch-command.ts create nprbst/auth-db --base main --spec 009-multi-repo-stacked
    `.quiet();

    await writeFile(path.join(childRepo, "auth.ts"), "export const auth = {};");
    await commitChanges(childRepo, "feat: implement user authentication with JWT tokens");

    // Create second branch to trigger PR suggestion
    const result = await $`
      cd ${childRepo} && \
      bun run ${process.cwd()}/.speck/scripts/branch-command.ts create nprbst/auth-api --base nprbst/auth-db --json
    `.nothrow();

    const prData = JSON.parse(result.stdout.toString());

    // Contract: Original message preserved after prefix
    expect(prData.title).toContain("implement user authentication with JWT tokens");
  });

  test("T113: PR title format is '[repo-name] Original Title'", async () => {
    const childRepo = fixture.childRepos.get("backend-service")!;

    // Create branch with commit
    await $`
      cd ${childRepo} && \
      bun run ${process.cwd()}/.speck/scripts/branch-command.ts create nprbst/feature --base main --spec 009-multi-repo-stacked
    `.quiet();

    await writeFile(path.join(childRepo, "feature.ts"), "export const feature = {};");
    await commitChanges(childRepo, "Add new feature");

    // Create second branch to trigger PR suggestion
    const result = await $`
      cd ${childRepo} && \
      bun run ${process.cwd()}/.speck/scripts/branch-command.ts create nprbst/feature-2 --base nprbst/feature --json
    `.nothrow();

    const prData = JSON.parse(result.stdout.toString());

    // Contract: Format is [repo-name] <space> Title
    expect(prData.title).toMatch(/^\[backend-service\] /);
  });

  test("T113: PR title prefix handles repo names with hyphens", async () => {
    const childRepo = fixture.childRepos.get("backend-service")!;

    // Create branch with commit
    await $`
      cd ${childRepo} && \
      bun run ${process.cwd()}/.speck/scripts/branch-command.ts create nprbst/test --base main --spec 009-multi-repo-stacked
    `.quiet();

    await writeFile(path.join(childRepo, "test.ts"), "export const test = {};");
    await commitChanges(childRepo, "test commit");

    // Create second branch
    const result = await $`
      cd ${childRepo} && \
      bun run ${process.cwd()}/.speck/scripts/branch-command.ts create nprbst/test-2 --base nprbst/test --json
    `.nothrow();

    const prData = JSON.parse(result.stdout.toString());

    // Contract: Hyphenated name preserved exactly
    expect(prData.title).toContain("[backend-service]");
  });

  test("T113: PR title prefix does NOT appear in single-repo mode", async () => {
    // Create a separate single-repo test environment
    const singleRepoFixture = await createMultiRepoTestFixture([], "007-multi-repo-monorepo-support");
    const rootRepo = singleRepoFixture.rootDir;

    // Remove .speck/root symlink to simulate single-repo mode
    await $`rm -f ${path.join(rootRepo, ".speck", "root")}`.quiet();

    // Create branch with commit
    await $`
      cd ${rootRepo} && \
      bun run ${process.cwd()}/.speck/scripts/branch-command.ts create nprbst/feature --base main --spec 009-multi-repo-stacked --skip-pr-prompt
    `.quiet();

    await writeFile(path.join(rootRepo, "feature.ts"), "export const feature = {};");
    await commitChanges(rootRepo, "Add feature");

    // Create second branch (trigger PR suggestion for nprbst/feature)
    const result = await $`
      cd ${rootRepo} && \
      bun run ${process.cwd()}/.speck/scripts/branch-command.ts create nprbst/feature-2 --base nprbst/feature --json
    `.nothrow();

    const prData = JSON.parse(result.stdout.toString());

    // Contract: No [repo-name] prefix in single-repo mode
    expect(prData.title).not.toMatch(/^\[.+\]/);

    await singleRepoFixture.cleanup();
  });

  test("T113: PR title prefix handles multiple commits with summary", async () => {
    const childRepo = fixture.childRepos.get("backend-service")!;

    // Create branch with multiple commits
    await $`
      cd ${childRepo} && \
      bun run ${process.cwd()}/.speck/scripts/branch-command.ts create nprbst/multi-feature --base main --spec 009-multi-repo-stacked
    `.quiet();

    await writeFile(path.join(childRepo, "auth.ts"), "export const auth = {};");
    await commitChanges(childRepo, "feat: add authentication");

    await writeFile(path.join(childRepo, "db.ts"), "export const db = {};");
    await commitChanges(childRepo, "feat: add database layer");

    await writeFile(path.join(childRepo, "api.ts"), "export const api = {};");
    await commitChanges(childRepo, "feat: add API endpoints");

    // Create second branch
    const result = await $`
      cd ${childRepo} && \
      bun run ${process.cwd()}/.speck/scripts/branch-command.ts create nprbst/next-feature --base nprbst/multi-feature --json
    `.nothrow();

    const prData = JSON.parse(result.stdout.toString());

    // Contract: Title has prefix even with multiple commits
    expect(prData.title).toMatch(/^\[backend-service\]/);

    // Contract: Title uses first/most significant commit as base
    expect(prData.title).toMatch(/authentication|database|API/i);
  });
});
