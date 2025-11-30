/**
 * Unit tests for IDE launch functionality (.speck/scripts/worktree/ide-launch.ts)
 *
 * Test coverage:
 * - detectAvailableIDEs: Detect which IDEs are installed
 * - isIDEAvailable: Check if specific IDE command is in PATH
 * - getIDECommand: Get command array for launching IDE
 * - launchIDE: Launch IDE with worktree path
 * - Error handling: IDE not available, invalid paths, launch failures
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import type { LaunchIDEOptions } from '../../specs/012-worktree-integration/contracts/internal-api';

// Mock Bun.which to control IDE availability
const originalWhich = Bun.which;
const originalSpawn = Bun.spawn;
let mockedCommands: Set<string> = new Set();
let spawnCalls: Array<{ command: string[]; options: any }> = [];

function mockWhich(command: string): string | null {
  return mockedCommands.has(command) ? `/usr/bin/${command}` : null;
}

function mockSpawn(command: string[], options?: any): any {
  spawnCalls.push({ command, options });
  // Return a mock process object
  return {
    pid: 12345,
    kill: () => {},
    unref: () => {},
  };
}

beforeEach(() => {
  mockedCommands.clear();
  spawnCalls = [];
  Bun.which = mockWhich as typeof Bun.which;
  Bun.spawn = mockSpawn as typeof Bun.spawn;
});

afterEach(() => {
  Bun.which = originalWhich;
  Bun.spawn = originalSpawn;
  mockedCommands.clear();
  spawnCalls = [];
});

describe('isIDEAvailable', () => {
  it('should return true when IDE command is in PATH', async () => {
    // Arrange
    mockedCommands.add('code');
    const { isIDEAvailable } = await import('../../.speck/scripts/worktree/ide-launch');

    // Act
    const result = await isIDEAvailable('code');

    // Assert
    expect(result).toBe(true);
  });

  it('should return false when IDE command is not in PATH', async () => {
    // Arrange
    const { isIDEAvailable } = await import('../../.speck/scripts/worktree/ide-launch');

    // Act
    const result = await isIDEAvailable('code');

    // Assert
    expect(result).toBe(false);
  });

  it('should handle multiple IDE checks independently', async () => {
    // Arrange
    mockedCommands.add('code');
    mockedCommands.add('cursor');
    const { isIDEAvailable } = await import('../../.speck/scripts/worktree/ide-launch');

    // Act & Assert
    expect(await isIDEAvailable('code')).toBe(true);
    expect(await isIDEAvailable('cursor')).toBe(true);
    expect(await isIDEAvailable('webstorm')).toBe(false);
  });
});

describe('detectAvailableIDEs', () => {
  it('should detect all available IDEs', async () => {
    // Arrange
    mockedCommands.add('code');
    mockedCommands.add('cursor');
    mockedCommands.add('webstorm');
    const { detectAvailableIDEs } = await import('../../.speck/scripts/worktree/ide-launch');

    // Act
    const result = await detectAvailableIDEs();

    // Assert
    expect(result).toBeArrayOfSize(3);
    expect(result.find((ide) => ide.command === 'code')?.available).toBe(true);
    expect(result.find((ide) => ide.command === 'cursor')?.available).toBe(true);
    expect(result.find((ide) => ide.command === 'webstorm')?.available).toBe(true);
  });

  it('should return empty array when no IDEs are available', async () => {
    // Arrange
    const { detectAvailableIDEs } = await import('../../.speck/scripts/worktree/ide-launch');

    // Act
    const result = await detectAvailableIDEs();

    // Assert
    expect(result).toBeArrayOfSize(0);
  });

  it('should include IDE metadata (name, command, args)', async () => {
    // Arrange
    mockedCommands.add('code');
    const { detectAvailableIDEs } = await import('../../.speck/scripts/worktree/ide-launch');

    // Act
    const result = await detectAvailableIDEs();

    // Assert
    const vscode = result.find((ide) => ide.command === 'code');
    expect(vscode).toBeDefined();
    expect(vscode?.name).toBe('VSCode');
    expect(vscode?.command).toBe('code');
    expect(vscode?.args).toContain('-n'); // new window flag
    expect(vscode?.available).toBe(true);
  });

  it('should detect partial IDE availability', async () => {
    // Arrange
    mockedCommands.add('code');
    const { detectAvailableIDEs } = await import('../../.speck/scripts/worktree/ide-launch');

    // Act
    const result = await detectAvailableIDEs();

    // Assert
    expect(result).toBeArrayOfSize(1);
    expect(result[0]?.command).toBe('code');
  });
});

describe('getIDECommand', () => {
  it('should return correct command for VSCode with new window', () => {
    // Arrange
    const { getIDECommand } = require('../../.speck/scripts/worktree/ide-launch');
    const worktreePath = '/path/to/worktree';

    // Act
    const result = getIDECommand('vscode', worktreePath, true);

    // Assert
    expect(result).toEqual(['code', '-n', worktreePath]);
  });

  it('should return correct command for VSCode without new window', () => {
    // Arrange
    const { getIDECommand } = require('../../.speck/scripts/worktree/ide-launch');
    const worktreePath = '/path/to/worktree';

    // Act
    const result = getIDECommand('vscode', worktreePath, false);

    // Assert
    expect(result).toEqual(['code', worktreePath]);
  });

  it('should return correct command for Cursor', () => {
    // Arrange
    const { getIDECommand } = require('../../.speck/scripts/worktree/ide-launch');
    const worktreePath = '/path/to/worktree';

    // Act
    const result = getIDECommand('cursor', worktreePath, true);

    // Assert
    expect(result).toEqual(['cursor', '-n', worktreePath]);
  });

  it('should return correct command for WebStorm', () => {
    // Arrange
    const { getIDECommand } = require('../../.speck/scripts/worktree/ide-launch');
    const worktreePath = '/path/to/worktree';

    // Act
    const result = getIDECommand('webstorm', worktreePath, true);

    // Assert
    expect(result).toEqual(['webstorm', 'nosplash', worktreePath]);
  });

  it('should return correct command for IntelliJ IDEA', () => {
    // Arrange
    const { getIDECommand } = require('../../.speck/scripts/worktree/ide-launch');
    const worktreePath = '/path/to/worktree';

    // Act
    const result = getIDECommand('idea', worktreePath, true);

    // Assert
    expect(result).toEqual(['idea', 'nosplash', worktreePath]);
  });

  it('should return correct command for PyCharm', () => {
    // Arrange
    const { getIDECommand } = require('../../.speck/scripts/worktree/ide-launch');
    const worktreePath = '/path/to/worktree';

    // Act
    const result = getIDECommand('pycharm', worktreePath, true);

    // Assert
    expect(result).toEqual(['pycharm', 'nosplash', worktreePath]);
  });

  it('should handle paths with spaces', () => {
    // Arrange
    const { getIDECommand } = require('../../.speck/scripts/worktree/ide-launch');
    const worktreePath = '/path/with spaces/to/worktree';

    // Act
    const result = getIDECommand('vscode', worktreePath, true);

    // Assert
    expect(result).toEqual(['code', '-n', '/path/with spaces/to/worktree']);
  });
});

describe('launchIDE', () => {
  it('should successfully launch IDE when available', async () => {
    // Arrange
    mockedCommands.add('code');
    const { launchIDE } = await import('../../.speck/scripts/worktree/ide-launch');
    const options: LaunchIDEOptions = {
      worktreePath: '/path/to/worktree',
      editor: 'vscode',
      newWindow: true,
    };

    // Act
    const result = await launchIDE(options);

    // Assert
    expect(result.success).toBe(true);
    expect(result.editor).toBe('vscode');
    expect(result.command).toContain('code');
    expect(result.error).toBeUndefined();
  });

  it('should fail when IDE is not available', async () => {
    // Arrange
    const { launchIDE } = await import('../../.speck/scripts/worktree/ide-launch');
    const options: LaunchIDEOptions = {
      worktreePath: '/path/to/worktree',
      editor: 'vscode',
      newWindow: true,
    };

    // Act
    const result = await launchIDE(options);

    // Assert
    expect(result.success).toBe(false);
    expect(result.editor).toBe('vscode');
    expect(result.error).toContain('not available');
  });

  it('should use newWindow flag correctly', async () => {
    // Arrange
    mockedCommands.add('code');
    const { launchIDE } = await import('../../.speck/scripts/worktree/ide-launch');
    const options: LaunchIDEOptions = {
      worktreePath: '/path/to/worktree',
      editor: 'vscode',
      newWindow: false,
    };

    // Act
    const result = await launchIDE(options);

    // Assert
    expect(result.success).toBe(true);
    expect(result.command).not.toContain('-n');
  });

  it('should default newWindow to true when not specified', async () => {
    // Arrange
    mockedCommands.add('code');
    const { launchIDE } = await import('../../.speck/scripts/worktree/ide-launch');
    const options: LaunchIDEOptions = {
      worktreePath: '/path/to/worktree',
      editor: 'vscode',
    };

    // Act
    const result = await launchIDE(options);

    // Assert
    expect(result.success).toBe(true);
    expect(result.command).toContain('-n');
  });

  it('should return immediately without waiting for IDE to close', async () => {
    // Arrange
    mockedCommands.add('code');
    const { launchIDE } = await import('../../.speck/scripts/worktree/ide-launch');
    const options: LaunchIDEOptions = {
      worktreePath: '/path/to/worktree',
      editor: 'vscode',
      newWindow: true,
    };

    // Act
    const startTime = Date.now();
    const result = await launchIDE(options);
    const duration = Date.now() - startTime;

    // Assert
    expect(result.success).toBe(true);
    expect(duration).toBeLessThan(1000); // Should return in less than 1 second
  });

  it('should provide actionable error messages', async () => {
    // Arrange
    const { launchIDE } = await import('../../.speck/scripts/worktree/ide-launch');
    const options: LaunchIDEOptions = {
      worktreePath: '/path/to/worktree',
      editor: 'vscode',
      newWindow: true,
    };

    // Act
    const result = await launchIDE(options);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    // Error should include: cause (IDE not in PATH), impact (can't launch), remediation (install IDE or add to PATH)
    expect(result.error).toMatch(/not available|not found|not in PATH/i);
  });

  it('should handle different IDE types', async () => {
    // Arrange
    mockedCommands.add('cursor');
    mockedCommands.add('webstorm');
    const { launchIDE } = await import('../../.speck/scripts/worktree/ide-launch');

    // Act & Assert - Cursor
    const cursorResult = await launchIDE({
      worktreePath: '/path/to/worktree',
      editor: 'cursor',
      newWindow: true,
    });
    expect(cursorResult.success).toBe(true);
    expect(cursorResult.editor).toBe('cursor');

    // Act & Assert - WebStorm
    const webstormResult = await launchIDE({
      worktreePath: '/path/to/worktree',
      editor: 'webstorm',
      newWindow: true,
    });
    expect(webstormResult.success).toBe(true);
    expect(webstormResult.editor).toBe('webstorm');
  });
});

describe('error handling', () => {
  it('should handle IDE launch failure gracefully', async () => {
    // Arrange
    const { launchIDE } = await import('../../.speck/scripts/worktree/ide-launch');
    const options: LaunchIDEOptions = {
      worktreePath: '/nonexistent/path',
      editor: 'vscode',
      newWindow: true,
    };

    // Act
    const result = await launchIDE(options);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should provide error with cause, impact, and remediation', async () => {
    // Arrange
    const { launchIDE } = await import('../../.speck/scripts/worktree/ide-launch');
    const options: LaunchIDEOptions = {
      worktreePath: '/path/to/worktree',
      editor: 'vscode',
      newWindow: true,
    };

    // Act
    const result = await launchIDE(options);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();

    // Error should be actionable: what went wrong, why it matters, how to fix
    const errorLower = result.error?.toLowerCase() || '';
    const hasContext =
      errorLower.includes('not') ||
      errorLower.includes('install') ||
      errorLower.includes('path') ||
      errorLower.includes('available');
    expect(hasContext).toBe(true);
  });
});
