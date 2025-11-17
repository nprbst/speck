# Data Model: Website Content Update for Plugin Installation

**Date**: 2025-11-17
**Status**: Complete

## Overview

This feature involves updating static website content (Markdown files and Astro components). There are no database entities or API models. Instead, we define the content entities that structure the information presented to users.

## Content Entities

### 1. Installation Guide

**Type**: Documentation Page (Markdown)
**Location**: `website/src/content/docs/getting-started/installation.md`

**Fields**:
- `title`: "Installation Guide"
- `description`: Brief overview of installation
- `category`: "getting-started"
- `order`: 2
- `lastUpdated`: Date of last update
- `tags`: Array of relevant tags

**Content Sections**:
1. **Prerequisites**
   - Claude Code (with plugin support version requirement)
   - Optional: Node.js, VS Code
   - Removed: Bun, Git (not needed for plugin installation)

2. **Installation Steps**
   - Installing Claude Code (if needed)
   - Using `/plugin` command
   - Adding speck-market marketplace
   - Installing Speck plugin
   - Verification steps

3. **First Command**
   - Starting Claude Code
   - Running `/speck.specify`
   - Expected output

4. **Configuration** (Optional)
   - Environment variables (if applicable to plugin)
   - Claude Code settings

5. **Troubleshooting**
   - Plugin not found
   - Version compatibility issues
   - Permission errors
   - Marketplace connection issues

6. **Verification Checklist**
   - Claude Code version check
   - Plugin installation verification
   - Command availability check

7. **Next Steps**
   - Links to Quick Start, Workflow, Examples

**Validation Rules**:
- Prerequisites must include minimum Claude Code version
- Installation steps must use `/plugin` command (not git clone)
- All code blocks must be syntax-highlighted
- Links must be valid relative paths

---

### 2. Quick Start Guide

**Type**: Documentation Page (Markdown)
**Location**: `website/src/content/docs/getting-started/quick-start.md`

**Fields**:
- `title`: "Quick Start Guide"
- `description`: "Install Speck and run your first command in under 10 minutes"
- `category`: "getting-started"
- `order`: 1
- `lastUpdated`: Date of last update
- `tags`: ["installation", "setup", "beginner"]

**Content Sections**:
1. **Prerequisites**
   - Claude Code with plugin support
   - Version requirements

2. **Installation** (Simplified)
   - One command: `/plugin` workflow
   - No dependency installation needed

3. **Your First Specification**
   - Start Claude Code
   - Run `/speck.specify`
   - Example feature description
   - Review generated spec

4. **Using the Speck Skill**
   - NEW: Asking questions about specs
   - Example queries
   - Skill vs command guidance

5. **Next Steps**
   - Links to full documentation

6. **Troubleshooting** (Brief)
   - Common issues
   - Link to full troubleshooting

**Validation Rules**:
- Must complete in under 10 minutes (as claimed)
- No git clone references
- Clear distinction between skill and commands

---

### 3. Workflow Concepts

**Type**: Documentation Page (Markdown)
**Location**: `website/src/content/docs/concepts/workflow.md`

**Fields**:
- `title`: "Three-Phase Workflow"
- `description`: "Understanding Speck's structured development process"
- `category`: "concepts"
- `order`: 1
- `lastUpdated`: Date of last update

**Content Sections** (with additions):
1. **Overview**
   - Specification → Planning → Implementation

2. **Working with Speck**
   - NEW: Two ways to interact:
     - **Speck Skill**: For questions and understanding
     - **Slash Commands**: For generation and execution

3. **Phase 1: Specification**
   - Using `/speck.specify`
   - Using skill to review specs

4. **Phase 2: Planning**
   - Using `/speck.plan`
   - Using skill to understand plans

5. **Phase 3: Implementation**
   - Using `/speck.tasks` and `/speck.implement`
   - Using skill to check task status

**New Section**: **When to Use Skill vs Commands**
- Table or decision tree
- Examples for each scenario

**Validation Rules**:
- Skill examples must be natural language questions
- Command examples must use exact slash command syntax
- Clear use case differentiation

---

### 4. Commands Reference

**Type**: Documentation Page (Markdown)
**Location**: `website/src/content/docs/commands/reference.md`

**Content Sections** (additions):

**New Section**: **Speck Skill**
- **When to use**: Exploratory questions, understanding specs/plans/tasks
- **Invocation**: Natural language in Claude Code conversation
- **Capabilities**:
  - Understanding spec structure
  - Querying plan details
  - Checking task status
  - Explaining workflow phases
  - Answering requirement questions
