---
name: changes-workflow
description: |
  Guide for OpenSpec change management workflow. Use when working with change proposals,
  implementing delta specifications, or archiving completed changes. Covers the full
  lifecycle from drafting to archival.
---

# OpenSpec Changes Workflow

## TL;DR

OpenSpec changes follow a **four-stage workflow**:

1. **Draft** (`/speck-changes.propose`) - Create structured change proposal
2. **Review** (`/speck-changes.validate`) - Validate format and completeness
3. **Implement** (`/speck-changes.apply`) - Execute tasks with Claude assistance
4. **Archive** (`/speck-changes.archive`) - Merge deltas into source specs

## Before Starting Any Task

Always verify:

- [ ] Change proposal exists: `.speck/changes/<name>/proposal.md`
- [ ] Tasks file exists: `.speck/changes/<name>/tasks.md`
- [ ] Delta specs (if any) are in `.speck/changes/<name>/specs/`
- [ ] Target spec files exist for any MODIFIED/REMOVED requirements

## Stage 1: Draft a Change

```bash
/speck-changes.propose <name>
```

Creates:
- `proposal.md` - Rationale and scope
- `tasks.md` - Implementation checklist
- Optional: `design.md` with `--with-design` flag

**Naming Rules**: Use kebab-case only (lowercase, numbers, hyphens).

## Stage 2: Review the Change

```bash
/speck-changes.validate <name>
```

Validates:
- Proposal structure (required sections)
- Delta file format (ADDED/MODIFIED/REMOVED sections)
- Requirement syntax (FR-### IDs, scenario blocks)
- RFC 2119 normative keywords (SHALL, MUST, SHOULD)

Fix any validation errors before proceeding.

## Stage 3: Implement the Change

```bash
/speck-changes.apply <name>
```

The apply command:
- Loads tasks from `tasks.md`
- Provides delta context for spec-related tasks
- Marks tasks complete as you finish them (`[ ]` → `[x]`)
- Suggests archival when all tasks complete

## Stage 4: Archive the Change

```bash
/speck-changes.archive <name>
```

Archives:
- Merges delta files into source specifications
- Moves change folder to `.speck/archive/<name>-<YYYYMMDD>/`
- Warns if incomplete tasks exist (use `--force` to bypass)

## Quick Reference

| Command | Purpose |
|---------|---------|
| `/speck-changes.propose <name>` | Create new change proposal |
| `/speck-changes.list` | List all active changes |
| `/speck-changes.show <name>` | Show change details |
| `/speck-changes.validate <name>` | Validate change format |
| `/speck-changes.apply <name>` | Implement change tasks |
| `/speck-changes.archive <name>` | Merge and archive change |

## Related Skills

- [spec-format.md](./spec-format.md) - Delta specification format
- [troubleshooting.md](./troubleshooting.md) - Error recovery and fixes
