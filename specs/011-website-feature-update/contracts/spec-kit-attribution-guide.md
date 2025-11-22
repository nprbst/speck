# spec-kit Attribution Guide

**Purpose**: Ensure consistent, respectful attribution to GitHub's spec-kit project across all website content

**Source**: Clarifications session 2025-11-22 (spec.md#clarifications)

**Related Requirements**: FR-029, FR-030, FR-031, FR-032, FR-033, SC-009

---

## Attribution Locations (Multi-Channel Strategy)

Per clarification Q1, attribution MUST appear in 4 distinct locations:

### 1. Hero Subtitle (FR-001)

**Location**: `website/src/pages/index.astro` - Hero section, below main tagline

**Content**: "Built on GitHub's spec-kit"

**Format**:
- Hyperlinked to: `https://github.com/github/spec-kit`
- Displayed as subtitle or secondary tagline
- Visually subordinate to main tagline but clearly visible

**Implementation Reference**: Task T012a

---

### 2. Homepage Origins Section (FR-029)

**Location**: `website/src/pages/index.astro` - Dedicated section on homepage

**Length**: 2-3 sentences (brief paragraph)

**Required Content Elements**:
1. Foundation acknowledgment: "Speck builds on GitHub's spec-kit project"
2. What Speck adds: "extending it for Claude Code users with multi-repo support, stacked PR workflows, and performance optimizations"
3. Compatibility statement: "remains compatible with spec-kit"

**Additional Requirements**:
- Conditional guidance for non-Claude-Code users: "If you're not using Claude Code, consider exploring [spec-kit](https://github.com/github/spec-kit) directly"
- Link to dedicated documentation page: [About Speck & spec-kit](../about/speck-and-spec-kit.md)
- NO explicit CTA encouraging Speck users to explore spec-kit (per Q4 clarification)

**Tone**: Respectful, grateful, emphasizing extension NOT replacement

**Example Paragraph**:

> Speck builds on and remains compatible with GitHub's excellent [spec-kit](https://github.com/github/spec-kit) project, extending it for Claude Code users with multi-repo support, stacked PR workflows, and performance optimizations. If you're not using Claude Code, consider exploring spec-kit directly for specification-driven development. [Learn more about the relationship →](../about/speck-and-spec-kit.md)

**Implementation Reference**: Task T012b

---

### 3. Footer Attribution (FR-030)

**Location**: `website/src/components/Footer.astro` (or equivalent footer component)

**Content**: "Built on GitHub's spec-kit"

**Format**:
- Hyperlinked to: `https://github.com/github/spec-kit`
- Appears on ALL documentation pages
- Subtle, non-intrusive placement (standard footer attribution style)

**Implementation Reference**: Task T012d

---

### 4. Inline Contextual Attribution (FR-031)

**Scope**: ONLY core workflow features inherited from spec-kit (per Q3 clarification)

**Features Requiring Inline Attribution**:
1. **Three-phase workflow** (specify/plan/implement)
2. **Constitution concept**
3. **Template system**

**Features NOT Requiring Inline Attribution** (Speck extensions):
- Multi-repo support
- Stacked PR workflows
- Virtual commands / hooks
- Performance optimizations

**Attribution Frequency**: Once per feature, at first substantial mention

**Example Phrasings**:

**Three-Phase Workflow**:
> "The three-phase workflow (specify, plan, implement), inherited from spec-kit, forms the foundation of Speck's structured development approach."

**Constitution Concept**:
> "Speck extends spec-kit's constitution concept to support per-repository governance in multi-repo environments."

**Template System**:
> "Building on spec-kit's Handlebars template system, Speck provides customizable templates for specifications, plans, and tasks."

**Affected Pages**:
- `website/src/content/docs/core-concepts/workflow.md` (three-phase workflow)
- `website/src/content/docs/core-concepts/multi-repo.md` (constitution mention)
- `website/src/content/docs/advanced-features/multi-repo-support.md` (constitution mention)
- `website/src/content/docs/advanced-features/monorepos.md` (constitution/template mention)

**Implementation References**: Tasks T013, T014, T015, T031

---

## Tone Requirements (FR-032)

**Mandatory Tone Attributes**:
- **Respectful**: Always refer to "GitHub's excellent spec-kit project"
- **Grateful**: Acknowledge foundation and value ("builds on", "extends", "thanks to")
- **Compatibility-focused**: Emphasize "compatible with", not "replaces" or "improves upon"
- **Extension-oriented**: "extending it for Claude Code users" (specific use case, not general superiority)

**Canonical Tone Statement** (FR-032):
> "Speck builds on and remains compatible with GitHub's excellent spec-kit project, extending it for Claude Code users with multi-repo support, stacked PR workflows, and performance optimizations."

**Avoid**:
- ❌ "Speck improves on spec-kit..."
- ❌ "Speck fixes limitations in spec-kit..."
- ❌ "Speck is better than spec-kit..."
- ❌ "Speck replaces spec-kit..."

**Prefer**:
- ✅ "Speck builds on spec-kit..."
- ✅ "Speck extends spec-kit for Claude Code users..."
- ✅ "Thanks to spec-kit's foundation..."
- ✅ "Inheriting from spec-kit..."

---

## Dedicated Documentation Page (FR-033)

**Location**: `website/src/content/docs/about/speck-and-spec-kit.md`

**Purpose**: Comprehensive relationship explanation (linked from homepage Origins section per Q5)

**Required Content Sections**:

1. **Origin Story**
   - How Speck started as Claude Code adaptation of spec-kit
   - Gratitude to GitHub's spec-kit team
   - Vision for Claude Code optimization

2. **Inherited Features** (detailed breakdown)
   - Three-phase workflow (specify/plan/implement)
   - Constitution-based project governance
   - Handlebars template system
   - File format and directory structure conventions
   - Specification-first development methodology

3. **Speck Extensions** (what's new/different)
   - Multi-repo and monorepo support
   - Stacked PR workflows
   - Virtual command pattern with hook integration
   - Performance optimizations (sub-100ms execution)
   - Claude Code native integration (slash commands, agents, skills)

4. **Compatibility Guarantees**
   - File format 100% compatible (specs/ directory)
   - Can switch between Speck and spec-kit without data loss
   - Upstream sync capability (`/speck.pull-upstream`, `/speck.transform-upstream`)
   - Constitution alignment (Principle I: Upstream Fidelity)

5. **Positioning Statement**
   - Speck = Claude Code-optimized derivative, NOT fork or replacement
   - spec-kit = canonical upstream for spec methodology
   - Use Speck IF using Claude Code; use spec-kit for other AI assistants or standalone
   - Both tools serve different but complementary use cases

**Tone**: Same respectful, grateful tone per FR-032

**Implementation Reference**: Task T012c

---

## Validation Checklist (SC-009)

**Success Criterion**: "spec-kit attribution appears in at least 3 locations: (1) homepage hero/tagline area, (2) dedicated About/Origins section, (3) footer on all pages, with consistent respectful tone emphasizing compatibility and extension"

**Verification Steps** (Task T012e):

1. ✅ **Hero Subtitle Check**
   - Navigate to homepage
   - Verify "Built on GitHub's spec-kit" appears below main tagline
   - Verify hyperlink to https://github.com/github/spec-kit works
   - Verify visual hierarchy (subtitle, not main heading)

2. ✅ **Origins Section Check**
   - Scroll through homepage
   - Verify dedicated "About Speck & spec-kit" or "Origins" section exists
   - Verify 2-3 sentence paragraph with required elements (foundation, extensions, compatibility)
   - Verify conditional guidance for non-Claude-Code users present
   - Verify link to dedicated documentation page works

3. ✅ **Footer Check**
   - Navigate to multiple documentation pages
   - Verify "Built on GitHub's spec-kit" appears in footer on ALL pages
   - Verify hyperlink works
   - Verify non-intrusive placement

4. ✅ **Inline Attribution Check**
   - Check `workflow.md` for three-phase workflow attribution
   - Check multi-repo/monorepo pages for constitution attribution
   - Verify NO attribution on stacked PR, hooks, or performance pages (Speck extensions)

5. ✅ **Tone Consistency Check**
   - Review all attribution instances
   - Verify respectful, grateful tone
   - Verify "builds on", "extends", "compatible with" language
   - Verify NO "replaces", "improves upon", "better than" language

6. ✅ **Dedicated Page Check**
   - Navigate to `about/speck-and-spec-kit.md`
   - Verify all 5 required content sections present
   - Verify comprehensive, detailed coverage
   - Verify tone consistency

---

## Quick Reference

**spec-kit GitHub URL**: `https://github.com/github/spec-kit`

**Core Features for Inline Attribution**:
- Three-phase workflow
- Constitution concept
- Template system

**Speck Extensions (NO inline attribution)**:
- Multi-repo/monorepo
- Stacked PRs
- Virtual commands/hooks
- Performance optimizations

**Tone Keywords**:
- ✅ "builds on", "extends", "compatible with", "inherits from"
- ❌ "replaces", "improves", "better than", "fixes"

---

**Version**: 1.0
**Created**: 2025-11-22 (from clarifications session)
**Related Tasks**: T012a, T012b, T012c, T012d, T012e, T013, T014, T015, T031
