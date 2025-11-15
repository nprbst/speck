# Speck Quickstart Guide

**Version**: 1.0.0
**Last Updated**: 2025-11-14

Welcome to Speck, the Claude Code-optimized specification framework! This guide will get you up and running in under 10 minutes.

---

## What is Speck?

Speck is a living derivative of GitHub's spec-kit methodology, designed specifically for Claude Code with:
- **Native slash commands**: `/speck.specify`, `/speck.clarify`, `/speck.plan`, etc.
- **Autonomous agents**: Delegated Q&A loops, research, and transformation
- **Upstream sync**: Continuous synchronization with spec-kit releases
- **Bun-powered CLI**: Fast TypeScript CLI for non-Claude Code workflows
- **100% file format compatibility**: Drop-in replacement for spec-kit

---

## Prerequisites

- **Claude Code** (recommended) or **Bun 1.0+** (for CLI-only usage)
- **Git 2.30+** (for worktree support)
- **macOS, Linux, or Windows** (Bun is cross-platform)

---

## Installation

### Option 1: Claude Code (Recommended)

1. **Install Speck templates** in your project:
   ```bash
   cd your-project
   git clone https://github.com/nprbst/speck.git .speck-install
   cp -r .speck-install/.claude .
   cp -r .speck-install/.specify .
   cp -r .speck-install/upstream .
   rm -rf .speck-install
   ```

2. **Initialize Speck configuration**:
   ```bash
   cp .specify/templates/speck.config.ts speck.config.ts
   ```

3. **Verify installation** in Claude Code:
   ```
   /help
   ```
   You should see `/speck.specify`, `/speck.clarify`, `/speck.plan`, etc.

### Option 2: CLI Only (Bun)

1. **Install globally**:
   ```bash
   bun install -g speck
   ```

2. **Initialize project**:
   ```bash
   cd your-project
   speck init
   ```

3. **Verify installation**:
   ```bash
   speck --version
   speck --help
   ```

---

## Your First Feature (Claude Code)

Let's create a feature specification in 2 minutes:

### Step 1: Specify

```
/speck.specify "Add user authentication with email and password"
```

Claude will:
1. Create a feature branch (`001-user-authentication`)
2. Generate a complete specification in `specs/001-user-authentication/spec.md`
3. Generate a requirements checklist in `checklists/requirements.md`
4. Mark up to 3 areas needing clarification

**Output**:
```
✓ Feature created: 001-user-authentication
✓ Specification generated: specs/001-user-authentication/spec.md
✓ Checklist generated: checklists/requirements.md

Next steps:
  1. Review and clarify: /speck.clarify
  2. Create implementation plan: /speck.plan
```

### Step 2: Clarify (Optional)

If your spec has `[NEEDS CLARIFICATION]` markers or ambiguous requirements:

```
/speck.clarify
```

Claude's clarification agent will:
1. Scan for ambiguities (both explicit markers and detected gaps)
2. Ask up to 5 targeted questions
3. Update the spec with your answers
4. Validate that all requirements are now unambiguous

**90% of specs resolve in 1 session** (SC-007)

### Step 3: Plan

```
/speck.plan
```

Claude will:
1. Generate `plan.md` with technical context
2. Run constitution check (validate principles compliance)
3. Execute Phase 0: Create `research.md` (architecture decisions)
4. Execute Phase 1: Create `data-model.md`, `contracts/`, `quickstart.md`
5. Prepare for Phase 2 (tasks generation)

**Output**: Complete implementation plan ready for task breakdown

### Step 4: Tasks

```
/speck.tasks
```

Claude will:
1. Generate dependency-ordered task list in `tasks.md`
2. Assign priorities (P0, P1, P2, P3)
3. Define acceptance criteria for each task
4. Create execution order via topological sort

---

## Your First Feature (CLI)

Same workflow, different interface:

```bash
# Step 1: Specify
speck specify "Add user authentication with email and password"

# Step 2: Clarify (if needed)
speck clarify

# Step 3: Plan
speck plan

# Step 4: Tasks
speck tasks
```

**JSON output** (for automation):
```bash
speck specify "Add feature" --json | jq '.feature.branchName'
# Output: "001-feature-name"
```

---

## Working with Worktrees (Parallel Features)

Worktrees enable true isolation for multiple parallel features.

### Creating a Worktree Feature

**Claude Code**:
```
/speck.specify "Add search functionality" --worktree
```

**CLI**:
```bash
speck specify "Add search functionality" --worktree
```

