/**
 * Unit Tests: Simplified Branch Mapper (Phase 2)
 *
 * Tests for the simplified branches.json schema (v2.0.0) that removes
 * stacked PR fields (baseBranch, status, pr).
 *
 * Feature: 015-scope-simplification
 * Tasks: T010, T011
 * Created: 2025-11-29
 */

import { describe, test, expect } from 'bun:test';
import {
  BranchEntrySchema,
  BranchMappingSchema,
  SCHEMA_VERSION,
  createEmptyBranchMapping,
  createBranchEntry,
  addBranchEntry,
  removeBranchEntry,
  getSpecForBranch,
  getBranchesForSpec,
  needsMigration,
  migrateBranchMapping,
  validateBranchMapping,
  safeParseBranchMapping,
} from '../../plugins/speck/scripts/common/branch-mapper';

describe('Simplified BranchEntry Schema (T010)', () => {
  test('validates a minimal valid branch entry', () => {
    const entry = {
      name: 'nprbst/custom-feature',
      specId: '015-scope-simplification',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = BranchEntrySchema.safeParse(entry);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('nprbst/custom-feature');
      expect(result.data.specId).toBe('015-scope-simplification');
      expect(result.data.parentSpecId).toBeUndefined();
    }
  });

  test('validates entry with parentSpecId for multi-repo', () => {
    const entry = {
      name: 'nprbst/child-feature',
      specId: '015-scope-simplification',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      parentSpecId: '007-multi-repo-root',
    };

    const result = BranchEntrySchema.safeParse(entry);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.parentSpecId).toBe('007-multi-repo-root');
    }
  });

  test('rejects empty branch name', () => {
    const entry = {
      name: '',
      specId: '015-scope-simplification',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = BranchEntrySchema.safeParse(entry);
    expect(result.success).toBe(false);
  });

  test('rejects invalid branch name characters', () => {
    const entry = {
      name: 'feature with spaces',
      specId: '015-scope-simplification',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = BranchEntrySchema.safeParse(entry);
    expect(result.success).toBe(false);
  });

  test('rejects invalid specId format', () => {
    const entry = {
      name: 'nprbst/feature',
      specId: 'invalid-spec-id', // Missing NNN prefix
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = BranchEntrySchema.safeParse(entry);
    expect(result.success).toBe(false);
  });

  test('rejects invalid parentSpecId format', () => {
    const entry = {
      name: 'nprbst/feature',
      specId: '015-scope-simplification',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      parentSpecId: 'invalid', // Missing NNN prefix
    };

    const result = BranchEntrySchema.safeParse(entry);
    expect(result.success).toBe(false);
  });

  test('rejects invalid timestamp format', () => {
    const entry = {
      name: 'nprbst/feature',
      specId: '015-scope-simplification',
      createdAt: 'not-a-timestamp',
      updatedAt: new Date().toISOString(),
    };

    const result = BranchEntrySchema.safeParse(entry);
    expect(result.success).toBe(false);
  });

  test('does NOT have baseBranch, status, or pr fields', () => {
    // Verify the schema doesn't accept old fields
    const entry = {
      name: 'nprbst/feature',
      specId: '015-scope-simplification',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      baseBranch: 'main', // OLD FIELD - should be stripped
      status: 'active', // OLD FIELD - should be stripped
      pr: 123, // OLD FIELD - should be stripped
    };

    const result = BranchEntrySchema.safeParse(entry);
    expect(result.success).toBe(true);
    if (result.success) {
      // These fields should not exist in the parsed result
      expect('baseBranch' in result.data).toBe(false);
      expect('status' in result.data).toBe(false);
      expect('pr' in result.data).toBe(false);
    }
  });
});

describe('BranchMapping Schema', () => {
  test('validates a valid branch mapping', () => {
    const mapping = {
      version: SCHEMA_VERSION,
      branches: [
        {
          name: 'nprbst/feature-1',
          specId: '015-scope-simplification',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      specIndex: {
        '015-scope-simplification': ['nprbst/feature-1'],
      },
    };

    const result = BranchMappingSchema.safeParse(mapping);
    expect(result.success).toBe(true);
  });

  test('validates empty branch mapping', () => {
    const mapping = createEmptyBranchMapping();

    const result = BranchMappingSchema.safeParse(mapping);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.version).toBe(SCHEMA_VERSION);
      expect(result.data.branches).toHaveLength(0);
      expect(Object.keys(result.data.specIndex)).toHaveLength(0);
    }
  });
});

describe('Factory Functions', () => {
  test('createEmptyBranchMapping returns correct structure', () => {
    const mapping = createEmptyBranchMapping();

    expect(mapping.version).toBe(SCHEMA_VERSION);
    expect(mapping.branches).toEqual([]);
    expect(mapping.specIndex).toEqual({});
  });

  test('createBranchEntry creates valid entry', () => {
    const entry = createBranchEntry('nprbst/feature', '015-scope-simplification');

    expect(entry.name).toBe('nprbst/feature');
    expect(entry.specId).toBe('015-scope-simplification');
    expect(entry.createdAt).toBeDefined();
    expect(entry.updatedAt).toBeDefined();
    expect(entry.parentSpecId).toBeUndefined();
  });

  test('createBranchEntry includes parentSpecId when provided', () => {
    const entry = createBranchEntry(
      'nprbst/feature',
      '015-scope-simplification',
      '007-parent-spec'
    );

    expect(entry.parentSpecId).toBe('007-parent-spec');
  });
});

describe('Operations', () => {
  test('addBranchEntry adds entry and updates specIndex', () => {
    const mapping = createEmptyBranchMapping();
    const entry = createBranchEntry('nprbst/feature', '015-scope-simplification');

    const updated = addBranchEntry(mapping, entry);

    expect(updated.branches).toHaveLength(1);
    expect(updated.branches[0]?.name).toBe('nprbst/feature');
    expect(updated.specIndex['015-scope-simplification']).toContain('nprbst/feature');
  });

  test('addBranchEntry throws on duplicate branch name', () => {
    const mapping = createEmptyBranchMapping();
    const entry = createBranchEntry('nprbst/feature', '015-scope-simplification');

    const updated = addBranchEntry(mapping, entry);

    expect(() => addBranchEntry(updated, entry)).toThrow('Branch "nprbst/feature" already exists');
  });

  test('removeBranchEntry removes entry and updates specIndex', () => {
    const mapping = createEmptyBranchMapping();
    const entry = createBranchEntry('nprbst/feature', '015-scope-simplification');
    const withEntry = addBranchEntry(mapping, entry);

    const removed = removeBranchEntry(withEntry, 'nprbst/feature');

    expect(removed.branches).toHaveLength(0);
    expect(removed.specIndex['015-scope-simplification']).toBeUndefined();
  });

  test('getSpecForBranch returns correct spec ID', () => {
    const mapping = createEmptyBranchMapping();
    const entry = createBranchEntry('nprbst/feature', '015-scope-simplification');
    const updated = addBranchEntry(mapping, entry);

    const specId = getSpecForBranch(updated, 'nprbst/feature');
    expect(specId).toBe('015-scope-simplification');
  });

  test('getSpecForBranch returns undefined for unknown branch', () => {
    const mapping = createEmptyBranchMapping();

    const specId = getSpecForBranch(mapping, 'unknown-branch');
    expect(specId).toBeUndefined();
  });

  test('getBranchesForSpec returns all branches for spec', () => {
    let mapping = createEmptyBranchMapping();
    mapping = addBranchEntry(
      mapping,
      createBranchEntry('nprbst/feature-1', '015-scope-simplification')
    );
    mapping = addBranchEntry(
      mapping,
      createBranchEntry('nprbst/feature-2', '015-scope-simplification')
    );

    const branches = getBranchesForSpec(mapping, '015-scope-simplification');

    expect(branches).toContain('nprbst/feature-1');
    expect(branches).toContain('nprbst/feature-2');
    expect(branches).toHaveLength(2);
  });

  test('getBranchesForSpec returns empty array for unknown spec', () => {
    const mapping = createEmptyBranchMapping();

    const branches = getBranchesForSpec(mapping, 'unknown-spec');
    expect(branches).toEqual([]);
  });
});

describe('Schema Migration v1.x → v2.0.0 (T011)', () => {
  test('needsMigration returns true for v1.x versions', () => {
    expect(needsMigration({ version: '1.0.0' })).toBe(true);
    expect(needsMigration({ version: '1.1.0' })).toBe(true);
    expect(needsMigration({ version: '1.99.0' })).toBe(true);
  });

  test('needsMigration returns false for v2.x versions', () => {
    expect(needsMigration({ version: '2.0.0' })).toBe(false);
    expect(needsMigration({ version: '2.1.0' })).toBe(false);
  });

  test('migrateBranchMapping removes stacked PR fields', () => {
    const legacy = {
      version: '1.1.0',
      branches: [
        {
          name: 'nprbst/feature',
          specId: '015-scope-simplification',
          baseBranch: 'main', // REMOVED
          status: 'active' as const, // REMOVED
          pr: null, // REMOVED
          createdAt: '2025-11-28T00:00:00.000Z',
          updatedAt: '2025-11-28T00:00:00.000Z',
          parentSpecId: '007-parent-spec',
        },
      ],
    };

    const migrated = migrateBranchMapping(legacy);

    expect(migrated.version).toBe(SCHEMA_VERSION);
    expect(migrated.branches).toHaveLength(1);

    const branch = migrated.branches[0]!;
    expect(branch.name).toBe('nprbst/feature');
    expect(branch.specId).toBe('015-scope-simplification');
    expect(branch.parentSpecId).toBe('007-parent-spec');
    expect(branch.createdAt).toBe('2025-11-28T00:00:00.000Z');
    expect(branch.updatedAt).toBe('2025-11-28T00:00:00.000Z');

    // Verify old fields are NOT present
    expect('baseBranch' in branch).toBe(false);
    expect('status' in branch).toBe(false);
    expect('pr' in branch).toBe(false);
  });

  test('migrateBranchMapping rebuilds specIndex', () => {
    const legacy = {
      version: '1.0.0',
      branches: [
        {
          name: 'nprbst/feature-1',
          specId: '015-scope-simplification',
          baseBranch: 'main',
          status: 'active' as const,
          pr: null,
          createdAt: '2025-11-28T00:00:00.000Z',
          updatedAt: '2025-11-28T00:00:00.000Z',
        },
        {
          name: 'nprbst/feature-2',
          specId: '015-scope-simplification',
          baseBranch: 'nprbst/feature-1',
          status: 'submitted' as const,
          pr: 42,
          createdAt: '2025-11-28T00:00:00.000Z',
          updatedAt: '2025-11-28T00:00:00.000Z',
        },
      ],
    };

    const migrated = migrateBranchMapping(legacy);

    expect(migrated.specIndex['015-scope-simplification']).toContain('nprbst/feature-1');
    expect(migrated.specIndex['015-scope-simplification']).toContain('nprbst/feature-2');
    expect(migrated.specIndex['015-scope-simplification']).toHaveLength(2);
  });

  test('migrateBranchMapping handles empty branches array', () => {
    const legacy = {
      version: '1.0.0',
      branches: [],
    };

    const migrated = migrateBranchMapping(legacy);

    expect(migrated.version).toBe(SCHEMA_VERSION);
    expect(migrated.branches).toHaveLength(0);
    expect(Object.keys(migrated.specIndex)).toHaveLength(0);
  });

  test('migrateBranchMapping preserves parentSpecId', () => {
    const legacy = {
      version: '1.1.0',
      branches: [
        {
          name: 'nprbst/child-feature',
          specId: '009-child-spec',
          baseBranch: 'main',
          status: 'active' as const,
          pr: null,
          createdAt: '2025-11-28T00:00:00.000Z',
          updatedAt: '2025-11-28T00:00:00.000Z',
          parentSpecId: '007-parent-spec',
        },
      ],
    };

    const migrated = migrateBranchMapping(legacy);

    expect(migrated.branches[0]?.parentSpecId).toBe('007-parent-spec');
  });
});

describe('Validation', () => {
  test('validateBranchMapping validates and returns valid mapping', () => {
    const mapping = createEmptyBranchMapping();

    const validated = validateBranchMapping(mapping);
    expect(validated).toEqual(mapping);
  });

  test('validateBranchMapping throws on invalid mapping', () => {
    const invalidMapping = {
      version: 'invalid',
      branches: 'not-an-array',
    };

    expect(() => validateBranchMapping(invalidMapping)).toThrow();
  });

  test('safeParseBranchMapping returns success for valid mapping', () => {
    const mapping = createEmptyBranchMapping();

    const result = safeParseBranchMapping(mapping);
    expect(result.success).toBe(true);
  });

  test('safeParseBranchMapping returns error for invalid mapping', () => {
    const invalidMapping = { version: 123 };

    const result = safeParseBranchMapping(invalidMapping);
    expect(result.success).toBe(false);
  });
});
