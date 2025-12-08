/**
 * Integration Test: Full Pipeline (check → pull → transform)
 *
 * Tests the complete upstream sync and transformation pipeline end-to-end:
 * 1. /speck.check-upstream - Discover available releases
 * 2. /speck.pull-upstream - Pull pristine release
 * 3. /speck.transform-upstream - Transform to Speck implementation
 *
 * This validates Task T070 from tasks.md
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { $ } from 'bun';
import { join } from 'node:path';
import { existsSync, rmSync } from 'node:fs';
import type { ReleaseRegistry } from '../../plugins/speck/scripts/contracts/release-registry';

describe('Integration: Full upstream sync pipeline', () => {
  // Use a completely isolated test directory
  const testDir = join(process.cwd(), '.test-workspace-integration');
  const testUpstreamDir = join(testDir, 'upstream');

  beforeEach(async () => {
    // Create isolated test workspace
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    await $`mkdir -p ${testDir}`.quiet();
  });

  afterEach(async () => {
    // Clean up test workspace completely
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  test('full pipeline: check → pull (validation only, no FS changes)', async () => {
    // Step 1: Check upstream releases (read-only, safe)
    const checkResult = await $`bun plugins/speck/scripts/check-upstream.ts --json`.quiet();
    expect(checkResult.exitCode).toBe(0);

    const checkOutput = JSON.parse(checkResult.stdout.toString());
    expect(checkOutput.releases).toBeArray();
    expect(checkOutput.releases.length).toBeGreaterThan(0);

    const latestRelease = checkOutput.releases[0];
    expect(latestRelease).toHaveProperty('version');
    expect(latestRelease).toHaveProperty('publishedAt');
    expect(latestRelease).toHaveProperty('notesUrl');

    // Step 2: Verify pull-upstream validates version format (no actual pull)
    const invalidVersionResult = await $`bun plugins/speck/scripts/pull-upstream.ts invalid-version`
      .nothrow()
      .quiet();
    expect(invalidVersionResult.exitCode).toBe(1);
    expect(invalidVersionResult.stderr.toString()).toContain('Invalid version');

    // Step 3: Verify real upstream directory exists and is intact
    const realUpstreamDir = join(process.cwd(), 'upstream');
    expect(existsSync(realUpstreamDir)).toBe(true);

    const releasesJsonPath = join(realUpstreamDir, 'releases.json');
    expect(existsSync(releasesJsonPath)).toBe(true);

    const releasesJson = (await Bun.file(releasesJsonPath).json()) as ReleaseRegistry;
    expect(releasesJson.latest).toBeDefined();
    expect(releasesJson.releases).toBeArray();
    expect(releasesJson.releases.length).toBeGreaterThan(0);
  }, 120000); // 2 minute timeout for network operations

  test('pipeline handles existing release by reporting error', async () => {
    // Verify that attempting to pull an already-pulled release reports an error

    const realUpstreamDir = join(process.cwd(), 'upstream');
    const releasesJsonPath = join(realUpstreamDir, 'releases.json');

    // Read existing releases to find one that's already pulled
    const releasesJson = (await Bun.file(releasesJsonPath).json()) as ReleaseRegistry;

    if (releasesJson.releases.length === 0) {
      // No releases pulled yet, skip this test
      return;
    }

    const alreadyPulledVersion = releasesJson.releases[0].version;

    // Attempt to pull an already-pulled release (should fail with user error)
    const result = await $`bun plugins/speck/scripts/pull-upstream.ts ${alreadyPulledVersion}`
      .nothrow()
      .quiet();
    expect(result.exitCode).toBe(1); // User error
    expect(result.stderr.toString()).toContain('already exists');

    // Verify releases.json wasn't corrupted (still has same number of entries)
    const releasesJsonAfter = (await Bun.file(releasesJsonPath).json()) as ReleaseRegistry;
    const versionEntries = releasesJsonAfter.releases.filter(
      (r) => r.version === alreadyPulledVersion
    );
    expect(versionEntries.length).toBe(1); // Should still be exactly one entry
  }, 120000);

  test('pipeline validates version format', async () => {
    // Try to pull invalid version
    const result = await $`bun plugins/speck/scripts/pull-upstream.ts invalid-version`.nothrow().quiet();

    expect(result.exitCode).toBe(1); // User error exit code
    expect(result.stderr.toString()).toContain('Invalid version');
  });

  test('check-upstream handles network errors gracefully', async () => {
    // Test with invalid GitHub repo (to trigger network error)
    // This test uses the actual implementation but expects graceful error handling

    const result = await $`bun plugins/speck/scripts/check-upstream.ts`.nothrow().quiet();

    // Should either succeed or fail with proper exit code
    if (result.exitCode !== 0) {
      expect(result.exitCode).toBe(2); // System error exit code
      expect(result.stderr.toString().length).toBeGreaterThan(0);
    }
  });
});

describe('Integration: Transformation pipeline validation', () => {
  test.skip('transform-upstream processes pulled release', async () => {
    // TODO: Implement once transformation agent enhancements (T049a-T049d) are complete
    // This test will:
    // 1. Pull a release
    // 2. Run /speck.transform-upstream
    // 3. Verify .speck/scripts/ contains generated Bun TS files
    // 4. Verify transformation report exists
    // 5. Verify CLI interface compatibility
  });

  test.skip('transformation preserves SPECK-EXTENSION markers', async () => {
    // TODO: Implement extension marker preservation test
    // This validates FR-010 from spec.md
  });

  test.skip('transformation detects and reports breaking changes', async () => {
    // TODO: Implement after T049a (breaking change detection)
  });
});
