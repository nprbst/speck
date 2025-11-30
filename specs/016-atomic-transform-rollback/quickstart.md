# Quickstart: Atomic Transform Rollback

**Feature**: 016-atomic-transform-rollback
**Date**: 2025-11-30

## Prerequisites

- **Bun**: 1.0+ (runtime and test framework)
- **TypeScript**: 5.3+ (strict mode enabled)
- **Git**: 2.30+ (for version control)
- **Operating System**: macOS or Linux (POSIX atomic rename required)

## Installation

```bash
# Clone the repository (if not already done)
git clone <repository-url>
cd speck-016-atomic-transform-rollback

# Install dependencies
bun install

# Verify setup
bun test
```

## Project Structure

```text
.speck/
├── scripts/
│   ├── common/
│   │   ├── file-ops.ts              # Existing atomic file operations
│   │   ├── transformation-history.ts # Status tracking (extend)
│   │   └── staging-manager.ts       # NEW: Staging lifecycle (implement)
│   └── transform-upstream/
│       └── index.ts                 # NEW: Orchestration (implement)

tests/
├── unit/
│   └── staging-manager.test.ts      # NEW: Unit tests (implement)
└── integration/
    └── transform-rollback.test.ts   # NEW: Integration tests (implement)

specs/016-atomic-transform-rollback/
├── spec.md                          # Feature specification
├── plan.md                          # Implementation plan
├── research.md                      # Research findings
├── data-model.md                    # Entity definitions
├── quickstart.md                    # This file
└── tasks.md                         # Task breakdown (generate with /speck:tasks)
```

## Development Commands

```bash
# Run all tests
bun test

# Run tests in watch mode
bun test --watch

# Run specific test file
bun test tests/unit/staging-manager.test.ts

# Type check
bun run typecheck

# Lint
bun run lint

# Format
bun run format

# Full preflight validation
bun preflight
```

## Development Workflow (TDD)

This feature follows Test-Driven Development. For each task:

1. **Red**: Write a failing test that captures the requirement
2. **Green**: Write minimum code to make the test pass
3. **Refactor**: Improve code quality while keeping tests green

### Example TDD Cycle

```typescript
// 1. RED - Write failing test
describe("createStagingDirectory", () => {
  it("creates staging directory with correct structure", async () => {
    const context = await createStagingDirectory("v2.1.0");

    expect(await exists(context.rootDir)).toBe(true);
    expect(await exists(context.scriptsDir)).toBe(true);
    expect(await exists(context.commandsDir)).toBe(true);
  });
});

// 2. GREEN - Implement to pass
export async function createStagingDirectory(version: string): Promise<StagingContext> {
  const rootDir = `.speck/.transform-staging/${version}`;
  await mkdir(rootDir, { recursive: true });
  // ... create subdirectories
  return { rootDir, scriptsDir: `${rootDir}/scripts`, /* ... */ };
}

// 3. REFACTOR - Improve without breaking tests
```

## Key Implementation Files

### staging-manager.ts (New)

Core module for staging lifecycle management:

```typescript
// Types
export interface StagingContext { /* ... */ }
export interface StagingMetadata { /* ... */ }
export type StagingStatus = "staging" | "agent1-complete" | /* ... */;

// Functions to implement
export async function createStagingDirectory(version: string): Promise<StagingContext>;
export async function listStagedFiles(context: StagingContext): Promise<StagedFile[]>;
export async function commitStaging(context: StagingContext): Promise<void>;
export async function rollbackStaging(context: StagingContext): Promise<void>;
export async function detectOrphanedStaging(): Promise<string[]>;
export async function getStagingStatus(directory: string): Promise<StagingMetadata>;
export async function inspectStaging(context: StagingContext): Promise<InspectionResult>;
```

### Existing Modules to Use

**file-ops.ts** - Atomic file operations:
```typescript
import {
  createTempDir,
  removeDirectory,
  atomicMove,
  withTempDir,
  atomicWrite
} from "../common/file-ops";
```

**transformation-history.ts** - Status tracking:
```typescript
import {
  readHistory,
  writeHistory,
  updateTransformationStatus
} from "../common/transformation-history";
```

## Testing Strategy

### Unit Tests

Test individual functions in isolation:

```typescript
// tests/unit/staging-manager.test.ts
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { createStagingDirectory, rollbackStaging } from "../../.speck/scripts/common/staging-manager";

describe("staging-manager", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await createTempTestDir();
  });

  afterEach(async () => {
    await cleanupTestDir(testDir);
  });

  // ... tests
});
```

### Integration Tests

Test complete workflows:

```typescript
// tests/integration/transform-rollback.test.ts
describe("transform-upstream rollback", () => {
  it("rolls back when Agent 2 fails", async () => {
    // Setup: Create mock upstream with transformable files
    // Execute: Run transformation with Agent 2 failure injection
    // Verify: Production directories unchanged, staging cleaned up
  });
});
```

## Common Tasks

### Create Test Fixtures

```bash
# Create mock upstream release for testing
mkdir -p tests/fixtures/upstream/v2.1.0/.specify/scripts/bash
echo '#!/bin/bash\necho "test"' > tests/fixtures/upstream/v2.1.0/.specify/scripts/bash/test.sh
```

### Debug Staging State

```typescript
// Inspect staging directory contents
import { inspectStaging, detectOrphanedStaging } from "../common/staging-manager";

const orphans = await detectOrphanedStaging();
if (orphans.length > 0) {
  for (const dir of orphans) {
    const info = await inspectStaging({ rootDir: dir, /* ... */ });
    console.log(info);
  }
}
```

### Manual Cleanup

If tests leave orphaned staging directories:

```bash
# List orphaned staging directories
ls -la .speck/.transform-staging/

# Clean up manually
rm -rf .speck/.transform-staging/
```

## Troubleshooting

### Tests Fail with "ENOENT"

Ensure test fixtures exist and paths are correct. Tests should create their own isolated directories.

### Atomic Move Fails

- Verify source and destination are on the same filesystem
- Check for permission issues
- Ensure target directory exists

### Orphaned Staging Not Detected

Check that `.speck/.transform-staging/` directory exists and contains version subdirectories.

## Next Steps

1. Generate tasks: `/speck:tasks`
2. Start implementation: `/speck:implement`
3. Run preflight before completion: `bun preflight`
