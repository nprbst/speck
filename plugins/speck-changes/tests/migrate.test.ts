/**
 * Tests for migrate command
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdir, rm, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  migrateFromOpenSpec,
  detectOpenSpecDirectory,
  migrateSpecs,
  migrateChanges,
  validateMigration,
} from '../scripts/migrate';

// Test temporary directory
let testDir: string;

beforeEach(async () => {
  testDir = join(import.meta.dir, '.test-tmp', `migrate-${Date.now()}`);
  await mkdir(testDir, { recursive: true });
});

afterEach(async () => {
  if (existsSync(testDir)) {
    await rm(testDir, { recursive: true, force: true });
  }
});

async function createMockOpenSpecProject(options: {
  specs?: Record<string, string>;
  changes?: Record<string, { proposal?: string; tasks?: string; deltas?: Record<string, string> }>;
}): Promise<void> {
  const { specs = {}, changes = {} } = options;

  // Create openspec directory structure
  await mkdir(join(testDir, 'openspec', 'specs'), { recursive: true });
  await mkdir(join(testDir, 'openspec', 'changes'), { recursive: true });

  // Create project.md
  await writeFile(
    join(testDir, 'openspec', 'project.md'),
    `# Project: Test Project

Overview of the project.
`
  );

  // Create specs
  for (const [name, content] of Object.entries(specs)) {
    await writeFile(join(testDir, 'openspec', 'specs', `${name}.md`), content);
  }

  // Create changes
  for (const [name, changeData] of Object.entries(changes)) {
    const changeDir = join(testDir, 'openspec', 'changes', name);
    await mkdir(changeDir, { recursive: true });
    await mkdir(join(changeDir, 'specs'), { recursive: true });

    await writeFile(
      join(changeDir, 'proposal.md'),
      changeData.proposal ?? `# Proposal: ${name}\n\nDescription.`
    );
    await writeFile(
      join(changeDir, 'tasks.md'),
      changeData.tasks ?? `# Tasks: ${name}\n\n- [ ] Task 1`
    );

    if (changeData.deltas) {
      for (const [specName, deltaContent] of Object.entries(changeData.deltas)) {
        await writeFile(join(changeDir, 'specs', `${specName}.md`), deltaContent);
      }
    }
  }
}

describe('detectOpenSpecDirectory', () => {
  test('detects openspec directory', async () => {
    await createMockOpenSpecProject({ specs: {} });

    const result = detectOpenSpecDirectory(testDir);

    expect(result).not.toBeNull();
    expect(result?.path).toContain('openspec');
  });

  test('returns null when no openspec directory', () => {
    const result = detectOpenSpecDirectory(testDir);

    expect(result).toBeNull();
  });

  test('validates openspec structure', async () => {
    await mkdir(join(testDir, 'openspec'), { recursive: true });
    // Missing specs and changes directories

    const result = detectOpenSpecDirectory(testDir);

    // Should return null or indicate invalid structure
    expect(result === null || result?.valid === false).toBe(true);
  });
});

describe('migrateSpecs', () => {
  test('migrates specs to Speck format', async () => {
    await createMockOpenSpecProject({
      specs: {
        auth: `# Spec: auth

## Requirements

### REQ-001: Login

Users can log in.
`,
      },
    });

    await mkdir(join(testDir, 'specs'), { recursive: true });

    const result = await migrateSpecs(join(testDir, 'openspec', 'specs'), join(testDir, 'specs'));

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(existsSync(join(testDir, 'specs', 'auth.md'))).toBe(true);
    const content = await readFile(join(testDir, 'specs', 'auth.md'), 'utf-8');
    expect(content).toContain('REQ-001');
  });

  test('reports migrated specs count', async () => {
    await createMockOpenSpecProject({
      specs: {
        auth: '# Spec: auth\n',
        users: '# Spec: users\n',
      },
    });

    await mkdir(join(testDir, 'specs'), { recursive: true });

    const result = await migrateSpecs(join(testDir, 'openspec', 'specs'), join(testDir, 'specs'));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.count).toBe(2);
  });
});

describe('migrateChanges', () => {
  test('migrates changes to .speck/changes', async () => {
    await createMockOpenSpecProject({
      changes: {
        'add-feature': {
          proposal: '# Proposal: add-feature\n\nAdding a feature.',
          tasks: '# Tasks\n\n- [ ] Do something',
        },
      },
    });

    await mkdir(join(testDir, '.speck', 'changes'), { recursive: true });

    const result = await migrateChanges(
      join(testDir, 'openspec', 'changes'),
      join(testDir, '.speck', 'changes')
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(existsSync(join(testDir, '.speck', 'changes', 'add-feature'))).toBe(true);
    expect(existsSync(join(testDir, '.speck', 'changes', 'add-feature', 'proposal.md'))).toBe(true);
  });

  test('preserves delta files', async () => {
    await createMockOpenSpecProject({
      changes: {
        'modify-auth': {
          deltas: {
            auth: `# Delta: auth

## ADDED Requirements

### REQ-002: New feature

New feature description.

## MODIFIED Requirements

## REMOVED Requirements
`,
          },
        },
      },
    });

    await mkdir(join(testDir, '.speck', 'changes'), { recursive: true });

    const result = await migrateChanges(
      join(testDir, 'openspec', 'changes'),
      join(testDir, '.speck', 'changes')
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const deltaPath = join(testDir, '.speck', 'changes', 'modify-auth', 'specs', 'auth.md');
    expect(existsSync(deltaPath)).toBe(true);

    const content = await readFile(deltaPath, 'utf-8');
    expect(content).toContain('REQ-002');
  });
});

describe('validateMigration', () => {
  test('validates successful migration', async () => {
    // Set up a migrated project
    await mkdir(join(testDir, 'specs'), { recursive: true });
    await mkdir(join(testDir, '.speck', 'changes'), { recursive: true });

    await writeFile(join(testDir, 'specs', 'auth.md'), '# Spec: auth\n');

    const result = await validateMigration(testDir);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.errors).toHaveLength(0);
  });

  test('reports missing directories', async () => {
    // Empty project - no specs or changes

    const result = await validateMigration(testDir);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

describe('migrateFromOpenSpec', () => {
  test('performs full migration', async () => {
    await createMockOpenSpecProject({
      specs: {
        auth: '# Spec: auth\n\n## Requirements\n\n### REQ-001: Login\n\nUsers can log in.',
      },
      changes: {
        'add-feature': {
          proposal: '# Proposal: add-feature\n',
          tasks: '# Tasks\n\n- [ ] Task 1',
        },
      },
    });

    const result = await migrateFromOpenSpec({ rootDir: testDir });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Check specs migrated
    expect(existsSync(join(testDir, 'specs', 'auth.md'))).toBe(true);

    // Check changes migrated
    expect(existsSync(join(testDir, '.speck', 'changes', 'add-feature'))).toBe(true);
  });

  test('returns error when no openspec directory', async () => {
    const result = await migrateFromOpenSpec({ rootDir: testDir });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('not found');
  });

  test('creates necessary directories', async () => {
    await createMockOpenSpecProject({
      specs: { test: '# Spec: test\n' },
    });

    // Ensure target directories don't exist
    expect(existsSync(join(testDir, 'specs'))).toBe(false);
    expect(existsSync(join(testDir, '.speck', 'changes'))).toBe(false);

    const result = await migrateFromOpenSpec({ rootDir: testDir });

    expect(result.ok).toBe(true);
    expect(existsSync(join(testDir, 'specs'))).toBe(true);
    expect(existsSync(join(testDir, '.speck', 'changes'))).toBe(true);
  });

  test('reports migration summary', async () => {
    await createMockOpenSpecProject({
      specs: {
        auth: '# Spec: auth\n',
        users: '# Spec: users\n',
      },
      changes: {
        'change-1': {},
        'change-2': {},
      },
    });

    const result = await migrateFromOpenSpec({ rootDir: testDir });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.specsCount).toBe(2);
    expect(result.changesCount).toBe(2);
  });
});
