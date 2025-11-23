# Technical Research: asciinema Player Integration

**Feature**: 013-asciinema-player
**Date**: 2025-11-22
**Purpose**: Resolve technical unknowns and document technology choices for asciinema player integration

---

## Decision: Integration Approach

**Chosen Approach**: Use `astro-terminal-player` package (Astro-native wrapper)

**Rationale**:
- Provides first-class Astro component with TypeScript support
- Handles SSR/client-side hydration automatically
- Includes built-in error handling and loading states
- Maintains compatibility with Astro's build pipeline
- Simpler API than direct asciinema-player integration

**Alternatives Considered**:
1. **Direct asciinema-player integration**: Requires manual client-side hydration setup, more complex error handling, but offers maximum control
2. **Custom wrapper component**: Full control over behavior, but duplicates work already done by astro-terminal-player
3. **Embed via iframe**: Isolates player but adds overhead, complicates styling, poor accessibility

**Tradeoffs**:
- **Pro**: Reduced development time, better Astro integration, maintained package
- **Pro**: Built-in TypeScript types and error boundaries
- **Con**: Dependency on third-party wrapper (small risk if abandoned)
- **Con**: Less control over player internals (acceptable for this use case)

**Implementation Notes**:
```bash
bun add asciinema-player astro-terminal-player
```

---

## Decision: Component Hydration Strategy

**Chosen Approach**: Use `client:visible` hydration directive

**Rationale**:
- Players only load when scrolled into viewport (performance optimization)
- Reduces initial page load time and bundle size
- Aligns with SC-007 requirement (<200ms page load increase)
- Natural user flow: player hydrates as user reaches demo section

**Alternatives Considered**:
1. **client:load**: Loads immediately on page load (worse performance, simpler)
2. **client:idle**: Waits for browser idle time (unpredictable timing)
3. **No hydration (Astro island pattern)**: Static only, no interactivity (violates requirements)
4. **Manual intersection observer**: More control but reinvents client:visible

**Tradeoffs**:
- **Pro**: Optimal performance for below-the-fold content
- **Pro**: Automated by Astro, no custom code needed
- **Con**: Slight delay before player is interactive (acceptable for demos)
- **Con**: Requires fallback content for SSR (already planned)

**Implementation Notes**:
```astro
<TerminalPlayer client:visible src={demoFile} />
```

---

## Decision: Theme Integration

**Chosen Approach**: Use asciinema-player's built-in `asciinema` theme with CSS variable overrides

**Rationale**:
- Built-in theme provides good defaults and accessibility
- CSS variable overrides allow matching Speck's design system
- Simpler than creating fully custom theme
- Supports dark/light mode via CSS variable swapping

