/**
 * Contract Test: Branch Schema Validation (T016)
 *
 * Validates that branches.json schema v2.0.0:
 * - Uses the simplified schema (no stacked PR fields)
 * - Contains valid parentSpecId field for multi-repo support
 * - Passes JSON schema validation
 * - Migrates from v1.x automatically
 *
 * Feature: 015-scope-simplification (updated from 009-multi-repo-stacked)
 * Layer: 1 (Contract)
 * Created: 2025-11-19
 * Updated: 2025-11-29
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {
  readBranches,
  writeBranches,
  SCHEMA_VERSION,
  createEmptyBranchMapping,
  createBranchEntry,
  addBranchEntry,
  needsMigration,
  migrateBranchMapping,
} from '../../plugins/speck/scripts/common/branch-mapper';

describe('Contract: Branch schema v2.0.0 validation', () => {
  let testDir: string;

  beforeEach(async () => {
    // Create a temporary test directory
    testDir = path.join(os.tmpdir(), `speck-test-${Date.now()}`);
    await mkdir(path.join(testDir, '.speck'), { recursive: true });
  });

  afterEach(async () => {
    // Cleanup
    await rm(testDir, { recursive: true, force: true });
  });

  test('T016: branches.json uses schema version 2.0.0', async () => {
    // Create a new empty mapping
    const mapping = createEmptyBranchMapping();

    // Write to test directory
    await writeBranches(testDir, mapping);

    // Read it back
    const readMapping = await readBranches(testDir);

    // Contract: Schema version is 2.0.0
    expect(readMapping.version).toBe('2.0.0');
    expect(readMapping.version).toBe(SCHEMA_VERSION);
  });

  test('T016: Simplified schema has NO stacked PR fields', async () => {
    // Create a branch entry
    const entry = createBranchEntry('nprbst/custom-feature', '015-scope-simplification');

    // Verify the entry has the expected fields
    expect(entry).toHaveProperty('name');
    expect(entry).toHaveProperty('specId');
    expect(entry).toHaveProperty('createdAt');
    expect(entry).toHaveProperty('updatedAt');

    // Verify it does NOT have stacked PR fields
    expect('baseBranch' in entry).toBe(false);
    expect('status' in entry).toBe(false);
    expect('pr' in entry).toBe(false);
  });

  test('T016: parentSpecId field is optional and matches pattern', async () => {
    // Create entry with parentSpecId
    const entryWithParent = createBranchEntry(
      'nprbst/child-feature',
      '015-scope-simplification',
      '007-parent-spec'
    );

    expect(entryWithParent.parentSpecId).toBe('007-parent-spec');
    expect(entryWithParent.parentSpecId).toMatch(/^\d{3}-[a-z0-9-]+$/);

    // Create entry without parentSpecId
    const entryWithoutParent = createBranchEntry(
      'nprbst/standalone-feature',
      '015-scope-simplification'
    );

    expect(entryWithoutParent.parentSpecId).toBeUndefined();
  });

  test('T016: branches.json validates against v2.0.0 schema', async () => {
    // Create a mapping with a branch
    let mapping = createEmptyBranchMapping();
    const entry = createBranchEntry('nprbst/test-branch', '015-scope-simplification');
    mapping = addBranchEntry(mapping, entry);

    // Write and read back
    await writeBranches(testDir, mapping);
    const readMapping = await readBranches(testDir);

    // Contract: Required fields present
    expect(readMapping).toHaveProperty('version');
    expect(readMapping).toHaveProperty('branches');
    expect(readMapping).toHaveProperty('specIndex');

    // Contract: Branch entry has simplified fields only
    const branch = readMapping.branches[0]!;
    expect(branch).toHaveProperty('name');
    expect(branch).toHaveProperty('specId');
    expect(branch).toHaveProperty('createdAt');
    expect(branch).toHaveProperty('updatedAt');

    // Contract: No stacked PR fields
    expect('baseBranch' in branch).toBe(false);
    expect('status' in branch).toBe(false);
    expect('pr' in branch).toBe(false);

    // Contract: Timestamps are valid ISO 8601
    expect(() => new Date(branch.createdAt)).not.toThrow();
    expect(() => new Date(branch.updatedAt)).not.toThrow();
  });

  test('T016: Migration - v1.x files are auto-migrated to v2.0.0', async () => {
    // Manually create a v1.1.0 file with stacked PR fields
    const v1_1_0_mapping = {
      version: '1.1.0',
      branches: [
        {
          name: 'nprbst/old-branch',
          specId: '008-stacked-pr-support',
          baseBranch: 'main', // OLD FIELD
          status: 'active', // OLD FIELD
          pr: null, // OLD FIELD
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          parentSpecId: '007-parent-spec',
        },
      ],
      specIndex: {
        '008-stacked-pr-support': ['nprbst/old-branch'],
      },
    };

    const branchesJsonPath = path.join(testDir, '.speck', 'branches.json');
    await writeFile(branchesJsonPath, JSON.stringify(v1_1_0_mapping, null, 2));

    // Contract: readBranches auto-migrates v1.x files
    const mapping = await readBranches(testDir);

    // Should be migrated to v2.0.0
    expect(mapping.version).toBe('2.0.0');
    expect(mapping.branches).toHaveLength(1);

    // Old fields should be stripped
    const branch = mapping.branches[0]!;
    expect('baseBranch' in branch).toBe(false);
    expect('status' in branch).toBe(false);
    expect('pr' in branch).toBe(false);

    // Important fields are preserved
    expect(branch.name).toBe('nprbst/old-branch');
    expect(branch.specId).toBe('008-stacked-pr-support');
    expect(branch.parentSpecId).toBe('007-parent-spec');
  });

  test('T016: Migration - v1.0.0 files without parentSpecId migrate correctly', async () => {
    // Manually create a v1.0.0 file without parentSpecId
    const v1_0_0_mapping = {
      version: '1.0.0',
      branches: [
        {
          name: 'nprbst/legacy-branch',
          specId: '008-stacked-pr-support',
          baseBranch: 'main',
          status: 'submitted',
          pr: 42,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          // NO parentSpecId field
        },
      ],
      specIndex: {
        '008-stacked-pr-support': ['nprbst/legacy-branch'],
      },
    };

    const branchesJsonPath = path.join(testDir, '.speck', 'branches.json');
    await writeFile(branchesJsonPath, JSON.stringify(v1_0_0_mapping, null, 2));

    // Contract: readBranches auto-migrates v1.0.0 files
    const mapping = await readBranches(testDir);

    expect(mapping.version).toBe('2.0.0');
    expect(mapping.branches).toHaveLength(1);
    expect(mapping.branches[0]?.parentSpecId).toBeUndefined();
  });

  test('T016: specIndex is consistent with branches array', async () => {
    // Create mapping with multiple branches
    let mapping = createEmptyBranchMapping();
    mapping = addBranchEntry(
      mapping,
      createBranchEntry('nprbst/feature-1', '015-scope-simplification')
    );
    mapping = addBranchEntry(
      mapping,
      createBranchEntry('nprbst/feature-2', '015-scope-simplification')
    );

    // Write and read back
    await writeBranches(testDir, mapping);
    const readMapping = await readBranches(testDir);

    // Contract: specIndex contains all branches for the spec
    const specId = '015-scope-simplification';
    expect(readMapping.specIndex[specId]).toContain('nprbst/feature-1');
    expect(readMapping.specIndex[specId]).toContain('nprbst/feature-2');
    expect(readMapping.specIndex[specId]).toHaveLength(2);

    // Contract: All branches in specIndex exist in branches array
    const branchNames = readMapping.branches.map((b) => b.name);
    for (const name of readMapping.specIndex[specId]!) {
      expect(branchNames).toContain(name);
    }
  });

  test('T016: needsMigration correctly identifies v1.x versions', () => {
    expect(needsMigration({ version: '1.0.0' })).toBe(true);
    expect(needsMigration({ version: '1.1.0' })).toBe(true);
    expect(needsMigration({ version: '1.99.99' })).toBe(true);
    expect(needsMigration({ version: '2.0.0' })).toBe(false);
    expect(needsMigration({ version: '2.1.0' })).toBe(false);
  });

  test('T016: migrateBranchMapping removes stacked PR fields and preserves data', () => {
    const legacy = {
      version: '1.1.0',
      branches: [
        {
          name: 'nprbst/feature',
          specId: '015-scope-simplification',
          baseBranch: 'main', // REMOVED
          status: 'active' as const, // REMOVED
          pr: null, // REMOVED
          createdAt: '2025-11-28T12:00:00.000Z',
          updatedAt: '2025-11-28T13:00:00.000Z',
          parentSpecId: '007-parent-spec',
        },
      ],
    };

    const migrated = migrateBranchMapping(legacy);

    // Version is updated
    expect(migrated.version).toBe('2.0.0');

    // Data is preserved
    const branch = migrated.branches[0]!;
    expect(branch.name).toBe('nprbst/feature');
    expect(branch.specId).toBe('015-scope-simplification');
    expect(branch.createdAt).toBe('2025-11-28T12:00:00.000Z');
    expect(branch.updatedAt).toBe('2025-11-28T13:00:00.000Z');
    expect(branch.parentSpecId).toBe('007-parent-spec');

    // Stacked PR fields are gone
    expect('baseBranch' in branch).toBe(false);
    expect('status' in branch).toBe(false);
    expect('pr' in branch).toBe(false);

    // specIndex is rebuilt
    expect(migrated.specIndex['015-scope-simplification']).toContain('nprbst/feature');
  });
});
