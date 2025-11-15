# Quickstart Guide: Speck - Claude Code-Optimized Specification Framework

**Branch**: `001-speck-core-project` | **Date**: 2025-11-15 | **Plan**: [plan.md](plan.md)

This guide provides a step-by-step walkthrough for getting started with Speck, from installation to creating your first feature specification.

---

## Prerequisites

Before using Speck, ensure you have:

1. **Git 2.30+** installed and initialized in your project directory
   ```bash
   git --version  # Should show 2.30 or higher
   git status     # Should not error (if it does, run 'git init')
   ```

2. **Bun 1.0+** installed (for TypeScript CLI functionality)
   ```bash
   bun --version  # Should show 1.0 or higher
   # If not installed: curl -fsSL https://bun.sh/install | bash
   ```

3. **Claude Code** with slash command and agent support
   - Verify by checking for `.claude/` directory in your project
   - Slash commands should be available in the Claude Code interface

4. **Sufficient disk space** for worktrees (if using worktree mode)
   - Minimum: 100MB per worktree
   - Recommended: 1GB+ free space for typical projects

---

## Installation

### Step 1: Clone or Initialize Speck

**For new projects:**
```bash
# Initialize Speck in a new git repository
git init my-project
cd my-project

# Install Speck (method TBD - npm, bun install, or manual clone)
# For now, assume Speck is cloned as .specify/
git clone https://github.com/github/spec-kit .specify
```

**For existing projects:**
```bash
# Add Speck to an existing git repository
cd your-existing-project
git status  # Verify git is initialized

# Install Speck
# (installation method TBD)
```

### Step 2: Verify Installation

Run the prerequisite check to ensure everything is configured correctly:

```bash
.specify/scripts/bash/check-prerequisites.sh --json
```

**Expected output:**
```json
{
  "git": { "installed": true, "version": "2.30+" },
  "bun": { "installed": true, "version": "1.0+" },
  "claudeCode": { "available": true },
  "diskSpace": { "available": "1.5GB" }
}
```

If any prerequisites fail, follow the error messages to install missing dependencies.

---

## Your First Feature Specification

### Step 1: Create a Feature Specification

In Claude Code, use the `/speck.specify` slash command with a natural language description:

```
/speck.specify Add user authentication with email and password
```

**What happens:**
1. Speck generates a feature number (e.g., `001`)
2. Extracts a short name from your description (e.g., `user-auth`)
3. Creates a git branch: `001-user-auth`
4. Generates a specification at `specs/001-user-auth/spec.md`
5. Validates the spec against quality criteria

**Output:**
```
✓ Feature created: 001-user-auth
✓ Branch created: 001-user-auth
✓ Specification generated: specs/001-user-auth/spec.md
⚠ 2 clarification markers detected - run /speck.clarify to resolve
```

### Step 2: Review the Generated Specification

Open the generated specification:

```bash
cat specs/001-user-auth/spec.md
```

**What to look for:**
- **User Scenarios & Testing**: Prioritized user stories (P1, P2, etc.)
- **Requirements**: Functional requirements without implementation details
- **Success Criteria**: Measurable, technology-agnostic outcomes
- **[NEEDS CLARIFICATION]** markers: Areas requiring further definition (max 3)

**Example snippet:**
```markdown
## User Scenarios & Testing

### User Story 1 - User Creates Account (Priority: P1)
A new user wants to create an account using their email and password...

**Acceptance Scenarios**:
1. Given a user visits the signup page, When they submit valid credentials, Then an account is created and they are logged in
2. [NEEDS CLARIFICATION: Password strength requirements - minimum length, special characters?]
```

### Step 3: Clarify Ambiguous Requirements (If Needed)

If your spec contains `[NEEDS CLARIFICATION]` markers, run the clarification workflow:

```
/speck.clarify
```

**What happens:**
1. Speck scans the spec for ambiguities (both explicit markers and detected gaps)
2. Presents up to 5 structured questions with suggested answers
3. You select answers or provide custom input
4. Speck updates the spec with resolved clarifications

