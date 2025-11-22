---
title: "Commands Reference"
description: "Complete reference for all Speck slash commands and skill"
category: "commands"
order: 1
lastUpdated: 2025-11-22
tags: ["commands", "reference", "cli", "skill"]
---

# Commands Reference

Speck provides slash commands and a natural language skill for Claude Code. Use commands for actions, and the skill for questions and understanding.

---

## Speck Skill

### Overview

The Speck skill lets you ask questions naturally to explore and understand your feature specs, plans, and tasks. Instead of reading files directly, ask Speck!

### When to Use the Skill

Use the skill for:
- **Exploring specifications**: Understanding what's defined
- **Querying plans**: Checking technical approach and architecture
- **Tracking tasks**: Seeing what's pending or completed
- **Workflow guidance**: Knowing what to do next
- **Requirement checks**: Validating feature scope

### Invocation

Simply type your question naturally in Claude Code conversation:

```
What user stories are in this spec?
```

No special syntax required - just ask!

### Capabilities

1. **Understanding Spec Structure**
   - Read and explain specifications
   - List user stories and requirements
   - Show success criteria

2. **Querying Plan Details**
   - Explain technical approach
   - List dependencies and tech stack
   - Show architecture decisions

3. **Checking Task Status**
   - List pending tasks
   - Show task dependencies
   - Track implementation progress

4. **Explaining Workflow Phases**
   - Guide you through specify → plan → implement
   - Suggest next steps

5. **Answering Requirement Questions**
   - Validate scope
   - Check acceptance criteria
   - Identify gaps

### Example Queries

1. **Understanding**: "What does this spec define?"
2. **Planning**: "What's the technical approach in the plan?"
3. **Tasks**: "What tasks are pending?"
4. **Workflow**: "What phase am I in the Speck workflow?"
5. **Requirements**: "List all functional requirements for this feature"

### Skill vs Slash Commands Comparison

| Use Case | Skill (Ask) | Slash Command (Execute) |
|----------|-------------|-------------------------|
| Understand existing spec | ✅ "What user stories are defined?" | ❌ |
| Create new spec | ❌ | ✅ `/speck.specify` |
| Check task status | ✅ "What tasks are pending?" | ❌ |
| Generate plan | ❌ | ✅ `/speck.plan` |
| Get workflow help | ✅ "What should I do next?" | ❌ |
| Execute tasks | ❌ | ✅ `/speck.implement` |

**Rule of thumb**: Skill for questions and exploration, commands for generation and execution.

---

## Installation and Updates

### Installing Speck Plugin

1. In Claude Code, type: `/plugin`
2. Select "Manage marketplaces"
3. Select "Add marketplace"
4. Enter: `speck-market`
5. Select "speck" from the plugin list
6. Select "Install"

See the [Installation Guide](/docs/getting-started/installation) for detailed instructions.

### Updating Speck

Keep Speck up to date with the latest features:

1. In Claude Code, type: `/plugin`
2. Select "Manage marketplaces"
3. Select "speck-market"
4. Select "Update marketplace"
5. Wait for update to complete

**Recommended**: Check for updates monthly or when new features are announced.

---

## Core Commands

### `/speck.specify`

Create or update a feature specification from natural language input.

**Usage:**
```
/speck.specify [feature description]
```

**What it does:**
- Prompts you to describe your feature in plain English
- Generates a structured `spec.md` file with user stories, requirements, and success criteria
- Creates the feature directory structure in `specs/###-feature-name/`
- Ensures specifications are technology-agnostic and stakeholder-friendly

**Example:**
```
/speck.specify Add a dark mode toggle to the application settings
```

**Output:** `specs/001-dark-mode-toggle/spec.md`

---

### `/speck.clarify`

Identify underspecified areas in your specification by asking targeted clarification questions.

**Usage:**
```
/speck.clarify
```

**Prerequisites:**
- Must have an active specification (`spec.md`)

