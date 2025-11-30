/**
 * Performance benchmark: Hook routing latency (SC-003)
 * Target: <100ms from PreToolUse trigger to CLI execution start
 */

import { describe, test, expect } from 'bun:test';
import { performance } from 'perf_hooks';
import type { HookInput } from '../../.speck/scripts/lib/types';

describe('Hook Routing Latency Benchmark', () => {
  test('SC-003: Hook routing latency should be <100ms', async () => {
    const iterations = 100;
    const latencies: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const hookInput: HookInput = {
        tool_name: 'Bash',
        tool_input: {
          command: 'speck-env',
          description: 'Test command for latency measurement',
        },
      };

      const startTime = performance.now();

      // Simulate hook invocation
      const proc = Bun.spawn(['bun', '.speck/dist/speck-hook.js'], {
        stdin: 'pipe',
        stdout: 'pipe',
        stderr: 'pipe',
      });

      // Send hook input
      proc.stdin.write(JSON.stringify(hookInput));
      proc.stdin.end();

      // Wait for output
      await proc.exited;

      const endTime = performance.now();
      const latency = endTime - startTime;
      latencies.push(latency);
    }

    // Calculate statistics
    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const maxLatency = Math.max(...latencies);
    const minLatency = Math.min(...latencies);
    const p95Latency = latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.95)]!;

    console.log(`\n📊 Hook Routing Latency Benchmark Results (${iterations} iterations):`);
    console.log(`   Average: ${avgLatency.toFixed(2)}ms`);
    console.log(`   Min: ${minLatency.toFixed(2)}ms`);
    console.log(`   Max: ${maxLatency.toFixed(2)}ms`);
    console.log(`   P95: ${p95Latency.toFixed(2)}ms`);
    console.log(`   Target: <100ms`);

    // Assert target
    expect(p95Latency).toBeLessThan(100);
    expect(avgLatency).toBeLessThan(100);
  });

  test('CLI execution start latency should be <50ms', async () => {
    const iterations = 100;
    const latencies: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();

      // Direct CLI invocation (no hook overhead)
      const proc = Bun.spawn(['bun', '.speck/scripts/speck.ts', 'test-hello', 'world'], {
        stdout: 'pipe',
        stderr: 'pipe',
      });

      await proc.exited;

      const endTime = performance.now();
      const latency = endTime - startTime;
      latencies.push(latency);
    }

    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;

    console.log(`\n📊 CLI Execution Start Latency: ${avgLatency.toFixed(2)}ms`);
    console.log(`   Target: <50ms for baseline comparison`);

    expect(avgLatency).toBeLessThan(50);
  });
});
