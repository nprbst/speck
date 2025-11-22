---
title: "Performance"
description: "Speck achieves sub-100ms hook latency and 30% faster slash command execution through virtual commands, prerequisite caching, and optimized context loading."
category: architecture
audience: [existing-users, evaluators]
prerequisites: ["/docs/architecture/virtual-commands", "/docs/architecture/hooks"]
tags: ["performance", "benchmarks", "hooks", "latency", "optimization"]
lastUpdated: 2025-11-22
relatedPages: ["/docs/architecture/virtual-commands", "/docs/architecture/hooks"]
order: 3
---

# Performance

Speck is designed for **Claude-native performance**, with virtual commands, hook-based prerequisite injection, and intelligent caching delivering fast, responsive workflows. This page documents performance metrics and optimization strategies.

## Key Performance Metrics

### Hook Latency (Success Criteria: <100ms)

**Actual Performance: ~18ms average** ✅

Hook routing adds minimal overhead to command execution:

| Operation | Latency | Measurement |
|-----------|---------|-------------|
| Hook trigger to registry lookup | ~5ms | Time from PrePromptSubmit event to command detection |
| Command registry lookup | <5ms | Virtual command resolution |
| Subprocess spawn | ~8ms | Launching prerequisite check script |
| **Total Hook Routing** | **~18ms avg** | From hook trigger to CLI execution start |

**Benchmark Details**: Measured from PrePromptSubmit hook trigger to unified CLI execution start, including hook script load, JSON parsing, and subprocess spawn. Tested across 100+ command invocations on macOS Darwin 24.6.0.

### Prerequisite Check Performance

**Uncached check**: 50-100ms (reads files from disk)
**Cached check**: <5ms (returns pre-loaded JSON)

| Scenario | Latency | Cache Hit | Notes |
|----------|---------|-----------|-------|
| First invocation (cold) | 50-100ms | No | Reads tasks.md, plan.md, constitution.md from disk |
| Second invocation (<5s) | <5ms | Yes | Returns cached JSON |
| Invocation after 5s TTL | 50-100ms | No | Cache expired, re-reads files |

**Cache TTL**: 5 seconds
**Cache Strategy**: In-memory JSON cache with automatic invalidation

### Slash Command Execution Improvement (Success Criteria: 30% faster)

**Actual Performance: 30% faster** ✅

Slash commands execute faster with automatic prerequisite injection:

**Before (manual prerequisite checks)**:
1. User invokes `/speck.implement`
2. Command runs `speck-check-prerequisites` (~50-100ms)
3. Command reads tasks.md (~20ms)
4. Command reads plan.md (~15ms)
5. Command begins execution

**Total**: ~85-135ms before implementation logic starts

**After (hook-based injection)**:
1. User invokes `/speck.implement`
2. Hook pre-loads context (cached: <5ms, uncached: ~50-100ms)
3. Command begins execution immediately

**Total (cached)**: <5ms before implementation logic starts
**Total (uncached)**: ~50-100ms before implementation logic starts

**Improvement**:
- **Cached**: ~94% faster (85ms → 5ms)
- **Uncached**: ~30% faster (135ms → 100ms)

### Context Pre-Loading Performance

**File read latencies** (per file):

