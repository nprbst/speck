# Plan: Move Git Branch Checking from speck.specify to TypeScript Subcommand

## Problem Statement

The `speck.specify` slash command (`.claude/commands/speck.specify.md` lines 39-85) contains bash-based git branch checking logic that Claude Code executes directly:

```bash
git fetch --all --prune
git ls-remote --heads origin | grep -E 'refs/heads/[0-9]+-' | ...
git branch | grep -E '[0-9]+-' | ...
ls -d specs/[0-9]*-* 2>/dev/null | ...
```

This causes verbose output in the user's terminal and duplicates logic already present in `create-new-feature.ts` (`checkExistingBranches()` function at lines 263-324).

## Current State

1. **speck.specify.md** - Claude Code command that:
   - Generates short names from feature descriptions (step 1)
   - Runs bash commands to check git branches (step 2a-2d)
   - Detects multi-repo mode via `speck check-prerequisites --json` (step 2e)
   - Calls `speck create-new-feature --json --number N --short-name "name"` (step 2f)

2. **create-new-feature.ts** - Already has `checkExistingBranches()` function that does the same git checking but only for the specific short-name, not for finding the highest number overall.

3. **speck.ts** - Unified CLI using Commander.js pattern with `lazyMain` for heavy commands.

## Recommended Approach

Create a new `speck next-feature` subcommand that consolidates all the pre-creation logic.

### New Subcommand: `speck next-feature`

**Input:**
- `--short-name <name>` (optional - LLM generates and passes this)
- `--json` flag for structured output

**Output (JSON):**
```json
{
  "NEXT_NUMBER": 16,
  "BRANCH_NAME": "016-user-auth",
  "MODE": "single-repo" | "multi-repo",
  "SPECS_DIR": "/path/to/specs"
}
```

**Logic:**
1. `git fetch --all --prune`
2. Find highest number across remotes, locals, and specs directories
3. Check if provided short-name already exists (increment if needed)
4. Detect multi-repo mode via `detectSpeckRoot()` (replaces `check-prerequisites` call)
5. Return computed values

### Updated speck.specify.md

Replace bash commands (steps 2a-2e) with single call:
```bash
speck next-feature --json --short-name "user-auth"
```

Then parse JSON output for `NEXT_NUMBER`, `MODE`. The LLM continues to generate the short-name from the feature description (step 1).

## Files to Modify

1. **New file**: `.speck/scripts/next-feature.ts` - New subcommand implementation
2. **Modify**: `.speck/scripts/commands/index.ts` - Register new command
3. **Modify**: `.speck/scripts/speck.ts` - Add Commander.js registration
4. **Modify**: `.claude/commands/speck.specify.md` - Replace bash with single command call

## Implementation Steps

### Step 1: Create `next-feature.ts`

Extract and consolidate from existing code:
- `getHighestFromSpecs()` from `create-new-feature.ts:239-258`
- `checkExistingBranches()` from `create-new-feature.ts:263-324`
- Add new `getHighestOverall()` function to find max across all branches/specs
- Use `detectSpeckRoot()` from `common/paths.ts` for mode detection

**Key functions:**
```typescript
async function getHighestOverall(specsDir: string): Promise<number>
async function checkShortNameExists(shortName: string, specsDir: string): Promise<number>
```

### Step 2: Register in command registry

Add to `.speck/scripts/commands/index.ts`:
```typescript
const lazyNextFeatureMain = async (): Promise<MainFunction> => {
  const module = await import("../next-feature");
  return module.main;
};

// In registry:
"next-feature": {
  lazyMain: lazyNextFeatureMain,
  description: "Get next feature number and detect multi-repo mode",
  version: "1.0.0",
},
```

### Step 3: Add to speck.ts CLI

Add Commander.js command following existing pattern (like `create-new-feature`).

### Step 4: Update speck.specify.md

Replace steps 2a-2e with:
```markdown
2. **Get next feature number and detect mode**:

   Run: `speck next-feature --json --short-name "<short-name>"`

   Parse the JSON output:
   - `NEXT_NUMBER`: The next available feature number
   - `MODE`: "single-repo" or "multi-repo"

   If `MODE` is "multi-repo":
   - Ask user: "Create spec at parent (shared) or local (this repo only)?"
   - Store answer as `SPEC_LOCATION`

3. **Create the feature**:
   Run: `speck create-new-feature --json --number $NEXT_NUMBER --short-name "<short-name>" [--shared-spec | --local-spec] "$ARGUMENTS"`
```
