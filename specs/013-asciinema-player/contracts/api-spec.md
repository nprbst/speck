# Component API Specification: asciinema Player

**Feature**: 013-asciinema-player
**Date**: 2025-11-22
**Purpose**: Document the public API for AsciinemaPlayer component and usage patterns

---

## AsciinemaPlayer Component

### Import

```astro
---
import AsciinemaPlayer from '@/components/AsciinemaPlayer.astro';
import demoFile from '@/assets/demos/speck-install.cast?url';
---
```

### Basic Usage

```astro
<AsciinemaPlayer
  src={demoFile}
  title="Installing Speck via Claude Code"
/>
```

### Full Configuration

```astro
<AsciinemaPlayer
  src={demoFile}
  title="Complete Speck Workflow"
  loop={true}
  autoPlay={false}
  speed={1.2}
  theme="asciinema"
  terminalFontSize="medium"
  fallbackImage="/demos/fallbacks/workflow.png"
  fallbackText="Demonstration of creating a spec, generating a plan, and implementing tasks"
/>
```

---

## Props Reference

### Required Props

#### `src`

- **Type**: `string`
- **Description**: Path to the .cast recording file
- **Validation**: Must be non-empty string ending in `.cast` (VR-001)
- **Example**: `import demo from '@/assets/demos/install.cast?url'`

**Good**:
```astro
src={demoFile}                          // Imported asset
src="/demos/recordings/install.cast"    // Absolute path
src="./recordings/install.cast"         // Relative path
```

**Bad**:
```astro
src=""                                  // Empty string (fails VR-001)
src="/demos/video.mp4"                  // Wrong file type (fails VR-001)
src={undefined}                         // Undefined (fails VR-001)
```

---

### Optional Props

#### `title`

- **Type**: `string | undefined`
- **Default**: `undefined`
- **Description**: Display title shown above the player
- **Accessibility**: Recommended for screen readers (VR-008)
- **Example**: `"Installing Speck via Claude Code"`

**Usage**:
```astro
<AsciinemaPlayer
  src={demo}
  title="Installation Demo"  <!-- Shown as <h3> above player -->
/>
```

---

#### `loop`

- **Type**: `boolean | number`
- **Default**: `false`
- **Description**: Loop behavior for playback
- **Validation**: Must be boolean or positive integer (VR-003)

**Values**:
- `false`: Play once, stop at end
- `true`: Loop infinitely
- `number`: Loop N times (e.g., `loop={3}` plays 4 times total)

**Examples**:
```astro
<AsciinemaPlayer src={demo} loop={false} />  <!-- Play once -->
<AsciinemaPlayer src={demo} loop={true} />   <!-- Infinite loop -->
<AsciinemaPlayer src={demo} loop={3} />      <!-- Loop 3 times -->
```

---

#### `autoPlay`

- **Type**: `boolean`
- **Default**: `false`
- **Description**: Auto-start playback when component loads
- **Constraint**: Only ONE player per section should have `autoPlay: true` (VR-020)
- **Accessibility**: Auto-playing content may violate WCAG 2.1 (use sparingly)

**Usage**:
```astro
<AsciinemaPlayer src={demo} autoPlay={true} />
```

**Warning**:
```astro
<!-- BAD: Multiple autoPlay in same section -->
<section>
  <AsciinemaPlayer src={demo1} autoPlay={true} />
  <AsciinemaPlayer src={demo2} autoPlay={true} />  <!-- Violates VR-020 -->
</section>
```

---

#### `speed`

- **Type**: `number`
- **Default**: `1`
- **Description**: Playback speed multiplier
- **Validation**: Must be between 0.1 and 10 (VR-002)
- **Range**:
  - `0.5`: Half speed (slower, easier to follow)
  - `1.0`: Normal speed (recorded speed)
  - `2.0`: Double speed (faster, for experienced users)

**Examples**:
```astro
<AsciinemaPlayer src={demo} speed={0.8} />   <!-- 20% slower -->
<AsciinemaPlayer src={demo} speed={1} />     <!-- Normal speed -->
<AsciinemaPlayer src={demo} speed={1.5} />   <!-- 50% faster -->
```

---

#### `theme`

- **Type**: `'asciinema' | 'monokai' | 'solarized-dark' | 'solarized-light'`
- **Default**: `'asciinema'`
- **Description**: Theme name for player styling
- **Validation**: Must be one of the allowed themes (VR-004)

