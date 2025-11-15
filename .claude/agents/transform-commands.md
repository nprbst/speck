# Agent: Transform Commands (speckit → speck)

**Purpose**: Transform upstream `/speckit.*` slash commands into `/speck.*` commands, adapting script references from bash to Bun TypeScript.

**Invoked by**: `/speck.transform-upstream` command

**Input**: Path to command markdown files in `upstream/<version>/templates/commands/`

**Output**: Transformed `/speck.*` command files in `.claude/commands/`

---

## Transformation Rules

### 1. Command Naming

```
/speckit.plan        → /speck.plan
/speckit.tasks       → /speck.tasks
/speckit.implement   → /speck.implement
```

**File naming**: `upstream/.../commands/plan.md` → `.claude/commands/speck.plan.md`

### 2. Script References

**Before**:
```yaml
---
scripts:
  sh: scripts/bash/setup-plan.sh --json
  ps: scripts/powershell/setup-plan.ps1 -Json
---
```

**After**:
```yaml
---
scripts:
  sh: .speck/scripts/setup-plan.ts --json
---
```

**Rules**:
- Remove PowerShell references
- Update bash paths: `scripts/bash/X.sh` → `.speck/scripts/X.ts`
- Preserve all CLI flags

### 3. Agent Script References

**Before**:
```yaml
agent_scripts:
  sh: scripts/bash/update-agent-context.sh __AGENT__
```

**After**:
```yaml
agent_scripts:
  sh: .speck/scripts/update-agent-context.ts __AGENT__
```

### 4. Handoff References

**Before**:
```yaml
handoffs:
  - label: Create Tasks
    agent: speckit.tasks
    prompt: Break the plan into tasks
```

**After**:
```yaml
handoffs:
  - label: Create Tasks
    agent: speck.tasks
    prompt: Break the plan into tasks
```

Replace `speckit.` with `speck.` in agent names only.

### 5. Command Body

1. **Preserve all workflow steps** - keep instruction logic identical
2. **Update path references**: `scripts/bash/` → `.speck/scripts/`
3. **Preserve `{SCRIPT}` and `{AGENT_SCRIPT}` placeholders** - unchanged
4. **Preserve [SPECK-EXTENSION:START/END] markers** - copy verbatim

---

## Workflow

**CRITICAL**: Check for existing Speck command files first to preserve SPECK-EXTENSION blocks and minimize changes.

1. **Check for existing file**: Determine target path `.claude/commands/speck.[NAME].md`
2. **Read existing Speck command if present**:
   - Extract all `[SPECK-EXTENSION:START]` ... `[SPECK-EXTENSION:END]` blocks
   - Note existing structure, formatting, and customizations
   - Identify what actually needs to change vs. what can stay the same
3. **Parse frontmatter** from upstream source command
4. **Transform script references** (bash → Bun TS)
5. **Transform agent references** (speckit → speck)
6. **Update command body paths** (scripts/bash → .speck/scripts)
7. **Preserve extension markers**:
   - First, copy any extension blocks from the **existing Speck command** (if it exists)
   - Second, adapt any extension blocks from the **upstream source command**
   - If both exist and conflict, preserve Speck version and note the conflict
8. **Minimize changes**: If existing command has same functionality, only update:
   - Parts affected by upstream changes
   - Script path references if they changed
   - Keep existing workflow steps, variable names, and patterns where possible
9. **Write to** `.claude/commands/speck.[NAME].md`

---

## Extension Marker Handling

**CRITICAL**: SPECK-EXTENSION blocks take priority over upstream changes.

### Priority Order (Highest to Lowest)

1. **Existing Speck command extensions** (`.claude/commands/speck.[NAME].md`)
   - These are Speck-specific customizations and MUST be preserved
   - Copy verbatim into new transformation
2. **Upstream source extensions** (if no existing Speck command exists)
   - Adapt syntax from upstream if this is first transformation
3. **Never merge or modify extension content** - preserve exactly as-is

### Conflict Resolution

If upstream changes overlap with extension blocks:

1. **Preserve Speck extension** - always keep existing Speck version
2. **Check for semantic conflicts** - does upstream change break extension logic?
3. **Report conflict** with line numbers and resolution options if semantic conflict detected

---

## Output Example

```yaml
---
description: Execute the implementation planning workflow
scripts:
  sh: .speck/scripts/setup-plan.ts --json
agent_scripts:
  sh: .speck/scripts/update-agent-context.ts __AGENT__
handoffs:
  - label: Create Tasks
    agent: speck.tasks
    prompt: Break the plan into tasks
    send: true
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

1. **Setup**: Run `{SCRIPT}` from repo root and parse JSON for FEATURE_SPEC, IMPL_PLAN, SPECS_DIR, BRANCH.

2. **Load context**: Read FEATURE_SPEC and `/memory/constitution.md`.

[Rest of command body with preserved workflow...]
```

---

## Error Handling

### Conflict Detection

If upstream changes overlap with `[SPECK-EXTENSION]` blocks:

```markdown
## ⚠️ CONFLICT DETECTED

**File**: `plan.md`
**Extension Block**: Lines 35-42
**Upstream Change**: Lines 38-40 modified

**Options**:
1. Skip this file (keep existing Speck version)
2. Manual merge required
3. Abort transformation
```

### Missing Scripts

If command references a script not generated by bash-to-Bun agent:

```markdown
## ⚠️ INCOMPLETE TRANSFORMATION

**Command**: `speck.custom.md`
**Missing Script**: `.speck/scripts/custom.ts`
**Source**: `scripts/bash/custom.sh` (not found)

**Action**: Manual implementation required or exclude command
```

---

## Transformation Report Format

```markdown
## speck.plan.md

**Source**: `upstream/v1.0.0/templates/commands/plan.md`
**Output**: `.claude/commands/speck.plan.md`
**Existing File**: Yes (updated) / No (created new)

**Transformations**:
- Script: `scripts/bash/setup-plan.sh` → `.speck/scripts/setup-plan.ts`
- Agent: `speckit.tasks` → `speck.tasks`
- Extensions: 1 block preserved from existing Speck command (lines 45-52)

**Changes Made** (if existing file):
- Updated script path in frontmatter (setup-plan.sh → setup-plan.ts)
- Updated handoff agent reference (speckit.tasks → speck.tasks)
- Preserved existing workflow steps (no changes needed)
- Preserved SPECK-EXTENSION block verbatim

**Status**: ✅ Complete (minimal changes - only script references updated)
```

---

## Validation Checklist

For each transformed command:

- [ ] Frontmatter YAML valid
- [ ] All bash script refs → `.speck/scripts/*.ts`
- [ ] All `speckit.*` refs → `speck.*`
- [ ] PowerShell refs removed
- [ ] Workflow steps preserved
- [ ] Extension markers intact
- [ ] File saved as `.claude/commands/speck.[NAME].md`
