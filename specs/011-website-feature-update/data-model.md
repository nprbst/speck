# Data Model: Website Content Structure

**Feature**: 011-website-feature-update
**Date**: 2025-11-22
**Purpose**: Define content entities, relationships, and validation rules for website documentation

---

## Overview

This data model describes the structural entities for Speck website documentation. These entities exist independently of implementation technology (Astro, React, etc.) and define the content layer.

---

## Key Entities

### 1. Documentation Page

**Definition**: A single documentation page containing instructional content, conceptual explanations, or reference material.

**Fields**:

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `title` | string | Yes | 3-80 characters | Page title shown in navigation and browser tab |
| `description` | string | Yes | 50-160 characters | Meta description for SEO and previews (1-2 sentences) |
| `category` | enum | Yes | See Category enum below | Primary navigation section |
| `audience` | array<enum> | Yes | Min 1 value, see Audience enum | Target user personas |
| `prerequisites` | array<string> | No | Valid page paths | Links to prerequisite pages (e.g., "/docs/installation") |
| `tags` | array<string> | Yes | Min 1, max 10 tags | Search keywords (e.g., "multi-repo", "stacked-pr") |
| `lastUpdated` | date | Yes | ISO 8601 format | Date of last content update (YYYY-MM-DD) |
| `relatedPages` | array<string> | No | Valid page paths | Cross-references to related documentation |
| `estimatedDuration` | string | No | Format: "N minutes" | For example/tutorial pages only |

**Category Enum**:
- `getting-started` - Installation, quickstart guides
- `core-concepts` - Workflow, specifications, fundamental concepts
- `advanced-features` - Multi-repo support, stacked PRs, monorepos
- `architecture` - Virtual commands, hooks, performance internals
- `examples` - Step-by-step walkthroughs with code
- `reference` - Capability matrices, command references

**Audience Enum**:
- `new-users` - First-time visitors evaluating Speck
- `existing-users` - Current users discovering new features
- `evaluators` - Team leads assessing enterprise fit
- `all` - Universal content (installation, core workflow)

**Relationships**:
- **Navigation Node**: Each Documentation Page belongs to exactly one Navigation Node
- **Capability Feature**: Documentation Pages reference zero or more Capability Features (via examples or explanations)
- **Example Workflow**: Tutorial-type pages contain one or more Example Workflows

**State Transitions**: N/A (documentation pages are stateless)

**Example**:
```yaml
title: "Multi-Repo Setup"
description: "Configure Speck for multi-repository projects using symlink-based detection and shared specifications."
category: advanced-features
audience: [existing-users, evaluators]
prerequisites: ["/docs/getting-started/installation", "/docs/core-concepts/workflow"]
tags: ["multi-repo", "symlinks", "speck.link", "setup"]
lastUpdated: 2025-11-22
relatedPages: ["/docs/advanced-features/monorepos", "/docs/examples/multi-repo-workflow"]
```

---

### 2. Navigation Node

**Definition**: A node in the website's navigation hierarchy, representing either a section (container) or a page (leaf).

**Fields**:

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `label` | string | Yes | 3-30 characters | Display text in navigation menu |
| `path` | string | No | Valid URL path or null for sections | Null for sections, URL for pages |
| `children` | array<NavigationNode> | No | Max depth 2 levels | Nested navigation nodes |
| `order` | number | Yes | Positive integer | Sort order within parent (ascending) |
| `icon` | string | No | Icon identifier | Optional icon for visual hierarchy |
| `type` | enum | Yes | `section` or `page` | Node type |

**Type Enum**:
- `section` - Container with children (e.g., "Getting Started")
- `page` - Leaf node linking to Documentation Page

**Relationships**:
- **Documentation Page**: Page-type nodes reference exactly one Documentation Page via `path`
- **Navigation Node** (self): Section-type nodes contain zero or more child Navigation Nodes

**Validation Rules**:
- Maximum navigation depth: 2 levels (Homepage → Section → Page)
- Section nodes MUST have `type: section` and `path: null`
- Page nodes MUST have `type: page` and valid `path`
- No orphan nodes (all nodes except root must have parent)
- No duplicate `path` values across all page nodes

