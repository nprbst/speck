/**
 * Integration tests for successful transformation flow
 *
 * Tests the complete staging lifecycle for User Story 1:
 * - Initialize staging
 * - Agent 1 writes to staging
 * - Record Agent 1 success
 * - Agent 2 writes to staging
 * - Record Agent 2 success
 * - Commit staging to production
 * - Verify production files
 * - Verify staging cleanup
 *
 * Task: T019 [US1] [TEST]
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
  commitStagingToProduction,
} from '../../packages/maintainer/src/transform-upstream/index';

describe('Transform Success Integration', () => {
  let env: StagingTestEnv;
  let originalCwd: string;

  beforeEach(async () => {
    env = await createStagingTestEnv({
      withScripts: true,
      withCommands: true,
    });
    // Change to test directory for orchestration functions that use process.cwd()
    originalCwd = process.cwd();
    process.chdir(env.rootDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await env.cleanup();
  });

  describe('Full Transformation Lifecycle', () => {
    it('completes full transformation: staging → agents → commit → production', async () => {
      // Step 1: Initialize staging
      const initResult = await initializeStaging('v2.1.0');
      expect(initResult.success).toBe(true);
      expect(initResult.context).toBeDefined();

      const context = initResult.context!;
      expect(context.metadata.status).toBe('staging');
      expect(context.targetVersion).toBe('v2.1.0');

      // Verify staging directories exist
      const dirs = getStagingOutputDirs(context);
      expect(existsSync(dirs.scriptsDir)).toBe(true);
      expect(existsSync(dirs.commandsDir)).toBe(true);
      expect(existsSync(dirs.agentsDir)).toBe(true);
      expect(existsSync(dirs.skillsDir)).toBe(true);

      // Step 2: Simulate Agent 1 writing files to staging
      await Bun.write(
        join(dirs.scriptsDir, 'check-prerequisites.ts'),
        '// Transformed script\nexport async function checkPrerequisites() { return true; }\n'
      );
      await Bun.write(
        join(dirs.scriptsDir, 'setup-plan.ts'),
        '// Transformed script\nexport async function setupPlan() { return {}; }\n'
      );

      // Step 3: Record Agent 1 completion
      const agent1Result = await recordAgent1Complete(context, {
        success: true,
        filesWritten: [
          join(dirs.scriptsDir, 'check-prerequisites.ts'),
          join(dirs.scriptsDir, 'setup-plan.ts'),
        ],
        duration: 1500,
      });
      expect(agent1Result.success).toBe(true);
      expect(agent1Result.context).toBeDefined();
      expect(agent1Result.context!.metadata.status).toBe('agent1-complete');

      // Step 4: Simulate Agent 2 writing files to staging
      await Bun.write(
        join(dirs.commandsDir, 'speck.plan.md'),
        '---\ndescription: Planning command\n---\n\n## Plan workflow\n'
      );
      await Bun.write(
        join(dirs.agentsDir, 'speck.plan-workflow.md'),
        '---\ndescription: Planning workflow agent\n---\n\n## Agent\n'
      );
      await Bun.write(
        join(dirs.skillsDir, 'speck.load-context.md'),
        '---\ndescription: Context loading skill\n---\n\n## Skill\n'
      );

      // Step 5: Record Agent 2 completion
      const agent2Result = await recordAgent2Complete(agent1Result.context!, {
        success: true,
        filesWritten: [
          join(dirs.commandsDir, 'speck.plan.md'),
          join(dirs.agentsDir, 'speck.plan-workflow.md'),
          join(dirs.skillsDir, 'speck.load-context.md'),
        ],
        duration: 2000,
      });
      expect(agent2Result.success).toBe(true);
      expect(agent2Result.context).toBeDefined();
      expect(agent2Result.context!.metadata.status).toBe('ready');

      // Step 6: Commit staging to production
      const commitResult = await commitStagingToProduction(agent2Result.context!);
      expect(commitResult.success).toBe(true);
      expect(commitResult.filesCommitted).toBeDefined();
      expect(commitResult.filesCommitted!.length).toBe(5); // 2 scripts + 1 command + 1 agent + 1 skill

      // Step 7: Verify files in production
      expect(existsSync(join(env.speckDir, 'scripts', 'check-prerequisites.ts'))).toBe(true);
      expect(existsSync(join(env.speckDir, 'scripts', 'setup-plan.ts'))).toBe(true);
      expect(existsSync(join(env.claudeDir, 'commands', 'speck.plan.md'))).toBe(true);
      expect(existsSync(join(env.claudeDir, 'agents', 'speck.plan-workflow.md'))).toBe(true);
      expect(existsSync(join(env.claudeDir, 'skills', 'speck.load-context.md'))).toBe(true);

      // Step 8: Verify staging directory is cleaned up
      expect(existsSync(context.rootDir)).toBe(false);

      // Step 9: Verify file contents
      const scriptContent = await Bun.file(
        join(env.speckDir, 'scripts', 'check-prerequisites.ts')
      ).text();
      expect(scriptContent).toContain('Transformed script');
    });

    it('preserves existing production files during commit', async () => {
      // Capture baseline of existing files
      const baseline = await createProductionBaseline(env);
      expect(Object.keys(baseline).length).toBeGreaterThan(0);

      // Run full transformation
      const initResult = await initializeStaging('v2.1.0');
      const context = initResult.context!;
      const dirs = getStagingOutputDirs(context);

      // Write new files only (not overwriting existing)
      await Bun.write(join(dirs.scriptsDir, 'brand-new-script.ts'), '// brand new');

      const agent1Result = await recordAgent1Complete(context, {
        success: true,
        filesWritten: [join(dirs.scriptsDir, 'brand-new-script.ts')],
        duration: 500,
      });

      const agent2Result = await recordAgent2Complete(agent1Result.context!, {
        success: true,
        filesWritten: [],
        duration: 500,
      });

      await commitStagingToProduction(agent2Result.context!);

      // Verify baseline files unchanged
      const unchanged = await verifyProductionUnchanged(env, baseline);
      expect(unchanged).toBe(true);

      // Verify new file added
      expect(existsSync(join(env.speckDir, 'scripts', 'brand-new-script.ts'))).toBe(true);
    });

    it('overwrites production files when staged version exists', async () => {
      // Run transformation that overwrites existing file
      const initResult = await initializeStaging('v2.1.0');
      const context = initResult.context!;
      const dirs = getStagingOutputDirs(context);

      const newContent = '// Updated content from transformation';
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

      await commitStagingToProduction(agent2Result.context!);

      // Verify file was overwritten
      const content = await Bun.file(join(env.speckDir, 'scripts', 'existing-script.ts')).text();
      expect(content).toBe(newContent);
    });
  });

  describe('Staging Output Directories', () => {
    it('returns correct staging paths for agents to use', async () => {
      const initResult = await initializeStaging('v2.1.0');
      const context = initResult.context!;

      const dirs = getStagingOutputDirs(context);

      expect(dirs.scriptsDir).toContain('.transform-staging');
      expect(dirs.scriptsDir).toContain('v2.1.0');
      expect(dirs.scriptsDir).toContain('scripts');

      expect(dirs.commandsDir).toContain('commands');
      expect(dirs.agentsDir).toContain('agents');
      expect(dirs.skillsDir).toContain('skills');
    });
  });

  describe('Agent Result Recording', () => {
    it('records agent results in staging metadata', async () => {
      const initResult = await initializeStaging('v2.1.0');
      const context = initResult.context!;

      // Record Agent 1
      const agent1Files = ['file1.ts', 'file2.ts'];
      const agent1Result = await recordAgent1Complete(context, {
        success: true,
        filesWritten: agent1Files,
        duration: 1234,
      });

      expect(agent1Result.context!.metadata.agentResults.agent1).not.toBeNull();
      expect(agent1Result.context!.metadata.agentResults.agent1!.success).toBe(true);
      expect(agent1Result.context!.metadata.agentResults.agent1!.filesWritten).toEqual(agent1Files);
      expect(agent1Result.context!.metadata.agentResults.agent1!.duration).toBe(1234);

      // Record Agent 2
      const agent2Files = ['cmd.md'];
      const agent2Result = await recordAgent2Complete(agent1Result.context!, {
        success: true,
        filesWritten: agent2Files,
        duration: 5678,
      });

      expect(agent2Result.context!.metadata.agentResults.agent2).not.toBeNull();
      expect(agent2Result.context!.metadata.agentResults.agent2!.success).toBe(true);
      expect(agent2Result.context!.metadata.agentResults.agent2!.filesWritten).toEqual(agent2Files);
      expect(agent2Result.context!.metadata.agentResults.agent2!.duration).toBe(5678);
    });

    it('persists agent results to staging.json', async () => {
      const initResult = await initializeStaging('v2.1.0');
      const context = initResult.context!;

      await recordAgent1Complete(context, {
        success: true,
        filesWritten: ['test.ts'],
        duration: 100,
      });

      // Read staging.json directly
      const metadata = await Bun.file(join(context.rootDir, 'staging.json')).json();

      expect(metadata.agentResults.agent1).not.toBeNull();
      expect(metadata.agentResults.agent1.success).toBe(true);
    });
  });

  describe('Empty Agent Runs', () => {
    it('handles transformation with no changed scripts (skip Agent 1)', async () => {
      const initResult = await initializeStaging('v2.1.0');
      const context = initResult.context!;
      const dirs = getStagingOutputDirs(context);

      // Agent 1 skipped (no bash scripts changed) - record empty result
      const agent1Result = await recordAgent1Complete(context, {
        success: true,
        filesWritten: [],
        duration: 0,
      });
      expect(agent1Result.success).toBe(true);

      // Agent 2 writes commands
      await Bun.write(join(dirs.commandsDir, 'speck.test.md'), '# test');

      const agent2Result = await recordAgent2Complete(agent1Result.context!, {
        success: true,
        filesWritten: [join(dirs.commandsDir, 'speck.test.md')],
        duration: 1000,
      });

      const commitResult = await commitStagingToProduction(agent2Result.context!);
      expect(commitResult.success).toBe(true);
      expect(existsSync(join(env.claudeDir, 'commands', 'speck.test.md'))).toBe(true);
    });

    it('handles transformation with no changed commands (skip Agent 2)', async () => {
      const initResult = await initializeStaging('v2.1.0');
      const context = initResult.context!;
      const dirs = getStagingOutputDirs(context);

      // Agent 1 writes scripts
      await Bun.write(join(dirs.scriptsDir, 'script.ts'), '// script');

      const agent1Result = await recordAgent1Complete(context, {
        success: true,
        filesWritten: [join(dirs.scriptsDir, 'script.ts')],
        duration: 1000,
      });

      // Agent 2 skipped (no commands changed) - record empty result
      const agent2Result = await recordAgent2Complete(agent1Result.context!, {
        success: true,
        filesWritten: [],
        duration: 0,
      });

      const commitResult = await commitStagingToProduction(agent2Result.context!);
      expect(commitResult.success).toBe(true);
      expect(existsSync(join(env.speckDir, 'scripts', 'script.ts'))).toBe(true);
    });

    it('handles transformation with no changes at all', async () => {
      const initResult = await initializeStaging('v2.1.0');
      const context = initResult.context!;

      // Both agents skipped
      const agent1Result = await recordAgent1Complete(context, {
        success: true,
        filesWritten: [],
        duration: 0,
      });

      const agent2Result = await recordAgent2Complete(agent1Result.context!, {
        success: true,
        filesWritten: [],
        duration: 0,
      });

      const commitResult = await commitStagingToProduction(agent2Result.context!);
      expect(commitResult.success).toBe(true);
      expect(commitResult.filesCommitted).toEqual([]);
    });
  });

  describe('Nested Directory Support', () => {
    it('commits files in nested directories correctly', async () => {
      const initResult = await initializeStaging('v2.1.0');
      const context = initResult.context!;
      const dirs = getStagingOutputDirs(context);

      // Create nested structure in scripts
      const commonDir = join(dirs.scriptsDir, 'common');
      await Bun.write(join(commonDir, 'utils.ts'), '// utils');
      await Bun.write(join(commonDir, 'types.ts'), '// types');

      const agent1Result = await recordAgent1Complete(context, {
        success: true,
        filesWritten: [join(commonDir, 'utils.ts'), join(commonDir, 'types.ts')],
        duration: 500,
      });

      const agent2Result = await recordAgent2Complete(agent1Result.context!, {
        success: true,
        filesWritten: [],
        duration: 0,
      });

      await commitStagingToProduction(agent2Result.context!);

      // Verify nested files in production
      expect(existsSync(join(env.speckDir, 'scripts', 'common', 'utils.ts'))).toBe(true);
      expect(existsSync(join(env.speckDir, 'scripts', 'common', 'types.ts'))).toBe(true);
    });
  });
});
