# Contract: Navigation Structure

**Feature**: 011-website-feature-update
**Date**: 2025-11-22
**Purpose**: Define website information architecture, sitemap, navigation hierarchy, and breadcrumb patterns

---

## Overview

This contract specifies the complete navigation structure for the Speck website, including the addition of new sections for advanced features and architecture documentation. The structure maintains a maximum depth of 3 clicks from homepage to any page (SC-006 requirement).

---

## Navigation Hierarchy

### Complete Sitemap

```
Homepage (/)
│
├── Getting Started
│   ├── Quick Start Guide              (/docs/getting-started/quick-start)          [EXISTING - UPDATE]
│   └── Installation Guide              (/docs/getting-started/installation)         [EXISTING - PRESERVE]
│
├── Core Concepts
│   ├── Three-Phase Workflow            (/docs/core-concepts/workflow)               [EXISTING - PRESERVE]
│   ├── Multi-Repo Concepts             (/docs/core-concepts/multi-repo)             [NEW]
│   └── Stacked PR Workflows            (/docs/core-concepts/stacked-prs)            [NEW]
│
├── Advanced Features
│   ├── Multi-Repo Setup                (/docs/advanced-features/multi-repo-support) [NEW]
│   ├── Stacked PRs                     (/docs/advanced-features/stacked-prs)        [NEW]
│   └── Monorepo Workspaces             (/docs/advanced-features/monorepos)          [NEW]
│
├── Architecture
│   ├── Virtual Commands                (/docs/architecture/virtual-commands)        [NEW]
│   ├── Hooks System                    (/docs/architecture/hooks)                   [NEW]
│   └── Performance                     (/docs/architecture/performance)             [NEW]
│
├── Examples
│   ├── Your First Feature              (/docs/examples/first-feature)               [EXISTING - PRESERVE]
│   ├── Multi-Repo Workflow             (/docs/examples/multi-repo-workflow)         [NEW]
│   ├── Stacked PR Workflow             (/docs/examples/stacked-pr-workflow)         [NEW]
│   └── Monorepo Workflow               (/docs/examples/monorepo-workflow)           [NEW]
│
├── Commands
│   └── Commands Reference              (/docs/commands/reference)                   [EXISTING - UPDATE]
│
└── Reference
    └── Capability Matrix               (/docs/reference/capability-matrix)          [NEW]
```

**Navigation Depth**: Maximum 2 levels from homepage (Homepage → Section → Page)
**Total Pages**: 20 documentation pages (8 existing, 12 new)
**New Sections**: 2 (Advanced Features, Architecture)

---

## Navigation Menu Structure

### Primary Navigation

The main navigation menu (desktop) displays all top-level sections with dropdown menus for pages.

```
┌─────────────────────────────────────────────────────────────────┐
│ [Speck Logo]  Getting Started ▾  Core Concepts ▾  Advanced ▾  … │
└─────────────────────────────────────────────────────────────────┘
```

**Dropdown Behavior**:
- Hover or click to expand dropdown
- Show all child pages with labels
- Active page highlighted
- Maximum 5 items per dropdown (readability)

### Mobile Navigation

On mobile devices (<768px width), navigation collapses to hamburger menu with accordion sections.

```
┌─────────────────┐
│ ☰ Menu          │
└─────────────────┘
  ├─ Getting Started ▾
  │  ├─ Quick Start Guide
  │  └─ Installation Guide
  ├─ Core Concepts ▾
  │  ├─ Three-Phase Workflow
  │  ├─ Multi-Repo Concepts
  │  └─ Stacked PR Workflows
  └─ …
```

---

## Section Definitions

### Getting Started

**Purpose**: Onboard new users with installation and quickstart guides
**Order**: 1 (first section)
**Audience**: New users, all users
**Pages**:
1. Quick Start Guide (order: 1) - 10-minute tutorial
2. Installation Guide (order: 2) - Plugin installation via Claude Code

**Changes from Spec 006**:
- Quick Start Guide: ADD references to multi-repo and stacked PR capabilities in "What's Next" section
- Installation Guide: PRESERVE unchanged (SC-003 requirement)

---

### Core Concepts

**Purpose**: Explain fundamental concepts and workflow patterns
**Order**: 2
**Audience**: All users (understanding fundamentals)
**Pages**:
1. Three-Phase Workflow (order: 1) - Specify → Plan → Implement cycle [EXISTING]
2. Multi-Repo Concepts (order: 2) - Symlink detection, shared specs [NEW]
3. Stacked PR Workflows (order: 3) - Breaking features into reviewable chunks [NEW]

**Changes from Spec 006**:
- Three-Phase Workflow: PRESERVE unchanged (SC-003 requirement)
- ADD two new conceptual pages for multi-repo and stacked PR patterns

---

### Advanced Features

**Purpose**: How-to guides for advanced capabilities
**Order**: 3
**Audience**: Existing users, evaluators
**Pages**:
1. Multi-Repo Setup (order: 1) - `/speck.link` command, symlink configuration
2. Stacked PRs (order: 2) - `/speck.branch` commands, PR automation
3. Monorepo Workspaces (order: 3) - Workspace-level coordination

