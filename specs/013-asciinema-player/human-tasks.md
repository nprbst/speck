# Human Tasks: Terminal Recording Creation

**Feature**: 013-asciinema-player
**Purpose**: Guide for creating the required `.cast` terminal recordings
**Estimated Time**: 1-2 hours (including retakes)

---

## Prerequisites

### Install asciinema CLI

```bash
# macOS
brew install asciinema

# Linux (Debian/Ubuntu)
sudo apt install asciinema

# Linux (Fedora/RHEL)
sudo dnf install asciinema

# Other platforms
pip3 install asciinema
```

**Verify installation**:
```bash
asciinema --version
# Expected: asciinema 2.x or higher
```

---

## Recording Best Practices

### Before You Start

✅ **DO**:
- Clean your terminal: `clear`
- Set terminal size to standard dimensions (120x30 or 80x24)
- Write a script of commands before recording
- Use `--idle-time-limit 2` to remove long pauses
- Test playback before committing: `asciinema play filename.cast`
- Keep recordings under 2MB (file size limit)
- Keep duration under 3 minutes when possible

❌ **DON'T**:
- Include sensitive information (API keys, passwords, real repo names)
- Rush through commands (add 2-3 second pauses)
- Use custom terminal themes (stick to defaults)
- Create very long recordings (>5 minutes)
- Record with non-standard terminal sizes

### During Recording

- **Pace**: Type at normal human speed (not too fast)
- **Pauses**: Add 2-3 second pauses between commands to let viewers read output
- **Clarity**: Use clear, descriptive commands
- **Errors**: If you make a mistake, just press Ctrl+D to stop and re-record

### Terminal Setup

```bash
# Set consistent prompt (optional, for cleaner demo)
export PS1='$ '

# Set terminal size (recommended)
# In your terminal: Preferences → Profiles → Window → Columns: 120, Rows: 30
```

---

## Task 1: Homepage Demo (speck-install.cast)

**Location**: `website/src/assets/demos/speck-install.cast`
**Duration**: 30-60 seconds
**Status**: ⚠️ PLACEHOLDER EXISTS - NEEDS REAL RECORDING

### What to Show

1. Claude Code plugin marketplace
2. Installing Speck plugin
3. Verifying installation with `/speck:env`

### Recording Script

```bash
# Start recording
cd /tmp  # Use temporary directory to avoid exposing real paths
mkdir demo-project && cd demo-project
git init

asciinema rec --idle-time-limit 2 --cols 120 --rows 30 \
  ~/git/github.com/nprbst/speck-013-asciinema-player/website/src/assets/demos/speck-install.cast
```

**Commands to demonstrate**:
```bash
clear

# Show we're starting fresh
echo "# Installing Speck via Claude Code"
sleep 2

# Simulate Claude Code environment (you'll need to actually use Claude Code)
# Option 1: Actually open Claude Code and type these
# Option 2: Simulate with echo statements (less authentic but faster)

echo "Opening Claude Code..."
sleep 2

echo "Navigating to Plugin Marketplace..."
sleep 2

echo "Searching for 'speck'..."
sleep 2

echo "Installing @speck/plugin..."
sleep 2

echo "✓ Speck installed successfully!"
sleep 2

echo "Verifying installation..."
sleep 1

# This should show Speck configuration if installed
echo "/speck:env"
sleep 2

# Simulate output
echo "✓ Speck plugin loaded"
echo "✓ Templates: 3 found"
echo "✓ Commands: 8 registered"

sleep 2
```

**Stop recording**: Press `Ctrl+D` or type `exit`

**Review**:
```bash
asciinema play ~/git/github.com/nprbst/speck-013-asciinema-player/website/src/assets/demos/speck-install.cast
```

---

## Task 2: Installation Workflow Demo (installation-workflow.cast)

