# Speck Changes

OpenSpec-style change management for Speck projects.

## Why Speck Changes?

AI coding assistants work best when requirements are explicit before implementation begins. Speck Changes adds a lightweight specification workflow that captures intent, tracks progress, and keeps an auditable history of every feature.

Key outcomes:
- **Agree before coding**: Human and AI align on specs before any code is written
- **Structured proposals**: Changes include rationale, tasks, and spec deltas in one folder
- **Auditable history**: Archived changes document what was built and why
- **Brownfield-ready**: Works great for modifying existing features, not just greenfield projects

## How It Works

```
┌────────────────────┐
│ Create Proposal    │
│ /speck-changes     │
│   .propose <name>  │
└────────┬───────────┘
         │ captures intent
         ▼
┌────────────────────┐
│ Edit & Refine      │
│ (proposal, tasks,  │◀──── feedback loop ──────┐
│  spec deltas)      │                          │
└────────┬───────────┘                          │
         │ validated plan                       │
         ▼                                      │
┌────────────────────┐                          │
│ Implement Tasks    │──────────────────────────┘
│ (AI writes code)   │
└────────┬───────────┘
         │ all tasks complete
         ▼
┌────────────────────┐
│ Archive Change     │
│ (merge deltas into │
│  source specs)     │
└────────────────────┘
```

## Getting Started

### Prerequisites

- Bun 1.0+ runtime
- Git (for version control)
- GitHub CLI (`gh`) for upstream sync (optional)

### Quick Start

**1. Create a change proposal**

```
/speck-changes.propose add-user-auth
```

This scaffolds a complete change folder:

```
.speck/changes/add-user-auth/
├── proposal.md     # Why this change, expected outcomes
├── tasks.md        # Implementation checklist
└── specs/          # Delta files (created as needed)
```

**2. Review and refine your proposal**

Edit the generated files to capture your requirements:
- Add rationale and scope to `proposal.md`
- Break down work into tasks in `tasks.md`
- Create delta files showing spec additions/modifications

**3. Validate before implementation**

```
/speck-changes.validate add-user-auth
```

**4. Implement with Claude assistance**

```
/speck-changes.apply add-user-auth
```

Claude will guide you through implementing each task, marking them complete as you progress.

**5. Archive when complete**

```
/speck-changes.archive add-user-auth
```

## Complete Example

Here's a real workflow showing how to use Speck Changes with your AI assistant.

### 1. Create the Proposal

```
You: Create a change proposal for adding two-factor authentication

AI:  I'll create a Speck Changes proposal for 2FA.
     Running: /speck-changes.propose add-2fa

     Created .speck/changes/add-2fa/ with:
     - proposal.md (template ready for your rationale)
     - tasks.md (empty task list)
```

### 2. Check Your Changes

```bash
$ /speck-changes.list

Active Changes
──────────────
  add-2fa    Created: 2024-01-15    Tasks: 0/0
```

### 3. Refine the Specs

```
You: Add the requirements for OTP-based 2FA to the proposal

AI:  I'll update the proposal and create a delta file for the auth spec.

     Updated proposal.md with scope and rationale.
     Created specs/auth.md with ADDED requirements for OTP verification.
```

### 4. Validate the Proposal

```
$ /speck-changes.validate add-2fa

Validating add-2fa...
✓ proposal.md has required sections
✓ tasks.md is valid markdown
✓ specs/auth.md uses correct delta format
✓ RFC 2119 keywords found (SHALL, MUST)
✓ Scenarios use Given-When-Then format

Validation passed!
```

### 5. Review Full Details

```
$ /speck-changes.show add-2fa

Change: add-2fa
───────────────

Proposal:
  Add two-factor authentication using TOTP for enhanced security.

Tasks (0/3 complete):
  [ ] T001: Add OTP secret storage to user model
  [ ] T002: Create OTP verification endpoint
  [ ] T003: Update login flow to require OTP

Spec Deltas:
  specs/auth.md
    ADDED: REQ-004 Two-Factor Authentication
```

### 6. Implement the Change

```
You: Let's implement this change.

AI:  I'll apply the add-2fa change.
     Running: /speck-changes.apply add-2fa

     Loading tasks from .speck/changes/add-2fa/tasks.md...

     Starting T001: Add OTP secret storage to user model...
     [implements the feature]
     ✓ T001 complete

     Starting T002: Create OTP verification endpoint...
     [implements the feature]
     ✓ T002 complete

     All tasks complete! Run /speck-changes.archive add-2fa to finish.
```

### 7. Archive When Done

```
You: All tasks are complete. Archive this change.

AI:  Archiving add-2fa...

     ✓ Merged ADDED requirements into specs/auth.md
     ✓ Moved to .speck/archive/add-2fa-20240115/

     Change archived successfully!
```

## Command Reference

### Change Management

| Command | Description |
|---------|-------------|
| `/speck-changes.propose <name>` | Create a new change proposal |
| `/speck-changes.list` | List all active change proposals |
| `/speck-changes.show <name>` | Display proposal, tasks, and spec deltas |
| `/speck-changes.validate <name>` | Check structure and formatting |
| `/speck-changes.apply <name>` | Implement change tasks with Claude assistance |
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
├── changes/                    # Active change proposals
│   └── <name>/
│       ├── proposal.md         # Change rationale and scope
│       ├── tasks.md            # Implementation checklist
│       ├── design.md           # Technical design (optional)
│       └── specs/              # Delta files
│           └── <spec>.md       # ADDED/MODIFIED/REMOVED sections
│
├── archive/                    # Completed changes (timestamped)
│   └── <name>-YYYYMMDD/
│       └── ...                 # Same structure as changes/
│
└── config.json                 # Speck configuration

