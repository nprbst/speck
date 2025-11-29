---
title: "Speck vs Claude Code Plan Mode"
description: "Understanding when to use Speck's workflow vs Claude Code's built-in Plan Mode"
category: "reference"
order: 2
tags: ["comparison", "plan-mode", "workflow", "claude-code"]
lastUpdated: 2025-11-29
---

# Speck vs Claude Code Plan Mode

Claude Code includes a built-in Plan Mode for exploring complex tasks. How does it relate to Speck?

**Short answer**: They're complementary. Plan Mode is scratch paper for thinking; Speck is permanent documentation that survives.

## Quick Comparison

| Aspect | Plan Mode | Speck |
|--------|-----------|-------|
| **Output location** | `~/.claude/plans/*.md` | `specs/NNN-feature/` in your repo |
| **Visibility** | Personal (not in git) | Team (committed to repo) |
| **Structure** | Freeform markdown | Templated (spec → plan → tasks) |
| **Persistence** | Session-focused | Multi-session/multi-day |
| **Purpose** | Exploration & thinking | Documentation & tracking |

## When to Use Each

### Use Plan Mode when:

- Exploring a complex problem before committing to an approach
- One-off investigation or refactoring
- You need to think through something but won't revisit later
- Making architectural decisions within a single session
- You're not sure what you're building yet

### Use Speck when:

- Building a feature that spans multiple sessions
- You want requirements documented before coding
- Team needs visibility into what's being built
- You want trackable progress (tasks with checkboxes)
- Feature might be handed off or revisited later
- You need separation of concerns (requirements vs design vs tasks)

## Using Them Together

A typical flow might combine both:

1. **Plan Mode** → Explore the problem, understand constraints
2. `/speck.specify` → Capture what you learned as a formal spec
3. `/speck.plan` → Document the technical approach
4. `/speck.tasks` → Break into trackable tasks
5. `/speck.implement` → Execute with Claude's help

**Example scenario**: You're asked to "add caching to the API."

- **Plan Mode first**: Explore options (Redis vs in-memory vs file-based), understand current architecture, identify constraints
- **Then Speck**: Once you know what you're building, capture it in `spec.md` so it's documented and trackable

## Key Differences

### Persistence

| | Plan Mode | Speck |
|-|-----------|-------|
| **Where** | `~/.claude/plans/` (outside project) | `specs/` directory (in your repo) |
| **Git** | Not tracked | Committed to version control |
| **Lifespan** | Temporary reference | Permanent documentation |

Plan Mode plans are useful during exploration but live outside your project. Speck artifacts become part of your codebase history.

### Collaboration

| | Plan Mode | Speck |
|-|-----------|-------|
| **Audience** | Just you | Your team |
| **Review** | N/A | Visible in PRs |
| **Handoff** | Manual copy/paste | Specs live in repo |

When someone joins your project or reviews your PR, they can read your Speck specs to understand what's being built and why.

### Structure

| | Plan Mode | Speck |
|-|-----------|-------|
| **Format** | Write whatever helps you think | Templated sections |
| **Completeness** | Up to you | Templates ensure nothing forgotten |
| **Consistency** | Varies | Same structure across all features |

Speck's templates enforce a structure: requirements → design → tasks. This ensures you think through all aspects before coding.

### Workflow Integration

| | Plan Mode | Speck |
|-|-----------|-------|
| **Commands** | Built-in (enter via prompt) | `/speck.specify`, `/speck.plan`, etc. |
| **Automation** | Manual execution | `/speck.implement` executes tasks |
| **Validation** | None | `/speck.analyze` checks consistency |

## Decision Guide

```
Do you need this documented for others?
├── Yes → Use Speck
└── No
    └── Will you revisit this across multiple sessions?
        ├── Yes → Use Speck
        └── No
            └── Is this exploratory/uncertain?
                ├── Yes → Use Plan Mode
                └── No → Just code it
```

## Common Patterns

### Pattern 1: Plan Mode → Speck

Start with exploration, graduate to documentation:

```
[Plan Mode] "What's the best approach for real-time updates?"
  ↓ explores WebSockets vs SSE vs polling
  ↓ identifies constraints and trade-offs

[/speck.specify] "Add real-time notifications using WebSockets"
  ↓ formal requirements captured
  ↓ team can review approach
```

### Pattern 2: Speck Only

When requirements are clear from the start:

```
[/speck.specify] "Add dark mode toggle with system preference detection"
  ↓ requirements are straightforward
  ↓ no exploration needed
```

### Pattern 3: Plan Mode Only

When you won't need the documentation:

```
[Plan Mode] "Investigate why tests are slow on CI"
  ↓ one-off investigation
  ↓ findings applied immediately
  ↓ no need for permanent documentation
```

## Summary

| Use Case | Recommendation |
|----------|----------------|
| "I need to think through options" | Plan Mode |
| "I know what to build, need to document it" | Speck |
| "My team needs visibility" | Speck |
| "Quick one-off investigation" | Plan Mode |
| "Feature spanning multiple days" | Speck |
| "Exploring before committing" | Plan Mode, then Speck |

They complement each other: Plan Mode for the messy thinking phase, Speck for the structured documentation phase.

---

## See Also

- [Three-Phase Workflow](/docs/core-concepts/workflow) - Speck's specify → plan → implement cycle
- [Quick Start Guide](/docs/getting-started/quick-start) - Get started with Speck
- [Speck vs Spec-Kit](/comparison) - Comparison with GitHub's spec-kit