**Example interaction:**
```
Question 1/3: Password strength requirements - minimum length, special characters?
Suggested answers:
  A) Min 8 characters, at least one uppercase, one lowercase, one number, one special character
  B) Min 10 characters, no complexity requirements
  C) Custom (provide your answer)

Your choice: A

✓ Clarification 1 resolved and written to spec.md
```

**After clarification:**
```markdown
2. Given a user submits a password, When the password is less than 8 characters or missing required character types (uppercase, lowercase, number, special character), Then an error message is displayed
```

### Step 4: Generate an Implementation Plan

Once your spec is clarified (or if no clarifications are needed), create an implementation plan:

```
/speck.plan
```

**What happens:**
1. **Phase 0**: Generates `research.md` with technical decisions (testing framework, CLI patterns, etc.)
2. **Phase 1**: Generates `data-model.md`, `contracts/`, and `quickstart.md`
3. **Constitution Check**: Validates plan against Speck's constitutional principles
4. **Agent context update**: Runs `.specify/scripts/bash/update-agent-context.sh` to refresh Claude Code context

**Output:**
```
✓ Phase 0: Research complete (research.md)
✓ Phase 1: Data model generated (data-model.md)
✓ Phase 1: Contracts generated (contracts/)
✓ Phase 1: Quickstart guide generated (quickstart.md)
✓ Constitution Check: PASS (all 7 principles satisfied)
✓ Agent context updated

Plan ready at: specs/001-user-auth/plan.md
```

### Step 5: Review the Implementation Plan

Open the generated plan:

```bash
cat specs/001-user-auth/plan.md
```

**Key sections:**
- **Summary**: High-level feature overview + technical approach
- **Technical Context**: Language, dependencies, storage, testing choices (all NEEDS CLARIFICATION items resolved)
- **Constitution Check**: Validation against all 7 constitutional principles
- **Project Structure**: Source code layout and documentation paths
- **Complexity Tracking** (if applicable): Justifications for any constitutional violations

---

## Next Steps: Generating Tasks

After planning, you can generate an actionable task list:

```
/speck.tasks
```

**Note**: Task generation is NOT part of the `/speck.plan` command. It's a separate Phase 2 operation.

**Output:**
- `specs/001-user-auth/tasks.md`: Dependency-ordered task list with checklists

---

## Advanced Workflows

### Using Worktree Mode for Parallel Development

If you want to work on multiple features simultaneously without branch-switching:

```
/speck.specify --worktree Add OAuth social login integration
```

**What happens:**
1. Creates a new git worktree in a separate directory (e.g., `../my-project-002-oauth-login/`)
2. Feature branch `002-oauth-login` is checked out in the worktree
3. Specs are shared (if git-tracked) or symlinked (if gitignored) for central collection
4. You can open the worktree in a separate IDE window for isolated development

**Benefits:**
- No context switching between branches
- True isolation (10+ parallel features supported)
- No cross-contamination of artifacts

### Syncing Upstream Spec-Kit Changes

To benefit from upstream spec-kit improvements:

```
/speck.transform-upstream
```

**What happens:**
1. Fetches latest upstream spec-kit commits
2. Analyzes diffs using Claude for semantic transformation
3. Preserves all `[SPECK-EXTENSION]` markers (100% preservation guaranteed)
4. Generates a sync report showing changes, conflicts, and transformation reasoning
5. If conflicts detected, presents options: skip, manual merge, or abort

**Example output:**
```
✓ Fetched upstream commits: 15 new commits since last sync
✓ Analyzed diffs: 8 files modified
✓ Extensions preserved: 5/5 (100%)
⚠ Conflicts detected: 2 files require manual resolution

Sync report: .speck/sync-reports/2025-11-15-report.md

Conflicts requiring resolution:
1. .claude/commands/speckit.specify.md
   Options: [Skip] [Manual Merge] [Abort Sync]
```

---

