# Feature Specification: asciinema Player Integration

**Feature Branch**: `013-asciinema-player`
**Created**: 2025-11-22
**Status**: Draft
**Input**: User description: "Add asciinema player to demonstrate Speck installation and usage in Claude Code on homepage and documentation pages"

## Clarifications

### Session 2025-11-22

- Q: How should the player behave when a `.cast` recording file fails to load? → A: Show error message with retry button and fallback to static screenshot/description
- Q: Must demos be inline within documentation pages (not separate demo pages)? → A: Yes, demos MUST be inline within documentation pages. MDX integration is required to support this.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Homepage Installation Demo (Priority: P1)

Website visitors want to see what Speck looks like in action before installing it. They visit the homepage and immediately see a recording of the installation process in Claude Code, helping them understand what to expect and building confidence to try Speck themselves.

**Why this priority**: The homepage is the primary entry point for new users. A visual demonstration reduces friction in the decision to install and provides immediate value without requiring any interaction. This is the MVP - a single working demo that delivers core value.

**Independent Test**: Can be fully tested by visiting the homepage, locating the demo section, and verifying that the asciinema recording plays and shows the Speck installation process. Delivers immediate value by answering "what does using Speck look like?"

**Acceptance Scenarios**:

1. **Given** a visitor lands on the Speck homepage, **When** they scroll to the demo section, **Then** they see a titled asciinema player showing the installation recording
2. **Given** the demo player is visible, **When** the visitor clicks play, **Then** the recording plays showing the complete installation process in Claude Code
3. **Given** the recording is playing, **When** the visitor clicks pause or uses keyboard controls, **Then** the recording pauses and can be resumed
4. **Given** the visitor has dark mode enabled, **When** they view the demo, **Then** the player styling matches the dark theme
5. **Given** the visitor is on a mobile device, **When** they view the demo, **Then** the player is responsive and fits the screen width

---

### User Story 2 - Inline Documentation Demos (Priority: P2)

Users reading the documentation want to see specific workflows in action (like creating a spec, generating tasks, etc.) without leaving the docs page. They can watch short recordings embedded directly in the relevant documentation sections, making it easier to understand complex workflows.

**Why this priority**: Enhances documentation value and reduces confusion for complex workflows. However, the homepage demo alone provides core value, making this a valuable enhancement rather than essential MVP.

**Independent Test**: Can be tested by navigating to any documentation page with an embedded demo, playing the recording, and verifying it demonstrates the relevant workflow. Delivers value by reducing documentation confusion and improving learning outcomes.

**Acceptance Scenarios**:

1. **Given** a user is reading the installation guide, **When** they encounter the embedded demo section, **Then** they see a player showing the installation process
2. **Given** a user is reading the quick start guide, **When** they encounter the workflow demo, **Then** they see a recording of creating their first spec
3. **Given** a demo is playing in the docs, **When** the user scrolls past the player, **Then** the recording continues playing (not paused automatically)
4. **Given** multiple demos exist on one page, **When** a user plays one demo, **Then** only that demo plays (others remain paused)

---

### User Story 3 - Reusable Demo Component (Priority: P3)

Content creators (documentation authors, blog post writers) want to easily embed terminal recordings anywhere on the site without understanding asciinema implementation details. They use a consistent component with simple configuration options to add demos to new pages.

**Why this priority**: Enables scalability and consistency across the site. Not essential for initial launch but important for long-term maintenance and content creation.

**Independent Test**: Can be tested by creating a new page (or updating an existing one), importing the asciinema component with props, and verifying the recording displays correctly. Delivers value by reducing implementation complexity for content authors.

**Acceptance Scenarios**:

1. **Given** a content creator has a `.cast` recording file, **When** they import the AsciinemaPlayer component with the file path, **Then** the player renders with the recording
2. **Given** the component is imported, **When** the creator sets optional props (title, loop, autoPlay, speed, theme), **Then** the player respects those settings
3. **Given** the component is used on multiple pages, **When** the global player styling is updated, **Then** all instances reflect the updated styles consistently
4. **Given** a new recording is added to the assets folder, **When** it's referenced in the component, **Then** Astro's build process includes it correctly

---

### Edge Cases

- **File load failure**: When a `.cast` file fails to load or is corrupted, the player displays an error message with a retry button and falls back to showing a static screenshot or text description of the demo content
- How does the player handle very long recordings (>10 minutes)?
- What happens when a user has JavaScript disabled?
- How does the player behave when the viewport is very narrow (<320px)?
- What happens if multiple recordings try to autoplay simultaneously?
- How does the player handle recordings with non-standard terminal dimensions?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display an asciinema player on the homepage that demonstrates Speck installation in Claude Code
- **FR-002**: System MUST provide a reusable AsciinemaPlayer component that accepts configuration props (src, title, loop, autoPlay, speed, theme, terminalFontSize)
- **FR-003**: System MUST support embedding asciinema recordings inline within documentation pages (not separate demo pages)
- **FR-014**: System MUST integrate MDX to enable inline component embedding in documentation pages
- **FR-004**: Players MUST support standard playback controls (play, pause, seek, speed adjustment)
- **FR-005**: Players MUST support keyboard navigation and accessibility features (ARIA labels)
- **FR-006**: Players MUST adapt to the site's dark/light theme automatically
- **FR-007**: Players MUST be responsive and work on mobile devices (minimum width 320px)
- **FR-008**: System MUST store `.cast` recording files in a designated assets directory
- **FR-009**: System MUST load the asciinema-player CSS globally to ensure consistent styling
- **FR-010**: Players MUST pause when out of viewport to conserve resources
- **FR-011**: System MUST provide fallback content or messaging when JavaScript is disabled
- **FR-012**: Component MUST follow existing Speck website component patterns (TypeScript props, scoped styles, vanilla JavaScript where appropriate)
- **FR-013**: System MUST display an error message with retry button and fallback to static screenshot or text description when a `.cast` file fails to load or is corrupted

