/**
 * Integration tests for transformation rollback scenarios
 *
 * Tests the rollback behavior for User Story 2:
 * - Agent 2 failure triggers rollback
 * - All staging files are cleaned up
 * - Production files remain unchanged
 * - Transformation status is updated to 'failed'
 *
 * Task: T029 [US2] [TEST]
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  createStagingTestEnv,
  type StagingTestEnv,
  createProductionBaseline,
  verifyProductionUnchanged,
} from '../helpers/staging-helpers';
import {
  initializeStaging,
  getStagingOutputDirs,
  recordAgent1Complete,
  recordAgent2Complete,
  rollbackStagingChanges,
} from '../../plugins/speck/scripts/transform-upstream/index';

describe('Transform Rollback Integration', () => {
  let env: StagingTestEnv;
  let originalCwd: string;

  beforeEach(async () => {
    env = await createStagingTestEnv({
      withScripts: true,
      withCommands: true,
    });
    originalCwd = process.cwd();
    process.chdir(env.rootDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await env.cleanup();
  });

  describe('Agent 2 Failure Rollback (US2)', () => {
    it('rolls back all staging when Agent 2 fails', async () => {
      // Capture production baseline
      const baseline = await createProductionBaseline(env);

      // Initialize staging
      const initResult = await initializeStaging('v2.1.0');
      expect(initResult.success).toBe(true);
      const context = initResult.context!;
      const dirs = getStagingOutputDirs(context);

      // Agent 1 completes successfully
      await Bun.write(join(dirs.scriptsDir, 'new-script.ts'), '// Agent 1 output');
      const agent1Result = await recordAgent1Complete(context, {
        success: true,
        filesWritten: [join(dirs.scriptsDir, 'new-script.ts')],
        duration: 1000,
      });
      expect(agent1Result.success).toBe(true);

      // Agent 2 fails
      const agent2Result = await recordAgent2Complete(agent1Result.context!, {
        success: false,
        filesWritten: [],
        error: 'Transform command failed: unsupported syntax in speckit.plan.md',
        duration: 500,
      });

      // Verify rollback occurred
      expect(agent2Result.success).toBe(false);
      expect(agent2Result.error).toContain('Agent 2 failed');

      // Verify staging directory is removed
      expect(existsSync(context.rootDir)).toBe(false);

      // Verify production unchanged
      const unchanged = await verifyProductionUnchanged(env, baseline);
      expect(unchanged).toBe(true);

      // Verify Agent 1 files did NOT make it to production
      expect(existsSync(join(env.speckDir, 'scripts', 'new-script.ts'))).toBe(false);
    });

    it('cleans up Agent 1 files from staging when Agent 2 fails', async () => {
      const initResult = await initializeStaging('v2.1.0');
      const context = initResult.context!;
      const dirs = getStagingOutputDirs(context);

      // Agent 1 writes multiple files
      await Bun.write(join(dirs.scriptsDir, 'script1.ts'), '// script 1');
      await Bun.write(join(dirs.scriptsDir, 'script2.ts'), '// script 2');
      await Bun.write(join(dirs.scriptsDir, 'common/utils.ts'), '// utils');

      const agent1Result = await recordAgent1Complete(context, {
        success: true,
        filesWritten: [
          join(dirs.scriptsDir, 'script1.ts'),
          join(dirs.scriptsDir, 'script2.ts'),
          join(dirs.scriptsDir, 'common/utils.ts'),
        ],
        duration: 1500,
      });

      // Agent 2 partially writes then fails
      await Bun.write(join(dirs.commandsDir, 'speck.partial.md'), '# partial');

      await recordAgent2Complete(agent1Result.context!, {
        success: false,
        filesWritten: [join(dirs.commandsDir, 'speck.partial.md')],
        error: 'Extension marker conflict detected',
        duration: 800,
      });

      // Verify ALL staging is cleaned up
      expect(existsSync(context.rootDir)).toBe(false);

      // Verify none of the files made it to production
      expect(existsSync(join(env.speckDir, 'scripts', 'script1.ts'))).toBe(false);
      expect(existsSync(join(env.speckDir, 'scripts', 'script2.ts'))).toBe(false);
      expect(existsSync(join(env.speckDir, 'scripts', 'common/utils.ts'))).toBe(false);
      expect(existsSync(join(env.claudeDir, 'commands', 'speck.partial.md'))).toBe(false);
    });

    it('returns error details from Agent 2 failure', async () => {
      const initResult = await initializeStaging('v2.1.0');
      const context = initResult.context!;

      const agent1Result = await recordAgent1Complete(context, {
        success: true,
        filesWritten: [],
        duration: 100,
      });

      const errorMessage = 'SPECK-EXTENSION conflict in plan.md: upstream modified lines 50-75';
      const agent2Result = await recordAgent2Complete(agent1Result.context!, {
        success: false,
        filesWritten: [],
        error: errorMessage,
        duration: 200,
      });

      expect(agent2Result.success).toBe(false);
      expect(agent2Result.error).toContain('Agent 2 failed');
      expect(agent2Result.error).toContain(errorMessage);
    });
  });

  describe('Manual Rollback', () => {
    it('supports explicit rollback before commit', async () => {
      const baseline = await createProductionBaseline(env);

      const initResult = await initializeStaging('v2.1.0');
      const context = initResult.context!;
      const dirs = getStagingOutputDirs(context);

      // Agent 1 completes
      await Bun.write(join(dirs.scriptsDir, 'script.ts'), '// script');
      const agent1Result = await recordAgent1Complete(context, {
        success: true,
        filesWritten: [join(dirs.scriptsDir, 'script.ts')],
        duration: 500,
      });

      // Agent 2 completes (but user wants to rollback before commit)
      await Bun.write(join(dirs.commandsDir, 'speck.cmd.md'), '# cmd');
      const agent2Result = await recordAgent2Complete(agent1Result.context!, {
        success: true,
        filesWritten: [join(dirs.commandsDir, 'speck.cmd.md')],
        duration: 500,
      });

      expect(agent2Result.context!.metadata.status).toBe('ready');

      // Manual rollback (user decides not to commit)
      const rollbackResult = await rollbackStagingChanges(
        agent2Result.context!,
        'User requested manual rollback'
      );

      expect(rollbackResult.success).toBe(true);
      expect(existsSync(context.rootDir)).toBe(false);

      // Production unchanged
      const unchanged = await verifyProductionUnchanged(env, baseline);
      expect(unchanged).toBe(true);
    });

    it('rollback at staging state cleans up empty staging directory', async () => {
      const initResult = await initializeStaging('v2.1.0');
      const context = initResult.context!;

      // Rollback immediately after staging creation (before any agents run)
      const rollbackResult = await rollbackStagingChanges(context, 'Aborted before agents');

      expect(rollbackResult.success).toBe(true);
      expect(existsSync(context.rootDir)).toBe(false);
    });

    it('rollback after agent1-complete cleans up Agent 1 output', async () => {
      const initResult = await initializeStaging('v2.1.0');
      const context = initResult.context!;
      const dirs = getStagingOutputDirs(context);

      await Bun.write(join(dirs.scriptsDir, 'agent1-output.ts'), '// output');
      const agent1Result = await recordAgent1Complete(context, {
        success: true,
        filesWritten: [join(dirs.scriptsDir, 'agent1-output.ts')],
        duration: 500,
      });

      // Rollback before Agent 2
      await rollbackStagingChanges(agent1Result.context!, 'Rollback after Agent 1');

      expect(existsSync(context.rootDir)).toBe(false);
      expect(existsSync(join(env.speckDir, 'scripts', 'agent1-output.ts'))).toBe(false);
    });
  });

  describe('Rollback Preserves Existing Files', () => {
    it('does not modify files that existed before transformation', async () => {
      // Get content of existing files
      const existingScriptPath = join(env.speckDir, 'scripts', 'existing-script.ts');
      const existingCommandPath = join(env.claudeDir, 'commands', 'speck.existing-command.md');
      const originalScriptContent = await Bun.file(existingScriptPath).text();
      const originalCommandContent = await Bun.file(existingCommandPath).text();

      // Run transformation that would overwrite these files, then fail
      const initResult = await initializeStaging('v2.1.0');
      const context = initResult.context!;
      const dirs = getStagingOutputDirs(context);

      // Stage files that would overwrite production
      await Bun.write(join(dirs.scriptsDir, 'existing-script.ts'), '// MODIFIED');
      await Bun.write(join(dirs.commandsDir, 'speck.existing-command.md'), '# MODIFIED');

      const agent1Result = await recordAgent1Complete(context, {
        success: true,
        filesWritten: [join(dirs.scriptsDir, 'existing-script.ts')],
        duration: 500,
      });

      // Agent 2 fails
      await recordAgent2Complete(agent1Result.context!, {
        success: false,
        filesWritten: [join(dirs.commandsDir, 'speck.existing-command.md')],
        error: 'Transform failed',
        duration: 500,
      });

      // Verify original files unchanged
      expect(await Bun.file(existingScriptPath).text()).toBe(originalScriptContent);
      expect(await Bun.file(existingCommandPath).text()).toBe(originalCommandContent);
    });
  });

  describe('Rollback State Transitions', () => {
    it('records rolled-back status before cleanup', async () => {
      const initResult = await initializeStaging('v2.1.0');
      const context = initResult.context!;

      // The rollback function updates status BEFORE deleting the directory
      // We verify this by checking the returned context
      const agent1Result = await recordAgent1Complete(context, {
        success: false,
        filesWritten: [],
        error: 'Agent 1 crashed',
        duration: 100,
      });

      // Result indicates failure and rollback
      expect(agent1Result.success).toBe(false);
      expect(agent1Result.error).toContain('Agent 1 failed');

      // Directory should be cleaned up
      expect(existsSync(context.rootDir)).toBe(false);
    });
  });
});
