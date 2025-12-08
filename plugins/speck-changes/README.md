# Speck Changes

OpenSpec-style change management for Speck projects.

## Quick Start

```bash
# Create a new change proposal
/speck-changes.propose add-auth

# List all active changes
/speck-changes.list

# Validate a change proposal
/speck-changes.validate add-auth

# Archive a completed change
/speck-changes.archive add-auth
```

## Features

- **Change Proposals**: Structured proposal workflow with proposal.md, tasks.md, and delta files
- **Delta Specs**: Track ADDED/MODIFIED/REMOVED requirements per spec
- **Validation**: Check proposal structure, delta formatting, and RFC 2119 keywords
- **Archive Workflow**: Merge deltas back into source specs when complete
- **OpenSpec Migration**: Import existing OpenSpec projects to Speck format
- **Upstream Sync**: Pull and transform OpenSpec releases (maintainer use)

## Commands

### Change Management

| Command | Description |
|---------|-------------|
| `/speck-changes.propose <name>` | Create a new change proposal |
| `/speck-changes.list` | List all active change proposals |
| `/speck-changes.show <name>` | Show details of a specific change |
| `/speck-changes.validate <name>` | Validate proposal structure and formatting |
| `/speck-changes.archive <name>` | Archive completed change and merge deltas |

### Migration

| Command | Description |
|---------|-------------|
| `/speck-changes.migrate` | Migrate from OpenSpec to Speck format |

### Upstream Sync (Maintainers)

| Command | Description |
|---------|-------------|
| `/speck-changes.check-upstream` | Query available OpenSpec releases |
| `/speck-changes.pull-upstream <version>` | Fetch and store an OpenSpec release |
| `/speck-changes.transform-upstream` | Transform Node.js CLI to Bun TypeScript |

## Directory Structure

```
.speck/
├── changes/           # Active change proposals
│   └── <name>/
│       ├── proposal.md    # Change rationale and scope
│       ├── tasks.md       # Implementation checklist
│       ├── design.md      # Technical design (optional)
│       └── specs/         # Delta files
│           └── <spec>.md  # ADDED/MODIFIED/REMOVED sections
├── archive/           # Completed changes (timestamped)
│   └── <name>-YYYYMMDD/
└── ...

specs/                 # Source of truth specifications
upstream/openspec/     # Pristine OpenSpec releases (maintainers)
```

## Workflow

### 1. Create a Proposal

```bash
# Basic proposal
/speck-changes.propose add-user-auth

# With design document
/speck-changes.propose add-user-auth --with-design

# With delta files for specific specs
/speck-changes.propose add-user-auth --specs auth,users
```

### 2. Edit Your Proposal

- Edit `proposal.md` with rationale, scope, and expected outcome
- Add tasks to `tasks.md`
- Create delta files in `specs/` showing proposed changes

### 3. Validate Before Review

```bash
/speck-changes.validate add-user-auth
```

Checks:
- Proposal structure (required sections)
- Delta file format (ADDED/MODIFIED/REMOVED)
- Scenario blocks (Given-When-Then)
- RFC 2119 keywords (SHALL, MUST, SHOULD, etc.)

### 4. Implement Tasks

Mark tasks complete in `tasks.md` as you implement:

```markdown
- [x] T001: Create auth middleware
- [x] T002: Add login endpoint
- [ ] T003: Write tests
```

### 5. Archive When Complete

```bash
# Archive with all tasks complete
/speck-changes.archive add-user-auth

# Force archive with incomplete tasks
/speck-changes.archive add-user-auth --force
```

This:
- Merges ADDED requirements into source specs
- Moves change folder to `.speck/archive/<name>-YYYYMMDD/`

## Delta File Format

```markdown
# Delta: auth

## ADDED Requirements

### REQ-002: Password Reset

Users SHALL be able to reset their password via email.

#### Scenario: Successful password reset

- **Given**: A registered user with verified email
- **When**: They request a password reset
- **Then**: They receive a reset link via email

## MODIFIED Requirements

### REQ-001
**Before**: Users can log in with email.
**After**: Users SHALL log in with email and 2FA.

## REMOVED Requirements

### REQ-003
**Reason**: Replaced by OAuth integration
```

## Migration from OpenSpec

If you have an existing `openspec/` directory:

```bash
# Preview what will be migrated
/speck-changes.migrate --dry-run

# Perform migration
/speck-changes.migrate
```

This imports:
- `openspec/specs/` → `specs/`
- `openspec/changes/` → `.speck/changes/`

## Requirements

- Bun 1.0+ runtime
- Git (for upstream sync)
- GitHub CLI (`gh`) for upstream authentication (optional)

## Documentation

See full documentation at the [Speck website](https://speck.dev/plugins/speck-changes).