**Example**:
```yaml
# Section node
label: "Advanced Features"
path: null
type: section
order: 3
children:
  - label: "Multi-Repo Support"
    path: "/docs/advanced-features/multi-repo-support"
    type: page
    order: 1
  - label: "Stacked PRs"
    path: "/docs/advanced-features/stacked-prs"
    type: page
    order: 2
```

---

### 3. Capability Feature

**Definition**: A discrete feature or capability of Speck that varies in support across repository modes and workflow modes.

**Fields**:

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `name` | string | Yes | 3-50 characters | Feature name (e.g., "Stacked PRs") |
| `repositoryModes` | object | Yes | See Repository Modes below | Support status per repository mode |
| `workflowModes` | object | No | See Workflow Modes below | Support status per workflow mode (if applicable) |
| `limitations` | array<string> | No | Max 200 chars per item | Known limitations or edge cases |
| `introducedInSpec` | string | Yes | Format: "NNN-spec-name" | Originating specification (e.g., "007-multi-repo-support") |

**Repository Modes Object**:
```yaml
singleRepo:
  status: enum (supported | not-supported | partial)
  note: string (optional explanation)
multiRepoRoot:
  status: enum (supported | not-supported | partial)
  note: string (optional explanation)
multiRepoChild:
  status: enum (supported | not-supported | partial)
  note: string (optional explanation)
```

**Workflow Modes Object** (optional, for features like stacked PRs):
```yaml
singleBranch:
  status: enum (supported | not-supported | partial)
  note: string (optional explanation)
stackedPR:
  status: enum (supported | not-supported | partial)
  note: string (optional explanation)
```

**Status Enum**:
- `supported` - Fully functional (✅ in capability matrix)
- `not-supported` - Not available (❌ in capability matrix)
- `partial` - Limited support with documented constraints (⚠️ in capability matrix)

**Relationships**:
- **Documentation Page**: Capability Features are documented in one or more Documentation Pages

**Validation Rules**:
- All repository modes MUST have status defined (cannot be null)
- If `status: partial`, `note` field is REQUIRED
- `introducedInSpec` MUST reference existing specification

**Example**:
```yaml
name: "Stacked PRs"
repositoryModes:
  singleRepo:
    status: supported
  multiRepoRoot:
    status: supported
  multiRepoChild:
    status: supported
    note: "Added in spec 009 - independent stacks per child repo"
limitations:
  - "No cross-repo branch dependencies"
  - "Each child repo maintains separate .speck/branches.json"
introducedInSpec: "008-stacked-pr-support"
```

---

### 4. Example Workflow

**Definition**: A step-by-step tutorial demonstrating a specific Speck workflow or feature usage pattern.

**Fields**:

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `name` | string | Yes | 3-80 characters | Workflow name (e.g., "Multi-Repo Feature Development") |
| `durationEstimate` | string | Yes | Format: "N minutes" or "N-M minutes" | Expected completion time |
| `prerequisites` | array<string> | Yes | Min 1, valid page paths or setup steps | Required setup (e.g., "Claude Code installed") |
| `steps` | array<Step> | Yes | Min 3 steps | Sequential workflow steps |
| `successCriteria` | array<string> | Yes | Min 1 criterion | Observable outcomes proving success |
| `difficulty` | enum | Yes | `beginner`, `intermediate`, `advanced` | Skill level required |
| `features` | array<string> | Yes | Min 1, valid Capability Feature names | Features demonstrated in workflow |

**Step Object**:
```yaml
title: string (required, 5-80 characters)
description: string (required, 1-3 sentences explaining step purpose)
codeSample: string (optional, code block with syntax highlighting)
expectedOutput: string (optional, what users should see)
troubleshooting: string (optional, common issues and fixes)
```

**Difficulty Enum**:
- `beginner` - Requires no prior Speck experience
- `intermediate` - Assumes familiarity with basic workflow
- `advanced` - Requires understanding of multiple features

**Relationships**:
- **Documentation Page**: Example Workflows are embedded in Documentation Pages with `category: examples`
- **Capability Feature**: Example Workflows demonstrate one or more Capability Features

