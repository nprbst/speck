---
title: "Installation Guide"
description: "Complete installation and setup instructions for Speck"
category: "getting-started"
order: 2
lastUpdated: 2025-11-16
tags: ["installation", "setup", "prerequisites"]
---

# Installation Guide

This guide provides complete installation and setup instructions for Speck, including prerequisites, installation steps, verification, and troubleshooting.

---

## Prerequisites

Speck requires the following tools to be installed:

### Required

1. **Bun 1.0+** - JavaScript runtime and package manager
   - Download: [bun.sh](https://bun.sh)
   - Used for: Fast builds, TypeScript execution, package management

2. **Git 2.30+** - Version control
   - Download: [git-scm.com](https://git-scm.com)
   - Used for: Repository cloning, version control, doc sync

3. **Claude Code** - Anthropic's official CLI
   - Download: [claude.com/code](https://claude.com/code)
   - Used for: Running slash commands, AI-assisted development

### Optional

- **Node.js 20+** - Some Astro dependencies require Node (even when using Bun)
- **VS Code** - Recommended editor with Claude Code extension

---

## Installation Steps

### 1. Install Bun

**macOS and Linux:**

```bash
curl -fsSL https://bun.sh/install | bash
```

This installs Bun to `~/.bun/bin/bun` and updates your shell profile.

**Windows:**

```powershell
# PowerShell (run as administrator)
irm bun.sh/install.ps1 | iex
```

**Verify installation:**

```bash
bun --version
# Expected output: 1.0.0 or higher
```

### 2. Install Git

**macOS:**

Git comes pre-installed on macOS. Verify with:

```bash
git --version
# Expected: 2.30.0 or higher
```

If not installed, install via Homebrew:

```bash
brew install git
```

**Linux:**

```bash
# Debian/Ubuntu
sudo apt-get update
sudo apt-get install git

# Fedora/RHEL
sudo dnf install git

# Arch
sudo pacman -S git
```

**Windows:**

Download the installer from [git-scm.com/download/win](https://git-scm.com/download/win) and run it.

### 3. Install Claude Code

Follow the official Claude Code installation instructions at [claude.com/code](https://claude.com/code).

**Verify installation:**

```bash
claude --version
```

### 4. Clone Speck Repository

```bash
# Clone the repository
git clone https://github.com/nprbst/speck.git

# Navigate to the directory
cd speck
```

### 5. Install Dependencies

```bash
bun install
```

This installs all project dependencies including TypeScript, testing tools, and Astro (for the website).

**Expected output:**

```
bun install v1.x.x
 + chalk@5.3.0
 + commander@11.1.0
 + handlebars@4.7.8
 ...
 150 packages installed [2.5s]
```

### 6. Verify Installation

Run the Speck CLI to verify everything is working:

```bash
bun run dev --version
```

**Expected output:**

```
Speck v1.0.0
Claude Code-Optimized Specification Framework
```

---

## First Command

Test that Speck is working by running your first command:

```bash
# Start Claude Code
claude

# In Claude Code, run:
/speck.specify
```

Claude will prompt you to describe a feature. Try a simple example:

```
Add a hello world function
```

If successful, you'll see:

- ✅ Feature specification created in `specs/001-hello-world/spec.md`
- ✅ Feature directory initialized with templates

---

## Configuration

### Environment Variables

Speck uses environment variables for configuration. Create a `.env` file in your project root:

```bash
# .env (optional - has sensible defaults)

# Main Speck repository URL (for doc sync if using website)
MAIN_REPO_URL=https://github.com/nprbst/speck.git

# Path to docs in main repo
DOCS_SOURCE_PATH=docs
```

**Note**: `.env` is gitignored and should not be committed to version control.

### Git Configuration

Ensure your Git is configured with your name and email:

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

This is required for Git commits created by Speck during implementation.

---

## Troubleshooting

### Bun not in PATH

**Symptom**: `command not found: bun`

**Solution**:

```bash
# Add Bun to your PATH
echo 'export PATH="$HOME/.bun/bin:$PATH"' >> ~/.bashrc  # or ~/.zshrc
source ~/.bashrc  # or ~/.zshrc

# Verify
bun --version
```

### Claude Code not configured

**Symptom**: Slash commands (`/speck.*`) not recognized

**Solution**:

1. Ensure Claude Code is installed and running
2. Check that you're in a Git repository (Speck requires Git)
3. Verify the `.claude/` directory exists in your project root

### Permission errors

**Symptom**: `EACCES: permission denied`

**Solution (macOS/Linux)**:

```bash
# Make scripts executable
chmod +x .speck/scripts/*.ts

# If using npm global installs, fix npm permissions
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH
```

### Bun install fails

**Symptom**: `error: failed to fetch package`

**Solution**:

```bash
# Clear Bun cache
rm -rf ~/.bun/install/cache

# Retry installation
bun install

# If still failing, check network connection or use verbose mode
bun install --verbose
```

### Git sparse checkout fails (website)

**Symptom**: Documentation sync fails during website build

**Solution**:

```bash
# Check Git sparse-checkout is supported
git --version  # Must be 2.25.0+

# Manually sync docs
bun run website:sync

# Check environment variables
echo $MAIN_REPO_URL
echo $DOCS_SOURCE_PATH
```

### Node.js compatibility issues

**Symptom**: Astro dependencies fail with Bun

**Solution**:

Ensure Node.js 20+ is installed (some Astro dependencies require Node):

```bash
# Install Node via nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20

# Verify
node --version  # Should show v20.x.x
```

### TypeScript errors

**Symptom**: `error: TypeScript compilation failed`

**Solution**:

```bash
# Check TypeScript version
bun run --version typescript

# If outdated, update dependencies
bun update

# Run type check to see specific errors
bun run typecheck
```

---

## Verifying the Installation

Run through this checklist to ensure everything is working:

### ✅ Prerequisites Check

```bash
# Check Bun version
bun --version
# Expected: 1.0.0 or higher

# Check Git version
git --version
# Expected: 2.30.0 or higher

# Check Claude Code
claude --version
# Expected: Claude Code vX.X.X
```

### ✅ Speck Commands

```bash
# Navigate to project directory
cd path/to/your/project

# Start Claude Code
claude

# Try each command:
/speck.specify    # Should prompt for feature description
/speck.clarify    # Should work after spec created
/speck.plan       # Should work after clarification
/speck.tasks      # Should work after plan created
```

### ✅ Build Process

```bash
# Build Speck CLI
bun run build

# Expected output: dist/cli/index.js created
ls -la dist/cli/index.js
```

### ✅ Tests

```bash
# Run test suite
bun test

# Expected: All tests pass
```

---

## Next Steps

Once installation is complete:

1. **Read the Quick Start**: Follow the [Quick Start Guide](/docs/getting-started/quick-start) for a hands-on tutorial
2. **Learn the workflow**: Understand the [Three-Phase Workflow](/docs/concepts/workflow)
3. **Try an example**: Build your [First Feature](/docs/examples/first-feature) with Speck
4. **Explore commands**: Reference the [Commands Guide](/docs/commands/reference)

---

## Getting Help

**Installation Issues**:
- Check the [Troubleshooting](#troubleshooting) section above
- Review Bun docs: [bun.sh/docs](https://bun.sh/docs)
- Review Git docs: [git-scm.com/doc](https://git-scm.com/doc)

**Speck-Specific Questions**:
- Open a GitHub Discussion: [github.com/nprbst/speck/discussions](https://github.com/nprbst/speck/discussions)
- Report a bug: [github.com/nprbst/speck/issues](https://github.com/nprbst/speck/issues)

**Claude Code Questions**:
- Refer to Claude Code documentation: [claude.com/code/docs](https://claude.com/code/docs)

---

**Last Updated**: 2025-11-16
**Speck Version**: 1.0.0
