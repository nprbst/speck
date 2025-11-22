# Contract: Example Templates

**Feature**: 011-website-feature-update
**Date**: 2025-11-22
**Purpose**: Define standard structure and formatting conventions for example/tutorial documentation pages

---

## Overview

This contract specifies the template structure for example and tutorial pages. All pages with `category: examples` MUST follow this structure to ensure consistency, clarity, and usability.

---

## Standard Example Page Structure

### Template Outline

```markdown
---
# Frontmatter (see content-schema.md)
title: "[Workflow Name] Tutorial"
description: "..."
category: examples
audience: [...]
prerequisites: [...]
tags: [...]
lastUpdated: YYYY-MM-DD
estimatedDuration: "N minutes" or "N-M minutes"
difficulty: beginner | intermediate | advanced
---

# [Workflow Name] Tutorial

[1-2 sentence overview explaining what this tutorial teaches and why it's useful]

## What You'll Learn

- [Learning objective 1]
- [Learning objective 2]
- [Learning objective 3]

## Prerequisites

Before you begin, ensure you have:

- [Prerequisite 1 with link]
- [Prerequisite 2 with link]
- [Prerequisite 3 - environment requirement]

## Overview

[2-3 paragraphs explaining the scenario, workflow context, and expected outcome]

### Scenario

[Concrete use case description - e.g., "You're building an e-commerce platform with separate frontend and backend repositories..."]

### What We'll Build

[Brief description of what will be created during tutorial]

## Step-by-Step Walkthrough

### Step 1: [Action Title]

[1-2 sentences explaining what this step does and why]

**Command:**
```bash
[exact command to run]
```

**Expected Output:**
```
[what users should see]
```

**Explanation:**
[2-3 sentences explaining what happened]

[Repeat for each step...]

## Verification

After completing all steps, verify success by:

1. [Verification step 1]
2. [Verification step 2]
3. [Verification step 3]

**Expected Results:**
- ✅ [Success criterion 1]
- ✅ [Success criterion 2]
- ✅ [Success criterion 3]

## Troubleshooting

### Issue: [Common Problem 1]

**Symptoms:**
[How users know they've hit this issue]

**Solution:**
[Step-by-step fix]

### Issue: [Common Problem 2]

**Symptoms:**
[How users know they've hit this issue]

**Solution:**
[Step-by-step fix]

## What's Next

Now that you've completed this tutorial, explore:

- [Related page 1 with link] - [Why this is a good next step]
- [Related page 2 with link] - [Why this is a good next step]
- [Related page 3 with link] - [Why this is a good next step]

## Related Pages

- [Related documentation page 1]
- [Related documentation page 2]
```

---

## Section Specifications

### What You'll Learn

**Purpose**: Set clear expectations for tutorial outcomes

**Format**: Bulleted list of 3-5 specific learning objectives

**Guidelines**:
- Use action verbs (learn, create, configure, understand)
- Be specific (not "learn about multi-repo" but "configure multi-repo symlinks")
- Focus on skills/knowledge gained, not just tasks completed

**Example**:
```markdown
## What You'll Learn

- Configure multi-repo symlinks using `/speck.link` command
- Generate per-repo implementation plans from shared specifications
- Verify multi-repo detection with `/speck.env`
```

---

### Prerequisites

**Purpose**: Ensure users have necessary setup before starting

**Format**: Bulleted list with links to prerequisite pages or explicit environment requirements

**Guidelines**:
- Link to installation/setup pages (not just "have X installed")
- Specify versions if relevant (e.g., "Claude Code 2.0+")
- Include environment setup (e.g., "Two git repositories cloned locally")
- Order prerequisites logically (installation → knowledge → environment)

**Example**:
```markdown
## Prerequisites

Before you begin, ensure you have:

- [Claude Code 2.0+ installed](/docs/getting-started/installation)
- Understanding of the [Three-Phase Workflow](/docs/core-concepts/workflow)
- Two git repositories cloned locally (we'll use `frontend` and `backend` as examples)
- Basic familiarity with git commands
```

---

### Overview

**Purpose**: Provide context and motivation for tutorial

