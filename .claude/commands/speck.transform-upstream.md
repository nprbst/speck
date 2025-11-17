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

## Execution Steps

### 1. Setup and Validation

1. **Parse user arguments**:
   - Extract `--version <version>` if provided (optional)
   - If no version specified, will use `upstream/latest` symlink target

2. **Check Bun runtime**:
   ```bash
   echo "DEBUG: $(env | grep PLUGIN)"
   bun --version
   ```
   - If Bun not found, show error with installation instructions:
     ```
     ERROR: Bun runtime not found. Please install Bun:

       curl -fsSL https://bun.sh/install | bash

     Then restart your terminal and try again.
     ```
   - Exit with error if Bun missing

3. **Resolve version to transform**:
   - If `--version <version>` provided: use that version
   - Otherwise: resolve `upstream/latest` symlink to get version
   ```bash
   echo "DEBUG: $(env | grep PLUGIN)"
   readlink upstream/latest
   ```
   - Example: `upstream/latest` → `v0.0.85`

4. **Validate upstream release exists**:
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
   echo "DEBUG: $(env | grep PLUGIN)"
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
   echo "DEBUG: $(env | grep PLUGIN)"
   find upstream/<version>/.specify/scripts/bash -name "*.sh" -type f
   ```
   - Count total bash scripts found

3. **Find speckit commands**:
   ```bash
   echo "DEBUG: $(env | grep PLUGIN)"
   find upstream/<version>/.claude/commands -name "speckit.*.md" -type f
   ```
   - Count total command files found

4. **Detect changed bash scripts** (if `PREV_VERSION` exists):
   ```bash
   echo "DEBUG: $(env | grep PLUGIN)"
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
   echo "DEBUG: $(env | grep PLUGIN)"
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

### 3. Agent Invocation Phase

Invoke transformation agents sequentially (skip agents if no files changed):

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
    **OUTPUT_DIR**: ${SPECK_PLUGIN_ROOT:-".speck"}/scripts/
    **CHANGED_BASH_SCRIPTS**:
    [List ONLY the changed bash script paths (new + modified), one per line]

    **OPTIMIZATION**: Only the scripts listed above have changed from <PREV_VERSION>.
    You MUST ONLY process these changed scripts. Skip all unchanged scripts entirely.

    ## Your Task

    Transform ONLY the changed bash scripts listed above into Bun TypeScript equivalents in ${SPECK_PLUGIN_ROOT:-".speck"}/scripts/.

    Follow the transformation strategy priorities from the agent file:
    1. Pure TypeScript (PREFERRED)
    2. Bun Shell API (for shell-like constructs)
    3. Bun.spawn() (LAST RESORT)

    For each CHANGED script:
    1. Read the upstream bash script to understand what changed
    2. Read the existing TypeScript file (if it exists)
    3. Choose transformation strategy
    4. Generate/update .ts file in ${SPECK_PLUGIN_ROOT:-".speck"}/scripts/
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
          "path": "${SPECK_PLUGIN_ROOT:-".speck"}/scripts/X.ts",
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
          "path": "${SPECK_PLUGIN_ROOT:-".speck"}/scripts/Y.ts",
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
    **OUTPUT_DIR**: .claude/commands/
    **CHANGED_SPECKIT_COMMANDS**:
    [List ONLY the changed speckit command paths (new + modified), one per line]

    **OPTIMIZATION**: Only the commands listed above have changed from <PREV_VERSION>.
    You MUST ONLY process these changed commands. Skip all unchanged commands entirely.

    **BASH_TO_BUN_MAPPINGS**:
    [Provide the FULL mappings (not just changed scripts) - commands may reference any script]
    Example format:
    - .specify/scripts/bash/setup-plan.sh → ${SPECK_PLUGIN_ROOT:-".speck"}/scripts/setup-plan.ts
    - .specify/scripts/bash/check-prerequisites.sh → ${SPECK_PLUGIN_ROOT:-".speck"}/scripts/check-prerequisites.ts

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
          "scriptReference": "${SPECK_PLUGIN_ROOT:-".speck"}/scripts/Y.ts",
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

