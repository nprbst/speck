/**
 * Unit tests for Staging Types Zod Schemas
 *
 * Tests type validation for:
 * - StagingContext
 * - StagingMetadata
 * - StagedFile
 * - AgentResults
 * - ProductionBaseline
 */

import { describe, it, expect } from 'bun:test';
import {
  StagingContextSchema,
  StagingMetadataSchema,
  StagedFileSchema,
  StagingStatusSchema,
  AgentResultSchema,
  AgentResultsSchema,
  ProductionBaselineSchema,
  FileBaselineSchema,
  FileCategorySchema,
  type StagingContext,
  type StagingMetadata,
  type StagedFile,
  type StagingStatus,
} from '../../.speck/scripts/common/staging-types';

describe('StagingStatusSchema', () => {
  it('accepts valid status values', () => {
    const validStatuses: StagingStatus[] = [
      'staging',
      'agent1-complete',
      'agent2-complete',
      'ready',
      'committing',
      'committed',
      'failed',
      'rolled-back',
    ];

    for (const status of validStatuses) {
      const result = StagingStatusSchema.safeParse(status);
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid status values', () => {
    const invalidStatuses = ['invalid', 'pending', 'running', '', null, 123];

    for (const status of invalidStatuses) {
      const result = StagingStatusSchema.safeParse(status);
      expect(result.success).toBe(false);
    }
  });
});

describe('FileCategorySchema', () => {
  it('accepts valid categories', () => {
    const validCategories = ['scripts', 'commands', 'agents', 'skills'];

    for (const category of validCategories) {
      const result = FileCategorySchema.safeParse(category);
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid categories', () => {
    const invalidCategories = ['templates', 'docs', '', null];

    for (const category of invalidCategories) {
      const result = FileCategorySchema.safeParse(category);
      expect(result.success).toBe(false);
    }
  });
});

describe('FileBaselineSchema', () => {
  it('accepts valid file baseline with existing file', () => {
    const baseline = {
      exists: true,
      mtime: 1700000000000,
      size: 1024,
    };

    const result = FileBaselineSchema.safeParse(baseline);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.exists).toBe(true);
      expect(result.data.mtime).toBe(1700000000000);
      expect(result.data.size).toBe(1024);
    }
  });

  it('accepts valid file baseline for non-existing file', () => {
    const baseline = {
      exists: false,
      mtime: null,
      size: null,
    };

    const result = FileBaselineSchema.safeParse(baseline);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.exists).toBe(false);
      expect(result.data.mtime).toBeNull();
      expect(result.data.size).toBeNull();
    }
  });

  it('rejects baseline with missing fields', () => {
    const incomplete = { exists: true };
    const result = FileBaselineSchema.safeParse(incomplete);
    expect(result.success).toBe(false);
  });
});

describe('ProductionBaselineSchema', () => {
  it('accepts valid production baseline', () => {
    const baseline = {
      files: {
        '.speck/scripts/existing.ts': { exists: true, mtime: 1700000000000, size: 500 },
        '.claude/commands/speck.cmd.md': { exists: true, mtime: 1700000000000, size: 200 },
      },
      capturedAt: '2025-11-30T12:00:00.000Z',
    };

    const result = ProductionBaselineSchema.safeParse(baseline);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(Object.keys(result.data.files)).toHaveLength(2);
      expect(result.data.capturedAt).toBe('2025-11-30T12:00:00.000Z');
    }
  });

  it('accepts empty production baseline', () => {
    const baseline = {
      files: {},
      capturedAt: '2025-11-30T12:00:00.000Z',
    };

    const result = ProductionBaselineSchema.safeParse(baseline);
    expect(result.success).toBe(true);
  });
});

describe('AgentResultSchema', () => {
  it('accepts valid successful agent result', () => {
    const agentResult = {
      success: true,
      filesWritten: ['scripts/test.ts', 'scripts/util.ts'],
      error: null,
      duration: 5000,
    };

    const result = AgentResultSchema.safeParse(agentResult);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.success).toBe(true);
      expect(result.data.filesWritten).toHaveLength(2);
      expect(result.data.error).toBeNull();
    }
  });

  it('accepts valid failed agent result', () => {
    const agentResult = {
      success: false,
      filesWritten: [],
      error: 'Transformation failed: unsupported syntax',
      duration: 1000,
    };

    const result = AgentResultSchema.safeParse(agentResult);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.success).toBe(false);
      expect(result.data.error).toBe('Transformation failed: unsupported syntax');
    }
  });
});

