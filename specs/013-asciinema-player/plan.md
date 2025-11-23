# Implementation Plan: asciinema Player Integration

**Branch**: `013-asciinema-player` | **Date**: 2025-11-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/013-asciinema-player/spec.md`

## Summary

Integrate asciinema player into the Speck website to demonstrate installation and usage workflows. The feature adds a reusable Astro component that wraps the asciinema-player library, displays demos on the homepage and documentation pages, and provides graceful error handling with fallback content. This enables website visitors to see Speck in action before installing, reducing friction in the adoption decision.

## Technical Context

**Language/Version**: TypeScript 5.3+ for component logic, Astro 5.15+ for static site generation
**Primary Dependencies**: asciinema-player (core player library), astro-terminal-player (Astro wrapper), @astrojs/mdx (MDX integration for inline components), Bun (package manager)
**Storage**: `.cast` recording files stored in `website/src/assets/demos/`, component definitions in `website/src/components/`
**Testing**: Astro component testing, visual regression testing (Playwright), accessibility testing (axe-core)
**Target Platform**: Modern web browsers (Chrome 90+, Firefox 88+, Safari 14+), responsive design 320px-2560px
**Project Type**: Website enhancement (Astro static site)
**Performance Goals**:
- Page load time increase <200ms with player integration
- Player loads within 2 seconds of page load
- Responsive playback on mobile devices
**Constraints**:
- Must follow existing Speck website component patterns (TypeScript props, scoped styles)
- Must maintain compatibility with Cloudflare Pages hosting
- Must support both dark and light themes
- Must be accessible (WCAG 2.1 Level AA)
**Scale/Scope**:
- Support multiple demos across homepage and documentation pages
- Component reusability for content authors
- Recording file sizes <2MB each

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Design Evaluation (Phase 0)

✅ **Principle I: Upstream Fidelity** - PASS
This is a website enhancement feature that does not affect spec-kit methodology or core Speck workflows. The asciinema player integration is purely a documentation/marketing tool for the Speck website and has no impact on specification management workflows or upstream compatibility.

✅ **Principle II: Extension Preservation** - PASS
No extension markers required. This feature adds new website components without modifying any spec-kit or Speck core functionality.

✅ **Principle III: Specification-First Development** - PASS
The specification (spec.md) is technology-agnostic, describing user scenarios and outcomes without implementation details. Technology choices (Astro, asciinema-player) are documented in this plan, not the spec.

✅ **Principle IV: Quality Gates** - PASS
Specification passed quality validation with 13 functional requirements, 8 measurable success criteria, and 3 prioritized user stories. All requirements are testable and unambiguous. Quality checklist completed at `checklists/requirements.md`.

✅ **Principle V: Claude Code Native** - PASS
This feature does not add new Claude Code commands or modify existing ones. It enhances the public website documentation, which indirectly supports Claude Code users by providing visual demonstrations of workflows.

✅ **Principle VI: Technology Agnosticism** - PASS
The specification focuses on user needs (seeing demos, understanding workflows) without prescribing technologies. Implementation choices (Astro components, asciinema format) are documented separately in research and planning phases.

✅ **Principle VII: File Format Compatibility** - PASS
This feature uses standard web technologies (Astro components, `.cast` recording format) and does not modify any Speck or spec-kit file formats. No impact on specification file structure.

✅ **Principle VIII: Command-Implementation Separation** - PASS
No new commands are introduced by this feature. Website components are self-contained and do not involve Claude Code command logic.

✅ **Principle IX: Code Quality Standards** - PENDING
Will be validated during implementation. All TypeScript code must pass `bun run typecheck` and `bun run lint` with zero errors. Astro components must follow established patterns from existing website codebase.

✅ **Principle X: Zero Test Regression Policy** - PENDING
Baseline test suite status will be captured before implementation. Feature completion requires zero new test failures in existing website tests.

✅ **Principle XI: Website Documentation Synchronization** - PASS
This feature IS website documentation enhancement. Implementation includes adding the component, integrating demos, and documenting usage for content authors. No external documentation sync required since the feature itself is documentation.

✅ **Principle XIII: Documentation Skill Synchronization** - PASS
After feature completion, the speck-knowledge skill will be updated to include information about the asciinema player component, its usage, and how to add new recordings. This ensures Claude AI can assist users with demo management.

**Gate Result**: ✅ PASS - Proceed to Phase 0 research

### Post-Design Evaluation (Phase 1)

✅ **Principle I: Upstream Fidelity** - PASS
Design maintains complete separation from spec-kit methodology. AsciinemaPlayer component is website-only infrastructure with no impact on specification workflows or file formats.

✅ **Principle II: Extension Preservation** - PASS
No extension markers required. Component contracts and data models are entirely Speck website-specific with no overlap with spec-kit or upstream concerns.

✅ **Principle III: Specification-First Development** - PASS
Design artifacts (research.md, data-model.md, contracts/) are derived from technology-agnostic spec. Implementation choices documented in research with clear rationale for astro-terminal-player selection.

✅ **Principle IV: Quality Gates** - PASS
Data model includes 23 validation rules (VR-001 through VR-023) mapped to all 13 functional requirements. Component props have full TypeScript interfaces with validation constraints. Error states and fallback strategies comprehensively defined.

✅ **Principle V: Claude Code Native** - PASS
Design does not introduce new commands. Component API documented in contracts/api-spec.md follows Astro conventions. Future integration with speck-knowledge skill planned for Phase 2.

✅ **Principle VI: Technology Agnosticism** - PASS
Spec remains technology-agnostic. Research.md documents rationale for Astro/asciinema-player choices based on existing website infrastructure and performance requirements.

✅ **Principle VII: File Format Compatibility** - PASS
Component uses standard `.cast` file format (asciinema v2 JSON). No modifications to Speck or spec-kit file formats. Website-specific storage in website/src/assets/demos/.

✅ **Principle VIII: Command-Implementation Separation** - PASS
No commands involved. Component logic is self-contained in Astro components with TypeScript interfaces defined in contracts/component-props.ts.

✅ **Principle IX: Code Quality Standards** - PENDING
Design includes full TypeScript interfaces with validation rules. Implementation must pass `bun run typecheck` and `bun run lint` with zero errors before feature completion.

✅ **Principle X: Zero Test Regression Policy** - PENDING
Test baseline will be captured before implementation. Visual regression tests (Playwright), accessibility tests (axe-core), and component unit tests specified in project structure.

✅ **Principle XI: Website Documentation Synchronization** - PASS
This feature IS website documentation. Quickstart.md provides complete developer guide for adding/maintaining demos. API documentation in contracts/api-spec.md covers all component props and usage patterns.

✅ **Principle XIII: Documentation Skill Synchronization** - PENDING
After implementation, speck-knowledge skill will be updated with: component usage patterns, recording creation workflow, troubleshooting common issues. This task will be included in Phase 2 tasks.md.

**Gate Result**: ✅ PASS - Proceed to Phase 2 (tasks generation)

## Project Structure

### Documentation (this feature)

```text
specs/013-asciinema-player/
├── spec.md              # Feature specification
├── plan.md              # This file (/speck:plan command output)
├── research.md          # Phase 0 output (asciinema player integration patterns)
├── data-model.md        # Phase 1 output (component props, recording metadata)
├── quickstart.md        # Phase 1 output (developer guide for adding demos)
├── contracts/           # Phase 1 output (component API contracts)
│   ├── component-props.ts   # TypeScript interfaces for AsciinemaPlayer
│   └── api-spec.md          # Component usage API documentation
└── tasks.md             # Phase 2 output (/speck:tasks command - NOT YET CREATED)
```

### Source Code (repository root)

```text
website/
├── src/
│   ├── assets/
│   │   └── demos/           # .cast recording files
│   │       ├── speck-install.cast      # Installation demo
│   │       ├── speck-specify.cast      # Specification creation demo
│   │       └── fallbacks/              # Fallback screenshots/descriptions
│   ├── components/
│   │   ├── AsciinemaPlayer.astro       # Main player component
│   │   └── ErrorFallback.astro         # Error state component (optional)
│   ├── pages/
│   │   └── index.astro                 # Homepage (demo section integration)
│   ├── styles/
│   │   └── global.css                  # asciinema-player CSS import
│   └── layouts/
│       └── DocsLayout.astro            # Documentation layout (demo support)
├── astro.config.mjs                     # Vite config for asciinema-player
├── package.json                         # Dependencies
└── tsconfig.json                        # TypeScript configuration

