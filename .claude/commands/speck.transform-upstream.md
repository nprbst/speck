---
description: Transform upstream spec-kit release into Speck's Bun TypeScript implementation
---

You are being invoked as a Claude Code slash command to transform an upstream
spec-kit release into Speck's Bun TypeScript implementation.

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Your Task

Orchestrate the transformation of bash scripts and slash-commands from an
upstream release by sequentially invoking two specialized transformation agents.

**ATOMIC STAGING**: This command uses a staging pattern for atomic transformation.
All agent outputs go to staging directories first. Only after both agents succeed
are files atomically committed to production. On any failure, staging is rolled
back and production remains unchanged.

## Execution Steps

### 1. Setup and Validation

1. **Parse user arguments**:
   - Extract `--version <version>` if provided (optional)
   - If no version specified, will use `upstream/latest` symlink target

2. **Check Bun runtime**:
   ```bash
   bun --version
   ```
   - If Bun not found, show error with installation instructions:
     ```
     ERROR: Bun runtime not found. Please install Bun:

       curl -fsSL https://bun.sh/install | bash

     Then restart your terminal and try again.
     ```
   - Exit with error if Bun missing

3. **Check for orphaned staging** (before any other operations):
   ```bash
   bun run packages/maintainer/src/transform-upstream/index.ts status
   ```
   - If orphaned staging directories exist, prompt user:
     ```
     ⚠️  ORPHANED STAGING DETECTED

     Found incomplete staging from previous transformation:
       Version: <version>
       Status: <status>
       Started: <timestamp>
       Files: X scripts, Y commands

     Options:
       1. Commit - Complete the transformation (if both agents finished)
       2. Rollback - Discard staging and start fresh
       3. Inspect - View staged files before deciding

     Enter choice (commit/rollback/inspect):
     ```
   - Handle user response by calling:
     ```bash
     bun run packages/maintainer/src/transform-upstream/index.ts recover <dir> <action>
     ```
   - Block new transformation until orphaned staging is resolved

4. **Resolve version to transform**:
   - If `--version <version>` provided: use that version
   - Otherwise: resolve `upstream/latest` symlink to get version
   ```bash
   readlink upstream/latest
   ```
   - Example: `upstream/latest` → `v0.0.85`

5. **Validate upstream release exists**:
   - Check that `upstream/<version>/` directory exists
   - If not found, show error:
     ```
     ERROR: Version <version> not found in upstream/

     Run /speck.check-upstream to see available releases
     Then run /speck.pull-upstream <version> to download
     ```

### 2. Discovery and Diff Detection Phase

Find source files to transform and detect changes from previous version:

1. **Detect previous transformed version**:
   ```bash
   # Find the most recent transformed version in upstream/releases.json
   # This will be used as the baseline for diff detection
   ```
   - Query `upstream/releases.json` for the latest version with
     `"status": "transformed"`
   - If no previous transformed version exists, treat all files as changed
     (first-time transformation)
   - Store as `PREV_VERSION`

2. **Find bash scripts**:
   ```bash
   find upstream/<version>/.specify/scripts/bash -name "*.sh" -type f
   ```
   - Count total bash scripts found

3. **Find speckit commands**:
   ```bash
   find upstream/<version>/.claude/commands -name "speckit.*.md" -type f
   ```
   - Count total command files found

4. **Detect changed bash scripts** (if `PREV_VERSION` exists):
   ```bash
   diff -qr upstream/<PREV_VERSION>/.specify/scripts/bash/ upstream/<version>/.specify/scripts/bash/ | grep "\.sh"
   ```
   - Parse diff output to identify:
     - **New files**: `Only in upstream/<version>/...`
     - **Modified files**: `Files ... and ... differ`
     - **Deleted files**: `Only in upstream/<PREV_VERSION>/...` (can be
       ignored - no transformation needed)
   - Create list of **CHANGED_BASH_SCRIPTS** (new + modified)
   - If no bash scripts changed, skip Agent 1 entirely

5. **Detect changed speckit commands** (if `PREV_VERSION` exists):
   ```bash
   diff -qr upstream/<PREV_VERSION>/.claude/commands/ upstream/<version>/.claude/commands/ | grep "speckit\."
   ```
   - Parse diff output to identify:
     - **New files**: `Only in upstream/<version>/...`
     - **Modified files**: `Files ... and ... differ`
     - **Deleted files**: `Only in upstream/<PREV_VERSION>/...` (can be
       ignored - no transformation needed)
   - Create list of **CHANGED_SPECKIT_COMMANDS** (new + modified)
   - If no commands changed, skip Agent 2 entirely

