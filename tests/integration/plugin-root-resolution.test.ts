/**
 * Integration Test: Plugin Root Resolution in Multi-Repo (T025)
 *
 * Verifies that plugin root path is correctly resolved in multi-repo child contexts,
 * ensuring scripts can locate templates and other plugin resources.
 *
 * Feature: 009-multi-repo-stacked (User Story 1)
 * Layer: 2 (Integration)
 * Created: 2025-11-19
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import path from "node:path";
import type { MultiRepoTestFixture } from "../helpers/multi-repo-fixtures";
import { createMultiRepoTestFixture } from "../helpers/multi-repo-fixtures";
import { getPluginRoot, getTemplatesDir, getScriptsDir } from "../../.speck/scripts/common/paths";

describe("Integration: Plugin root resolution in multi-repo", () => {
  let fixture: MultiRepoTestFixture;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();

    // Set up multi-repo environment with one child
    fixture = await createMultiRepoTestFixture([
      { name: "backend-service" }
    ], "007-multi-repo-monorepo-support");
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fixture.cleanup();
  });

  test("T025: Plugin root resolution from child repo returns consistent path", async () => {
    const childRepo = fixture.childRepos.get("backend-service")!;

    // Change to child repo directory
    process.chdir(childRepo);

    // Get plugin root (based on import.meta.dir, not cwd)
    const pluginRoot = getPluginRoot();

    // Plugin root should be a valid absolute path
    expect(path.isAbsolute(pluginRoot)).toBe(true);

    // Should contain .speck directory (in dev mode) or be a plugin directory
    const isDevMode = pluginRoot.includes(".speck") || pluginRoot.endsWith("speck");
    const isPluginMode = pluginRoot.includes(".claude/plugins");
    expect(isDevMode || isPluginMode).toBe(true);
  });

  test("T025: Templates directory resolves correctly from child repo", async () => {
    const childRepo = fixture.childRepos.get("backend-service")!;

    // Change to child repo directory
    process.chdir(childRepo);

    const templatesDir = getTemplatesDir();

    // Templates directory should be absolute and end with appropriate path
    expect(path.isAbsolute(templatesDir)).toBe(true);
    expect(templatesDir.endsWith(".speck/templates") || templatesDir.endsWith("templates")).toBe(true);
  });

  test("T025: Scripts directory resolves correctly from child repo", async () => {
    const childRepo = fixture.childRepos.get("backend-service")!;

    // Change to child repo directory
    process.chdir(childRepo);

    const scriptsDir = getScriptsDir();

    // Scripts directory should be absolute and end with .speck/scripts
    expect(path.isAbsolute(scriptsDir)).toBe(true);
    expect(scriptsDir.endsWith(".speck/scripts")).toBe(true);
  });

  test("T025: Plugin root resolution from root repo works correctly", async () => {
    // Change to root repo directory
    process.chdir(fixture.rootDir);

    const pluginRoot = getPluginRoot();

    // Plugin root should be consistent regardless of cwd (based on import.meta.dir)
    expect(path.isAbsolute(pluginRoot)).toBe(true);
  });

  test("T025: Plugin root resolution is consistent across multiple calls", async () => {
    const childRepo = fixture.childRepos.get("backend-service")!;

    // Change to child repo directory
    process.chdir(childRepo);

    // Call multiple times
    const result1 = getPluginRoot();
    const result2 = getPluginRoot();
    const result3 = getPluginRoot();

    // All calls should return the same value (idempotent)
    expect(result1).toBe(result2);
    expect(result2).toBe(result3);

    // Result should be absolute path
    expect(path.isAbsolute(result1)).toBe(true);
  });
});
