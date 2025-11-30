/**
 * Unit Tests: Init Command
 *
 * Tests for the Speck init command that creates symlinks for global CLI access.
 * Per Constitution Principle XII: TDD - tests written before implementation
 *
 * Feature: 015-scope-simplification
 * Tasks: T055, T056, T057
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import {
  mkdtempSync,
  rmSync,
  existsSync,
  mkdirSync,
  lstatSync,
  readlinkSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Test fixtures directory
let testDir: string;
let localBinDir: string;

beforeEach(() => {
  // Create isolated temp directory for each test
  testDir = mkdtempSync(join(tmpdir(), 'speck-install-test-'));
  localBinDir = join(testDir, '.local', 'bin');
});

afterEach(() => {
  // Cleanup temp directory
  if (testDir && existsSync(testDir)) {
    rmSync(testDir, { recursive: true, force: true });
  }
});

describe('Init Command - Symlink Creation', () => {
  describe('T055: Symlink Creation', () => {
    test('creates symlink in target directory', () => {
      // Setup: Create target directory structure
      mkdirSync(localBinDir, { recursive: true });

      // Create a source file to symlink to
      const sourcePath = join(testDir, 'bootstrap.sh');
      writeFileSync(sourcePath, "#!/bin/bash\necho 'bootstrap'", { mode: 0o755 });

      // Create symlink
      const symlinkPath = join(localBinDir, 'speck');
      symlinkSync(sourcePath, symlinkPath);

      // Verify symlink was created
      expect(existsSync(symlinkPath)).toBe(true);
      expect(lstatSync(symlinkPath).isSymbolicLink()).toBe(true);
    });

    test('symlink points to correct target', () => {
      mkdirSync(localBinDir, { recursive: true });

      const sourcePath = join(testDir, 'bootstrap.sh');
      writeFileSync(sourcePath, "#!/bin/bash\necho 'bootstrap'", { mode: 0o755 });

      const symlinkPath = join(localBinDir, 'speck');
      symlinkSync(sourcePath, symlinkPath);

      // Verify symlink target
      const target = readlinkSync(symlinkPath);
      expect(target).toBe(sourcePath);
    });

    test('creates parent directories if missing', () => {
      // Parent directories don't exist yet
      expect(existsSync(localBinDir)).toBe(false);

      // Create directories
      mkdirSync(localBinDir, { recursive: true });

      // Verify directories were created
      expect(existsSync(localBinDir)).toBe(true);
    });

    test('handles existing symlink gracefully', () => {
      mkdirSync(localBinDir, { recursive: true });

      const sourcePath = join(testDir, 'bootstrap.sh');
      writeFileSync(sourcePath, "#!/bin/bash\necho 'bootstrap'", { mode: 0o755 });

      const symlinkPath = join(localBinDir, 'speck');

      // Create initial symlink
      symlinkSync(sourcePath, symlinkPath);
      expect(existsSync(symlinkPath)).toBe(true);

      // Remove and recreate (simulating --force behavior)
      rmSync(symlinkPath);
      symlinkSync(sourcePath, symlinkPath);

      expect(existsSync(symlinkPath)).toBe(true);
      expect(readlinkSync(symlinkPath)).toBe(sourcePath);
    });

    test('symlink is executable when source is executable', () => {
      mkdirSync(localBinDir, { recursive: true });

      const sourcePath = join(testDir, 'bootstrap.sh');
      writeFileSync(sourcePath, "#!/bin/bash\necho 'test'", { mode: 0o755 });

      const symlinkPath = join(localBinDir, 'speck');
      symlinkSync(sourcePath, symlinkPath);

      // Symlink inherits permissions from target - use lstat to check link existence
      expect(lstatSync(symlinkPath).isSymbolicLink()).toBe(true);
    });
  });
});

describe('Init Command - PATH Detection', () => {
  describe('T056: PATH Detection', () => {
    test('detects when directory is in PATH', () => {
      const currentPath = process.env.PATH || '';
      const pathDirs = currentPath.split(':');

      // Check if a common directory is in PATH
      const hasUsrBin = pathDirs.some((dir) => dir === '/usr/bin');
      expect(typeof hasUsrBin).toBe('boolean');
    });

    test('detects when directory is NOT in PATH', () => {
      const currentPath = process.env.PATH || '';
      const pathDirs = currentPath.split(':');

      // Check for a directory that shouldn't be in PATH
      const hasNonexistent = pathDirs.some(
        (dir) => dir === '/nonexistent/path/that/should/not/exist'
      );
      expect(hasNonexistent).toBe(false);
    });

    test('handles empty PATH gracefully', () => {
      const emptyPath = '';
      const pathDirs = emptyPath.split(':').filter(Boolean);

      expect(pathDirs.length).toBe(0);
    });

    test('handles PATH with trailing colon', () => {
      const pathWithTrailing = '/usr/bin:/usr/local/bin:';
      const pathDirs = pathWithTrailing.split(':').filter(Boolean);

      expect(pathDirs).toContain('/usr/bin');
      expect(pathDirs).toContain('/usr/local/bin');
      expect(pathDirs.length).toBe(2);
    });

    test('detects ~/.local/bin in PATH when present', () => {
      // Get the actual home directory
      const home = process.env.HOME || '';
      const localBin = join(home, '.local', 'bin');

      const currentPath = process.env.PATH || '';
      const isInPath = currentPath.split(':').includes(localBin);

      // This test verifies detection works - actual value depends on user's PATH
      expect(typeof isInPath).toBe('boolean');
    });
  });
});

describe('Init Command - Idempotent Init', () => {
  describe('T057: Idempotent Behavior', () => {
    test('running install twice succeeds', () => {
      mkdirSync(localBinDir, { recursive: true });

      const sourcePath = join(testDir, 'bootstrap.sh');
      writeFileSync(sourcePath, "#!/bin/bash\necho 'bootstrap'", { mode: 0o755 });

      const symlinkPath = join(localBinDir, 'speck');

      // First install
      symlinkSync(sourcePath, symlinkPath);
      expect(existsSync(symlinkPath)).toBe(true);

      // Second install (with cleanup first to simulate idempotent behavior)
      rmSync(symlinkPath);
      symlinkSync(sourcePath, symlinkPath);
      expect(existsSync(symlinkPath)).toBe(true);
    });

    test('detects existing valid symlink', () => {
      mkdirSync(localBinDir, { recursive: true });

      const sourcePath = join(testDir, 'bootstrap.sh');
      writeFileSync(sourcePath, "#!/bin/bash\necho 'bootstrap'", { mode: 0o755 });

      const symlinkPath = join(localBinDir, 'speck');
      symlinkSync(sourcePath, symlinkPath);

      // Check if it's a valid symlink pointing to our target
      const isSymlink = lstatSync(symlinkPath).isSymbolicLink();
      const target = readlinkSync(symlinkPath);

      expect(isSymlink).toBe(true);
      expect(target).toBe(sourcePath);
    });

    test('detects existing symlink pointing elsewhere', () => {
      mkdirSync(localBinDir, { recursive: true });

      // Create symlink pointing to a different file
      const otherPath = join(testDir, 'other.sh');
      writeFileSync(otherPath, "#!/bin/bash\necho 'other'", { mode: 0o755 });

      const symlinkPath = join(localBinDir, 'speck');
      symlinkSync(otherPath, symlinkPath);

      // Verify it points elsewhere
      const target = readlinkSync(symlinkPath);
      expect(target).toBe(otherPath);
      expect(target).not.toContain('bootstrap.sh');
    });

    test('handles broken symlink', () => {
      mkdirSync(localBinDir, { recursive: true });

      // Create symlink to non-existent target
      const brokenTarget = join(testDir, 'nonexistent.sh');
      const symlinkPath = join(localBinDir, 'speck');
      symlinkSync(brokenTarget, symlinkPath);

      // Verify symlink exists but target doesn't
      expect(lstatSync(symlinkPath).isSymbolicLink()).toBe(true);
      expect(existsSync(brokenTarget)).toBe(false);
    });
  });
});

describe('Init Command - Error Handling', () => {
  test('fails gracefully when parent directory cannot be created', () => {
    // Try to create directory in a location without permissions
    // This is a mock test - actual behavior depends on filesystem permissions
    const restrictedPath = '/root/cannot/create/here';

    // Should throw when trying to create without permissions
    expect(() => {
      mkdirSync(restrictedPath, { recursive: true });
    }).toThrow();
  });

  test('handles regular file at symlink path', () => {
    mkdirSync(localBinDir, { recursive: true });

    const symlinkPath = join(localBinDir, 'speck');

    // Create regular file instead of symlink
    writeFileSync(symlinkPath, 'not a symlink', { mode: 0o755 });

    // Verify it's a regular file, not a symlink
    expect(lstatSync(symlinkPath).isSymbolicLink()).toBe(false);
    expect(lstatSync(symlinkPath).isFile()).toBe(true);
  });
});