**Location**: `website/src/assets/demos/installation-workflow.cast`
**Duration**: 60-90 seconds
**Status**: ⏸️ BLOCKED - NEEDS RECORDING

### What to Show

1. Install Speck via Claude Code marketplace
2. Configure `.speck/config.json`
3. Verify installation with `/speck:env`
4. Show directory structure

### Recording Script

```bash
asciinema rec --idle-time-limit 2 --cols 120 --rows 30 \
  ~/git/github.com/nprbst/speck-013-asciinema-player/website/src/assets/demos/installation-workflow.cast
```

**Commands to demonstrate**:
```bash
clear

echo "# Speck Installation Workflow"
sleep 2

echo "Step 1: Installing Speck from Claude Code Marketplace"
sleep 2

# Simulate Claude Code plugin installation
echo "$ claude plugins install speck"
sleep 2
echo "✓ Installed @speck/plugin@1.0.0"
sleep 2

echo ""
echo "Step 2: Initialize Speck configuration"
sleep 2

# Create config directory
mkdir -p .speck
sleep 1

# Create config file
cat > .speck/config.json << 'EOF'
{
  "version": "1.0.0",
  "workflowMode": "single-branch",
  "templatePath": ".speck/templates"
}
EOF

echo "$ cat .speck/config.json"
cat .speck/config.json
sleep 3

echo ""
echo "Step 3: Verify installation"
sleep 2

echo "$ /speck:env"
sleep 1

# Simulate speck:env output
echo "Speck Environment:"
echo "  Version: 1.0.0"
echo "  Mode: single-branch"
echo "  Features: 0"
echo "  ✓ Ready to use"
sleep 3

echo ""
echo "Step 4: View directory structure"
sleep 2

echo "$ tree -L 2 -a"
sleep 1

echo "."
echo "├── .speck/"
echo "│   └── config.json"
echo "└── specs/"
sleep 2

echo ""
echo "Installation complete! Ready to create your first spec."
sleep 2
```

**Stop recording**: Press `Ctrl+D` or type `exit`

**Review**:
```bash
asciinema play ~/git/github.com/nprbst/speck-013-asciinema-player/website/src/assets/demos/installation-workflow.cast
```

---

## Task 3: Quick Start Workflow Demo (quickstart-workflow.cast)

**Location**: `website/src/assets/demos/quickstart-workflow.cast`
**Duration**: 90-120 seconds
**Status**: ⏸️ BLOCKED - NEEDS RECORDING

### What to Show

