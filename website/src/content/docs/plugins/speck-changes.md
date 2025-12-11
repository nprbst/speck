---
title: "Speck Changes Plugin"
description: "OpenSpec change management workflow for structured proposal-based development"
category: "plugins"
order: 3
lastUpdated: 2025-12-08
tags: ["plugins", "change-management", "openspec", "proposals", "workflow"]
---

# Speck Changes Plugin

Speck Changes brings OpenSpec's structured change management workflow to Speck,
enabling proposal-based development where changes are drafted, reviewed,
implemented, and archived through a defined lifecycle.

## Features

- **Structured Proposals** - Create change proposals with templates for
  proposal.md, tasks.md, and optional design.md
- **Delta Specifications** - Track spec changes with ADDED/MODIFIED/REMOVED
  sections
- **Validation** - Ensure proposals follow correct format before review
- **Guided Implementation** - Execute tasks with Claude assistance and progress
  tracking
- **Archive Workflow** - Merge deltas back into source specs when complete
- **Migration Support** - Import existing OpenSpec projects to Speck
- **Upstream Sync** - Track and transform OpenSpec releases (maintainer use)

## Installation

```bash
# Ensure speck-market is added
/plugin marketplace add nprbst/speck-market

# Install speck-changes
/plugin install speck-changes@speck-market
```

## Quick Start

1. **Create a change proposal**:
   ```
   /speck-changes.propose add-user-auth
   ```

2. **Review the generated files** in `.speck/changes/add-user-auth/`:
   - `proposal.md` - Rationale and scope
   - `tasks.md` - Implementation checklist
   - `specs/` - Delta specifications

3. **Validate the proposal**:
   ```
   /speck-changes.validate add-user-auth
   ```

4. **Implement with Claude assistance**:
   ```
   /speck-changes.apply add-user-auth
   ```

5. **Archive when complete**:
   ```
   /speck-changes.archive add-user-auth
   ```

## Workflow Stages

### Stage 1: Draft

Create proposals when you need to:
- Add features or functionality
- Make breaking changes (API, schema)
- Change architecture or patterns
- Optimize performance (behavior changes)
- Update security patterns

**Skip proposals for:**
- Bug fixes (restore intended behavior)
- Typos, formatting, comments
- Dependency updates (non-breaking)
- Configuration changes
- Tests for existing behavior

### Stage 2: Review

Before implementation:
1. Run `/speck-changes.validate <name>` to check format
2. Review with team for approval
3. Resolve any validation errors

### Stage 3: Implement

Use `/speck-changes.apply <name>` to:
- Load tasks from the proposal
- Get Claude assistance with implementation
- Mark tasks complete as you progress
- Track implementation status

### Stage 4: Archive

After deployment:
1. Run `/speck-changes.archive <name>`
2. Deltas merge into source specs
3. Change folder moves to `.speck/archive/`

## Command Reference

### Change Management

| Command | Purpose |
|---------|---------|
| `/speck-changes.propose <name>` | Create new change proposal |
| `/speck-changes.list` | List all active changes |
| `/speck-changes.show <name>` | Display change details |
| `/speck-changes.validate <name>` | Validate proposal format |
| `/speck-changes.apply <name>` | Implement with Claude assistance |
| `/speck-changes.archive <name>` | Merge deltas and archive |
| `/speck-changes.migrate` | Import OpenSpec project |

### Upstream Management (Maintainers)

| Command | Purpose |
|---------|---------|
| `/speck-changes.check-upstream` | Query OpenSpec releases |
| `/speck-changes.pull-upstream <ver>` | Fetch and store release |
| `/speck-changes.transform-upstream` | Transform to Bun TypeScript |

## Delta Specification Format

Changes to specs use the delta format:

```markdown
# Delta Specification: User Authentication

**Target Spec**: specs/005-user-management/spec.md
**Change Proposal**: add-user-auth
**Created**: 2025-12-08

---

## ADDED Requirements

### Requirement: User Authentication

The system SHALL verify user credentials before granting access.

#### Scenario: Valid credentials

- **GIVEN** a registered user with valid credentials
- **WHEN** the user submits login form
- **THEN** the system creates a session

---

## MODIFIED Requirements

### Requirement: Session Management

**Replaces**: Section 3.2 in target spec

The system MUST invalidate sessions after 24 hours of inactivity.

---

## REMOVED Requirements

### Requirement: Basic Auth

**Reason**: Replaced by JWT-based authentication
**Migration**: Update clients to use new /auth/token endpoint
```

### RFC 2119 Keywords

Use normative keywords for requirement levels:

| Keyword | Meaning |
|---------|---------|
| **SHALL** / **MUST** | Absolute requirement |
| **SHALL NOT** / **MUST NOT** | Absolute prohibition |
| **SHOULD** | Recommended |
| **MAY** | Optional |

## Directory Structure

```
.speck/
├── changes/                    # Active change proposals
│   └── add-user-auth/
│       ├── proposal.md         # Why, what, impact
│       ├── tasks.md            # Implementation checklist
│       ├── design.md           # Technical decisions (optional)
│       └── specs/              # Delta specifications
│           └── user-management/
│               └── spec.md     # ADDED/MODIFIED/REMOVED
└── archive/                    # Completed changes
    └── add-user-auth-20250108/
```

## Naming Conventions

Change names must be kebab-case:
- **Valid**: `add-auth`, `fix-login-bug`, `update-api-v2`
- **Invalid**: `Add_Auth`, `addAuth`, `Add Auth`

Use verb-led prefixes:
- `add-` - New features
- `update-` - Enhancements
- `fix-` - Bug corrections
- `remove-` - Deprecations
- `refactor-` - Code improvements

## Validation Rules

The validate command checks:

1. **Proposal structure** - Required sections present
2. **Delta format** - ADDED/MODIFIED/REMOVED sections exist
3. **Requirement syntax** - Each requirement has scenarios
4. **RFC 2119 usage** - Normative keywords used correctly
5. **Name format** - Kebab-case naming

Example validation output:
```
Validating change: add-user-auth

✓ Proposal structure valid
✓ Delta format valid
✓ 3 requirements with scenarios
✓ RFC 2119 keywords present
✓ Name format valid

Status: PASS
```

## Migration from OpenSpec

If you have an existing OpenSpec project:

```
/speck-changes.migrate
```

This will:
1. Detect `openspec/` directory structure
2. Convert specs from `openspec/specs/` to `specs/`
3. Import changes from `openspec/changes/` to `.speck/changes/`
4. Validate imported files

## Troubleshooting

### "Change name must be kebab-case"

Use only lowercase letters, numbers, and hyphens.

### "Missing required section"

Delta files need all three sections (ADDED, MODIFIED, REMOVED), even if empty:
```markdown
## ADDED Requirements
(none)

## MODIFIED Requirements
(none)

## REMOVED Requirements
(none)
```

### "Requirement missing scenario"

Every requirement needs at least one `#### Scenario:` block with Given-When-Then
format.

### "Cannot archive: incomplete tasks"

Complete all tasks in `tasks.md` first, or use `--force` flag to bypass (not
recommended).

## See Also

- [Plugin Extensibility](./) - Overview of Speck plugins
- [Feature Development Workflow](/workflows/feature-development) - Using Speck
  for features
- [Command Reference](/commands/reference) - All Speck commands
