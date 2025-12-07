/**
 * Integration tests for Agent 1 failure handling
 *
 * Tests the early failure behavior for User Story 4:
 * - Agent 1 failure cleans up staging
 * - Production files remain unchanged
 * - Agent 2 is never invoked
 *
 * Task: T034, T035 [US4] [TEST]
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
} from '../../plugins/speck/scripts/transform-upstream/index';

describe('Agent 1 Failure Integration (US4)', () => {
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

  describe('Partial Staging Cleanup (T034)', () => {
    it('cleans up staging when Agent 1 fails before writing any files', async () => {
      const baseline = await createProductionBaseline(env);

      const initResult = await initializeStaging('v2.1.0');
      expect(initResult.success).toBe(true);
      const context = initResult.context!;

      // Agent 1 fails immediately (no files written)
      const agent1Result = await recordAgent1Complete(context, {
        success: false,
        filesWritten: [],
        error: 'Bash script contains unsupported syntax: process substitution',
        duration: 50,
      });

      expect(agent1Result.success).toBe(false);
      expect(agent1Result.error).toContain('Agent 1 failed');

      // Staging should be cleaned up
      expect(existsSync(context.rootDir)).toBe(false);

      // Production unchanged
      const unchanged = await verifyProductionUnchanged(env, baseline);
      expect(unchanged).toBe(true);
    });

    it('cleans up staging when Agent 1 fails after partial writes', async () => {
      const baseline = await createProductionBaseline(env);

      const initResult = await initializeStaging('v2.1.0');
      const context = initResult.context!;
      const dirs = getStagingOutputDirs(context);

      // Agent 1 writes some files before failing
      await Bun.write(join(dirs.scriptsDir, 'partial1.ts'), '// partial 1');
      await Bun.write(join(dirs.scriptsDir, 'partial2.ts'), '// partial 2');

      // Agent 1 fails midway
      const agent1Result = await recordAgent1Complete(context, {
        success: false,
        filesWritten: [join(dirs.scriptsDir, 'partial1.ts'), join(dirs.scriptsDir, 'partial2.ts')],
        error: 'Transformation failed on third script: unresolved dependency',
        duration: 800,
      });

      expect(agent1Result.success).toBe(false);

      // Staging should be completely removed
      expect(existsSync(context.rootDir)).toBe(false);
      expect(existsSync(join(dirs.scriptsDir, 'partial1.ts'))).toBe(false);
      expect(existsSync(join(dirs.scriptsDir, 'partial2.ts'))).toBe(false);

      // Production unchanged
      const unchanged = await verifyProductionUnchanged(env, baseline);
      expect(unchanged).toBe(true);
    });

    it('cleans up nested directory structures on Agent 1 failure', async () => {
      const initResult = await initializeStaging('v2.1.0');
      const context = initResult.context!;
      const dirs = getStagingOutputDirs(context);

      // Agent 1 writes nested structure
      const commonDir = join(dirs.scriptsDir, 'common');
      await Bun.write(join(commonDir, 'file-ops.ts'), '// file ops');
      await Bun.write(join(commonDir, 'json-tracker.ts'), '// json tracker');
      await Bun.write(join(dirs.scriptsDir, 'check-prerequisites.ts'), '// prereq');

      // Agent 1 fails
      await recordAgent1Complete(context, {
        success: false,
        filesWritten: [
          join(commonDir, 'file-ops.ts'),
          join(commonDir, 'json-tracker.ts'),
          join(dirs.scriptsDir, 'check-prerequisites.ts'),
        ],
        error: 'Failed to transform nested script',
        duration: 600,
      });

      // Entire staging tree should be gone
      expect(existsSync(context.rootDir)).toBe(false);

      // Verify nested dirs don't exist in production (they weren't there before)
      expect(existsSync(join(env.speckDir, 'scripts', 'common', 'file-ops.ts'))).toBe(false);
    });
  });

  describe('Agent 2 Never Invoked (T035)', () => {
    it('does not allow recording Agent 2 after Agent 1 fails', async () => {
      const initResult = await initializeStaging('v2.1.0');
      const context = initResult.context!;

      // Agent 1 fails
      const agent1Result = await recordAgent1Complete(context, {
        success: false,
        filesWritten: [],
        error: 'Agent 1 crashed',
        duration: 100,
      });

      expect(agent1Result.success).toBe(false);

      // Staging is gone, so we can't record Agent 2
      // (In practice, the orchestration would stop before calling Agent 2)
      expect(agent1Result.context).toBeUndefined();
    });

    it('error message includes original Agent 1 failure reason', async () => {
      const initResult = await initializeStaging('v2.1.0');
      const context = initResult.context!;

      const originalError = 'Transform strategy conflict: script uses both Bun Shell and exec()';
      const agent1Result = await recordAgent1Complete(context, {
        success: false,
        filesWritten: [],
        error: originalError,
        duration: 200,
      });

      expect(agent1Result.error).toContain(originalError);
    });
  });

  describe('Error Details Preservation', () => {
    it('preserves Agent 1 error details for debugging', async () => {
      const initResult = await initializeStaging('v2.1.0');
      const context = initResult.context!;

      const detailedError = [
        'Transformation failed for: check-prerequisites.sh',
        'Line 45: unrecognized command substitution syntax',
        'Expected: $(cmd) or `cmd`',
        'Found: ${ cmd }',
      ].join('\n');

      const agent1Result = await recordAgent1Complete(context, {
        success: false,
        filesWritten: [],
        error: detailedError,
        duration: 150,
      });

      expect(agent1Result.error).toContain('check-prerequisites.sh');
      expect(agent1Result.error).toContain('Line 45');
    });
  });

  describe('Production Protection', () => {
    it('never touches production even if staged files have same names', async () => {
      // Get original content of production files
      const existingScriptPath = join(env.speckDir, 'scripts', 'existing-script.ts');
      const originalContent = await Bun.file(existingScriptPath).text();

      const initResult = await initializeStaging('v2.1.0');
      const context = initResult.context!;
      const dirs = getStagingOutputDirs(context);

      // Stage a file with the same name as production file
      await Bun.write(
        join(dirs.scriptsDir, 'existing-script.ts'),
        '// NEW VERSION - should not appear'
      );

      // Agent 1 fails
      await recordAgent1Complete(context, {
        success: false,
        filesWritten: [join(dirs.scriptsDir, 'existing-script.ts')],
        error: 'Subsequent script failed',
        duration: 300,
      });

      // Production file should be unchanged
      const currentContent = await Bun.file(existingScriptPath).text();
      expect(currentContent).toBe(originalContent);
      expect(currentContent).not.toContain('NEW VERSION');
    });
  });
});
