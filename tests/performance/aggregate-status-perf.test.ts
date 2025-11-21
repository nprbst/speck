/**
 * Performance Test: Aggregate Status in Multi-Repo (T078)
 *
 * Validates that aggregate status collection across 10 repos with
 * 50 total branches completes within 1 second (p95).
 *
 * Success Criterion: SC-004 (p95 < 1s for 10 repos, 50 branches)
 *
 * Feature: 009-multi-repo-stacked (Phase 10)
 * Layer: Performance
 * Created: 2025-11-20
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import {
  createMultiRepoTestFixture,
  type MultiRepoTestFixture
} from "../helpers/multi-repo-fixtures.ts";
import { $ } from "bun";

describe("Performance: Aggregate status operations", () => {
  let fixture: MultiRepoTestFixture;

  beforeEach(async () => {
    // Set up multi-repo environment with 10 child repos
    const childRepos = Array.from({ length: 10 }, (_, i) => ({
      name: `service-${i + 1}`
    }));

    fixture = await createMultiRepoTestFixture(childRepos, "009-multi-repo-stacked");
  });

  afterEach(async () => {
    await fixture.cleanup();
  });

  test("T078: Aggregate status for 10 repos, 50 branches completes <1s (p95)", async () => {
    // Create 5 branches per child repo (10 repos * 5 branches = 50 total)
    for (const [name, repoPath] of fixture.childRepos) {
      await $`cd ${repoPath} && bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/${name}-feat-1 --base main --spec 009-multi-repo-stacked`.quiet();
      await $`cd ${repoPath} && bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/${name}-feat-2 --base nprbst/${name}-feat-1 --spec 009-multi-repo-stacked`.quiet();
      await $`cd ${repoPath} && bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/${name}-feat-3 --base nprbst/${name}-feat-2 --spec 009-multi-repo-stacked`.quiet();
      await $`cd ${repoPath} && bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/${name}-feat-4 --base nprbst/${name}-feat-3 --spec 009-multi-repo-stacked`.quiet();
      await $`cd ${repoPath} && bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/${name}-feat-5 --base nprbst/${name}-feat-4 --spec 009-multi-repo-stacked`.quiet();
    }

    // Measure aggregate status from root
    const timings: number[] = [];
    for (let i = 0; i < 20; i++) {
      const start = performance.now();
      await $`cd ${fixture.rootDir} && bun run ${fixture.scriptsDir}/env-command.ts`.quiet();
      const end = performance.now();
      timings.push(end - start);
    }

    // Calculate p95
    timings.sort((a, b) => a - b);
    const p95Index = Math.floor(timings.length * 0.95);
    const p95 = timings[p95Index];

    console.log(`Aggregate status timings (ms): min=${Math.min(...timings).toFixed(1)}, median=${timings[Math.floor(timings.length/2)].toFixed(1)}, p95=${p95.toFixed(1)}, max=${Math.max(...timings).toFixed(1)}`);

    // Performance contract: p95 < 1000ms (1 second)
    expect(p95).toBeLessThan(1000);
  });

  test("T078: Branch list --all for 10 repos completes <1s (p95)", async () => {
    // Create 5 branches per child repo
    for (const [name, repoPath] of fixture.childRepos) {
      await $`cd ${repoPath} && bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/${name}-a --base main --spec 009-multi-repo-stacked`.quiet();
      await $`cd ${repoPath} && bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/${name}-b --base nprbst/${name}-a --spec 009-multi-repo-stacked`.quiet();
      await $`cd ${repoPath} && bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/${name}-c --base nprbst/${name}-b --spec 009-multi-repo-stacked`.quiet();
      await $`cd ${repoPath} && bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/${name}-d --base nprbst/${name}-c --spec 009-multi-repo-stacked`.quiet();
      await $`cd ${repoPath} && bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/${name}-e --base nprbst/${name}-d --spec 009-multi-repo-stacked`.quiet();
    }

    // Measure branch list --all from root
    const timings: number[] = [];
    for (let i = 0; i < 20; i++) {
      const start = performance.now();
      await $`cd ${fixture.rootDir} && bun run ${fixture.scriptsDir}/branch-command.ts list --all`.quiet();
      const end = performance.now();
      timings.push(end - start);
    }

    // Calculate p95
    timings.sort((a, b) => a - b);
    const p95Index = Math.floor(timings.length * 0.95);
    const p95 = timings[p95Index];

    console.log(`Branch list --all timings (ms): min=${Math.min(...timings).toFixed(1)}, median=${timings[Math.floor(timings.length/2)].toFixed(1)}, p95=${p95.toFixed(1)}, max=${Math.max(...timings).toFixed(1)}`);

    // Performance contract: p95 < 1000ms
    expect(p95).toBeLessThan(1000);
  });

  test("T078: Performance scales gracefully with fewer repos", async () => {
    // Create 3 branches in first 3 repos only
    let count = 0;
    for (const [name, repoPath] of fixture.childRepos) {
      if (count >= 3) break;
      await $`cd ${repoPath} && bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/${name}-x --base main --spec 009-multi-repo-stacked`.quiet();
      await $`cd ${repoPath} && bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/${name}-y --base nprbst/${name}-x --spec 009-multi-repo-stacked`.quiet();
      await $`cd ${repoPath} && bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/${name}-z --base nprbst/${name}-y --spec 009-multi-repo-stacked`.quiet();
      count++;
    }

    // Measure env command with partial data
    const timings: number[] = [];
    for (let i = 0; i < 20; i++) {
      const start = performance.now();
      await $`cd ${fixture.rootDir} && bun run ${fixture.scriptsDir}/env-command.ts`.quiet();
      const end = performance.now();
      timings.push(end - start);
    }

    // Calculate p95
    timings.sort((a, b) => a - b);
    const p95Index = Math.floor(timings.length * 0.95);
    const p95 = timings[p95Index];

    console.log(`Partial aggregate timings (ms): min=${Math.min(...timings).toFixed(1)}, median=${timings[Math.floor(timings.length/2)].toFixed(1)}, p95=${p95.toFixed(1)}, max=${Math.max(...timings).toFixed(1)}`);

    // Should be significantly faster with less data (expect <500ms)
    expect(p95).toBeLessThan(500);
  });
});