6. **Report to user**:
   ```
   Transforming upstream/<version>...

   Baseline: <PREV_VERSION> (or "none - first transformation")

   Bash scripts:
     Total: X scripts
     Changed: Y scripts (N new, M modified)
     Skipped: X-Y unchanged scripts

   Speckit commands:
     Total: A commands
     Changed: B commands (C new, D modified)
     Skipped: A-B unchanged commands
   ```

   If no files changed in either category:
   ```
   ✓ No changes detected between <PREV_VERSION> and <version>

   All bash scripts and commands are identical.
   Skipping transformation agents - updating status only.
   ```

### 3. Initialize Staging

**CRITICAL**: Initialize staging BEFORE invoking any agents.

```bash
bun run packages/maintainer/src/transform-upstream/index.ts init <version>
```

Parse the JSON output to extract staging directories:
```json
{
  "success": true,
  "rootDir": ".speck/.transform-staging/<version>/",
  "scriptsDir": ".speck/.transform-staging/<version>/scripts/",
  "commandsDir": ".speck/.transform-staging/<version>/commands/",
  "agentsDir": ".speck/.transform-staging/<version>/agents/",
  "skillsDir": ".speck/.transform-staging/<version>/skills/"
}
```

Store these as:
- `STAGING_ROOT`: rootDir
- `STAGING_SCRIPTS_DIR`: scriptsDir (Agent 1 OUTPUT_DIR)
- `STAGING_COMMANDS_DIR`: commandsDir (Agent 2 OUTPUT_DIR for commands)
- `STAGING_AGENTS_DIR`: agentsDir (Agent 2 OUTPUT_DIR for agents)
- `STAGING_SKILLS_DIR`: skillsDir (Agent 2 OUTPUT_DIR for skills)

If initialization fails (e.g., orphaned staging exists), the error will indicate
this. Handle as described in step 1.3.

### 4. Agent Invocation Phase

Invoke transformation agents sequentially (skip agents if no files changed).

**All agent output goes to staging directories, NOT production.**

#### Agent 1: Bash-to-Bun Transformation

**IMPORTANT**: Skip this agent entirely if `CHANGED_BASH_SCRIPTS` is empty (no
bash scripts changed).

If there are changed bash scripts, use the Task tool to launch the
transformation agent:

```
Task tool parameters:
  subagent_type: "general-purpose"
  description: "Transform bash scripts to Bun TypeScript"
  prompt: |
    You are executing the agent defined in .claude/agents/speck.transform-bash-to-bun.md

    Read and follow ALL instructions in that agent file.

    ## Context

    **UPSTREAM_VERSION**: <version>
    **PREVIOUS_VERSION**: <PREV_VERSION> (or "none" if first transformation)
    **SOURCE_DIR**: upstream/<version>/.specify/scripts/bash/
    **OUTPUT_DIR**: <STAGING_SCRIPTS_DIR>  ← STAGING DIRECTORY, NOT PRODUCTION
    **CHANGED_BASH_SCRIPTS**:
    [List ONLY the changed bash script paths (new + modified), one per line]

    **OPTIMIZATION**: Only the scripts listed above have changed from <PREV_VERSION>.
    You MUST ONLY process these changed scripts. Skip all unchanged scripts entirely.

    ## Your Task

    Transform ONLY the changed bash scripts listed above into Bun TypeScript equivalents in plugins/speck/scripts/.

    Follow the transformation strategy priorities from the agent file:
    1. Pure TypeScript (PREFERRED)
    2. Bun Shell API (for shell-like constructs)
    3. Bun.spawn() (LAST RESORT)

    For each CHANGED script:
    1. Read the upstream bash script to understand what changed
    2. Read the existing TypeScript file (if it exists)
    3. Choose transformation strategy
    4. Generate/update .ts file in plugins/speck/scripts/
    5. ALWAYS update documentation header (even if code unchanged)
    6. Preserve CLI interface 100%
    7. Preserve [SPECK-EXTENSION:START/END] markers if present

    IMPORTANT: The scripts in CHANGED_BASH_SCRIPTS have changed in upstream.
    You MUST process all of them. Even if the TypeScript implementation is
    already functionally equivalent to the bash change, you MUST update the
    documentation header to track the new upstream version and explain the
    equivalence.

    ## Report Format

    When complete, provide a JSON summary:

    {
      "bunScriptsGenerated": [
        {
          "path": "plugins/speck/scripts/X.ts",
          "bashSource": "upstream/<version>/.specify/scripts/bash/X.sh",
          "strategy": "pure-typescript | bun-shell | bun-spawn",
          "changeType": "new | modified",
          "codeChanged": true | false,
          "documentationUpdated": true,
          "upstreamChange": "Brief description of what changed in bash",
          "typeScriptEquivalent": "Explanation of how TypeScript handles this"
        }
      ],
      "skipped": [
        {
          "path": "plugins/speck/scripts/Y.ts",
          "bashSource": "upstream/<version>/.specify/scripts/bash/Y.sh",
          "reason": "Script not in CHANGED_BASH_SCRIPTS list (unchanged from previous version)"
        }
      ],
      "errors": [],
      "warnings": []
    }

    If any transformation fails, stop immediately and report the error.
```

