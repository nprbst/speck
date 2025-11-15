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

### 2. Discovery Phase

Find source files to transform:

1. **Find bash scripts**:
   ```bash
   find upstream/<version>/.specify/scripts/bash -name "*.sh" -type f
   ```
   - Count total bash scripts found

2. **Find speckit commands**:
   ```bash
   find upstream/<version>/.claude/commands -name "speckit.*.md" -type f
   ```
   - Count total command files found

3. **Report to user**:
   ```
   Transforming upstream/<version>...
   Found X bash scripts, Y commands
   ```

### 3. Agent Invocation Phase

Invoke transformation agents sequentially:

#### Agent 1: Bash-to-Bun Transformation

Use the Task tool to launch the transformation agent:

```
Task tool parameters:
  subagent_type: "general-purpose"
  description: "Transform bash scripts to Bun TypeScript"
  prompt: |
    You are executing the agent defined in .claude/agents/transform-bash-to-bun.md

    Read and follow ALL instructions in that agent file.

    ## Context

    **UPSTREAM_VERSION**: <version>
    **SOURCE_DIR**: upstream/<version>/.specify/scripts/bash/
    **OUTPUT_DIR**: .speck/scripts/
    **BASH_SCRIPTS**:
    [List each bash script path found in discovery, one per line]

    ## Your Task

    Transform each bash script listed above into a Bun TypeScript equivalent in .speck/scripts/.

    Follow the transformation strategy priorities from the agent file:
    1. Pure TypeScript (PREFERRED)
    2. Bun Shell API (for shell-like constructs)
    3. Bun.spawn() (LAST RESORT)

    For each script:
    1. Read and analyze the bash script
    2. Choose transformation strategy
    3. Generate .ts file in .speck/scripts/
    4. Preserve CLI interface 100%
    5. Document transformation in header comment
    6. Preserve [SPECK-EXTENSION:START/END] markers if present

    ## Report Format

    When complete, provide a JSON summary:

    {
      "bunScriptsGenerated": [
        {
          "path": ".speck/scripts/X.ts",
          "bashSource": "upstream/<version>/.specify/scripts/bash/X.sh",
          "strategy": "pure-typescript | bun-shell | bun-spawn"
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
- Extract list of generated Bun scripts
- Check for errors or warnings

#### Agent 2: Command Transformation

Use the Task tool to launch the command transformation agent:

```
Task tool parameters:
  subagent_type: "general-purpose"
  description: "Transform speckit commands to speck commands"
  prompt: |
    You are executing the agent defined in .claude/agents/transform-commands.md

    Read and follow ALL instructions in that agent file.

    ## Context

    **UPSTREAM_VERSION**: <version>
    **SOURCE_DIR**: upstream/<version>/.claude/commands/
    **OUTPUT_DIR**: .claude/commands/
    **SPECKIT_COMMANDS**:
    [List each speckit command path found in discovery, one per line]

    **BASH_TO_BUN_MAPPINGS**:
    [Provide the mappings from Agent 1 results]
    Example format:
    - scripts/bash/setup-plan.sh → .speck/scripts/setup-plan.ts
    - scripts/bash/check-prerequisites.sh → .speck/scripts/check-prerequisites.ts

    ## Your Task

    Transform each speckit command listed above into a speck command in .claude/commands/.

    For each command:
    1. Parse frontmatter (scripts, agent_scripts, handoffs)
    2. Update script references using the bash-to-bun mappings
    3. Remove PowerShell references
    4. Update agent references (speckit.* → speck.*)
    5. Preserve command body workflow logic
    6. Preserve [SPECK-EXTENSION:START/END] markers if present
    7. Save as .claude/commands/speck.X.md

    ## Report Format

    When complete, provide a JSON summary:

    {
      "speckCommandsGenerated": [
        {
          "commandName": "speck.X",
          "specKitSource": "upstream/<version>/.claude/commands/speckit.X.md",
          "scriptReference": ".speck/scripts/Y.ts"
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
- Extract list of generated commands
- Check for errors or warnings

### 4. Status Tracking

Update `upstream/releases.json` with transformation status:

```bash
bun .speck/scripts/common/json-tracker.ts update-status <version> transformed
```

Or if any agent failed:

```bash
bun .speck/scripts/common/json-tracker.ts update-status <version> failed "<error message>"
```

### 5. Report Results

Present transformation summary to user:

#### Success Case

```
✓ Transformation complete for <version>

Generated:
  - X Bun TypeScript scripts in .speck/scripts/
  - Y /speck.* commands in .claude/commands/

Status: transformed
Date: <ISO 8601 timestamp>

Next steps:
  1. Review generated files
  2. Run tests: bun test tests/.speck-scripts/
  3. Try generated commands (e.g., /speck.plan)
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
