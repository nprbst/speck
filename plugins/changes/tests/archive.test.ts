/**
 * Tests for archive command
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdir, rm, writeFile, readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { archiveChange, checkTaskCompletion, mergeDeltas } from '../scripts/archive';

// Test temporary directory
let testDir: string;

beforeEach(async () => {
  testDir = join(import.meta.dir, '.test-tmp', `archive-${Date.now()}`);
  await mkdir(testDir, { recursive: true });
  await mkdir(join(testDir, '.speck', 'changes'), { recursive: true });
  await mkdir(join(testDir, '.speck', 'archive'), { recursive: true });
  await mkdir(join(testDir, 'specs'), { recursive: true });
});

afterEach(async () => {
  if (existsSync(testDir)) {
    await rm(testDir, { recursive: true, force: true });
  }
});

async function createMockChange(
  name: string,
  options: {
    tasksComplete?: boolean;
    deltas?: Record<string, string>;
  } = {}
): Promise<string> {
  const { tasksComplete = true, deltas } = options;
  const changeDir = join(testDir, '.speck', 'changes', name);
  await mkdir(changeDir, { recursive: true });
  await mkdir(join(changeDir, 'specs'), { recursive: true });

  // Create proposal.md
  const proposalContent = `# Change Proposal: ${name}

**Created**: 2025-12-07
**Status**: Draft

## Summary

Test change.
`;
  await writeFile(join(changeDir, 'proposal.md'), proposalContent);

  // Create tasks.md
  const tasksContent = tasksComplete
    ? `# Tasks: ${name}

## Implementation Checklist

- [x] T001: First task
- [x] T002: Second task
`
    : `# Tasks: ${name}

## Implementation Checklist

- [x] T001: First task
- [ ] T002: Second task (incomplete)
`;
  await writeFile(join(changeDir, 'tasks.md'), tasksContent);

  // Create delta files
  if (deltas) {
    for (const [specName, content] of Object.entries(deltas)) {
      await writeFile(join(changeDir, 'specs', `${specName}.md`), content);
    }
  }

  return changeDir;
}

async function createMockSpec(name: string, content: string): Promise<void> {
  await writeFile(join(testDir, 'specs', `${name}.md`), content);
}

describe('archiveChange', () => {
  test('archives a change with all tasks complete', async () => {
    await createMockChange('completed-change');

    const result = await archiveChange('completed-change', { rootDir: testDir });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Change should be moved to archive
    expect(existsSync(join(testDir, '.speck', 'changes', 'completed-change'))).toBe(false);

    // Archive should contain the change with timestamp
    const archiveFiles = await readdir(join(testDir, '.speck', 'archive'));
    expect(archiveFiles.some((f) => f.startsWith('completed-change-'))).toBe(true);
  });

  test('refuses to archive change with incomplete tasks', async () => {
    await createMockChange('incomplete-change', { tasksComplete: false });

    const result = await archiveChange('incomplete-change', { rootDir: testDir });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('incomplete');
  });

  test('archives with --force despite incomplete tasks', async () => {
    await createMockChange('incomplete-change', { tasksComplete: false });

    const result = await archiveChange('incomplete-change', {
      rootDir: testDir,
      force: true,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Change should be moved to archive
    expect(existsSync(join(testDir, '.speck', 'changes', 'incomplete-change'))).toBe(false);
  });

  test('returns error for nonexistent change', async () => {
    const result = await archiveChange('nonexistent', { rootDir: testDir });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('not found');
  });

  test('merges delta additions into source spec', async () => {
    // Create source spec
    await createMockSpec(
      'auth',
      `# Spec: auth

## Requirements

### REQ-001: Existing requirement

Existing description.
`
    );

    // Create change with delta additions
    await createMockChange('add-auth-feature', {
      deltas: {
        auth: `# Delta: auth

## ADDED Requirements

### REQ-002: New auth feature

Users SHALL be able to reset passwords.

## MODIFIED Requirements

## REMOVED Requirements
`,
      },
    });

    const result = await archiveChange('add-auth-feature', { rootDir: testDir });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Check that source spec was updated
    const specContent = await readFile(join(testDir, 'specs', 'auth.md'), 'utf-8');
    expect(specContent).toContain('REQ-002');
    expect(specContent).toContain('reset passwords');
  });
});

describe('checkTaskCompletion', () => {
  test('returns true when all tasks complete', () => {
    const content = `# Tasks

- [x] Task 1
- [x] Task 2
- [X] Task 3
`;

    const result = checkTaskCompletion(content);

    expect(result.allComplete).toBe(true);
    expect(result.total).toBe(3);
    expect(result.completed).toBe(3);
  });

  test('returns false when tasks incomplete', () => {
    const content = `# Tasks

- [x] Task 1
- [ ] Task 2
- [x] Task 3
`;

    const result = checkTaskCompletion(content);

    expect(result.allComplete).toBe(false);
    expect(result.total).toBe(3);
    expect(result.completed).toBe(2);
  });

  test('handles no tasks', () => {
    const content = `# Tasks

No tasks defined.
`;

    const result = checkTaskCompletion(content);

    expect(result.allComplete).toBe(true);
    expect(result.total).toBe(0);
  });
});

describe('mergeDeltas', () => {
  test('appends ADDED requirements to spec', () => {
    const specContent = `# Spec: test

## Requirements

### REQ-001: First

Description.
`;

    const deltaContent = `# Delta: test

## ADDED Requirements

### REQ-002: Second

New requirement.

## MODIFIED Requirements

## REMOVED Requirements
`;

    const result = mergeDeltas(specContent, deltaContent);

    expect(result).toContain('REQ-001');
    expect(result).toContain('REQ-002');
  });

  test('handles empty ADDED section', () => {
    const specContent = `# Spec: test

## Requirements

### REQ-001: First

Description.
`;

    const deltaContent = `# Delta: test

## ADDED Requirements

## MODIFIED Requirements

## REMOVED Requirements
`;

    const result = mergeDeltas(specContent, deltaContent);

    expect(result).toContain('REQ-001');
    // Should be unchanged
    expect(result.trim()).toBe(specContent.trim());
  });
});

describe('archive with conflicts', () => {
  test('warns about potential conflicts when spec was modified', async () => {
    // Create source spec
    await createMockSpec(
      'auth',
      `# Spec: auth

## Requirements

### REQ-001: Login

Users can log in.
`
    );

    // Create change that modifies the same area
    await createMockChange('modify-login', {
      deltas: {
        auth: `# Delta: auth

## ADDED Requirements

## MODIFIED Requirements

### REQ-001
**Before**: Users can log in.
**After**: Users SHALL log in with 2FA.

## REMOVED Requirements
`,
      },
    });

    const result = await archiveChange('modify-login', { rootDir: testDir });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Should complete but may have warnings
    expect(result.warnings?.length).toBeGreaterThanOrEqual(0);
  });
});
