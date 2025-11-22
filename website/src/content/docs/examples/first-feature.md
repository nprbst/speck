---
title: "Your First Feature"
description: "Complete walkthrough building a dark mode toggle with Speck"
category: "examples"
order: 1
lastUpdated: 2025-11-22
tags: ["tutorial", "example", "walkthrough", "plugin", "skill"]
---

# Your First Feature: Dark Mode Toggle

This tutorial walks you through building a dark mode toggle from start to finish using Speck's three-phase workflow.

**Time**: 30-45 minutes
**Difficulty**: Beginner
**Prerequisites**: Claude Code 2.0+ with Speck plugin installed, basic understanding of web development

---

## Before You Begin: Install Speck

If you haven't installed Speck yet:

1. Open Claude Code: `claude`
2. Type: `/plugin`
3. Add marketplace: `speck-market`
4. Install: `speck` plugin

See the [Installation Guide](/docs/getting-started/installation) for detailed steps.

---

## Step 1: Specify What You're Building

Start by describing your feature in plain English. Open Claude Code and run:

```
/speck.specify
```

When prompted, describe the feature:

```
Add a dark mode toggle to the application settings. Users should be able to switch between light and dark color schemes, with their preference persisting across sessions. All UI components should render correctly in both modes.
```

Speck generates `specs/001-dark-mode-toggle/spec.md`:

```markdown
# Feature Specification: Dark Mode Toggle

## Overview

**Feature**: Dark Mode Toggle
**Created**: 2025-11-16
**Status**: Draft

## Value Proposition

Enable users to choose between light and dark color schemes, reducing eye strain during nighttime use and improving accessibility for light-sensitive users.

## User Stories

### US1: Toggle Dark Mode

**As a** user
**I want to** toggle between light and dark modes
**So that** I can reduce eye strain during nighttime use

**Acceptance Scenario**:
1. User navigates to application settings
2. User sees a dark mode toggle switch
3. User clicks the toggle
4. Application immediately switches to dark mode (no page refresh)
5. User refreshes the page
6. Application loads in dark mode (preference persisted)

## Functional Requirements

### FR-001: Dark Mode Toggle Control

**Requirement**: Application provides a toggle control for switching between light and dark modes

**Acceptance Criteria**:
- Toggle is visible in application settings
- Clicking toggle switches color palette immediately
- Visual feedback indicates current mode

### FR-002: Preference Persistence

**Requirement**: User's dark mode preference persists across browser sessions

**Acceptance Criteria**:
- Preference saved to browser local storage
- On page load, application uses saved preference
- If no saved preference, respect system `prefers-color-scheme`

### FR-003: Universal Theme Application

**Requirement**: All UI components render correctly in both light and dark modes

**Acceptance Criteria**:
- Text remains readable (4.5:1 contrast ratio minimum)
- Buttons, forms, and interactive elements styled for both modes
- Images and icons adapt to theme (if applicable)

## Success Criteria

- SC-001: 90%+ of users successfully toggle dark mode on first attempt
- SC-002: Dark mode preference persists across 100% of sessions
- SC-003: Lighthouse accessibility score remains 95+ in both modes

## Out of Scope

- Automatic dark mode based on time of day
- Custom color themes beyond light/dark
- Per-component dark mode override

## Dependencies

- Browser localStorage API
- CSS custom properties support (IE11 excluded)

## Assumptions

- Modern browser support (Chrome 90+, Firefox 88+, Safari 14+)
- No server-side preference sync (localStorage only)
```

---

## Step 2: Clarify Ambiguities

Run the clarify command:

```
/speck.clarify
```

Speck analyzes your spec and asks targeted questions:

**Q1**: Should dark mode apply to all pages, or only specific sections of the application?
**A1**: All pages and components should support dark mode.