1. `/speck:specify "Feature name"`
2. `/speck:clarify` (optional, if there are questions)
3. `/speck:plan`
4. `/speck:tasks`
5. `/speck:implement` (just start it, don't run full implementation)

### Recording Script

```bash
asciinema rec --idle-time-limit 2 --cols 120 --rows 30 \
  ~/git/github.com/nprbst/speck-013-asciinema-player/website/src/assets/demos/quickstart-workflow.cast
```

**Commands to demonstrate**:
```bash
clear

echo "# Quick Start: Creating Your First Specification"
sleep 2

echo "Step 1: Create specification"
sleep 2

echo "$ /speck:specify \"Add user authentication\""
sleep 2

# Simulate Claude Code responding
echo "Creating specification for 'Add user authentication'..."
sleep 2
echo "✓ Generated spec.md"
echo "✓ Created specs/001-user-authentication/"
echo ""
echo "What authentication methods should we support?"
echo "1. Email/password"
echo "2. OAuth (Google, GitHub)"
echo "3. Magic link"
sleep 3

echo ""
echo "Step 2: Clarify requirements"
sleep 2

echo "$ /speck:clarify"
sleep 2

echo "Analyzing specification..."
echo "✓ No [NEEDS CLARIFICATION] markers found"
echo "✓ All requirements are testable"
echo "✓ Specification is complete"
sleep 3

echo ""
echo "Step 3: Generate implementation plan"
sleep 2

echo "$ /speck:plan"
sleep 2

echo "Generating implementation plan..."
echo "✓ Analyzed technical requirements"
echo "✓ Created plan.md"
echo "✓ Passed constitution check"
sleep 3

echo ""
echo "Step 4: Generate task breakdown"
sleep 2

echo "$ /speck:tasks"
sleep 2

echo "Generating actionable tasks..."
echo "✓ Created tasks.md"
echo "✓ 24 tasks organized in 5 phases"
echo "✓ Dependencies mapped"
sleep 3

echo ""
echo "Step 5: Begin implementation"
sleep 2

echo "$ /speck:implement"
sleep 2

echo "Starting implementation workflow..."
echo "✓ Loaded tasks.md"
echo "✓ Phase 1: Setup (5 tasks)"
echo "  → Installing dependencies..."
sleep 2

echo ""
echo "Workflow initiated! Follow task-by-task implementation."
sleep 2
```

**Stop recording**: Press `Ctrl+D` or type `exit`

**Review**:
```bash
asciinema play ~/git/github.com/nprbst/speck-013-asciinema-player/website/src/assets/demos/quickstart-workflow.cast
```

---

## Task 4: Example Workflow Demo (example-workflow.cast) - OPTIONAL

**Location**: `website/src/assets/demos/example-workflow.cast`
**Duration**: 120-180 seconds
**Status**: ⏸️ BLOCKED - NEEDS RECORDING

### What to Show

Full feature development lifecycle:
1. Specify feature
2. Plan implementation
3. Generate tasks
4. Implement (show a few tasks)
5. (Optional) Create PR or show multi-repo/stacked PR workflow

### Recording Script

```bash
asciinema rec --idle-time-limit 2 --cols 120 --rows 30 \
  ~/git/github.com/nprbst/speck-013-asciinema-player/website/src/assets/demos/example-workflow.cast
```

**Commands**: Similar to Task 3 but with more depth and showing actual implementation steps.

---

## Task 5: Create Fallback Text Descriptions

### 5A: Installation Workflow Fallback

**Location**: `website/src/assets/demos/fallbacks/installation-workflow.md`

```bash
cat > ~/git/github.com/nprbst/speck-013-asciinema-player/website/src/assets/demos/fallbacks/installation-workflow.md << 'EOF'
# Installation Workflow Demo

This demo shows the complete Speck installation process in Claude Code.

Steps shown:
1. Install Speck plugin from Claude Code marketplace
2. Initialize Speck configuration with `.speck/config.json`
3. Verify installation using `/speck:env` command
4. View the created directory structure

If you're seeing this message, the video recording failed to load. Please refresh the page or check your network connection.
EOF
```

### 5B: Quick Start Workflow Fallback

**Location**: `website/src/assets/demos/fallbacks/quickstart-workflow.md`

```bash
cat > ~/git/github.com/nprbst/speck-013-asciinema-player/website/src/assets/demos/fallbacks/quickstart-workflow.md << 'EOF'
# Quick Start Workflow Demo

This demo shows the complete Speck workflow from specification to implementation.

Steps shown:
1. Create feature specification with `/speck:specify "Add user authentication"`
2. Clarify requirements with `/speck:clarify` (validates spec quality)
3. Generate implementation plan with `/speck:plan`
4. Generate actionable tasks with `/speck:tasks`
5. Begin implementation with `/speck:implement`

The workflow demonstrates how Speck guides you through structured feature development, from initial idea to executable tasks.

If you're seeing this message, the video recording failed to load. Please refresh the page or check your network connection.
EOF
```

---

## Task 6: Verify Recordings

After creating all recordings, run these validation commands:

```bash
# 1. Verify all recordings are valid JSON
for file in ~/git/github.com/nprbst/speck-013-asciinema-player/website/src/assets/demos/*.cast; do
  echo "Validating $file..."
  jq . "$file" > /dev/null && echo "✓ Valid" || echo "✗ Invalid JSON"
done

# 2. Check file sizes (must be <2MB each)
echo ""
echo "File sizes:"
du -h ~/git/github.com/nprbst/speck-013-asciinema-player/website/src/assets/demos/*.cast

# 3. Check durations (should be under 3 minutes ideally)
echo ""
echo "Durations:"
for file in ~/git/github.com/nprbst/speck-013-asciinema-player/website/src/assets/demos/*.cast; do
  duration=$(jq '.stdout[-1][0]' "$file")
  echo "$(basename $file): ${duration}s"
done
```

**Validation Rules**:
- ✅ Valid JSON format
- ✅ File size < 2MB (VR-011)
- ✅ Duration < 180 seconds (recommended)
- ✅ No sensitive information visible

---

## Task 7: Test Recordings Locally

```bash
# Navigate to website directory
cd ~/git/github.com/nprbst/speck-013-asciinema-player/website

# Install dependencies if needed
bun install

# Start dev server
bun run dev
```

Visit `http://localhost:4321` and verify:
- ✅ Recordings load and play
- ✅ Player controls work (play/pause)
- ✅ Keyboard navigation works (space, arrows)
- ✅ Fallback content shows if recording fails
- ✅ Responsive on mobile (resize browser to 320px)

---

## Task 8: Commit Recordings

```bash
cd ~/git/github.com/nprbst/speck-013-asciinema-player

# Add recordings and fallback files
git add website/src/assets/demos/*.cast
git add website/src/assets/demos/fallbacks/*.md

# Check what's being committed
git status

# Commit
git commit -m "feat: add asciinema terminal recordings for demos

Added 3 terminal recordings:
- speck-install.cast (homepage demo)
- installation-workflow.cast (installation guide)
- quickstart-workflow.cast (quick start guide)

Also added fallback text descriptions for accessibility.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Troubleshooting

### Recording shows "Command not found"

**Cause**: Simulating commands instead of actually running them

**Solutions**:
1. **Option A**: Actually use Claude Code and run real commands
2. **Option B**: Use `echo` to simulate output (less authentic but acceptable for demos)

### Recording file too large (>2MB)

**Cause**: Recording is too long or has idle time

**Solutions**:
```bash
# Re-record with stricter idle limit
asciinema rec --idle-time-limit 1 --cols 120 --rows 30 filename.cast

# Or shorten the demo (remove steps)
```

### Recording looks blurry/distorted on website

**Cause**: Non-standard terminal size

**Solution**: Always use standard sizes:
```bash
# Standard sizes (pick one)
--cols 80 --rows 24   # Classic
--cols 120 --rows 30  # Modern (recommended)
```

### Terminal colors don't match website theme

**Cause**: Using custom terminal theme

**Solution**: Use default terminal theme when recording, the asciinema player will apply website colors automatically.

---

## Checklist

Track your progress:

- [ ] Task 1: Record `speck-install.cast` (homepage demo)
- [ ] Task 2: Record `installation-workflow.cast` (installation guide)
- [ ] Task 3: Record `quickstart-workflow.cast` (quick start guide)
- [ ] Task 4: (Optional) Record `example-workflow.cast`
- [ ] Task 5A: Create `installation-workflow.md` fallback
- [ ] Task 5B: Create `quickstart-workflow.md` fallback
- [ ] Task 6: Validate all recordings (JSON, size, duration)
- [ ] Task 7: Test locally (`bun run dev`)
- [ ] Task 8: Commit recordings to git

---

## Next Steps

After completing these tasks:
1. Notify Claude that recordings are ready
2. Claude will:
   - Convert docs to MDX format
   - Embed players in documentation pages
   - Run accessibility and performance tests
   - Complete Phase 4 and Phase 6 validation

---

**Questions or issues?** Leave a comment on this file or ask Claude for help!

**Estimated completion time**: 1-2 hours (including retakes and validation)