**Section Type**: NEW
**Distinguishing Factor**: Actionable guides with step-by-step instructions (vs. conceptual explanations in Core Concepts)

---

### Architecture

**Purpose**: Technical deep-dives for evaluators and advanced users
**Order**: 4
**Audience**: Evaluators, advanced users
**Pages**:
1. Virtual Commands (order: 1) - Hook-based command routing
2. Hooks System (order: 2) - PrePromptSubmit hook, prerequisite injection
3. Performance (order: 3) - Metrics, benchmarks, optimization details

**Section Type**: NEW
**Distinguishing Factor**: Technical implementation details, not required for typical usage

---

### Examples

**Purpose**: Complete workflow tutorials with code samples
**Order**: 5
**Audience**: All users (learning by doing)
**Pages**:
1. Your First Feature (order: 1) - Dark mode toggle walkthrough [EXISTING]
2. Multi-Repo Workflow (order: 2) - Frontend/backend coordination [NEW]
3. Stacked PR Workflow (order: 3) - Breaking feature into stack [NEW]
4. Monorepo Workflow (order: 4) - Managing workspace packages [NEW]

**Changes from Spec 006**:
- Your First Feature: PRESERVE unchanged (SC-003 requirement)
- ADD three new workflow examples demonstrating advanced features

---

### Commands

**Purpose**: Syntax reference for all Speck commands
**Order**: 6
**Audience**: All users (reference lookup)
**Pages**:
1. Commands Reference (order: 1) - All slash commands with syntax

**Changes from Spec 006**:
- UPDATE with new commands: `/speck.link`, `/speck.branch` (create, list, status, import)
- PRESERVE existing command documentation (SC-003 requirement)

---

### Reference

**Purpose**: Quick-reference tables and compatibility information
**Order**: 7
**Audience**: Evaluators, existing users
**Pages**:
1. Capability Matrix (order: 1) - Feature compatibility across repository modes

**Section Type**: NEW

---

## Breadcrumb Patterns

### Standard Breadcrumb Format

All documentation pages include breadcrumbs showing navigation path from homepage.

**Format**: `Home > Section > Page Title`

**Examples**:
- `/docs/getting-started/installation` → `Home > Getting Started > Installation Guide`
- `/docs/advanced-features/multi-repo-support` → `Home > Advanced Features > Multi-Repo Setup`
- `/docs/examples/multi-repo-workflow` → `Home > Examples > Multi-Repo Workflow`

**Visual Style**:
```
Home > Getting Started > Installation Guide
 ^           ^                  ^
 |           |                  |
link        link            current page (no link, bold)
```

**Accessibility**:
- Breadcrumbs wrapped in `<nav aria-label="Breadcrumb">`
- Current page marked with `aria-current="page"`
- Each breadcrumb link has descriptive text (no ">" symbols in link text)

---

## Cross-Linking Strategy

### Prerequisite Links

Pages with prerequisites MUST link to prerequisite pages in introductory section.

**Pattern**:
> **Before you begin**: This guide assumes you've completed [Installation](/docs/getting-started/installation) and understand the [Three-Phase Workflow](/docs/core-concepts/workflow).

**Location**: Immediately after page title, before main content

---

### Related Pages Links

Pages with related content SHOULD include "Related Pages" section at end of document.

**Pattern**:
```markdown
## Related Pages

- [Multi-Repo Concepts](/docs/core-concepts/multi-repo) - Understand multi-repo architecture
- [Monorepo Workspaces](/docs/advanced-features/monorepos) - Workspace-level coordination
- [Multi-Repo Workflow Example](/docs/examples/multi-repo-workflow) - Complete tutorial
```

**Location**: After main content, before footer

---

### In-Content Cross-Links

Link to related concepts inline when first mentioned.

