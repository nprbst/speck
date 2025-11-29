/**
 * Unit tests for file operations (file-ops.ts)
 *
 * Tests file copy/symlink operations, glob pattern matching, and untracked file detection
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtemp, rm, writeFile, mkdir, readlink } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execSync } from 'node:child_process';

// Import functions under test
import {
  matchFiles,
  getUntrackedFiles,
  copyFiles,
  symlinkDirectories,
  applyFileRules,
} from '../../.speck/scripts/worktree/file-ops';

import type { FileRule } from '../../.speck/scripts/worktree/config-schema';

describe('matchFiles', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'test-match-files-'));

    // Initialize git repo
    execSync('git init', { cwd: tempDir, stdio: 'ignore' });
    execSync('git config user.email "test@example.com"', { cwd: tempDir, stdio: 'ignore' });
    execSync('git config user.name "Test User"', { cwd: tempDir, stdio: 'ignore' });

    // Create test file structure
    await mkdir(join(tempDir, 'src'), { recursive: true });
    await mkdir(join(tempDir, 'src/components'), { recursive: true });
    await mkdir(join(tempDir, 'tests'), { recursive: true });
    await mkdir(join(tempDir, 'docs'), { recursive: true });

    await writeFile(join(tempDir, 'README.md'), '# Test');
    await writeFile(join(tempDir, 'package.json'), '{}');
    await writeFile(join(tempDir, 'src/index.ts'), '');
    await writeFile(join(tempDir, 'src/components/Button.tsx'), '');
    await writeFile(join(tempDir, 'src/components/Card.tsx'), '');
    await writeFile(join(tempDir, 'tests/example.test.ts'), '');
    await writeFile(join(tempDir, 'docs/guide.md'), '');

    // Track all files
    execSync('git add .', { cwd: tempDir, stdio: 'ignore' });
    execSync('git commit -m "Initial commit"', { cwd: tempDir, stdio: 'ignore' });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('should match all markdown files', async () => {
    const matches = await matchFiles(tempDir, ['**/*.md']);
    expect(matches).toContain('README.md');
    expect(matches).toContain('docs/guide.md');
    expect(matches.length).toBe(2);
  });

  it('should match TypeScript files in src/', async () => {
    const matches = await matchFiles(tempDir, ['src/**/*.ts', 'src/**/*.tsx']);
    expect(matches).toContain('src/index.ts');
    expect(matches).toContain('src/components/Button.tsx');
    expect(matches).toContain('src/components/Card.tsx');
    expect(matches.length).toBe(3);
  });

  it('should match single file pattern', async () => {
    const matches = await matchFiles(tempDir, ['package.json']);
    expect(matches).toEqual(['package.json']);
  });

  it('should return empty array for non-matching pattern', async () => {
    const matches = await matchFiles(tempDir, ['*.rb']);
    expect(matches).toEqual([]);
  });

  it('should match multiple patterns', async () => {
    const matches = await matchFiles(tempDir, ['*.md', '*.json']);
    expect(matches).toContain('README.md');
    expect(matches).toContain('package.json');
    expect(matches.length).toBe(2);
  });

  it('should handle absolute paths correctly', async () => {
    const matches = await matchFiles(tempDir, ['**/*.md']);
    // All results should be relative paths
    matches.forEach((match) => {
      expect(match.startsWith('/')).toBe(false);
    });
  });
});

