/**
 * Unit Tests for Configuration Management (config.ts)
 *
 * Tests for loadConfig, saveConfig, and migrateConfig functions.
 * Follows TDD: These tests are written BEFORE re-implementing config.ts
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { loadConfig, saveConfig, migrateConfig } from "../../.speck/scripts/worktree/config";
import type { SpeckConfig } from "../../.speck/scripts/worktree/config-schema";

describe("config.ts - Configuration Management", () => {
  let tempRepo: string;

  beforeEach(async () => {
    // Create temporary repository directory for each test
    tempRepo = await mkdtemp(join(tmpdir(), "speck-config-test-"));
  });

  afterEach(async () => {
    // Cleanup temporary directory
    if (existsSync(tempRepo)) {
      await rm(tempRepo, { recursive: true, force: true });
    }
  });

  describe("loadConfig", () => {
    test("should return default config when config file does not exist", async () => {
      const config = await loadConfig(tempRepo);

      expect(config).toBeDefined();
      expect(config.version).toBe("1.0");
      expect(config.worktree.enabled).toBe(false);
      expect(config.worktree.worktreePath).toBe(".speck/worktrees");
    });

    test("should load and validate existing config file", async () => {
      // Create .speck/config.json
      const speckDir = join(tempRepo, ".speck");
      await Bun.write(join(speckDir, "config.json"), JSON.stringify({
        version: "1.0",
        worktree: {
          enabled: true,
          worktreePath: "custom/path",
          ide: { autoLaunch: true, editor: "cursor" },
          dependencies: { autoInstall: true, packageManager: "bun" },
          files: { rules: [], includeUntracked: false },
        },
      }, null, 2));

      const config = await loadConfig(tempRepo);

      expect(config.version).toBe("1.0");
      expect(config.worktree.enabled).toBe(true);
      expect(config.worktree.worktreePath).toBe("custom/path");
      expect(config.worktree.ide.autoLaunch).toBe(true);
      expect(config.worktree.ide.editor).toBe("cursor");
      expect(config.worktree.dependencies.autoInstall).toBe(true);
      expect(config.worktree.dependencies.packageManager).toBe("bun");
      expect(config.worktree.files.includeUntracked).toBe(false);
    });

    test("should apply defaults for missing optional fields", async () => {
      // Create minimal config (only required fields)
      const speckDir = join(tempRepo, ".speck");
      await Bun.write(join(speckDir, "config.json"), JSON.stringify({
        version: "1.0",
        worktree: {
          enabled: true,
        },
      }, null, 2));

      const config = await loadConfig(tempRepo);

      expect(config.worktree.worktreePath).toBe(".speck/worktrees");
      expect(config.worktree.ide.autoLaunch).toBe(false);
      expect(config.worktree.ide.editor).toBe("vscode");
      expect(config.worktree.dependencies.autoInstall).toBe(false);
      expect(config.worktree.dependencies.packageManager).toBe("auto");
    });

    test("should throw error for invalid JSON", async () => {
      const speckDir = join(tempRepo, ".speck");
      await Bun.write(join(speckDir, "config.json"), "{ invalid json }");

      await expect(loadConfig(tempRepo)).rejects.toThrow(/Failed to parse configuration/);
    });

    test("should throw error for invalid config schema", async () => {
      const speckDir = join(tempRepo, ".speck");
      await Bun.write(join(speckDir, "config.json"), JSON.stringify({
        version: "1.0",
        worktree: {
          enabled: "not-a-boolean", // Invalid type
        },
      }, null, 2));

      await expect(loadConfig(tempRepo)).rejects.toThrow(/Invalid configuration/);
    });
  });

  describe("saveConfig", () => {
    test("should create .speck directory if it doesn't exist", async () => {
      const config: SpeckConfig = {
        version: "1.0",
        worktree: {
          enabled: true,
          worktreePath: ".speck/worktrees",
          ide: { autoLaunch: false, editor: "vscode", newWindow: true },
          dependencies: { autoInstall: false, packageManager: "auto" },
          files: { rules: [], includeUntracked: true },
        },
      };

      await saveConfig(tempRepo, config);

      const speckDir = join(tempRepo, ".speck");
      expect(existsSync(speckDir)).toBe(true);
    });

    test("should write config file with proper formatting", async () => {
      const config: SpeckConfig = {
        version: "1.0",
        worktree: {
          enabled: true,
          worktreePath: "custom/path",
          ide: { autoLaunch: true, editor: "cursor", newWindow: false },
          dependencies: { autoInstall: true, packageManager: "bun" },
          files: { rules: [], includeUntracked: false },
        },
      };

      await saveConfig(tempRepo, config);

      const configPath = join(tempRepo, ".speck", "config.json");
      const content = await readFile(configPath, "utf-8");
      const parsed = JSON.parse(content);

      expect(parsed.version).toBe("1.0");
      expect(parsed.worktree.enabled).toBe(true);
      expect(parsed.worktree.worktreePath).toBe("custom/path");
      expect(content.endsWith("\n")).toBe(true); // Should end with newline
    });

    test("should validate config before saving", async () => {
      const invalidConfig = {
        version: "1.0",
        worktree: {
          enabled: true,
          ide: {
            editor: "invalid-editor", // Invalid enum value
          },
        },
      } as unknown as SpeckConfig;

      await expect(saveConfig(tempRepo, invalidConfig)).rejects.toThrow();
    });

    test("should preserve file rules and custom settings", async () => {
      const config: SpeckConfig = {
        version: "1.0",
        worktree: {
          enabled: true,
          worktreePath: ".speck/worktrees",
          branchPrefix: "feature/",
          ide: { autoLaunch: true, editor: "vscode", newWindow: true },
          dependencies: { autoInstall: true, packageManager: "pnpm" },
          files: {
            rules: [
              { pattern: "*.env", action: "copy" },
              { pattern: "node_modules", action: "symlink" },
            ],
            includeUntracked: true,
          },
        },
      };

      await saveConfig(tempRepo, config);

      const loaded = await loadConfig(tempRepo);

      expect(loaded.worktree.branchPrefix).toBe("feature/");
      expect(loaded.worktree.files.rules).toHaveLength(2);
      expect(loaded.worktree.files.rules[0].pattern).toBe("*.env");
      expect(loaded.worktree.files.rules[1].action).toBe("symlink");
    });
  });

  describe("migrateConfig", () => {
    test("should return false when config does not exist", async () => {
      const migrated = await migrateConfig(tempRepo);
      expect(migrated).toBe(false);
    });

    test("should return false when config is already at current version", async () => {
      const config: SpeckConfig = {
        version: "1.0",
        worktree: {
          enabled: true,
          worktreePath: ".speck/worktrees",
          ide: { autoLaunch: false, editor: "vscode", newWindow: true },
          dependencies: { autoInstall: false, packageManager: "auto" },
          files: { rules: [], includeUntracked: true },
        },
      };

      await saveConfig(tempRepo, config);
      const migrated = await migrateConfig(tempRepo);

      expect(migrated).toBe(false);
    });

    test("should validate config during migration", async () => {
      // Create a valid config that doesn't need migration
      const speckDir = join(tempRepo, ".speck");
      await Bun.write(join(speckDir, "config.json"), JSON.stringify({
        version: "1.0",
        worktree: { enabled: true },
      }, null, 2));

      // Should return false (no migration needed)
      const migrated = await migrateConfig(tempRepo);
      expect(migrated).toBe(false);

      // Config should still be valid after migration check
      const config = await loadConfig(tempRepo);
      expect(config.version).toBe("1.0");
      expect(config.worktree.enabled).toBe(true);
    });

    test("should throw error for invalid JSON during migration", async () => {
      const speckDir = join(tempRepo, ".speck");
      await Bun.write(join(speckDir, "config.json"), "{ invalid json }");

      await expect(migrateConfig(tempRepo)).rejects.toThrow(/Invalid JSON/);
    });
  });

  describe("round-trip save and load", () => {
    test("should preserve exact config through save/load cycle", async () => {
      const original: SpeckConfig = {
        version: "1.0",
        worktree: {
          enabled: true,
          worktreePath: "custom/worktrees",
          branchPrefix: "wt-",
          ide: { autoLaunch: true, editor: "cursor", newWindow: false },
          dependencies: { autoInstall: true, packageManager: "bun" },
          files: {
            rules: [
              { pattern: ".env*", action: "copy" },
              { pattern: "node_modules", action: "symlink" },
              { pattern: ".git", action: "ignore" },
            ],
            includeUntracked: false,
          },
        },
      };

      await saveConfig(tempRepo, original);
      const loaded = await loadConfig(tempRepo);

      expect(loaded).toEqual(original);
    });
  });
});