**Pattern**:
> Speck uses [symlink-based detection](/docs/advanced-features/multi-repo-support#detection) to automatically identify multi-repo contexts.

**Guidelines**:
- Link first mention of concept per page
- Use descriptive link text (no "click here")
- Prefer anchor links (#section) for specific subsections

---

### "What's Next" Navigation

Conceptual pages SHOULD include "What's Next" section suggesting logical next steps.

**Pattern**:
```markdown
## What's Next

Now that you understand multi-repo concepts, explore:

1. [Multi-Repo Setup Guide](/docs/advanced-features/multi-repo-support) - Configure your repositories
2. [Multi-Repo Workflow Example](/docs/examples/multi-repo-workflow) - Try a complete tutorial
3. [Capability Matrix](/docs/reference/capability-matrix) - See feature compatibility
```

**Location**: End of main content, before "Related Pages"

---

## User Journey Paths

### Path 1: New User Journey

**Goal**: Install Speck and understand core workflow

```
Homepage
  ↓
Getting Started > Quick Start Guide (10 min)
  ↓
Core Concepts > Three-Phase Workflow
  ↓
Examples > Your First Feature (30-45 min)
  ↓
Commands > Commands Reference (as needed)
```

**Entry Point**: Homepage "Get Started" CTA button
**Exit Criteria**: User completes first feature tutorial
**Estimated Time**: 1-2 hours

---

### Path 2: Existing User - Multi-Repo Discovery

**Goal**: Learn and adopt multi-repo support

```
Homepage (sees "Multi-Repo Support" in hero)
  ↓
Core Concepts > Multi-Repo Concepts (understand)
  ↓
Advanced Features > Multi-Repo Setup (configure)
  ↓
Examples > Multi-Repo Workflow (practice)
  ↓
Reference > Capability Matrix (verify compatibility)
```

**Entry Point**: Homepage "Multi-Repo Support" feature card
**Exit Criteria**: User successfully links child repo
**Estimated Time**: 20-30 minutes

---

### Path 3: Existing User - Stacked PR Discovery

**Goal**: Adopt stacked PR workflow

```
Homepage (sees "Stacked PR Workflows" in hero)
  ↓
Core Concepts > Stacked PR Workflows (understand benefits)
  ↓
Advanced Features > Stacked PRs (learn commands)
  ↓
Examples > Stacked PR Workflow (practice)
  ↓
Reference > Capability Matrix (verify compatibility with multi-repo)
```

**Entry Point**: Homepage "Stacked PRs" feature card
**Exit Criteria**: User creates first stacked branch
**Estimated Time**: 15-20 minutes

---

### Path 4: Evaluator - Enterprise Assessment

**Goal**: Assess Speck fit for team/organization

```
Homepage
  ↓
Reference > Capability Matrix (quick compatibility check)
  ↓
Architecture > Performance (validate scale claims)
  ↓
Core Concepts > Multi-Repo Concepts + Stacked PR Workflows (understand patterns)
  ↓
Examples > Multi-Repo Workflow (proof of real-world usage)
  ↓
Advanced Features > Monorepo Workspaces (validate scale)
```

**Entry Point**: Homepage "Enterprise-Ready" messaging
**Exit Criteria**: Evaluator understands feature set and limitations
**Estimated Time**: 30-45 minutes

---

## Search and Discovery

### Search Integration

**Requirements**:
- Full-text search across all documentation pages
- Search results prioritize title matches, then description, then body content
- Filter results by section (Getting Started, Core Concepts, etc.)
- Display page description in search results preview

**Indexed Fields**:
- Page title (highest priority)
- Page description
- Tags
- Headings (h2, h3)
- Body content (lowest priority)

**Not Indexed**:
- Code blocks (too noisy)
- Footnotes
- Breadcrumbs

---

### Tag-Based Discovery

**Tag Pages** (optional enhancement):
- `/docs/tags/multi-repo` - All pages tagged "multi-repo"
- `/docs/tags/stacked-pr` - All pages tagged "stacked-pr"

**Tag Display**: Show tags at bottom of each page as clickable links

---

## Footer Navigation

### Quick Links Section

Footer includes "Quick Links" with commonly accessed pages.

```
┌─────────────────────────────────────────────────────┐
│ Quick Links                                         │
│ • Quick Start Guide                                 │
│ • Installation Guide                                │
│ • Commands Reference                                │
│ • Capability Matrix                                 │
│                                                     │
│ Resources                                           │
│ • GitHub Repository                                 │
│ • Report an Issue                                   │
│ • Claude Code Plugin Marketplace                    │
└─────────────────────────────────────────────────────┘
```

---

## Accessibility Requirements

### Keyboard Navigation

- All navigation menus accessible via Tab key
- Dropdown menus expand with Enter or Space
- Current page clearly indicated in focus state
- Skip-to-content link available (before navigation)

### Screen Reader Support

- Navigation wrapped in `<nav>` with `aria-label="Main"`
- Sections use `<details>` for collapsible accordions (mobile)
- Breadcrumbs use `<nav aria-label="Breadcrumb">`
- Current page marked with `aria-current="page"`

### Visual Indicators

- Active page highlighted in navigation (distinct color)
- Hover states for all links
- Focus visible (keyboard outline)
- Sufficient color contrast (WCAG AA minimum)

---

## Navigation State Management

### Active Page Highlighting

- Current page highlighted in navigation menu (sidebar or dropdown)
- Current section expanded (if accordion-style navigation)
- Breadcrumb shows current position

### Scroll Behavior

- On-page anchor links scroll smoothly
- Scroll position preserved when navigating back/forward
- Table of contents (if present) highlights current section

---

## Validation Checklist

Before deployment, verify:

- ✅ All pages reachable within 3 clicks from homepage
- ✅ No broken internal links (all paths resolve)
- ✅ Breadcrumbs display correctly on all pages
- ✅ Navigation hierarchy matches sitemap exactly
- ✅ Mobile navigation functional (accordion expands/collapses)
- ✅ Keyboard navigation works (Tab, Enter, Esc)
- ✅ Screen reader announces sections and current page
- ✅ Search indexes all documentation pages
- ✅ Footer quick links target correct pages

---

**Navigation Structure Version**: 1.0
**Last Updated**: 2025-11-22