**Collect results**:

- Parse JSON from agent output
- Extract list of generated/updated commands
- Extract list of skipped commands
- Check for errors or warnings

### 4. Transformation History Tracking (FR-013)

Record factoring decisions in `.speck/transformation-history.json`:

1. **Initialize transformation entry** (at start of transformation):
   ```typescript
   import { addTransformationEntry } from "${SPECK_PLUGIN_ROOT:-".speck"}/scripts/common/transformation-history";

   await addTransformationEntry(
     "${SPECK_PLUGIN_ROOT:-".speck"}/transformation-history.json",
     version,
     commitSha, // from upstream/releases.json
     "partial", // Will update to "transformed" or "failed" later
     [], // Mappings will be added by agents
   );
   ```

2. **Agents record factoring decisions**:
   - When Agent 2 (transform-commands) extracts agents/skills, it should call:
     ```typescript
     import { addFactoringMapping } from "${SPECK_PLUGIN_ROOT:-".speck"}/scripts/common/transformation-history";

     await addFactoringMapping(
       "${SPECK_PLUGIN_ROOT:-".speck"}/transformation-history.json",
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

3. **Update transformation status on completion**:
   ```typescript
   import { updateTransformationStatus } from "${SPECK_PLUGIN_ROOT:-".speck"}/scripts/common/transformation-history";

   // On success:
   await updateTransformationStatus(
     "${SPECK_PLUGIN_ROOT:-".speck"}/transformation-history.json",
     version,
     "transformed",
   );

   // On failure:
   await updateTransformationStatus(
     "${SPECK_PLUGIN_ROOT:-".speck"}/transformation-history.json",
     version,
     "failed",
     errorMessage,
   );
   ```

### 5. Status Tracking

Update `upstream/releases.json` with transformation status:

```bash
echo "DEBUG: $(env | grep PLUGIN)"
bun run ${SPECK_PLUGIN_ROOT:-".speck"}/scripts/common/json-tracker.ts update-status <version> transformed
```

Or if any agent failed:

```bash
echo "DEBUG: $(env | grep PLUGIN)"
bun run ${SPECK_PLUGIN_ROOT:-".speck"}/scripts/common/json-tracker.ts update-status <version> failed "<error message>"
```

### 6. Report Results

Present transformation summary to user:

#### Success Case

```
✓ Transformation complete for <version>

Generated:
  - X Bun TypeScript scripts in ${SPECK_PLUGIN_ROOT:-".speck"}/scripts/
  - Y /speck.* commands in .claude/commands/
  - Z factoring mappings recorded in ${SPECK_PLUGIN_ROOT:-".speck"}/transformation-history.json

Status: transformed
Date: <ISO 8601 timestamp>

Next steps:
  1. Review generated files
  2. Run tests: bun test tests/${SPECK_PLUGIN_ROOT:-".speck"}-scripts/
  3. Try generated commands (e.g., /speck.plan)
  4. Check transformation history: ${SPECK_PLUGIN_ROOT:-".speck"}/transformation-history.json
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

- If Agent 1 fails → no files modified, status updated to "failed"
- If Agent 2 fails → rollback Agent 1 changes, status updated to "failed"
- Only on both agents succeeding → commit all changes, status "transformed"

Agents should use temp directories and atomic moves to ensure this property.

## Notes

- **No bash script**: This command orchestrates agents directly, no
  `.speck/scripts/transform-upstream.ts` needed
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

This slash command directly orchestrates the transformation agents. Unlike
`/speck.check-upstream` and `/speck.pull-upstream` which delegate to Bun
scripts, `/speck.transform-upstream` handles all orchestration logic inline
because:

1. **Agent coordination**: Needs to sequence two agents with dependencies
2. **Context preparation**: Must prepare agent-specific context from discovery
   phase
3. **Result aggregation**: Must collect and present results from multiple agents
4. **Atomic semantics**: Must coordinate rollback across agent boundaries

This is the intended architecture - transformation orchestration happens at the
slash command level, not in a Bun script.
