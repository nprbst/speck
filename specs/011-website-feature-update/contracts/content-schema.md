# Contract: Content Schema

**Feature**: 011-website-feature-update
**Date**: 2025-11-22
**Purpose**: Define markdown frontmatter YAML structure for all documentation pages

---

## Overview

This contract specifies the exact frontmatter schema for documentation markdown files. All new and updated pages MUST include this frontmatter block at the top of the file.

---

## Frontmatter Structure

### Complete Schema

```yaml
---
title: string                    # REQUIRED: Page title (3-80 characters)
description: string              # REQUIRED: Meta description (50-160 characters, 1-2 sentences)
category: enum                   # REQUIRED: Navigation category (see Category Enum below)
audience: array<enum>            # REQUIRED: Target personas (min 1, see Audience Enum below)
prerequisites: array<string>     # OPTIONAL: Links to prerequisite pages
tags: array<string>              # REQUIRED: Search keywords (min 1, max 10)
lastUpdated: date                # REQUIRED: ISO 8601 date (YYYY-MM-DD)
relatedPages: array<string>      # OPTIONAL: Cross-references
estimatedDuration: string        # OPTIONAL: For examples only ("N minutes" or "N-M minutes")
difficulty: enum                 # OPTIONAL: For examples only (beginner | intermediate | advanced)
---
```

---

## Field Specifications

### `title`

- **Type**: String
- **Required**: Yes
- **Validation**: 3-80 characters
- **Format**: Title case, no trailing punctuation
- **Examples**:
  - ✅ "Multi-Repo Setup"
  - ✅ "Getting Started with Stacked PRs"
  - ❌ "multi-repo setup" (not title case)
  - ❌ "Multi-Repo Setup." (trailing period)

### `description`

- **Type**: String
- **Required**: Yes
- **Validation**: 50-160 characters, 1-2 complete sentences
- **Purpose**: SEO meta description, preview text, social sharing
- **Format**: Plain text, no markdown
- **Examples**:
  - ✅ "Configure Speck for multi-repository projects using symlink-based detection and shared specifications."
  - ✅ "Learn how to break large features into reviewable chunks with stacked PRs."
  - ❌ "Configure Speck" (too short, under 50 characters)
  - ❌ "This page explains how to configure Speck for multi-repository projects, including..." (too long, over 160 characters)

### `category`

- **Type**: Enum
- **Required**: Yes
- **Valid Values**:
  - `getting-started` - Installation guides, quickstart tutorials
  - `core-concepts` - Workflow fundamentals, specifications, planning
  - `advanced-features` - Multi-repo support, stacked PRs, monorepos
  - `architecture` - Virtual commands, hooks, performance internals
  - `examples` - Step-by-step walkthroughs with code samples
  - `reference` - Capability matrices, command syntax references
- **Examples**:
  - ✅ `category: advanced-features`
  - ❌ `category: Advanced Features` (use kebab-case enum value)

### `audience`

- **Type**: Array of enums
- **Required**: Yes
- **Validation**: Minimum 1 value, maximum 4 values (all enums)
- **Valid Values**:
  - `new-users` - First-time visitors evaluating Speck
  - `existing-users` - Current users discovering new features
  - `evaluators` - Team leads assessing enterprise fit
  - `all` - Universal content (rare, typically installation or core workflow)
- **Examples**:
  - ✅ `audience: [existing-users, evaluators]`
  - ✅ `audience: [all]`
  - ❌ `audience: []` (minimum 1 required)
  - ❌ `audience: new-users` (must be array, even for single value)

### `prerequisites`

- **Type**: Array of strings (page paths)
- **Required**: No
- **Validation**: Each path MUST resolve to existing documentation page
- **Format**: Relative paths from `/docs/` root
- **Examples**:
  - ✅ `prerequisites: ["/docs/getting-started/installation", "/docs/core-concepts/workflow"]`
  - ✅ `prerequisites: []` (or omit field entirely)
  - ❌ `prerequisites: ["Installation Guide"]` (must be paths, not titles)

### `tags`

- **Type**: Array of strings
- **Required**: Yes
- **Validation**: Minimum 1 tag, maximum 10 tags
- **Format**: Lowercase kebab-case
- **Purpose**: Search indexing, content discovery, related content
- **Examples**:
  - ✅ `tags: ["multi-repo", "symlinks", "speck.link", "setup"]`
  - ✅ `tags: ["stacked-pr", "graphite", "branch-management"]`
  - ❌ `tags: ["Multi-Repo", "Stacked PR"]` (use kebab-case)
  - ❌ `tags: []` (minimum 1 required)

### `lastUpdated`

- **Type**: Date (ISO 8601)
- **Required**: Yes
- **Format**: YYYY-MM-DD
- **Examples**:
  - ✅ `lastUpdated: 2025-11-22`
  - ❌ `lastUpdated: "November 22, 2025"` (wrong format)
  - ❌ `lastUpdated: 11/22/2025` (wrong format)

### `relatedPages`

- **Type**: Array of strings (page paths)
- **Required**: No
- **Validation**: Each path MUST resolve to existing documentation page
- **Format**: Relative paths from `/docs/` root
- **Purpose**: Cross-linking for content discovery
- **Examples**:
  - ✅ `relatedPages: ["/docs/advanced-features/monorepos", "/docs/examples/multi-repo-workflow"]`
  - ✅ Omit field if no related pages

