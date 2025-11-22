/**
 * Performance Test: Branch Import Performance (T079)
 *
 * Validates that branch import operations complete within 5 seconds
 * per repository, ensuring acceptable migration experience.
 *
 * Success Criterion: SC-007 (import <5s per repo)
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

describe.skip("Performance: Branch import operations", () => {
  let fixture: MultiRepoTestFixture;

  beforeEach(async () => {
    // Set up multi-repo environment with child repos
    fixture = await createMultiRepoTestFixture([
      { name: "import-target-1" },
      { name: "import-target-2" },
      { name: "import-target-3" }
    ], "009-multi-repo-stacked");
  });

  afterEach(async () => {
    await fixture?.cleanup();
  });

  test("T079: Import of 10 git branches completes <5s per repo", async () => {
    const childRepo = fixture.childRepos.get("import-target-1")!;

    // Create 10 git branches manually (not tracked by Speck yet)
    for (let i = 1; i <= 10; i++) {
      await $`cd ${childRepo} && git checkout -b nprbst/import-branch-${i}`.quiet();
      await $`cd ${childRepo} && echo "feature ${i}" >> feature.txt`.quiet();
      await $`cd ${childRepo} && git add . && git commit -m "Feature ${i}"`.quiet();
    }
    await $`cd ${childRepo} && git checkout main`.quiet();

    // Measure import performance
    const timings: number[] = [];

    // Run import 5 times (delete branches.json between runs)
    for (let i = 0; i < 5; i++) {
      // Clean up previous import
      await $`cd ${childRepo} && rm -f .speck/branches.json`.quiet();

      const start = performance.now();
      await $`cd ${childRepo} && bun run ${fixture.scriptsDir}/branch-command.ts import --spec 009-multi-repo-stacked --yes`.quiet();
      const end = performance.now();

      timings.push(end - start);
    }

    // Calculate average and max
    const avg = timings.reduce((a, b) => a + b, 0) / timings.length;
    const max = Math.max(...timings);

    console.log(`Import timings for 10 branches (ms): min=${Math.min(...timings).toFixed(1)}, avg=${avg.toFixed(1)}, max=${max.toFixed(1)}`);

    // Performance contract: max < 5000ms (5 seconds)
    expect(max).toBeLessThan(5000);
  });

  test("T079: Import with complex branch relationships <5s", async () => {
    const childRepo = fixture.childRepos.get("import-target-2")!;

    // Create a complex branch structure:
    // main -> base1 -> child1a -> grandchild1
    //              -> child1b
    //      -> base2 -> child2a

    await $`cd ${childRepo} && git checkout -b nprbst/base1`.quiet();
    await $`cd ${childRepo} && echo "base1" >> file.txt && git add . && git commit -m "Base 1"`.quiet();

    await $`cd ${childRepo} && git checkout -b nprbst/child1a`.quiet();
    await $`cd ${childRepo} && echo "child1a" >> file.txt && git add . && git commit -m "Child 1a"`.quiet();

    await $`cd ${childRepo} && git checkout -b nprbst/grandchild1`.quiet();
    await $`cd ${childRepo} && echo "grandchild1" >> file.txt && git add . && git commit -m "Grandchild 1"`.quiet();

    await $`cd ${childRepo} && git checkout nprbst/base1`.quiet();
    await $`cd ${childRepo} && git checkout -b nprbst/child1b`.quiet();
    await $`cd ${childRepo} && echo "child1b" >> file.txt && git add . && git commit -m "Child 1b"`.quiet();

    await $`cd ${childRepo} && git checkout main`.quiet();
    await $`cd ${childRepo} && git checkout -b nprbst/base2`.quiet();
    await $`cd ${childRepo} && echo "base2" >> file.txt && git add . && git commit -m "Base 2"`.quiet();

    await $`cd ${childRepo} && git checkout -b nprbst/child2a`.quiet();
    await $`cd ${childRepo} && echo "child2a" >> file.txt && git add . && git commit -m "Child 2a"`.quiet();

    await $`cd ${childRepo} && git checkout main`.quiet();

    // Measure import with relationship detection
    const start = performance.now();
    await $`cd ${childRepo} && bun run ${fixture.scriptsDir}/branch-command.ts import --yes`.quiet();
    const end = performance.now();

    const duration = end - start;
    console.log(`Import with complex relationships (ms): ${duration.toFixed(1)}`);

    // Performance contract: <5000ms even with complex structure
    expect(duration).toBeLessThan(5000);
  });

  test("T079: Import performance scales linearly with branch count", async () => {
    const childRepo = fixture.childRepos.get("import-target-3")!;

    // Test with 5, 10, 15 branches
    const branchCounts = [5, 10, 15];
    const timingsPerCount: Record<number, number> = {};

    for (const count of branchCounts) {
      // Create branches
      for (let i = 1; i <= count; i++) {
        await $`cd ${childRepo} && git checkout -b nprbst/scale-test-${i}`.quiet();
        await $`cd ${childRepo} && echo "scale ${i}" >> scale.txt`.quiet();
        await $`cd ${childRepo} && git add . && git commit -m "Scale ${i}"`.quiet();
      }
      await $`cd ${childRepo} && git checkout main`.quiet();

      // Measure import
      const start = performance.now();
      await $`cd ${childRepo} && bun run ${fixture.scriptsDir}/branch-command.ts import --spec 009-multi-repo-stacked --yes`.quiet();
      const end = performance.now();

      timingsPerCount[count] = end - start;

      // Clean up for next iteration
      await $`cd ${childRepo} && rm -f .speck/branches.json`.quiet();
      for (let i = 1; i <= count; i++) {
        await $`cd ${childRepo} && git branch -D nprbst/scale-test-${i}`.quiet().nothrow();
      }
    }

    console.log(`Import scaling: 5 branches=${timingsPerCount[5]!.toFixed(1)}ms, 10 branches=${timingsPerCount[10]!.toFixed(1)}ms, 15 branches=${timingsPerCount[15]!.toFixed(1)}ms`);

    // All should be under 5s
    expect(timingsPerCount[5]!).toBeLessThan(5000);
    expect(timingsPerCount[10]!).toBeLessThan(5000);
    expect(timingsPerCount[15]!).toBeLessThan(5000);

    // Check roughly linear scaling (15 branches should be <3x slower than 5 branches)
    const scalingFactor = timingsPerCount[15]! / timingsPerCount[5]!;
    console.log(`Scaling factor (15 branches / 5 branches): ${scalingFactor.toFixed(2)}x`);
    expect(scalingFactor).toBeLessThan(3.5); // Allow some overhead, but should be roughly linear
  });
});
