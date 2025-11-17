---
title: "Three-Phase Workflow"
description: "Understanding Speck's structured specify → plan → implement cycle"
category: "concepts"
order: 1
lastUpdated: 2025-11-16
tags: ["workflow", "concepts", "methodology"]
---

# Three-Phase Workflow

Speck implements an opinionated three-phase workflow designed to keep your feature development organized, documented, and actionable from day one.

## Overview

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   SPECIFY   │  →   │     PLAN    │  →   │  IMPLEMENT  │
└─────────────┘      └─────────────┘      └─────────────┘
     What?                How?               Execute
```

### The Three Phases

1. **Specify**: Define *what* you're building (technology-agnostic, stakeholder-friendly)
2. **Plan**: Design *how* you'll build it (technical stack, architecture, contracts)
3. **Implement**: Execute the plan (dependency-ordered tasks, automated validation)

---

## Phase 1: Specify (What?)

**Goal**: Create a clear, testable feature specification that stakeholders can understand.

### Commands

- `/speck.specify` - Generate initial specification
- `/speck.clarify` - Resolve ambiguities with targeted questions

### Inputs

- Natural language feature description
- Answers to clarification questions

### Outputs

- `spec.md` - Structured specification with:
  - Feature overview and value proposition
  - User stories with acceptance scenarios
  - Functional and non-functional requirements
  - Success criteria (measurable outcomes)
  - Out of scope items
  - Dependencies and assumptions

### Key Principles

**Technology-agnostic**: No mention of specific frameworks, languages, or APIs. Focuses on *what* users need, not *how* it's implemented.

❌ **Bad** (implementation details):
> "Use React hooks with Context API for state management and Tailwind for styling"

✅ **Good** (outcome-focused):
> "Dark mode toggle persists user preference across sessions and applies to all UI components"

**Stakeholder-friendly**: Written in plain English. Non-technical stakeholders should understand the value and scope.

**Testable**: Every requirement has clear acceptance criteria that can be validated.

### Example

```markdown
## FR-001: Dark Mode Toggle

**Requirement**: Application provides a dark mode toggle accessible from settings

**Acceptance Criteria**:
- Toggle is visible in application settings page
- Clicking toggle switches color palette immediately (no page refresh)
- Preference persists across browser sessions
- All UI components render correctly in both light and dark modes

**User Story**: As a user, I want to enable dark mode so that I can reduce eye strain during nighttime use
```

---

## Phase 2: Plan (How?)

**Goal**: Design the technical implementation with architecture, data models, and API contracts.

### Commands

- `/speck.plan` - Generate implementation plan and design artifacts

### Inputs

- Completed and clarified `spec.md`
- Project constitution (optional)

### Outputs

- `plan.md` - Technical summary:
  - Tech stack (languages, frameworks, dependencies)
  - Architecture decisions
  - File structure
  - Performance budgets
  - Testing strategy

- `research.md` - Technical research:
  - Key decisions with rationale
  - Alternatives considered
  - Trade-offs and constraints

- `data-model.md` - (If applicable)
  - Database schemas
  - Entity relationships
  - Validation rules

- `contracts/` - (If applicable)
  - API endpoint specifications
  - Component prop interfaces
  - Build script contracts

- `quickstart.md` - Developer setup:
  - Prerequisites
  - Installation steps
  - First build instructions

### Key Principles

**Technology-specific**: Unlike the spec, the plan is highly technical. Choose specific frameworks, versions, and tools.

**Architecture-first**: Design the system structure before writing code. Identify components, data flow, and integration points.

**Research-driven**: Document *why* you chose certain technologies over alternatives.

**Developer-focused**: The plan is for engineers implementing the feature.

### Example

```markdown
## Technical Context

**Language/Version**: TypeScript 5.3+
**Framework**: React 18.2+ with Vite 4.x
**State Management**: Zustand (lightweight, TypeScript-friendly)
**Styling**: CSS Modules with PostCSS

## Architecture

### Dark Mode Implementation

**Approach**: CSS custom properties with localStorage persistence

**Rationale**:
- No runtime performance cost (CSS-only theme switching)
- Respects system `prefers-color-scheme` by default
- Manual override persists in localStorage
- No flash of unstyled content (FOUC) on page load