**Wait for agent completion** before proceeding to next agent.

**Record Agent 1 result** (even if skipped - use empty result):

After Agent 1 completes, record the result by importing and calling the
orchestration function. Parse the agent's JSON output for these values:
- `success`: boolean
- `filesWritten`: array of file paths written to staging
- `error`: error message if failed
- `duration`: execution time in ms

If Agent 1 fails:
- The orchestration will automatically rollback staging
- Report error to user
- Stop execution (do not invoke Agent 2)

**Collect results**:

- Parse JSON from agent output
- Extract list of generated/updated Bun scripts
- Extract list of skipped scripts
- Check for errors or warnings

#### Agent 2: Command Transformation

**IMPORTANT**: Skip this agent entirely if `CHANGED_SPECKIT_COMMANDS` is empty
(no commands changed).

If there are changed commands, use the Task tool to launch the command
transformation agent:

```
Task tool parameters:
  subagent_type: "general-purpose"
  description: "Transform speckit commands to speck commands"
  prompt: |
    You are executing the agent defined in .claude/agents/speck.transform-commands.md

    Read and follow ALL instructions in that agent file.

    ## Context

    **UPSTREAM_VERSION**: <version>
    **PREVIOUS_VERSION**: <PREV_VERSION> (or "none" if first transformation)
    **SOURCE_DIR**: upstream/<version>/.claude/commands/
    **OUTPUT_DIR_COMMANDS**: <STAGING_COMMANDS_DIR>  ← STAGING DIRECTORY
    **OUTPUT_DIR_AGENTS**: <STAGING_AGENTS_DIR>  ← STAGING DIRECTORY
    **OUTPUT_DIR_SKILLS**: <STAGING_SKILLS_DIR>  ← STAGING DIRECTORY
    **CHANGED_SPECKIT_COMMANDS**:
    [List ONLY the changed speckit command paths (new + modified), one per line]

    **OPTIMIZATION**: Only the commands listed above have changed from <PREV_VERSION>.
    You MUST ONLY process these changed commands. Skip all unchanged commands entirely.

    **BASH_TO_BUN_MAPPINGS**:
    [Provide the FULL mappings (not just changed scripts) - commands may reference any script]
    Example format:
    - .specify/scripts/bash/setup-plan.sh → plugins/speck/scripts/setup-plan.ts
    - .specify/scripts/bash/check-prerequisites.sh → plugins/speck/scripts/check-prerequisites.ts

    ## Your Task

    Transform ONLY the changed speckit commands listed above into speck commands in .claude/commands/.

    For each CHANGED command:
    1. Parse frontmatter (scripts, agent_scripts, handoffs)
    2. Update script references using the bash-to-bun mappings
    3. Remove PowerShell references
    4. Update agent references (speckit.* → speck.*)
    5. Analyze command body for workflow sections to factor per FR-007 criteria
    6. Extract agents/skills with speck. prefix per FR-007a
    7. Record factoring decisions in .speck/transformation-history.json per FR-013
    8. Preserve command body workflow logic
    9. Preserve [SPECK-EXTENSION:START/END] markers if present
    10. Save as .claude/commands/speck.X.md

    ## Report Format

    When complete, provide a JSON summary:

    {
      "speckCommandsGenerated": [
        {
          "commandName": "speck.X",
          "specKitSource": "upstream/<version>/.claude/commands/speckit.X.md",
          "scriptReference": "plugins/speck/scripts/Y.ts",
          "changeType": "new | modified"
        }
      ],
      "agentsFactored": [
        {
          "path": ".claude/agents/speck.plan-workflow.md",
          "purpose": "Multi-step planning workflow",
          "extractedFrom": "speckit.plan.md"
        }
      ],
      "skillsFactored": [
        {
          "path": ".claude/skills/speck.load-context.md",
          "purpose": "Load feature context for analysis",
          "extractedFrom": "Multiple commands"
        }
      ],
      "factoringMappingsCount": 15,
      "skipped": [
        {
          "commandName": "speck.Y",
          "reason": "No changes in upstream speckit command"
        }
      ],
      "errors": [],
      "warnings": []
    }

    If any transformation fails, stop immediately and report the error.
```

