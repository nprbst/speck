/**
 * Unit tests for dependency installation (deps-install.ts)
 *
 * Tests package manager detection, dependency installation, and error handling
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// Import functions under test
import {
  detectPackageManager,
  getInstallCommand,
  installDependencies,
  interpretInstallError,
} from '../../plugins/speck/scripts/worktree/deps-install';

describe('detectPackageManager', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'test-detect-pm-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('should detect bun from bun.lockb', async () => {
    await writeFile(join(tempDir, 'bun.lockb'), '');
    const pm = await detectPackageManager(tempDir);
    expect(pm).toBe('bun');
  });

  it('should detect pnpm from pnpm-lock.yaml', async () => {
    await writeFile(join(tempDir, 'pnpm-lock.yaml'), '');
    const pm = await detectPackageManager(tempDir);
    expect(pm).toBe('pnpm');
  });

  it('should detect yarn from yarn.lock', async () => {
    await writeFile(join(tempDir, 'yarn.lock'), '');
    const pm = await detectPackageManager(tempDir);
    expect(pm).toBe('yarn');
  });

  it('should detect npm from package-lock.json', async () => {
    await writeFile(join(tempDir, 'package-lock.json'), '');
    const pm = await detectPackageManager(tempDir);
    expect(pm).toBe('npm');
  });

  it('should default to npm if no lockfile found', async () => {
    const pm = await detectPackageManager(tempDir);
    expect(pm).toBe('npm');
  });

  it('should prioritize bun over other lockfiles', async () => {
    await writeFile(join(tempDir, 'bun.lockb'), '');
    await writeFile(join(tempDir, 'package-lock.json'), '');
    const pm = await detectPackageManager(tempDir);
    expect(pm).toBe('bun');
  });

  it('should prioritize pnpm over yarn and npm', async () => {
    await writeFile(join(tempDir, 'pnpm-lock.yaml'), '');
    await writeFile(join(tempDir, 'yarn.lock'), '');
    await writeFile(join(tempDir, 'package-lock.json'), '');
    const pm = await detectPackageManager(tempDir);
    expect(pm).toBe('pnpm');
  });

  it('should prioritize yarn over npm', async () => {
    await writeFile(join(tempDir, 'yarn.lock'), '');
    await writeFile(join(tempDir, 'package-lock.json'), '');
    const pm = await detectPackageManager(tempDir);
    expect(pm).toBe('yarn');
  });
});

describe('getInstallCommand', () => {
  it('should return bun install command', () => {
    const cmd = getInstallCommand('bun');
    expect(cmd).toEqual(['bun', 'install']);
  });

  it('should return pnpm install command', () => {
    const cmd = getInstallCommand('pnpm');
    expect(cmd).toEqual(['pnpm', 'install']);
  });

  it('should return yarn install command', () => {
    const cmd = getInstallCommand('yarn');
    expect(cmd).toEqual(['yarn', 'install']);
  });

  it('should return npm install command', () => {
    const cmd = getInstallCommand('npm');
    expect(cmd).toEqual(['npm', 'install']);
  });

  it('should handle auto by defaulting to npm', () => {
    const cmd = getInstallCommand('auto');
    expect(cmd).toEqual(['npm', 'install']);
  });
});

describe('interpretInstallError', () => {
  it('should interpret network errors', () => {
    const error = 'network timeout while fetching';
    const interpretation = interpretInstallError(error);

    expect(interpretation.toLowerCase()).toContain('network');
    expect(interpretation.toLowerCase()).toContain('internet connection');
  });

  it('should interpret permission errors', () => {
    const error = 'EACCES: permission denied';
    const interpretation = interpretInstallError(error);

    expect(interpretation.toLowerCase()).toContain('permission');
  });

  it('should interpret disk space errors', () => {
    const error = 'ENOSPC: no space left on device';
    const interpretation = interpretInstallError(error);

    expect(interpretation.toLowerCase()).toContain('disk space');
  });

  it('should interpret missing package.json errors', () => {
    const error = 'package.json not found';
    const interpretation = interpretInstallError(error);

    expect(interpretation.toLowerCase()).toContain('package.json');
  });

  it('should provide generic message for unknown errors', () => {
    const error = 'some unknown error';
    const interpretation = interpretInstallError(error);

    expect(interpretation).toBeTruthy();
    expect(interpretation.length).toBeGreaterThan(0);
  });

  it('should handle empty error messages', () => {
    const interpretation = interpretInstallError('');

    expect(interpretation).toBeTruthy();
    expect(interpretation.length).toBeGreaterThan(0);
  });

  it('should interpret registry errors', () => {
    const error = 'Unable to resolve dependency: 404 not found';
    const interpretation = interpretInstallError(error);

    expect(interpretation.toLowerCase()).toMatch(/registry|package|not found/);
  });
});

describe('installDependencies', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'test-install-deps-'));

    // Create package.json
    await writeFile(
      join(tempDir, 'package.json'),
      JSON.stringify({
        name: 'test-project',
        dependencies: {},
      })
    );
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('should return success result on successful install', async () => {
    // This test will use the actual package manager
    // Create a minimal package.json with no dependencies
    const result = await installDependencies({
      worktreePath: tempDir,
      packageManager: 'npm',
      onProgress: undefined,
    });

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should call progress callback during installation', async () => {
    const progressMessages: string[] = [];

    await installDependencies({
      worktreePath: tempDir,
      packageManager: 'npm',
      onProgress: (message) => progressMessages.push(message),
    });

    expect(progressMessages.length).toBeGreaterThan(0);
  });

  it('should detect package manager if auto is specified', async () => {
    // Create bun.lockb to force bun detection
    await writeFile(join(tempDir, 'bun.lockb'), '');

    const result = await installDependencies({
      worktreePath: tempDir,
      packageManager: 'auto',
    });

    expect(result.success).toBe(true);
    expect(result.packageManager).toBe('bun');
  });

  it('should return error result if package.json is missing', async () => {
    await rm(join(tempDir, 'package.json'));

    const result = await installDependencies({
      worktreePath: tempDir,
      packageManager: 'npm',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('should interpret errors in error result', async () => {
    await rm(join(tempDir, 'package.json'));

    const result = await installDependencies({
      worktreePath: tempDir,
      packageManager: 'npm',
    });

    expect(result.success).toBe(false);
    expect(result.interpretation).toBeTruthy();
    expect(result.interpretation).toContain('package.json');
  });

  it('should stream output during installation', async () => {
    const progressMessages: string[] = [];

    await installDependencies({
      worktreePath: tempDir,
      packageManager: 'npm',
      onProgress: (message) => progressMessages.push(message),
    });

    // Check that we received progress updates
    expect(progressMessages.length).toBeGreaterThan(0);
  });
});
