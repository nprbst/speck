/**
 * Integration Tests: Plugin CLI Routing
 *
 * Tests for the unified CLI plugin routing system where plugins expose
 * CLI functionality via `speck <plugin> <command>` pattern.
 *
 * Feature: 019-openspec-changes-plugin
 * Task: T008
 *
 * Tests:
 * - Plugin subcommand routing (reviewer, changes)
 * - Core commands remain unchanged
 * - --json flag propagation to plugins
 * - Unknown command handling
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Get project root directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../..');
const cliEntrypoint = join(projectRoot, 'plugins/speck/cli/index.ts');

// Test fixtures directory
let testDir: string;
let originalCwd: string;

beforeAll(() => {
  testDir = mkdtempSync(join(tmpdir(), 'speck-cli-routing-test-'));
  originalCwd = process.cwd();
});

afterAll(() => {
  process.chdir(originalCwd);
  if (testDir && existsSync(testDir)) {
    rmSync(testDir, { recursive: true, force: true });
  }
});

/**
 * Helper to run speck CLI and capture output
 * Runs the CLI directly via bun for development testing
 */
async function runSpeck(
  args: string[],
  options: { cwd?: string; timeout?: number } = {}
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const cwd = options.cwd ?? projectRoot;
  const timeout = options.timeout ?? 30000;

  const proc = Bun.spawn(['bun', cliEntrypoint, ...args], {
    cwd,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      ...process.env,
      // Ensure plugins are discoverable in development mode
      NODE_ENV: 'test',
    },
  });

  // Set up timeout
  const timeoutId = setTimeout(() => {
    proc.kill();
  }, timeout);

  try {
    const [stdout, stderr] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]);

    const exitCode = await proc.exited;
    clearTimeout(timeoutId);

    return { stdout, stderr, exitCode };
  } catch {
    clearTimeout(timeoutId);
    return { stdout: '', stderr: 'Process timed out or failed', exitCode: 1 };
  }
}

describe('Plugin CLI Routing', () => {
  describe('speck reviewer routing', () => {
    test('routes help command to reviewer plugin', async () => {
      const { stdout, exitCode } = await runSpeck(['reviewer', 'help']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('speck-review'); // Plugin name in help
    });

    test('routes --help flag to reviewer plugin', async () => {
      const { stdout, exitCode } = await runSpeck(['reviewer', '--help']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('analyze'); // analyze command should be listed
    });
  });

  describe('speck changes routing', () => {
    test('routes help command to changes plugin', async () => {
      const { stdout, exitCode } = await runSpeck(['changes', 'help']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('speck-changes'); // Plugin name in help
    });

    test('routes list command to changes plugin', async () => {
      const { stdout, exitCode } = await runSpeck(['changes', 'list']);

      // Should succeed and return plugin-specific output
      expect(exitCode).toBe(0);
      // Plugin outputs specific message when no changes exist
      expect(stdout).toContain('No active change proposals');
    });

    test('routes --help flag to changes plugin', async () => {
      const { stdout, exitCode } = await runSpeck(['changes', '--help']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('propose'); // propose command should be listed
      expect(stdout).toContain('validate'); // validate command should be listed
    });
  });

  describe('Core commands unchanged', () => {
    test('env command works directly', async () => {
      const { stdout, exitCode } = await runSpeck(['env']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('Speck Environment');
    });

    test('--version shows version', async () => {
      const { stdout, exitCode } = await runSpeck(['--version']);

      expect(exitCode).toBe(0);
      // Should show version number
      expect(stdout).toMatch(/\d+\.\d+\.\d+/);
    });

    test('help command shows plugin commands', async () => {
      const { stdout, exitCode } = await runSpeck(['help']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('Plugin Commands');
      expect(stdout).toContain('reviewer');
      expect(stdout).toContain('changes');
    });
  });

  describe('--json flag propagation', () => {
    test('propagates --json to changes list and gets JSON output', async () => {
      const { stdout, exitCode } = await runSpeck(['changes', 'list', '--json']);

      // Should succeed and output valid JSON
      expect(exitCode).toBe(0);
      expect(() => JSON.parse(stdout)).not.toThrow();

      const json = JSON.parse(stdout);
      expect(json).toHaveProperty('changes');
    });

    test('changes list without --json outputs human format', async () => {
      const { stdout, exitCode } = await runSpeck(['changes', 'list']);

      // Human output should not be JSON
      expect(exitCode).toBe(0);
      expect(() => JSON.parse(stdout)).toThrow(); // Not valid JSON
      expect(stdout).toMatch(/No active change|Name.*Status/i); // Human format
    });

    test('changes help shows --json option is available', async () => {
      const { stdout, exitCode } = await runSpeck(['changes', '--help']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('--json');
    });
  });

  describe('Unknown command handling', () => {
    test('unknown core command shows error', async () => {
      const { stderr, exitCode } = await runSpeck(['nonexistent']);

      expect(exitCode).toBe(1);
      expect(stderr).toContain('unknown command');
    });

    test('unknown plugin subcommand shows plugin error', async () => {
      const { stdout, stderr, exitCode } = await runSpeck(['changes', 'nonexistent']);

      expect(exitCode).toBe(1);
      // Should show error from the plugin
      expect(stdout + stderr).toMatch(/unknown|Unknown command/i);
    });
  });
});

describe('Plugin Discovery', () => {
  test('discovers plugins in development mode (./plugins/)', async () => {
    // Run from project root which has plugins/ directory
    // runSpeck defaults to projectRoot, so no cwd override needed
    const { stdout, exitCode } = await runSpeck(['--help']);

    expect(exitCode).toBe(0);
    expect(stdout).toContain('Plugin Commands');
    expect(stdout).toContain('reviewer');
    expect(stdout).toContain('changes');
  });
});

describe('Exit Code Propagation', () => {
  test('success exit code propagates from plugin', async () => {
    const { exitCode } = await runSpeck(['reviewer', 'help']);

    expect(exitCode).toBe(0);
  });

  test('error exit code propagates from plugin', async () => {
    // Request help for nonexistent command within plugin
    const { exitCode } = await runSpeck(['changes', 'nonexistent-command']);

    expect(exitCode).toBe(1);
  });
});
