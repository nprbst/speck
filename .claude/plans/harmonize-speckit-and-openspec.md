# Plan: Harmonize Speckit and OpenSpec into Speck Changes Plugin

**Branch**: `019-openspec-changes-plugin` **Goal**: Bring OpenSpec's changes
management flow into the Speck ecosystem for 1-N feature development while
maintaining backwards compatibility with both upstream systems.

## Design Decisions (User Confirmed)

1. **Namespace**: Keep `speck-changes.*` - plugin prefix is automatic
2. **Spec location**: Standardize on `.speck/specs/`
3. **Delta format**: Keep OpenSpec's `## ADDED|MODIFIED|REMOVED Requirements`
   format
4. **Validation**: Port to Bun TypeScript (mechanical transformation)
5. **AGENTS.md decomposition**: Large chunks, not too fine-grained

## Architecture Overview

```
plugins/changes/
├── commands/                    # Slash commands (keep existing)
│   ├── speck-changes.propose.md
│   ├── speck-changes.apply.md
│   ├── speck-changes.archive.md
│   ├── speck-changes.list.md
│   ├── speck-changes.show.md
│   ├── speck-changes.validate.md
│   └── speck-changes.migrate.md
├── templates/                   # Keep existing, enhance
│   ├── proposal.md
│   ├── design.md
│   ├── tasks.md
│   └── delta-spec.md            # NEW: Delta spec template
├── skills/                      # NEW: Extracted from AGENTS.md
│   └── changes-workflow/
│       ├── SKILL.md             # Main workflow (TL;DR + 3-stage)
│       ├── spec-format.md       # Delta format + scenarios
│       └── troubleshooting.md   # Validation errors + recovery
├── scripts/                     # Bun TypeScript (port from openspec CLI)
│   ├── propose.ts               # Existing
│   ├── apply.ts                 # Existing
│   ├── archive.ts               # NEW: Port from openspec
│   ├── validate.ts              # NEW: Port from openspec
│   ├── list.ts                  # Existing
│   ├── show.ts                  # Existing
│   └── migrate.ts               # Existing
└── agents/                      # NEW: Transform agent
    └── transform-openspec.md    # Semantic transformation rules
```

## Implementation Tasks

### Phase 1: Transform Agent Creation

Create `.claude/agents/speck-changes.transform-openspec.md` to handle upstream
OpenSpec releases.

**Key transformations**:

- `AGENTS.md` → `skills/changes-workflow/*.md` (3 large chunks)
- OpenSpec CLI commands → Speck command format with frontmatter
- Node.js source → Bun TypeScript scripts
- Directory paths: `openspec/` → `.speck/changes/`

**Files to create/modify**:

- `.claude/agents/speck-changes.transform-openspec.md` (NEW)

### Phase 2: Skill Extraction from AGENTS.md

Extract [openspec/AGENTS.md](openspec/AGENTS.md) into 3 skill files:

| Source Section                                                  | Target File          | Content                    |
| --------------------------------------------------------------- | -------------------- | -------------------------- |
| TL;DR + Three-Stage Workflow + Before Any Task                  | `SKILL.md`           | Core workflow instructions |
| Spec File Format + Delta Operations + Creating Change Proposals | `spec-format.md`     | How to write delta specs   |
| Troubleshooting + Error Recovery + Validation Tips              | `troubleshooting.md` | Debugging and fixes        |

**Files to create**:

- `plugins/changes/skills/changes-workflow/SKILL.md`
- `plugins/changes/skills/changes-workflow/spec-format.md`
- `plugins/changes/skills/changes-workflow/troubleshooting.md`

### Phase 3: Script Ports (OpenSpec CLI → Bun TypeScript)

Port remaining OpenSpec CLI functionality to Bun TypeScript:

| OpenSpec CLI                | Speck Script  | Status           |
| --------------------------- | ------------- | ---------------- |
| `openspec change` (propose) | `propose.ts`  | EXISTS - enhance |
| `openspec apply`            | `apply.ts`    | EXISTS - enhance |
| `openspec archive`          | `archive.ts`  | NEW - port       |
| `openspec validate`         | `validate.ts` | NEW - port       |
| `openspec list`             | `list.ts`     | EXISTS           |
| `openspec show`             | `show.ts`     | EXISTS           |

**Transformation patterns** (mechanical, per transform-bash-to-bun.md):

```typescript
// Node.js fs/promises → Bun
fs.readFile(path) → await Bun.file(path).text()
fs.writeFile(path, data) → await Bun.write(path, data)

// child_process → Bun Shell
execSync('git ...') → await $`git ...`
```

**Files to create/modify**:

