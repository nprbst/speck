---
description: Transform upstream spec-kit release into Speck's Bun TypeScript implementation
---

You are being invoked as a Claude Code slash command to transform an upstream
spec-kit release into Speck's Bun TypeScript implementation.

## Your Task

Execute the `.speck/scripts/transform-upstream.ts` script to orchestrate the
transformation of bash scripts and commands from a pulled upstream release.

## Execution Steps

1. Extract any version flag from the user's command (optional)
2. Run the transform-upstream script:
   ```bash
   bun .speck/scripts/transform-upstream.ts
   ```

3. If the user specified a version, pass it with --version flag:
   ```bash
   bun .speck/scripts/transform-upstream.ts --version <version>
   ```

4. If the user requested JSON output, add --json flag:
   ```bash
   bun .speck/scripts/transform-upstream.ts --json
   ```

5. Present the results to the user:
   - If successful (exit code 0), confirm transformation and show summary
   - If failed (exit code 2), explain the transformation error with details

## Expected Output

The script will orchestrate two transformation agents in sequence:

1. **transform-bash-to-bun.md** - Converts bash scripts to Bun TypeScript
   - Input: `upstream/<version>/scripts/bash/*.sh`
   - Output: `.speck/scripts/*.ts`
   - Strategy: Pure TypeScript > Bun Shell API > Bun.spawn()

2. **transform-commands.md** - Converts speckit commands to speck commands
   - Input: `upstream/<version>/templates/commands/*.md`
   - Output: `.claude/commands/speck.*.md`
   - Updates script references from bash to Bun TypeScript

The transformation will:

- Generate Bun TypeScript equivalents of upstream bash scripts
- Generate /speck.* commands with updated script references
- Update `upstream/releases.json` status to "transformed"
- Preserve `[SPECK-EXTENSION:START/END]` markers
- Use atomic operations (rollback on failure)

## Example Usage

### Transform Latest Release

User: `/speck.transform-upstream`

Expected behavior:

- Transform the release pointed to by `upstream/latest` symlink
- Display summary of generated scripts and commands
- Confirm status updated to "transformed"

### Transform Specific Version

User: `/speck.transform-upstream --version v1.0.0`

Expected behavior:

- Transform the v1.0.0 release from `upstream/v1.0.0/`
- Display summary with version information

### JSON Output

User: `/speck.transform-upstream --json`

Expected behavior:

- Execute transformation and output JSON with:
  - upstreamVersion
  - transformDate
  - status ("transformed" or "failed")
  - bunScriptsGenerated (array of generated Bun scripts)
  - speckCommandsGenerated (array of generated commands)
  - agentsFactored (array of agents used)
  - skillsFactored (array of skills extracted)
  - errorDetails (if status is "failed")

## Error Handling

### Exit Code 2 (System Error)

Common failure scenarios:

1. **Missing Bun runtime**:
   - Error: "Bun runtime not found"
   - Solution: Install Bun: `curl -fsSL https://bun.sh/install | bash`

2. **No upstream release pulled**:
   - Error: "No upstream/latest symlink found"
   - Solution: Run `/speck.pull-upstream <version>` first

3. **Specified version not found**:
   - Error: "Version vX.Y.Z not found in upstream/"
   - Solution: Run `/speck.check-upstream` to see available versions
   - Then run `/speck.pull-upstream <version>` to download it

4. **Agent invocation failure**:
   - Error: "Transformation agent failed: [details]"
   - Solution: Check agent error details, may need manual intervention
   - Existing `.speck/scripts/` preserved (atomic rollback)

5. **Extension marker conflict**:
   - Error: "Conflict detected: upstream change overlaps [SPECK-EXTENSION]"
   - Solution: Manual merge required - resolve conflict and re-run
   - Status updated to "failed" with error details

For all errors:

- Display the error message from stderr
- Explain possible causes and solutions
- Note that operation is atomic (no partial state on failure)
- Check `upstream/releases.json` for status and error details

## Transformation Workflow

The script orchestrates this workflow:

```
1. Check Bun runtime available (fail fast if missing)
2. Resolve version to transform (default: upstream/latest)
3. Find bash scripts in upstream/<version>/scripts/bash/
4. Find commands in upstream/<version>/templates/commands/
5. Create temp directory for atomic operations
6. Invoke transform-bash-to-bun agent
   → Generates .speck/scripts/*.ts files
7. Invoke transform-commands agent
   → Generates .claude/commands/speck.*.md files
8. Atomic move: temp → production directories
9. Update releases.json status to "transformed"
10. Generate transformation report
```

If any step fails:
- Rollback (remove temp directory)
- Update releases.json status to "failed" with error
- Exit with code 2

## Notes

- **Default version**: Transforms `upstream/latest` if no version specified
- **Atomic operations**: All changes committed together or rolled back on failure
- **Extension preservation**: `[SPECK-EXTENSION:START/END]` blocks never modified
- **CLI compatibility**: Generated Bun scripts maintain 100% CLI compatibility with bash
- **Status tracking**: `upstream/releases.json` updated with transformation status
- **Idempotent**: Can re-run transformation safely (overwrites previous)

## Follow-up Actions

After successful transformation:

1. **Test generated scripts**:
   ```bash
   bun test tests/.speck-scripts/
   ```

2. **Verify commands work**:
   - Try running `/speck.plan` or other generated commands
   - Check that script references resolve correctly

3. **Review transformation report**:
   - Check which transformation strategies were used
   - Verify CLI interfaces match bash equivalents
   - Review any factoring opportunities for Phase 4

4. **Commit changes**:
   - `.speck/scripts/` - Generated Bun TypeScript implementations
   - `.claude/commands/` - Generated /speck.* commands
   - `upstream/releases.json` - Updated status

## Troubleshooting

### "Agent invocation not yet implemented in MVP"

This is expected in the current MVP implementation. The script creates the
infrastructure but agent invocation requires Claude Code integration.

For now, the script will:
- Validate prerequisites (Bun runtime, upstream release)
- Create directory structure
- Return placeholder transformation results
- Update status tracking

Full agent invocation will be implemented in a future phase.

### Transformation takes longer than expected

Transformation time depends on:
- Number of bash scripts to convert
- Number of commands to transform
- Complexity of bash constructs (more complex = more time)

Expected times:
- Small release (5-10 scripts): <2 minutes
- Medium release (10-20 scripts): 2-5 minutes
- Large release (20+ scripts): 5-10 minutes

Success Criterion SC-003: Should complete in <5 minutes for typical releases