**Q2**: What color palette should we use for dark mode (specific hex codes or design system references)?
**A2**: Use a neutral dark gray background (#1a1a1a) with off-white text (#e8e6e3) and a clay accent color (#d4a574) for highlights.

**Q3**: If a user has dark mode enabled via system preference but hasn't manually toggled, should the app respect system preference?
**A3**: Yes, respect `prefers-color-scheme: dark` by default, but allow manual override via toggle.

**Q4**: Should the toggle have any animation or transition when switching modes?
**A4**: Yes, smooth 200ms transition for background and text colors.

**Q5**: What icon/visual should the toggle use?
**A5**: Sun icon for light mode, moon icon for dark mode.

Speck updates `spec.md` with clarifications encoded directly into requirements.

### Using the Speck Skill

Before moving to planning, you can ask Speck questions about your specification:

```
What user stories are defined in this spec?
```

```
What are the success criteria?
```

```
List all functional requirements
```

The Speck skill helps you understand what you've specified before diving into technical implementation.

---

## Step 3: Plan the Implementation

Now design the technical implementation:

```
/speck.plan
```

Speck generates multiple planning artifacts:

### `plan.md` - Technical Summary

```markdown
## Technical Context

**Language/Version**: TypeScript 5.3+ with React 18.2+
**Primary Dependencies**: None (vanilla CSS custom properties)
**Storage**: Browser localStorage
**Testing**: Jest (unit tests), Playwright (visual regression)

## Architecture

### Dark Mode Implementation Strategy

**Decision**: CSS custom properties with localStorage persistence

**Rationale**:
- No runtime performance cost (pure CSS theme switching)
- Respects system preference via `prefers-color-scheme`
- Manual toggle overrides system preference
- Inline script in HTML head prevents FOUC (flash of unstyled content)

## Project Structure

\`\`\`
src/
├── components/
│   └── ThemeToggle.tsx       # Toggle button component
├── styles/
│   └── theme.css             # CSS custom properties for light/dark
├── utils/
│   └── theme.ts              # Theme state management
└── types/
    └── theme.ts              # TypeScript type definitions
\`\`\`
```

### `research.md` - Technical Research

```markdown
## Dark Mode Implementation Strategy

**Decision**: CSS custom properties + localStorage

**Alternatives Considered**:
1. **Tailwind dark mode**: Adds ~50KB to bundle, requires className toggling
2. **Styled-components ThemeProvider**: Runtime performance cost, unnecessary complexity
3. **CSS-in-JS**: Flash of unstyled content (FOUC) issues

**Chosen Approach**:
- Define color palette in `:root` with CSS custom properties
- Use `[data-theme="dark"]` attribute selector
- Inline script in `<head>` reads localStorage and sets theme before render
- No JavaScript flash, immediate theme application

## Color Contrast Validation

Tested with WebAIM Contrast Checker:
- Light mode: #1a1a1a text on #ffffff bg = 15.8:1 (AAA)
- Dark mode: #e8e6e3 text on #1a1a1a bg = 13.5:1 (AAA)
- Accent: #d4a574 on #1a1a1a = 5.2:1 (AA for large text)
```

### `contracts/components.ts` - TypeScript Contracts

```typescript
/**
 * ThemeToggle Component Props
 */
export interface ThemeToggleProps {
  defaultTheme?: 'light' | 'dark';
  position?: 'header' | 'settings';
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

/**
 * Theme State
 */
export type ThemeMode = 'light' | 'dark';

export interface ThemeState {
  current: ThemeMode;
  toggle: () => void;
  setTheme: (theme: ThemeMode) => void;
}
```

### Exploring the Plan with the Skill

Before generating tasks, use the Speck skill to understand your technical plan:

```
What's the technical approach for this feature?
```

```
What dependencies are needed?
```

```
Show me the project structure
```

This helps you validate the approach before starting implementation.

---

## Step 4: Generate Tasks

Break down the plan into actionable tasks:

```
/speck.tasks
```

Speck generates `tasks.md`:

```markdown
## Phase 1: Setup

- [ ] T001 Install development dependencies (TypeScript, testing tools)
- [ ] T002 [P] Create `src/types/theme.ts` with ThemeMode type
- [ ] T003 [P] Create `src/styles/theme.css` for CSS custom properties

## Phase 2: Core Implementation

- [ ] T004 Implement theme.css with light/dark color palettes
- [ ] T005 Implement theme state management in `src/utils/theme.ts`
- [ ] T006 Add theme initialization script to index.html head (prevent FOUC)
- [ ] T007 Implement ThemeToggle component in `src/components/ThemeToggle.tsx`

## Phase 3: Integration

- [ ] T008 Add ThemeToggle to application settings page
- [ ] T009 Import theme.css in main application entry point
- [ ] T010 Test theme persistence across page refreshes

## Phase 4: Testing & Validation

- [ ] T011 Unit test: Theme toggle switches state correctly
- [ ] T012 Unit test: localStorage saves and loads preference
- [ ] T013 Visual test: Screenshot comparison light vs dark (Playwright)
- [ ] T014 Accessibility test: Color contrast meets WCAG AA (Axe-core)
- [ ] T015 Manual test: Theme works without JavaScript (fallback to system preference)

**Total Tasks**: 15
**Estimated Time**: 3-4 hours
```

### Checking Tasks with the Skill

During implementation, ask Speck about task status:

```
What tasks are pending?
```

```
Show me the task dependencies
```

```
What's next in the implementation?
```

The skill provides real-time visibility into your progress.

---

## Step 5: Implement

Execute the tasks automatically:

```
/speck.implement
```

Speck reads the tasks and implements them in dependency order.

### T004: Implement theme.css

```css
/* src/styles/theme.css */
:root {
  --color-bg: #ffffff;
  --color-text: #1a1a1a;
  --color-accent: #d4a574;
  --color-border: #e0e0e0;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-bg: #1a1a1a;
    --color-text: #e8e6e3;
    --color-accent: #d4a574;
    --color-border: #2a2a2a;
  }
}

[data-theme="light"] {
  --color-bg: #ffffff;
  --color-text: #1a1a1a;
  --color-accent: #d4a574;
  --color-border: #e0e0e0;
}

[data-theme="dark"] {
  --color-bg: #1a1a1a;
  --color-text: #e8e6e3;
  --color-accent: #d4a574;
  --color-border: #2a2a2a;
}

body {
  background-color: var(--color-bg);
  color: var(--color-text);
  transition: background-color 200ms, color 200ms;
}
```

### T005: Implement theme.ts

```typescript
// src/utils/theme.ts
import type { ThemeMode } from '@/types/theme';

const STORAGE_KEY = 'app-theme';

export function getStoredTheme(): ThemeMode | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'light' || stored === 'dark' ? stored : null;
}

export function saveTheme(theme: ThemeMode): void {
  localStorage.setItem(STORAGE_KEY, theme);
}

export function applyTheme(theme: ThemeMode): void {
  document.documentElement.setAttribute('data-theme', theme);
}

export function getSystemTheme(): ThemeMode {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

export function initializeTheme(): ThemeMode {
  const stored = getStoredTheme();
  const theme = stored ?? getSystemTheme();
  applyTheme(theme);
  return theme;
}
```

### T006: Add theme initialization script

```html
<!-- index.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>App</title>
  <script>
    // Run before page render to prevent FOUC
    (function() {
      const stored = localStorage.getItem('app-theme');
      const theme = stored ||
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      document.documentElement.setAttribute('data-theme', theme);
    })();
  </script>
  <link rel="stylesheet" href="/src/styles/theme.css">
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
```

### T007: Implement ThemeToggle component

```tsx
// src/components/ThemeToggle.tsx
import { useState, useEffect } from 'react';
import { getStoredTheme, saveTheme, applyTheme, getSystemTheme } from '@/utils/theme';
import type { ThemeMode } from '@/types/theme';

export function ThemeToggle() {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    return getStoredTheme() ?? getSystemTheme();
  });

  useEffect(() => {
    applyTheme(theme);
    saveTheme(theme);
  }, [theme]);

  const toggle = () => {
    setThemeState(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <button
      onClick={toggle}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      className="theme-toggle"
    >
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  );
}
```

### Progress Tracking

After each task completes, Speck marks it with `[X]`:

```markdown
- [X] T001 Install development dependencies
- [X] T002 [P] Create types/theme.ts
- [X] T003 [P] Create styles/theme.css
- [X] T004 Implement theme.css with light/dark palettes
- [ ] T005 Implement theme state management
...
```

---

## Step 6: Test and Validate

After implementation, run validation:

```bash
# Run all tests
npm test

# Run Lighthouse audit
npm run lighthouse

# Visual regression tests
npm run test:visual
```

Expected results:
- ✅ Unit tests pass (theme toggle, localStorage)
- ✅ Visual tests pass (no unexpected UI changes)
- ✅ Accessibility score 95+ (WCAG AA contrast)
- ✅ Dark mode persists across sessions

---

## What You've Learned

1. **Technology-agnostic specification**: Spec doesn't mention React, CSS, or localStorage—just user outcomes
2. **Technical research**: Plan documents *why* you chose CSS custom properties over alternatives
3. **Dependency-ordered tasks**: Setup → Core → Integration → Testing
4. **Automated validation**: Tests run automatically to verify requirements

---

## Next Steps

Now that you've built your first feature with Speck:

- **Try a more complex feature**: Add authentication, file upload, or data visualization
- **Explore contracts**: Use TypeScript interfaces to define API boundaries
- **Read the concepts guide**: Understand the [three-phase workflow](/docs/concepts/workflow) in depth
- **Check the commands reference**: See all available [Speck commands](/docs/commands/reference)

### Advanced Workflows

Ready to scale beyond single-repo projects?

- **Multi-Repo Projects**: Coordinate features across frontend/backend repositories - [Multi-Repo Workflow Tutorial](/docs/examples/multi-repo-workflow)
- **Stacked PR Workflows**: Break large features into reviewable chunks - [Stacked PR Tutorial](/docs/examples/stacked-pr-workflow)
- **Monorepo Support**: Manage multiple workspace projects - [Learn more](/docs/advanced-features/monorepos)

---

**Questions?** Open a GitHub Discussion or check the [troubleshooting guide](/docs/getting-started/installation#troubleshooting).
