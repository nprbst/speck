# Quickstart Guide: asciinema Player Integration

**Feature**: 013-asciinema-player
**Audience**: Developers adding or maintaining asciinema demos on the Speck website
**Time to Complete**: 15-30 minutes

---

## Prerequisites

- Bun 1.0+ installed
- asciinema CLI installed (`brew install asciinema` on macOS)
- Access to Speck website repository
- Basic knowledge of Astro components

---

## Installation

### 1. Install Dependencies

```bash
cd website
bun add asciinema-player astro-terminal-player
```

### 2. Configure Astro

Edit `website/astro.config.mjs`:

```javascript
import { defineConfig } from 'astro/config';

export default defineConfig({
  // ... existing config
  vite: {
    optimizeDeps: {
      include: ['asciinema-player']
    }
  }
});
```

### 3. Import Player CSS

Add to `website/src/styles/global.css`:

```css
/* asciinema player styles */
@import 'asciinema-player/dist/bundle/asciinema-player.css';

/* Custom theme overrides */
.asciinema-player {
  --background-color: var(--color-bg-secondary);
  --foreground-color: var(--color-text);
  --color-border: var(--color-border);
}

[data-theme='dark'] .asciinema-player {
  --background-color: var(--color-code-bg);
  --foreground-color: var(--color-code-text);
}
```

---

## Creating Your First Demo

### Step 1: Record a Demo

```bash
# Start recording
asciinema rec demos/my-demo.cast

# Perform your demonstration in the terminal
# Commands will be recorded with timing information

# Stop recording
# Press Ctrl+D or type 'exit'
```

**Tips for Good Recordings**:
- Set terminal to 80x24 or similar standard size
- Use clear, deliberate commands
- Add pauses (2-3 seconds) between steps
- Keep recordings under 5 minutes if possible
- Test playback before committing: `asciinema play demos/my-demo.cast`

### Step 2: Move Recording to Assets

```bash
mv demos/my-demo.cast website/src/assets/demos/
```

### Step 3: Create Fallback Screenshot (Recommended)

```bash
# Take a screenshot of the terminal showing the demo
# Save to website/public/demos/fallbacks/my-demo.png
```

**Alternative**: Use `asciinema cat` to export a frame:
```bash
asciinema cat website/src/assets/demos/my-demo.cast > output.txt
# Then screenshot the output
```

### Step 4: Create Fallback Text Description

Create `website/src/assets/demos/fallbacks/my-demo.md`:

```markdown
This demo shows how to [describe what the demo does].

Steps shown:
1. [First step]
2. [Second step]
3. [Third step]
```

---

## Using the AsciinemaPlayer Component

### Basic Usage (Homepage)

Edit `website/src/pages/index.astro`:

```astro
---
import AsciinemaPlayer from '@/components/AsciinemaPlayer.astro';
import myDemo from '@/assets/demos/my-demo.cast?url';
---

<section class="demo-section">
  <h2>Demo Title</h2>

  <AsciinemaPlayer
    src={myDemo}
    title="My Demo"
    loop={true}
    speed={1.2}
    fallbackImage="/demos/fallbacks/my-demo.png"
    fallbackText="Demonstration of [what the demo shows]"
  />
</section>
```

### Advanced Usage (Multiple Demos)

```astro
---
import AsciinemaPlayer from '@/components/AsciinemaPlayer.astro';
import demo1 from '@/assets/demos/demo1.cast?url';
import demo2 from '@/assets/demos/demo2.cast?url';
---

<section class="demos-grid">
  <h2>Quick Demos</h2>

  <div class="grid grid-cols-2 gap-8">
    <AsciinemaPlayer
      src={demo1}
      title="Installation"
      loop={true}
      speed={1.5}
      terminalFontSize="small"
    />

    <AsciinemaPlayer
      src={demo2}
      title="First Spec"
      loop={true}
      speed={1.5}
      terminalFontSize="small"
    />
  </div>
</section>
```

---

## Common Configurations

### Configuration 1: Auto-playing Hero Demo

```astro
<AsciinemaPlayer
  src={heroDemo}
  title="Speck in 60 Seconds"
  autoPlay={true}
  loop={true}
  speed={1.3}
  theme="asciinema"
/>
```

**Use Case**: Homepage hero section, high-impact first impression

---

### Configuration 2: Detailed Tutorial

```astro
<AsciinemaPlayer
  src={tutorialDemo}
  title="Complete Workflow Tutorial"
  autoPlay={false}
  loop={false}
  speed={1}
  terminalFontSize="big"
  fallbackImage="/demos/fallbacks/tutorial.png"
  fallbackText="Step-by-step tutorial showing specification, planning, and implementation"
/>
```

**Use Case**: Documentation page, in-depth learning

---

### Configuration 3: Quick Reference

```astro
<AsciinemaPlayer
  src={quickRef}
  title="Quick Command Reference"
  loop={3}
  speed={2}
  terminalFontSize="small"
/>
```

**Use Case**: Cheat sheet, fast-paced command demo

---

## Testing Your Integration

### 1. Local Development

```bash
cd website
bun run dev
```

Visit `http://localhost:4321` and verify:
- Player loads and displays recording
- Play/pause controls work
- Keyboard navigation functions (space, arrows)
- Responsive on mobile (resize browser)

### 2. Build Test

```bash
bun run build
```

Check for:
- No build errors
- Recording files are included in output
- CSS is properly bundled

