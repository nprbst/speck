/**
 * Integration tests for file conflict detection
 *
 * Tests the conflict detection behavior (FR-012):
 * - Detect when production files were modified during staging
 * - Provide conflict details to user
 * - Allow force commit if user approves
 *
 * Task: T049, T050 [TEST]
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { createStagingTestEnv, type StagingTestEnv } from '../helpers/staging-helpers';
import {
  initializeStaging,
  getStagingOutputDirs,
  recordAgent1Complete,
  recordAgent2Complete,
  commitStagingToProduction,
} from '../../.speck/scripts/transform-upstream/index';

describe('Conflict Detection Integration (FR-012)', () => {
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

  describe('detectFileConflicts (T049)', () => {
    it('detects when production file is modified during staging', async () => {
      // Initialize staging (captures baseline)
      const initResult = await initializeStaging('v2.1.0');
      const context = initResult.context!;
      const dirs = getStagingOutputDirs(context);

      // Agents write to staging
      await Bun.write(join(dirs.scriptsDir, 'test.ts'), '// staged version');

      const agent1Result = await recordAgent1Complete(context, {
        success: true,
        filesWritten: [join(dirs.scriptsDir, 'test.ts')],
        duration: 500,
      });

      const agent2Result = await recordAgent2Complete(agent1Result.context!, {
        success: true,
        filesWritten: [],
        duration: 500,
      });

      // Simulate production file being modified during staging
      await new Promise((resolve) => setTimeout(resolve, 50)); // Ensure mtime difference
      await Bun.write(
        join(env.speckDir, 'scripts', 'existing-script.ts'),
        '// MODIFIED BY ANOTHER PROCESS'
      );

      // Try to commit - should detect conflict
      const commitResult = await commitStagingToProduction(agent2Result.context!);

      expect(commitResult.success).toBe(false);
      expect(commitResult.conflicts).toBeDefined();
      expect(commitResult.conflicts!.length).toBeGreaterThan(0);
      expect(commitResult.error).toContain('conflicts detected');
    });

    it('returns no conflicts when production unchanged', async () => {
      const initResult = await initializeStaging('v2.1.0');
      const context = initResult.context!;
      const dirs = getStagingOutputDirs(context);

      // Stage new file only (not touching existing production file)
      await Bun.write(join(dirs.scriptsDir, 'brand-new.ts'), '// new file');

      const agent1Result = await recordAgent1Complete(context, {
        success: true,
        filesWritten: [join(dirs.scriptsDir, 'brand-new.ts')],
        duration: 500,
      });

      const agent2Result = await recordAgent2Complete(agent1Result.context!, {
        success: true,
        filesWritten: [],
        duration: 500,
      });

      // Don't modify production files

      // Commit should succeed without conflicts
      const commitResult = await commitStagingToProduction(agent2Result.context!);

      expect(commitResult.success).toBe(true);
      expect(commitResult.conflicts).toBeUndefined();
    });

    it('includes conflict details with file path and mtime info', async () => {
      const initResult = await initializeStaging('v2.1.0');
      const context = initResult.context!;
      const dirs = getStagingOutputDirs(context);

      await Bun.write(join(dirs.scriptsDir, 'test.ts'), '// staged');

      const agent1Result = await recordAgent1Complete(context, {
        success: true,
        filesWritten: [join(dirs.scriptsDir, 'test.ts')],
        duration: 500,
      });

      const agent2Result = await recordAgent2Complete(agent1Result.context!, {
        success: true,
        filesWritten: [],
        duration: 500,
      });

      // Modify production file
      await new Promise((resolve) => setTimeout(resolve, 50));
      await Bun.write(join(env.speckDir, 'scripts', 'existing-script.ts'), '// MODIFIED');

      const commitResult = await commitStagingToProduction(agent2Result.context!);

      expect(commitResult.conflicts).toBeDefined();
      const conflict = commitResult.conflicts![0]!;
      expect(conflict.path).toContain('existing-script.ts');
      expect(conflict.baselineMtime).toBeDefined();
      expect(conflict.currentMtime).toBeDefined();
      expect(conflict.currentMtime).toBeGreaterThan(conflict.baselineMtime!);
    });
  });

  describe('Force Commit (T052, T053)', () => {
    it('allows commit with forceCommit flag despite conflicts', async () => {
      const initResult = await initializeStaging('v2.1.0');
      const context = initResult.context!;
      const dirs = getStagingOutputDirs(context);

      // Stage file to overwrite existing
      const newContent = '// new version from staging';
      await Bun.write(join(dirs.scriptsDir, 'existing-script.ts'), newContent);

      const agent1Result = await recordAgent1Complete(context, {
        success: true,
        filesWritten: [join(dirs.scriptsDir, 'existing-script.ts')],
        duration: 500,
      });

      const agent2Result = await recordAgent2Complete(agent1Result.context!, {
        success: true,
        filesWritten: [],
        duration: 500,
      });

      // Modify production file to create conflict
      await new Promise((resolve) => setTimeout(resolve, 50));
      await Bun.write(
        join(env.speckDir, 'scripts', 'existing-script.ts'),
        '// CONFLICT: modified during staging'
      );

      // Commit without force - should fail
      const normalResult = await commitStagingToProduction(agent2Result.context!, false);
      expect(normalResult.success).toBe(false);

      // Need to reload context since staging is still there
      const initResult2 = await initializeStaging('v2.1.1');
      expect(initResult2.success).toBe(false); // Blocked by existing staging

      // Commit with force flag on original context
      const forceResult = await commitStagingToProduction(agent2Result.context!, true);
      expect(forceResult.success).toBe(true);

      // Verify staged version was committed
      const content = await Bun.file(join(env.speckDir, 'scripts', 'existing-script.ts')).text();
      expect(content).toBe(newContent);
    });
  });

  describe('Conflict Detection with Multiple Files', () => {
    it('detects conflicts in multiple files', async () => {
      // Create additional production files
      await Bun.write(join(env.speckDir, 'scripts', 'file1.ts'), '// file1');
      await Bun.write(join(env.speckDir, 'scripts', 'file2.ts'), '// file2');
      await Bun.write(join(env.claudeDir, 'commands', 'speck.cmd1.md'), '# cmd1');

      const initResult = await initializeStaging('v2.1.0');
      const context = initResult.context!;
      const dirs = getStagingOutputDirs(context);

      await Bun.write(join(dirs.scriptsDir, 'test.ts'), '// staged');

      const agent1Result = await recordAgent1Complete(context, {
        success: true,
        filesWritten: [join(dirs.scriptsDir, 'test.ts')],
        duration: 500,
      });

      const agent2Result = await recordAgent2Complete(agent1Result.context!, {
        success: true,
        filesWritten: [],
        duration: 500,
      });

      // Modify multiple production files
      await new Promise((resolve) => setTimeout(resolve, 50));
      await Bun.write(join(env.speckDir, 'scripts', 'file1.ts'), '// MODIFIED');
      await Bun.write(join(env.claudeDir, 'commands', 'speck.cmd1.md'), '# MODIFIED');

      const commitResult = await commitStagingToProduction(agent2Result.context!);

      expect(commitResult.success).toBe(false);
      expect(commitResult.conflicts!.length).toBe(2);
    });
  });

  describe('Conflict Detection Edge Cases', () => {
    it('handles deleted production file as conflict', async () => {
      const initResult = await initializeStaging('v2.1.0');
      const context = initResult.context!;
      const dirs = getStagingOutputDirs(context);

      await Bun.write(join(dirs.scriptsDir, 'test.ts'), '// staged');

      const agent1Result = await recordAgent1Complete(context, {
        success: true,
        filesWritten: [join(dirs.scriptsDir, 'test.ts')],
        duration: 500,
      });

      const agent2Result = await recordAgent2Complete(agent1Result.context!, {
        success: true,
        filesWritten: [],
        duration: 500,
      });

      // Delete a production file that was in baseline
      const fileToDelete = join(env.speckDir, 'scripts', 'existing-script.ts');
      expect(existsSync(fileToDelete)).toBe(true);
      await Bun.file(fileToDelete).delete();
      expect(existsSync(fileToDelete)).toBe(false);

      const commitResult = await commitStagingToProduction(agent2Result.context!);

      // File deletion is also a conflict
      expect(commitResult.success).toBe(false);
      expect(commitResult.conflicts!.length).toBeGreaterThan(0);
    });
  });
});