describe('AgentResultsSchema', () => {
  it('accepts agent results with both agents complete', () => {
    const results = {
      agent1: { success: true, filesWritten: ['a.ts'], error: null, duration: 1000 },
      agent2: { success: true, filesWritten: ['b.md'], error: null, duration: 2000 },
    };

    const result = AgentResultsSchema.safeParse(results);
    expect(result.success).toBe(true);
  });

  it('accepts agent results with only agent1 complete', () => {
    const results = {
      agent1: { success: true, filesWritten: ['a.ts'], error: null, duration: 1000 },
      agent2: null,
    };

    const result = AgentResultsSchema.safeParse(results);
    expect(result.success).toBe(true);
  });

  it('accepts agent results with no agents complete', () => {
    const results = {
      agent1: null,
      agent2: null,
    };

    const result = AgentResultsSchema.safeParse(results);
    expect(result.success).toBe(true);
  });
});

describe('StagingMetadataSchema', () => {
  it('accepts valid staging metadata', () => {
    const metadata = {
      status: 'staging' as const,
      startTime: '2025-11-30T12:00:00.000Z',
      targetVersion: 'v2.1.0',
      previousVersion: 'v2.0.0',
      agentResults: { agent1: null, agent2: null },
      productionBaseline: {
        files: {},
        capturedAt: '2025-11-30T12:00:00.000Z',
      },
    };

    const result = StagingMetadataSchema.safeParse(metadata);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('staging');
      expect(result.data.targetVersion).toBe('v2.1.0');
      expect(result.data.previousVersion).toBe('v2.0.0');
    }
  });

  it('accepts metadata with null previous version (first transformation)', () => {
    const metadata = {
      status: 'staging' as const,
      startTime: '2025-11-30T12:00:00.000Z',
      targetVersion: 'v1.0.0',
      previousVersion: null,
      agentResults: { agent1: null, agent2: null },
      productionBaseline: {
        files: {},
        capturedAt: '2025-11-30T12:00:00.000Z',
      },
    };

    const result = StagingMetadataSchema.safeParse(metadata);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.previousVersion).toBeNull();
    }
  });

  it('accepts metadata in ready state with complete agent results', () => {
    const metadata = {
      status: 'ready' as const,
      startTime: '2025-11-30T12:00:00.000Z',
      targetVersion: 'v2.1.0',
      previousVersion: 'v2.0.0',
      agentResults: {
        agent1: { success: true, filesWritten: ['a.ts'], error: null, duration: 1000 },
        agent2: { success: true, filesWritten: ['b.md'], error: null, duration: 2000 },
      },
      productionBaseline: {
        files: { '.speck/scripts/a.ts': { exists: true, mtime: 1700000000000, size: 100 } },
        capturedAt: '2025-11-30T12:00:00.000Z',
      },
    };

    const result = StagingMetadataSchema.safeParse(metadata);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('ready');
      expect(result.data.agentResults.agent1?.success).toBe(true);
      expect(result.data.agentResults.agent2?.success).toBe(true);
    }
  });

  it('rejects metadata with invalid status', () => {
    const metadata = {
      status: 'invalid',
      startTime: '2025-11-30T12:00:00.000Z',
      targetVersion: 'v2.1.0',
      previousVersion: null,
      agentResults: { agent1: null, agent2: null },
      productionBaseline: { files: {}, capturedAt: '2025-11-30T12:00:00.000Z' },
    };

    const result = StagingMetadataSchema.safeParse(metadata);
    expect(result.success).toBe(false);
  });

  it('rejects metadata with missing required fields', () => {
    const incomplete = {
      status: 'staging',
      targetVersion: 'v2.1.0',
    };

    const result = StagingMetadataSchema.safeParse(incomplete);
    expect(result.success).toBe(false);
  });
});

