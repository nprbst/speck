# Data Model: asciinema Player Integration

**Feature**: 013-asciinema-player
**Date**: 2025-11-22
**Purpose**: Define entities, attributes, relationships, and validation rules for asciinema player components

---

## Entity: AsciinemaPlayer Component

**Description**: Astro component that wraps the asciinema-player library to display terminal recordings with configuration options, error handling, and fallback content.

### Attributes

| Attribute | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| src | string | Yes | - | Path to .cast recording file (relative or absolute) |
| title | string | No | undefined | Display title shown above player |
| loop | boolean \| number | No | false | Loop behavior (true = infinite, number = loop count) |
| autoPlay | boolean | No | false | Auto-start playback on load |
| speed | number | No | 1 | Playback speed multiplier (0.5 = half speed, 2 = double speed) |
| theme | string | No | 'asciinema' | Theme name (asciinema, monokai, solarized-dark, solarized-light) |
| terminalFontSize | 'small' \| 'medium' \| 'big' | No | 'medium' | Terminal font size |
| fallbackImage | string | No | undefined | Path to fallback screenshot (shown on error or JS-disabled) |
| fallbackText | string | No | undefined | Text description (shown on JS-disabled) |

### Internal State

| State | Type | Description |
|-------|------|-------------|
| loading | boolean | True while recording is loading |
| error | boolean | True if recording failed to load |
| errorMessage | string | Human-readable error description |
| retryCount | number | Number of retry attempts made (max 3) |
| isPlaying | boolean | Current playback state |
| isVisible | boolean | Whether component is in viewport |

### Validation Rules

1. **VR-001**: `src` MUST be a non-empty string ending in `.cast`
2. **VR-002**: `speed` MUST be a positive number between 0.1 and 10
3. **VR-003**: `loop` MUST be either boolean or positive integer
4. **VR-004**: `theme` MUST be one of: 'asciinema', 'monokai', 'solarized-dark', 'solarized-light'
5. **VR-005**: `terminalFontSize` MUST be one of: 'small', 'medium', 'big'
6. **VR-006**: If `fallbackImage` is provided, it MUST be a valid image path (png, jpg, webp)
7. **VR-007**: `fallbackText` SHOULD be provided if `fallbackImage` is provided (accessibility)
8. **VR-008**: `title` SHOULD be provided for accessibility (screen readers)

### Lifecycle

```
State: Initial → Loading → Loaded → Playing/Paused
         ↓
       Error → Retry (max 3x) → Fallback
```

**State Transitions**:
1. **Initial → Loading**: Component mounts, begins fetching .cast file
2. **Loading → Loaded**: File successfully fetched and parsed
3. **Loaded → Playing**: User clicks play or autoPlay is true
4. **Playing → Paused**: User clicks pause or scrolls out of viewport
5. **Loading → Error**: File fetch fails, parse error, or corrupted data
6. **Error → Retry**: User clicks retry button (if retryCount < 3)
7. **Error → Fallback**: Max retries exceeded, displays fallback content

### Relationships

- **Contains**: ErrorFallback component (shown on error state)
- **Uses**: asciinema-player library (external)
- **References**: CastRecording entity (via src attribute)

---

## Entity: CastRecording

**Description**: Metadata and file information for `.cast` terminal recording files stored in the assets directory.

### Attributes

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| filename | string | Yes | Filename with .cast extension |
| path | string | Yes | Full path relative to assets directory |
| title | string | Yes | Human-readable title for display |
| description | string | No | Longer description of recording content |
| duration | number | No | Recording duration in seconds (from .cast metadata) |
| createdDate | string | No | ISO 8601 date recording was created |
| fileSize | number | No | File size in bytes (should be <2MB) |
| fallbackImage | string | No | Associated fallback screenshot path |
| fallbackText | string | No | Associated fallback text description |
| category | string | No | Category (installation, workflow, feature-demo) |

### Validation Rules

1. **VR-009**: `filename` MUST end with `.cast` extension
2. **VR-010**: `path` MUST start with `website/src/assets/demos/`
3. **VR-011**: `fileSize` MUST be less than 2,097,152 bytes (2MB)
4. **VR-012**: `duration` MUST be a positive number (if provided)
5. **VR-013**: `createdDate` MUST be valid ISO 8601 format (if provided)
6. **VR-014**: `category` MUST be one of: 'installation', 'workflow', 'feature-demo' (if provided)
7. **VR-015**: `fallbackImage` MUST exist at specified path (if provided)

### File Format (.cast JSON structure)

```json
{
  "version": 2,
  "width": 80,
  "height": 24,
  "timestamp": 1701388800,
  "title": "Speck Installation Demo",
  "env": {
    "SHELL": "/bin/zsh",
    "TERM": "xterm-256color"
  },
  "stdout": [
    [0.5, "$ "],
    [1.2, "bun add speck\n"],
    ...
  ]
}
```

**Validation** (VR-016): .cast file MUST be valid JSON conforming to asciinema v2 format

---

## Entity: DemoSection

**Description**: Homepage or documentation section that contains one or more asciinema player instances.

### Attributes

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| sectionId | string | Yes | Unique identifier for section |
| title | string | Yes | Section heading |
| description | string | No | Section description text |
| players | AsciinemaPlayer[] | Yes | Array of player components in section |
| layout | 'single' \| 'grid' | No | Layout style (default: single) |

### Validation Rules