specs/                          # Source of truth specifications
upstream/openspec/              # Pristine OpenSpec releases (maintainers)
```

## Proposal Options

### Basic Proposal

```
/speck-changes.propose add-user-auth
```

Creates the minimal structure with `proposal.md` and `tasks.md`.

### With Design Document

```
/speck-changes.propose add-user-auth --with-design
```

Also creates `design.md` for technical decisions and architecture notes.

### With Spec Deltas

```
/speck-changes.propose add-user-auth --specs auth,users
```

Pre-creates delta files for the specified specs.

## Delta File Format

Delta files track changes to specifications using three sections:

### ADDED Requirements

New capabilities being introduced:

```markdown
## ADDED Requirements

### REQ-002: Password Reset

Users SHALL be able to reset their password via email.

#### Scenario: Successful password reset

- **Given**: A registered user with verified email
- **When**: They request a password reset
- **Then**: They receive a reset link valid for 24 hours
```

### MODIFIED Requirements

Changes to existing behavior (include before/after):

```markdown
## MODIFIED Requirements

### REQ-001: User Login

**Before**: Users can log in with email and password.

**After**: Users SHALL log in with email, password, and optional 2FA.

#### Scenario: Login with 2FA enabled

- **Given**: A user with 2FA configured
- **When**: They submit valid credentials
- **Then**: They are prompted for their OTP code
```

### REMOVED Requirements

Deprecated features (include reason):

```markdown
## REMOVED Requirements

### REQ-003: SMS Verification

**Reason**: Replaced by TOTP-based 2FA for improved security.
```

### Format Requirements

- Use `### REQ-XXX: Title` for requirement headers
- Every requirement needs at least one `#### Scenario:` block
- Use RFC 2119 keywords: SHALL, MUST, SHOULD, MAY, etc.
- Scenarios follow Given-When-Then format

## Validation Checks

The `/speck-changes.validate` command verifies:

| Check | Description |
|-------|-------------|
| Proposal structure | Required sections present in proposal.md |
| Task format | Valid markdown checklist in tasks.md |
| Delta sections | ADDED/MODIFIED/REMOVED headers used correctly |
| RFC 2119 keywords | SHALL, MUST, SHOULD, etc. in requirements |
| Scenario format | Given-When-Then structure in scenarios |
| File references | Delta files reference valid spec names |

## Archive Options

### Standard Archive

```
/speck-changes.archive add-user-auth
```

Requires all tasks to be marked complete.

### Force Archive

```
/speck-changes.archive add-user-auth --force
```

Archives even with incomplete tasks (for abandoned or deferred changes).

### What Archiving Does

1. **Merges deltas**: ADDED requirements are appended to source specs
2. **Timestamps folder**: Moves to `.speck/archive/<name>-YYYYMMDD/`
3. **Preserves history**: Original proposal and tasks remain for reference

## Migration from OpenSpec

If you have an existing OpenSpec project:

### Preview Migration

```
/speck-changes.migrate --dry-run
```

Shows what would be migrated without making changes.

### Perform Migration

```
/speck-changes.migrate
```

This imports:
- `openspec/specs/` → `specs/`
- `openspec/changes/` → `.speck/changes/`
- `openspec/archive/` → `.speck/archive/`

## How Speck Changes Compares

### vs. OpenSpec

Speck Changes is inspired by and compatible with OpenSpec, adapted for the Speck ecosystem:

| Aspect | OpenSpec | Speck Changes |
|--------|----------|---------------|
| Runtime | Node.js | Bun |
| Config location | `openspec/` | `.speck/` |
| Integration | Standalone CLI | Claude Code plugin |
| Slash commands | `/openspec:*` | `/speck-changes.*` |

### vs. No Specs

Without specifications, AI assistants generate code from vague prompts, often missing requirements or adding unwanted features. Speck Changes brings predictability by establishing agreement before implementation.

### vs. Ad-hoc Documentation

Unlike scattered docs or chat history, Speck Changes keeps all context for a feature in one folder—rationale, tasks, and spec changes together—making it easy to understand what was built and why.

## Best Practices

### 1. Start Small

Begin with a clear, focused proposal. Large changes should be split into multiple proposals.

### 2. Write Clear Scenarios

Good scenarios make implementation unambiguous:

```markdown
#### Scenario: Rate limit exceeded

- **Given**: A user who has made 100 requests in the last hour
- **When**: They make another API request
- **Then**: They receive a 429 response with retry-after header
```

### 3. Validate Early

Run `/speck-changes.validate` before implementation to catch formatting issues.

### 4. Track Progress Incrementally

Update task checkboxes as you complete each item—don't batch updates.

### 5. Archive Promptly

Archive changes once complete to keep the active changes list manageable.

## Troubleshooting

### "Change not found"

Ensure the change name matches exactly (case-sensitive):

```
/speck-changes.show add-user-auth    # correct
/speck-changes.show Add-User-Auth    # may not match
```

### "Validation failed: missing RFC 2119 keywords"

Add SHALL, MUST, SHOULD, or similar keywords to your requirements:

```markdown
# Before (fails)
Users can reset their password.

# After (passes)
Users SHALL be able to reset their password.
```

### "Cannot archive: incomplete tasks"

Either complete remaining tasks or use `--force`:

```
/speck-changes.archive my-change --force
```

## Documentation

See full documentation at the [Speck website](https://speck.dev/plugins/speck-changes).
