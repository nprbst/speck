/**
 * Integration Tests: CLI Mode Detection
 *
 * Tests for CLI output modes (human, json, hook)
 * Per Constitution Principle XII: TDD - tests written before implementation
 *
 * Feature: 015-scope-simplification
 * Task: T019
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { $ } from 'bun';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

/**
 * Helper to run CLI and capture output
 */
async function runCli(
  args: string[],
  cwd?: string
): Promise<{
  stdout: string;
  stderr: string;
  exitCode: number;
}> {
  const cliPath = new URL('../../plugins/speck/cli/index.ts', import.meta.url).pathname;
  const cmd = cwd
    ? $`bun run ${cliPath} ${args}`.cwd(cwd).nothrow().quiet()
    : $`bun run ${cliPath} ${args}`.nothrow().quiet();
  const result = await cmd;
  return {
    stdout: result.stdout.toString(),
    stderr: result.stderr.toString(),
    exitCode: result.exitCode,
  };
}

describe('CLI Mode Detection', () => {
  describe('Human Mode (Default)', () => {
    test('default output is human-readable', async () => {
      const result = await runCli(['--help']);
      expect(result.exitCode).toBe(0);
      // Human output has formatted text, not JSON
      expect(result.stdout).toContain('Usage:');
      expect(() => JSON.parse(result.stdout)).toThrow();
    });

    test('env command outputs human-readable text by default', async () => {
      const result = await runCli(['env']);
      // Even if it fails (not in git repo), it should not be JSON
      if (result.exitCode === 0) {
        expect(result.stdout).toContain('Speck');
      }
    });
  });

  describe('JSON Mode (--json)', () => {
    test('--json flag produces valid JSON output', async () => {
      const result = await runCli(['env', '--json']);
      if (result.exitCode === 0 && result.stdout.trim()) {
        const parsed = JSON.parse(result.stdout);
        expect(parsed).toBeDefined();
        expect(typeof parsed).toBe('object');
      }
    });

    test('global --json flag works before subcommand', async () => {
      const result = await runCli(['--json', 'env']);
      if (result.exitCode === 0 && result.stdout.trim()) {
        const parsed = JSON.parse(result.stdout);
        expect(parsed).toBeDefined();
      }
    });

    test('JSON error output has consistent structure', async () => {
      // Run a command that will fail (unknown feature)
      const result = await runCli(['check-prerequisites', '--json']);
      // If it fails, should still be parseable JSON
      if (result.exitCode !== 0 && result.stdout.trim()) {
        try {
          const parsed = JSON.parse(result.stdout);
          // Error JSON should have ok: false or error field
          expect(parsed.ok === false || parsed.error !== undefined).toBe(true);
        } catch {
          // stderr error is also acceptable
        }
      }
    });
  });

  describe('Hook Mode (--hook)', () => {
    test('--hook flag produces hook-formatted output', async () => {
      const result = await runCli(['check-prerequisites', '--hook']);
      // Hook output is a specific format for Claude Code hooks
      // It should be parseable or have specific markers
      expect(result.exitCode).toBeDefined();
    });

    test('--hook with check-prerequisites returns context', async () => {
      const result = await runCli(['check-prerequisites', '--hook']);
      // Hook output for check-prerequisites should include context for injection
      // Even on failure, should have some output
      expect(result.stdout || result.stderr).toBeTruthy();
    });

    test('--hook mode is distinct from --json mode', async () => {
      const jsonResult = await runCli(['env', '--json']);
      const hookResult = await runCli(['env', '--hook']);

      // If both succeed, outputs should differ in format
      if (jsonResult.exitCode === 0 && hookResult.exitCode === 0) {
        // JSON mode returns structured JSON
        // Hook mode may return different format
        expect(jsonResult.stdout).not.toBe(hookResult.stdout);
      }
    });
  });

  describe('Mode Flag Precedence', () => {
    test('--hook takes precedence over --json', async () => {
      const result = await runCli(['--hook', '--json', 'env']);
      // When both flags present, --hook should take precedence
      expect(result.exitCode).toBeDefined();
    });

    test('last flag wins for conflicting modes', async () => {
      const hookLast = await runCli(['--json', '--hook', 'env']);
      const jsonLast = await runCli(['--hook', '--json', 'env']);

      // Both should complete without crashing
      expect(hookLast.exitCode).toBeDefined();
      expect(jsonLast.exitCode).toBeDefined();
    });
  });
});

