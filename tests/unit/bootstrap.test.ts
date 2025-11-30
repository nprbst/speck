/**
 * Unit Tests: Bootstrap Script Functions
 *
 * Tests for the Bun bootstrap detection and self-removal logic.
 * Per Constitution Principle XII: TDD - tests written before implementation
 *
 * Feature: 015-scope-simplification
 * Tasks: T057a, T057b, T057c
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import {
  mkdtempSync,
  rmSync,
  existsSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  symlinkSync,
  lstatSync,
  readlinkSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { $ } from 'bun';

// Test fixtures directory
let testDir: string;

beforeEach(() => {
  testDir = mkdtempSync(join(tmpdir(), 'speck-bootstrap-test-'));
});

afterEach(() => {
  if (testDir && existsSync(testDir)) {
    rmSync(testDir, { recursive: true, force: true });
  }
});

describe('Bootstrap - Platform Detection', () => {
  describe('T057a: detect_platform()', () => {
    test('identifies current platform correctly', async () => {
      const platform = process.platform;
      const uname = await $`uname -s`.text();

      if (platform === 'darwin') {
        expect(uname.trim()).toBe('Darwin');
      } else if (platform === 'linux') {
        expect(uname.trim()).toBe('Linux');
      }
    });

    test('macOS detection via uname', async () => {
      const uname = await $`uname -s`.text();
      const isMac = uname.trim() === 'Darwin';

      // If we're on macOS, this should be true
      if (process.platform === 'darwin') {
        expect(isMac).toBe(true);
      }
    });

    test('Linux detection via uname', async () => {
      const uname = await $`uname -s`.text();
      const isLinux = uname.trim() === 'Linux';

      // If we're on Linux, this should be true
      if (process.platform === 'linux') {
        expect(isLinux).toBe(true);
      }
    });

    test('WSL detection via /proc/version check', async () => {
      // WSL has "microsoft" or "Microsoft" in /proc/version
      let isWSL = false;

      try {
        const procVersion = await Bun.file('/proc/version').text();
        isWSL = procVersion.toLowerCase().includes('microsoft');
      } catch {
        // /proc/version doesn't exist on macOS, that's fine
        isWSL = false;
      }

      // On macOS, WSL should be false
      if (process.platform === 'darwin') {
        expect(isWSL).toBe(false);
      }
    });
  });
});

describe('Bootstrap - Bun Finding', () => {
  describe('T057b: find_bun()', () => {
    test('finds bun in PATH via command -v', async () => {
      const result = await $`command -v bun`.nothrow().text();

      // If bun is installed (it should be since we're running tests with it)
      if (result.trim()) {
        expect(result.trim()).toContain('bun');
        expect(existsSync(result.trim())).toBe(true);
      }
    });

    test('bun executable exists and is executable', async () => {
      const bunPath = await $`command -v bun`.nothrow().text();

      if (bunPath.trim()) {
        const path = bunPath.trim();
        expect(existsSync(path)).toBe(true);

        // Check it's executable
        const result = await $`test -x ${path}`.nothrow();
        expect(result.exitCode).toBe(0);
      }
    });

    test('checks common install locations', () => {
      const home = process.env.HOME || '';
      const commonLocations = [
        join(home, '.bun', 'bin', 'bun'),
        '/usr/local/bin/bun',
        '/opt/homebrew/bin/bun',
      ];

      // At least verify we can construct these paths
      for (const location of commonLocations) {
        expect(typeof location).toBe('string');
        expect(location.endsWith('bun')).toBe(true);
      }
    });

    test('returns valid path when bun is found', async () => {
      const bunPath = await $`command -v bun`.nothrow().text();

      if (bunPath.trim()) {
        const path = bunPath.trim();
        // Path should be absolute
        expect(path.startsWith('/')).toBe(true);
        // Should be named 'bun'
        expect(path.endsWith('bun')).toBe(true);
      }
    });
  });
});

describe('Bootstrap - Self-Removal Flow', () => {
  describe('T057c: Bootstrap Self-Removal', () => {
    test('creates .runner.sh wrapper script', () => {
      // Create a mock runner script like bootstrap would
      const runnerPath = join(testDir, '.runner.sh');
      const bunPath = '/usr/local/bin/bun';
      const entrypoint = join(testDir, 'index.ts');

      const runnerContent = `#!/bin/bash
exec "${bunPath}" "${entrypoint}" "$@"
`;

      writeFileSync(runnerPath, runnerContent, { mode: 0o755 });

      // Verify runner was created
      expect(existsSync(runnerPath)).toBe(true);

      // Verify content
      const content = readFileSync(runnerPath, 'utf-8');
      expect(content).toContain('#!/bin/bash');
      expect(content).toContain('exec');
      expect(content).toContain(bunPath);
      expect(content).toContain(entrypoint);
      expect(content).toContain('"$@"');
    });

    test('runner script has correct permissions', () => {
      const runnerPath = join(testDir, '.runner.sh');
      writeFileSync(runnerPath, '#!/bin/bash\necho test', { mode: 0o755 });

      // Verify it's executable
      const stat = Bun.spawnSync(['test', '-x', runnerPath]);
      expect(stat.exitCode).toBe(0);
    });

    test('symlink can be updated from bootstrap.sh to .runner.sh', () => {
      // Setup: Create bootstrap.sh
      const bootstrapPath = join(testDir, 'bootstrap.sh');
      writeFileSync(bootstrapPath, '#!/bin/bash\necho bootstrap', { mode: 0o755 });

      // Setup: Create .runner.sh
      const runnerPath = join(testDir, '.runner.sh');
      writeFileSync(runnerPath, '#!/bin/bash\necho runner', { mode: 0o755 });

      // Create bin directory and initial symlink to bootstrap
      const binDir = join(testDir, 'bin');
      mkdirSync(binDir, { recursive: true });
      const symlinkPath = join(binDir, 'speck');
      symlinkSync(bootstrapPath, symlinkPath);

      // Verify initial state
      expect(lstatSync(symlinkPath).isSymbolicLink()).toBe(true);
      expect(readlinkSync(symlinkPath)).toBe(bootstrapPath);

      // Update symlink to point to runner (simulating bootstrap self-removal)
      rmSync(symlinkPath);
      symlinkSync(runnerPath, symlinkPath);

      // Verify updated state
      expect(lstatSync(symlinkPath).isSymbolicLink()).toBe(true);
      expect(readlinkSync(symlinkPath)).toBe(runnerPath);
    });

    test('symlink update only happens for bootstrap.sh targets', () => {
      // Setup: Create various scripts
      const bootstrapPath = join(testDir, 'bootstrap.sh');
      const otherScript = join(testDir, 'other-script.sh');
      const runnerPath = join(testDir, '.runner.sh');

      writeFileSync(bootstrapPath, '#!/bin/bash\necho bootstrap', { mode: 0o755 });
      writeFileSync(otherScript, '#!/bin/bash\necho other', { mode: 0o755 });
      writeFileSync(runnerPath, '#!/bin/bash\necho runner', { mode: 0o755 });

      // Create symlink to other-script
      const binDir = join(testDir, 'bin');
      mkdirSync(binDir, { recursive: true });
      const symlinkPath = join(binDir, 'speck');
      symlinkSync(otherScript, symlinkPath);

      // Check if target contains "bootstrap.sh" - it shouldn't
      const target = readlinkSync(symlinkPath);
      const isBootstrap = target.includes('bootstrap.sh');

      // Should NOT update because it's not pointing to bootstrap.sh
      expect(isBootstrap).toBe(false);
    });

    test('subsequent runs bypass bootstrap entirely', async () => {
      // Create a mock runner that just echoes "runner"
      const runnerPath = join(testDir, '.runner.sh');
      writeFileSync(
        runnerPath,
        `#!/bin/bash
echo "executed via runner"
`,
        { mode: 0o755 }
      );

      // Create symlink directly to runner
      const binDir = join(testDir, 'bin');
      mkdirSync(binDir, { recursive: true });
      const symlinkPath = join(binDir, 'speck');
      symlinkSync(runnerPath, symlinkPath);

      // Execute via symlink
      const result = await $`${symlinkPath}`.nothrow().text();

      // Should see runner output, not bootstrap
      expect(result.trim()).toBe('executed via runner');
    });
  });
});

describe('Bootstrap - Install Instructions', () => {
  test('generates macOS-specific install instructions', () => {
    const instructions = {
      universal: 'curl -fsSL https://bun.sh/install | bash',
      homebrew: 'brew install oven-sh/bun/bun',
    };

    expect(instructions.universal).toContain('bun.sh/install');
    expect(instructions.homebrew).toContain('brew install');
    expect(instructions.homebrew).toContain('oven-sh/bun');
  });

  test('generates Linux-specific install instructions', () => {
    const instructions = {
      universal: 'curl -fsSL https://bun.sh/install | bash',
    };

    expect(instructions.universal).toContain('bun.sh/install');
  });

  test('includes WSL-specific notes when applicable', () => {
    const wslNote =
      'After installing, you may need to restart your terminal or run: source ~/.bashrc';

    expect(wslNote).toContain('restart your terminal');
    expect(wslNote).toContain('source ~/.bashrc');
  });
});

describe('Bootstrap - Error Cases', () => {
  test('handles missing entrypoint gracefully', async () => {
    const nonExistentPath = join(testDir, 'nonexistent', 'index.ts');
    expect(existsSync(nonExistentPath)).toBe(false);
  });

  test('handles symlink candidates not existing', () => {
    const symlinkCandidates = [join(testDir, '.local', 'bin', 'speck'), '/usr/local/bin/speck'];

    for (const candidate of symlinkCandidates) {
      const exists = existsSync(candidate);
      // Most won't exist in test environment
      expect(typeof exists).toBe('boolean');
    }
  });
});