**Wait for agent completion**.

**Record Agent 2 result** (even if skipped - use empty result):

After Agent 2 completes, record the result. Parse the agent's JSON output.

If Agent 2 fails:
- The orchestration will automatically rollback ALL staging (including Agent 1 output)
- Report error to user
- Production remains unchanged

**Collect results**:

- Parse JSON from agent output
- Extract list of generated/updated commands
- Extract list of skipped commands
- Check for errors or warnings

### 5. Commit Staging to Production

After both agents succeed, commit the staged files to production:

1. **Check for file conflicts**:
   The commit process automatically checks if any production files were modified
   since staging began (conflict detection).

2. **If conflicts detected**:
   ```
   ⚠️  FILE CONFLICTS DETECTED

   The following production files were modified during transformation:
     - plugins/speck/scripts/foo.ts (modified 2m ago)
     - .claude/commands/speck.bar.md (modified 1m ago)

   Options:
     1. Proceed anyway (overwrite changes)
     2. Abort and inspect manually

   Enter choice (proceed/abort):
   ```

3. **Commit if no conflicts or user approves**:
   The staging system atomically moves all files to production:
   - `.speck/.transform-staging/<version>/scripts/*` → `plugins/speck/scripts/`
   - `.speck/.transform-staging/<version>/commands/*` → `.claude/commands/`
   - `.speck/.transform-staging/<version>/agents/*` → `.claude/agents/`
   - `.speck/.transform-staging/<version>/skills/*` → `.claude/skills/`

4. **Cleanup**:
   After successful commit, staging directory is automatically removed.

### 6. Transformation History Tracking (FR-013)

Record factoring decisions in `.speck/transformation-history.json`:

1. **Initialize transformation entry** (at start of transformation):
   ```typescript
   import { addTransformationEntry } from "packages/maintainer/src/common/transformation-history";

   await addTransformationEntry(
     ".speck/transformation-history.json",
     version,
     commitSha, // from upstream/releases.json
     "partial", // Will update to "transformed" or "failed" later
     [], // Mappings will be added by agents
   );
   ```

2. **Agents record factoring decisions**:
   - When Agent 2 (transform-commands) extracts agents/skills, it should call:
     ```typescript
     import { addFactoringMapping } from "packages/maintainer/src/common/transformation-history";

     await addFactoringMapping(
       ".speck/transformation-history.json",
       version,
       {
         source: ".claude/commands/plan.md",
         generated: ".claude/agents/speck.plan-workflow.md",
         type: "agent",
         description: "Extracted planning workflow",
         rationale: ">3 steps with branching logic per FR-007",
       },
     );
     ```
   - Record all command → command, command → agent, and command → skill mappings

3. **Preserve constitution amendments** (T126):
   - Check if `.speck/memory/constitution.md` exists in current repository
   - If it exists and upstream version also contains constitution.md:
     - Read current constitution to detect amendments (lines not in upstream version)
     - Common amendments to preserve:
       - `**Default Workflow Mode**: stacked-pr` (from 008-stacked-pr-support)
       - Custom governance principles (Principle VIII and beyond)
       - Repository-specific settings in configuration sections
     - After transformation completes, restore amendments to constitution.md
     - Append preserved amendments to transformed constitution with comment:
       ```markdown
       <!-- SPECK AMENDMENTS: The following sections are repository-specific -->
       ```
   - If constitution doesn't exist upstream or locally, skip this step

4. **Update transformation status on completion**:
   ```typescript
   import { updateTransformationStatus } from "packages/maintainer/src/common/transformation-history";

   // On success:
   await updateTransformationStatus(
     ".speck/transformation-history.json",
     version,
     "transformed",
   );

   // On failure:
   await updateTransformationStatus(
     ".speck/transformation-history.json",
     version,
     "failed",
     errorMessage,
   );
   ```

### 7. Status Tracking

Update `upstream/releases.json` with transformation status:

```bash
bun run packages/maintainer/src/common/json-tracker.ts update-status <version> transformed
```

Or if any agent failed:

```bash
bun run packages/maintainer/src/common/json-tracker.ts update-status <version> failed "<error message>"
```

