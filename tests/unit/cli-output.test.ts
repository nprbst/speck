/**
 * Unit Tests: CLI Output Formatting
 *
 * Tests for the output formatter module (.speck/scripts/lib/output-formatter.ts)
 * Per Constitution Principle XII: TDD - tests written before implementation
 *
 * Feature: 015-scope-simplification
 * Tasks: T030, T031, T031a
 */

import { describe, test, expect } from 'bun:test';

// Types from the contracts (will be implemented)
import type { HookInputPayload } from '../../specs/015-scope-simplification/contracts/cli-interface';

// Import the output formatter module (TDD: will fail until implemented)
import {
  formatJsonOutput,
  formatHookOutput,
  readHookInput,
  detectInputMode,
  detectOutputMode,
} from '../../plugins/speck/scripts/lib/output-formatter';

describe('T030: JSON Output Format', () => {
  describe('formatJsonOutput()', () => {
    test('returns JsonOutput structure with ok: true on success', () => {
      const result = formatJsonOutput({
        success: true,
        data: { foo: 'bar' },
        command: 'test-command',
      });

      expect(result.ok).toBe(true);
      expect(result.result).toEqual({ foo: 'bar' });
      expect(result.error).toBeUndefined();
      expect(result.meta.command).toBe('test-command');
      expect(result.meta.timestamp).toBeDefined();
      expect(result.meta.duration_ms).toBeGreaterThanOrEqual(0);
    });

    test('returns JsonOutput structure with ok: false on failure', () => {
      const result = formatJsonOutput({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Feature directory not found',
          recovery: ['Run /speck.specify first'],
        },
        command: 'check-prerequisites',
      });

      expect(result.ok).toBe(false);
      expect(result.result).toBeUndefined();
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('NOT_FOUND');
      expect(result.error?.message).toBe('Feature directory not found');
      expect(result.error?.recovery).toContain('Run /speck.specify first');
    });

    test('includes duration_ms in meta', () => {
      const startTime = Date.now();
      const result = formatJsonOutput({
        success: true,
        data: {},
        command: 'env',
        startTime,
      });

      expect(result.meta.duration_ms).toBeGreaterThanOrEqual(0);
      expect(typeof result.meta.duration_ms).toBe('number');
    });

    test('includes ISO timestamp in meta', () => {
      const result = formatJsonOutput({
        success: true,
        data: {},
        command: 'env',
      });

      // Should be valid ISO timestamp
      const timestamp = new Date(result.meta.timestamp);
      expect(timestamp.toISOString()).toBe(result.meta.timestamp);
    });

    test('serializes to valid JSON string', () => {
      const output = formatJsonOutput({
        success: true,
        data: { nested: { value: 123 } },
        command: 'test',
      });

      const jsonString = JSON.stringify(output);
      const parsed = JSON.parse(jsonString);
      expect(parsed.ok).toBe(true);
      expect(parsed.result.nested.value).toBe(123);
    });
  });
});

describe('T031: Hook Output Format', () => {
  describe('formatHookOutput()', () => {
    test('returns HookOutput with context for UserPromptSubmit hooks', () => {
      const result = formatHookOutput({
        hookType: 'UserPromptSubmit',
        context: '<!-- SPECK_CONTEXT -->\nFeature dir: /path/to/feature',
      });

      expect(result.context).toContain('SPECK_CONTEXT');
      expect(result.message).toBeUndefined();
    });

    test('returns HookOutput with hookSpecificOutput.additionalContext for SessionStart', () => {
      const result = formatHookOutput({
        hookType: 'SessionStart',
        additionalContext: 'Session handoff content here',
      });

      expect(result.hookSpecificOutput).toBeDefined();
      expect(result.hookSpecificOutput?.additionalContext).toBe('Session handoff content here');
    });

    test('returns HookOutput with allow for PreToolUse hooks', () => {
      const result = formatHookOutput({
        hookType: 'PreToolUse',
        allow: true,
        message: 'Command allowed',
      });

      expect(result.allow).toBe(true);
      expect(result.message).toBe('Command allowed');
    });

    test('returns empty object for passthrough', () => {
      const result = formatHookOutput({
        hookType: 'PreToolUse',
        passthrough: true,
      });

      expect(Object.keys(result)).toHaveLength(0);
    });

    test('serializes to valid JSON', () => {
      const output = formatHookOutput({
        hookType: 'UserPromptSubmit',
        context: 'Test context',
      });

      const jsonString = JSON.stringify(output);
      expect(() => JSON.parse(jsonString)).not.toThrow();
    });
  });
});

