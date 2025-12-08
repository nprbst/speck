/**
 * Tests for show command
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { showChange, formatChangeDetails, formatChangeJson } from '../scripts/show';

// Test temporary directory
let testDir: string;

beforeEach(async () => {
  testDir = join(import.meta.dir, '.test-tmp', `show-${Date.now()}`);
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
    withDesign?: boolean;
    withDelta?: boolean;
    location?: 'active' | 'archived';
  } = {}
): Promise<void> {
  const { withDesign = false, withDelta = false, location = 'active' } = options;
  const baseDir = location === 'active' ? '.speck/changes' : '.speck/archive';
  const changeDir = join(testDir, baseDir, name);
  await mkdir(changeDir, { recursive: true });
  await mkdir(join(changeDir, 'specs'), { recursive: true });

  // Create proposal.md
  const proposalContent = `# Change Proposal: ${name}

**Created**: 2025-12-07
**Status**: Draft

## Summary

This is a test proposal for ${name}.

## Rationale

Testing the show command.

## Scope

- [ ] Test module

## Expected Outcome

Tests pass.
`;
  await writeFile(join(changeDir, 'proposal.md'), proposalContent);

  // Create tasks.md
  const tasksContent = `# Tasks: ${name}

## Implementation Checklist

- [ ] T001: First task
- [x] T002: Second task (done)
- [ ] T003: Third task
`;
  await writeFile(join(changeDir, 'tasks.md'), tasksContent);

  if (withDesign) {
    const designContent = `# Design: ${name}

## Overview

Technical design for ${name}.
`;
    await writeFile(join(changeDir, 'design.md'), designContent);
  }

  if (withDelta) {
    const deltaContent = `# Delta: test-spec

## ADDED Requirements

### REQ-001: Test Requirement

Test requirement description.

#### Scenario: Test

- **Given**: A test condition
- **When**: Something happens
- **Then**: Expected outcome
`;
    await writeFile(join(changeDir, 'specs', 'test-spec.md'), deltaContent);
  }
}

describe('showChange', () => {
  test('shows change details', async () => {
    await createMockChange('feature-a');

    const result = await showChange('feature-a', { rootDir: testDir });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.change.name).toBe('feature-a');
    expect(result.change.location).toBe('active');
    expect(result.change.createdAt).toBe('2025-12-07');
  });

  test('returns task progress', async () => {
    await createMockChange('feature-a');

    const result = await showChange('feature-a', { rootDir: testDir });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.change.taskProgress.total).toBe(3);
    expect(result.change.taskProgress.completed).toBe(1);
  });

  test('includes summary from proposal', async () => {
    await createMockChange('feature-a');

    const result = await showChange('feature-a', { rootDir: testDir });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.change.summary).toContain('test proposal');
  });

  test('indicates design.md presence', async () => {
    await createMockChange('with-design', { withDesign: true });

    const result = await showChange('with-design', { rootDir: testDir });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.change.hasDesign).toBe(true);
  });

  test('lists delta files', async () => {
    await createMockChange('with-delta', { withDelta: true });

    const result = await showChange('with-delta', { rootDir: testDir });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.change.deltaFiles).toHaveLength(1);
    expect(result.change.deltaFiles[0]).toBe('test-spec.md');
  });

  test('finds archived changes', async () => {
    await createMockChange('archived-feature', { location: 'archived' });

    const result = await showChange('archived-feature', { rootDir: testDir });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.change.location).toBe('archived');
  });

  test('returns error for nonexistent change', async () => {
    const result = await showChange('nonexistent', { rootDir: testDir });

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error).toContain('not found');
  });
});

describe('formatChangeDetails', () => {
  test('formats change as markdown', () => {
    const change = {
      name: 'feature-a',
      location: 'active' as const,
      createdAt: '2025-12-07',
      summary: 'A test feature',
      taskProgress: { total: 5, completed: 2 },
      hasDesign: true,
      deltaFiles: ['auth.md', 'user.md'],
    };

    const output = formatChangeDetails(change);

    expect(output).toContain('feature-a');
    expect(output).toContain('2025-12-07');
    expect(output).toContain('2/5');
    expect(output).toContain('auth.md');
    expect(output).toContain('user.md');
  });
});

describe('formatChangeJson', () => {
  test('formats as valid JSON', () => {
    const change = {
      name: 'feature-a',
      location: 'active' as const,
      createdAt: '2025-12-07',
      summary: 'A test feature',
      taskProgress: { total: 5, completed: 2 },
      hasDesign: false,
      deltaFiles: [],
    };

    const output = formatChangeJson(change);
    const parsed = JSON.parse(output);

    expect(parsed.ok).toBe(true);
    expect(parsed.change.name).toBe('feature-a');
  });
});
