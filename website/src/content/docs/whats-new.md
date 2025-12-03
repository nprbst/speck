---
title: "What's New in Speck"
description: "Recent feature additions and improvements to Speck for Claude Code"
category: "reference"
order: 2
tags: ["changelog", "updates", "features", "releases"]
lastUpdated: 2025-12-02
draft: true
---

# What's New in Speck

Track the latest features, improvements, and capabilities added to Speck.

---

## November 2025: Atomic Transform Rollback (Spec 016)

### Safe Upstream Transformations
**Released**: November 2025

Staged transformation with atomic commit/rollback semantics protects production directories during upstream integration.

**Key Capabilities**:
- **Staged transformations**: All transforms write to `.speck/.transform-staging/<version>/` first
- **Atomic commit**: Files move to production only after all agents succeed
- **Automatic rollback**: Any agent failure triggers complete staging cleanup
- **Crash recovery**: Orphaned staging detection with commit/rollback/inspect options

**Benefits**:
- No broken state from partial transformations
- Production directories unchanged until success
- Recovery from unexpected interruptions
- Transformation history tracking with failure details

**Learn More**:
- [Commands Reference](/docs/commands/reference) - Updated transform-upstream documentation

---

## November 2025: Scope Simplification (Spec 015)

### Streamlined CLI & Session Handoff
**Released**: November 2025

Simplified Speck architecture with dual-mode CLI, session handoff for worktrees, and global installation.

**Key Capabilities**:
- **`/speck:init`**: Install Speck CLI globally to `~/.local/bin/speck`
- **`/speck:help`**: Load the speck-help skill for answering questions
- **Session handoff**: New Claude sessions in worktrees automatically receive feature context
- **Dual-mode CLI**: Same commands work in terminal (`speck`) and Claude Code (`/speck:*`)
- **Output modes**: `--json` for structured output, `--hook` for Claude Code integration

**Improvements**:
- Simplified branches.json schema (removed stacked PR fields)
- Bootstrap script with Bun detection and self-removal
- Non-standard branch name tracking via branches.json
- Sub-100ms command execution

**Learn More**:
- [Quick Start Guide](/docs/getting-started/quick-start)
- [Commands Reference](/docs/commands/reference)
- [Worktree Integration](/docs/advanced-features/worktrees)

---

## November 2025: Worktree Integration (Spec 012)

### Isolated Workspaces
**Released**: November 2025

Work on multiple features simultaneously with Git worktrees, automatic IDE launch, and dependency installation.

**Key Capabilities**:
- **Automatic worktree creation**: `/speck:specify` creates isolated worktree directory
- **IDE auto-launch**: Opens VSCode, Cursor, WebStorm, IntelliJ IDEA, or PyCharm (Claude Code integration requires VSCode or Cursor)
- **Dependency auto-install**: Runs package manager before IDE opens
- **Session handoff**: Handoff document passes context to new Claude sessions

**Benefits**:
- No branch-switching overhead
- Multiple features in parallel
- Isolated working directories
- Automatic context passing between sessions

**Learn More**:
- [Worktree Integration](/docs/advanced-features/worktrees)
- [Feature Development Workflow](/docs/workflows/feature-development)

---

## November 2025: Multi-Repo & Monorepo Support (Spec 007)

### Shared Specifications
**Released**: November 2025

Share specifications across multiple repositories with symlink-based detection and per-repo implementation plans.

**Key Capabilities**:
- **`/speck:link` command**: Link child repositories to specification root
- **Symlink detection**: Automatic multi-repo mode when `.speck/root` symlink present
- **Shared specifications**: Single `spec.md` across all repositories
- **Per-repo plans**: Each repository generates independent `plan.md` and `tasks.md`
- **Per-repo constitutions**: Architectural principles tailored to each repo's tech stack

**Use Cases**:
- Coordinating frontend/backend features across microservices
- Managing monorepo workspace projects
- Sharing API contracts between services

**Learn More**:
- [Multi-Repo Concepts](/docs/core-concepts/multi-repo)
- [Multi-Repo Setup Guide](/docs/advanced-features/multi-repo-support)
- [Multi-Repo Workflow Tutorial](/docs/examples/multi-repo-workflow)

---

## October-November 2025: Website & Documentation

### Plugin Installation & Speck Skill (Spec 006)
**Released**: November 2025

Complete website documentation for plugin installation and Speck skill usage.

**Documentation Added**:
- [Quick Start Guide](/docs/getting-started/quick-start) - 5-minute installation and first command
- [Troubleshooting Guide](/docs/getting-started/troubleshooting) - Solutions to common issues
- [Setup Reference](/docs/getting-started/setup-reference) - Version compatibility and verification
- [Three-Phase Workflow](/docs/core-concepts/workflow) - Specify → Plan → Implement methodology
- [Commands Reference](/docs/commands/reference) - Complete slash command and skill documentation
- [First Feature Tutorial](/docs/examples/first-feature) - Dark mode toggle walkthrough

**Speck Skill**:
- Ask natural language questions about specs, plans, and tasks
- Example: "What user stories are in this spec?"
- Complements slash commands (skill for questions, commands for actions)

---

## September-October 2025: Public Website (Spec 004)

### Speck Website Launch
**Released**: October 2025

Public-facing website built with Astro for Speck documentation and marketing.

**Features**:
- Astro 5.15+ static site generator
- Cloudflare Pages hosting
- Markdown-based documentation
- Shiki syntax highlighting
- Visual regression testing with Playwright
- Accessibility testing with axe-core

**Website**: [speck.dev](https://speck.dev) *(placeholder)*

---

## How to Update

Keep Speck up to date with the latest features:

1. In Claude Code, type: `/plugin`
2. Select "Manage marketplaces"
3. Select "speck-market"
4. Select "Update marketplace"

**Recommended**: Check for updates monthly or when new features are announced.

---

## Coming Soon

**Q1 2026** *(Roadmap - not committed)*:
- GitHub integration for automated PR status updates
- Visual dependency graphs
- Multi-spec workspace management
- Performance dashboards

Have feature requests? [Open a GitHub Discussion](https://github.com/nprbst/speck/discussions).