describe('T031a: Hook Input Mode (stdin JSON parsing)', () => {
  describe('readHookInput()', () => {
    test('parses valid HookInputPayload from stdin', async () => {
      const mockInput: HookInputPayload = {
        hookType: 'UserPromptSubmit',
        userPrompt: 'Run the tests',
        sessionContext: {
          workingDirectory: '/path/to/repo',
          conversationId: 'test-123',
          isInteractive: true,
        },
      };

      // Mock stdin with JSON input
      const input = await readHookInput(JSON.stringify(mockInput));

      expect(input).toBeDefined();
      expect(input?.hookType).toBe('UserPromptSubmit');
      expect(input?.userPrompt).toBe('Run the tests');
      expect(input?.sessionContext?.workingDirectory).toBe('/path/to/repo');
    });

    test('parses PreToolUse payload with tool details', async () => {
      const mockInput: HookInputPayload = {
        hookType: 'PreToolUse',
        toolName: 'Bash',
        toolInput: {
          command: 'npm test',
          description: 'Run tests',
        },
      };

      const input = await readHookInput(JSON.stringify(mockInput));

      expect(input?.hookType).toBe('PreToolUse');
      expect(input?.toolName).toBe('Bash');
      expect(input?.toolInput?.command).toBe('npm test');
    });

    test('returns undefined for empty stdin', async () => {
      const input = await readHookInput('');
      expect(input).toBeUndefined();
    });

    test('returns undefined for invalid JSON', async () => {
      const input = await readHookInput('not valid json {');
      expect(input).toBeUndefined();
    });

    test('handles SessionStart hook payload', async () => {
      const mockInput: HookInputPayload = {
        hookType: 'SessionStart',
        sessionContext: {
          workingDirectory: '/path/to/worktree',
        },
      };

      const input = await readHookInput(JSON.stringify(mockInput));

      expect(input?.hookType).toBe('SessionStart');
      expect(input?.sessionContext?.workingDirectory).toBe('/path/to/worktree');
    });
  });

  describe('detectInputMode()', () => {
    test("returns 'hook' when --hook flag is present", () => {
      const mode = detectInputMode({ hook: true });
      expect(mode).toBe('hook');
    });

    test("returns 'default' when --hook flag is absent", () => {
      const mode = detectInputMode({ hook: false });
      expect(mode).toBe('default');
    });

    test("returns 'default' when options object is empty", () => {
      const mode = detectInputMode({});
      expect(mode).toBe('default');
    });
  });

  describe('detectOutputMode()', () => {
    test("returns 'hook' when --hook flag is present (highest precedence)", () => {
      const mode = detectOutputMode({ hook: true, json: true });
      expect(mode).toBe('hook');
    });

    test("returns 'json' when only --json flag is present", () => {
      const mode = detectOutputMode({ json: true });
      expect(mode).toBe('json');
    });

    test("returns 'human' when no flags present", () => {
      const mode = detectOutputMode({});
      expect(mode).toBe('human');
    });

    test('--hook overrides --json', () => {
      const mode = detectOutputMode({ json: true, hook: true });
      expect(mode).toBe('hook');
    });
  });
});

describe('Output Contract Conformance', () => {
  test('JsonOutput matches specs/015-scope-simplification/contracts/cli-interface.ts', () => {
    const output = formatJsonOutput({
      success: true,
      data: { test: true },
      command: 'test',
    });

    // Verify all required fields from JsonOutput interface
    expect(typeof output.ok).toBe('boolean');
    expect(output.meta).toBeDefined();
    expect(typeof output.meta.command).toBe('string');
    expect(typeof output.meta.timestamp).toBe('string');
    expect(typeof output.meta.duration_ms).toBe('number');

    // result or error should be present (not both)
    if (output.ok) {
      expect(output.result).toBeDefined();
    } else {
      expect(output.error).toBeDefined();
    }
  });

  test('HookOutput matches specs/015-scope-simplification/contracts/cli-interface.ts', () => {
    // UserPromptSubmit format
    const userPromptOutput = formatHookOutput({
      hookType: 'UserPromptSubmit',
      context: 'test context',
    });
    expect(userPromptOutput.context).toBeDefined();

    // SessionStart format
    const sessionOutput = formatHookOutput({
      hookType: 'SessionStart',
      additionalContext: 'session context',
    });
    expect(sessionOutput.hookSpecificOutput?.additionalContext).toBeDefined();

    // PreToolUse format
    const preToolOutput = formatHookOutput({
      hookType: 'PreToolUse',
      allow: true,
    });
    expect(preToolOutput.allow).toBeDefined();
  });
});