### 3. Accessibility Test

```bash
# Run axe-core tests (if configured)
bun run test:a11y
```

Verify:
- ARIA labels are present
- Keyboard navigation works without mouse
- Color contrast meets WCAG AA standards

### 4. Performance Test

```bash
# Build and measure bundle size
bun run build
du -sh dist/
```

Target: Page load time increase <200ms (SC-007)

---

## Troubleshooting

### Issue: "Cannot find module 'asciinema-player'"

**Solution**:
```bash
cd website
bun install
```

Verify `asciinema-player` is in `package.json` dependencies.

---

### Issue: Player shows blank/white box

**Solution**:
1. Check CSS import in `global.css`
2. Verify `.cast` file is valid JSON:
   ```bash
   cat website/src/assets/demos/my-demo.cast | jq
   ```
3. Check browser console for errors

---

### Issue: Recording is too large (>2MB)

**Solution**:
1. Shorten the recording (split into multiple demos)
2. Compress the recording:
   ```bash
   # asciinema upload automatically compresses
   asciinema upload website/src/assets/demos/my-demo.cast
   # Download compressed version
   ```

---

### Issue: Dark mode theme not applying

**Solution**:
1. Verify theme overrides in `global.css`
2. Check `[data-theme='dark']` selector is present
3. Test theme toggle in browser

---

## Best Practices

### Recording Guidelines

✅ **DO**:
- Use standard terminal size (80x24 or 120x30)
- Add 2-3 second pauses between commands
- Use clear, descriptive command names
- Test playback before committing
- Keep recordings under 5 minutes
- Use `asciinema rec --overwrite` to replace bad recordings

❌ **DON'T**:
- Include sensitive information (API keys, passwords)
- Use non-standard terminal sizes
- Rush through commands (add pauses)
- Create very long recordings (>10 minutes)
- Use custom terminal themes that don't translate well

---

### Component Usage Guidelines

✅ **DO**:
- Always provide `title` prop for accessibility
- Include `fallbackImage` and `fallbackText` for graceful degradation
- Use `client:visible` for below-the-fold demos (performance)
- Limit `autoPlay` to ONE player per page section
- Test on mobile devices (320px width)

❌ **DON'T**:
- Set `autoPlay={true}` on multiple players in same section
- Omit fallback content (poor UX for errors/JS-disabled)
- Use very fast speeds (>2x) for tutorial content
- Forget to test keyboard navigation

---

### File Organization

```
website/src/assets/demos/
├── installation/
│   ├── basic-install.cast
│   └── custom-config.cast
├── workflows/
│   ├── specify-plan-tasks.cast
│   └── multi-repo-workflow.cast
└── fallbacks/
    ├── installation/
    │   ├── basic-install.png
    │   └── custom-config.png
    └── workflows/
        ├── specify-plan-tasks.png
        └── multi-repo-workflow.png
```

Organize by category for maintainability.

---

## Advanced Topics

### Custom Themes

Create custom theme in `global.css`:

```css
.asciinema-player.custom-theme {
  --background-color: #1a1a2e;
  --foreground-color: #eee;
  --color-0: #000;  /* black */
  --color-1: #ff6b6b;  /* red */
  --color-2: #51cf66;  /* green */
  --color-3: #ffd93d;  /* yellow */
  /* ... define all 16 colors */
}
```

Use in component:
```astro
<AsciinemaPlayer src={demo} theme="custom-theme" />
```

---

### Programmatic Control

For advanced use cases, access the player API:

```astro
<script>
  const player = document.querySelector('.asciinema-player');

  // Play from JavaScript
  player.play();

  // Seek to specific time
  player.seek(10); // 10 seconds

  // Listen to events
  player.addEventListener('play', () => console.log('Playing'));
</script>
```

---

### Recording Optimization

Reduce file size with editing:

```bash
# Install asciinema-edit (unofficial tool)
pip install asciinema-edit

# Remove pauses longer than 2 seconds
asciinema-edit --max-pause 2 input.cast output.cast

# Speed up entire recording
asciinema-edit --speed 1.5 input.cast output.cast
```

---

## Next Steps

After setting up your first demo:

1. **Create Additional Demos**: Record workflows for different use cases
2. **Update Documentation**: Add links to demos from relevant doc pages
3. **Run Full Test Suite**: `bun test` to ensure no regressions
4. **Submit PR**: Include screenshots and demo links in PR description

---

## Resources

### Documentation
- [asciinema Recording Guide](https://docs.asciinema.org/manual/cli/usage/)
- [asciinema-player API](https://docs.asciinema.org/manual/player/options/)
- [Astro Components](https://docs.astro.build/en/core-concepts/astro-components/)

### Tools
- [asciinema CLI](https://asciinema.org/)
- [asciinema-edit](https://github.com/cirocosta/asciinema-edit) (unofficial)
- [ttygif](https://github.com/icholy/ttygif) (convert to GIF)

### Examples
- See `website/src/pages/index.astro` for homepage integration
- See `website/src/pages/demos/` for dedicated demo pages
- See `specs/013-asciinema-player/contracts/api-spec.md` for full API reference

---

## Getting Help

- **Issues**: File a GitHub issue with `component:asciinema-player` label
- **Questions**: Ask in #website channel on Discord
- **Bugs**: Include browser version, recording file, and error messages

---

**Last Updated**: 2025-11-22
**Maintainer**: Speck Website Team
