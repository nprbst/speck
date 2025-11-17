# Implementation Plan: Website Content Update for Plugin Installation

**Branch**: `006-website-content-update` | **Date**: 2025-11-17 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/006-website-content-update/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Update the Speck public website to reflect the new plugin-based installation method (from spec 002) and the Speck skill feature (from spec 005). Replace git clone installation instructions with `/plugins` command instructions, document the Speck skill for natural language interaction with specs/plans/tasks, and ensure all website content accurately reflects current features.

## Technical Context

**Language/Version**: TypeScript 5.7+ (Astro components), Markdown (content)
**Primary Dependencies**: Astro 5.15+, Shiki 3.15+ (syntax highlighting), Playwright (testing), Axe-core (accessibility)
**Storage**: Static site (no database), content files in `website/src/content/docs/`
**Testing**: Playwright (visual regression), Axe-core (accessibility), Astro type checking
**Target Platform**: Static site hosted on Cloudflare Pages, modern browsers (ES2020+)
**Project Type**: Web (static site generator)
**Performance Goals**: <1s first contentful paint, 100 Lighthouse score, SEO-optimized
**Constraints**: Static content only (no dynamic server), must maintain existing site structure
**Scale/Scope**: ~20 documentation pages, 5 primary sections (getting-started, concepts, commands, examples, comparison)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Upstream Fidelity
**Status**: ✅ PASS
**Rationale**: This feature updates website content only. It does not modify core Speck functionality or workflows that need to maintain spec-kit compatibility. The website is a Speck-specific enhancement (spec 004) and has no upstream equivalent.

### II. Extension Preservation
**Status**: ✅ PASS
**Rationale**: No upstream sync involved. This is pure Speck content (website from spec 004, documenting plugin features from spec 002 and skill from spec 005).

### III. Specification-First Development
**Status**: ✅ PASS
**Rationale**: Feature spec (spec.md) is complete with user scenarios, functional requirements, and success criteria. No implementation details present in spec (Astro, TypeScript, etc. only mentioned in this plan).

### IV. Quality Gates
**Status**: ✅ PASS
**Rationale**: Specification includes all mandatory sections: User Scenarios & Testing (2 user stories with acceptance scenarios), Requirements (9 functional requirements), Success Criteria (5 measurable outcomes). Edge cases documented. No `[NEEDS CLARIFICATION]` markers present.

### V. Claude Code Native
**Status**: ✅ PASS
**Rationale**: Website content updates document Claude Code slash commands and skills. The implementation uses static files (no CLI tools needed). No violations.

### VI. Technology Agnosticism
**Status**: ✅ PASS
**Rationale**: Feature spec remains technology-agnostic (mentions "website" and "documentation" but not Astro or specific frameworks). Technical details only appear in this plan.

### VII. File Format Compatibility
**Status**: ✅ PASS
**Rationale**: Website content is a Speck-specific enhancement. No impact on `specs/` directory structure or spec-kit compatibility. All spec artifacts (spec.md, plan.md) follow standard format.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
website/
├── src/
│   ├── content/docs/              # Markdown content files (PRIMARY WORK AREA)
│   │   ├── getting-started/
│   │   │   ├── installation.md    # UPDATE: Plugin installation
│   │   │   └── quick-start.md     # UPDATE: Plugin workflow
│   │   ├── concepts/
│   │   │   └── workflow.md        # UPDATE: Document Speck skill
│   │   ├── commands/
│   │   │   └── reference.md       # UPDATE: Add skill reference
│   │   └── examples/
│   │       └── first-feature.md   # UPDATE: Plugin-based examples
│   ├── components/                 # Astro components (minimal changes)
│   ├── layouts/                    # Page layouts (no changes expected)
│   └── pages/
│       └── index.astro            # UPDATE: Homepage hero/features
├── public/                         # Static assets (no changes)
└── scripts/
    └── sync-docs.ts               # Doc sync script (no changes)

tests/                             # Test files (add new tests)
└── visual/                        # Playwright visual regression tests
```

**Structure Decision**: This is a static site (Astro) within the monorepo. Primary work focuses on updating Markdown content files in `website/src/content/docs/` to reflect plugin installation and Speck skill. Homepage (`index.astro`) also needs updates to reflect new features.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**No violations** - All constitutional principles pass. See Constitution Check section above.

---

## Post-Design Constitution Re-Check

*Performed after Phase 1 design artifacts (research.md, data-model.md, contracts/, quickstart.md) were generated.*

### I. Upstream Fidelity
**Status**: ✅ PASS (unchanged)
**Rationale**: Design artifacts confirm website-only changes. No impact on spec-kit compatibility.

### II. Extension Preservation
**Status**: ✅ PASS (unchanged)
**Rationale**: No upstream sync involved.

### III. Specification-First Development
**Status**: ✅ PASS (unchanged)
**Rationale**: All design artifacts remain implementation-focused (Phase 1). Spec.md remains technology-agnostic.

### IV. Quality Gates
**Status**: ✅ PASS (unchanged)
**Rationale**: Design phase complete with all required artifacts: research.md (decisions documented), data-model.md (content entities defined), contracts/ (validation schemas and requirements), quickstart.md (developer guide).

### V. Claude Code Native
**Status**: ✅ PASS (unchanged)
**Rationale**: Implementation will document Claude Code plugin and skill features.

### VI. Technology Agnosticism
**Status**: ✅ PASS (unchanged)
**Rationale**: Technical details confined to plan.md and design artifacts. Spec.md remains agnostic.

### VII. File Format Compatibility
**Status**: ✅ PASS (unchanged)
**Rationale**: Standard spec structure maintained.

**Conclusion**: All constitutional principles continue to pass after design phase. No violations or concerns.

---

## Design Artifacts Summary

**Phase 0 - Research**:
- [research.md](./research.md): Plugin installation workflow, Speck skill capabilities, documentation structure decisions

**Phase 1 - Design**:
- [data-model.md](./data-model.md): Content entities (Installation Guide, Quick Start, Workflow Concepts, Commands Reference, Plugin Update Guide, Homepage)
- [contracts/](./contracts/): Content frontmatter schema, content requirements with validation rules
- [quickstart.md](./quickstart.md): Developer implementation guide with step-by-step instructions

**Next Phase**:
- Phase 2: Run `/speck.tasks` to generate tasks.md with actionable implementation tasks

---

## Implementation Notes

### Key Changes
1. **Installation Method**: Git clone → `/plugin` command
2. **Prerequisites**: Bun + Git → Claude Code with plugin support
3. **New Feature**: Speck skill documentation (natural language queries)
4. **Update Process**: Plugin marketplace updates

### Files to Modify
- `website/src/content/docs/getting-started/installation.md` (HIGH priority)
- `website/src/content/docs/getting-started/quick-start.md` (HIGH priority)
- `website/src/pages/index.astro` (HIGH priority)
- `website/src/content/docs/concepts/workflow.md` (MEDIUM priority)
- `website/src/content/docs/commands/reference.md` (MEDIUM priority)
- `website/src/content/docs/examples/first-feature.md` (LOW priority)

### Validation Strategy
- Content search: No "git clone" in primary installation paths
- Link validation: All internal links work
- Schema validation: Frontmatter matches schema
- Manual testing: Follow installation guide as new user
- Accessibility: Run axe-core tests
- Visual regression: Playwright tests

### Success Metrics
- Installation time: <5 minutes (SC-001)
- `/plugins` coverage: 100% (SC-002)
- Skill understanding: <2 minutes (SC-003)
- Feature accuracy: Reflects specs 002, 005 (SC-004)
- Update clarity: Clear marketplace workflow (SC-005)
