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

Plan Mode and Speck work best in concert - each handling a different phase of feature development.

### The Integrated Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                        EXPLORATION PHASE                        │
│                         (Plan Mode)                             │
├─────────────────────────────────────────────────────────────────┤
│  "What should we build? What are the options?"                  │
│                                                                 │
│  • Investigate existing codebase                                │
│  • Research technical approaches                                │
│  • Identify constraints and trade-offs                          │
│  • Make architectural decisions                                 │
│                                                                 │
│  Output: ~/.claude/plans/caching-exploration.md                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    Decision point reached
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      DOCUMENTATION PHASE                        │
│                          (Speck)                                │
├─────────────────────────────────────────────────────────────────┤
│  "Here's what we're building and how we'll track it"            │
│                                                                 │
│  /speck.specify → Formal requirements (spec.md)                 │
│  /speck.plan    → Technical design (plan.md)                    │
│  /speck.tasks   → Trackable work items (tasks.md)               │
│  /speck.implement → Automated execution                         │
│                                                                 │
│  Output: specs/042-api-caching/ (committed to repo)             │
└─────────────────────────────────────────────────────────────────┘
```

### Concrete Example: Adding API Caching

**Day 1: Exploration with Plan Mode**

You're asked to "add caching to the API." This is vague - you need to explore first.

```
> Enter Plan Mode

"I need to add caching to our API. Help me explore the options."

Claude explores:
- Current API architecture (finds it's Express + PostgreSQL)
- Existing caching patterns (finds none)
- Options: Redis, in-memory (node-cache), HTTP caching headers
- Constraints: Single server now, but may scale to multiple

Plan Mode output (~/.claude/plans/api-caching.md):
- Recommends Redis for future scalability
- Identifies 3 high-traffic endpoints to cache first
- Notes: need TTL strategy, cache invalidation on writes
```

**Day 1 (continued): Capture Decision with Speck**

Now you know what to build. Capture it formally:

```
> /speck.specify "Add Redis caching to high-traffic API endpoints"

Speck generates specs/042-api-caching/spec.md:
- FR-001: Cache GET /api/products (5 min TTL)
- FR-002: Cache GET /api/categories (1 hour TTL)
- FR-003: Invalidate cache on POST/PUT/DELETE
- Success criteria: 50% reduction in DB queries
```

**Day 2: Continue with Speck**

You return the next day. Plan Mode exploration is still in `~/.claude/plans/` for reference, but your work continues from the Speck spec:

```
> /speck.plan

Generates plan.md with:
- Tech stack: ioredis, Express middleware
- Architecture: Cache-aside pattern
- File changes: src/middleware/cache.ts, src/config/redis.ts

> /speck.tasks

Generates tasks.md:
- [ ] T001: Install ioredis dependency
- [ ] T002: Create Redis connection config
- [ ] T003: Implement cache middleware
- [ ] T004: Add caching to /api/products endpoint
...

> /speck.implement

Executes tasks in order, checking off as completed
```

**The handoff**: Plan Mode helped you decide *what* to build. Speck documents *what you decided* and tracks the implementation.

### Why This Works

| Phase | Tool | What It Provides |
|-------|------|------------------|
| **Exploration** | Plan Mode | Freedom to think without commitment |
| **Decision** | You | Choose approach based on exploration |
| **Documentation** | Speck | Permanent record of requirements |
| **Design** | Speck | Technical approach captured |
| **Execution** | Speck | Trackable, automatable tasks |

### Key Insight: Different Artifacts, Different Purposes

- **Plan Mode plans** (`~/.claude/plans/`): Your thinking process - exploratory, maybe messy, personal
- **Speck specs** (`specs/NNN-feature/`): Your decisions - structured, reviewable, shared

You don't need to copy your Plan Mode exploration into Speck. The exploration served its purpose. Speck captures the *outcome* of that thinking in a format your team can use.

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
| "Exploring before committing" | Plan Mode → Speck |

### The Best of Both Worlds

Use them together for maximum effectiveness:

1. **Plan Mode** handles the messy, exploratory phase where you're figuring things out
2. **Speck** handles the structured, documentation phase where you're building and tracking

Neither replaces the other. Plan Mode gives you freedom to think without commitment. Speck gives you structure to execute without forgetting anything. The handoff point is when you've made a decision and are ready to commit to building something specific.

---

## See Also

- [Three-Phase Workflow](/docs/core-concepts/workflow) - Speck's specify → plan → implement cycle
- [Quick Start Guide](/docs/getting-started/quick-start) - Get started with Speck
- [Speck vs Spec-Kit](/comparison) - Comparison with GitHub's spec-kit