**Themes**:
- `asciinema`: Default theme (adapts to Speck's light/dark mode)
- `monokai`: Dark theme with vibrant colors
- `solarized-dark`: Solarized dark palette
- `solarized-light`: Solarized light palette

**Usage**:
```astro
<AsciinemaPlayer src={demo} theme="asciinema" />       <!-- Default -->
<AsciinemaPlayer src={demo} theme="monokai" />         <!-- Dark, vibrant -->
<AsciinemaPlayer src={demo} theme="solarized-dark" />  <!-- Solarized -->
```

---

#### `terminalFontSize`

- **Type**: `'small' | 'medium' | 'big'`
- **Default**: `'medium'`
- **Description**: Terminal font size
- **Validation**: Must be one of: small, medium, big (VR-005)

**Usage**:
```astro
<AsciinemaPlayer src={demo} terminalFontSize="small" />   <!-- Compact -->
<AsciinemaPlayer src={demo} terminalFontSize="medium" />  <!-- Default -->
<AsciinemaPlayer src={demo} terminalFontSize="big" />     <!-- Larger -->
```

---

#### `fallbackImage`

- **Type**: `string | undefined`
- **Default**: `undefined`
- **Description**: Path to fallback screenshot (shown on error or JS-disabled)
- **Validation**: Must be valid image path if provided (VR-006)
- **Recommended**: Provide for graceful degradation

**Usage**:
```astro
<AsciinemaPlayer
  src={demo}
  fallbackImage="/demos/fallbacks/install.png"
  fallbackText="Screenshot of installation process"
/>
```

---

#### `fallbackText`

- **Type**: `string | undefined`
- **Default**: `undefined`
- **Description**: Text description for fallback content (accessibility)
- **Validation**: Should be provided if `fallbackImage` is set (VR-007)
- **Accessibility**: Ensures content is accessible with JS disabled

**Usage**:
```astro
<AsciinemaPlayer
  src={demo}
  fallbackImage="/demos/fallbacks/install.png"
  fallbackText="Installation process showing: bun add speck, configuring settings, and running first command"
/>
```

---

## Usage Patterns

### Pattern 1: Homepage Demo Section

```astro
---
import AsciinemaPlayer from '@/components/AsciinemaPlayer.astro';
import installDemo from '@/assets/demos/speck-install.cast?url';
---

<section class="demo-section">
  <div class="container">
    <h2>See It In Action</h2>
    <p>Watch how easy it is to install and use Speck in Claude Code</p>

    <AsciinemaPlayer
      src={installDemo}
      title="Installing Speck via Claude Code"
      loop={true}
      speed={1.2}
      theme="asciinema"
      fallbackImage="/demos/fallbacks/install.png"
      fallbackText="Installation demonstration"
    />
  </div>
</section>
```

---

### Pattern 2: Documentation Page Demo

```astro
---
import AsciinemaPlayer from '@/components/AsciinemaPlayer.astro';
import workflowDemo from '@/assets/demos/speck-workflow.cast?url';
---

<div class="docs-demo">
  <h3>Complete Workflow Example</h3>

  <AsciinemaPlayer
    src={workflowDemo}
    title="Speck Workflow: Spec → Plan → Tasks → Implementation"
    loop={false}
    autoPlay={false}
    speed={1}
    terminalFontSize="medium"
    fallbackImage="/demos/fallbacks/workflow.png"
    fallbackText="Full workflow from specification to implementation"
  />

  <p class="demo-caption">
    This demo shows the complete Speck workflow from creating a specification
    to implementing tasks.
  </p>
</div>
```

---

### Pattern 3: Multiple Demos (Grid Layout)

```astro
---
import AsciinemaPlayer from '@/components/AsciinemaPlayer.astro';
import installDemo from '@/assets/demos/install.cast?url';
import specifyDemo from '@/assets/demos/specify.cast?url';
---

<section class="demos-grid">
  <h2>Quick Demos</h2>

  <div class="grid grid-cols-2 gap-8">
    <AsciinemaPlayer
      src={installDemo}
      title="Installation"
      loop={true}
      speed={1.5}
      terminalFontSize="small"
    />

    <AsciinemaPlayer
      src={specifyDemo}
      title="Creating a Spec"
      loop={true}
      speed={1.5}
      terminalFontSize="small"
    />
  </div>
</section>
```

**Note**: Only one player should have `autoPlay={true}` (VR-020)

---

## Error Handling

### Error States

The component automatically handles errors and displays the ErrorFallback component:

```astro
<!-- User sees this on error: -->
<div class="error-state">
  <p class="error-message">Unable to load recording. Please check your connection.</p>
  <button onclick={handleRetry}>Retry</button>
  <img src={fallbackImage} alt={title} />
  <p class="fallback-text">{fallbackText}</p>
</div>
```

### Error Types

| Error Type | Message | Retry Allowed |
|------------|---------|---------------|
| NetworkError | "Unable to load recording. Please check your connection." | Yes |
| CorruptFile | "Recording file is corrupted or invalid." | No |
| NotFound | "Recording not found. Please refresh the page." | Yes |
| TimeoutError | "Loading timed out. Please try again." | Yes |

### Retry Behavior

- Maximum 3 retry attempts
- After 3 failed retries, shows fallback content permanently
- User can manually retry by clicking retry button

---

## Accessibility Features

### Built-in Accessibility

- **ARIA Labels**: Component automatically adds `aria-label` and `aria-describedby`
- **Keyboard Navigation**:
  - `Space`: Play/Pause
  - `Arrow Left/Right`: Seek backward/forward
  - `Arrow Up/Down`: Increase/decrease speed
  - `Tab`: Focus player controls
- **Screen Reader Support**: Title and description are announced
- **Fallback Content**: Shown when JavaScript is disabled (`<noscript>`)

### WCAG 2.1 Level AA Compliance (SC-008)

- Color contrast meets AA standards
- Keyboard navigation fully supported
- Alternative text for all visual content
- No auto-play violations (when `autoPlay={false}`)

---

## Performance Considerations

### Lazy Loading

Component uses `client:visible` hydration:
```astro
<TerminalPlayer client:visible src={demo} />
```

- Player only loads when scrolled into viewport
- Reduces initial page load time
- Meets SC-007 requirement (<200ms page load increase)

### Bundle Size

- asciinema-player: ~150KB gzipped
- Loaded asynchronously via Vite code splitting
- Does not block initial page render

### Viewport Detection

- Player pauses when scrolled out of viewport (FR-010)
- Conserves CPU and battery on mobile devices
- Automatically resumes when scrolled back into view

---

## Testing

### Manual Testing Checklist

- [ ] Player loads and displays recording
- [ ] Play/pause controls work
- [ ] Keyboard navigation (space, arrows) functions
- [ ] Dark/light theme switching applies correctly
- [ ] Responsive on mobile (320px-2560px)
- [ ] Error state shows fallback content
- [ ] Retry button works (on network error)
- [ ] JavaScript-disabled fallback renders

### Automated Testing

```typescript
// Component unit test
import { test, expect } from '@playwright/test';

test('asciinema player loads and plays', async ({ page }) => {
  await page.goto('/');
  const player = page.locator('.asciinema-player');
  await expect(player).toBeVisible();

  await player.click(); // Play
  await expect(player).toHaveAttribute('data-playing', 'true');
});
```

---

## Migration Guide

### Adding a New Recording

1. **Record with asciinema CLI**:
   ```bash
   asciinema rec demos/my-demo.cast
   ```

2. **Move to assets directory**:
   ```bash
   mv demos/my-demo.cast website/src/assets/demos/
   ```

3. **Create fallback screenshot** (optional but recommended):
   ```bash
   # Take screenshot of terminal
   # Save to website/public/demos/fallbacks/my-demo.png
   ```

4. **Import and use in Astro page**:
   ```astro
   ---
   import AsciinemaPlayer from '@/components/AsciinemaPlayer.astro';
   import myDemo from '@/assets/demos/my-demo.cast?url';
   ---

   <AsciinemaPlayer
     src={myDemo}
     title="My Demo"
     fallbackImage="/demos/fallbacks/my-demo.png"
     fallbackText="Demo description"
   />
   ```

---

## Troubleshooting

### Issue: Player shows "Recording not found"

**Cause**: .cast file path is incorrect or file doesn't exist

**Solution**:
1. Verify file exists at `website/src/assets/demos/filename.cast`
2. Check import statement: `import demo from '@/assets/demos/filename.cast?url'`
3. Ensure file has `.cast` extension

---

### Issue: Player styling doesn't match site theme

**Cause**: CSS variables not properly configured

**Solution**:
1. Check `website/src/styles/global.css` has asciinema-player CSS import
2. Verify theme overrides are defined:
   ```css
   .asciinema-player {
     --background-color: var(--color-bg-secondary);
     --foreground-color: var(--color-text);
   }
   ```

---

### Issue: Player loads slowly on mobile

**Cause**: Recording file size too large or not using lazy loading

**Solution**:
1. Check recording file size (should be <2MB): `ls -lh website/src/assets/demos/`
2. Verify `client:visible` is used (not `client:load`)
3. Consider compressing recording or splitting into shorter segments

---

## API Versioning

**Current Version**: 1.0.0

### Breaking Changes Policy

- Major version bump: Breaking changes to props interface
- Minor version bump: New props added (backward compatible)
- Patch version bump: Bug fixes, no API changes

### Deprecation Notices

*None at this time*

---

## Related Documentation

- [asciinema-player Documentation](https://docs.asciinema.org/manual/player/)
- [Astro Components Guide](https://docs.astro.build/en/core-concepts/astro-components/)
- [Astro Client Directives](https://docs.astro.build/en/reference/directives-reference/#client-directives)
- [WCAG 2.1 Level AA Guidelines](https://www.w3.org/WAI/WCAG21/quickref/?currentsidebar=%23col_customize&levels=aaa)