1. **VR-017**: `sectionId` MUST be unique within the page
2. **VR-018**: `players` array MUST contain at least 1 player
3. **VR-019**: If `layout` is 'grid', `players` array SHOULD contain 2-4 items for best UX
4. **VR-020**: Only ONE player per section MAY have `autoPlay: true` (prevent conflicts)

### Relationships

- **Contains**: 1 or more AsciinemaPlayer components
- **Positioned**: After Quick Start Preview on homepage (per spec)

---

## Entity: ErrorFallback

**Description**: Component displayed when .cast file fails to load, providing retry functionality and static content.

### Attributes

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| errorMessage | string | Yes | Human-readable error description |
| canRetry | boolean | Yes | Whether retry button should be shown |
| onRetry | () => void | Yes | Callback function for retry button |
| fallbackImage | string | No | Path to screenshot fallback |
| fallbackText | string | No | Text description fallback |

### Validation Rules

1. **VR-021**: `errorMessage` MUST be non-empty and user-friendly
2. **VR-022**: If `canRetry` is true, `onRetry` callback MUST be provided
3. **VR-023**: Either `fallbackImage` or `fallbackText` SHOULD be provided (or both)

### Error Types

| Error Type | Message | Retry Allowed |
|------------|---------|---------------|
| NetworkError | "Unable to load recording. Please check your connection." | Yes |
| CorruptFile | "Recording file is corrupted or invalid." | No |
| NotFound | "Recording not found. Please refresh the page." | Yes |
| TimeoutError | "Loading timed out. Please try again." | Yes |

---

## Validation Rule Summary

### Component Props Validation (FR-002)

- VR-001: src format validation
- VR-002: speed range validation
- VR-003: loop type validation
- VR-004: theme enum validation
- VR-005: fontSize enum validation
- VR-006: fallbackImage format validation
- VR-007: fallbackText co-requirement
- VR-008: title accessibility requirement

### Recording File Validation (FR-008)

- VR-009: filename extension validation
- VR-010: path location validation
- VR-011: file size limit (<2MB)
- VR-012: duration range validation
- VR-013: date format validation
- VR-014: category enum validation
- VR-015: fallback file existence
- VR-016: .cast JSON format validation

### Section Validation (FR-001)

- VR-017: section ID uniqueness
- VR-018: minimum player count
- VR-019: grid layout sizing
- VR-020: single autoplay per section

### Error Handling Validation (FR-013)

- VR-021: error message quality
- VR-022: retry callback requirement
- VR-023: fallback content availability

---

## Mapping to Functional Requirements

| Requirement | Related Entities | Validation Rules |
|-------------|------------------|------------------|
| FR-001 | DemoSection, AsciinemaPlayer | VR-017, VR-018 |
| FR-002 | AsciinemaPlayer | VR-001 through VR-008 |
| FR-003 | AsciinemaPlayer, DemoSection | VR-017, VR-018 |
| FR-004 | AsciinemaPlayer (built-in) | N/A (library feature) |
| FR-005 | AsciinemaPlayer (ARIA) | VR-008 (title for a11y) |
| FR-006 | AsciinemaPlayer (theme) | VR-004 (theme validation) |
| FR-007 | AsciinemaPlayer (responsive) | N/A (CSS-based) |
| FR-008 | CastRecording | VR-009 through VR-016 |
| FR-009 | N/A (global CSS) | N/A (configuration) |
| FR-010 | AsciinemaPlayer (state) | N/A (viewport detection) |
| FR-011 | AsciinemaPlayer (fallback) | VR-007, VR-023 |
| FR-012 | AsciinemaPlayer (pattern) | N/A (code review) |
| FR-013 | ErrorFallback | VR-021 through VR-023 |

---

## Data Flow Diagram

```
User visits page
    ↓
AsciinemaPlayer component renders (SSR)
    ↓
Component enters viewport
    ↓
client:visible hydration triggered
    ↓
Fetch .cast file from assets
    ↓
    ├─ Success → Parse JSON → Initialize player → Ready state
    │                             ↓
    │                        User interactions
    │                             ↓
    │                        Play/Pause/Seek
    │
    └─ Error → Update error state → Display ErrorFallback
                    ↓
                User clicks retry?
                    ├─ Yes → Retry fetch (max 3x)
                    └─ No → Show fallback content (image/text)
```

---

## Storage Locations

### Production Files

```
website/src/assets/demos/
├── speck-install.cast              # Installation demo recording
├── speck-specify.cast              # Spec creation demo recording
├── speck-workflow.cast             # Full workflow demo recording
└── fallbacks/
    ├── speck-install.png           # Installation screenshot
    ├── speck-specify.png           # Spec creation screenshot
    ├── speck-workflow.png          # Workflow screenshot
    ├── speck-install.md            # Installation text description
    ├── speck-specify.md            # Spec creation text description
    └── speck-workflow.md           # Workflow text description
```

### Component Definitions

```
website/src/components/
├── AsciinemaPlayer.astro           # Main player component
└── ErrorFallback.astro             # Error state component (optional - may be inline)
```

---

## Future Enhancements (Out of Scope)

- **Recording Catalog**: Centralized metadata file listing all recordings
- **Playback Analytics**: Track play counts, completion rates, popular recordings
- **Interactive Chapters**: Clickable timeline markers for long recordings
- **Synchronized Transcripts**: Text transcript that highlights current line
- **Recording Editor**: Web-based tool to trim, annotate, or edit recordings
- **Multi-language Recordings**: Same demo in different languages
- **CDN Optimization**: Serve recordings from CDN instead of assets directory

These enhancements are documented for future consideration but are explicitly out of scope for the initial implementation (per spec section: Out of Scope).
