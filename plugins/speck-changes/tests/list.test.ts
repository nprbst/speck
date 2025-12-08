/**
 * Tests for list command
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { listChanges, formatChangesList, formatChangesJson } from '../scripts/list';

// Test temporary directory
let testDir: string;

beforeEach(async () => {
  testDir = join(import.meta.dir, '.test-tmp', `list-${Date.now()}`);
  await mkdir(testDir, { recursive: true });
  await mkdir(join(testDir, '.speck', 'changes'), { recursive: true });
  await mkdir(join(testDir, '.speck', 'archive'), { recursive: true });
});

afterEach(async () => {
  if (existsSync(testDir)) {
    await rm(testDir, { recursive: true, force: true });
  }
});

async function createMockChange(
  name: string,
  location: 'active' | 'archived' = 'active'
): Promise<void> {
  const baseDir = location === 'active' ? '.speck/changes' : '.speck/archive';
  const changeDir = join(testDir, baseDir, name);
  await mkdir(changeDir, { recursive: true });

  // Create proposal.md with basic content
  const proposalContent = `# Change Proposal: ${name}

**Created**: 2025-12-07
**Status**: Draft

## Summary

Test proposal for ${name}.
`;
  await writeFile(join(changeDir, 'proposal.md'), proposalContent);

  // Create tasks.md with some tasks
  const tasksContent = `# Tasks: ${name}

## Implementation Checklist

- [ ] T001: First task
- [x] T002: Second task (done)
- [ ] T003: Third task
`;
  await writeFile(join(changeDir, 'tasks.md'), tasksContent);
}

describe('listChanges', () => {
  test('lists active changes', async () => {
    await createMockChange('feature-a');
    await createMockChange('feature-b');

    const result = await listChanges({ rootDir: testDir });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.changes).toHaveLength(2);
    expect(result.changes.some((c) => c.name === 'feature-a')).toBe(true);
    expect(result.changes.some((c) => c.name === 'feature-b')).toBe(true);
  });

  test('includes archived changes when requested', async () => {
    await createMockChange('active-change', 'active');
    await createMockChange('archived-change', 'archived');

    const result = await listChanges({ rootDir: testDir, includeArchived: true });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.changes).toHaveLength(2);
    expect(result.changes.some((c) => c.location === 'active')).toBe(true);
    expect(result.changes.some((c) => c.location === 'archived')).toBe(true);
  });

  test('excludes archived changes by default', async () => {
    await createMockChange('active-change', 'active');
    await createMockChange('archived-change', 'archived');

    const result = await listChanges({ rootDir: testDir });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.changes).toHaveLength(1);
    expect(result.changes[0]?.name).toBe('active-change');
  });

  test('returns task progress for each change', async () => {
    await createMockChange('feature-with-tasks');

    const result = await listChanges({ rootDir: testDir });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const change = result.changes[0];
    expect(change?.taskProgress).toBeDefined();
    expect(change?.taskProgress.total).toBe(3);
    expect(change?.taskProgress.completed).toBe(1);
  });

  test('returns empty array when no changes exist', async () => {
    const result = await listChanges({ rootDir: testDir });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.changes).toHaveLength(0);
  });
});

describe('formatChangesList', () => {
  test('formats changes as markdown table', () => {
    const changes = [
      {
        name: 'feature-a',
        location: 'active' as const,
        createdAt: '2025-12-07',
        taskProgress: { total: 5, completed: 2 },
      },
      {
        name: 'feature-b',
        location: 'active' as const,
        createdAt: '2025-12-06',
        taskProgress: { total: 3, completed: 3 },
      },
    ];

    const output = formatChangesList(changes);

    expect(output).toContain('feature-a');
    expect(output).toContain('feature-b');
    expect(output).toContain('2/5');
    expect(output).toContain('3/3');
  });

  test('shows message when no changes', () => {
    const output = formatChangesList([]);

    expect(output).toContain('No active');
  });

  test('indicates archived changes', () => {
    const changes = [
      {
        name: 'old-feature',
        location: 'archived' as const,
        createdAt: '2025-12-01',
        taskProgress: { total: 4, completed: 4 },
      },
    ];

    const output = formatChangesList(changes);

    expect(output).toContain('archived');
  });
});

describe('formatChangesJson', () => {
  test('formats as valid JSON', () => {
    const changes = [
      {
        name: 'feature-a',
        location: 'active' as const,
        createdAt: '2025-12-07',
        taskProgress: { total: 5, completed: 2 },
      },
    ];

    const output = formatChangesJson(changes);
    const parsed = JSON.parse(output);

    expect(parsed.ok).toBe(true);
    expect(parsed.changes).toHaveLength(1);
    expect(parsed.changes[0].name).toBe('feature-a');
  });
});