Speck will:
1. Create a new git worktree in `../worktrees/002-search-functionality/`
2. Create feature branch `002-search-functionality`
3. Set up isolated or shared `specs/` directory (auto-detected based on git tracking)

### Specs Directory Modes

Speck auto-detects the appropriate mode:

| Git Tracking | Behavior | Use Case |
|--------------|----------|----------|
| **specs/ is git-tracked** | Worktrees naturally share specs/ (git manages it) | Team environments, shared spec visibility |
| **specs/ is gitignored** | Speck creates symlink: `worktree/specs → main-repo/specs` | Solo development, central spec collection |

**Recommendation**:
- **Team**: Git-track `specs/` (add to repo)
- **Solo**: Gitignore `specs/` (Speck symlinks automatically)

### Working in a Worktree

```bash
# Navigate to worktree
cd ../worktrees/002-search-functionality

# Open in your IDE
code .

# Develop feature in isolation
# (Changes don't affect main repo until you merge)

# When done, remove worktree
git worktree remove ../worktrees/002-search-functionality
```

---

## Syncing with Upstream (spec-kit Updates)

Speck maintains continuous sync with upstream spec-kit releases.

### Checking for Updates

**Claude Code**:
```
/speck.check-upstream-releases
```

**Output**:
```
📦 Checking spec-kit releases...

Current version: v0.0.85
Latest release:  v0.0.86 (released 2025-11-13)

📋 Release Notes (v0.0.86):
- Improved clarify command with better ambiguity detection
- Updated plan template with success criteria format

New release available! Would you like to download it? [y/n]
```

### Downloading New Release

```
/speck.download-upstream v0.0.86
```

Speck will:
1. Download `spec-kit-template-claude-sh-v0.0.86.zip`
2. Extract to `upstream/spec-kit/v0.0.86/`
3. Update symlink: `current → v0.0.86/`
4. Keep previous version (`v0.0.85`) for diffing

### Comparing Versions

```
/speck.diff-upstream-releases v0.0.85 v0.0.86
```

**Output**:
```
📊 Comparing spec-kit v0.0.85 → v0.0.86

Changed Files (3):
├── templates/commands/clarify.md       (+45, -12 lines)
│   └── Impact: .claude/commands/speck.clarify.md
│                .claude/agents/clarification-agent.md
├── templates/commands/plan.md          (+8, -3 lines)
│   └── Impact: .claude/commands/speck.plan.md
└── templates/constitution-template.md  (+1, -1 lines)
    └── Impact: .claude/commands/speck.constitution.md

Recommended transformations:
  /speck.transform-upstream clarify
  /speck.transform-upstream plan
```

### Transforming Commands (Claude Agent-Powered)

```
/speck.transform-upstream clarify
```

Claude will:
1. Analyze upstream bash changes semantically
2. Apply equivalent changes to Speck's TypeScript + Claude Code artifacts
3. Preserve all `[SPECK-EXTENSION:START/END]` blocks
4. Run type checking and tests
5. Generate sync report
6. Present changes for review

**After review**:
```bash
# Review changes in your IDE
git diff .claude/

# Commit if satisfied
git commit -m "sync: transform clarify from spec-kit v0.0.86"
```

---

## Configuration

Edit `speck.config.ts` in your project root:

```typescript
import { defineConfig } from 'speck';

export default defineConfig({
  // Worktree configuration
  worktree: {
    baseDir: '../worktrees',       // Where worktrees are created
    specsMode: 'isolated',         // 'isolated' | 'shared' (auto-detected if omitted)
    shareSpecify: true,            // Share .specify/ directory across worktrees
  },

  // Agent context mode
  agentContextMode: 'per-worktree', // 'shared' | 'per-worktree'

  // Validation rules
  validation: {
    maxClarifications: 3,          // Max [NEEDS CLARIFICATION] markers
    requireChecklist: true,        // Generate checklists automatically
    enforceConstitution: true,     // Run constitution checks
  },
});
```

---

## Complete Workflow Example

Here's a full end-to-end example:

