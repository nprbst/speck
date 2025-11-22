---
title: "What's New in Speck"
description: "Recent feature additions and improvements to Speck for Claude Code"
category: "reference"
order: 2
tags: ["changelog", "updates", "features", "releases"]
lastUpdated: 2025-11-22
---

# What's New in Speck

Track the latest features, improvements, and capabilities added to Speck.

---

## November 2025: Advanced Workflows

### Multi-Repo & Monorepo Support (Spec 007)
**Released**: November 2025

Share specifications across multiple repositories with symlink-based detection and per-repo implementation plans.

**Key Capabilities**:
- **`/speck.link` command**: Link child repositories to specification root
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

### Stacked PR Workflows (Spec 008)
**Released**: November 2025

Break large features into multiple dependent pull requests for faster review cycles and parallel development.

**Key Capabilities**:
- **`/speck.branch create`**: Create stacked branches with dependency tracking
- **`/speck.branch list`**: View dependency trees and PR status
- **`/speck.branch status`**: Health checks for branch stacks
- **`/speck.branch import`**: Import existing git branches into Speck tracking
- **Branch metadata**: Track PR numbers, status, and base branches in `.speck/branches.json`

**Benefits**:
- 400-600 line PRs (vs 2000+ line monolithic PRs)
- Faster review cycles (15-30 minutes vs hours)
- Parallel work while waiting for reviews
- Incremental delivery (merge completed layers without waiting for entire feature)

**Tool Compatibility**:
- Works with Graphite, GitHub Stack, or manual git workflows
- No vendor lock-in - use any tool for rebasing and PR creation

**Learn More**:
- [Stacked PR Concepts](/docs/core-concepts/stacked-prs)
- [Stacked PR Setup Guide](/docs/advanced-features/stacked-prs)
- [Stacked PR Workflow Tutorial](/docs/examples/stacked-pr-workflow)

---

### Multi-Repo Stacked PRs (Spec 009)
**Released**: November 2025

Combines multi-repo support with stacked PR workflows for coordinating large features across repositories.

**Key Capabilities**:
- **Independent stacks per repository**: Each child repo manages its own branch stack
- **Aggregate status**: View all stacks across repositories with `/speck.branch list --all`
- **Same-repo dependency constraint**: Branches in repo A cannot depend on branches in repo B (prevents cross-repo complexity)
- **Unified spec tracking**: All stacks reference same parent specification

**Use Cases**:
- Backend team creates `db-layer → api-layer` stack
- Frontend team creates `login-ui → profile-ui` stack
- Both teams work in parallel on shared authentication feature

**Learn More**:
- [Multi-Repo Support](/docs/advanced-features/multi-repo-support)
- [Stacked PR Workflows](/docs/advanced-features/stacked-prs)
- [Capability Matrix](/docs/reference/capability-matrix)

---

### Virtual Commands & Hook Integration (Spec 010)
**Released**: November 2025

Redesigned command architecture for sub-100ms execution through hook-based prerequisite checks and context pre-loading.

**Key Improvements**:
- **30% faster slash command execution**: Virtual commands delegate to Bun CLI with automatic prerequisite validation
- **Sub-100ms hook latency**: PrePromptSubmit hook pre-loads context before LLM invocation
- **Automatic prerequisite checks**: Commands validate requirements (specs, plans, tasks) without manual verification
- **Context pre-loading**: File contents injected into prompt automatically (reduces Read tool calls by 60-80%)

**Performance Metrics**:
- Hook latency: 50-90ms (p50-p95)
- Command invocation overhead: <10ms
- Zero blocking user experience

**Technical Details**:
- Dual-mode commands: Virtual mode for Claude Code hooks, direct mode for terminal
- Commander.js CLI framework
- JSON-based prerequisite context injection

**Learn More**:
- [Architecture: Virtual Commands](/docs/architecture/virtual-commands) *(coming soon)*
- [Architecture: Hooks](/docs/architecture/hooks) *(coming soon)*
- [Architecture: Performance](/docs/architecture/performance) *(coming soon)*

---

## October-November 2025: Website & Documentation

### Plugin Installation & Speck Skill (Spec 006)
**Released**: November 2025

Complete website documentation for plugin installation and Speck skill usage.

**Documentation Added**:
- [Quick Start Guide](/docs/getting-started/quick-start) - 10-minute installation and first command
- [Installation Guide](/docs/getting-started/installation) - Detailed setup instructions
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
- Visual branch dependency graphs
- Multi-spec workspace management
- Performance dashboards

Have feature requests? [Open a GitHub Discussion](https://github.com/nprbst/speck/discussions).