## Troubleshooting

### Error: "Speck requires git. Please run 'git init'..."

**Cause**: You're in a directory without git initialization.

**Solution**:
```bash
git init
git add .
git commit -m "Initial commit"
```

### Error: "Feature '002-user-auth' already exists. Created '003-user-auth-2'..."

**Cause**: Duplicate short-name collision.

**Solution**: Speck auto-appends a collision counter (`-2`). Review the existing feature to ensure you're not duplicating work:
```bash
cat specs/002-user-auth/spec.md
```

### Warning: "Branch name truncated from ... to ... (244 character limit)"

**Cause**: Feature description too long, resulting in branch name exceeding git's limit.

**Solution**: This is handled automatically. Speck truncates at word boundaries and appends a hash suffix for uniqueness. Review the truncated name and proceed.

### Error: "Transformed code failed type checking. Sync aborted."

**Cause**: Upstream sync generated invalid TypeScript code.

**Solution**: Review the type errors in the output. This is a safeguard to prevent breaking your codebase. You can manually fix the issue or skip the conflicting upstream change.

---

## File Structure Reference

After running `/speck.specify` and `/speck.plan`, your project structure will look like this:

```
my-project/
├── specs/
│   └── 001-user-auth/
│       ├── spec.md              # Feature specification (Phase 0)
│       ├── plan.md              # Implementation plan (Phase 1)
│       ├── research.md          # Technical research (Phase 0)
│       ├── data-model.md        # Entity definitions (Phase 1)
│       ├── quickstart.md        # This guide (Phase 1)
│       ├── contracts/           # API contracts (Phase 1)
│       │   ├── README.md
│       │   └── *.schema.json
│       └── tasks.md             # Task list (Phase 2, generated separately)
├── .speck/
│   ├── upstream-tracker.json   # Upstream sync tracking
│   └── sync-reports/           # Sync reports
├── .specify/
│   ├── memory/
│   │   └── constitution.md     # Constitutional principles
│   ├── scripts/
│   │   └── bash/               # Infrastructure scripts (becoming Bun CLI wrappers)
│   └── templates/              # Markdown templates
└── .claude/
    └── commands/               # Slash command definitions
```

---

## Command Reference

| Command | Description | Phase | Output |
|---------|-------------|-------|--------|
| `/speck.specify <description>` | Create feature specification | Initial | `spec.md` |
| `/speck.clarify` | Resolve ambiguities in spec | After specify | Updated `spec.md` |
| `/speck.plan` | Generate implementation plan | After clarify | `plan.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md` |
| `/speck.tasks` | Generate actionable task list | After plan | `tasks.md` |
| `/speck.implement` | Execute implementation plan | After tasks | Implemented code |
| `/speck.analyze` | Cross-artifact consistency check | After tasks | Analysis report |
| `/speck.transform-upstream` | Sync upstream spec-kit changes | Anytime | Sync report + updated files |
| `/speck.constitution` | Update constitutional principles | Anytime | Updated `constitution.md` |
| `/speck.checklist` | Generate custom feature checklist | Anytime | `checklists/requirements.md` |

---

## Getting Help

- **Documentation**: See the [specification](spec.md) for full feature details
- **Issues**: Report bugs or request features at [GitHub Issues](https://github.com/[your-org]/speck/issues)
- **Constitution**: Review Speck's design principles in [`.specify/memory/constitution.md`](.specify/memory/constitution.md)
- **Examples**: Check `specs/` directory for real-world examples from this project's own features

---

## Success Metrics

After completing your first feature, verify you've achieved these success criteria:

- ✅ **SC-001**: Specification created in under 2 minutes
- ✅ **SC-002**: Spec contains zero implementation details
- ✅ **SC-003**: Spec passed quality validation on first generation
- ✅ **SC-007**: Clarifications resolved in 1-3 sessions (90% require only 1)

**Next**: Proceed to implementation using `/speck.tasks` and `/speck.implement` to turn your specification into working code.
