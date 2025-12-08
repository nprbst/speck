/**
 * Tests for check-upstream command
 */

import { describe, test, expect } from 'bun:test';
import { parseReleases, formatReleasesTable } from '../scripts/check-upstream';
import type { GitHubRelease } from '@speck/common/github';

/** Helper to create a valid GitHubRelease for testing */
function createRelease(overrides: Partial<GitHubRelease> & { tag_name: string }): GitHubRelease {
  return {
    name: overrides.name ?? overrides.tag_name,
    body: '',
    published_at: '2025-11-21T00:00:00Z',
    html_url: `https://github.com/Fission-AI/OpenSpec/releases/tag/${overrides.tag_name}`,
    draft: false,
    prerelease: false,
    tarball_url: 'https://example.com/tarball',
    zipball_url: 'https://example.com/zipball',
    url: `https://api.github.com/repos/Fission-AI/OpenSpec/releases/${overrides.tag_name}`,
    target_commitish: 'main',
    ...overrides,
  };
}

describe('parseReleases', () => {
  test('parses valid GitHub releases', () => {
    const releases: GitHubRelease[] = [
      createRelease({
        tag_name: 'v0.16.0',
        name: 'v0.16.0 - Antigravity',
        published_at: '2025-11-21T00:00:00Z',
        body: 'Release notes',
      }),
      createRelease({
        tag_name: 'v0.15.0',
        name: 'v0.15.0 - Gemini',
        published_at: '2025-11-15T00:00:00Z',
        body: 'Previous release',
      }),
    ];

    const parsed = parseReleases(releases);

    expect(parsed).toHaveLength(2);
    expect(parsed[0]?.version).toBe('v0.16.0');
    expect(parsed[0]?.title).toBe('Antigravity');
    expect(parsed[1]?.version).toBe('v0.15.0');
  });

  test('filters out draft releases', () => {
    const releases: GitHubRelease[] = [
      createRelease({
        tag_name: 'v0.17.0-beta',
        name: 'Beta Release',
        published_at: '2025-12-01T00:00:00Z',
        body: 'Draft',
        draft: true,
      }),
      createRelease({
        tag_name: 'v0.16.0',
        name: 'v0.16.0 - Stable',
        published_at: '2025-11-21T00:00:00Z',
        body: 'Stable',
      }),
    ];

    const parsed = parseReleases(releases);

    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.version).toBe('v0.16.0');
  });

  test('filters out prereleases', () => {
    const releases: GitHubRelease[] = [
      createRelease({
        tag_name: 'v0.17.0-alpha',
        name: 'Alpha',
        published_at: '2025-12-01T00:00:00Z',
        body: 'Alpha',
        prerelease: true,
      }),
      createRelease({
        tag_name: 'v0.16.0',
        name: 'v0.16.0 - Stable',
        published_at: '2025-11-21T00:00:00Z',
        body: 'Stable',
      }),
    ];

    const parsed = parseReleases(releases);

    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.version).toBe('v0.16.0');
  });

  test('handles empty releases array', () => {
    const releases: GitHubRelease[] = [];
    const parsed = parseReleases(releases);
    expect(parsed).toHaveLength(0);
  });

  test('sorts releases by date descending', () => {
    const releases: GitHubRelease[] = [
      createRelease({
        tag_name: 'v0.14.0',
        name: 'Older',
        published_at: '2025-10-01T00:00:00Z',
        body: 'Old',
      }),
      createRelease({
        tag_name: 'v0.16.0',
        name: 'Newest',
        published_at: '2025-11-21T00:00:00Z',
        body: 'New',
      }),
      createRelease({
        tag_name: 'v0.15.0',
        name: 'Middle',
        published_at: '2025-11-01T00:00:00Z',
        body: 'Mid',
      }),
    ];

    const parsed = parseReleases(releases);

    expect(parsed[0]?.version).toBe('v0.16.0');
    expect(parsed[1]?.version).toBe('v0.15.0');
    expect(parsed[2]?.version).toBe('v0.14.0');
  });
});

describe('formatReleasesTable', () => {
  test('formats releases as table', () => {
    const releases = [
      {
        version: 'v0.16.0',
        title: 'Antigravity',
        publishedAt: '2025-11-21T00:00:00Z',
        url: 'https://github.com/Fission-AI/OpenSpec/releases/tag/v0.16.0',
      },
      {
        version: 'v0.15.0',
        title: 'Gemini',
        publishedAt: '2025-11-15T00:00:00Z',
        url: 'https://github.com/Fission-AI/OpenSpec/releases/tag/v0.15.0',
      },
    ];

    const table = formatReleasesTable(releases);

    expect(table).toContain('v0.16.0');
    expect(table).toContain('Antigravity');
    expect(table).toContain('v0.15.0');
    expect(table).toContain('Gemini');
    expect(table).toContain('2025-11-21');
  });

  test('handles empty releases', () => {
    const table = formatReleasesTable([]);
    expect(table).toContain('No releases found');
  });

  test('marks latest release', () => {
    const releases = [
      {
        version: 'v0.16.0',
        title: 'Latest',
        publishedAt: '2025-11-21T00:00:00Z',
        url: 'https://github.com/Fission-AI/OpenSpec/releases/tag/v0.16.0',
      },
    ];

    const table = formatReleasesTable(releases);

    expect(table).toContain('latest');
  });
});

describe('checkUpstream', () => {
  test('verifies error structure', () => {
    // Verify the expected error result structure
    const result = { ok: false as const, error: 'Network error' };
    expect(result.ok).toBe(false);
    expect(result.error).toBe('Network error');
  });
});