```
# 1. Create feature
/speck.specify "Add real-time notifications"

# Claude creates:
# - Branch: 003-realtime-notifications
# - specs/003-realtime-notifications/spec.md
# - specs/003-realtime-notifications/checklists/requirements.md

# 2. Clarify ambiguities
/speck.clarify

# Claude asks 5 questions, updates spec

# 3. Generate implementation plan
/speck.plan

# Claude creates:
# - specs/003-realtime-notifications/plan.md
# - specs/003-realtime-notifications/research.md
# - specs/003-realtime-notifications/data-model.md
# - specs/003-realtime-notifications/contracts/
# - specs/003-realtime-notifications/quickstart.md

# 4. Generate tasks
/speck.tasks

# Claude creates:
# - specs/003-realtime-notifications/tasks.md (dependency-ordered)

# 5. Implement tasks
/speck.implement

# Claude executes task-by-task implementation

# 6. Analyze consistency
/speck.analyze

# Claude validates cross-artifact consistency (spec ↔ plan ↔ tasks)

# 7. Create pull request
git push origin 003-realtime-notifications
gh pr create --title "Add real-time notifications"
```

---

## Troubleshooting

### "Branch name too long" Error

**Problem**: Generated branch name exceeds git's 244-character limit.

**Solution**: Provide a shorter description or explicit short name:
```
/speck.specify "Add feature" --short-name "custom-short-name"
```

### Duplicate Short Name Warning

**Problem**: Generated short name matches existing feature.

**Solution**: Speck auto-appends collision counter (e.g., `user-auth-2`). Review existing feature before proceeding:
```bash
git checkout 002-user-auth  # Review existing feature
git checkout 003-user-auth-2  # Return to new feature
```

### Upstream Sync Conflict

**Problem**: Upstream changes conflict with Speck extension.

**Solution**: Claude will halt and request manual resolution:
```
⚠️  Extension conflict detected:
File: .claude/commands/speck.clarify.md
Extension: Clarification agent integration
Conflict: Upstream renamed section "## Outline" to "## Overview"

Options:
1. Keep Speck extension (recommended)
2. Apply upstream change (may break agent)
3. Manually merge in IDE
```

Choose option 1 (preserve extension), then manually review upstream intent.

---

## Next Steps

- **Read the Constitution**: `.specify/memory/constitution.md`
- **Explore Templates**: `.specify/templates/`
- **Review Architecture**: `specs/001-speck-core-project/research.md`
- **Join Community**: [GitHub Discussions](https://github.com/nprbst/speck/discussions)

---

## Getting Help

- **Documentation**: https://speck.dev/docs
- **GitHub Issues**: https://github.com/nprbst/speck/issues
- **Discussions**: https://github.com/nprbst/speck/discussions
- **X/Twitter**: @speckdev

---

## Comparison: Speck vs spec-kit

| Feature | spec-kit | Speck |
|---------|----------|-------|
| **Methodology** | Spec-first development | Same (100% compatible) |
| **IDE Integration** | Manual bash scripts | Native Claude Code slash commands |
| **Agents** | None | Clarification, Research, Transformation agents |
| **Skills** | None | Template-renderer, Spec-analyzer, Constitution-validator |
| **CLI** | Bash scripts | Bun-powered TypeScript CLI (<100ms startup) |
| **Upstream Sync** | Manual copy-paste | Automated Claude agent-powered transformation |
| **Worktree Support** | Basic | Advanced (auto-detect specs mode, per-worktree config) |
| **Validation** | Manual checklist | Automated Zod validation + quality gates |
| **File Format** | specs/ directory structure | Identical (drop-in replacement) |

---

## FAQ

### Q: Can I use Speck without Claude Code?

**A**: Yes! The Bun CLI (`speck` command) provides identical functionality. However, Claude Code integration is the primary use case and provides the best experience.

### Q: Is Speck compatible with existing spec-kit projects?

**A**: Yes, 100%. Speck maintains file format compatibility (Constitution Principle VII). You can:
- Adopt Speck in an existing spec-kit project (no migration)
- Switch between spec-kit and Speck freely
- Fallback to spec-kit without data loss

### Q: How often should I sync with upstream?

**A**: Monthly recommended (spec-kit releases monthly). Check for updates:
```
/speck.check-upstream-releases
```

### Q: What happens if I edit a generated file in `.claude/`?

**A**: Generated files (marked with `<!-- GENERATED FILE - DO NOT EDIT -->`) will be overwritten on next upstream sync. Instead:
- **Modify upstream**: Contribute changes to spec-kit repository
- **Modify enhancements**: Edit `enhancements/rules/*.json` (future compiler-based sync)
- **For now**: Edits survive until next `/speck.transform-upstream` run

### Q: Can I customize templates?

**A**: Yes, edit templates in `.specify/templates/`. Changes persist across Speck updates (templates are project-specific, not generated).

---

**Happy Specifying!** 🚀
