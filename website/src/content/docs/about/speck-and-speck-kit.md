---
title: "Speck & spec-kit"
description: "Understand the relationship between Speck and GitHub's spec-kit project, including inherited features, Speck extensions, and compatibility guarantees."
category: about
audience: [new-users, existing-users, evaluators]
tags: ["spec-kit", "origins", "compatibility", "architecture", "foundation"]
lastUpdated: 2025-11-22
relatedPages: ["/docs/getting-started/quick-start", "/docs/core-concepts/workflow"]
---

# Speck & spec-kit

## Origin Story

Speck builds on and remains compatible with GitHub's excellent [spec-kit](https://github.com/github/spec-kit) project, extending it specifically for Claude Code users. The spec-kit project pioneered a rigorous specification-driven development methodology that separates business requirements from implementation details, enabling clearer communication between stakeholders and development teams.

We are deeply grateful to the spec-kit team at GitHub for creating this foundation. When we encountered Claude Code's unique capabilities—native slash commands, hook-based architecture, and real-time prerequisite checking—we saw an opportunity to optimize the spec-kit methodology for this specific environment while maintaining full compatibility with the upstream project.

Speck's vision is not to replace spec-kit, but to provide Claude Code users with a tool that leverages Claude's AI-native features for faster, more integrated specification workflows. For teams using other AI assistants or working outside Claude Code, [spec-kit](https://github.com/github/spec-kit) remains the canonical choice.

---

## Inherited Features

Speck inherits the core specification-driven methodology from spec-kit, including:

### Three-Phase Workflow

The foundational **specify → plan → implement** workflow comes directly from spec-kit. This workflow ensures that:
- Business requirements are captured without implementation bias
- Technical planning happens only after requirements are clear
- Implementation tasks are generated from vetted plans

Speck preserves this workflow structure 100%, using `/speck.specify`, `/speck.plan`, and `/speck.implement` commands that mirror spec-kit's bash scripts.

### Constitution-Based Project Governance

Speck adopts spec-kit's constitution concept, which defines project-wide development principles that all specifications must follow. Constitutions ensure:
- Consistent quality standards across features
- Technology-agnostic requirements
- Clear success criteria and validation rules

Speck extends this concept to support **per-repository constitutions** in multi-repo environments (see Speck Extensions below).

### Handlebars Template System

The template-driven approach for generating specifications, plans, and tasks comes from spec-kit. Templates use Handlebars syntax to:
- Ensure consistent documentation structure
- Inject project-specific context
- Customize workflows per project or team

Speck maintains template compatibility while adding Claude Code-specific templates for slash commands and agents.

### File Format and Directory Conventions

Speck follows spec-kit's `specs/` directory structure and markdown-based file formats:
- `specs/NNN-feature-name/spec.md` for requirements
- `specs/NNN-feature-name/plan.md` for technical design
- `specs/NNN-feature-name/tasks.md` for implementation breakdown
- `.speck/` (equivalent to spec-kit's `.spec/`) for project metadata

This compatibility means teams can **switch between Speck and spec-kit without data loss**.

### Specification-First Development Methodology

The core principle—write technology-agnostic specifications before any implementation—is inherited directly from spec-kit. This ensures:
- Requirements remain valid across technology changes
- Stakeholders can understand and validate specs
- Implementation details don't leak into business requirements

---

## Speck Extensions

Speck adds the following capabilities specifically for Claude Code users:

### Multi-Repo and Monorepo Support

Speck detects multi-repo contexts using **symlink-based detection** and enables:
- **Shared specifications** across multiple repositories
- **Per-repo constitutions** that inherit from a central root
- **Independent implementation plans** per repository from shared specs
- **Coordinated feature development** for frontend/backend splits

This is a Speck-specific extension not present in spec-kit. [Learn more about multi-repo support →](/docs/advanced-features/multi-repo-support)

### Stacked PR Workflows

Speck provides **branch dependency tracking** and **PR automation** for breaking large features into reviewable chunks:
- `/speck.branch create` for stacked branch management
- **Multi-repo stacked PR support** with independent stacks per repository
- **Tool compatibility** with Graphite, GitHub Stack, or manual git workflows

This capability is unique to Speck. [Learn more about stacked PRs →](/docs/advanced-features/stacked-prs)

### Virtual Command Pattern with Hook Integration

Speck uses a **hook-based architecture** for slash command execution:
- **PrePromptSubmit hook** injects prerequisite context before commands run
- **Sub-100ms hook latency** for real-time validation
- **Virtual commands** avoid path dependencies and cold-start delays
- **30% faster execution** compared to traditional bash-based approaches

This architecture leverages Claude Code's native capabilities unavailable to spec-kit. [Learn more about virtual commands →](/docs/architecture/virtual-commands)

### Performance Optimizations

Speck achieves measurable performance improvements through:
- **Automatic prerequisite checking** via hooks (no manual validation)
- **Context pre-loading** before command execution
- **Dual-mode CLI** for both interactive and automation workflows
- **Bun runtime** for faster TypeScript execution

[View performance metrics →](/docs/architecture/performance)

### Claude Code Native Integration

Speck is distributed as a **Claude Code plugin** with:
- **One-command installation** via `/plugin`
- **Slash command integration** (`/speck.specify`, `/speck.plan`, etc.)
- **Dedicated agents** for complex workflows
- **Skills** for knowledge retrieval

This tight integration makes Speck feel native to Claude Code, whereas spec-kit remains editor-agnostic.

---

## Compatibility Guarantees

Speck maintains the following compatibility commitments with spec-kit:

### File Format 100% Compatible

All files in the `specs/` directory are **interchangeable** between Speck and spec-kit:
- Same markdown structure
- Same frontmatter schema
- Same directory conventions

You can **use Speck for some features and spec-kit for others** in the same project without conflicts.

### Upstream Sync Capability

Speck provides commands to sync with spec-kit releases:
- `/speck.pull-upstream` fetches the latest spec-kit release
- `/speck.transform-upstream` converts bash scripts to Bun TypeScript
- **Automatic compatibility validation** ensures Speck extensions don't break upstream alignment

### Constitution Alignment

Speck's constitution includes **Principle I: Upstream Fidelity**, which mandates:
- No deviation from spec-kit's core methodology
- Compatibility testing with upstream releases
- Extension-only approach (never replace core features)

This constitutional commitment ensures Speck remains a **compatible derivative**, not a fork.

---

## Positioning Statement

### When to Use Speck

Choose Speck if you are:
- **Using Claude Code** for AI-assisted development
- **Need multi-repo support** for microservices or monorepos
- **Want stacked PR workflows** for faster code review
- **Value performance** (sub-100ms command execution)
- **Prefer one-command installation** via Claude Code marketplace

### When to Use spec-kit

Choose [spec-kit](https://github.com/github/spec-kit) if you are:
- **Not using Claude Code** (using other AI assistants, IDEs, or standalone)
- **Want maximum flexibility** and customization
- **Prefer bash-based universal compatibility**
- **Don't need multi-repo or stacked PR features**

### Both Tools Serve Different Use Cases

Speck is a **Claude Code-optimized derivative** of spec-kit, not a replacement. The spec-kit project remains the **canonical upstream** for the specification-driven development methodology. Both tools are valuable, and the choice depends on your development environment and workflow preferences.

---

## Learn More

- [spec-kit on GitHub](https://github.com/github/spec-kit) - The upstream project
- [Speck Quick Start Guide](/docs/getting-started/quick-start) - Get started with Speck
- [Multi-Repo Support](/docs/advanced-features/multi-repo-support) - Speck's multi-repo capabilities
- [Stacked PR Workflows](/docs/advanced-features/stacked-prs) - Branch dependency tracking
- [Virtual Commands](/docs/architecture/virtual-commands) - Hook-based architecture

---

**Acknowledgment**: Thank you to the GitHub spec-kit team for creating the foundational specification-driven development methodology that makes Speck possible.