**Alternatives Considered**:
- Tailwind dark mode (rejected: larger CSS bundle, added complexity)
- Context API for theme state (rejected: unnecessary re-renders)
```

---

## Phase 3: Implement (Execute)

**Goal**: Execute the plan with dependency-ordered tasks, automated testing, and progress tracking.

### Commands

- `/speck.tasks` - Generate task breakdown
- `/speck.implement` - Execute tasks automatically

### Inputs

- Completed `plan.md`
- All design artifacts (research, contracts, data model)

### Outputs

- `tasks.md` - Dependency-ordered task list:
  - Organized by user story
  - Marked with `[P]` for parallelizable tasks
  - Includes file paths and descriptions
  - Checkpoints for validation

- Implementation files (actual code):
  - Components, services, endpoints
  - Tests (unit, integration, e2e)
  - Configuration files
  - Documentation

### Key Principles

**Dependency-aware**: Tasks execute in correct order. No task runs before its prerequisites are complete.

**Parallel when possible**: Tasks marked `[P]` can run simultaneously (different files, no dependencies).

**Test-driven**: Test tasks execute before implementation tasks (TDD approach).

**Incremental validation**: Checkpoints verify each phase before proceeding.

**Progress tracking**: Mark tasks as complete with `[X]` for visibility.

### Example

```markdown
## Phase 1: Setup

- [ ] T001 Install Zustand state management library
- [ ] T002 [P] Create `styles/theme.css` with CSS custom properties
- [ ] T003 [P] Create `types/theme.ts` with ThemeMode type

## Phase 2: Core Implementation

- [ ] T004 Implement theme store in `stores/themeStore.ts`
- [ ] T005 Implement ThemeToggle component in `components/ThemeToggle.tsx`
- [ ] T006 Add theme initialization script to index.html head (prevent FOUC)

**Checkpoint**: Dark mode toggle works, persists preference, no flash on load
```

---

## Workflow in Practice

### Starting a New Feature

```bash
# 1. Describe what you're building (no tech details!)
/speck.specify

> "Add user profile editing with avatar upload, bio, and privacy settings"

# 2. Clarify edge cases and ambiguities
/speck.clarify

> Q: "Should avatars persist if user deletes their account?"
> A: "No, delete all user data including avatars on account deletion"

# 3. Design the technical implementation
/speck.plan

# Review generated artifacts:
# - plan.md (tech stack, architecture)
# - data-model.md (User schema, avatar storage)
# - contracts/api.ts (PUT /api/users/:id endpoint)
# - quickstart.md (dev setup instructions)

# 4. Generate task breakdown
/speck.tasks

# Review tasks.md for execution order

# 5. Implement automatically
/speck.implement

# Tasks execute in dependency order
# Progress tracked with [X] markers
```

### Iterating on a Feature

If requirements change mid-implementation:

```bash
# Update the specification
/speck.specify

# Re-run planning (updates design artifacts)
/speck.plan --force

# Regenerate tasks (marks new work, preserves completed tasks)
/speck.tasks --force

# Continue implementation from where you left off
/speck.implement
```

---

## Why This Workflow?

### Separation of Concerns

- **Spec** = Business requirements (stakeholders understand this)
- **Plan** = Technical design (engineers use this)
- **Tasks** = Execution steps (automation can handle this)

### Single Source of Truth

All feature documentation lives in `specs/###-feature/`. No scattered Google Docs, Jira tickets, or tribal knowledge.

### Automated Consistency

Running `/speck.analyze` validates that:
- All requirements from spec.md map to tasks in tasks.md
- Technical plan matches specification scope
- No orphaned or duplicate tasks

### Claude Code Optimization

Commands are designed for Claude Code's workflow:
- Slash commands (`/speck.*`) integrate natively
- Natural language inputs (no complex syntax)
- Outputs are markdown (readable, version-controlled)
- Agents can execute tasks automatically (`/speck.implement`)

---

## Common Patterns

### MVP First

Separate MVP from nice-to-haves in the spec:

```markdown
## Scope

**MVP (P1)**:
- User can upload avatar (JPG, PNG, max 5MB)
- User can edit bio (max 500 characters)

**Post-MVP (P2)**:
- Avatar cropping tool
- Bio markdown support
- Profile preview before saving
```

### Incremental User Stories

Break large features into independent user stories:

```markdown
## User Story 1: Avatar Upload (P1 - MVP)
## User Story 2: Bio Editing (P1 - MVP)
## User Story 3: Privacy Settings (P2)
## User Story 4: Profile Sharing (P3)
```

Each user story generates independent tasks that can be implemented separately.

### Test-Driven Tasks

For each feature, define tests first:

```markdown
- [ ] T010 Unit test: Avatar upload validates file size
- [ ] T011 Unit test: Avatar upload validates file type
- [ ] T012 Integration test: Avatar save persists to storage
- [ ] T013 Implement avatar upload service
```

---

## See Also

- [Commands Reference](/docs/commands/reference) - Detailed command syntax
- [First Feature Example](/docs/examples/first-feature) - Complete walkthrough
- [Quick Start Guide](/docs/getting-started/quick-start) - Installation and setup
