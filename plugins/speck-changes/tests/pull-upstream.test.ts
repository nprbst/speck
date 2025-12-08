/**
 * Tests for pull-upstream command
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdir, rm, readFile, readlink, symlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { pullUpstream, updateReleasesJson, createLatestSymlink } from '../scripts/pull-upstream';
import type { ReleaseRegistry } from '../scripts/lib/schemas';

// Test temporary directory
let testDir: string;

beforeEach(async () => {
  testDir = join(import.meta.dir, '.test-tmp', `pull-${Date.now()}`);
  await mkdir(testDir, { recursive: true });
  await mkdir(join(testDir, 'upstream', 'openspec'), { recursive: true });
});

afterEach(async () => {
  if (existsSync(testDir)) {
    await rm(testDir, { recursive: true, force: true });
  }
});

describe('updateReleasesJson', () => {
  test('creates new releases.json if not exists', async () => {
    const releasesPath = join(testDir, 'upstream', 'openspec', 'releases.json');

    const result = await updateReleasesJson(releasesPath, {
      version: 'v0.16.0',
      pullDate: new Date().toISOString(),
      commitSha: 'a'.repeat(40),
      status: 'active',
      releaseDate: '2025-11-21T00:00:00Z',
      releaseNotes: 'Test release',
    });

    expect(result.ok).toBe(true);
    expect(existsSync(releasesPath)).toBe(true);

    const content = await readFile(releasesPath, 'utf-8');
    const registry = JSON.parse(content) as ReleaseRegistry;

    expect(registry.releases).toHaveLength(1);
    expect(registry.latestVersion).toBe('v0.16.0');
  });

  test('updates existing releases.json', async () => {
    const releasesPath = join(testDir, 'upstream', 'openspec', 'releases.json');

    // Create initial registry
    const initialRegistry: ReleaseRegistry = {
      releases: [
        {
          version: 'v0.15.0',
          pullDate: new Date().toISOString(),
          commitSha: 'b'.repeat(40),
          status: 'active',
          releaseDate: '2025-11-15T00:00:00Z',
          releaseNotes: 'Old release',
        },
      ],
      latestVersion: 'v0.15.0',
    };
    await Bun.write(releasesPath, JSON.stringify(initialRegistry, null, 2));

    // Add new release
    const result = await updateReleasesJson(releasesPath, {
      version: 'v0.16.0',
      pullDate: new Date().toISOString(),
      commitSha: 'a'.repeat(40),
      status: 'active',
      releaseDate: '2025-11-21T00:00:00Z',
      releaseNotes: 'New release',
    });

    expect(result.ok).toBe(true);

    const content = await readFile(releasesPath, 'utf-8');
    const registry = JSON.parse(content) as ReleaseRegistry;

    expect(registry.releases).toHaveLength(2);
    expect(registry.latestVersion).toBe('v0.16.0');
    // Old release should be superseded
    expect(registry.releases.find((r) => r.version === 'v0.15.0')?.status).toBe('superseded');
  });

  test('handles duplicate version gracefully', async () => {
    const releasesPath = join(testDir, 'upstream', 'openspec', 'releases.json');

    const initialRegistry: ReleaseRegistry = {
      releases: [
        {
          version: 'v0.16.0',
          pullDate: new Date().toISOString(),
          commitSha: 'a'.repeat(40),
          status: 'active',
          releaseDate: '2025-11-21T00:00:00Z',
          releaseNotes: 'First pull',
        },
      ],
      latestVersion: 'v0.16.0',
    };
    await Bun.write(releasesPath, JSON.stringify(initialRegistry, null, 2));

    // Try to add same version again
    const result = await updateReleasesJson(releasesPath, {
      version: 'v0.16.0',
      pullDate: new Date().toISOString(),
      commitSha: 'a'.repeat(40),
      status: 'active',
      releaseDate: '2025-11-21T00:00:00Z',
      releaseNotes: 'Second pull',
    });

    // Should still succeed but update the existing entry
    expect(result.ok).toBe(true);
  });
});

describe('createLatestSymlink', () => {
  test('creates symlink to version directory', async () => {
    const upstreamDir = join(testDir, 'upstream', 'openspec');
    const versionDir = join(upstreamDir, 'v0.16.0');
    await mkdir(versionDir, { recursive: true });

    const result = await createLatestSymlink(upstreamDir, 'v0.16.0');

    expect(result.ok).toBe(true);

    const latestPath = join(upstreamDir, 'latest');
    expect(existsSync(latestPath)).toBe(true);

    const target = await readlink(latestPath);
    expect(target).toBe('v0.16.0');
  });

  test('updates existing symlink', async () => {
    const upstreamDir = join(testDir, 'upstream', 'openspec');
    const v15Dir = join(upstreamDir, 'v0.15.0');
    const v16Dir = join(upstreamDir, 'v0.16.0');
    await mkdir(v15Dir, { recursive: true });
    await mkdir(v16Dir, { recursive: true });

    // Create initial symlink
    const latestPath = join(upstreamDir, 'latest');
    await symlink('v0.15.0', latestPath);

    // Update to new version
    const result = await createLatestSymlink(upstreamDir, 'v0.16.0');

    expect(result.ok).toBe(true);

    const target = await readlink(latestPath);
    expect(target).toBe('v0.16.0');
  });
});

describe('pullUpstream', () => {
  test('returns error for invalid version format', async () => {
    const result = await pullUpstream('invalid', { rootDir: testDir });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('version');
    }
  });

  test('validates version format', async () => {
    // Valid versions
    expect(isValidVersion('v0.16.0')).toBe(true);
    expect(isValidVersion('v1.0.0')).toBe(true);
    expect(isValidVersion('v10.20.30')).toBe(true);

    // Invalid versions
    expect(isValidVersion('0.16.0')).toBe(false);
    expect(isValidVersion('v0.16')).toBe(false);
    expect(isValidVersion('latest')).toBe(false);
  });
});

function isValidVersion(version: string): boolean {
  return /^v\d+\.\d+\.\d+$/.test(version);
}