- `plugins/changes/scripts/archive.ts` (NEW)
- `plugins/changes/scripts/validate.ts` (NEW)
- `plugins/changes/scripts/propose.ts` (enhance with validation)
- `plugins/changes/scripts/apply.ts` (enhance with delta context)

### Phase 4: Template Enhancement

Add delta spec template to guide proper format:

**File to create**:

- `plugins/changes/templates/delta-spec.md`

**Content outline**:

```markdown
# Delta Specification: {{capability}}

## ADDED Requirements

### Requirement: [Name]

The system SHALL...

#### Scenario: [Name]

- **WHEN** [condition]
- **THEN** [outcome]

## MODIFIED Requirements

[Full requirement text - replaces existing]

## REMOVED Requirements

### Requirement: [Name]

**Reason**: [Why removing] **Migration**: [How to handle]
```

### Phase 5: Command Updates

Update existing commands to use new skills and follow Speck patterns:

**Files to modify**:

- `plugins/changes/commands/speck-changes.propose.md` - Reference new skills
- `plugins/changes/commands/speck-changes.apply.md` - Reference new skills
- `plugins/changes/commands/speck-changes.archive.md` - Wire to new script
- `plugins/changes/commands/speck-changes.validate.md` - Wire to new script

### Phase 6: Directory Path Standardization

Update all references from `openspec/` paths to `.speck/` paths:

| Old Path              | New Path            |
| --------------------- | ------------------- |
| `openspec/specs/`     | `.speck/specs/`     |
| `openspec/changes/`   | `.speck/changes/`   |
| `openspec/project.md` | `.speck/project.md` |
| `openspec/AGENTS.md`  | Skills (decomposed) |

### Phase 7: Transform Upstream Command Rewrite

Replace
[.claude/commands/speck-changes.transform-upstream.md](.claude/commands/speck-changes.transform-upstream.md)
with working implementation:

**Workflow**:

1. Pull upstream OpenSpec release (already working via pull-upstream)
2. Invoke transform agent to:
   - Extract AGENTS.md → skills/
   - Transform CLI source → scripts/
   - Adapt command templates → commands/
3. Preserve SPECK-EXTENSION blocks
4. Generate transformation report

### Phase 8: Integration Testing

- Test full workflow: propose → validate → apply → archive
- Verify delta merging into specs works correctly
- Ensure backwards compatibility with existing `.speck/changes/` data

## Critical Files

### To Read (understand existing)

- [openspec/AGENTS.md](openspec/AGENTS.md) - Source for skill extraction
- [upstream/openspec/0.16.0/](upstream/openspec/0.16.0/) - Latest upstream
- [.claude/agents/speck.transform-commands.md](.claude/agents/speck.transform-commands.md) -
  Pattern to follow
- [plugins/changes/scripts/](plugins/changes/scripts/) - Existing
  implementations

### To Create

- `.claude/agents/speck-changes.transform-openspec.md`
- `plugins/changes/skills/changes-workflow/SKILL.md`
- `plugins/changes/skills/changes-workflow/spec-format.md`
- `plugins/changes/skills/changes-workflow/troubleshooting.md`
- `plugins/changes/templates/delta-spec.md`
- `plugins/changes/scripts/archive.ts`
- `plugins/changes/scripts/validate.ts`

### To Modify

- `.claude/commands/speck-changes.transform-upstream.md` (rewrite)
- `plugins/changes/commands/speck-changes.propose.md`
- `plugins/changes/commands/speck-changes.apply.md`
- `plugins/changes/commands/speck-changes.archive.md`
- `plugins/changes/commands/speck-changes.validate.md`

## Execution Order

1. **Phase 1**: Create transform agent (foundation for future upstream pulls)
2. **Phase 2**: Extract skills from AGENTS.md (enables commands to reference
   them)
3. **Phase 3**: Port archive.ts and validate.ts scripts
4. **Phase 4**: Create delta-spec template
5. **Phase 5**: Update commands to use new skills/scripts
6. **Phase 6**: Update directory paths throughout
7. **Phase 7**: Rewrite transform-upstream command
8. **Phase 8**: Integration testing

## Success Criteria

- [ ] `/speck-changes.propose` creates properly formatted proposals
- [ ] `/speck-changes.validate` validates delta spec format (scenarios,
      requirements)
- [ ] `/speck-changes.apply` loads tasks and provides implementation guidance
- [ ] `/speck-changes.archive` merges deltas into `.speck/specs/` and moves to
      archive
- [ ] Transform agent can process new OpenSpec upstream releases
- [ ] All existing `.speck/changes/` data continues to work
- [ ] Skills provide clear guidance without requiring AGENTS.md reference
