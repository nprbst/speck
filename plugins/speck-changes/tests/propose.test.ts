/**
 * Tests for propose command
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdir, rm, readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { propose, validateChangeName, changeExists } from '../scripts/propose';

// Test temporary directory
let testDir: string;

beforeEach(async () => {
  testDir = join(import.meta.dir, '.test-tmp', `propose-${Date.now()}`);
  await mkdir(testDir, { recursive: true });
  await mkdir(join(testDir, '.speck', 'changes'), { recursive: true });
  await mkdir(join(testDir, '.speck', 'archive'), { recursive: true });
});

afterEach(async () => {
  if (existsSync(testDir)) {
    await rm(testDir, { recursive: true, force: true });
  }
});

describe('validateChangeName', () => {
  test('accepts valid kebab-case names', () => {
    expect(validateChangeName('add-auth').ok).toBe(true);
    expect(validateChangeName('fix-bug').ok).toBe(true);
    expect(validateChangeName('feature-123').ok).toBe(true);
    expect(validateChangeName('a').ok).toBe(true);
    expect(validateChangeName('a1').ok).toBe(true);
    expect(validateChangeName('my-long-feature-name').ok).toBe(true);
  });

  test('rejects invalid names', () => {
    expect(validateChangeName('Add-Auth').ok).toBe(false); // uppercase
    expect(validateChangeName('add_auth').ok).toBe(false); // underscore
    expect(validateChangeName('add auth').ok).toBe(false); // space
    expect(validateChangeName('add.auth').ok).toBe(false); // dot
    expect(validateChangeName('').ok).toBe(false); // empty
    expect(validateChangeName('-start').ok).toBe(false); // starts with hyphen
    expect(validateChangeName('end-').ok).toBe(false); // ends with hyphen
  });

  test('returns error message for invalid names', () => {
    const result = validateChangeName('INVALID');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('kebab-case');
    }
  });
});

describe('changeExists', () => {
  test('returns true when change exists in active directory', async () => {
    const changeName = 'existing-change';
    await mkdir(join(testDir, '.speck', 'changes', changeName), { recursive: true });

    const exists = await changeExists(changeName, testDir);

    expect(exists).toBe(true);
  });

  test('returns true when change exists in archive directory', async () => {
    const changeName = 'archived-change';
    await mkdir(join(testDir, '.speck', 'archive', changeName), { recursive: true });

    const exists = await changeExists(changeName, testDir);

    expect(exists).toBe(true);
  });

  test('returns false when change does not exist', async () => {
    const exists = await changeExists('nonexistent', testDir);

    expect(exists).toBe(false);
  });
});

describe('propose', () => {
  test('creates change proposal directory', async () => {
    const result = await propose('add-feature', { rootDir: testDir });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const changeDir = join(testDir, '.speck', 'changes', 'add-feature');
    expect(existsSync(changeDir)).toBe(true);
  });

  test('creates proposal.md file', async () => {
    const result = await propose('add-feature', { rootDir: testDir });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const proposalPath = join(testDir, '.speck', 'changes', 'add-feature', 'proposal.md');
    expect(existsSync(proposalPath)).toBe(true);

    const content = await readFile(proposalPath, 'utf-8');
    expect(content).toContain('# Change Proposal: add-feature');
    expect(content).toContain('## Summary');
    expect(content).toContain('## Rationale');
  });

  test('creates tasks.md file', async () => {
    const result = await propose('add-feature', { rootDir: testDir });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const tasksPath = join(testDir, '.speck', 'changes', 'add-feature', 'tasks.md');
    expect(existsSync(tasksPath)).toBe(true);

    const content = await readFile(tasksPath, 'utf-8');
    expect(content).toContain('# Tasks: add-feature');
  });

  test('creates design.md when --with-design is specified', async () => {
    const result = await propose('add-feature', { rootDir: testDir, withDesign: true });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const designPath = join(testDir, '.speck', 'changes', 'add-feature', 'design.md');
    expect(existsSync(designPath)).toBe(true);

    const content = await readFile(designPath, 'utf-8');
    expect(content).toContain('# Design: add-feature');
  });

  test('does not create design.md by default', async () => {
    const result = await propose('add-feature', { rootDir: testDir });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const designPath = join(testDir, '.speck', 'changes', 'add-feature', 'design.md');
    expect(existsSync(designPath)).toBe(false);
  });

  test('creates specs subdirectory', async () => {
    const result = await propose('add-feature', { rootDir: testDir });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const specsDir = join(testDir, '.speck', 'changes', 'add-feature', 'specs');
    expect(existsSync(specsDir)).toBe(true);
  });

  test('returns error for invalid change name', async () => {
    const result = await propose('Invalid_Name', { rootDir: testDir });

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error).toContain('kebab-case');
  });

  test('returns error when change already exists', async () => {
    // Create existing change
    await mkdir(join(testDir, '.speck', 'changes', 'existing'), { recursive: true });

    const result = await propose('existing', { rootDir: testDir });

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error).toContain('already exists');
  });

  test('returns the created path on success', async () => {
    const result = await propose('new-feature', { rootDir: testDir });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.path).toContain('.speck/changes/new-feature');
  });
});

describe('propose with description', () => {
  test('includes description in proposal.md when provided', async () => {
    const result = await propose('add-feature', {
      rootDir: testDir,
      description: 'This is a test feature to add authentication',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const proposalPath = join(testDir, '.speck', 'changes', 'add-feature', 'proposal.md');
    const content = await readFile(proposalPath, 'utf-8');

    expect(content).toContain('This is a test feature to add authentication');
  });
});

describe('propose with delta files', () => {
  test('creates delta files when specs are specified', async () => {
    // Create a spec to reference
    await mkdir(join(testDir, 'specs'), { recursive: true });
    await Bun.write(join(testDir, 'specs', 'auth.md'), '# Spec: auth\n\n## Requirements');

    const result = await propose('add-auth', {
      rootDir: testDir,
      affectedSpecs: ['auth'],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const deltaPath = join(testDir, '.speck', 'changes', 'add-auth', 'specs', 'auth.md');
    expect(existsSync(deltaPath)).toBe(true);

    const content = await readFile(deltaPath, 'utf-8');
    expect(content).toContain('# Delta: auth');
    expect(content).toContain('## ADDED Requirements');
    expect(content).toContain('## MODIFIED Requirements');
    expect(content).toContain('## REMOVED Requirements');
  });

  test('creates multiple delta files for multiple specs', async () => {
    // Create specs to reference
    await mkdir(join(testDir, 'specs'), { recursive: true });
    await Bun.write(join(testDir, 'specs', 'auth.md'), '# Spec: auth');
    await Bun.write(join(testDir, 'specs', 'users.md'), '# Spec: users');

    const result = await propose('add-feature', {
      rootDir: testDir,
      affectedSpecs: ['auth', 'users'],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const authDelta = join(testDir, '.speck', 'changes', 'add-feature', 'specs', 'auth.md');
    const usersDelta = join(testDir, '.speck', 'changes', 'add-feature', 'specs', 'users.md');

    expect(existsSync(authDelta)).toBe(true);
    expect(existsSync(usersDelta)).toBe(true);
  });

  test('creates delta file with proper template structure', async () => {
    const result = await propose('new-feature', {
      rootDir: testDir,
      affectedSpecs: ['my-spec'],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const deltaPath = join(testDir, '.speck', 'changes', 'new-feature', 'specs', 'my-spec.md');
    expect(existsSync(deltaPath)).toBe(true);

    const content = await readFile(deltaPath, 'utf-8');
    // Check for proper structure
    expect(content).toMatch(/^# Delta: my-spec/m);
    expect(content).toMatch(/^## ADDED Requirements/m);
    expect(content).toMatch(/^## MODIFIED Requirements/m);
    expect(content).toMatch(/^## REMOVED Requirements/m);
  });

  test('does not create delta files when no specs specified', async () => {
    const result = await propose('simple-change', { rootDir: testDir });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const specsDir = join(testDir, '.speck', 'changes', 'simple-change', 'specs');
    const files = existsSync(specsDir) ? await readdir(specsDir) : [];
    expect(files).toHaveLength(0);
  });
});