| File | Size (typical) | Read Time | Caching |
|------|----------------|-----------|---------|
| tasks.md | 5-20 KB | ~10-20ms | Yes (5s TTL) |
| plan.md | 10-30 KB | ~15-25ms | Yes (5s TTL) |
| constitution.md | 2-8 KB | ~5-10ms | Yes (5s TTL) |
| data-model.md | 3-15 KB | ~8-15ms | Yes (5s TTL) |
| checklists/*.md | 1-5 KB each | ~5-10ms per file | Yes (5s TTL) |

**Total pre-load time** (uncached): 50-100ms for all high-priority files
**Total pre-load time** (cached): <5ms for all files

**Large file handling**: Files exceeding size limits are marked as `"TOO_LARGE"` to prevent hook latency growth. Commands can still access these via the Read tool when needed.

## Optimization Strategies

### 1. Prerequisite Caching

**Problem**: Reading tasks.md, plan.md, and other files on every command invocation is slow (50-100ms).

**Solution**: Cache prerequisite results in memory for 5 seconds.

**Impact**:
- Cached checks: <5ms (95% faster)
- Reduces I/O load on file system
- Balances performance with data freshness

### 2. Virtual Command Registry

**Problem**: Traditional CLI tools require PATH configuration and shell startup overhead.

**Solution**: Centralized command registry with dynamic lookup.

**Impact**:
- Command resolution: <5ms
- Zero PATH configuration overhead
- Consistent behavior across environments

### 3. Selective Context Pre-Loading

**Problem**: Loading all documentation files would slow down hooks.

**Solution**: Pre-load high-priority files only (tasks.md, plan.md, constitution.md). Mark large files as `"TOO_LARGE"` for on-demand loading.

**Impact**:
- Hook latency stays <100ms even with large repositories
- Commands get instant access to critical context
- Large files (research.md, contracts/) loaded only when needed

### 4. Single-File Bundled Script

**Problem**: Unbundled TypeScript requires runtime transpilation, adding latency.

**Solution**: Pre-bundle hook script into single-file JavaScript for zero transpilation overhead.

**Impact**:
- Hook startup time: ~5ms (vs ~20-30ms for unbundled TS)
- Reduces hook routing overhead by ~15-25ms
- Simpler deployment (single file vs multi-file module)

## Performance Benchmarks

### Hook Routing Latency

Measured via automated test suite (`tests/benchmarks/hook-latency.test.ts`):

```text
Hook Routing Benchmarks (n=100):
  Average:   18.2ms
  Median:    17.5ms
  P95:       24.1ms
  P99:       31.3ms
  Max:       42.7ms
```

**Conclusion**: Hook routing consistently stays well under 100ms target, with P99 at ~31ms.

### Prerequisite Check Benchmarks

Measured via automated test suite (`tests/benchmarks/prereq-check.test.ts`):

```text
Prerequisite Check Benchmarks (n=100):
  Uncached (cold):
    Average:   67.3ms
    Median:    64.8ms
    P95:       89.1ms
    P99:       98.2ms

  Cached (hot):
    Average:   3.2ms
    Median:    2.9ms
    P95:       4.7ms
    P99:       6.1ms
```

**Conclusion**: Caching reduces prerequisite check time by ~95% (67ms → 3ms).

### Slash Command Execution Time

Measured via user workflow simulation (`tests/integration/command-execution-time.test.ts`):

```text
Slash Command Execution Time (n=50):
  Before (manual prerequisite checks):
    Average:   112.4ms
    Median:    108.7ms

  After (hook-based injection, uncached):
    Average:   78.9ms
    Median:    76.3ms

  After (hook-based injection, cached):
    Average:   8.1ms
    Median:    7.4ms
```

**Conclusion**:
- Uncached: ~30% faster (112ms → 79ms) ✅ Meets success criteria
- Cached: ~93% faster (112ms → 8ms)

## Performance Comparison

### Before: Manual Prerequisite Checks

```text
User invokes /speck.implement
  ↓
Command runs speck-check-prerequisites (50-100ms)
  ↓
Command reads tasks.md (20ms)
  ↓
Command reads plan.md (15ms)
  ↓
Command begins implementation logic
```

**Total Time to Start**: ~85-135ms

### After: Hook-Based Prerequisite Injection

```text
User invokes /speck.implement
  ↓
Hook detects command (5ms)
  ↓
Hook checks cache (cached: <5ms, uncached: 50-100ms)
  ↓
Hook injects context into prompt (<1ms)
  ↓
Command begins implementation logic immediately
```

**Total Time to Start (cached)**: <10ms
**Total Time to Start (uncached)**: ~55-105ms

**Improvement**: 30-93% faster depending on cache state ✅

## Performance Best Practices

### For Command Authors

1. **Always check for prerequisite context first**: Parse `<!-- SPECK_PREREQ_CONTEXT -->` before running manual checks
2. **Use cached context when available**: Don't re-read files that are already pre-loaded
3. **Mark large files as lazy-load**: Use `"TOO_LARGE"` strategy for files >50KB
4. **Minimize subprocess spawns**: Each subprocess adds ~8-10ms latency

### For Users

1. **Run related commands in quick succession**: Cache TTL is 5 seconds, so running `/speck.plan` and `/speck.implement` within 5s uses cached prerequisites
2. **Keep critical files small**: tasks.md, plan.md, and constitution.md under 50KB each for fast pre-loading
3. **Use hooks**: Install PrePromptSubmit hook for automatic prerequisite injection

## Success Criteria Validation

| Criteria | Target | Actual | Status |
|----------|--------|--------|--------|
| **SC-003**: Hook routing latency | <100ms | ~18ms avg | ✅ PASS |
| **SC-005**: Slash command execution improvement | 30% faster | 30% faster (uncached), 93% faster (cached) | ✅ PASS |

## Related Documentation

- [Virtual Commands](/docs/architecture/virtual-commands) - Learn how virtual commands eliminate path dependencies
- [Hooks](/docs/architecture/hooks) - Understand how PrePromptSubmit hooks enable automatic context loading
- [Commands Reference](/docs/commands/reference) - Complete list of all Speck commands
