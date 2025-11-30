/**
 * Tests for Transformation History Manager (Medium-Weight)
 *
 * Tests the transformation history manager with real filesystem operations
 * in temp directories.
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  readHistory,
  writeHistory,
  addTransformationEntry,
  updateTransformationStatus,
  addFactoringMapping,
  getPreviousFactoringDecision,
  getLatestTransformedVersion,
  TransformationHistoryError,
  createEmptyHistory,
  createHistoryEntry,
} from '../../../.speck/scripts/common/transformation-history';
import type {
  TransformationHistory,
  FactoringMapping,
} from '../../../specs/001-speck-core-project/contracts/transformation-history';

describe('Transformation History Manager', () => {
  let tempDir: string;
  let historyPath: string;

  beforeEach(async () => {
    // Create a real temp directory for each test
    tempDir = await mkdtemp(join(tmpdir(), 'speck-test-'));
    historyPath = join(tempDir, 'transformation-history.json');
  });

  afterEach(async () => {
    // Clean up temp directory
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('readHistory', () => {
    test("returns empty history when file doesn't exist", async () => {
      const history = await readHistory(historyPath);

      expect(history.schemaVersion).toBe('1.0.0');
      expect(history.latestVersion).toBe('');
      expect(history.entries).toEqual([]);
    });

    test('reads and validates existing history', async () => {
      const mockHistory: TransformationHistory = {
        schemaVersion: '1.0.0',
        latestVersion: 'v1.0.0',
        entries: [
          {
            version: 'v1.0.0',
            timestamp: new Date().toISOString(),
            commitSha: 'abc123',
            status: 'transformed',
            mappings: [
              {
                source: '.claude/commands/plan.md',
                generated: '.claude/commands/speck.plan.md',
                type: 'command',
              },
            ],
          },
        ],
      };

      await Bun.write(historyPath, JSON.stringify(mockHistory, null, 2));

      const history = await readHistory(historyPath);

      expect(history.latestVersion).toBe('v1.0.0');
      expect(history.entries).toHaveLength(1);
      expect(history.entries[0].version).toBe('v1.0.0');
      expect(history.entries[0].mappings).toHaveLength(1);
    });

    test('throws error for invalid history format', async () => {
      await Bun.write(historyPath, 'invalid json');

      try {
        await readHistory(historyPath);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(TransformationHistoryError);
      }
    });

    test('throws error for invalid schema version', async () => {
      const invalidHistory = {
        schemaVersion: '2.0.0', // Invalid version
        latestVersion: 'v1.0.0',
        entries: [],
      };

      await Bun.write(historyPath, JSON.stringify(invalidHistory, null, 2));

      try {
        await readHistory(historyPath);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(TransformationHistoryError);
      }
    });
  });

  describe('writeHistory', () => {
    test('writes history to file with pretty formatting', async () => {
      const history = createEmptyHistory();
      history.latestVersion = 'v1.0.0';
      history.entries.push(createHistoryEntry('v1.0.0', 'abc123', 'transformed'));

      await writeHistory(historyPath, history);

      const file = Bun.file(historyPath);
      const content = await file.text();

      expect(content).toContain('"schemaVersion": "1.0.0"');
      expect(content).toContain('"latestVersion": "v1.0.0"');
      expect(content).toContain('"version": "v1.0.0"');
    });

    test("creates parent directory if it doesn't exist", async () => {
      const nestedPath = join(tempDir, 'nested', 'dir', 'history.json');

      const history = createEmptyHistory();
      await writeHistory(nestedPath, history);

      const file = Bun.file(nestedPath);
      expect(await file.exists()).toBe(true);
    });

    test('throws error for invalid history structure', async () => {
      const invalidHistory = {
        schemaVersion: '1.0.0',
        latestVersion: 123, // Should be string
        entries: [],
      } as unknown as TransformationHistory;

      try {
        await writeHistory(historyPath, invalidHistory);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(TransformationHistoryError);
      }
    });
  });

  describe('addTransformationEntry', () => {
    test('adds new entry to empty history', async () => {
      await addTransformationEntry(historyPath, 'v1.0.0', 'abc123', 'transformed');

      const history = await readHistory(historyPath);

      expect(history.latestVersion).toBe('v1.0.0');
      expect(history.entries).toHaveLength(1);
      expect(history.entries[0].version).toBe('v1.0.0');
      expect(history.entries[0].commitSha).toBe('abc123');
      expect(history.entries[0].status).toBe('transformed');
    });

    test('adds entry with mappings', async () => {
      const mappings: FactoringMapping[] = [
        {
          source: '.claude/commands/plan.md',
          generated: '.claude/commands/speck.plan.md',
          type: 'command',
          description: 'Transformed plan command',
        },
        {
          source: '.claude/commands/plan.md',
          generated: '.claude/agents/speck.plan-workflow.md',
          type: 'agent',
          description: 'Extracted planning workflow',
          rationale: '>3 steps with branching logic per FR-007',
        },
      ];

      await addTransformationEntry(historyPath, 'v1.0.0', 'abc123', 'transformed', mappings);

      const history = await readHistory(historyPath);

      expect(history.entries[0].mappings).toHaveLength(2);
      expect(history.entries[0].mappings[0].type).toBe('command');
      expect(history.entries[0].mappings[1].type).toBe('agent');
      expect(history.entries[0].mappings[1].rationale).toContain('FR-007');
    });

    test('prepends new entries (newest first)', async () => {
      await addTransformationEntry(historyPath, 'v1.0.0', 'abc123', 'transformed');
      await addTransformationEntry(historyPath, 'v1.1.0', 'def456', 'transformed');

      const history = await readHistory(historyPath);

      expect(history.entries).toHaveLength(2);
      expect(history.entries[0].version).toBe('v1.1.0'); // Newest first
      expect(history.entries[1].version).toBe('v1.0.0');
    });

    test('updates latestVersion on each addition', async () => {
      await addTransformationEntry(historyPath, 'v1.0.0', 'abc123', 'transformed');

      let history = await readHistory(historyPath);
      expect(history.latestVersion).toBe('v1.0.0');

      await addTransformationEntry(historyPath, 'v1.1.0', 'def456', 'transformed');

      history = await readHistory(historyPath);
      expect(history.latestVersion).toBe('v1.1.0');
    });
  });

  describe('updateTransformationStatus', () => {
    beforeEach(async () => {
      await addTransformationEntry(historyPath, 'v1.0.0', 'abc123', 'transformed');
    });

    test('updates status of existing entry', async () => {
      await updateTransformationStatus(historyPath, 'v1.0.0', 'failed', 'Agent failed');

      const history = await readHistory(historyPath);

      expect(history.entries[0].status).toBe('failed');
      expect(history.entries[0].errorDetails).toBe('Agent failed');
    });

    test('throws error for non-existent version', async () => {
      try {
        await updateTransformationStatus(historyPath, 'v99.0.0', 'failed', 'Error');
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(TransformationHistoryError);
        expect((error as Error).message).toContain('not found');
      }
    });
  });

  describe('addFactoringMapping', () => {
    beforeEach(async () => {
      await addTransformationEntry(historyPath, 'v1.0.0', 'abc123', 'transformed');
    });

    test('adds mapping to existing entry', async () => {
      const mapping: FactoringMapping = {
        source: '.claude/commands/tasks.md',
        generated: '.claude/commands/speck.tasks.md',
        type: 'command',
      };

      await addFactoringMapping(historyPath, 'v1.0.0', mapping);

      const history = await readHistory(historyPath);

      expect(history.entries[0].mappings).toHaveLength(1);
      expect(history.entries[0].mappings[0].source).toBe('.claude/commands/tasks.md');
    });

    test('appends to existing mappings', async () => {
      const mapping1: FactoringMapping = {
        source: 'file1.md',
        generated: 'speck.file1.md',
        type: 'command',
      };
      const mapping2: FactoringMapping = {
        source: 'file2.md',
        generated: 'speck.file2.md',
        type: 'agent',
      };

      await addFactoringMapping(historyPath, 'v1.0.0', mapping1);
      await addFactoringMapping(historyPath, 'v1.0.0', mapping2);

      const history = await readHistory(historyPath);

      expect(history.entries[0].mappings).toHaveLength(2);
    });

    test('throws error for non-existent version', async () => {
      const mapping: FactoringMapping = {
        source: 'file.md',
        generated: 'speck.file.md',
        type: 'command',
      };

      try {
        await addFactoringMapping(historyPath, 'v99.0.0', mapping);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(TransformationHistoryError);
      }
    });
  });

  describe('getPreviousFactoringDecision', () => {
    beforeEach(async () => {
      const mappings1: FactoringMapping[] = [
        {
          source: '.claude/commands/plan.md',
          generated: '.claude/commands/speck.plan.md',
          type: 'command',
        },
      ];

      const mappings2: FactoringMapping[] = [
        {
          source: '.claude/commands/plan.md',
          generated: '.claude/commands/speck.plan.md',
          type: 'command',
          description: 'Updated in v1.1.0',
        },
      ];

      await addTransformationEntry(historyPath, 'v1.0.0', 'abc123', 'transformed', mappings1);
      await addTransformationEntry(historyPath, 'v1.1.0', 'def456', 'transformed', mappings2);
    });

    test('returns most recent mapping for source', async () => {
      const mapping = await getPreviousFactoringDecision(historyPath, '.claude/commands/plan.md');

      expect(mapping).toBeDefined();
      expect(mapping?.description).toBe('Updated in v1.1.0');
    });

    test('returns undefined for non-existent source', async () => {
      const mapping = await getPreviousFactoringDecision(
        historyPath,
        '.claude/commands/nonexistent.md'
      );

      expect(mapping).toBeUndefined();
    });

    test('returns undefined for empty history', async () => {
      const emptyPath = join(tempDir, 'empty-history.json');
      const mapping = await getPreviousFactoringDecision(emptyPath, '.claude/commands/plan.md');

      expect(mapping).toBeUndefined();
    });
  });

  describe('getLatestTransformedVersion', () => {
    test('returns latest successful transformation', async () => {
      await addTransformationEntry(historyPath, 'v1.0.0', 'abc123', 'transformed');
      await addTransformationEntry(historyPath, 'v1.1.0', 'def456', 'failed');
      await addTransformationEntry(historyPath, 'v1.2.0', 'ghi789', 'transformed');

      const latestVersion = await getLatestTransformedVersion(historyPath);

      expect(latestVersion).toBe('v1.2.0'); // Most recent successful
    });

    test('returns undefined for empty history', async () => {
      const latestVersion = await getLatestTransformedVersion(historyPath);

      expect(latestVersion).toBeUndefined();
    });

    test('returns undefined when all transformations failed', async () => {
      await addTransformationEntry(historyPath, 'v1.0.0', 'abc123', 'failed');
      await addTransformationEntry(historyPath, 'v1.1.0', 'def456', 'failed');

      const latestVersion = await getLatestTransformedVersion(historyPath);

      expect(latestVersion).toBeUndefined();
    });
  });

  describe('incremental transformation workflow', () => {
    test('supports incremental transformation decision-making', async () => {
      // First transformation
      await addTransformationEntry(historyPath, 'v1.0.0', 'abc123', 'transformed', [
        {
          source: '.claude/commands/plan.md',
          generated: '.claude/agents/speck.plan-workflow.md',
          type: 'agent',
          rationale: 'Multi-step workflow >3 steps',
        },
      ]);

      // Check previous decision during v1.1.0 transformation
      const previousDecision = await getPreviousFactoringDecision(
        historyPath,
        '.claude/commands/plan.md'
      );

      expect(previousDecision).toBeDefined();
      expect(previousDecision?.type).toBe('agent');
      expect(previousDecision?.generated).toBe('.claude/agents/speck.plan-workflow.md');

      // Make consistent decision for v1.1.0
      await addTransformationEntry(historyPath, 'v1.1.0', 'def456', 'transformed', [
        {
          source: '.claude/commands/plan.md',
          generated: '.claude/agents/speck.plan-workflow.md', // Same as before
          type: 'agent',
          rationale: 'Consistent with v1.0.0 factoring decision',
        },
      ]);

      const history = await readHistory(historyPath);

      expect(history.entries).toHaveLength(2);
      expect(history.entries[0].mappings[0].generated).toBe(
        history.entries[1].mappings[0].generated
      );
    });
  });
});