### 8. Report Results

Present transformation summary to user:

#### Success Case

```
✓ Transformation complete for <version>

Generated:
  - X Bun TypeScript scripts in plugins/speck/scripts/
  - Y /speck.* commands in .claude/commands/
  - Z factoring mappings recorded in .speck/transformation-history.json

Status: transformed
Date: <ISO 8601 timestamp>

Next steps:
  1. Review generated files
  2. Run tests: bun test tests/.speck-scripts/
  3. Try generated commands (e.g., /speck.plan)
  4. Check transformation history: .speck/transformation-history.json
```

#### Failure Case

```
✗ Transformation failed for <version>

Error: [Agent error message]

Status: failed (recorded in upstream/releases.json)

Possible causes:
  - Unsupported bash syntax in scripts
  - Breaking changes in command structure
  - [SPECK-EXTENSION] conflict with upstream changes

Next steps:
  1. Check error details in upstream/releases.json
  2. Review conflicting files manually
  3. Fix issues and retry transformation
```

## Error Handling

### Bun Runtime Missing

```
ERROR: Bun runtime not found

Install Bun:
  curl -fsSL https://bun.sh/install | bash

Then restart your terminal and try again.
```

Exit immediately - cannot proceed without Bun.

### Upstream Release Not Found

```
ERROR: Version <version> not found in upstream/

Available actions:
  1. Run /speck.check-upstream to see available releases
  2. Run /speck.pull-upstream <version> to download

Example:
  /speck.pull-upstream v0.0.85
```

### Agent Failure

If either transformation agent fails:

1. **Stop immediately** - do not invoke second agent if first fails
2. **Update status** to "failed" with error details
3. **Report error** to user with agent name and error message
4. **Suggest resolution**:
   - Review agent error output
   - Check for conflicts manually
   - Fix issues and retry

### Extension Marker Conflict

If agent reports [SPECK-EXTENSION] conflict:

```
⚠️  CONFLICT DETECTED

File: <filename>
Issue: Upstream changes overlap with Speck extensions

Resolution required:
  1. Review conflicts in <filename>
  2. Manually merge upstream changes with Speck extensions
  3. Retry transformation

Status: failed (no changes made - atomic rollback)
```

## Atomic Operations

**Critical**: Transformation is atomic - either complete success or no changes.

This is achieved through the staging pattern (016-atomic-transform-rollback):

1. **Staging directory created** at `.speck/.transform-staging/<version>/`
2. **Agent 1 writes to staging** (`staging/scripts/`)
3. **Agent 2 writes to staging** (`staging/commands/`, `staging/agents/`, `staging/skills/`)
4. **Atomic commit** moves all files to production using POSIX rename()
5. **On any failure** → staging deleted, production unchanged

Failure scenarios:
- If Agent 1 fails → staging directory deleted, production unchanged
- If Agent 2 fails → entire staging directory deleted (including Agent 1 output), production unchanged
- If commit fails → partial commit is possible (documented), staging preserved for recovery
- If process crashes → orphaned staging detected on next run, user prompted for recovery

## Notes

- **Staging orchestration**: Uses `packages/maintainer/src/transform-upstream/index.ts` for
  staging lifecycle management (create, record, commit, rollback, recover)
- **Version resolution**: `upstream/latest` symlink provides default version
- **Idempotent**: Can re-run safely - overwrites previous transformation
- **Status tracking**: `upstream/releases.json` tracks all transformation
  attempts
- **CLI compatibility**: Generated Bun scripts must match bash CLI interface
  exactly

## Example Invocations

**Transform latest release**:

```
/speck.transform-upstream
```

**Transform specific version**:

```
/speck.transform-upstream --version v0.0.85
```

## Architecture Note

This slash command orchestrates the transformation agents with staging lifecycle
support from `packages/maintainer/src/transform-upstream/index.ts`.

**Division of responsibilities**:

1. **Slash command** (this file):
   - User interaction (prompts, confirmations)
   - Discovery and diff detection
   - Agent invocation via Task tool
   - Result parsing and reporting

2. **Staging orchestration script** (`packages/maintainer/src/transform-upstream/index.ts`):
   - Staging directory lifecycle (create, update, cleanup)
   - Status tracking (agent results, staging state)
   - Commit/rollback operations
   - Orphan detection and recovery
   - File conflict detection

This separation ensures:
- Atomic semantics are handled by a tested TypeScript module
- Slash command focuses on orchestration and UX
- Staging logic can be unit tested independently