tests/
├── visual/
│   └── asciinema-player.spec.ts        # Visual regression tests (Playwright)
├── accessibility/
│   └── asciinema-a11y.spec.ts          # WCAG compliance tests (axe-core)
└── component/
    └── AsciinemaPlayer.test.ts         # Component unit tests
```

**Structure Decision**: Website enhancement structure. All new code lives within the existing `website/` directory, following Astro's conventions for components, assets, and pages. Test files are organized by test type (visual, accessibility, component) in the root `tests/` directory.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

*No violations detected - this section is not applicable.*

---

## Phase 0: Outline & Research

### Research Tasks

1. **Asciinema Player Integration Patterns**
   - Research: How to integrate asciinema-player with Astro 5.15+
   - Research: astro-terminal-player vs. direct asciinema-player integration
   - Research: Best practices for lazy loading terminal players
   - Decision needed: Integration approach (wrapper component vs. direct import)

2. **Component Architecture**
   - Research: Existing Speck website component patterns (CodeBlock.astro, ThemeToggle.astro)
   - Research: Astro client-side hydration strategies (client:load, client:idle, client:visible)
   - Research: Error boundary patterns in Astro components
   - Decision needed: Hydration strategy for player component

3. **Theme Integration**
   - Research: asciinema-player theme customization options
   - Research: How to access Speck's CSS variables in player styling
   - Research: Dark/light mode detection in Astro components
   - Decision needed: Custom theme vs. built-in themes

4. **Error Handling & Fallbacks**
   - Research: Detecting .cast file load failures in asciinema-player
   - Research: Retry mechanisms for failed network requests
   - Research: Fallback content strategies (screenshots, text descriptions)
   - Decision needed: Fallback implementation approach

5. **Performance Optimization**
   - Research: asciinema-player bundle size and lazy loading strategies
   - Research: Intersection Observer API for pausing out-of-viewport players
   - Research: Recording file compression and optimization techniques
   - Decision needed: Performance optimization priorities

6. **Accessibility**
   - Research: WCAG 2.1 Level AA requirements for video/animation content
   - Research: Keyboard navigation in asciinema-player
   - Research: Screen reader compatibility and ARIA labels
   - Decision needed: Required accessibility enhancements

### Research Output

*To be generated in `research.md` with format:*
```markdown
## Decision: [Topic]
**Chosen Approach**: [selected solution]
**Rationale**: [why this was chosen]
**Alternatives Considered**: [what else was evaluated]
**Tradeoffs**: [pros/cons of chosen approach]
```

---

## Phase 1: Design & Contracts

### Data Model (`data-model.md`)

**Entities to define:**

1. **AsciinemaPlayer Component**
   - Props: src, title, loop, autoPlay, speed, theme, terminalFontSize
   - State: loading, error, playing, fallbackMode
   - Events: onLoad, onError, onPlay, onPause

2. **Cast Recording Metadata**
   - Fields: filename, description, duration, createdDate, fallbackImage, fallbackText
   - Validation rules: file size <2MB, valid .cast JSON format

3. **Player Error State**
   - Fields: errorType (loadFailure, corruptFile, networkError), errorMessage, retryAttempts
   - Relationships: Links to fallback content

### Contracts (`/contracts/`)

1. **Component Props Interface** (`component-props.ts`):
```typescript
export interface AsciinemaPlayerProps {
  src: string;           // Path to .cast file
  title?: string;        // Display title
  loop?: boolean | number;  // Loop behavior
  autoPlay?: boolean;    // Auto-start playback
  speed?: number;        // Playback speed multiplier
  theme?: string;        // Theme name
  terminalFontSize?: 'small' | 'medium' | 'big';
  fallbackImage?: string;  // Path to fallback screenshot
  fallbackText?: string;   // Text description for JS-disabled
}

export interface PlayerState {
  loading: boolean;
  error: boolean;
  errorMessage?: string;
  retryCount: number;
}
```

2. **API Specification** (`api-spec.md`):
   - Component usage examples
   - Props documentation
   - Event handlers
   - Error handling patterns

### Quickstart Guide (`quickstart.md`)

**Developer guide covering:**
- Installing dependencies (bun add asciinema-player astro-terminal-player)
- Creating recordings with asciinema CLI
- Adding recordings to the assets directory
- Importing and using the AsciinemaPlayer component
- Configuring player options
- Testing player integration
- Troubleshooting common issues

---

## Next Steps

After Phase 1 completion, run:
```bash
/speck:tasks
```

This will generate `tasks.md` with implementation tasks organized by priority and dependency order.
