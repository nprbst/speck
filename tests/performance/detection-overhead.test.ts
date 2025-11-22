/**
 * Performance Test: Multi-Repo Detection Overhead (T080)
 *
 * Benchmarks the overhead of multi-repo context detection to ensure
 * it adds minimal latency (<50ms) to all operations.
 *
 * Success Criterion: Detection overhead < 50ms
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
import path from "node:path";
import { detectSpeckRoot } from "../../.speck/scripts/common/paths.ts";
import { $ } from "bun";

describe("Performance: Multi-repo detection overhead", () => {
  let fixture: MultiRepoTestFixture;

  beforeEach(async () => {
    // Set up multi-repo environment with child repos
    fixture = await createMultiRepoTestFixture([
      { name: "service-a" },
      { name: "service-b" },
      { name: "service-c" }
    ], "009-multi-repo-stacked");
  });

  afterEach(async () => {
    await fixture.cleanup();
  });

  test("T080: detectSpeckRoot() in child repo completes <50ms (p95)", async () => {
    const childRepo = fixture.childRepos.get("service-a")!;
    const originalCwd = process.cwd();

    // Measure detection overhead
    const timings: number[] = [];
    for (let i = 0; i < 100; i++) {
      process.chdir(childRepo);
      const start = performance.now();

      // Detect from child repo
      const result = await detectSpeckRoot();

      const end = performance.now();
      timings.push(end - start);

      // Verify detection worked
      expect(result.mode).toBe("multi-repo");
    }

    process.chdir(originalCwd);

    // Calculate p95
    timings.sort((a, b) => a - b);
    const p95Index = Math.floor(timings.length * 0.95);
    const p95 = timings[p95Index]!;

    console.log(`detectSpeckRoot() from child (ms): min=${Math.min(...timings).toFixed(2)}, median=${timings[Math.floor(timings.length/2)]!.toFixed(2)}, p95=${p95.toFixed(2)}, max=${Math.max(...timings).toFixed(2)}`);

    // Performance contract: p95 < 50ms
    expect(p95).toBeLessThan(50);
  });

  test("T080: detectSpeckRoot() in root repo completes <50ms (p95)", async () => {
    const originalCwd = process.cwd();

    // Measure detection overhead from root
    const timings: number[] = [];
    for (let i = 0; i < 100; i++) {
      process.chdir(fixture.rootDir);
      const start = performance.now();

      // Detect from root
      const result = await detectSpeckRoot();

      const end = performance.now();
      timings.push(end - start);

      // Verify detection worked
      expect(result.mode).toBe("single-repo");
    }

    process.chdir(originalCwd);

    // Calculate p95
    timings.sort((a, b) => a - b);
    const p95Index = Math.floor(timings.length * 0.95);
    const p95 = timings[p95Index]!;

    console.log(`detectSpeckRoot() from root (ms): min=${Math.min(...timings).toFixed(2)}, median=${timings[Math.floor(timings.length/2)]!.toFixed(2)}, p95=${p95.toFixed(2)}, max=${Math.max(...timings).toFixed(2)}`);

    // Performance contract: p95 < 50ms
    expect(p95).toBeLessThan(50);
  });

  test("T080: detectSpeckRoot() in single-repo mode completes <50ms (p95)", async () => {
    // Test detection overhead in non-multi-repo context
    const tmpDir = path.join(path.dirname(fixture.rootDir), "single-repo-test");
    await $`mkdir -p ${tmpDir}/.speck`.quiet();
    const originalCwd = process.cwd();

    const timings: number[] = [];
    for (let i = 0; i < 100; i++) {
      process.chdir(tmpDir);
      const start = performance.now();

      // Detect from single repo (no symlinks)
      const result = await detectSpeckRoot();

      const end = performance.now();
      timings.push(end - start);

      // Verify detection worked
      expect(result.mode).toBe("single-repo");
    }

    process.chdir(originalCwd);

    // Calculate p95
    timings.sort((a, b) => a - b);
    const p95Index = Math.floor(timings.length * 0.95);
    const p95 = timings[p95Index]!;

    console.log(`detectSpeckRoot() single-repo (ms): min=${Math.min(...timings).toFixed(2)}, median=${timings[Math.floor(timings.length/2)]!.toFixed(2)}, p95=${p95.toFixed(2)}, max=${Math.max(...timings).toFixed(2)}`);

    // Performance contract: p95 < 50ms (should be fastest)
    expect(p95).toBeLessThan(50);
  });

  test("T080: Symlink resolution overhead <10ms (p95)", async () => {
    const childRepo = fixture.childRepos.get("service-b")!;

    // Measure just symlink resolution
    const timings: number[] = [];
    for (let i = 0; i < 100; i++) {
      const start = performance.now();

      // Resolve symlink chain
      const speckDir = path.join(childRepo, ".speck");
      const result = await $`readlink ${speckDir}`.quiet().text();

      const end = performance.now();
      timings.push(end - start);

      // Verify symlink exists
      expect(result.trim()).toBeTruthy();
    }

    // Calculate p95
    timings.sort((a, b) => a - b);
    const p95Index = Math.floor(timings.length * 0.95);
    const p95 = timings[p95Index]!;

    console.log(`Symlink resolution (ms): min=${Math.min(...timings).toFixed(2)}, median=${timings[Math.floor(timings.length/2)]!.toFixed(2)}, p95=${p95.toFixed(2)}, max=${Math.max(...timings).toFixed(2)}`);

    // Symlink resolution should be very fast
    expect(p95).toBeLessThan(10);
  });

  test("T080: Detection overhead negligible vs total command time", async () => {
    const childRepo = fixture.childRepos.get("service-c")!;
    const originalCwd = process.cwd();

    // Create a branch first
    await $`cd ${childRepo} && bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/test-overhead --base main --spec 009-multi-repo-stacked`.quiet();

    // Measure total command time
    const totalTimings: number[] = [];
    for (let i = 0; i < 20; i++) {
      const start = performance.now();
      await $`cd ${childRepo} && bun run ${fixture.scriptsDir}/branch-command.ts status`.quiet();
      const end = performance.now();
      totalTimings.push(end - start);
    }

    // Measure just detection time
    const detectionTimings: number[] = [];
    for (let i = 0; i < 20; i++) {
      process.chdir(childRepo);
      const start = performance.now();
      await detectSpeckRoot();
      const end = performance.now();
      detectionTimings.push(end - start);
    }

    process.chdir(originalCwd);

    const avgTotal = totalTimings.reduce((a, b) => a + b, 0) / totalTimings.length;
    const avgDetection = detectionTimings.reduce((a, b) => a + b, 0) / detectionTimings.length;
    const overheadPercent = (avgDetection / avgTotal) * 100;

    console.log(`Command time: ${avgTotal.toFixed(1)}ms, Detection time: ${avgDetection.toFixed(1)}ms, Overhead: ${overheadPercent.toFixed(1)}%`);

    // Detection should be <10% of total command time
    expect(overheadPercent).toBeLessThan(10);
  });
});