describe('StagedFileSchema', () => {
  it('accepts valid staged file', () => {
    const stagedFile = {
      stagingPath: '/path/.speck/.transform-staging/v2.1.0/scripts/test.ts',
      productionPath: '/path/.speck/scripts/test.ts',
      category: 'scripts' as const,
      relativePath: 'test.ts',
    };

    const result = StagedFileSchema.safeParse(stagedFile);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.category).toBe('scripts');
      expect(result.data.relativePath).toBe('test.ts');
    }
  });

  it('accepts staged file for commands category', () => {
    const stagedFile = {
      stagingPath: '/path/.speck/.transform-staging/v2.1.0/commands/speck.cmd.md',
      productionPath: '/path/.claude/commands/speck.cmd.md',
      category: 'commands' as const,
      relativePath: 'speck.cmd.md',
    };

    const result = StagedFileSchema.safeParse(stagedFile);
    expect(result.success).toBe(true);
  });

  it('rejects staged file with invalid category', () => {
    const stagedFile = {
      stagingPath: '/path/staging/file.txt',
      productionPath: '/path/prod/file.txt',
      category: 'invalid',
      relativePath: 'file.txt',
    };

    const result = StagedFileSchema.safeParse(stagedFile);
    expect(result.success).toBe(false);
  });

  it('rejects staged file with missing fields', () => {
    const incomplete = {
      stagingPath: '/path/staging/file.ts',
      category: 'scripts',
    };

    const result = StagedFileSchema.safeParse(incomplete);
    expect(result.success).toBe(false);
  });
});

describe('StagingContextSchema', () => {
  it('accepts valid staging context', () => {
    const context = {
      rootDir: '/project/.speck/.transform-staging/v2.1.0',
      scriptsDir: '/project/.speck/.transform-staging/v2.1.0/scripts',
      commandsDir: '/project/.speck/.transform-staging/v2.1.0/commands',
      agentsDir: '/project/.speck/.transform-staging/v2.1.0/agents',
      skillsDir: '/project/.speck/.transform-staging/v2.1.0/skills',
      targetVersion: 'v2.1.0',
      metadata: {
        status: 'staging' as const,
        startTime: '2025-11-30T12:00:00.000Z',
        targetVersion: 'v2.1.0',
        previousVersion: null,
        agentResults: { agent1: null, agent2: null },
        productionBaseline: { files: {}, capturedAt: '2025-11-30T12:00:00.000Z' },
      },
    };

    const result = StagingContextSchema.safeParse(context);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.targetVersion).toBe('v2.1.0');
      expect(result.data.rootDir).toContain('.transform-staging');
    }
  });

  it('validates all subdirectory paths exist', () => {
    const context = {
      rootDir: '/project/.speck/.transform-staging/v2.1.0',
      scriptsDir: '/project/.speck/.transform-staging/v2.1.0/scripts',
      commandsDir: '/project/.speck/.transform-staging/v2.1.0/commands',
      agentsDir: '/project/.speck/.transform-staging/v2.1.0/agents',
      skillsDir: '/project/.speck/.transform-staging/v2.1.0/skills',
      targetVersion: 'v2.1.0',
      metadata: {
        status: 'ready' as const,
        startTime: '2025-11-30T12:00:00.000Z',
        targetVersion: 'v2.1.0',
        previousVersion: 'v2.0.0',
        agentResults: {
          agent1: { success: true, filesWritten: [], error: null, duration: 1000 },
          agent2: { success: true, filesWritten: [], error: null, duration: 1000 },
        },
        productionBaseline: { files: {}, capturedAt: '2025-11-30T12:00:00.000Z' },
      },
    };

    const result = StagingContextSchema.safeParse(context);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.scriptsDir).toContain('/scripts');
      expect(result.data.commandsDir).toContain('/commands');
      expect(result.data.agentsDir).toContain('/agents');
      expect(result.data.skillsDir).toContain('/skills');
    }
  });

  it('rejects context with missing directories', () => {
    const incomplete = {
      rootDir: '/project/.speck/.transform-staging/v2.1.0',
      scriptsDir: '/project/.speck/.transform-staging/v2.1.0/scripts',
      targetVersion: 'v2.1.0',
      metadata: {
        status: 'staging',
        startTime: '2025-11-30T12:00:00.000Z',
        targetVersion: 'v2.1.0',
        previousVersion: null,
        agentResults: { agent1: null, agent2: null },
        productionBaseline: { files: {}, capturedAt: '2025-11-30T12:00:00.000Z' },
      },
    };

    const result = StagingContextSchema.safeParse(incomplete);
    expect(result.success).toBe(false);
  });
});
