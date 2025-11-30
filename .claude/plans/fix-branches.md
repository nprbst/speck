# Plan: Fix --branch Flag and Always Write branches.json

## Problem Summary

1. **`--branch` flag ignored**: The `/speck.specify` slash command doesn't parse or forward the `--branch` flag to `create-new-feature`
2. **`branches.json` incomplete**: Only written for "non-standard" branches (those not matching `^\d{3}-` pattern), but should contain ALL branches for a complete picture

## Files to Modify

### 1. `.claude/commands/speck.specify.md`
**Purpose**: Add `--branch` flag parsing and pass-through

**Changes**:
- Add `--branch` to the documented flags
- Parse `--branch <name>` from user input in step 2
- Include `--branch` in the command construction (step 2f)

### 2. `.speck/scripts/create-new-feature.ts`
**Purpose**: Always write to branches.json regardless of branch naming pattern

**Changes** (around line 548):
- Remove the `isNonStandardBranch` condition from the branches.json write logic
- Change from: `if (isNonStandardBranch && hasGit)`
- Change to: `if (hasGit)`
- Update log message to reflect that all branches are recorded

### 3. `tests/integration/create-feature-branch.test.ts`
**Purpose**: Update tests to expect branches.json for ALL branches

**Changes**:
- **Lines 149-175** ("standard-looking --branch names"): Currently tests that standard names DON'T create entries - need to invert this expectation
- **Lines 53-69** (standard branch creation): Add assertion that branches.json IS created
- Add new test case: verify standard branch (no --branch flag) writes to branches.json

### 4. `tests/unit/branch-mapper.test.ts`
**Purpose**: Add/update tests for unconditional branches.json writing

**Changes**:
- Add test section for `isStandardBranch()` helper if it exists, or document that all branches should be recorded

## Implementation Details

### Change 1: Update speck.specify.md

In the command's input parsing section, add recognition of `--branch`:
```
--branch <name>  Custom branch name (recorded in branches.json)
```

In the command construction step, include `--branch` when provided:
```bash
speck create-new-feature --json --no-ide --number N --short-name "name" --branch "custom-branch" "description"
```

### Change 2: Update create-new-feature.ts

**Line ~548**: Remove conditional, always write branches.json when git is available:

```typescript
// Before:
if (isNonStandardBranch && hasGit) {

// After:
if (hasGit) {
```

**Rationale**: `branches.json` should be the authoritative source for spec-to-branch mappings, not reliant on naming conventions.

### Change 3: Update create-feature-branch.test.ts

**Test at lines 149-175** ("standard-looking --branch names"):
- Currently expects `branches.json` to NOT exist for standard-format branch names
- Update to expect `branches.json` to exist with the correct mapping

**Test at lines 53-69** (standard branch creation without --branch flag):
- Add assertion: `expect(existsSync(branchesFile)).toBe(true)`
- Add assertion: verify branches.json contains correct spec-to-branch mapping

**New test case**:
```typescript
test('should write branches.json for standard branch names (no --branch flag)', async () => {
  const result = await $`bun run ${scriptPath} --json --no-worktree "Test Feature"`.cwd(repoPath);
  const output = JSON.parse(result.stdout.toString());

  const branchesFile = join(repoPath, '.speck', 'branches.json');
  expect(existsSync(branchesFile)).toBe(true);

  const branchesContent = JSON.parse(readFileSync(branchesFile, 'utf-8'));
  expect(branchesContent.branches).toHaveLength(1);
  expect(branchesContent.branches[0].branchName).toBe(output.branch);
  expect(branchesContent.branches[0].specId).toBe(output.specId);
});
```

### Change 4: Update branch-mapper.test.ts (if needed)

Review and update any unit tests that assert conditional writing behavior based on branch name patterns.

## Testing Verification

After implementation, run:
```bash
bun test tests/integration/create-feature-branch.test.ts
bun test tests/unit/branch-mapper.test.ts
```

Verify:
1. `--branch` flag is passed through from `/speck.specify`
2. Standard branches (NNN-name format) now create branches.json entries
3. Non-standard branches continue to work as before
4. All existing tests pass (with updated expectations)