**Validation Rules**:
- Steps MUST be sequential (order matters)
- At least one step MUST include `codeSample`
- `successCriteria` MUST be objectively verifiable (no subjective measures)
- Total workflow should align with `durationEstimate` (rough guideline: 2-3 minutes per step)

**Example**:
```yaml
name: "Multi-Repo Feature Development"
durationEstimate: "10-15 minutes"
prerequisites:
  - "Claude Code 2.0+ installed"
  - "Two git repositories (e.g., frontend and backend)"
  - "Speck plugin installed"
difficulty: intermediate
features: ["Multi-Repo Support", "Shared Specs"]
steps:
  - title: "Create shared specification directory"
    description: "Set up the root specification directory that will be shared across child repositories."
    codeSample: |
      # From your workspace root
      mkdir shared-specs
      cd shared-specs
      /speck.specify "User authentication with JWT tokens"
  - title: "Link child repository to shared specs"
    description: "Establish symlink from child repo to shared specification root."
    codeSample: |
      cd ../frontend-repo
      /speck.link ../shared-specs
    expectedOutput: |
      ✓ Created .speck/root symlink
      ✓ Multi-repo detection enabled
  - title: "Generate per-repo implementation plan"
    description: "Create frontend-specific plan from shared specification."
    codeSample: |
      /speck.plan
    expectedOutput: |
      Generated plan at specs/001-user-auth/plan.md
      Reading from shared spec at ../shared-specs/specs/001-user-auth/spec.md
successCriteria:
  - "Shared spec.md visible from child repo via symlink"
  - "Child repo generates independent plan.md"
  - "/speck.env shows multi-repo mode active"
```

---

## Entity Relationships Diagram

```
Documentation Page (1) ←→ (1) Navigation Node
      ↓
      references (0..*)
      ↓
Capability Feature

Documentation Page (1) ←→ (0..*) Example Workflow
      ↑
      demonstrates
      ↑
Capability Feature (1) ←→ (0..*) Example Workflow
```

**Key Relationships**:
1. Each Documentation Page corresponds to one Navigation Node (page-type)
2. Documentation Pages can reference multiple Capability Features
3. Example Workflows are embedded in Documentation Pages (examples category)
4. Example Workflows demonstrate one or more Capability Features

---

## Validation Summary

**Cross-Entity Validation**:

1. **Navigation Depth**: Sum of Navigation Node nesting MUST NOT exceed 2 levels
2. **Prerequisite Integrity**: All `prerequisites` paths MUST resolve to existing Documentation Pages
3. **Feature Coverage**: All Capability Features MUST be documented in at least one Documentation Page
4. **Example Completeness**: Each Example Workflow MUST demonstrate at least one Capability Feature

**Content Consistency**:

1. **Spec Alignment**: Capability Features with `introducedInSpec` MUST align with actual spec content (verified during review)
2. **Audience Targeting**: Documentation Pages with `audience: new-users` MUST NOT assume prior Speck knowledge
3. **Tag Consistency**: Tags should be lowercase kebab-case (e.g., "multi-repo", not "Multi-Repo")

---

## Usage Guidelines

### For Content Authors

1. **Creating New Documentation Pages**:
   - Define frontmatter following Documentation Page schema
   - Choose category based on content purpose (tutorial → examples, concept → core-concepts)
   - Target specific audience (avoid `all` unless truly universal)
   - Include prerequisites if page assumes prior knowledge

2. **Adding Example Workflows**:
   - Estimate duration realistically (test with fresh user)
   - Include troubleshooting for common issues
   - Provide exact command syntax in code samples
   - Define observable success criteria

3. **Updating Capability Matrix**:
   - Add new Capability Feature entity for each distinct feature
   - Document limitations upfront (avoid surprises)
   - Reference originating specification for traceability

### For Implementation

This data model is technology-agnostic. Implementation choices (Astro, React, Vue, etc.) should:
- Validate frontmatter against Documentation Page schema at build time
- Generate Navigation Nodes programmatically from content directory structure
- Render Capability Features as comparison tables
- Present Example Workflows with interactive code blocks

---

**Data Model Version**: 1.0
**Last Updated**: 2025-11-22
