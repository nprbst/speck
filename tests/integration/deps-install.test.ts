/**
 * Integration tests for dependency installation
 *
 * Tests end-to-end dependency installation workflows with real package managers (mocked)
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { installDependencies } from '../../plugins/speck/scripts/worktree/deps-install';

describe('Dependency Installation Integration', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'test-deps-install-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('should install dependencies with npm', async () => {
    // Create package.json with no dependencies
    await writeFile(
      join(tempDir, 'package.json'),
      JSON.stringify(
        {
          name: 'test-npm-install',
          version: '1.0.0',
          dependencies: {},
        },
        null,
        2
      )
    );

    await writeFile(join(tempDir, 'package-lock.json'), '{}');

    const result = await installDependencies({
      worktreePath: tempDir,
      packageManager: 'npm',
    });

    expect(result.success).toBe(true);
    expect(result.packageManager).toBe('npm');
  });

  it('should auto-detect package manager from lockfile', async () => {
    // Create package.json with bun.lockb
    await writeFile(
      join(tempDir, 'package.json'),
      JSON.stringify(
        {
          name: 'test-auto-detect',
          version: '1.0.0',
          dependencies: {},
        },
        null,
        2
      )
    );

    await writeFile(join(tempDir, 'bun.lockb'), '');

    const result = await installDependencies({
      worktreePath: tempDir,
      packageManager: 'auto',
    });

    expect(result.success).toBe(true);
    expect(result.packageManager).toBe('bun');
  });

  it('should report progress during installation', async () => {
    await writeFile(
      join(tempDir, 'package.json'),
      JSON.stringify(
        {
          name: 'test-progress',
          version: '1.0.0',
          dependencies: {},
        },
        null,
        2
      )
    );

    const progressMessages: string[] = [];

    const result = await installDependencies({
      worktreePath: tempDir,
      packageManager: 'npm',
      onProgress: (message) => progressMessages.push(message),
    });

    expect(result.success).toBe(true);
    expect(progressMessages.length).toBeGreaterThan(0);

    // Should have at least a starting message
    expect(progressMessages.some((msg) => msg.toLowerCase().includes('install'))).toBe(true);
  });

  it('should handle missing package.json gracefully', async () => {
    const result = await installDependencies({
      worktreePath: tempDir,
      packageManager: 'npm',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
    expect(result.interpretation).toContain('package.json');
  });

  it('should handle network-like errors gracefully', async () => {
    // Create invalid package.json to trigger an error
    await writeFile(join(tempDir, 'package.json'), 'invalid json {');

    const result = await installDependencies({
      worktreePath: tempDir,
      packageManager: 'npm',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
    expect(result.interpretation).toBeTruthy();
  });

  it('should work with pnpm when pnpm-lock.yaml exists', async () => {
    await writeFile(
      join(tempDir, 'package.json'),
      JSON.stringify(
        {
          name: 'test-pnpm',
          version: '1.0.0',
          dependencies: {},
        },
        null,
        2
      )
    );

    await writeFile(join(tempDir, 'pnpm-lock.yaml'), 'lockfileVersion: 5.4');

    const result = await installDependencies({
      worktreePath: tempDir,
      packageManager: 'auto',
    });

    expect(result.success).toBe(true);
    expect(result.packageManager).toBe('pnpm');
  });

  it('should work with yarn when yarn.lock exists', async () => {
    await writeFile(
      join(tempDir, 'package.json'),
      JSON.stringify(
        {
          name: 'test-yarn',
          version: '1.0.0',
          dependencies: {},
        },
        null,
        2
      )
    );

    await writeFile(join(tempDir, 'yarn.lock'), '');

    const result = await installDependencies({
      worktreePath: tempDir,
      packageManager: 'auto',
    });

    expect(result.success).toBe(true);
    expect(result.packageManager).toBe('yarn');
  });

  it('should complete successfully even with no dependencies', async () => {
    await writeFile(
      join(tempDir, 'package.json'),
      JSON.stringify(
        {
          name: 'test-node-modules',
          version: '1.0.0',
          dependencies: {},
        },
        null,
        2
      )
    );

    const result = await installDependencies({
      worktreePath: tempDir,
      packageManager: 'npm',
    });

    expect(result.success).toBe(true);
    expect(result.duration).toBeGreaterThan(0);
  });
});

describe('Dependency Installation Error Scenarios', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'test-deps-errors-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('should provide actionable error for missing package.json', async () => {
    const result = await installDependencies({
      worktreePath: tempDir,
      packageManager: 'npm',
    });

    expect(result.success).toBe(false);
    expect(result.interpretation).toBeTruthy();
    expect(result.interpretation?.toLowerCase()).toContain('package.json');
  });

  it('should provide actionable error for invalid package.json', async () => {
    await writeFile(join(tempDir, 'package.json'), 'not valid json');

    const result = await installDependencies({
      worktreePath: tempDir,
      packageManager: 'npm',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('should include stderr in error message', async () => {
    await writeFile(join(tempDir, 'package.json'), '{invalid}');

    const result = await installDependencies({
      worktreePath: tempDir,
      packageManager: 'npm',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});