### Key Entities

- **AsciinemaPlayer Component**: Astro component that wraps the asciinema-player library with props for configuration (src, title, loop, autoPlay, speed, theme, terminalFontSize) and provides consistent styling and accessibility features
- **Cast Recording**: `.cast` file (asciinema recording format) stored in the website assets directory, containing terminal session data with timing information
- **Demo Section**: Homepage section that showcases one or more asciinema recordings, positioned after the Quick Start preview

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Visitors can view the installation demo on the homepage within 2 seconds of page load
- **SC-002**: Demo player controls are accessible via keyboard (space to play/pause, arrow keys to seek)
- **SC-003**: Player styling automatically matches the site theme (light/dark mode) with no visual inconsistencies
- **SC-004**: Player is fully functional on viewports from 320px to 2560px width
- **SC-005**: New recordings can be added to any page by content authors in under 5 minutes (import component, add props, reference file)
- **SC-006**: 100% of existing documentation pages can embed demos without layout breakage
- **SC-007**: Page load time increases by less than 200ms with player integration (measured on homepage)
- **SC-008**: Player achieves WCAG 2.1 Level AA compliance for accessibility

## Scope

### In Scope

- Integration of asciinema-player library into Astro website
- Creation of reusable AsciinemaPlayer Astro component
- **MDX integration for inline component embedding in documentation pages**
- **Conversion of existing documentation pages from Markdown to MDX**
- Homepage demo section with installation recording
- Inline demos embedded within documentation pages
- Component styling that matches Speck's design system (theme variables, clay accent)
- Dark/light theme support for player
- Responsive design (mobile to desktop)
- Keyboard accessibility and ARIA labels
- Documentation for using the component
- Storage structure for `.cast` files
- Configuration options (loop, autoPlay, speed, theme, title)

### Out of Scope

- Recording the actual `.cast` demo files (assumed to be created separately)
- Automated recording generation or CI/CD integration
- Video format support (MP4, WebM) - only asciinema `.cast` format
- Custom player controls beyond asciinema-player's built-in features
- Recording editing or post-processing tools
- Analytics tracking for demo engagement
- Transcription or closed captions for recordings
- Multiple language support for recordings
- Interactive tutorials or step-by-step overlays on recordings

## Assumptions

- The website is built with Astro 5.15+ and hosted on Cloudflare Pages
- Node.js package manager (Bun) is used for dependency management
- `.cast` recording files will be provided (not generated by this feature)
- The `astro-terminal-player` package is compatible with Astro 5.15+
- The `@astrojs/mdx` package is compatible with Astro 5.15+
- The website already has a design system with CSS variables for theming
- The homepage has a suitable location for adding the demo section (after Quick Start)
- Documentation pages are currently pure Markdown and will be converted to MDX
- MDX conversion will not break existing documentation rendering or navigation
- Browser support requirements align with Astro's defaults (modern browsers)
- Visitors have JavaScript enabled (graceful degradation for JS-disabled users)
- Recording file sizes are reasonable (<2MB per file)
- The website build process supports importing assets from the assets directory

## Dependencies

- **External Libraries**:
  - `asciinema-player` (core player library)
  - `astro-terminal-player` (Astro wrapper component)
  - `@astrojs/mdx` (MDX integration for Astro)
- **Website Infrastructure**:
  - Existing Astro website codebase
  - Astro build pipeline and asset handling
  - Global CSS system for theme variables
  - Component patterns established in existing codebase
- **Content Dependencies**:
  - `.cast` recording files for demos (assumed to be created outside this feature)
- **Design System**:
  - CSS variables for colors, spacing, borders, radius
  - Dark/light theme toggle functionality

## Development Methodology

**TDD Exemption**: This feature is exempt from TDD workflow (Constitution Principle XII) due to:

- **Visual/behavioral component testing**: This is primarily a website component integration that renders an interactive player. Testing focuses on visual appearance, responsive behavior, accessibility, and user interaction rather than complex business logic requiring unit tests.
- **Library-provided functionality**: Core player functionality is provided by the asciinema-player library (maintained externally). Our component is a thin Astro wrapper with configuration and error handling.
- **Sufficient coverage via integration testing**: Accessibility testing (@axe-core/playwright), visual regression testing (browser-based), and manual keyboard navigation testing provide comprehensive coverage for this component's primary concerns.
- **No critical business logic**: Component does not contain complex algorithms, data transformations, or critical business rules that would benefit from fine-grained unit test coverage.
- **Qualifies as trivial feature per Constitution**: Estimated <200 lines of component code, no complex logic, no external integrations beyond library usage.

**Testing Strategy**: While exempt from TDD red-green-refactor workflow, the feature includes comprehensive validation via Phase 6 tasks (T054-T066): accessibility audits, keyboard navigation testing, screen reader compatibility, responsive behavior verification, and performance measurement.

## Open Questions

None - all requirements are sufficiently specified for planning and implementation.
