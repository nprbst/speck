# Quickstart: Content Update Workflow

**Feature**: 011-website-feature-update
**Date**: 2025-11-22
**Purpose**: Guide for content authors creating or updating website documentation

---

## Overview

This quickstart guide describes the workflow for creating and updating Speck website documentation. It covers the content creation process from drafting to deployment, including validation steps and review requirements.

**Target Audience**: Content authors, technical writers, developers contributing to documentation

**Estimated Time**: 15-30 minutes per documentation page

---

## Prerequisites

Before creating or updating content, ensure you have:

1. **Local Development Environment**:
   - Bun runtime installed (for running website dev server)
   - Git repository cloned: `/Users/nathan/git/github.com/nprbst/speck`
   - Node.js/npm (for website dependencies)

2. **Knowledge Requirements**:
   - Familiarity with Markdown syntax
   - Understanding of Speck features being documented (read source specs 007-010)
   - Basic git workflow knowledge

3. **Reference Materials**:
   - [data-model.md](data-model.md) - Content entity definitions
   - [contracts/content-schema.md](contracts/content-schema.md) - Frontmatter structure
   - [contracts/navigation-structure.md](contracts/navigation-structure.md) - Site architecture
   - [contracts/example-templates.md](contracts/example-templates.md) - Example page templates

---

## Content Update Workflow (9 Steps)

### Step 1: Review Source Specifications

**Purpose**: Ensure technical accuracy by referencing original specifications

**Actions**:
1. Identify which spec(s) introduce the feature you're documenting:
   - Spec 007: Multi-repo/monorepo support
   - Spec 008: Stacked PR workflows (single-repo and multi-repo root)
   - Spec 009: Multi-repo stacked PRs
   - Spec 010: Virtual commands and hooks
2. Read the specification's functional requirements and success criteria
3. Extract key user-facing concepts (ignore implementation details)
4. Note performance metrics, examples, and quickstart content from spec

**Location**: `/Users/nathan/git/github.com/nprbst/speck/specs/00N-spec-name/spec.md`

**Example**:
```bash
# Read spec 007 for multi-repo content
cd /Users/nathan/git/github.com/nprbst/speck
cat specs/007-multi-repo-monorepo-support/spec.md
```

**Validation**: Can you explain the feature to a non-technical user in 2-3 sentences? If not, re-read the spec.

---

### Step 2: Draft Content in Markdown

**Purpose**: Create content following data model and contract specifications

**Actions**:
1. Determine page category (getting-started, core-concepts, advanced-features, architecture, examples, reference)
2. Choose appropriate template:
   - Conceptual pages: Standard structure with "What You'll Learn", key concepts, examples
   - Example pages: Use [example-templates.md](contracts/example-templates.md) structure
   - Reference pages: Focus on tables, quick lookups, compatibility information
3. Write frontmatter following [content-schema.md](contracts/content-schema.md)
4. Draft content body in Markdown

**Template Selection Guide**:

| Page Type | Category | Use Template |
|-----------|----------|--------------|
| Conceptual explanation | `core-concepts` | Standard article structure |
| How-to guide | `advanced-features` | Step-by-step with commands |
| Tutorial | `examples` | [example-templates.md](contracts/example-templates.md) |
| Quick reference | `reference` | Table-heavy, minimal prose |

**Frontmatter Example**:
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

**Location**: Create file in appropriate directory:
- `/Users/nathan/git/github.com/nprbst/speck/website/src/content/docs/[category]/[page-name].md`

**Example**:
```bash
# Create new advanced features page
cd /Users/nathan/git/github.com/nprbst/speck/website/src/content/docs
mkdir -p advanced-features
touch advanced-features/multi-repo-support.md
```

---

### Step 3: Add Code Examples and Workflows

**Purpose**: Provide actionable, copy-pasteable commands and realistic scenarios

**Actions**:
1. For how-to guides and examples:
   - Include exact commands users will run
   - Show expected output
   - Explain what each command does and why
2. For conceptual pages:
   - Use code samples to illustrate concepts
   - Link to full examples in examples section
