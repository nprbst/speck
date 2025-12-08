/**
 * Tests for Symlink Manager (Medium-Weight)
 *
 * Tests symlink operations with real filesystem in temp directory.
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtemp, rm, mkdir, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  createSymlink,
  updateSymlink,
  readSymlink,
  isSymlink,
  removeSymlink,
  SymlinkManagerError,
} from '../../../plugins/speck/scripts/common/symlink-manager';

describe('Symlink Manager', () => {
  let tempDir: string;

  beforeEach(async () => {
    // Create a real temp directory for each test
    tempDir = await mkdtemp(join(tmpdir(), 'speck-test-'));
  });

  afterEach(async () => {
    // Clean up temp directory
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('createSymlink', () => {
    test('creates a symlink pointing to target', () => {
      const target = 'v1.0.0';
      const linkPath = join(tempDir, 'latest');

      createSymlink(target, linkPath);

      const actualTarget = readSymlink(linkPath);
      expect(actualTarget).toBe(target);
      expect(isSymlink(linkPath)).toBe(true);
    });

    test('throws error when symlink already exists', () => {
      const target = 'v1.0.0';
      const linkPath = join(tempDir, 'latest');

      createSymlink(target, linkPath);

      try {
        createSymlink('v1.1.0', linkPath);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(SymlinkManagerError);
        expect((error as Error).message).toContain('already exists');
      }
    });
  });

  describe('updateSymlink', () => {
    test('updates existing symlink to new target', () => {
      const linkPath = join(tempDir, 'latest');

      createSymlink('v1.0.0', linkPath);
      updateSymlink('v1.1.0', linkPath);

      const target = readSymlink(linkPath);
      expect(target).toBe('v1.1.0');
    });

    test("creates symlink if it doesn't exist", () => {
      const linkPath = join(tempDir, 'latest');

      updateSymlink('v1.0.0', linkPath);

      const target = readSymlink(linkPath);
      expect(target).toBe('v1.0.0');
      expect(isSymlink(linkPath)).toBe(true);
    });

    test('throws error when path exists but is not a symlink', async () => {
      const filePath = join(tempDir, 'not-a-symlink');
      await writeFile(filePath, 'content');

      try {
        updateSymlink('v1.0.0', filePath);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(SymlinkManagerError);
        expect((error as Error).message).toContain('not a symlink');
      }
    });
  });

  describe('readSymlink', () => {
    test('reads the target of a symlink', () => {
      const target = 'upstream/v1.0.0';
      const linkPath = join(tempDir, 'latest');

      createSymlink(target, linkPath);

      const readTarget = readSymlink(linkPath);
      expect(readTarget).toBe(target);
    });

    test("throws error when symlink doesn't exist", () => {
      const linkPath = join(tempDir, 'nonexistent');

      try {
        readSymlink(linkPath);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(SymlinkManagerError);
        expect((error as Error).message).toContain('not found');
      }
    });

    test('throws error when path is not a symlink', async () => {
      const filePath = join(tempDir, 'regular-file');
      await writeFile(filePath, 'content');

      try {
        readSymlink(filePath);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(SymlinkManagerError);
        expect((error as Error).message).toContain('not a symlink');
      }
    });
  });

  describe('isSymlink', () => {
    test('returns true for symlinks', () => {
      const linkPath = join(tempDir, 'latest');
      createSymlink('v1.0.0', linkPath);

      expect(isSymlink(linkPath)).toBe(true);
    });

    test('returns false for regular files', async () => {
      const filePath = join(tempDir, 'regular-file');
      await writeFile(filePath, 'content');

      expect(isSymlink(filePath)).toBe(false);
    });

    test('returns false for directories', async () => {
      const dirPath = join(tempDir, 'directory');
      await mkdir(dirPath);

      expect(isSymlink(dirPath)).toBe(false);
    });

    test('returns false for nonexistent paths', () => {
      const nonexistent = join(tempDir, 'nonexistent');

      expect(isSymlink(nonexistent)).toBe(false);
    });
  });

  describe('removeSymlink', () => {
    test('removes an existing symlink', () => {
      const linkPath = join(tempDir, 'latest');
      createSymlink('v1.0.0', linkPath);

      expect(isSymlink(linkPath)).toBe(true);

      removeSymlink(linkPath);

      expect(isSymlink(linkPath)).toBe(false);
    });

    test("throws error when symlink doesn't exist", () => {
      const linkPath = join(tempDir, 'nonexistent');

      try {
        removeSymlink(linkPath);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(SymlinkManagerError);
        expect((error as Error).message).toContain('not found');
      }
    });

    test('throws error when path is not a symlink', async () => {
      const filePath = join(tempDir, 'regular-file');
      await writeFile(filePath, 'content');

      try {
        removeSymlink(filePath);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(SymlinkManagerError);
        expect((error as Error).message).toContain('not a symlink');
      }
    });
  });
});