- **Examples**: 3-5 representative queries
- **Comparison**: Skill vs slash commands table

**Updated Section**: **Installation and Updates**
- **Installation**: `/plugin` workflow (not git clone)
- **Updates**: `/plugin` > "Manage marketplaces" > "Update marketplace"

**Validation Rules**:
- Skill examples must be questions (not commands)
- Command examples must start with `/`
- All examples must have expected output

---

### 5. Plugin Update Guide

**Type**: Content Section (within Installation Guide or Commands Reference)
**Location**: Embedded in installation.md or as separate section in reference.md

**Content**:
1. **Why Update**
   - New features
   - Bug fixes
   - Compatibility improvements

2. **Update Steps**
   - `/plugin` command
   - "Manage marketplaces"
   - Select "speck-market"
   - "Update marketplace"
   - Verification

3. **Troubleshooting Updates**
   - Update fails
   - Version conflicts
   - Cache issues

**Validation Rules**:
- Must reference Claude Marketplace system
- Clear step-by-step instructions
- Troubleshooting for common issues

---

### 6. Homepage Content

**Type**: Astro Component
**Location**: `website/src/pages/index.astro`

**Content Updates**:

**Hero Section**:
- Headline: Emphasize "Claude Plugin" status
- Subheadline: Mention skill + slash commands
- CTA: Link to plugin installation guide

**Features Section**:
- Update "Claude-Native Commands" feature to include skill
- Possible new feature card for "Natural Language Queries"

**Quick Start Preview**:
- Step 2: Change from "Clone Speck" to "Install Plugin"
- Step 3: Mention skill as alternative to commands

**Validation Rules**:
- Clear value proposition for plugin
- Skill mentioned alongside commands
- Installation CTA points to updated guide

---

## Content Relationships

```
Homepage
  ├─ Links to → Quick Start Guide
  │              └─ Links to → Installation Guide
  │                             └─ Links to → Commands Reference
  ├─ Links to → Workflow Concepts
  │              └─ References → Speck Skill
  └─ Links to → Commands Reference
                 └─ Documents → Speck Skill
                 └─ Documents → Slash Commands
                 └─ Provides → Update Instructions
```

## State Transitions

### Installation Guide State

1. **Before Update**: Git clone-based installation
2. **After Update**: Plugin-based installation
3. **Validation**: No git clone references remain (except in archives/migration docs if needed)

### Skill Documentation State

1. **Before Update**: Only slash commands documented
2. **After Update**: Skill + slash commands with clear use case guidance
3. **Validation**: 3-5 skill examples present, decision guide exists

## Validation Rules (Cross-Content)

### Consistency Requirements

1. **Installation Method**:
   - MUST use `/plugin` command everywhere
   - MUST NOT reference git clone as primary method
   - MAY reference git clone as advanced/alternative method with caveats

2. **Skill vs Commands**:
   - MUST clearly distinguish use cases
   - MUST provide decision guidance
   - MUST show examples of both

3. **Version Requirements**:
   - MUST state minimum Claude Code version consistently
   - MUST provide same upgrade instructions everywhere
   - MUST use same version check commands

4. **Update Instructions**:
   - MUST use Claude Marketplace workflow
   - MUST be consistent across all pages
   - MUST reference `/plugin` command

### Content Quality

1. **Code Blocks**:
   - MUST have language identifiers for syntax highlighting
   - MUST show expected output where helpful
   - MUST be copy-pastable

2. **Links**:
   - MUST use relative paths for internal links
   - MUST be valid and tested
   - MUST open external links in new tab

3. **Examples**:
   - MUST be realistic and practical
   - MUST show both skill queries and slash commands where relevant
   - MUST have clear expected outcomes

## Success Criteria Mapping

This data model supports the following success criteria from spec.md:

- **SC-001**: Quick installation (Installation Guide entity)
- **SC-002**: 100% `/plugins` references (Validation rules across all entities)
- **SC-003**: Clear skill vs commands distinction (Workflow Concepts, Commands Reference entities)
- **SC-004**: Accurate feature reflection (All entities updated)
- **SC-005**: Update instructions (Plugin Update Guide entity)

## Notes

- This is a content-centric data model, not a database schema
- Focus is on information architecture and content structure
- Validation rules ensure consistency and completeness
- All entities are static content (Markdown + Astro components)