3. Test all commands in actual environment (don't fabricate output)
4. Follow code formatting guidelines from [example-templates.md](contracts/example-templates.md)

**Code Sample Guidelines**:
- Use bash syntax highlighting for commands
- Include context comments (`# From child repo`)
- Show realistic paths (not `/foo/bar`)
- Display actual output (verbatim from testing)

**Example**:
```markdown
### Setting Up Multi-Repo Symlinks

From your child repository, link to the shared specification root:

```bash
# From child repo (e.g., frontend)
cd /path/to/frontend-repo
/speck.link ../shared-specs
```

**Expected Output:**
```
✓ Created .speck/root symlink → ../shared-specs
✓ Multi-repo detection enabled
✓ Shared specs available at specs/ (via symlink)
```

This command creates a relative symlink that tells Speck to read specifications from the shared root directory.
```

**Validation**: Can a user copy-paste commands and achieve the described outcome? Test with colleague if possible.

---

### Step 4: Update Navigation Structure

**Purpose**: Ensure new pages are accessible via site navigation

**Actions**:
1. Review current navigation in [contracts/navigation-structure.md](contracts/navigation-structure.md)
2. Determine where new page fits in hierarchy
3. Update navigation configuration file (implementation-specific, typically in website config)
4. Verify maximum depth constraint (3 clicks from homepage)

**Example Navigation Update**:
```
Advanced Features (NEW SECTION)
├── Multi-Repo Setup (NEW PAGE)
├── Stacked PRs (NEW PAGE)
└── Monorepo Workspaces (NEW PAGE)
```

**Location**: Navigation configuration varies by implementation (Astro typically uses content collections)

**Validation**: New page should appear in navigation menu at correct location

---

### Step 5: Run Link Validation

**Purpose**: Prevent broken internal links and prerequisite references

**Actions**:
1. Start website dev server:
   ```bash
   cd /Users/nathan/git/github.com/nprbst/speck
   bun run website:dev
   ```
2. Visit new page at `http://localhost:4321/docs/[category]/[page-name]`
3. Click all internal links to verify they resolve
4. Check prerequisite pages exist
5. Verify related pages links work
6. Run automated link checker (if available from spec 004 test suite)

**Common Link Issues**:
- Incorrect paths (missing `/docs/` prefix)
- Broken anchor links (section doesn't exist)
- Prerequisite pages not yet created (create stubs or remove reference)

**Automated Validation** (if test suite exists):
```bash
# Run link validation tests
bun test -- link-validation
```

**Validation**: All links should resolve with 200 status (no 404s)

---

### Step 6: Preview in Local Dev Server

**Purpose**: Review visual rendering, layout, and formatting

**Actions**:
1. Open browser to `http://localhost:4321`
2. Navigate to new/updated page via navigation menu
3. Check rendering:
   - Frontmatter metadata displays correctly (title, description)
   - Code blocks have syntax highlighting
   - Headings render at correct levels
   - Breadcrumbs show correct navigation path
   - Related pages section appears
4. Test responsive behavior (resize browser to mobile width)
5. Review typography and readability

**Dev Server Command**:
```bash
cd /Users/nathan/git/github.com/nprbst/speck
bun run website:dev
# Server starts at http://localhost:4321
```

**Review Checklist**:
- ✅ Title displays correctly in browser tab
- ✅ Description appears in page metadata
- ✅ Breadcrumbs show navigation path
- ✅ Code blocks have syntax highlighting
- ✅ Links are visually distinct (colored, underlined)
- ✅ Headings create logical outline
- ✅ Images/diagrams display (if present)
- ✅ Mobile layout is readable (no horizontal scroll)

---

### Step 7: Accessibility Check with Axe-core

**Purpose**: Ensure content meets WCAG accessibility standards

**Actions**:
1. Install browser extension: [axe DevTools](https://www.deque.com/axe/devtools/) (Chrome/Firefox)
2. Open new/updated page in browser
3. Run axe scan via extension
4. Review issues flagged:
   - Heading hierarchy (no skipped levels)
   - Link text clarity (descriptive, not "click here")
   - Color contrast (text vs background)
   - Keyboard navigation (Tab key works)
5. Fix accessibility issues
6. Re-run scan until zero critical issues

**Common Accessibility Issues**:
- **Skipped heading levels**: H2 → H4 (missing H3)
- **Insufficient contrast**: Light gray text on white background
- **Non-descriptive links**: "Learn more" without context
- **Missing alt text**: Images without descriptions

**Automated Check** (if test suite exists):
```bash
# Run accessibility tests
bun test -- a11y
```

**Validation**: Axe scan shows zero critical violations

---

### Step 8: Deploy to Preview Environment

**Purpose**: Test in production-like environment before final deployment

**Actions**:
1. Commit changes to feature branch:
   ```bash
   git add website/src/content/docs/
   git commit -m "docs: add [feature name] documentation"
   ```
2. Push to remote:
   ```bash
   git push origin 011-website-feature-update
   ```
3. Create preview deployment (via Cloudflare Pages or CI/CD pipeline)
4. Share preview URL with reviewers

**Preview Deployment** (implementation-specific):
```bash
# If Cloudflare Pages CLI installed
npx wrangler pages publish website/dist --project-name speck-website --branch 011-website-feature-update
```

**Validation**: Preview URL resolves and displays new/updated content

---

### Step 9: Final Review and Approval

**Purpose**: Ensure content quality, accuracy, and consistency before production deployment

**Actions**:
1. **Technical Review**:
   - Verify commands work as documented
   - Check performance metrics match source specs
   - Confirm feature descriptions are accurate
2. **Content Review**:
   - Read for clarity and tone consistency
   - Check grammar and spelling
   - Verify frontmatter metadata is complete
3. **Cross-Reference Review**:
   - Ensure no contradictions with existing content (spec 006 pages)
   - Verify capability matrix aligns with individual feature pages
   - Check that examples reference correct conceptual pages
4. **Approval**:
   - Get sign-off from content owner or tech lead
   - Merge feature branch to main
   - Deploy to production

**Review Checklist**:
- ✅ Content technically accurate (matches source spec)
- ✅ Commands tested and verified
- ✅ No grammar/spelling errors
- ✅ Frontmatter complete and valid
- ✅ No broken links
- ✅ Accessibility scan passed
- ✅ Preview deployment reviewed
- ✅ No contradictions with existing content
- ✅ Approval received

**Production Deployment**:
```bash
# Merge to main
git checkout main
git merge 011-website-feature-update
git push origin main

# Production deployment (automated via CI/CD or manual)
bun run website:build
# Deploy dist/ to Cloudflare Pages
```

---

## Tools and Resources

### Required Tools

1. **Text Editor**: Any Markdown-capable editor (VS Code, Sublime, Vim, etc.)
2. **Bun Runtime**: For website dev server (`bun run website:dev`)
3. **Git**: Version control and branch management
4. **Browser**: For preview and accessibility testing
5. **Axe DevTools**: Browser extension for accessibility scanning

### Optional Tools

1. **Link Checker CLI**: Automated link validation (e.g., `linkinator`)
2. **Markdown Linter**: Enforce consistent formatting (e.g., `markdownlint`)
3. **Screenshot Tool**: Capture examples for diagrams (if needed)

---

## Common Workflows

### Creating a New Conceptual Page

1. Review source spec (Step 1)
2. Draft markdown with standard structure (Step 2)
3. Add inline code examples (Step 3)
4. Update navigation (Step 4)
5. Validate links (Step 5)
6. Preview locally (Step 6)
7. Run accessibility check (Step 7)
8. Deploy preview and review (Steps 8-9)

**Estimated Time**: 20-30 minutes

---

### Creating a New Example/Tutorial Page

1. Review source spec (Step 1)
2. Draft markdown following [example-templates.md](contracts/example-templates.md) (Step 2)
3. Test entire workflow and capture exact commands/output (Step 3)
4. Update navigation (Step 4)
5. Validate links (Step 5)
6. Preview locally (Step 6)
7. Run accessibility check (Step 7)
8. Have colleague test tutorial end-to-end
9. Deploy preview and review (Steps 8-9)

**Estimated Time**: 45-60 minutes (due to thorough testing requirement)

---

### Updating Existing Page (Spec 006 Content)

1. Review [research.md](research.md) to identify what MUST be preserved (Step 1)
2. Make targeted updates (add references, update sections) (Step 2)
3. Update `lastUpdated` frontmatter field
4. Update `relatedPages` to link new content (Step 2)
5. Validate links (Step 5)
6. Preview locally (Step 6)
7. Run accessibility check (Step 7)
8. Deploy preview and review (Steps 8-9)

**Estimated Time**: 10-15 minutes (minor updates only)

**Preservation Rule (SC-003)**: Do NOT delete or contradict spec 006 content. Only extend with new sections or references.

---

### Updating Capability Matrix

1. Review new feature specifications (Step 1)
2. Add rows to capability matrix following [contracts/capability-matrix.md](contracts/capability-matrix.md)
3. Fill in support status for each repository mode (✅, ❌, ⚠️, N/A)
4. Document limitations in "Limitations" column
5. Update "Last Updated" date and spec coverage note
6. Validate links (Step 5)
7. Preview table rendering locally (Step 6)
8. Run accessibility check (table structure) (Step 7)
9. Deploy preview and review (Steps 8-9)

**Estimated Time**: 15-20 minutes per feature

---

## Validation and Testing

### Build-Time Validation

Content MUST pass build-time validation before deployment:

**Frontmatter Validation**:
- All required fields present (`title`, `description`, `category`, `audience`, `tags`, `lastUpdated`)
- Enum values valid (`category`, `audience`, `difficulty`)
- String lengths within constraints (title 3-80 chars, description 50-160 chars)
- Dates in ISO 8601 format (YYYY-MM-DD)

**Link Integrity**:
- All prerequisite paths resolve to existing pages
- All related page paths resolve to existing pages
- Internal links in content body resolve

**Content Constraints**:
- Example pages include `estimatedDuration` and `difficulty`
- Tag count between 1 and 10
- No duplicate page paths

### Manual Review Validation

Human review SHOULD check:

**Technical Accuracy**:
- Commands execute as documented
- Output matches actual results
- Feature descriptions align with source specs
- Performance metrics match spec success criteria

**Content Quality**:
- Clear, concise writing (avoid jargon)
- Logical flow and organization
- Consistent tone (second person, active voice)
- Grammar and spelling correct

**User Experience**:
- Examples are realistic (not abstract)
- Prerequisites clearly stated
- Troubleshooting covers common issues
- "What's Next" suggests logical progression

---

## Troubleshooting

### Issue: Build Fails with Frontmatter Validation Error

**Symptoms**:
```
Error: Invalid frontmatter in docs/advanced-features/multi-repo-support.md
Field 'category' has invalid value: 'multi-repo'
```

**Solution**:
1. Check [contracts/content-schema.md](contracts/content-schema.md) for valid enum values
2. Update frontmatter to use correct enum (e.g., `advanced-features` not `multi-repo`)
3. Re-run build to verify fix

---

### Issue: Links Not Resolving in Preview

**Symptoms**:
- Clicking link shows 404 page
- Console shows "Page not found"

**Solution**:
1. Verify link path starts with `/docs/` (not `docs/` or `../docs/`)
2. Check target page filename matches link path exactly (case-sensitive)
3. Ensure target page has been created (not just referenced)
4. Clear browser cache and reload

---

### Issue: Code Blocks Missing Syntax Highlighting

**Symptoms**:
- Code appears in monospace font but no colors
- All text is same color

**Solution**:
1. Verify code fence includes language identifier:
   ```markdown
   ```bash  ← language identifier
   command here
   ```
   ```
2. Check language identifier is valid (bash, yaml, typescript, etc.)
3. Restart dev server to reload Shiki configuration

---

### Issue: Accessibility Scan Flags Heading Hierarchy

**Symptoms**:
```
axe violation: Heading levels should only increase by one
H2 → H4 detected (missing H3)
```

**Solution**:
1. Review document outline (use browser DevTools)
2. Identify skipped heading level
3. Adjust heading levels to be sequential (H2 → H3 → H4)
4. Re-run axe scan to verify fix

---

### Issue: Preview Deployment Not Updating

**Symptoms**:
- Changes not visible in preview URL
- Old content still showing

**Solution**:
1. Verify git push succeeded (`git status` shows clean working tree)
2. Check deployment logs for errors
3. Hard refresh browser (Ctrl+Shift+R / Cmd+Shift+R)
4. Clear Cloudflare Pages cache (if applicable)
5. Re-deploy manually if automated deployment failed

---

## Appendix: File Locations Quick Reference

### Documentation Files
- Content pages: `/Users/nathan/git/github.com/nprbst/speck/website/src/content/docs/[category]/[page-name].md`
- Navigation config: `/Users/nathan/git/github.com/nprbst/speck/website/src/components/Navigation.astro` (implementation-specific)

### Contract Files
- Content schema: `/Users/nathan/git/github.com/nprbst/speck/specs/011-website-feature-update/contracts/content-schema.md`
- Navigation structure: `/Users/nathan/git/github.com/nprbst/speck/specs/011-website-feature-update/contracts/navigation-structure.md`
- Capability matrix: `/Users/nathan/git/github.com/nprbst/speck/specs/011-website-feature-update/contracts/capability-matrix.md`
- Example templates: `/Users/nathan/git/github.com/nprbst/speck/specs/011-website-feature-update/contracts/example-templates.md`

### Source Specifications
- Spec 007 (multi-repo): `/Users/nathan/git/github.com/nprbst/speck/specs/007-multi-repo-monorepo-support/spec.md`
- Spec 008 (stacked PRs): `/Users/nathan/git/github.com/nprbst/speck/specs/008-stacked-pr-support/spec.md`
- Spec 009 (multi-repo stacked): `/Users/nathan/git/github.com/nprbst/speck/specs/009-multi-repo-stacked/spec.md`
- Spec 010 (virtual commands): `/Users/nathan/git/github.com/nprbst/speck/specs/010-virtual-command-pattern/spec.md`

### Research and Design Files
- Research findings: `/Users/nathan/git/github.com/nprbst/speck/specs/011-website-feature-update/research.md`
- Data model: `/Users/nathan/git/github.com/nprbst/speck/specs/011-website-feature-update/data-model.md`

---

**Quickstart Version**: 1.0
**Last Updated**: 2025-11-22