### `estimatedDuration`

- **Type**: String
- **Required**: No (only for `category: examples` pages)
- **Format**: "N minutes" or "N-M minutes"
- **Validation**: For example/tutorial pages only
- **Examples**:
  - ✅ `estimatedDuration: "10 minutes"`
  - ✅ `estimatedDuration: "10-15 minutes"`
  - ❌ `estimatedDuration: "10"` (missing "minutes")

### `difficulty`

- **Type**: Enum
- **Required**: No (only for `category: examples` pages)
- **Valid Values**:
  - `beginner` - No prior Speck experience required
  - `intermediate` - Assumes basic workflow familiarity
  - `advanced` - Requires understanding of multiple features
- **Examples**:
  - ✅ `difficulty: intermediate`
  - ❌ `difficulty: easy` (use `beginner` instead)

---

## Complete Examples

### Example 1: Advanced Features Page

```yaml
---
title: "Multi-Repo Setup"
description: "Configure Speck for multi-repository projects using symlink-based detection and shared specifications."
category: advanced-features
audience: [existing-users, evaluators]
prerequisites: ["/docs/getting-started/installation", "/docs/core-concepts/workflow"]
tags: ["multi-repo", "symlinks", "speck.link", "setup"]
lastUpdated: 2025-11-22
relatedPages: ["/docs/advanced-features/monorepos", "/docs/examples/multi-repo-workflow"]
---
```

### Example 2: Example/Tutorial Page

```yaml
---
title: "Multi-Repo Workflow Tutorial"
description: "Learn how to coordinate feature development across frontend and backend repositories using Speck's multi-repo support."
category: examples
audience: [existing-users]
prerequisites: ["/docs/advanced-features/multi-repo-support", "/docs/getting-started/quick-start"]
tags: ["multi-repo", "tutorial", "frontend", "backend", "workflow"]
lastUpdated: 2025-11-22
estimatedDuration: "10-15 minutes"
difficulty: intermediate
relatedPages: ["/docs/examples/monorepo-workflow"]
---
```

### Example 3: Core Concepts Page

```yaml
---
title: "Multi-Repo Concepts"
description: "Understand how Speck detects multi-repo contexts, manages shared specifications, and coordinates implementations across repositories."
category: core-concepts
audience: [existing-users, evaluators]
prerequisites: ["/docs/core-concepts/workflow"]
tags: ["multi-repo", "concepts", "symlinks", "architecture"]
lastUpdated: 2025-11-22
relatedPages: ["/docs/advanced-features/multi-repo-support", "/docs/core-concepts/stacked-pr-workflows"]
---
```

### Example 4: Reference Page

```yaml
---
title: "Capability Matrix"
description: "Feature compatibility reference showing which Speck capabilities are supported across single-repo, multi-repo root, and multi-repo child contexts."
category: reference
audience: [all]
tags: ["reference", "compatibility", "multi-repo", "stacked-pr", "features"]
lastUpdated: 2025-11-22
---
```

---

## Validation Rules

### Build-Time Validation

Implementation MUST validate frontmatter during build process and FAIL on:

1. **Missing required fields**: `title`, `description`, `category`, `audience`, `tags`, `lastUpdated`
2. **Invalid enum values**: Category or audience not in defined enums
3. **Length violations**: Title, description outside character limits
4. **Broken references**: Prerequisites or relatedPages pointing to non-existent pages
5. **Tag constraints**: Fewer than 1 or more than 10 tags
6. **Example page requirements**: `category: examples` without `estimatedDuration` or `difficulty`

### Content Review Validation

Manual review SHOULD check:

1. **Description quality**: Does it accurately summarize page content?
2. **Audience targeting**: Is content appropriate for declared audience?
3. **Tag relevance**: Do tags match actual page content?
4. **Prerequisites accuracy**: Are listed prerequisites actually required?
5. **Date freshness**: Is `lastUpdated` current after content changes?

---

## Migration Guide

### Updating Existing Pages (Spec 006 Content)

For pages from spec 006, ADD the following fields if missing:

1. `audience` - Determine based on content (usually `all` for getting-started)
2. `tags` - Extract from content keywords
3. `prerequisites` - Identify prerequisite pages
4. `relatedPages` - Link to related new content (e.g., multi-repo pages reference new multi-repo docs)

**Example Migration**:

```yaml
# BEFORE (spec 006)
---
title: "Quick Start Guide"
description: "Get started with Speck in 10 minutes"
---

# AFTER (spec 011)
---
title: "Quick Start Guide"
description: "Get started with Speck in 10 minutes. Learn plugin installation, create your first specification, and understand the three-phase workflow."
category: getting-started
audience: [new-users, all]
tags: ["quickstart", "installation", "workflow", "tutorial"]
lastUpdated: 2025-11-22
relatedPages: ["/docs/getting-started/installation", "/docs/core-concepts/workflow"]
---
```

---

## Schema Version

**Version**: 1.0
**Last Updated**: 2025-11-22
**Breaking Changes**: N/A (initial version)