**What it does:**
- Analyzes the current specification for ambiguities
- Asks up to 5 highly targeted questions
- Encodes answers back into the spec
- Ensures requirements are testable and unambiguous

**Example Questions:**
- "Should dark mode persist across sessions, or reset on app restart?"
- "Which components should support dark mode in the initial release?"
- "What color palette should we use for dark mode (specify hex codes or design system references)?"

---

### `/speck.plan`

Generate a detailed implementation plan with technical design, research, and contracts.

**Usage:**
```
/speck.plan
```

**Prerequisites:**
- Must have a clarified specification

**What it does:**
- Creates `plan.md` with tech stack, architecture, and file structure
- Generates `research.md` with technical decisions and alternatives
- Produces `data-model.md` (if applicable) with schemas and relationships
- Creates `contracts/` directory with API specifications
- Generates `quickstart.md` for developer onboarding

**Outputs:**
- `specs/###-feature/plan.md`
- `specs/###-feature/research.md`
- `specs/###-feature/data-model.md` (optional)
- `specs/###-feature/contracts/` (optional)
- `specs/###-feature/quickstart.md`

---

### `/speck.tasks`

Generate a dependency-ordered task breakdown from your implementation plan.

**Usage:**
```
/speck.tasks
```

**Prerequisites:**
- Must have a completed plan (`plan.md`)

**What it does:**
- Breaks down the implementation into concrete, actionable tasks
- Organizes tasks by dependency order and user story
- Marks parallelizable tasks with `[P]` flag
- Includes test tasks if testing is specified
- Creates checkpoints for validation

**Output:** `specs/###-feature/tasks.md`

---

### `/speck.implement`

Execute the implementation plan by processing all tasks in dependency order.

**Usage:**
```
/speck.implement
```

**Prerequisites:**
- Must have a task breakdown (`tasks.md`)

**What it does:**
- Validates checklist completion (if checklists exist)
- Executes tasks phase-by-phase
- Respects task dependencies and parallel markers
- Creates ignore files (.gitignore, .dockerignore, etc.)
- Marks completed tasks with `[X]`
- Reports progress after each phase

**Execution Flow:**
1. Check checklists (if any)
2. Set up project structure
3. Implement features by user story
4. Handle edge cases
5. Run tests and validation
6. Deploy (if configured)

---

## Multi-Repo Commands

### `/speck.link`

Link a child repository to a multi-repo specification root.

**Usage:**
```
/speck.link
```

**What it does:**
- Creates a symlink from child repo to root repo's `specs/` directory
- Enables automatic multi-repo detection via symlink presence
- Allows child repos to reference and implement shared specifications
- Supports both microservices and monorepo architectures

**Multi-Repo Structure:**
```
root-repo/
└── specs/            # Shared specifications
    └── 001-auth/

child-repo-1/         # Frontend
└── specs/            # Symlink → root-repo/specs/

child-repo-2/         # Backend
└── specs/            # Symlink → root-repo/specs/
```

**When to Use:**
- Coordinating features across frontend/backend repositories
- Managing monorepo workspace projects
- Sharing specifications across microservices
- Implementing cross-repo features

**See Also:**
- [Multi-Repo Support](/docs/advanced-features/multi-repo-support)
- [Multi-Repo Workflow Example](/docs/examples/multi-repo-workflow)

---

## Stacked PR Commands

### `/speck.branch create`

Create a new stacked branch with dependency tracking.

**Usage:**
```
/speck.branch create <branch-name> --base <parent-branch>
```

**Arguments:**
- `<branch-name>`: Name for the new branch
- `--base <parent-branch>`: Parent branch for dependency tracking (optional, defaults to current branch)

**What it does:**
- Creates a new git branch
- Records branch dependency in `.speck/branches.json`
- Tracks PR metadata (base, title, description, status)
- Enables stacked PR workflows for large features

**Example:**
```
# Start feature
git checkout -b username/auth-feature

# Create first stack
/speck.branch create username/auth-models --base username/auth-feature

# Create second stack (depends on first)
/speck.branch create username/auth-routes --base username/auth-models
```