**Format**: 2-3 paragraphs with optional subsections (Scenario, What We'll Build)

**Guidelines**:
- Explain the real-world use case (avoid abstract examples)
- Set expectations for time commitment and difficulty
- Clarify what success looks like

**Example**:
```markdown
## Overview

This tutorial demonstrates how to coordinate feature development across multiple repositories using Speck's multi-repo support. You'll set up a shared specification for a user authentication feature, then generate independent implementation plans for frontend and backend repositories.

### Scenario

You're building an e-commerce platform with separate frontend (React) and backend (Node.js) repositories. Both teams need to implement JWT-based authentication, sharing the same specification for token structure and API contracts while maintaining independent implementation plans.

### What We'll Build

By the end of this tutorial, you'll have:
- A shared specification in a root directory
- Two child repositories linked to the shared spec via symlinks
- Independent implementation plans per repository
- Working knowledge of multi-repo commands
```

---

### Step-by-Step Walkthrough

**Purpose**: Provide actionable, sequential instructions

**Format**: Numbered steps (H3 headings), each with command, expected output, and explanation

**Guidelines**:
- Each step = one logical action (don't combine unrelated tasks)
- Include exact commands (copy-pasteable)
- Show expected output (so users know if they're on track)
- Explain WHY, not just WHAT (help users understand)
- Use consistent formatting for commands and output

**Step Template**:
```markdown
### Step N: [Action Title in Active Voice]

[1-2 sentences explaining what this step accomplishes and why it matters]

**Command:**
```bash
[exact command - must be copy-pasteable]
```

**Expected Output:**
```
[actual output users will see]
```

**Explanation:**
[2-3 sentences explaining what happened behind the scenes]
```

**Example**:
```markdown
### Step 2: Link Frontend Repository to Shared Specs

Now that we have a shared specification, we'll link the frontend repository to reference it.

**Command:**
```bash
cd ../frontend-repo
/speck.link ../shared-specs
```

**Expected Output:**
```
✓ Created .speck/root symlink → ../shared-specs
✓ Multi-repo detection enabled
✓ Shared specs available at specs/ (via symlink)
```

**Explanation:**
The `/speck.link` command creates a relative symlink from `.speck/root` to the shared specification directory. Speck automatically detects this symlink and switches to multi-repo mode, making shared specs visible in the `specs/` directory.
```

---

### Verification

**Purpose**: Confirm tutorial success with objective checks

**Format**: Numbered list of verification steps, followed by expected results checklist

**Guidelines**:
- Provide specific commands to run (e.g., `ls -la`, `/speck.env`)
- Define observable outcomes (files exist, command output matches, etc.)
- Use checkboxes (✅) for expected results
- All criteria MUST be objectively verifiable (no "code should feel better")

**Example**:
```markdown
## Verification

After completing all steps, verify success by:

1. Run `/speck.env` from the frontend repository
2. Check for `.speck/root` symlink existence
3. Verify independent `plan.md` files in each repository

**Expected Results:**
- ✅ `/speck.env` output shows "Multi-repo mode: child (linked to ../shared-specs)"
- ✅ `.speck/root` symlink exists and points to `../shared-specs`
- ✅ `frontend-repo/specs/001-user-auth/plan.md` exists and differs from backend plan
- ✅ Both repositories reference the same `spec.md` (via symlink)
```

---

### Troubleshooting

**Purpose**: Preempt common issues and provide solutions

**Format**: H3 headings for each issue, with Symptoms and Solution subsections

**Guidelines**:
- Focus on issues encountered during testing/review
- Provide specific symptoms (error messages, unexpected behavior)
- Give step-by-step solutions (not just "check your config")
- Limit to 3-5 most common issues (avoid overwhelming users)

**Issue Template**:
```markdown
### Issue: [Problem Description]

**Symptoms:**
[How users recognize they've hit this issue - error messages, unexpected output, etc.]

**Solution:**
1. [Step 1 to resolve]
2. [Step 2 to resolve]
3. [Verification - how to know it's fixed]
```

**Example**:
```markdown
### Issue: Symlink Not Detected After Running `/speck.link`

**Symptoms:**
- `/speck.env` still shows "Single-repo mode"
- `specs/` directory doesn't show shared specifications

**Solution:**
1. Verify the symlink was created: `ls -la .speck/root`
2. Check symlink target is correct: `readlink .speck/root` should output `../shared-specs`
3. Ensure the target directory exists: `ls ../shared-specs/specs/`
4. Re-run `/speck.env` - it should now show multi-repo mode

If the issue persists, the symlink may be absolute instead of relative. Delete `.speck/root` and re-run `/speck.link` with the correct relative path.
```

---

### What's Next

**Purpose**: Guide users to logical next steps after completing tutorial

**Format**: Bulleted list of 3 related pages with brief rationale

**Guidelines**:
- Suggest progressive difficulty (next logical learning step)
- Include both conceptual and practical resources
- Explain WHY each link is relevant (not just a link dump)

**Example**:
```markdown
## What's Next

Now that you've completed this tutorial, explore:

- [Stacked PR Workflows](/docs/core-concepts/stacked-prs) - Learn how to break features into reviewable chunks across multiple repositories
- [Monorepo Workspaces](/docs/advanced-features/monorepos) - Apply multi-repo concepts to monorepo workspace management
- [Capability Matrix](/docs/reference/capability-matrix) - See which features work in multi-repo contexts
```

---

## Code Sample Formatting

### Command Blocks

**Format**: Always use bash syntax highlighting and include context comments

**Template**:
```bash
# Context comment explaining where to run this
cd /path/to/directory
command-to-run --with-flags
```

**Example**:
```bash
# From the frontend repository root
cd frontend-repo
/speck.link ../shared-specs

# Verify multi-repo mode is active
/speck.env
```

**Guidelines**:
- Include directory context (where to run command)
- Use realistic paths (not `/foo/bar` unless actually relevant)
- Group related commands together
- Separate unrelated commands with blank lines

---

### Expected Output Blocks

**Format**: Plain text code block showing exact output (not paraphrased)

**Template**:
```
[actual command output verbatim]
```

**Example**:
```
✓ Created .speck/root symlink → ../shared-specs
✓ Multi-repo detection enabled
✓ Shared specs available at specs/ (via symlink)

Multi-repo mode: child
Linked to: ../shared-specs
Available specs: 001-user-auth
```

**Guidelines**:
- Show actual output from testing (don't fabricate)
- Include success indicators (✓, checkmarks, status messages)
- Truncate very long output with `...` and explanation
- Highlight key parts users should notice

---

### File Content Examples

**Format**: Show relevant file sections with syntax highlighting

**Template**:
```yaml
# filename.ext
[relevant content]
```

**Example**:
```yaml
# specs/001-user-auth/spec.md (shared specification)
---
title: User Authentication
---

# User Authentication Feature

## Contracts

### JWT Token Structure
- Header: `{ "alg": "HS256", "typ": "JWT" }`
- Payload: `{ "userId": string, "exp": number }`
- Signature: HMAC-SHA256 secret
```

**Guidelines**:
- Include filename as comment in first line
- Show only relevant sections (not entire files)
- Use appropriate syntax highlighting (yaml, markdown, typescript, etc.)
- Add ellipsis `...` if content is truncated

---

## Before/After Comparison Template

For tutorials demonstrating improvements or migrations, use before/after comparisons.

**Format**:
```markdown
### Before: [Previous State]

[Description of old approach or state]

```bash
# Old command or code
old-approach
```

### After: [New State]

[Description of new approach or state]

```bash
# New command or code
new-approach
```

**Benefits:**
- [Benefit 1]
- [Benefit 2]
```

**Example**:
```markdown
### Before: Manual Multi-Repo Setup

Previously, coordinating specs across repositories required manual file copying or git submodules.

```bash
# Copy spec to each repo (manual sync required)
cp shared-specs/001-user-auth.md frontend/specs/
cp shared-specs/001-user-auth.md backend/specs/
```

### After: Symlink-Based Detection

With Speck's multi-repo support, child repos automatically reference shared specs via symlinks.

```bash
# One-time setup per child repo
cd frontend
/speck.link ../shared-specs

cd ../backend
/speck.link ../shared-specs
```

**Benefits:**
- Single source of truth (no manual copying)
- Automatic updates (symlink reflects current spec)
- Independent implementation plans per repo
```

---

## Success Criteria Section Template

Every example page MUST define observable success criteria in the Verification section.

**Format**:
```markdown
**Expected Results:**
- ✅ [Objective criterion 1]
- ✅ [Objective criterion 2]
- ✅ [Objective criterion 3]
```

**Guidelines**:
- Criteria MUST be objective (verifiable by command output, file existence, etc.)
- Use checkboxes (✅) for visual scanning
- Minimum 3 criteria, maximum 7 (avoid overwhelming list)
- Cover different aspects (files created, commands work, expected behavior)

**Example**:
```markdown
**Expected Results:**
- ✅ `/speck.env` shows "Multi-repo mode: child"
- ✅ `.speck/root` symlink exists and points to `../shared-specs`
- ✅ `specs/001-user-auth/spec.md` is accessible via symlink
- ✅ Independent `plan.md` exists in current repository
- ✅ Both frontend and backend repos share the same spec content
```

---

## Voice and Tone Guidelines

### Tutorial Voice

- **Second person ("you")**: "You'll configure multi-repo support..."
- **Active voice**: "Run the command" not "The command should be run"
- **Encouraging**: "Great! You've successfully linked..." not "The symlink was created"
- **Clear and direct**: Avoid hedging ("might", "could", "possibly")

### Command Explanations

- **Explain intent**: Why we're running this command
- **Describe outcome**: What changes after command execution
- **Connect to concepts**: Link to conceptual documentation when relevant

**Example**:
```markdown
This command creates a symlink that tells Speck to read specifications from the shared root directory. Once linked, all Speck commands in this repository will reference the shared specs while maintaining independent plans and tasks. See [Multi-Repo Concepts](/docs/core-concepts/multi-repo) for architectural details.
```

---

## Accessibility Guidelines

### Screen Reader Support

- Use semantic headings (H2, H3) for outline navigation
- Provide descriptive link text (no "click here")
- Include alt text for diagrams/screenshots (if used)
- Use code blocks with language identifiers for syntax highlighting

### Visual Clarity

- Break long steps into sub-steps
- Use consistent formatting (bold for **Command**, etc.)
- Include whitespace between sections
- Use emoji sparingly and meaningfully (✅ for success, ⚠️ for warnings)

---

## Validation Checklist

Before publishing example page, verify:

- ✅ Frontmatter complete (title, description, category, audience, tags, lastUpdated, estimatedDuration, difficulty)
- ✅ "What You'll Learn" section present with 3-5 objectives
- ✅ Prerequisites listed with links
- ✅ Overview provides context and scenario
- ✅ Steps are sequential and actionable
- ✅ Commands are exact and copy-pasteable
- ✅ Expected output shown for each command
- ✅ Explanations connect steps to concepts
- ✅ Verification section with objective success criteria
- ✅ Troubleshooting covers common issues (tested)
- ✅ "What's Next" suggests logical follow-ups
- ✅ Code blocks use appropriate syntax highlighting
- ✅ Tutorial tested end-to-end by fresh user

---

## Example Page Samples

### Sample 1: Multi-Repo Workflow Tutorial

**Use Case**: Coordinating feature development across frontend/backend repositories

**Structure**:
1. **What You'll Learn**: Configure symlinks, generate per-repo plans, verify multi-repo mode
2. **Prerequisites**: Claude Code installed, two git repos, basic workflow knowledge
3. **Overview**: E-commerce platform scenario with shared user auth feature
4. **Steps**:
   - Create shared spec directory
   - Link frontend repo to shared specs
   - Link backend repo to shared specs
   - Generate per-repo plans
   - Verify independent implementations
5. **Verification**: Check symlinks, compare plans, run `/speck.env`
6. **Troubleshooting**: Symlink not detected, specs not visible, plan conflicts
7. **What's Next**: Stacked PR workflows, monorepo workspaces, capability matrix

---

### Sample 2: Stacked PR Workflow Tutorial

**Use Case**: Breaking large feature into reviewable chunks

**Structure**:
1. **What You'll Learn**: Create stacked branches, filter tasks per branch, automate PR creation
2. **Prerequisites**: Feature with 3+ user stories, understanding of stacked PR concepts
3. **Overview**: Payment processing feature split into authentication, API integration, UI
4. **Steps**:
   - Create base branch for user story 1
   - Generate tasks for first branch
   - Complete first PR
   - Create second stacked branch
   - Repeat for remaining user stories
   - View stack status
5. **Verification**: Check branch structure, verify PR chain, confirm stack in `/speck.env`
6. **Troubleshooting**: Branch dependency errors, PR description not generated, stack out of sync
7. **What's Next**: Multi-repo stacked PRs, capability matrix, rebase strategies

---

### Sample 3: Monorepo Workflow Tutorial

**Use Case**: Managing workspace packages with shared specifications

**Structure**:
1. **What You'll Learn**: Apply multi-repo concepts to monorepo workspaces, coordinate package changes
2. **Prerequisites**: Monorepo with 2+ packages, package dependencies defined
3. **Overview**: Design system shared across web app and mobile app packages
4. **Steps**:
   - Create shared spec at workspace root
   - Link each package to workspace specs
   - Generate package-specific plans
   - Coordinate breaking changes via shared contracts
5. **Verification**: Verify package independence, check shared spec usage, test across packages
6. **Troubleshooting**: Workspace detection issues, package isolation problems, version conflicts
7. **What's Next**: Stacked PRs in monorepo context, workspace-level constitutions

---

**Example Templates Version**: 1.0
**Last Updated**: 2025-11-22
