/**
 * Tests for Atomic File Operations (Medium-Weight)
 *
 * Tests atomic file operations with real filesystem in temp directory.
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtemp, rm, writeFile, readFile, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  createTempDir,
  removeDirectory,
  atomicMove,
  withTempDir,
  atomicWrite,
  AtomicFileOpsError,
} from '../../../plugins/speck/scripts/common/file-ops';

describe('Atomic File Operations', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'speck-test-'));
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('createTempDir', () => {
    test('creates temp directory with custom prefix', async () => {
      const tempDir = await createTempDir('test-prefix-');

      expect(tempDir).toContain('test-prefix-');
      expect(existsSync(tempDir)).toBe(true);

      // Cleanup
      await rm(tempDir, { recursive: true, force: true });
    });

    test('creates unique temp directories', async () => {
      const temp1 = await createTempDir();
      const temp2 = await createTempDir();

      expect(temp1).not.toBe(temp2);

      // Cleanup
      await rm(temp1, { recursive: true, force: true });
      await rm(temp2, { recursive: true, force: true });
    });
  });

  describe('removeDirectory', () => {
    test('removes directory and all contents', async () => {
      const dirPath = await mkdtemp(join(testDir, 'to-remove-'));
      const filePath = join(dirPath, 'file.txt');

      await writeFile(filePath, 'content');

      expect(existsSync(dirPath)).toBe(true);

      await removeDirectory(dirPath);

      expect(existsSync(dirPath)).toBe(false);
    });

    test("succeeds with force=true when directory doesn't exist", async () => {
      const nonexistent = join(testDir, 'nonexistent');

      await removeDirectory(nonexistent, true);

      expect(existsSync(nonexistent)).toBe(false);
    });
  });

  describe('atomicMove', () => {
    test('atomically moves directory to new location', async () => {
      const sourcePath = await mkdtemp(join(testDir, 'source-'));
      const destPath = join(testDir, 'dest');
      const filePath = join(sourcePath, 'file.txt');

      await writeFile(filePath, 'content');

      await atomicMove(sourcePath, destPath);

      expect(existsSync(sourcePath)).toBe(false);
      expect(existsSync(destPath)).toBe(true);
      expect(existsSync(join(destPath, 'file.txt'))).toBe(true);
    });

    test('throws error when destination exists and removeExisting=false', async () => {
      const sourcePath = await mkdtemp(join(testDir, 'source-'));
      const destPath = await mkdtemp(join(testDir, 'dest-'));

      try {
        await atomicMove(sourcePath, destPath, false);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(AtomicFileOpsError);
        expect((error as Error).message).toContain('already exists');
      }
    });

    test('removes existing destination when removeExisting=true', async () => {
      const sourcePath = await mkdtemp(join(testDir, 'source-'));
      await writeFile(join(sourcePath, 'new.txt'), 'new content');

      const destPath = await mkdtemp(join(testDir, 'dest-'));
      await writeFile(join(destPath, 'old.txt'), 'old content');

      await atomicMove(sourcePath, destPath, true);

      expect(existsSync(sourcePath)).toBe(false);
      expect(existsSync(destPath)).toBe(true);
      expect(existsSync(join(destPath, 'new.txt'))).toBe(true);
      expect(existsSync(join(destPath, 'old.txt'))).toBe(false);
    });
  });

  describe('withTempDir', () => {
    test('creates temp directory for callback and cleans up', async () => {
      let capturedTempDir = '';

      const result = await withTempDir(async (tempDir) => {
        capturedTempDir = tempDir;
        expect(existsSync(tempDir)).toBe(true);

        await writeFile(join(tempDir, 'test.txt'), 'content');
        return 'success';
      });

      expect(result).toBe('success');
      expect(existsSync(capturedTempDir)).toBe(false);
    });

    test('cleans up temp directory even when callback throws', async () => {
      let capturedTempDir = '';

      try {
        await withTempDir(async (tempDir) => {
          capturedTempDir = tempDir;
          throw new Error('Test error');
        });
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.message).toBe('Test error');
      }

      expect(existsSync(capturedTempDir)).toBe(false);
    });
  });

  describe('atomicWrite', () => {
    test('atomically writes content to file', async () => {
      const filePath = join(testDir, 'test.txt');
      const content = 'test content';

      await atomicWrite(filePath, content);

      const readContent = await readFile(filePath, 'utf-8');
      expect(readContent).toBe(content);
    });

    test('overwrites existing file atomically', async () => {
      const filePath = join(testDir, 'test.txt');

      await writeFile(filePath, 'old content');
      await atomicWrite(filePath, 'new content');

      const readContent = await readFile(filePath, 'utf-8');
      expect(readContent).toBe('new content');
    });

    test('writes Buffer and ArrayBuffer content', async () => {
      const filePath = join(testDir, 'buffer.txt');
      const buffer = Buffer.from('buffer content');

      await atomicWrite(filePath, buffer);

      const readContent = await readFile(filePath, 'utf-8');
      expect(readContent).toBe('buffer content');
    });
  });
});