describe('getUntrackedFiles', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'test-untracked-'));

    // Initialize git repo
    execSync('git init', { cwd: tempDir, stdio: 'ignore' });
    execSync('git config user.email "test@example.com"', { cwd: tempDir, stdio: 'ignore' });
    execSync('git config user.name "Test User"', { cwd: tempDir, stdio: 'ignore' });

    // Create tracked file
    await writeFile(join(tempDir, 'tracked.txt'), 'tracked');
    execSync('git add tracked.txt', { cwd: tempDir, stdio: 'ignore' });
    execSync('git commit -m "Initial commit"', { cwd: tempDir, stdio: 'ignore' });

    // Create untracked files
    await writeFile(join(tempDir, 'untracked1.txt'), 'untracked');
    await writeFile(join(tempDir, 'untracked2.txt'), 'untracked');
    await mkdir(join(tempDir, 'new-dir'), { recursive: true });
    await writeFile(join(tempDir, 'new-dir/file.txt'), 'untracked in dir');
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('should return all untracked files', async () => {
    const untracked = await getUntrackedFiles(tempDir);
    expect(untracked).toContain('untracked1.txt');
    expect(untracked).toContain('untracked2.txt');
    expect(untracked).toContain('new-dir/file.txt');
  });

  it('should not return tracked files', async () => {
    const untracked = await getUntrackedFiles(tempDir);
    expect(untracked).not.toContain('tracked.txt');
  });

  it('should return empty array if no untracked files', async () => {
    // Remove untracked files
    await rm(join(tempDir, 'untracked1.txt'));
    await rm(join(tempDir, 'untracked2.txt'));
    await rm(join(tempDir, 'new-dir'), { recursive: true });

    const untracked = await getUntrackedFiles(tempDir);
    expect(untracked).toEqual([]);
  });

  it('should handle directories with .gitignore', async () => {
    // Create .gitignore
    await writeFile(join(tempDir, '.gitignore'), 'ignored.txt\n');
    await writeFile(join(tempDir, 'ignored.txt'), 'should be ignored');
    await writeFile(join(tempDir, 'not-ignored.txt'), 'should appear');

    const untracked = await getUntrackedFiles(tempDir);
    expect(untracked).toContain('not-ignored.txt');
    expect(untracked).toContain('.gitignore');
    expect(untracked).not.toContain('ignored.txt');
  });
});

describe('copyFiles', () => {
  let sourceDir: string;
  let destDir: string;

  beforeEach(async () => {
    sourceDir = await mkdtemp(join(tmpdir(), 'test-copy-source-'));
    destDir = await mkdtemp(join(tmpdir(), 'test-copy-dest-'));

    // Create source files
    await mkdir(join(sourceDir, 'nested', 'deep'), { recursive: true });
    await writeFile(join(sourceDir, 'file1.txt'), 'content1');
    await writeFile(join(sourceDir, 'file2.txt'), 'content2');
    await writeFile(join(sourceDir, 'nested/file3.txt'), 'content3');
    await writeFile(join(sourceDir, 'nested/deep/file4.txt'), 'content4');
  });

  afterEach(async () => {
    await rm(sourceDir, { recursive: true, force: true });
    await rm(destDir, { recursive: true, force: true });
  });

  it('should copy files to destination', async () => {
    await copyFiles(sourceDir, destDir, ['file1.txt', 'file2.txt']);

    const file1 = await Bun.file(join(destDir, 'file1.txt')).text();
    const file2 = await Bun.file(join(destDir, 'file2.txt')).text();

    expect(file1).toBe('content1');
    expect(file2).toBe('content2');
  });

  it('should preserve directory structure', async () => {
    await copyFiles(sourceDir, destDir, ['nested/file3.txt', 'nested/deep/file4.txt']);

    const file3 = await Bun.file(join(destDir, 'nested/file3.txt')).text();
    const file4 = await Bun.file(join(destDir, 'nested/deep/file4.txt')).text();

    expect(file3).toBe('content3');
    expect(file4).toBe('content4');
  });

  it('should handle concurrent copy operations', async () => {
    const files = ['file1.txt', 'file2.txt', 'nested/file3.txt', 'nested/deep/file4.txt'];

    await copyFiles(sourceDir, destDir, files, 2);

    // Verify all files copied
    for (const file of files) {
      const content = await Bun.file(join(destDir, file)).text();
      expect(content).toBeTruthy();
    }
  });

  it('should overwrite existing files', async () => {
    // Create existing file
    await writeFile(join(destDir, 'file1.txt'), 'old content');

    await copyFiles(sourceDir, destDir, ['file1.txt']);

    const content = await Bun.file(join(destDir, 'file1.txt')).text();
    expect(content).toBe('content1');
  });

  it('should handle empty file list', async () => {
    // Should complete without throwing
    await copyFiles(sourceDir, destDir, []);
    expect(true).toBe(true); // Assert test passes if no error thrown
  });
});

