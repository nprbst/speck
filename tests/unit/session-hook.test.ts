/**
 * Unit Tests for Session Start Hook
 *
 * Tests for SessionStart hook JSON output format and self-cleanup logic.
 *
 * @feature 015-scope-simplification
 * @tasks T043a, T043b
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmSync, existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

// Import the module we're testing (will be created later)
const getHandoffModule = async () => {
  try {
    return await import('../../plugins/speck/scripts/worktree/handoff');
  } catch {
    return null;
  }
};

describe('SessionStart Hook JSON Output Format (T043a)', () => {
  describe('generateHookOutput', () => {
    test('generates valid JSON with hookSpecificOutput structure', async () => {
      const handoff = await getHandoffModule();
      if (!handoff) {
        expect(handoff).not.toBeNull();
        return;
      }

      const handoffContent = '# Feature Handoff\n\nTest content here.';
      const output = handoff.generateHookOutput(handoffContent);

      // Parse as JSON
      const parsed = JSON.parse(output);

      expect(parsed.hookSpecificOutput).toBeDefined();
      expect(parsed.hookSpecificOutput.hookEventName).toBe('SessionStart');
      expect(parsed.hookSpecificOutput.additionalContext).toBeDefined();
    });

    test('includes handoff content in additionalContext', async () => {
      const handoff = await getHandoffModule();
      if (!handoff) {
        expect(handoff).not.toBeNull();
        return;
      }

      const handoffContent = '# Feature Handoff: Test Feature\n\nThis is the context.';
      const output = handoff.generateHookOutput(handoffContent);
      const parsed = JSON.parse(output);

      expect(parsed.hookSpecificOutput.additionalContext).toContain(
        'Feature Handoff: Test Feature'
      );
      expect(parsed.hookSpecificOutput.additionalContext).toContain('This is the context');
    });

    test('properly escapes special JSON characters in content', async () => {
      const handoff = await getHandoffModule();
      if (!handoff) {
        expect(handoff).not.toBeNull();
        return;
      }

      const handoffContent = 'Content with "quotes" and\nnewlines\tand\ttabs';
      const output = handoff.generateHookOutput(handoffContent);

      // Should be valid JSON
      expect(() => JSON.parse(output)).not.toThrow();

      const parsed = JSON.parse(output);
      // Content should be preserved when parsed
      expect(parsed.hookSpecificOutput.additionalContext).toContain('quotes');
      expect(parsed.hookSpecificOutput.additionalContext).toContain('newlines');
    });

    test('handles empty content gracefully', async () => {
      const handoff = await getHandoffModule();
      if (!handoff) {
        expect(handoff).not.toBeNull();
        return;
      }

      const output = handoff.generateHookOutput('');
      const parsed = JSON.parse(output);

      expect(parsed.hookSpecificOutput.additionalContext).toBe('');
    });

    test('handles content with unicode characters', async () => {
      const handoff = await getHandoffModule();
      if (!handoff) {
        expect(handoff).not.toBeNull();
        return;
      }

      const handoffContent = 'Unicode: \u2713 \u2717 \u2022 \u00e9\u00e8\u00ea';
      const output = handoff.generateHookOutput(handoffContent);

      expect(() => JSON.parse(output)).not.toThrow();

      const parsed = JSON.parse(output);
      expect(parsed.hookSpecificOutput.additionalContext).toContain('\u2713');
    });
  });

  describe('Hook script shell template', () => {
    test('generates valid bash script', async () => {
      const handoff = await getHandoffModule();
      if (!handoff) {
        expect(handoff).not.toBeNull();
        return;
      }

      const script = handoff.HANDOFF_HOOK_SCRIPT;

      expect(script).toContain('#!/bin/bash');
      expect(script).toContain('HANDOFF_FILE');
      expect(script).toContain('hookSpecificOutput');
      expect(script).toContain('additionalContext');
    });

    test('uses jq -Rs for JSON encoding', async () => {
      const handoff = await getHandoffModule();
      if (!handoff) {
        expect(handoff).not.toBeNull();
        return;
      }

      const script = handoff.HANDOFF_HOOK_SCRIPT;

      // Should use jq -Rs for safe JSON encoding
      expect(script).toContain('jq -Rs');
    });

    test('exits silently when no handoff file exists', async () => {
      const handoff = await getHandoffModule();
      if (!handoff) {
        expect(handoff).not.toBeNull();
        return;
      }

      const script = handoff.HANDOFF_HOOK_SCRIPT;

      // Should check for file existence and exit cleanly
      expect(script).toMatch(/\[ [!-] -f.*\].*exit 0/s);
    });
  });
});

describe('Hook Self-Cleanup Logic (T043b)', () => {
  let testDir: string;
  let worktreePath: string;

  beforeEach(() => {
    testDir = mkdtempSync(path.join(tmpdir(), 'speck-hook-cleanup-test-'));
    worktreePath = path.join(testDir, 'worktree');
    mkdirSync(worktreePath, { recursive: true });
  });

  afterEach(() => {
    if (testDir && existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('archiveHandoff', () => {
    test('renames handoff.md to handoff.done.md', async () => {
      const handoff = await getHandoffModule();
      if (!handoff) {
        expect(handoff).not.toBeNull();
        return;
      }

      // Create handoff file
      const speckDir = path.join(worktreePath, '.speck');
      mkdirSync(speckDir, { recursive: true });
      const handoffPath = path.join(speckDir, 'handoff.md');
      writeFileSync(handoffPath, '# Handoff Content');

      // Archive the handoff
      await handoff.archiveHandoff(worktreePath);

      // Original file should not exist
      expect(existsSync(handoffPath)).toBe(false);

      // Archived file should exist
      const archivedPath = path.join(speckDir, 'handoff.done.md');
      expect(existsSync(archivedPath)).toBe(true);

      // Content should be preserved
      const content = readFileSync(archivedPath, 'utf-8');
      expect(content).toBe('# Handoff Content');
    });

    test('does nothing if handoff.md does not exist', async () => {
      const handoff = await getHandoffModule();
      if (!handoff) {
        expect(handoff).not.toBeNull();
        return;
      }

      // Should not throw - call directly and verify no exception
      let threw = false;
      try {
        await handoff.archiveHandoff(worktreePath);
      } catch {
        threw = true;
      }
      expect(threw).toBe(false);
    });

    test('overwrites existing handoff.done.md', async () => {
      const handoff = await getHandoffModule();
      if (!handoff) {
        expect(handoff).not.toBeNull();
        return;
      }

      const speckDir = path.join(worktreePath, '.speck');
      mkdirSync(speckDir, { recursive: true });

      // Create existing archived file
      const archivedPath = path.join(speckDir, 'handoff.done.md');
      writeFileSync(archivedPath, '# Old Content');

      // Create new handoff file
      const handoffPath = path.join(speckDir, 'handoff.md');
      writeFileSync(handoffPath, '# New Content');

      // Archive
      await handoff.archiveHandoff(worktreePath);

      // Archived file should have new content
      const content = readFileSync(archivedPath, 'utf-8');
      expect(content).toBe('# New Content');
    });
  });

  describe('removeSessionStartHook', () => {
    test('removes SessionStart hook from settings.json', async () => {
      const handoff = await getHandoffModule();
      if (!handoff) {
        expect(handoff).not.toBeNull();
        return;
      }

      // Create settings.json with SessionStart hook
      const claudeDir = path.join(worktreePath, '.claude');
      mkdirSync(claudeDir, { recursive: true });
      const settingsPath = path.join(claudeDir, 'settings.json');

      const settings = {
        hooks: {
          SessionStart: [
            {
              matcher: '',
              hooks: [
                {
                  type: 'command',
                  command: '$CLAUDE_PROJECT_DIR/.claude/scripts/handoff.sh',
                },
              ],
            },
          ],
          PreToolUse: [
            {
              matcher: '.*',
              hooks: [{ type: 'command', command: 'some-other-hook' }],
            },
          ],
        },
        otherSetting: 'value',
      };
      writeFileSync(settingsPath, JSON.stringify(settings, null, 2));

      // Remove SessionStart hook
      await handoff.removeSessionStartHook(worktreePath);

      // Read updated settings
      const updatedSettings = JSON.parse(readFileSync(settingsPath, 'utf-8'));

      // SessionStart should be removed
      expect(updatedSettings.hooks.SessionStart).toBeUndefined();

      // Other hooks should remain
      expect(updatedSettings.hooks.PreToolUse).toBeDefined();

      // Other settings should remain
      expect(updatedSettings.otherSetting).toBe('value');
    });

    test('does nothing if settings.json does not exist', async () => {
      const handoff = await getHandoffModule();
      if (!handoff) {
        expect(handoff).not.toBeNull();
        return;
      }

      // Should not throw - call directly and verify no exception
      let threw = false;
      try {
        await handoff.removeSessionStartHook(worktreePath);
      } catch {
        threw = true;
      }
      expect(threw).toBe(false);
    });

    test('does nothing if SessionStart hook not present', async () => {
      const handoff = await getHandoffModule();
      if (!handoff) {
        expect(handoff).not.toBeNull();
        return;
      }

      const claudeDir = path.join(worktreePath, '.claude');
      mkdirSync(claudeDir, { recursive: true });
      const settingsPath = path.join(claudeDir, 'settings.json');

      const settings = {
        hooks: {
          PreToolUse: [{ matcher: '.*', hooks: [] }],
        },
      };
      writeFileSync(settingsPath, JSON.stringify(settings, null, 2));

      // Should not throw
      await handoff.removeSessionStartHook(worktreePath);

      // Settings should be unchanged
      const updatedSettings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
      expect(updatedSettings.hooks.PreToolUse).toBeDefined();
    });

    test('removes hooks key if empty after SessionStart removal', async () => {
      const handoff = await getHandoffModule();
      if (!handoff) {
        expect(handoff).not.toBeNull();
        return;
      }

      const claudeDir = path.join(worktreePath, '.claude');
      mkdirSync(claudeDir, { recursive: true });
      const settingsPath = path.join(claudeDir, 'settings.json');

      const settings = {
        hooks: {
          SessionStart: [{ matcher: '', hooks: [] }],
        },
        otherSetting: 'value',
      };
      writeFileSync(settingsPath, JSON.stringify(settings, null, 2));

      await handoff.removeSessionStartHook(worktreePath);

      const updatedSettings = JSON.parse(readFileSync(settingsPath, 'utf-8'));

      // Empty hooks object can optionally be removed
      // This test accepts either empty hooks or no hooks key
      if (updatedSettings.hooks) {
        expect(Object.keys(updatedSettings.hooks)).toHaveLength(0);
      }
      expect(updatedSettings.otherSetting).toBe('value');
    });
  });

  describe('Hook script self-cleanup behavior', () => {
    test('hook script includes handoff archival', async () => {
      const handoff = await getHandoffModule();
      if (!handoff) {
        expect(handoff).not.toBeNull();
        return;
      }

      const script = handoff.HANDOFF_HOOK_SCRIPT;

      // Should rename handoff file
      expect(script).toContain('mv');
      // Uses bash parameter expansion to change .md to .done.md
      expect(script).toContain('.done.md');
    });

    test('hook script includes settings.json cleanup', async () => {
      const handoff = await getHandoffModule();
      if (!handoff) {
        expect(handoff).not.toBeNull();
        return;
      }

      const script = handoff.HANDOFF_HOOK_SCRIPT;

      // Should modify settings.json to remove hook
      expect(script).toContain('jq');
      expect(script).toContain('del(');
      expect(script).toContain('SessionStart');
    });

    test('hook script handles missing jq gracefully', async () => {
      const handoff = await getHandoffModule();
      if (!handoff) {
        expect(handoff).not.toBeNull();
        return;
      }

      const script = handoff.HANDOFF_HOOK_SCRIPT;

      // Should check if jq is available before using it for cleanup
      expect(script).toContain('command -v jq');
    });
  });
});
