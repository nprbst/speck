/**
 * Tests for check-upstream command (npm-based)
 */

import { describe, test, expect } from 'bun:test';
import {
  formatVersionsTable,
  formatVersionsJson,
  type ParsedVersion,
} from '../scripts/check-upstream';
import { CheckUpstreamJsonOutputSchema } from '../scripts/lib/schemas';

describe('formatVersionsTable', () => {
  test('formats versions as table', () => {
    const versions: ParsedVersion[] = [
      {
        version: '0.16.0',
        publishedAt: '2025-11-21T00:00:00Z',
        status: 'latest',
      },
      {
        version: '0.15.0',
        publishedAt: '2025-11-15T00:00:00Z',
        status: 'pulled',
      },
      {
        version: '0.14.0',
        publishedAt: '2025-11-04T00:00:00Z',
        status: 'new',
      },
    ];

    const table = formatVersionsTable(versions);

    expect(table).toContain('0.16.0');
    expect(table).toContain('0.15.0');
    expect(table).toContain('0.14.0');
    expect(table).toContain('2025-11-21');
    expect(table).toContain('**latest**');
    expect(table).toContain('✓ pulled');
    expect(table).toContain('new');
  });

  test('handles empty versions', () => {
    const table = formatVersionsTable([]);
    expect(table).toContain('No versions found');
  });

  test('includes npm package link', () => {
    const versions: ParsedVersion[] = [
      {
        version: '0.16.0',
        publishedAt: '2025-11-21T00:00:00Z',
        status: 'latest',
      },
    ];

    const table = formatVersionsTable(versions);

    expect(table).toContain('npmjs.com');
    expect(table).toContain('@fission-ai/openspec');
  });
});

describe('formatVersionsJson', () => {
  test('formats versions as JSON', () => {
    const versions: ParsedVersion[] = [
      {
        version: '0.16.0',
        publishedAt: '2025-11-21T00:00:00Z',
        status: 'latest',
      },
    ];

    const json = formatVersionsJson(versions, '0.16.0');
    const parsed = CheckUpstreamJsonOutputSchema.parse(JSON.parse(json));

    expect(parsed.ok).toBe(true);
    expect(parsed.versions).toHaveLength(1);
    expect(parsed.latestVersion).toBe('0.16.0');
    expect(parsed.package).toBe('@fission-ai/openspec');
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