describe('symlinkDirectories', () => {
  let sourceDir: string;
  let destDir: string;

  beforeEach(async () => {
    sourceDir = await mkdtemp(join(tmpdir(), 'test-symlink-source-'));
    destDir = await mkdtemp(join(tmpdir(), 'test-symlink-dest-'));

    // Create source directories
    await mkdir(join(sourceDir, 'node_modules'), { recursive: true });
    await mkdir(join(sourceDir, 'vendor'), { recursive: true });
    await mkdir(join(sourceDir, 'nested/lib'), { recursive: true });

    await writeFile(join(sourceDir, 'node_modules/package.txt'), 'package');
    await writeFile(join(sourceDir, 'vendor/library.txt'), 'library');
    await writeFile(join(sourceDir, 'nested/lib/util.txt'), 'util');
  });

  afterEach(async () => {
    await rm(sourceDir, { recursive: true, force: true });
    await rm(destDir, { recursive: true, force: true });
  });

  it('should create symlinks for directories', async () => {
    await symlinkDirectories(sourceDir, destDir, ['node_modules', 'vendor']);

    const link1 = await readlink(join(destDir, 'node_modules'));
    const link2 = await readlink(join(destDir, 'vendor'));

    // Symlinks should point to source directories (relative paths)
    expect(link1).toBeTruthy();
    expect(link2).toBeTruthy();
  });

  it('should use relative symlink paths', async () => {
    await symlinkDirectories(sourceDir, destDir, ['node_modules']);

    const link = await readlink(join(destDir, 'node_modules'));

    // Should be relative path
    expect(link.startsWith('/')).toBe(false);
  });

  it('should create parent directories for nested symlinks', async () => {
    await symlinkDirectories(sourceDir, destDir, ['nested/lib']);

    const link = await readlink(join(destDir, 'nested/lib'));
    expect(link).toBeTruthy();
  });

  it('should handle empty directory list', async () => {
    // Should complete without throwing
    await symlinkDirectories(sourceDir, destDir, []);
    expect(true).toBe(true); // Assert test passes if no error thrown
  });

  it('should verify symlinked content is accessible', async () => {
    await symlinkDirectories(sourceDir, destDir, ['node_modules']);

    // Read file through symlink
    const content = await Bun.file(join(destDir, 'node_modules/package.txt')).text();
    expect(content).toBe('package');
  });
});

