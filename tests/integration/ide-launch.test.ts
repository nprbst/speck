/**
 * Integration tests for IDE launch functionality
 *
 * Test coverage:
 * - IDE launch integrated into worktree creation workflow
 * - Flag support (--no-ide)
 * - Configuration-based IDE selection
 * - Error handling for IDE launch failures
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { rmSync } from "fs";
import { createTempGitRepo } from "../fixtures/test-utils";

describe("IDE Launch Integration", () => {
  let testRepoPath: string;
  let originalWhich: typeof Bun.which;
  let originalSpawn: typeof Bun.spawn;
  let mockedIDEs: Set<string>;
  let spawnedCommands: string[][];

  beforeEach(async () => {
    // Create temporary test repository
    const tempRepo = await createTempGitRepo({ withCommits: true });
    testRepoPath = tempRepo.path;

    // Mock IDE availability
    mockedIDEs = new Set();
    spawnedCommands = [];

    originalWhich = Bun.which;
    originalSpawn = Bun.spawn;

    Bun.which = (async (command: string) => {
      return mockedIDEs.has(command) ? `/usr/bin/${command}` : null;
    }) as typeof Bun.which;

    Bun.spawn = ((command: string[]) => {
      spawnedCommands.push(command);
      return {
        pid: 12345,
        kill: () => {},
        unref: () => {},
      };
    }) as typeof Bun.spawn;
  });

  afterEach(() => {
    try {
      rmSync(testRepoPath, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
    Bun.which = originalWhich;
    Bun.spawn = originalSpawn;
  });

  it("should launch IDE when worktree is created with autoLaunch=true", async () => {
    // Arrange
    mockedIDEs.add("code");

    // Create config with IDE auto-launch enabled
    const { saveConfig } = await import("../../.speck/scripts/worktree/config");
    await saveConfig(testRepoPath, {
      version: "1.0.0",
      worktree: {
        enabled: true,
        worktreePath: ".speck/worktrees",
        ide: {
          autoLaunch: true,
          editor: "vscode",
          newWindow: true,
        },
        files: {
          rules: [],
          includeUntracked: false,
        },
        dependencies: {
          autoInstall: false,
          packageManager: "bun",
        },
      },
    });

    // Create branch first
    await Bun.$`cd ${testRepoPath} && git branch test-feature`.quiet();

    // Act
    const { createWorktree } = await import("../../.speck/scripts/worktree/create");
    const result = await createWorktree({
      repoPath: testRepoPath,
      branchName: "test-feature",
    });

    // Assert
    expect(result.success).toBe(true);
    expect(spawnedCommands.length).toBeGreaterThan(0);
    const ideCommand = spawnedCommands.find((cmd) => cmd[0] === "code");
    expect(ideCommand).toBeDefined();
    expect(ideCommand).toContain("-n"); // new window flag
  });

  it("should skip IDE launch when --no-ide flag is passed", async () => {
    // Arrange
    mockedIDEs.add("code");

    // Create config with IDE auto-launch enabled
    const { saveConfig } = await import("../../.speck/scripts/worktree/config");
    await saveConfig(testRepoPath, {
      version: "1.0.0",
      worktree: {
        enabled: true,
        worktreePath: ".speck/worktrees",
        ide: {
          autoLaunch: true,
          editor: "vscode",
          newWindow: true,
        },
        files: {
          rules: [],
          includeUntracked: false,
        },
        dependencies: {
          autoInstall: false,
          packageManager: "bun",
        },
      },
    });

    // Create branch first
    await Bun.$`cd ${testRepoPath} && git branch test-feature`.quiet();

    // Act
    const { createWorktree } = await import("../../.speck/scripts/worktree/create");
    const result = await createWorktree({
      repoPath: testRepoPath,
      branchName: "test-feature",
      skipIDE: true, // --no-ide flag
    });

    // Assert
    expect(result.success).toBe(true);
    const ideCommand = spawnedCommands.find((cmd) => cmd[0] === "code");
    expect(ideCommand).toBeUndefined(); // IDE should NOT be launched
  });

  it("should continue worktree creation when IDE launch fails", async () => {
    // Arrange - IDE not available
    // Don't add to mockedIDEs, so isIDEAvailable returns false

    // Create config with IDE auto-launch enabled
    const { saveConfig } = await import("../../.speck/scripts/worktree/config");
    await saveConfig(testRepoPath, {
      version: "1.0.0",
      worktree: {
        enabled: true,
        worktreePath: ".speck/worktrees",
        ide: {
          autoLaunch: true,
          editor: "vscode",
          newWindow: true,
        },
        files: {
          rules: [],
          includeUntracked: false,
        },
        dependencies: {
          autoInstall: false,
          packageManager: "bun",
        },
      },
    });

    // Create branch first
    await Bun.$`cd ${testRepoPath} && git branch test-feature`.quiet();

    // Act
    const { createWorktree } = await import("../../.speck/scripts/worktree/create");
    const result = await createWorktree({
      repoPath: testRepoPath,
      branchName: "test-feature",
    });

    // Assert
    expect(result.success).toBe(true); // Worktree creation should succeed
    expect(result.errors).toBeDefined();
    expect(result.errors?.some((err) => err.includes("IDE launch failed"))).toBe(true);
  });

  it("should respect IDE configuration (editor and newWindow settings)", async () => {
    // Arrange
    mockedIDEs.add("cursor");

    // Create config with Cursor and no new window
    const { saveConfig } = await import("../../.speck/scripts/worktree/config");
    await saveConfig(testRepoPath, {
      version: "1.0.0",
      worktree: {
        enabled: true,
        worktreePath: ".speck/worktrees",
        ide: {
          autoLaunch: true,
          editor: "cursor",
          newWindow: false, // No new window
        },
        files: {
          rules: [],
          includeUntracked: false,
        },
        dependencies: {
          autoInstall: false,
          packageManager: "bun",
        },
      },
    });

    // Create branch first
    await Bun.$`cd ${testRepoPath} && git branch test-feature`.quiet();

    // Act
    const { createWorktree } = await import("../../.speck/scripts/worktree/create");
    const result = await createWorktree({
      repoPath: testRepoPath,
      branchName: "test-feature",
    });

    // Assert
    expect(result.success).toBe(true);
    const ideCommand = spawnedCommands.find((cmd) => cmd[0] === "cursor");
    expect(ideCommand).toBeDefined();
    expect(ideCommand).not.toContain("-n"); // Should NOT have new window flag
  });

  it("should not launch IDE when autoLaunch is false", async () => {
    // Arrange
    mockedIDEs.add("code");

    // Create config with IDE auto-launch disabled
    const { saveConfig } = await import("../../.speck/scripts/worktree/config");
    await saveConfig(testRepoPath, {
      version: "1.0.0",
      worktree: {
        enabled: true,
        worktreePath: ".speck/worktrees",
        ide: {
          autoLaunch: false, // Disabled
          editor: "vscode",
          newWindow: true,
        },
        files: {
          rules: [],
          includeUntracked: false,
        },
        dependencies: {
          autoInstall: false,
          packageManager: "bun",
        },
      },
    });

    // Create branch first
    await Bun.$`cd ${testRepoPath} && git branch test-feature`.quiet();

    // Act
    const { createWorktree } = await import("../../.speck/scripts/worktree/create");
    const result = await createWorktree({
      repoPath: testRepoPath,
      branchName: "test-feature",
    });

    // Assert
    expect(result.success).toBe(true);
    const ideCommand = spawnedCommands.find((cmd) => cmd[0] === "code");
    expect(ideCommand).toBeUndefined(); // IDE should NOT be launched
  });
});
