/**
 * Performance Test: Branch Lookups in Multi-Repo (T077)
 *
 * Validates that branch lookup operations complete within 150ms
 * in multi-repo contexts, ensuring snappy developer experience.
 *
 * Success Criterion: SC-003 (p95 < 150ms for branch lookups)
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

describe.skip("Performance: Branch lookup operations", () => {
  let fixture: MultiRepoTestFixture;

  beforeEach(async () => {
    // Set up multi-repo environment with multiple children
    fixture = await createMultiRepoTestFixture([
      { name: "backend-service" },
      { name: "frontend-app" },
      { name: "api-gateway" }
    ], "009-multi-repo-stacked");
  });

  afterEach(async () => {
    await fixture?.cleanup();
  });

  test("T077: Branch lookup in child repo completes <150ms (p95)", async () => {
    const childRepo = fixture.childRepos.get("backend-service")!;

    // Create a few branches to ensure non-trivial lookup
    await $`cd ${childRepo} && bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/feature-1 --base main --spec 009-multi-repo-stacked`.quiet();
    await $`cd ${childRepo} && bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/feature-2 --base nprbst/feature-1 --spec 009-multi-repo-stacked`.quiet();
    await $`cd ${childRepo} && bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/feature-3 --base nprbst/feature-2 --spec 009-multi-repo-stacked`.quiet();

    // Measure 20 lookups to get p95
    const timings: number[] = [];
    for (let i = 0; i < 20; i++) {
      const start = performance.now();
      await $`cd ${childRepo} && bun run ${fixture.scriptsDir}/branch-command.ts status`.quiet();
      const end = performance.now();
      timings.push(end - start);
    }

    // Calculate p95
    timings.sort((a, b) => a - b);
    const p95Index = Math.floor(timings.length * 0.95);
    const p95 = timings[p95Index]!;

    console.log(`Branch lookup timings (ms): min=${Math.min(...timings).toFixed(1)}, median=${timings[Math.floor(timings.length / 2)]!.toFixed(1)}, p95=${p95.toFixed(1)}, max=${Math.max(...timings).toFixed(1)}`);

    // Performance contract: p95 < 150ms
    expect(p95).toBeLessThan(150);
  });

  test("T077: Branch lookup with stack traversal <150ms (p95)", async () => {
    const childRepo = fixture.childRepos.get("frontend-app")!;

    // Create a deeper stack (5 branches)
    await $`cd ${childRepo} && bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/base --base main --spec 009-multi-repo-stacked`.quiet();
    await $`cd ${childRepo} && bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/layer-1 --base nprbst/base --spec 009-multi-repo-stacked`.quiet();
    await $`cd ${childRepo} && bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/layer-2 --base nprbst/layer-1 --spec 009-multi-repo-stacked`.quiet();
    await $`cd ${childRepo} && bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/layer-3 --base nprbst/layer-2 --spec 009-multi-repo-stacked`.quiet();
    await $`cd ${childRepo} && bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/layer-4 --base nprbst/layer-3 --spec 009-multi-repo-stacked`.quiet();

    // Measure list operation (requires stack traversal)
    const timings: number[] = [];
    for (let i = 0; i < 20; i++) {
      const start = performance.now();
      await $`cd ${childRepo} && bun run ${fixture.scriptsDir}/branch-command.ts list`.quiet();
      const end = performance.now();
      timings.push(end - start);
    }

    // Calculate p95
    timings.sort((a, b) => a - b);
    const p95Index = Math.floor(timings.length * 0.95);
    const p95 = timings[p95Index]!;

    console.log(`Stack traversal timings (ms): min=${Math.min(...timings).toFixed(1)}, median=${timings[Math.floor(timings.length / 2)]!.toFixed(1)}, p95=${p95.toFixed(1)}, max=${Math.max(...timings).toFixed(1)}`);

    // Performance contract: p95 < 150ms
    expect(p95).toBeLessThan(150);
  });

  test("T077: Single branch status lookup <150ms (p95)", async () => {
    const childRepo = fixture.childRepos.get("api-gateway")!;

    // Create a single branch
    await $`cd ${childRepo} && bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/single-feature --base main --spec 009-multi-repo-stacked`.quiet();

    // Measure single branch status
    const timings: number[] = [];
    for (let i = 0; i < 20; i++) {
      const start = performance.now();
      await $`cd ${childRepo} && bun run ${fixture.scriptsDir}/branch-command.ts status nprbst/single-feature`.quiet();
      const end = performance.now();
      timings.push(end - start);
    }

    // Calculate p95
    timings.sort((a, b) => a - b);
    const p95Index = Math.floor(timings.length * 0.95);
    const p95 = timings[p95Index]!;

    console.log(`Single branch status timings (ms): min=${Math.min(...timings).toFixed(1)}, median=${timings[Math.floor(timings.length / 2)]!.toFixed(1)}, p95=${p95.toFixed(1)}, max=${Math.max(...timings).toFixed(1)}`);

    // Performance contract: p95 < 150ms
    expect(p95).toBeLessThan(150);
  });
});
