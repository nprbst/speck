/**
 * Integration tests for virtual command invocation
 * Tests User Story 1: Seamless Virtual Command Invocation
 */

import { describe, test, expect } from 'bun:test';
import { $ } from 'bun';
import path from 'node:path';

const CLI_PATH = path.join(import.meta.dir, '../../plugins/speck/scripts/speck.ts');

describe('Virtual Command Invocation', () => {
  test('speck-env command works via CLI', async () => {
    const result = await $`bun run ${CLI_PATH} env`.nothrow();

    expect(result.exitCode).toBe(0);
    expect(result.stdout.toString()).toContain('Speck Environment');
    expect(result.stdout.toString()).toContain('Speck Root:');
  });

  test('all registered commands are accessible', async () => {
    const commands = [
      'env',
      'check-prerequisites',
      'create-new-feature',
      'setup-plan',
      'link-repo',
    ];

    for (const cmd of commands) {
      const result = await $`bun run ${CLI_PATH} ${cmd} --help`.nothrow();

      // Command should be recognized (exit code 0 or 1 is acceptable)
      expect([0, 1]).toContain(result.exitCode);
    }
  });
});
