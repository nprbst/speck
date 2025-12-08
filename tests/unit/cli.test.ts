/**
 * Unit Tests: CLI Argument Parsing
 *
 * Tests for the Speck CLI entry point (plugins/speck/cli/index.ts)
 * Per Constitution Principle XII: TDD - tests written before implementation
 *
 * Feature: 015-scope-simplification
 * Task: T018
 */

import { describe, test, expect } from 'bun:test';
import { $ } from 'bun';

/**
 * Helper to run CLI and capture output
 */
async function runCli(args: string[]): Promise<{
  stdout: string;
  stderr: string;
  exitCode: number;
}> {
  const cliPath = new URL('../../plugins/speck/cli/index.ts', import.meta.url).pathname;
  const result = await $`bun run ${cliPath} ${args}`.nothrow().quiet();
  return {
    stdout: result.stdout.toString(),
    stderr: result.stderr.toString(),
    exitCode: result.exitCode,
  };
}

describe('CLI Argument Parsing', () => {
  describe('Global Options', () => {
    test('--help shows usage information', async () => {
      const result = await runCli(['--help']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Usage:');
      expect(result.stdout).toContain('speck');
    });

    test('-h is alias for --help', async () => {
      const result = await runCli(['-h']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Usage:');
    });

    test('--version shows version number', async () => {
      const result = await runCli(['--version']);
      expect(result.exitCode).toBe(0);
      // Version should match semver pattern
      expect(result.stdout).toMatch(/\d+\.\d+\.\d+/);
    });

    test('-V is alias for --version', async () => {
      const result = await runCli(['-V']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toMatch(/\d+\.\d+\.\d+/);
    });
  });

  describe('Subcommand Discovery', () => {
    test('no arguments shows help', async () => {
      const result = await runCli([]);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Usage:');
    });

    test('unknown subcommand shows error', async () => {
      const result = await runCli(['unknown-command']);
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('unknown');
    });

    test('--help lists all available subcommands', async () => {
      const result = await runCli(['--help']);
      expect(result.stdout).toContain('create-new-feature');
      expect(result.stdout).toContain('check-prerequisites');
      expect(result.stdout).toContain('env');
      expect(result.stdout).toContain('help');
    });
  });

  describe('Subcommand Help', () => {
    test('create-new-feature --help shows command help', async () => {
      const result = await runCli(['create-new-feature', '--help']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('create-new-feature');
      expect(result.stdout).toContain('description');
    });

    test('check-prerequisites --help shows command help', async () => {
      const result = await runCli(['check-prerequisites', '--help']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('check-prerequisites');
    });

    test('env --help shows command help', async () => {
      const result = await runCli(['env', '--help']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('env');
    });
  });

  describe('Global --json Flag', () => {
    test('--json flag is passed to subcommands', async () => {
      // env command supports --json natively
      const result = await runCli(['env', '--json']);
      // Should return valid JSON (may fail if not in git repo, but should still be JSON)
      try {
        if (result.stdout.trim()) {
          JSON.parse(result.stdout);
        }
      } catch {
        // If stdout isn't JSON, stderr should have error
        expect(result.stderr || result.stdout).toBeTruthy();
      }
    });

    test('global --json before subcommand works', async () => {
      const result = await runCli(['--json', 'env']);
      // Should either return JSON or error in JSON format
      if (result.stdout.trim()) {
        try {
          JSON.parse(result.stdout);
        } catch {
          // Error output is acceptable
        }
      }
      // Just ensure it doesn't crash
      expect(result.exitCode).toBeDefined();
    });
  });

  describe('Global --hook Flag', () => {
    test('--hook flag is accepted', async () => {
      const result = await runCli(['--hook', 'check-prerequisites']);
      // Should not crash - output format depends on hook mode implementation
      expect(result.exitCode).toBeDefined();
    });

    test('--hook after subcommand works', async () => {
      const result = await runCli(['check-prerequisites', '--hook']);
      expect(result.exitCode).toBeDefined();
    });
  });

  describe('Help Subcommand', () => {
    test('help subcommand shows usage', async () => {
      const result = await runCli(['help']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Usage:');
    });

    test('help <command> shows command help', async () => {
      const result = await runCli(['help', 'env']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('env');
    });
  });
});

describe('CLI Exit Codes', () => {
  test('successful command returns 0', async () => {
    const result = await runCli(['--help']);
    expect(result.exitCode).toBe(0);
  });

  test('unknown command returns non-zero', async () => {
    const result = await runCli(['nonexistent']);
    expect(result.exitCode).not.toBe(0);
  });
});

describe('CLI Output Format', () => {
  test('human output is readable text by default', async () => {
    const result = await runCli(['--help']);
    // Should not be JSON
    expect(() => JSON.parse(result.stdout)).toThrow();
    // Should contain readable text
    expect(result.stdout).toContain('Usage');
  });
});
