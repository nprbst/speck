import { test, expect, describe, beforeEach, afterEach } from 'bun:test';
import { $ } from 'bun';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { writeFile } from 'fs/promises';
import { setupHookMatchers, parseHookLog, getContractViolations } from '../helpers/hook-assertions';

setupHookMatchers();

describe('Hook Infrastructure Tests', () => {
  const testSessionId = 'test-session-' + Date.now();
  const testLogPath = `.speck/test-logs/session-${testSessionId}.jsonl`;

  beforeEach(() => {
    // Ensure test-logs directory exists
    if (!existsSync('.speck/test-logs')) {
      mkdirSync('.speck/test-logs', { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test logs
    if (existsSync(testLogPath)) {
      rmSync(testLogPath);
    }
  });

  describe('validate-contract.ts (PostToolUse)', () => {
    test('should log contract validation for non-branch commands', async () => {
      const hookInput = {
        session_id: testSessionId,
        cwd: process.cwd(),
        tool_name: 'Bash',
        tool_input: { command: 'echo test' },
        tool_response: {
          exitCode: 0,
          stdout: 'test',
          stderr: '',
        },
      };

      const result = await $`echo ${JSON.stringify(hookInput)} | bun run .speck/hooks/validate-contract.ts`.nothrow();

      expect(result.exitCode).toBe(0);
      expect(existsSync(testLogPath)).toBe(true);

      const events = await parseHookLog(testLogPath);
      expect(events.length).toBeGreaterThan(0);
      expect(events[0]?.type).toBe('contract-validation');
      expect(events[0]?.exitCode).toBe(0);
    });

    test('should validate exit code 2 with valid PR suggestion JSON', async () => {
      const validPRSuggestion = {
        type: 'pr-suggestion',
        prSuggestion: {
          title: 'Add feature',
          description: 'Feature description',
          base: 'main',
          specId: '009-multi-repo-stacked',
        },
      };

      const hookInput = {
        session_id: testSessionId,
        cwd: process.cwd(),
        tool_name: 'Bash',
        tool_input: { command: 'bun run .speck/scripts/branch-command.ts create test' },
        tool_response: {
          exitCode: 2,
          stdout: '',
          stderr: JSON.stringify(validPRSuggestion),
        },
      };

      const result = await $`echo ${JSON.stringify(hookInput)} | bun run .speck/hooks/validate-contract.ts`.nothrow();

      expect(result.exitCode).toBe(0); // Should pass validation

      const events = await parseHookLog(testLogPath);
      const violations = getContractViolations(events);
      expect(violations.length).toBe(0);
    });

    test('should block exit code 2 with invalid PR suggestion JSON', async () => {
      const invalidPRSuggestion = {
        type: 'pr-suggestion',
        prSuggestion: {
          // Missing required fields: title, description, base, specId
        },
      };

      const hookInput = {
        session_id: testSessionId,
        cwd: process.cwd(),
        tool_name: 'Bash',
        tool_input: { command: 'bun run .speck/scripts/branch-command.ts create test' },
        tool_response: {
          exitCode: 2,
          stdout: '',
          stderr: JSON.stringify(invalidPRSuggestion),
        },
      };

      const result = await $`echo ${JSON.stringify(hookInput)} | bun run .speck/hooks/validate-contract.ts`.nothrow();

      expect(result.exitCode).toBe(2); // Should block execution
      expect(result.stderr.toString()).toContain('Contract Violation');

      const events = await parseHookLog(testLogPath);
      const violations = getContractViolations(events);
      expect(violations.length).toBeGreaterThan(0);
    });

    test('should validate exit code 3 with valid import prompt JSON', async () => {
      const validImportPrompt = {
        type: 'import-prompt',
        branches: [
          { branchName: 'feature/test', baseBranch: 'main' },
        ],
        availableSpecs: ['009-multi-repo-stacked'],
      };

      const hookInput = {
        session_id: testSessionId,
        cwd: process.cwd(),
        tool_name: 'Bash',
        tool_input: { command: 'bun run .speck/scripts/branch-command.ts import' },
        tool_response: {
          exitCode: 3,
          stdout: '',
          stderr: JSON.stringify(validImportPrompt),
        },
      };

      const result = await $`echo ${JSON.stringify(hookInput)} | bun run .speck/hooks/validate-contract.ts`.nothrow();

      expect(result.exitCode).toBe(0); // Should pass validation

      const events = await parseHookLog(testLogPath);
      const violations = getContractViolations(events);
      expect(violations.length).toBe(0);
    });
  });

  describe('track-session-context.ts (UserPromptSubmit)', () => {
    test('should track feature references in prompts', async () => {
      const hookInput = {
        session_id: testSessionId,
        prompt: 'Work on 009-multi-repo-stacked feature',
        cwd: process.cwd(),
      };

      const result = await $`echo ${JSON.stringify(hookInput)} | bun run .speck/hooks/track-session-context.ts`.nothrow();

      expect(result.exitCode).toBe(0);

      const events = await parseHookLog(testLogPath);
      const contextEvents = events.filter((e) => e.type === 'session-context');
      expect(contextEvents.length).toBeGreaterThan(0);
      expect(contextEvents[0]?.featureId).toBe('009');
      expect(contextEvents[0]?.featureName).toBe('009-multi-repo-stacked');
    });

    test('should track command references in prompts', async () => {
      const hookInput = {
        session_id: testSessionId,
        prompt: 'Run /speck.branch create test-branch',
        cwd: process.cwd(),
      };

      const result = await $`echo ${JSON.stringify(hookInput)} | bun run .speck/hooks/track-session-context.ts`.nothrow();

      expect(result.exitCode).toBe(0);

      const events = await parseHookLog(testLogPath);
      const contextEvents = events.filter((e) => e.type === 'session-context');
      expect(contextEvents.length).toBeGreaterThan(0);
      expect(contextEvents[0]?.command).toBe('speck.branch');
    });
  });

  describe('validate-session-context.ts (Stop)', () => {
    test('should detect context switches', async () => {
      // Create log with multiple feature references
      await writeFile(
        testLogPath,
        JSON.stringify({ type: 'session-context', featureId: '009', timestamp: Date.now() }) + '\n' +
        JSON.stringify({ type: 'session-context', featureId: '008', timestamp: Date.now() }) + '\n',
        { flag: 'w' }
      );

      const hookInput = {
        session_id: testSessionId,
        cwd: process.cwd(),
      };

      const result = await $`echo ${JSON.stringify(hookInput)} | bun run .speck/hooks/validate-session-context.ts`.nothrow();

      expect(result.exitCode).toBe(0);
      expect(result.stderr.toString()).toContain('Context Switch Detected');

      const events = await parseHookLog(testLogPath);
      const contextSwitches = events.filter((e) => e.type === 'context-switch');
      expect(contextSwitches.length).toBeGreaterThan(0);
    });

    test('should validate workflow sequences', async () => {
      // Create log with specify → plan → tasks workflow
      await writeFile(
        testLogPath,
        JSON.stringify({ type: 'session-context', command: 'speck.specify', timestamp: Date.now() }) + '\n' +
        JSON.stringify({ type: 'session-context', command: 'speck.plan', timestamp: Date.now() }) + '\n' +
        JSON.stringify({ type: 'session-context', command: 'speck.tasks', timestamp: Date.now() }) + '\n',
        { flag: 'w' }
      );

      const hookInput = {
        session_id: testSessionId,
        cwd: process.cwd(),
      };

      const result = await $`echo ${JSON.stringify(hookInput)} | bun run .speck/hooks/validate-session-context.ts`.nothrow();

      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString()).toContain('specify-plan-tasks');

      const events = await parseHookLog(testLogPath);
      const workflowEvents = events.filter((e) => e.type === 'workflow-complete');
      expect(workflowEvents.length).toBeGreaterThan(0);
      expect(workflowEvents[0]?.workflow).toBe('specify-plan-tasks');
    });
  });

  describe('validate-multi-repo-detection.ts (PreToolUse)', () => {
    test('should detect single-repo mode when no .speck-link exists', async () => {
      const hookInput = {
        session_id: testSessionId,
        cwd: process.cwd(),
        tool_name: 'SlashCommand',
        tool_input: { command: '/speck.specify "Test feature"' },
      };

      const result = await $`echo ${JSON.stringify(hookInput)} | bun run .speck/hooks/validate-multi-repo-detection.ts`.nothrow();

      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString()).toContain('Single-repo mode');

      const events = await parseHookLog(testLogPath);
      const detectionEvents = events.filter((e) => e.type === 'multi-repo-detection');
      expect(detectionEvents.length).toBeGreaterThan(0);
      expect(detectionEvents[0]?.mode).toBe('single-repo');
      expect(detectionEvents[0]?.speckLinkExists).toBe(false);
    });

    test('should skip validation for non-SlashCommand tools', async () => {
      const hookInput = {
        session_id: testSessionId,
        cwd: process.cwd(),
        tool_name: 'Bash',
        tool_input: { command: 'echo test' },
      };

      const result = await $`echo ${JSON.stringify(hookInput)} | bun run .speck/hooks/validate-multi-repo-detection.ts`.nothrow();

      expect(result.exitCode).toBe(0);

      // Should not create any log entries
      const events = await parseHookLog(testLogPath);
      const detectionEvents = events.filter((e) => e.type === 'multi-repo-detection');
      expect(detectionEvents.length).toBe(0);
    });
  });
});