---

### `/speck.branch list`

List all stacked branches with dependency information.

**Usage:**
```
/speck.branch list [--all]
```

**Flags:**
- `--all`: Show all branches including merged/closed

**What it does:**
- Displays branch dependency tree
- Shows PR status for each branch
- Highlights current branch
- Indicates merge state

**Example Output:**
```
username/auth-feature (base: main)
├── username/auth-models (PR #123, merged)
└── username/auth-routes (PR #124, open)
```

---

### `/speck.branch status`

Show status of all stacked branches.

**Usage:**
```
/speck.branch status [--all]
```

**Flags:**
- `--all`: Include all repositories in multi-repo mode

**What it does:**
- Checks PR status for each branch
- Validates branch dependencies
- Shows merge conflicts
- Reports CI/check status

---

## Utility Commands

### `/speck.constitution`

Create or update the project's constitutional principles.

**Usage:**
```
/speck.constitution
```

**What it does:**
- Interactively collects project principles (simplicity, performance, cost, maintainability)
- Creates `.specify/memory/constitution.md`
- Ensures all features adhere to established constraints
- Syncs dependent templates to match constitution

**Example Principles:**
- "Prefer static over dynamic"
- "Performance budgets: <2s FCP, 95+ Lighthouse"
- "Monthly cost <$50"

---

### `/speck.checklist`

Generate a custom checklist for validating the current feature specification.

**Usage:**
```
/speck.checklist
```

**What it does:**
- Creates feature-specific validation checklist
- Covers content quality, requirement completeness, and feature readiness
- Saves to `specs/###-feature/checklists/`

**Output:** `specs/###-feature/checklists/requirements.md`

---

### `/speck.analyze`

Perform cross-artifact consistency analysis across spec, plan, and tasks.

**Usage:**
```
/speck.analyze
```

**Prerequisites:**
- Must have tasks generated

**What it does:**
- Checks for inconsistencies between spec.md, plan.md, and tasks.md
- Validates task coverage of all requirements
- Identifies orphaned tasks or missing implementations
- Non-destructive (read-only analysis)

**Reports:**
- Requirement → Task mapping
- Missing task coverage
- Inconsistent success criteria
- Orphaned or duplicate tasks

---

## Workflow Example

Here's a typical workflow using Speck commands:

```bash
# 1. Create specification
/speck.specify

# Describe your feature in plain English
> "Add a user profile page with avatar upload, bio editing, and privacy settings"

# 2. Clarify ambiguities
/speck.clarify

# Answer questions about edge cases, scope, and requirements
> "Avatar size limit: 5MB"
> "Supported formats: JPG, PNG, WebP"
> "Privacy settings: public, friends-only, private"

# 3. Generate implementation plan
/speck.plan

# Review research.md, data-model.md, contracts/, quickstart.md

# 4. Generate task breakdown
/speck.tasks

# Review tasks.md for dependency order and parallel opportunities

# 5. Execute implementation
/speck.implement

# Tasks execute automatically, respecting dependencies

# 6. Validate quality (optional)
/speck.analyze

# Check for spec/plan/task inconsistencies
```

## Command Flags and Options

Most Speck commands run interactively and don't require flags. However, you can pass arguments inline:

```bash
# Inline feature description
/speck.specify Add dark mode toggle

# Skip interactive prompts (use defaults)
/speck.plan --yes

# Force regeneration (overwrite existing files)
/speck.tasks --force
```

## Getting Help

For detailed help on any command:

```bash
/speck.help [command]
```

Or visit the [Concepts documentation](/docs/concepts/workflow) to understand the three-phase workflow.

## See Also

- [Quick Start Guide](/docs/getting-started/quick-start) - Installation and first command
- [Workflow Concepts](/docs/concepts/workflow) - Understanding the specify → plan → implement cycle
- [First Feature Example](/docs/examples/first-feature) - Complete walkthrough