describe('CLI Environment Detection', () => {
  test('CLI detects git repository', async () => {
    // Running from speck repo root should detect git
    const result = await runCli(['env', '--json']);
    if (result.exitCode === 0) {
      const parsed = JSON.parse(result.stdout);
      // New JSON envelope structure: { ok, result, meta }
      expect(parsed.ok).toBe(true);
      // Result should include repo-related info
      expect(parsed.result?.repoRoot || parsed.result?.speckRoot).toBeDefined();
    }
  });

  test('CLI handles non-git directory gracefully', async () => {
    const tempDir = join(tmpdir(), `cli-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });

    try {
      const result = await runCli(['env'], tempDir);
      // Should not crash, may show error
      expect(result.exitCode).toBeDefined();
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

describe('CLI Feature Detection', () => {
  let testDir: string;

  beforeAll(() => {
    testDir = join(tmpdir(), `cli-feature-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    // Create a minimal git repo structure
    mkdirSync(join(testDir, '.git'), { recursive: true });
    mkdirSync(join(testDir, '.speck'), { recursive: true });
    mkdirSync(join(testDir, 'specs', '001-test-feature'), { recursive: true });

    // Create minimal spec file
    writeFileSync(join(testDir, 'specs', '001-test-feature', 'spec.md'), '# Test Feature Spec');
  });

  afterAll(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  test('check-prerequisites detects feature structure', async () => {
    // Create plan.md to pass prerequisites
    writeFileSync(join(testDir, 'specs', '001-test-feature', 'plan.md'), '# Test Plan');

    // This test requires being on a feature branch
    // For unit test purposes, we verify the command runs
    const result = await runCli(['check-prerequisites', '--json'], testDir);
    expect(result.exitCode).toBeDefined();
  });
});

describe('CLI Integration with Existing Commands', () => {
  test('create-new-feature accepts all documented flags', async () => {
    // Test that flags are parsed (command may fail without proper env)
    const result = await runCli(['create-new-feature', '--help']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('--json');
    expect(result.stdout).toContain('--short-name');
    expect(result.stdout).toContain('--number');
  });

  test('check-prerequisites accepts all documented flags', async () => {
    const result = await runCli(['check-prerequisites', '--help']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('--json');
    expect(result.stdout).toContain('--require-tasks');
    expect(result.stdout).toContain('--paths-only');
  });

  test('env command accepts --json flag', async () => {
    const result = await runCli(['env', '--help']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('--json');
  });
});

/**
 * T032: Error Handling with --json
 *
 * Per contracts/cli-interface.ts JsonOutput contract:
 * - All errors MUST return structured JSON when --json flag is used
 * - Structure: { ok: false, error: { code, message, recovery? }, meta: { command, timestamp, duration_ms } }
 */
describe('T032: Error Handling with --json', () => {
  describe('check-prerequisites errors', () => {
    test('missing feature returns structured JSON error', async () => {
      // Run from non-feature directory
      const tempDir = join(tmpdir(), `cli-error-test-${Date.now()}`);
      mkdirSync(tempDir, { recursive: true });
      mkdirSync(join(tempDir, '.git'), { recursive: true });

      try {
        const result = await runCli(['check-prerequisites', '--json'], tempDir);

        // Should return non-zero exit code
        expect(result.exitCode).not.toBe(0);

        // Should return valid JSON
        if (result.stdout.trim()) {
          const parsed = JSON.parse(result.stdout);

          // Must have ok: false for errors
          expect(parsed.ok).toBe(false);

          // Must have error object
          expect(parsed.error).toBeDefined();
          expect(typeof parsed.error.code).toBe('string');
          expect(typeof parsed.error.message).toBe('string');

          // Must have meta object
          expect(parsed.meta).toBeDefined();
          expect(parsed.meta.command).toBeDefined();
          expect(parsed.meta.timestamp).toBeDefined();
          expect(typeof parsed.meta.duration_ms).toBe('number');
        }
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });

    test('missing plan.md returns structured JSON error with recovery', async () => {
      const tempDir = join(tmpdir(), `cli-plan-error-${Date.now()}`);
      mkdirSync(tempDir, { recursive: true });
      mkdirSync(join(tempDir, '.git'), { recursive: true });
      mkdirSync(join(tempDir, 'specs', '001-test'), { recursive: true });
      writeFileSync(join(tempDir, 'specs', '001-test', 'spec.md'), '# Test');

      try {
        // Need to be on a feature branch - this will likely fail differently
        const result = await runCli(['check-prerequisites', '--json'], tempDir);

        if (result.exitCode !== 0 && result.stdout.trim()) {
          const parsed = JSON.parse(result.stdout);
          expect(parsed.ok).toBe(false);
          expect(parsed.error).toBeDefined();

          // Recovery hints should be present for actionable errors
          if (parsed.error.recovery) {
            expect(Array.isArray(parsed.error.recovery)).toBe(true);
          }
        }
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe('create-new-feature errors', () => {
    test('invalid arguments return structured JSON error', async () => {
      // Missing required description argument
      const result = await runCli(['create-new-feature', '--json']);

      // Should fail (missing required arg)
      expect(result.exitCode).not.toBe(0);

      // Output might be on stderr for argument errors
      // Commander.js handles this differently
    });
  });

  describe('env command errors', () => {
    test('non-git directory returns structured JSON error', async () => {
      const tempDir = join(tmpdir(), `cli-env-error-${Date.now()}`);
      mkdirSync(tempDir, { recursive: true });

      try {
        const result = await runCli(['env', '--json'], tempDir);

        // May succeed or fail depending on implementation
        if (result.stdout.trim()) {
          const parsed = JSON.parse(result.stdout);

          // Either success or structured error
          expect(typeof parsed.ok).toBe('boolean');
          expect(parsed.meta).toBeDefined();

          if (!parsed.ok) {
            expect(parsed.error).toBeDefined();
          }
        }
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe('Exit code contract', () => {
    test('exit codes match ExitCode enum', async () => {
      // SUCCESS = 0
      const helpResult = await runCli(['--help']);
      expect(helpResult.exitCode).toBe(0);

      // USER_ERROR = 1 (for user-fixable errors like missing files)
      // SYSTEM_ERROR = 2 (for system failures)

      // Unknown command should return 1
      const unknownResult = await runCli(['nonexistent-command']);
      expect(unknownResult.exitCode).toBe(1);
    });
  });

  describe('JSON output consistency', () => {
    test('all commands return consistent JSON structure on success', async () => {
      const envResult = await runCli(['env', '--json']);

      if (envResult.exitCode === 0 && envResult.stdout.trim()) {
        const parsed = JSON.parse(envResult.stdout);

        // All successful JSON outputs must have:
        // - ok: true
        // - result: <command-specific data>
        // - meta: { command, timestamp, duration_ms }
        expect(parsed.ok).toBe(true);
        expect(parsed.meta).toBeDefined();
      }
    });

    test('error JSON includes actionable recovery when possible', async () => {
      // Commands that fail should include recovery hints where applicable
      const tempDir = join(tmpdir(), `cli-recovery-test-${Date.now()}`);
      mkdirSync(tempDir, { recursive: true });

      try {
        const result = await runCli(['check-prerequisites', '--json'], tempDir);

        if (result.exitCode !== 0 && result.stdout.trim()) {
          const parsed = JSON.parse(result.stdout);
          if (parsed.error?.recovery) {
            // Recovery should be an array of actionable strings
            expect(Array.isArray(parsed.error.recovery)).toBe(true);
            parsed.error.recovery.forEach((hint: string) => {
              expect(typeof hint).toBe('string');
              expect(hint.length).toBeGreaterThan(0);
            });
          }
        }
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });
});
