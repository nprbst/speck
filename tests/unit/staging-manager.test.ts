/**
 * Unit tests for Staging Manager
 *
 * Tests staging lifecycle functions:
 * - createStagingDirectory()
 * - listStagedFiles()
 * - updateStagingStatus()
 * - captureProductionBaseline()
 * - commitStaging()
 * - rollbackStaging()
 * - detectOrphanedStaging()
 * - getStagingStatus()
 * - inspectStaging()
 * - detectFileConflicts()
 * - generateFileManifest()
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  createStagingTestEnv,
  createMockStagingDirectory,
  createMockStagingMetadata,
  readMockStagingMetadata,
  listMockStagingFiles,
  type StagingTestEnv,
  type MockStagedFile,
} from '../helpers/staging-helpers';
import {
  createStagingDirectory,
  listStagedFiles,
  updateStagingStatus,
  captureProductionBaseline,
  commitStaging,
  rollbackStaging,
  detectOrphanedStaging,
  getStagingStatus,
  inspectStaging,
  detectFileConflicts,
  generateFileManifest,
  loadStagingContext,
} from '../../plugins/speck/scripts/common/staging-manager';
import type { StagingContext, StagingStatus } from '../../plugins/speck/scripts/common/staging-types';

describe('createStagingDirectory', () => {
  let env: StagingTestEnv;

  beforeEach(async () => {
    env = await createStagingTestEnv({ withScripts: true, withCommands: true });
  });

  afterEach(async () => {
    await env.cleanup();
  });

  it('creates staging directory with correct structure', async () => {
    const context = await createStagingDirectory(env.rootDir, 'v2.1.0');

    // Verify root directory exists
    expect(existsSync(context.rootDir)).toBe(true);
    expect(context.rootDir).toContain('.transform-staging');
    expect(context.rootDir).toContain('v2.1.0');

    // Verify subdirectories exist
    expect(existsSync(context.scriptsDir)).toBe(true);
    expect(existsSync(context.commandsDir)).toBe(true);
    expect(existsSync(context.agentsDir)).toBe(true);
    expect(existsSync(context.skillsDir)).toBe(true);

    // Verify subdirectory paths
    expect(context.scriptsDir).toBe(join(context.rootDir, 'scripts'));
    expect(context.commandsDir).toBe(join(context.rootDir, 'commands'));
    expect(context.agentsDir).toBe(join(context.rootDir, 'agents'));
    expect(context.skillsDir).toBe(join(context.rootDir, 'skills'));
  });

  it('creates staging.json metadata file', async () => {
    const context = await createStagingDirectory(env.rootDir, 'v2.1.0');

    const metadataPath = join(context.rootDir, 'staging.json');
    expect(existsSync(metadataPath)).toBe(true);

    const metadata = await Bun.file(metadataPath).json();
    expect(metadata.status).toBe('staging');
    expect(metadata.targetVersion).toBe('v2.1.0');
    expect(metadata.startTime).toBeTruthy();
  });

  it('sets initial status to "staging"', async () => {
    const context = await createStagingDirectory(env.rootDir, 'v2.1.0');

    expect(context.metadata.status).toBe('staging');
  });

  it('sets target version correctly', async () => {
    const context = await createStagingDirectory(env.rootDir, 'v3.0.0-beta');

    expect(context.targetVersion).toBe('v3.0.0-beta');
    expect(context.metadata.targetVersion).toBe('v3.0.0-beta');
  });

  it('initializes empty agent results', async () => {
    const context = await createStagingDirectory(env.rootDir, 'v2.1.0');

    expect(context.metadata.agentResults.agent1).toBeNull();
    expect(context.metadata.agentResults.agent2).toBeNull();
  });

  it('captures start time', async () => {
    const before = new Date().toISOString();
    const context = await createStagingDirectory(env.rootDir, 'v2.1.0');
    const after = new Date().toISOString();

    expect(context.metadata.startTime >= before).toBe(true);
    expect(context.metadata.startTime <= after).toBe(true);
  });

  it('handles previous version parameter', async () => {
    const context = await createStagingDirectory(env.rootDir, 'v2.1.0', 'v2.0.0');

    expect(context.metadata.previousVersion).toBe('v2.0.0');
  });

  it('sets previousVersion to null when not provided', async () => {
    const context = await createStagingDirectory(env.rootDir, 'v1.0.0');

    expect(context.metadata.previousVersion).toBeNull();
  });
});

describe('listStagedFiles', () => {
  let env: StagingTestEnv;

  beforeEach(async () => {
    env = await createStagingTestEnv();
  });

  afterEach(async () => {
    await env.cleanup();
  });

  it('returns empty array for empty staging directory', async () => {
    const context = await createStagingDirectory(env.rootDir, 'v2.1.0');
    const files = await listStagedFiles(context);

    expect(files).toEqual([]);
  });

  it('lists files in scripts directory', async () => {
    const context = await createStagingDirectory(env.rootDir, 'v2.1.0');

    // Add test file to staging
    await Bun.write(join(context.scriptsDir, 'test-script.ts'), '// test');

    const files = await listStagedFiles(context);

    expect(files).toHaveLength(1);
    expect(files[0]!.category).toBe('scripts');
    expect(files[0]!.relativePath).toBe('test-script.ts');
    expect(files[0]!.stagingPath).toBe(join(context.scriptsDir, 'test-script.ts'));
  });

  it('lists files in commands directory', async () => {
    const context = await createStagingDirectory(env.rootDir, 'v2.1.0');

    // Add test file to staging
    await Bun.write(join(context.commandsDir, 'speck.test.md'), '# test');

    const files = await listStagedFiles(context);

    expect(files).toHaveLength(1);
    expect(files[0]!.category).toBe('commands');
    expect(files[0]!.relativePath).toBe('speck.test.md');
  });

  it('lists files across all categories', async () => {
    const context = await createStagingDirectory(env.rootDir, 'v2.1.0');

    // Add test files to each category
    await Bun.write(join(context.scriptsDir, 'script.ts'), '// script');
    await Bun.write(join(context.commandsDir, 'speck.cmd.md'), '# cmd');
    await Bun.write(join(context.agentsDir, 'speck.agent.md'), '# agent');
    await Bun.write(join(context.skillsDir, 'speck.skill.md'), '# skill');

    const files = await listStagedFiles(context);

    expect(files).toHaveLength(4);
    expect(files.map((f) => f.category).sort()).toEqual([
      'agents',
      'commands',
      'scripts',
      'skills',
    ]);
  });

  it('sets correct production paths', async () => {
    const context = await createStagingDirectory(env.rootDir, 'v2.1.0');

    await Bun.write(join(context.scriptsDir, 'my-script.ts'), '// test');

    const files = await listStagedFiles(context);

    expect(files[0]!.productionPath).toBe(join(env.rootDir, '.speck/scripts/my-script.ts'));
  });

  it('handles nested directories correctly', async () => {
    const context = await createStagingDirectory(env.rootDir, 'v2.1.0');

    // Create nested structure
    const nestedDir = join(context.scriptsDir, 'common');
    await Bun.write(join(nestedDir, 'utils.ts'), '// utils');

    const files = await listStagedFiles(context);

    expect(files).toHaveLength(1);
    expect(files[0]!.relativePath).toBe('common/utils.ts');
  });
});

describe('updateStagingStatus', () => {
  let env: StagingTestEnv;

  beforeEach(async () => {
    env = await createStagingTestEnv();
  });

  afterEach(async () => {
    await env.cleanup();
  });

  it('updates status from staging to agent1-complete', async () => {
    const context = await createStagingDirectory(env.rootDir, 'v2.1.0');
    expect(context.metadata.status).toBe('staging');

    const updated = await updateStagingStatus(context, 'agent1-complete');

    expect(updated.metadata.status).toBe('agent1-complete');

    // Verify persisted
    const persisted = await readMockStagingMetadata(context.rootDir);
    expect(persisted?.status).toBe('agent1-complete');
  });

  it('updates status from agent1-complete to agent2-complete', async () => {
    const context = await createStagingDirectory(env.rootDir, 'v2.1.0');
    let updated = await updateStagingStatus(context, 'agent1-complete');
    updated = await updateStagingStatus(updated, 'agent2-complete');

    expect(updated.metadata.status).toBe('agent2-complete');
  });

  it('updates status from agent2-complete to ready', async () => {
    const context = await createStagingDirectory(env.rootDir, 'v2.1.0');
    let updated = await updateStagingStatus(context, 'agent1-complete');
    updated = await updateStagingStatus(updated, 'agent2-complete');
    updated = await updateStagingStatus(updated, 'ready');

    expect(updated.metadata.status).toBe('ready');
  });

  it('allows transition to failed from any non-terminal state', async () => {
    const context = await createStagingDirectory(env.rootDir, 'v2.1.0');
    const updated = await updateStagingStatus(context, 'failed');

    expect(updated.metadata.status).toBe('failed');
  });

  it('persists status changes to staging.json', async () => {
    const context = await createStagingDirectory(env.rootDir, 'v2.1.0');
    await updateStagingStatus(context, 'agent1-complete');

    // Read directly from file
    const metadata = await Bun.file(join(context.rootDir, 'staging.json')).json();
    expect(metadata.status).toBe('agent1-complete');
  });

  it('throws error for invalid status transition', async () => {
    const context = await createStagingDirectory(env.rootDir, 'v2.1.0');

    // Try to skip directly to ready (invalid transition)
    await expect(updateStagingStatus(context, 'ready')).rejects.toThrow();
  });

  it('throws error when transitioning from terminal state', async () => {
    const context = await createStagingDirectory(env.rootDir, 'v2.1.0');
    const failed = await updateStagingStatus(context, 'failed');

    // Cannot transition from terminal state
    await expect(updateStagingStatus(failed, 'staging')).rejects.toThrow();
  });
});

describe('captureProductionBaseline', () => {
  let env: StagingTestEnv;

  beforeEach(async () => {
    env = await createStagingTestEnv({ withScripts: true, withCommands: true });
  });

  afterEach(async () => {
    await env.cleanup();
  });

  it('captures existing production files', async () => {
    const context = await createStagingDirectory(env.rootDir, 'v2.1.0');
    const updated = await captureProductionBaseline(context);

    // Should have captured the existing files from setup
    expect(Object.keys(updated.metadata.productionBaseline.files).length).toBeGreaterThan(0);
  });

  it('records file mtime for existing files', async () => {
    const context = await createStagingDirectory(env.rootDir, 'v2.1.0');
    const updated = await captureProductionBaseline(context);

    const files = updated.metadata.productionBaseline.files;
    const fileKeys = Object.keys(files);

    for (const key of fileKeys) {
      expect(files[key]!.exists).toBe(true);
      expect(files[key]!.mtime).not.toBeNull();
      expect(typeof files[key]!.mtime).toBe('number');
    }
  });

  it('records file size for existing files', async () => {
    const context = await createStagingDirectory(env.rootDir, 'v2.1.0');
    const updated = await captureProductionBaseline(context);

    const files = updated.metadata.productionBaseline.files;
    const fileKeys = Object.keys(files);

    for (const key of fileKeys) {
      expect(files[key]!.size).not.toBeNull();
      expect(files[key]!.size).toBeGreaterThan(0);
    }
  });

  it('captures baseline timestamp', async () => {
    const before = new Date().toISOString();
    const context = await createStagingDirectory(env.rootDir, 'v2.1.0');
    const updated = await captureProductionBaseline(context);
    const after = new Date().toISOString();

    expect(updated.metadata.productionBaseline.capturedAt >= before).toBe(true);
    expect(updated.metadata.productionBaseline.capturedAt <= after).toBe(true);
  });

  it('persists baseline to staging.json', async () => {
    const context = await createStagingDirectory(env.rootDir, 'v2.1.0');
    await captureProductionBaseline(context);

    const metadata = await Bun.file(join(context.rootDir, 'staging.json')).json();
    expect(metadata.productionBaseline).toBeDefined();
    expect(metadata.productionBaseline.capturedAt).toBeTruthy();
  });

  it('handles empty production directories', async () => {
    // Create env without initial files
    const emptyEnv = await createStagingTestEnv();

    try {
      const context = await createStagingDirectory(emptyEnv.rootDir, 'v2.1.0');
      const updated = await captureProductionBaseline(context);

      expect(Object.keys(updated.metadata.productionBaseline.files)).toHaveLength(0);
    } finally {
      await emptyEnv.cleanup();
    }
  });

  it('captures files from all production categories', async () => {
    // Create env with all categories
    const fullEnv = await createStagingTestEnv({
      withScripts: true,
      withCommands: true,
      withAgents: true,
      withSkills: true,
    });

    try {
      const context = await createStagingDirectory(fullEnv.rootDir, 'v2.1.0');
      const updated = await captureProductionBaseline(context);

      const files = updated.metadata.productionBaseline.files;
      const paths = Object.keys(files);

      // Should have files from all categories
      expect(paths.some((p) => p.includes('.speck/scripts'))).toBe(true);
      expect(paths.some((p) => p.includes('.claude/commands'))).toBe(true);
      expect(paths.some((p) => p.includes('.claude/agents'))).toBe(true);
      expect(paths.some((p) => p.includes('.claude/skills'))).toBe(true);
    } finally {
      await fullEnv.cleanup();
    }
  });
});

// ============================================================================
// Phase 3: User Story 1 - commitStaging tests (T018)
// ============================================================================

describe('commitStaging', () => {
  let env: StagingTestEnv;

  beforeEach(async () => {
    env = await createStagingTestEnv({ withScripts: true, withCommands: true });
  });

  afterEach(async () => {
    await env.cleanup();
  });

  it('moves staged files to production directories', async () => {
    // Create staging context and advance to ready state
    let context = await createStagingDirectory(env.rootDir, 'v2.1.0');
    context = await updateStagingStatus(context, 'agent1-complete');
    context = await updateStagingStatus(context, 'agent2-complete');
    context = await updateStagingStatus(context, 'ready');

    // Add staged files
    await Bun.write(join(context.scriptsDir, 'new-script.ts'), '// new script');
    await Bun.write(join(context.commandsDir, 'speck.new-cmd.md'), '# new command');

    // Commit
    const committed = await commitStaging(context);

    // Verify files moved to production
    expect(existsSync(join(env.speckDir, 'scripts', 'new-script.ts'))).toBe(true);
    expect(existsSync(join(env.claudeDir, 'commands', 'speck.new-cmd.md'))).toBe(true);

    // Verify staging directory removed
    expect(existsSync(context.rootDir)).toBe(false);

    // Verify status is committed
    expect(committed.metadata.status).toBe('committed');
  });

  it('throws error if not in ready state', async () => {
    const context = await createStagingDirectory(env.rootDir, 'v2.1.0');

    // Should fail because status is 'staging', not 'ready'
    await expect(commitStaging(context)).rejects.toThrow();
  });

  it('preserves existing production files', async () => {
    // Get baseline of existing files
    const existingScriptPath = join(env.speckDir, 'scripts', 'existing-script.ts');
    const existingContent = await Bun.file(existingScriptPath).text();

    // Create staging and commit new files
    let context = await createStagingDirectory(env.rootDir, 'v2.1.0');
    context = await updateStagingStatus(context, 'agent1-complete');
    context = await updateStagingStatus(context, 'agent2-complete');
    context = await updateStagingStatus(context, 'ready');

    await Bun.write(join(context.scriptsDir, 'new-script.ts'), '// new');
    await commitStaging(context);

    // Verify existing file unchanged
    expect(await Bun.file(existingScriptPath).text()).toBe(existingContent);
  });

  it('overwrites production files with same name', async () => {
    // Create staging with file that has same name as existing
    let context = await createStagingDirectory(env.rootDir, 'v2.1.0');
    context = await updateStagingStatus(context, 'agent1-complete');
    context = await updateStagingStatus(context, 'agent2-complete');
    context = await updateStagingStatus(context, 'ready');

    const newContent = '// updated content from staging';
    await Bun.write(join(context.scriptsDir, 'existing-script.ts'), newContent);

    await commitStaging(context);

    // Verify file was overwritten
    const result = await Bun.file(join(env.speckDir, 'scripts', 'existing-script.ts')).text();
    expect(result).toBe(newContent);
  });

  it('handles files in all categories', async () => {
    let context = await createStagingDirectory(env.rootDir, 'v2.1.0');
    context = await updateStagingStatus(context, 'agent1-complete');
    context = await updateStagingStatus(context, 'agent2-complete');
    context = await updateStagingStatus(context, 'ready');

    // Add files to all categories
    await Bun.write(join(context.scriptsDir, 's.ts'), '// s');
    await Bun.write(join(context.commandsDir, 'c.md'), '# c');
    await Bun.write(join(context.agentsDir, 'a.md'), '# a');
    await Bun.write(join(context.skillsDir, 'k.md'), '# k');

    await commitStaging(context);

    // Verify all files committed
    expect(existsSync(join(env.speckDir, 'scripts', 's.ts'))).toBe(true);
    expect(existsSync(join(env.claudeDir, 'commands', 'c.md'))).toBe(true);
    expect(existsSync(join(env.claudeDir, 'agents', 'a.md'))).toBe(true);
    expect(existsSync(join(env.claudeDir, 'skills', 'k.md'))).toBe(true);
  });

  it('cleans up staging directory after successful commit', async () => {
    let context = await createStagingDirectory(env.rootDir, 'v2.1.0');
    context = await updateStagingStatus(context, 'agent1-complete');
    context = await updateStagingStatus(context, 'agent2-complete');
    context = await updateStagingStatus(context, 'ready');

    await Bun.write(join(context.scriptsDir, 'test.ts'), '// test');

    const stagingDir = context.rootDir;
    expect(existsSync(stagingDir)).toBe(true);

    await commitStaging(context);

    expect(existsSync(stagingDir)).toBe(false);
  });
});

// ============================================================================
// Phase 4: User Story 2 - rollbackStaging tests (T028)
// ============================================================================

describe('rollbackStaging', () => {
  let env: StagingTestEnv;

  beforeEach(async () => {
    env = await createStagingTestEnv({ withScripts: true, withCommands: true });
  });

  afterEach(async () => {
    await env.cleanup();
  });

  it('removes staging directory on rollback', async () => {
    const context = await createStagingDirectory(env.rootDir, 'v2.1.0');

    // Add some staged files
    await Bun.write(join(context.scriptsDir, 'staged.ts'), '// staged');

    const stagingDir = context.rootDir;
    expect(existsSync(stagingDir)).toBe(true);

    await rollbackStaging(context);

    expect(existsSync(stagingDir)).toBe(false);
  });

  it('sets status to rolled-back', async () => {
    const context = await createStagingDirectory(env.rootDir, 'v2.1.0');
    const rolledBack = await rollbackStaging(context);

    expect(rolledBack.metadata.status).toBe('rolled-back');
  });

  it('does not modify production files', async () => {
    // Capture baseline
    const scriptPath = join(env.speckDir, 'scripts', 'existing-script.ts');
    const originalContent = await Bun.file(scriptPath).text();

    // Create staging with files
    const context = await createStagingDirectory(env.rootDir, 'v2.1.0');
    await Bun.write(join(context.scriptsDir, 'new.ts'), '// new');
    await Bun.write(join(context.scriptsDir, 'existing-script.ts'), '// modified');

    // Rollback
    await rollbackStaging(context);

    // Verify production unchanged
    expect(await Bun.file(scriptPath).text()).toBe(originalContent);
    expect(existsSync(join(env.speckDir, 'scripts', 'new.ts'))).toBe(false);
  });

  it('works from any non-terminal state', async () => {
    // Test from staging state
    let ctx1 = await createStagingDirectory(env.rootDir, 'v1.0.0');
    await rollbackStaging(ctx1);
    expect(existsSync(ctx1.rootDir)).toBe(false);

    // Test from agent1-complete state
    let ctx2 = await createStagingDirectory(env.rootDir, 'v2.0.0');
    ctx2 = await updateStagingStatus(ctx2, 'agent1-complete');
    await rollbackStaging(ctx2);
    expect(existsSync(ctx2.rootDir)).toBe(false);

    // Test from ready state
    let ctx3 = await createStagingDirectory(env.rootDir, 'v3.0.0');
    ctx3 = await updateStagingStatus(ctx3, 'agent1-complete');
    ctx3 = await updateStagingStatus(ctx3, 'agent2-complete');
    ctx3 = await updateStagingStatus(ctx3, 'ready');
    await rollbackStaging(ctx3);
    expect(existsSync(ctx3.rootDir)).toBe(false);
  });

  it('throws error when already in terminal state', async () => {
    const context = await createStagingDirectory(env.rootDir, 'v2.1.0');
    const failed = await updateStagingStatus(context, 'failed');

    await expect(rollbackStaging(failed)).rejects.toThrow();
  });
});