**Alternatives Considered**:
1. **Full custom theme**: Maximum control but requires extensive CSS work, maintenance burden
2. **monokai/solarized themes**: Good defaults but don't match Speck branding
3. **No theming**: Uses asciinema defaults (doesn't match site design)

**Tradeoffs**:
- **Pro**: Quick implementation, leverages existing accessibility work
- **Pro**: Automatic dark/light mode support via CSS variables
- **Con**: Some visual inconsistencies may require fine-tuning
- **Con**: Limited to asciinema-player's CSS customization points

**Implementation Notes**:
```css
/* In global.css */
@import 'asciinema-player/dist/bundle/asciinema-player.css';

.asciinema-player {
  --background-color: var(--color-bg-secondary);
  --foreground-color: var(--color-text);
  /* ... more overrides for Speck's clay accent, borders, etc. */
}

[data-theme='dark'] .asciinema-player {
  --background-color: var(--color-code-bg);
  --foreground-color: var(--color-code-text);
}
```

---

## Decision: Error Handling & Fallback Strategy

**Chosen Approach**: Multi-layered fallback with error state component

**Rationale**:
- Provides graceful degradation from interactive player → static screenshot → text description
- Meets FR-013 requirement (error message + retry button + fallback)
- Maintains user experience even when .cast files fail to load
- Supports FR-011 requirement (JS-disabled fallback)

**Alternatives Considered**:
1. **Simple error message only**: Doesn't provide alternative content, poor UX
2. **Text-only fallback**: Accessible but loses visual demonstration value
3. **Automatic retry only**: May loop indefinitely on persistent failures

**Tradeoffs**:
- **Pro**: Comprehensive error handling covers multiple failure modes
- **Pro**: Maintains demo value even when player fails
- **Con**: Requires creating fallback screenshots for each recording
- **Con**: More complex component logic (acceptable for better UX)

**Implementation Notes**:

Layer 1 - Interactive player:
```astro
<TerminalPlayer
  src={castFile}
  onError={handleError}
  client:visible
/>
```

Layer 2 - Error state with retry:
```astro
{error && (
  <div class="error-state">
    <p>{errorMessage}</p>
    <button onclick={handleRetry}>Retry</button>
    <img src={fallbackImage} alt={title} />
  </div>
)}
```

Layer 3 - JavaScript-disabled fallback (SSR):
```astro
<noscript>
  <div class="static-fallback">
    <img src={fallbackImage} alt={title} />
    <p>{fallbackText}</p>
  </div>
</noscript>
```

---

## Decision: Performance Optimization Strategy

**Chosen Approach**: Combination of lazy loading, viewport detection, and bundle optimization

**Rationale**:
- Multi-pronged approach addresses SC-007 (<200ms page load increase)
- Intersection Observer API already built into Astro's client:visible
- Vite optimization ensures asciinema-player bundle is properly chunked
- Meets performance goals without custom infrastructure

**Alternatives Considered**:
1. **Aggressive bundle splitting**: Complex webpack/vite config, diminishing returns
2. **CDN hosting for player**: External dependency, no version control
3. **Manual lazy loading**: Reinvents Astro's built-in features

**Tradeoffs**:
- **Pro**: Leverages Astro's built-in optimizations (minimal custom code)
- **Pro**: Scalable approach works for multiple demos on one page
- **Con**: Still adds ~150KB to bundle (acceptable, within 200ms budget)
- **Con**: First-time visitors experience full download (cached thereafter)

**Implementation Notes**:

1. **Vite Configuration** (`astro.config.mjs`):
```javascript
export default defineConfig({
  vite: {
    optimizeDeps: {
      include: ['asciinema-player']
    }
  }
});
```

2. **Pause Out-of-Viewport** (handled by FR-010):
```astro
<TerminalPlayer
  settings={{
    pauseOnBlur: true,  // Pause when not visible
    preload: true       // Preload metadata
  }}
  client:visible
/>
```

3. **Recording Optimization**:
- Use `asciinema upload` compression
- Target <2MB per recording (assumption)
- Consider splitting very long recordings into chapters

---

## Decision: Accessibility Implementation

**Chosen Approach**: WCAG 2.1 Level AA compliance via ARIA labels, keyboard nav, and semantic HTML

**Rationale**:
- asciinema-player provides built-in keyboard navigation (space = play/pause, arrow keys = seek)
- ARIA labels enhance screen reader support
- Meets SC-008 requirement (WCAG 2.1 Level AA)
- Aligns with existing Speck website accessibility standards

**Alternatives Considered**:
1. **WCAG AAA compliance**: Higher standard but not required, significant effort
2. **Minimal accessibility**: Violates success criteria, excludes users
3. **Closed captions/transcripts**: Out of scope (documented in spec), consider for future

**Tradeoffs**:
- **Pro**: Inclusive design, meets legal/ethical requirements
- **Pro**: Built-in player features reduce custom implementation
- **Con**: Requires testing with screen readers (NVDA, JAWS, VoiceOver)
- **Con**: Fallback content maintenance (kept in sync with recordings)

**Implementation Notes**:

```astro
<div class="asciinema-wrapper">
  {title && <h3 id="demo-title-{id}">{title}</h3>}
  <TerminalPlayer
    src={src}
    aria-label={`${title} terminal recording`}
    aria-describedby="demo-title-{id}"
    role="region"
    tabindex="0"
    settings={{
      controls: true,  // Ensure controls are visible
      markers: true    // Show progress markers
    }}
  />
  <div class="sr-only">
    Press space to play or pause. Use arrow keys to seek.
  </div>
</div>
```

**Testing Requirements**:
- Keyboard-only navigation test (no mouse)
- Screen reader test (VoiceOver on macOS, NVDA on Windows)
- Automated axe-core testing in CI/CD
- Color contrast validation for custom theme

---

## Decision: Documentation Integration Approach

**Chosen Approach**: MDX integration for inline component embedding (Phase 1 - required by FR-003, FR-014)

**Rationale**:
- Mandatory requirement per spec clarification (2025-11-22 session)
- FR-003 explicitly requires "inline within documentation pages (not separate demo pages)"
- FR-014 requires MDX integration to support this
- Enables User Story 2: demos "embedded directly in relevant documentation sections"
- Provides better UX by keeping demos contextually relevant to documentation content
- Documentation pages will be converted from Markdown to MDX (per spec.md In Scope section)

**Alternatives Considered**:
1. **Dedicated demo pages**: Simpler implementation, but violates FR-003 requirement for inline embedding. Would defer MDX to future phase, blocking feature completion. Rejected per spec clarification.
2. **Iframe embedding**: Poor accessibility, complicates styling, no SEO benefit
3. **External demo site**: Fragments user experience, maintenance overhead

**Tradeoffs**:
- **Pro**: Meets mandatory requirements (FR-003, FR-014)
- **Pro**: Better UX - demos in context with relevant documentation
- **Pro**: Enables all User Story 2 acceptance scenarios
- **Pro**: Content authors can embed demos inline without leaving documentation flow
- **Con**: Requires MDX conversion of documentation pages (already in scope per spec.md:122-123)
- **Con**: Slightly more complex build process (acceptable, within project scope)

**Implementation Notes**:

Install MDX integration:
```bash
bun add @astrojs/mdx
```

Configure Astro:
```javascript
// astro.config.mjs
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

export default defineConfig({
  integrations: [mdx()],
  vite: {
    optimizeDeps: {
      include: ['asciinema-player']
    }
  }
});
```

Convert documentation pages to MDX and embed components:
```mdx
---
# installation.mdx (converted from installation.md)
---
import AsciinemaPlayer from '@/components/AsciinemaPlayer.astro';
import installDemo from '@/assets/demos/installation.cast?url';

# Installation Guide

## Quick Start

Here's what the installation process looks like:

<AsciinemaPlayer
  src={installDemo}
  title="Speck Installation Demo"
  client:visible
  fallbackImage="/demos/fallbacks/installation.png"
  fallbackText="Demonstration of installing Speck via Bun"
/>

Now that you've seen it in action, let's walk through the steps...
```

---

## Technical Dependencies Summary

### NPM Packages
- `asciinema-player` (v3.7+): Core terminal player library
- `astro-terminal-player` (v1.0+): Astro wrapper component
- `@astrojs/mdx` (v4.3+): MDX integration for inline component embedding
- `@axe-core/playwright` (dev): Accessibility testing
- `playwright` (dev): Visual regression testing

### Build Configuration
- Vite optimization for asciinema-player bundle
- CSS import in global.css
- TypeScript types from astro-terminal-player

### Runtime Dependencies
- Modern browser with JavaScript enabled
- Intersection Observer API support (95%+ browser coverage)
- CSS Grid and Flexbox support

### Content Dependencies
- `.cast` recording files (created separately with asciinema CLI)
- Fallback screenshots (PNG format, optimized)
- Fallback text descriptions (Markdown format)

---

## Open Questions Resolved

1. ✅ **Integration approach**: astro-terminal-player (Astro-native)
2. ✅ **Hydration strategy**: client:visible (viewport-based)
3. ✅ **Theme approach**: Built-in theme + CSS variable overrides
4. ✅ **Error handling**: Multi-layered fallback (player → screenshot → text)
5. ✅ **Performance**: Lazy loading + Vite optimization + viewport detection
6. ✅ **Accessibility**: WCAG 2.1 Level AA via ARIA + keyboard nav + semantic HTML
7. ✅ **Docs integration**: MDX integration for inline component embedding (Phase 1 - required by FR-003, FR-014)

All technical unknowns from plan.md Technical Context have been resolved. Ready to proceed to Phase 1 (Design & Contracts).