describe('applyFileRules', () => {
  let sourceDir: string;
  let destDir: string;

  beforeEach(async () => {
    sourceDir = await mkdtemp(join(tmpdir(), 'test-rules-source-'));
    destDir = await mkdtemp(join(tmpdir(), 'test-rules-dest-'));

    // Initialize git repo
    execSync('git init', { cwd: sourceDir, stdio: 'ignore' });
    execSync('git config user.email "test@example.com"', { cwd: sourceDir, stdio: 'ignore' });
    execSync('git config user.name "Test User"', { cwd: sourceDir, stdio: 'ignore' });

    // Create test files
    await mkdir(join(sourceDir, 'src'), { recursive: true });
    await mkdir(join(sourceDir, 'node_modules'), { recursive: true });
    await mkdir(join(sourceDir, 'docs'), { recursive: true });

    await writeFile(join(sourceDir, '.env.local'), 'SECRET=123');
    await writeFile(join(sourceDir, 'README.md'), '# Project');
    await writeFile(join(sourceDir, 'package.json'), '{}');
    await writeFile(join(sourceDir, 'src/index.ts'), 'code');
    await writeFile(join(sourceDir, 'node_modules/package.txt'), 'dep');
    await writeFile(join(sourceDir, 'docs/guide.md'), 'docs');

    // Track some files
    execSync('git add README.md package.json src/index.ts', { cwd: sourceDir, stdio: 'ignore' });
    execSync('git commit -m "Initial"', { cwd: sourceDir, stdio: 'ignore' });
  });

  afterEach(async () => {
    await rm(sourceDir, { recursive: true, force: true });
    await rm(destDir, { recursive: true, force: true });
  });

  it('should apply copy rules', async () => {
    const rules: FileRule[] = [
      { pattern: '*.md', action: 'copy' },
      { pattern: '*.json', action: 'copy' },
    ];

    const result = await applyFileRules({
      sourcePath: sourceDir,
      destPath: destDir,
      rules,
      includeUntracked: false,
    });

    expect(result.copiedPaths).toContain('README.md');
    expect(result.copiedPaths).toContain('package.json');
    expect(result.copiedCount).toBe(2);
  });

  it('should apply symlink rules', async () => {
    const rules: FileRule[] = [{ pattern: 'node_modules', action: 'symlink' }];

    const result = await applyFileRules({
      sourcePath: sourceDir,
      destPath: destDir,
      rules,
      includeUntracked: false,
    });

    expect(result.symlinkedPaths).toContain('node_modules');
    expect(result.symlinkedCount).toBe(1);

    // Verify symlink works
    const link = await readlink(join(destDir, 'node_modules'));
    expect(link).toBeTruthy();
  });

  it('should apply ignore rules', async () => {
    const rules: FileRule[] = [
      { pattern: '**/*.md', action: 'copy' },
      { pattern: 'docs/**', action: 'ignore' },
    ];

    const result = await applyFileRules({
      sourcePath: sourceDir,
      destPath: destDir,
      rules,
      includeUntracked: false,
    });

    expect(result.copiedPaths).toContain('README.md');
    expect(result.copiedPaths).not.toContain('docs/guide.md');
  });

  it('should include untracked files when enabled', async () => {
    const rules: FileRule[] = [{ pattern: '.env*', action: 'copy' }];

    const result = await applyFileRules({
      sourcePath: sourceDir,
      destPath: destDir,
      rules,
      includeUntracked: true,
    });

    expect(result.copiedPaths).toContain('.env.local');
    expect(result.copiedCount).toBe(1);
  });

  it('should not include untracked files when disabled', async () => {
    const rules: FileRule[] = [{ pattern: '.env*', action: 'copy' }];

    const result = await applyFileRules({
      sourcePath: sourceDir,
      destPath: destDir,
      rules,
      includeUntracked: false,
    });

    // .env.local is untracked, should not be copied
    expect(result.copiedPaths).not.toContain('.env.local');
    expect(result.copiedCount).toBe(0);
  });

  it('should handle multiple rule types together', async () => {
    const rules: FileRule[] = [
      { pattern: '*.md', action: 'copy' },
      { pattern: 'node_modules', action: 'symlink' },
      { pattern: '.env*', action: 'ignore' },
    ];

    const result = await applyFileRules({
      sourcePath: sourceDir,
      destPath: destDir,
      rules,
      includeUntracked: true,
    });

    expect(result.copiedPaths).toContain('README.md');
    expect(result.symlinkedPaths).toContain('node_modules');
    expect(result.copiedPaths).not.toContain('.env.local');
  });

  it('should call progress callback', async () => {
    const messages: string[] = [];
    const rules: FileRule[] = [{ pattern: '*.md', action: 'copy' }];

    await applyFileRules({
      sourcePath: sourceDir,
      destPath: destDir,
      rules,
      includeUntracked: false,
      onProgress: (message) => messages.push(message),
    });

    expect(messages.length).toBeGreaterThan(0);
  });

  it('should return empty result for no matching rules', async () => {
    const rules: FileRule[] = [{ pattern: '*.xyz', action: 'copy' }];

    const result = await applyFileRules({
      sourcePath: sourceDir,
      destPath: destDir,
      rules,
      includeUntracked: false,
    });

    expect(result.copiedCount).toBe(0);
    expect(result.symlinkedCount).toBe(0);
  });

  it('should handle errors gracefully and continue', async () => {
    const rules: FileRule[] = [
      { pattern: '*.md', action: 'copy' },
      { pattern: 'nonexistent/**', action: 'copy' },
    ];

    const result = await applyFileRules({
      sourcePath: sourceDir,
      destPath: destDir,
      rules,
      includeUntracked: false,
    });

    // Should still copy .md files even if other patterns fail
    expect(result.copiedPaths).toContain('README.md');
    expect(result.copiedCount).toBeGreaterThan(0);
  });
});
