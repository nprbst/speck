/**
 * Tests for apply command
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdir, rm, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  applyChange,
  parseTasks,
  markTaskComplete,
  checkAllTasksComplete,
  loadDeltaContext,
  formatApplyResult,
  type Task,
} from '../scripts/apply';

// Test temporary directory
let testDir: string;

beforeEach(async () => {
  testDir = join(import.meta.dir, '.test-tmp', `apply-${Date.now()}`);
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
  options: {
    tasks?: string;
    withDelta?: boolean;
    allComplete?: boolean;
  } = {}
): Promise<void> {
  const { tasks, withDelta = false, allComplete = false } = options;
  const changeDir = join(testDir, '.speck', 'changes', name);
  await mkdir(changeDir, { recursive: true });
  await mkdir(join(changeDir, 'specs'), { recursive: true });

  // Create proposal.md
  const proposalContent = `# Change Proposal: ${name}

**Created**: 2025-12-07
**Status**: Draft

## Summary

This is a test proposal for ${name}.

## Rationale

Testing the apply command.

## Scope

- Test module

## Expected Outcome

Tests pass.
`;
  await writeFile(join(changeDir, 'proposal.md'), proposalContent);

  // Create tasks.md
  const defaultTasks = allComplete
    ? `# Tasks: ${name}

## Implementation Checklist

- [x] T001: First task
- [x] T002: Second task
- [x] T003: Third task
`
    : `# Tasks: ${name}

## Implementation Checklist

- [ ] T001: First task
- [x] T002: Second task (done)
- [ ] T003: Third task
`;
  await writeFile(join(changeDir, 'tasks.md'), tasks ?? defaultTasks);

  if (withDelta) {
    const deltaContent = `# Delta: test-spec

## ADDED Requirements

### FR-001: Test Requirement

Test requirement description.

#### Scenario: Test scenario

- **Given**: A test condition
- **When**: Something happens
- **Then**: Expected outcome

## MODIFIED Requirements

## REMOVED Requirements
`;
    await writeFile(join(changeDir, 'specs', 'test-spec.md'), deltaContent);
  }
}

describe('parseTasks', () => {
  test('parses tasks from markdown content', () => {
    const content = `# Tasks

## Implementation Checklist

- [ ] T001: First task
- [x] T002: Second task (done)
- [ ] T003: Third task
`;
    const result = parseTasks(content);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.tasks).toHaveLength(3);
    expect(result.tasks[0]).toEqual({
      id: 'T001',
      description: 'First task',
      status: 'pending',
      line: 5,
    });
    expect(result.tasks[1]).toEqual({
      id: 'T002',
      description: 'Second task (done)',
      status: 'completed',
      line: 6,
    });
    expect(result.tasks[2]).toEqual({
      id: 'T003',
      description: 'Third task',
      status: 'pending',
      line: 7,
    });
  });

  test('handles different ID formats', () => {
    const content = `# Tasks

- [ ] T001-TEST: Test task
- [ ] TASK-123: Another format
- [ ] Simple task without ID
`;
    const result = parseTasks(content);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.tasks).toHaveLength(3);
    expect(result.tasks[0]?.id).toBe('T001-TEST');
    expect(result.tasks[1]?.id).toBe('TASK-123');
    expect(result.tasks[2]?.id).toMatch(/^TASK-\d+$/); // Auto-generated ID
  });

  test('parses uppercase and lowercase checkmarks', () => {
    const content = `
- [x] T001: Lowercase done
- [X] T002: Uppercase done
- [ ] T003: Pending
`;
    const result = parseTasks(content);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.tasks[0]?.status).toBe('completed');
    expect(result.tasks[1]?.status).toBe('completed');
    expect(result.tasks[2]?.status).toBe('pending');
  });

  test('returns error for empty content', () => {
    const result = parseTasks('');

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error).toContain('No tasks found');
  });
});

describe('markTaskComplete', () => {
  test('marks a pending task as complete', async () => {
    await createMockChange('test-change');
    const tasksPath = join(testDir, '.speck', 'changes', 'test-change', 'tasks.md');

    const result = await markTaskComplete('T001', tasksPath);

    expect(result.ok).toBe(true);

    const content = await readFile(tasksPath, 'utf-8');
    expect(content).toContain('- [x] T001:');
    expect(content).not.toContain('- [ ] T001:');
  });

  test('returns error for already completed task', async () => {
    await createMockChange('test-change');
    const tasksPath = join(testDir, '.speck', 'changes', 'test-change', 'tasks.md');

    const result = await markTaskComplete('T002', tasksPath);

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error).toContain('already complete');
  });

  test('returns error for nonexistent task', async () => {
    await createMockChange('test-change');
    const tasksPath = join(testDir, '.speck', 'changes', 'test-change', 'tasks.md');

    const result = await markTaskComplete('T999', tasksPath);

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error).toContain('not found');
  });
});

describe('checkAllTasksComplete', () => {
  test('returns false when tasks are pending', () => {
    const tasks: Task[] = [
      { id: 'T001', description: 'First', status: 'pending', line: 1 },
      { id: 'T002', description: 'Second', status: 'completed', line: 2 },
    ];

    const result = checkAllTasksComplete(tasks);

    expect(result.allComplete).toBe(false);
    expect(result.total).toBe(2);
    expect(result.completed).toBe(1);
    expect(result.pending).toBe(1);
  });

  test('returns true when all tasks are complete', () => {
    const tasks: Task[] = [
      { id: 'T001', description: 'First', status: 'completed', line: 1 },
      { id: 'T002', description: 'Second', status: 'completed', line: 2 },
    ];

    const result = checkAllTasksComplete(tasks);

    expect(result.allComplete).toBe(true);
    expect(result.total).toBe(2);
    expect(result.completed).toBe(2);
    expect(result.pending).toBe(0);
  });

  test('returns true for empty task list', () => {
    const result = checkAllTasksComplete([]);

    expect(result.allComplete).toBe(true);
    expect(result.total).toBe(0);
  });
});

describe('loadDeltaContext', () => {
  test('loads delta files from change folder', async () => {
    await createMockChange('test-change', { withDelta: true });

    const result = await loadDeltaContext('test-change', { rootDir: testDir });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.deltas).toHaveLength(1);
    expect(result.deltas[0]?.specName).toBe('test-spec');
    expect(result.deltas[0]?.content).toContain('FR-001');
  });

  test('returns empty array when no delta files', async () => {
    await createMockChange('test-change');

    const result = await loadDeltaContext('test-change', { rootDir: testDir });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.deltas).toHaveLength(0);
  });

  test('returns error for nonexistent change', async () => {
    const result = await loadDeltaContext('nonexistent', { rootDir: testDir });

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error).toContain('not found');
  });
});

describe('applyChange', () => {
  test('loads change and returns task summary', async () => {
    await createMockChange('feature-a');

    const result = await applyChange('feature-a', { rootDir: testDir });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.name).toBe('feature-a');
    expect(result.tasks).toHaveLength(3);
    expect(result.progress.total).toBe(3);
    expect(result.progress.completed).toBe(1);
    expect(result.progress.pending).toBe(2);
    expect(result.allComplete).toBe(false);
  });

  test('loads delta context when available', async () => {
    await createMockChange('feature-a', { withDelta: true });

    const result = await applyChange('feature-a', { rootDir: testDir });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.deltas).toHaveLength(1);
    expect(result.deltas[0]?.specName).toBe('test-spec');
  });

  test('suggests archive when all tasks complete', async () => {
    await createMockChange('feature-a', { allComplete: true });

    const result = await applyChange('feature-a', { rootDir: testDir });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.allComplete).toBe(true);
    expect(result.suggestArchive).toBe(true);
  });

  test('returns error for nonexistent change', async () => {
    const result = await applyChange('nonexistent', { rootDir: testDir });

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error).toContain('not found');
  });
});

describe('formatApplyResult', () => {
  test('formats pending tasks summary', () => {
    const output = formatApplyResult({
      ok: true,
      name: 'feature-a',
      tasks: [
        { id: 'T001', description: 'First task', status: 'pending', line: 1 },
        { id: 'T002', description: 'Second task', status: 'completed', line: 2 },
        { id: 'T003', description: 'Third task', status: 'pending', line: 3 },
      ],
      progress: { total: 3, completed: 1, pending: 2, allComplete: false },
      allComplete: false,
      suggestArchive: false,
      deltas: [],
    });

    expect(output).toContain('feature-a');
    expect(output).toContain('1/3');
    expect(output).toContain('T001');
    expect(output).toContain('T003');
    expect(output).not.toContain('archive');
  });

  test('shows archive suggestion when complete', () => {
    const output = formatApplyResult({
      ok: true,
      name: 'feature-a',
      tasks: [{ id: 'T001', description: 'Done', status: 'completed', line: 1 }],
      progress: { total: 1, completed: 1, pending: 0, allComplete: true },
      allComplete: true,
      suggestArchive: true,
      deltas: [],
    });

    expect(output).toContain('All tasks complete');
    expect(output).toContain('/speck-changes.archive');
  });

  test('includes delta context summary', () => {
    const output = formatApplyResult({
      ok: true,
      name: 'feature-a',
      tasks: [{ id: 'T001', description: 'Task', status: 'pending', line: 1 }],
      progress: { total: 1, completed: 0, pending: 1, allComplete: false },
      allComplete: false,
      suggestArchive: false,
      deltas: [{ specName: 'auth-spec', content: 'delta content' }],
    });

    expect(output).toContain('Delta Context');
    expect(output).toContain('auth-spec');
  });
});
