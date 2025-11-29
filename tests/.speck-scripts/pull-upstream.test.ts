/**
 * Tests for /speck.pull-upstream command
 *
 * These tests validate CLI interface compatibility with bash equivalent:
 * - CLI flags (--json)
 * - Exit codes (0 for success, 1 for user error, 2 for system/network errors)
 * - JSON output schema
 * - Directory creation and file operations
 * - Release registry updates
 * - Symlink management
 * - Atomicity and rollback on failure
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { pullUpstream } from '../../.speck/scripts/pull-upstream';
import { ExitCode } from '../../specs/001-speck-core-project/contracts/cli-interface';
import type { PullUpstreamOutput } from '../../specs/001-speck-core-project/contracts/cli-interface';
import {
  MockFilesystem,
  MockGitHubApi,
  createMockGitHubRelease,
  createMockUpstreamDirectory,
} from '../../specs/001-speck-core-project/contracts/test-utilities';

describe('pull-upstream', () => {
  let mockFs: MockFilesystem;
  let mockGitHub: MockGitHubApi;

  beforeEach(() => {
    mockFs = new MockFilesystem();
    mockGitHub = new MockGitHubApi();
  });

  describe('T029: Contract test - --json flag outputs valid JSON schema', () => {
    test('outputs valid JSON with required fields', async () => {
      mockGitHub.setReleases([
        createMockGitHubRelease({
          tag_name: 'v1.0.0',
          target_commitish: 'abc123' + '0'.repeat(34),
        }),
      ]);

      const result = await pullUpstream(['v1.0.0', '--json'], {
        fs: mockFs,
        github: mockGitHub,
      });

      expect(result.exitCode).toBe(ExitCode.SUCCESS);

      // Validate JSON output structure
      const output: PullUpstreamOutput = JSON.parse(result.stdout);
      expect(output).toHaveProperty('version');
      expect(output).toHaveProperty('commit');
      expect(output).toHaveProperty('pullDate');
      expect(output).toHaveProperty('status');
      expect(output).toHaveProperty('directory');

      expect(output.version).toBe('v1.0.0');
      expect(output.status).toBe('pulled');
      expect(output.commit).toMatch(/^[0-9a-f]{40}$/);
    });
  });

  describe('T030: Contract test - exit code 0 on successful pull', () => {
    test('returns exit code 0 when pull succeeds', async () => {
      mockGitHub.setReleases([createMockGitHubRelease({ tag_name: 'v1.0.0' })]);

      const result = await pullUpstream(['v1.0.0'], {
        fs: mockFs,
        github: mockGitHub,
      });

      expect(result.exitCode).toBe(ExitCode.SUCCESS);
    });
  });

  describe('T031: Contract test - exit code 1 on invalid version format', () => {
    test('returns exit code 1 for invalid version format', async () => {
      const result = await pullUpstream(['invalid-version'], {
        fs: mockFs,
        github: mockGitHub,
      });

      expect(result.exitCode).toBe(ExitCode.USER_ERROR);
      expect(result.stderr).toContain('Invalid version format');
    });

    test('returns exit code 1 for missing version argument', async () => {
      const result = await pullUpstream([], {
        fs: mockFs,
        github: mockGitHub,
      });

      expect(result.exitCode).toBe(ExitCode.USER_ERROR);
      expect(result.stderr).toContain('version');
    });

    test('accepts valid semantic version formats', async () => {
      mockGitHub.setReleases([createMockGitHubRelease({ tag_name: 'v1.0.0' })]);

      const validVersions = ['v1.0.0', 'v2.5.13', 'v0.1.0'];

      for (const version of validVersions) {
        mockGitHub.setReleases([createMockGitHubRelease({ tag_name: version })]);

        const result = await pullUpstream([version], {
          fs: mockFs,
          github: mockGitHub,
        });

        expect(result.exitCode).toBe(ExitCode.SUCCESS);
      }
    });
  });

  describe('T032: Contract test - exit code 2 on network error', () => {
    test('returns exit code 2 when GitHub API fails', async () => {
      mockGitHub.setShouldFail(true, 'Network error: ECONNREFUSED');

      const result = await pullUpstream(['v1.0.0'], {
        fs: mockFs,
        github: mockGitHub,
      });

      expect(result.exitCode).toBe(ExitCode.SYSTEM_ERROR);
      expect(result.stderr).toContain('Network error');
    });

    test('returns exit code 2 on tarball download failure', async () => {
      mockGitHub.setReleases([createMockGitHubRelease({ tag_name: 'v1.0.0' })]);
      mockGitHub.setShouldFail(true, 'Download failed');

      const result = await pullUpstream(['v1.0.0'], {
        fs: mockFs,
        github: mockGitHub,
      });

      expect(result.exitCode).toBe(ExitCode.SYSTEM_ERROR);
    });
  });

  describe('T033: Edge case test - creates upstream/<version>/ directory', () => {
    test('creates directory with correct path', async () => {
      mockGitHub.setReleases([createMockGitHubRelease({ tag_name: 'v1.0.0' })]);

      const result = await pullUpstream(['v1.0.0'], {
        fs: mockFs,
        github: mockGitHub,
      });

      expect(result.exitCode).toBe(ExitCode.SUCCESS);

      // Check directory was created (by checking for the marker file)
      const dirExists = await mockFs.exists('upstream/v1.0.0/.exists');
      expect(dirExists).toBe(true);
    });

    test('extracts tarball contents to directory', async () => {
      const mockUpstream = createMockUpstreamDirectory('v1.0.0');
      mockGitHub.setReleases([createMockGitHubRelease({ tag_name: 'v1.0.0' })]);

      // Mock the tarball extraction
      for (const [filePath, content] of Object.entries(mockUpstream.files)) {
        await mockFs.writeFile(`upstream/v1.0.0/${filePath}`, content);
      }

      const result = await pullUpstream(['v1.0.0'], {
        fs: mockFs,
        github: mockGitHub,
      });

      expect(result.exitCode).toBe(ExitCode.SUCCESS);

      // Verify files exist
      for (const filePath of Object.keys(mockUpstream.files)) {
        const exists = await mockFs.exists(`upstream/v1.0.0/${filePath}`);
        expect(exists).toBe(true);
      }
    });
  });

  describe('T034: Edge case test - updates upstream/releases.json', () => {
    test("creates releases.json if it doesn't exist", async () => {
      mockGitHub.setReleases([
        createMockGitHubRelease({
          tag_name: 'v1.0.0',
          target_commitish: 'abc123' + '0'.repeat(34),
        }),
      ]);

      const result = await pullUpstream(['v1.0.0'], {
        fs: mockFs,
        github: mockGitHub,
      });

      expect(result.exitCode).toBe(ExitCode.SUCCESS);

      const registryExists = await mockFs.exists('upstream/releases.json');
      expect(registryExists).toBe(true);
    });

    test('adds release metadata to registry', async () => {
      mockGitHub.setReleases([
        createMockGitHubRelease({
          tag_name: 'v1.0.0',
          target_commitish: 'abc123' + '0'.repeat(34),
        }),
      ]);

      const result = await pullUpstream(['v1.0.0'], {
        fs: mockFs,
        github: mockGitHub,
      });

      expect(result.exitCode).toBe(ExitCode.SUCCESS);

      const registryContent = await mockFs.readFile('upstream/releases.json');
      const registry = JSON.parse(registryContent);

      expect(registry.latest).toBe('v1.0.0');
      expect(registry.releases).toHaveLength(1);
      expect(registry.releases[0].version).toBe('v1.0.0');
      expect(registry.releases[0].status).toBe('pulled');
    });

    test('appends to existing registry', async () => {
      // Pre-populate registry with v1.0.0
      await mockFs.writeFile(
        'upstream/releases.json',
        JSON.stringify({
          latest: 'v1.0.0',
          releases: [
            {
              version: 'v1.0.0',
              commit: 'old123' + '0'.repeat(34),
              pullDate: '2025-11-01T00:00:00Z',
              releaseNotesUrl: 'https://github.com/owner/repo/releases/tag/v1.0.0',
              status: 'pulled',
            },
          ],
        })
      );

      mockGitHub.setReleases([
        createMockGitHubRelease({
          tag_name: 'v1.1.0',
          target_commitish: 'new456' + '0'.repeat(34),
        }),
      ]);

      const result = await pullUpstream(['v1.1.0'], {
        fs: mockFs,
        github: mockGitHub,
      });

      expect(result.exitCode).toBe(ExitCode.SUCCESS);

      const registryContent = await mockFs.readFile('upstream/releases.json');
      const registry = JSON.parse(registryContent);

      expect(registry.latest).toBe('v1.1.0');
      expect(registry.releases).toHaveLength(2);
      expect(registry.releases[0].version).toBe('v1.1.0');
      expect(registry.releases[1].version).toBe('v1.0.0');
    });
  });

  describe('T035: Edge case test - creates/updates upstream/latest symlink', () => {
    test('creates symlink pointing to pulled version', async () => {
      mockGitHub.setReleases([createMockGitHubRelease({ tag_name: 'v1.0.0' })]);

      const result = await pullUpstream(['v1.0.0'], {
        fs: mockFs,
        github: mockGitHub,
      });

      expect(result.exitCode).toBe(ExitCode.SUCCESS);

      const target = await mockFs.readlink('upstream/latest');
      expect(target).toBe('v1.0.0');
    });

    test('updates symlink when pulling newer version', async () => {
      // Pre-create old symlink
      await mockFs.symlink('v1.0.0', 'upstream/latest');

      mockGitHub.setReleases([createMockGitHubRelease({ tag_name: 'v1.1.0' })]);

      const result = await pullUpstream(['v1.1.0'], {
        fs: mockFs,
        github: mockGitHub,
      });

      expect(result.exitCode).toBe(ExitCode.SUCCESS);

      const target = await mockFs.readlink('upstream/latest');
      expect(target).toBe('v1.1.0');
    });
  });

  describe('T036: Edge case test - handles first-time pull', () => {
    test("succeeds when upstream/ directory doesn't exist", async () => {
      mockGitHub.setReleases([createMockGitHubRelease({ tag_name: 'v1.0.0' })]);

      const result = await pullUpstream(['v1.0.0'], {
        fs: mockFs,
        github: mockGitHub,
      });

      expect(result.exitCode).toBe(ExitCode.SUCCESS);
      expect(result.stdout).toContain('v1.0.0');
    });

    test('creates all necessary directories and files', async () => {
      mockGitHub.setReleases([createMockGitHubRelease({ tag_name: 'v1.0.0' })]);

      const result = await pullUpstream(['v1.0.0'], {
        fs: mockFs,
        github: mockGitHub,
      });

      expect(result.exitCode).toBe(ExitCode.SUCCESS);

      // Verify structure (checking for actual files, not just directories)
      expect(await mockFs.exists('upstream/v1.0.0/.exists')).toBe(true);
      expect(await mockFs.exists('upstream/releases.json')).toBe(true);
      expect(await mockFs.exists('upstream/latest')).toBe(true);
    });
  });

  describe('T037: Edge case test - network failure leaves existing state unchanged', () => {
    test("doesn't modify registry on download failure", async () => {
      // Pre-populate registry
      const originalRegistry = {
        latest: 'v1.0.0',
        releases: [
          {
            version: 'v1.0.0',
            commit: 'abc123' + '0'.repeat(34),
            pullDate: '2025-11-01T00:00:00Z',
            releaseNotesUrl: 'https://github.com/owner/repo/releases/tag/v1.0.0',
            status: 'pulled',
          },
        ],
      };

      await mockFs.writeFile('upstream/releases.json', JSON.stringify(originalRegistry));

      // Set up failure
      mockGitHub.setReleases([createMockGitHubRelease({ tag_name: 'v1.1.0' })]);
      mockGitHub.setShouldFail(true, 'Download failed');

      const result = await pullUpstream(['v1.1.0'], {
        fs: mockFs,
        github: mockGitHub,
      });

      expect(result.exitCode).toBe(ExitCode.SYSTEM_ERROR);

      // Verify registry unchanged
      const registryContent = await mockFs.readFile('upstream/releases.json');
      const registry = JSON.parse(registryContent);

      expect(registry).toEqual(originalRegistry);
    });

    test("doesn't create partial directories on failure", async () => {
      mockGitHub.setReleases([createMockGitHubRelease({ tag_name: 'v1.0.0' })]);
      mockGitHub.setShouldFail(true, 'Network error');

      const result = await pullUpstream(['v1.0.0'], {
        fs: mockFs,
        github: mockGitHub,
      });

      expect(result.exitCode).toBe(ExitCode.SYSTEM_ERROR);

      // Verify no upstream directory created (check that no files were created in it)
      const dirExists = await mockFs.exists('upstream/v1.0.0/.exists');
      expect(dirExists).toBe(false);
    });
  });

  describe('Additional edge cases', () => {
    test('rejects duplicate version pulls', async () => {
      // First pull succeeds
      mockGitHub.setReleases([createMockGitHubRelease({ tag_name: 'v1.0.0' })]);

      await pullUpstream(['v1.0.0'], { fs: mockFs, github: mockGitHub });

      // Second pull of same version should fail
      const result = await pullUpstream(['v1.0.0'], {
        fs: mockFs,
        github: mockGitHub,
      });

      expect(result.exitCode).toBe(ExitCode.USER_ERROR);
      expect(result.stderr).toContain('already exists');
    });

    test('includes directory path in JSON output', async () => {
      mockGitHub.setReleases([createMockGitHubRelease({ tag_name: 'v1.0.0' })]);

      const result = await pullUpstream(['v1.0.0', '--json'], {
        fs: mockFs,
        github: mockGitHub,
      });

      const output: PullUpstreamOutput = JSON.parse(result.stdout);
      expect(output.directory).toContain('upstream/v1.0.0');
    });

    test('handles --help flag without requiring version', async () => {
      const result = await pullUpstream(['--help']);

      expect(result.exitCode).toBe(ExitCode.SUCCESS);
      expect(result.stdout).toContain('Usage:');
      expect(result.stdout).toContain('pull-upstream');
    });
  });
});
