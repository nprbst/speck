# Handoff: Restore Incorrectly Deleted Test Files

## Context

During the 015-scope-simplification Phase 1 cleanup, test files were deleted to remove tests related to the removed `branch-command.ts` (stacked PR command). However, some files were **entirely deleted** when only **portions** of them contained branch-command tests. The non-branch tests should be restored.

## Files That Were Correctly Deleted (100% branch-command tests)

These files were entirely about stacked PR / branch-command functionality and should stay deleted:

### Contract Tests
- `tests/contract/base-branch-validation.test.ts`
- `tests/contract/branch-create-child.test.ts`
- `tests/contract/branch-list-all.test.ts`
- `tests/contract/branch-status-all.test.ts`
- `tests/contract/main-branch-names.test.ts`
- `tests/contract/parallel-branch-creation.test.ts`
- `tests/contract/cross-repo-error.test.ts`
- `tests/contract/env-aggregate-status.test.ts`
- `tests/contract/error-alternatives.test.ts`
- `tests/contract/import-json-schema.test.ts`
- `tests/contract/import-prompt.test.ts`
- `tests/contract/pr-suggestion-child.test.ts`
- `tests/contract/pr-title-prefix.test.ts`
- `tests/contract/independent-stacks.test.ts`
- `tests/contract/no-remote-warning.test.ts`

### E2E Tests
- `tests/e2e/branch-create-child-e2e.test.ts`
- `tests/e2e/branch-list-all-e2e.test.ts`
- `tests/e2e/cross-repo-error-e2e.test.ts`
- `tests/e2e/env-aggregate-e2e.test.ts`
- `tests/e2e/env-child-context-e2e.test.ts`
- `tests/e2e/import-child-e2e.test.ts`
- `tests/e2e/parallel-stacks-e2e.test.ts`
- `tests/e2e/child-isolation-e2e.test.ts`
- `tests/e2e/cross-repo-validation-e2e.test.ts`

### Integration Tests
- `tests/integration/branch-create-integration.test.ts`
- `tests/integration/branch-list-all-integration.test.ts`
- `tests/integration/migration-validation.test.ts`
- `tests/integration/env-multi-repo-integration.test.ts`

### Multi-Step Tests
- `tests/multi-step/branch-workflow.test.ts`
- `tests/multi-step/session-context.test.ts`
- `tests/multi-step/session-isolation.test.ts`
- `tests/multi-step/cross-repo-workflow.test.ts`

### Performance Tests
- `tests/performance/branch-lookup-perf.test.ts`
- `tests/performance/import-perf.test.ts`
- `tests/performance/aggregate-status-perf.test.ts`
- `tests/performance/detection-overhead.test.ts`

### Other
- `tests/branch-management.test.ts`

## Files That Need Review/Restoration

These files may have contained **mixed content** - both branch-command tests AND other valid tests:

### 1. `tests/integration/virtual-command.test.ts`

**What was in it:**
- Tests for `speck-env` command (SHOULD KEEP)
- Tests for `speck-branch` command (should remove)
- Tests for hook mode with various commands
- Tests for `all registered commands` including branch (needs updating)

**Action:** Restore from git, then:
- Remove tests referencing `speck-branch`
- Keep tests for `speck-env`, `speck-analyze`, `speck-echo`
- Update `all registered commands` test to remove `branch` from the list

### 2. `tests/integration/hook-simulation.test.ts`

**What was in it:**
- Echo Command Hook Flow tests (SHOULD KEEP)
- Env Command Hook Flow tests (SHOULD KEEP)
- Pass-Through Behavior tests (SHOULD KEEP)
- Error Handling tests (SHOULD KEEP)
- JSON Output Format tests - includes `speck-branch list` (needs updating)
- Command Output Preservation tests (SHOULD KEEP)
- Concurrent Hook Execution tests (SHOULD KEEP)

**Action:** Restore from git, then:
- Remove `speck-branch list` from the testCommands array in "JSON Output Format Validation" test
- Keep all other tests

### 3. `tests/hooks/validate-hooks.test.ts`

**What was in it:**
- Hook validation tests (likely generic hook tests)

**Action:** Review git history to see what tests were in this file. If it only tested branch-command hooks, leave deleted. If it tested general hook infrastructure, restore.

## How to Restore Files

```bash
# From the speck repository root:

# 1. Check what the files contained before deletion
git show HEAD~1:tests/integration/virtual-command.test.ts | head -100
git show HEAD~1:tests/integration/hook-simulation.test.ts | head -100
git show HEAD~1:tests/hooks/validate-hooks.test.ts | head -100

# 2. Restore specific files
git checkout HEAD~1 -- tests/integration/virtual-command.test.ts
git checkout HEAD~1 -- tests/integration/hook-simulation.test.ts
git checkout HEAD~1 -- tests/hooks/validate-hooks.test.ts

# 3. Then edit each file to remove branch-command specific tests
```

## Specific Edits Needed After Restoration

### `tests/integration/virtual-command.test.ts`

Remove these tests:
- `speck-branch command accepts list subcommand`
- `hook mode intercepts speck-branch command`

Update this test:
- `all registered commands are accessible` - remove `"branch"` from the commands array

### `tests/integration/hook-simulation.test.ts`

In the `JSON Output Format Validation` describe block, update the `testCommands` array:
```typescript
// BEFORE
const testCommands = [
  "speck-echo test",
  "speck-env",
  "speck-branch list",  // REMOVE THIS
  "ls -la",
];

// AFTER
const testCommands = [
  "speck-echo test",
  "speck-env",
  "ls -la",
];
```

## Verification

After restoration and edits:
```bash
bun test tests/integration/virtual-command.test.ts
bun test tests/integration/hook-simulation.test.ts
bun test tests/hooks/validate-hooks.test.ts
```

All tests should pass without referencing `branch-command.ts` or `speck-branch`.

## Files Modified (Not Deleted)

The following file was modified to remove deprecated functions:
- `tests/helpers/multi-repo-fixtures.ts` - Removed `createBranchEntry`, `createBranchChain`, `createMultiRepoTestSetup`, `cleanupMultiRepoTest`, `MultiRepoSetupConfig`, `MultiRepoTestSetup`

This modification was correct - the removed functions/types were only used by deleted stacked PR tests.
