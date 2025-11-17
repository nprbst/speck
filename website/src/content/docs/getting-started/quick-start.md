---
title: "Quick Start Guide"
description: "Install Speck and run your first command in under 10 minutes"
category: "getting-started"
order: 1
lastUpdated: 2025-11-16
tags: ["installation", "setup", "beginner"]
---

# Quick Start Guide

Get started with Speck in under 10 minutes. This guide will walk you through installation, setup, and running your first specification command.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Bun 1.0+** - JavaScript runtime and package manager
- **Git 2.30+** - Version control
- **Claude Code** - Anthropic's official CLI

### Installing Prerequisites

**macOS/Linux**:
```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Verify installation
bun --version    # Should show 1.0.0 or higher
git --version    # Should show 2.30.0 or higher
```

**Windows**:
```powershell
# Install Bun (PowerShell)
irm bun.sh/install.ps1 | iex

# Verify installations (in new terminal)
bun --version
git --version
```

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/nprbst/speck.git
cd speck
```

### 2. Install Dependencies

```bash
bun install
```

This installs all necessary dependencies including TypeScript support.

### 3. Verify Installation

```bash
bun run dev --version
```

You should see output indicating Speck is ready to use.

## Your First Specification

Now that Speck is installed, let's create your first feature specification.

### 1. Start Claude Code

```bash
# In your project directory
claude
```

### 2. Run the Specify Command

In Claude Code, type:

```
/speck.specify
```

### 3. Describe Your Feature

Claude will prompt you to describe your feature in natural language. For example:

```
Add a user authentication system with email and password login
```

### 4. Review the Generated Spec

Speck will generate a `spec.md` file in `specs/001-your-feature/` with:

- Feature overview
- User stories
- Functional requirements
- Success criteria
- Out of scope items

## Next Steps

Now that you've created your first specification, you can:

1. **Clarify your spec**: Run `/speck.clarify` to identify underspecified areas
2. **Plan implementation**: Run `/speck.plan` to generate technical design
3. **Generate tasks**: Run `/speck.tasks` to break down the work
4. **Implement**: Run `/speck.implement` to execute the plan

## Getting Help

- **Documentation**: Browse the [Commands Reference](/docs/commands/reference) for detailed command syntax
- **Concepts**: Learn about the [Three-Phase Workflow](/docs/concepts/workflow)
- **Examples**: See [real-world examples](/docs/examples/first-feature)
- **GitHub**: Report issues at [github.com/nprbst/speck](https://github.com/nprbst/speck)

## Troubleshooting

### Bun not found

If you see "command not found: bun":

```bash
# Restart your terminal to reload PATH
# Or manually add Bun to PATH
export PATH="$HOME/.bun/bin:$PATH"
```

### Git errors

If you see Git-related errors, ensure Git is installed and accessible:

```bash
which git
git --version
```

### Permission errors

If you encounter permission errors on macOS/Linux:

```bash
# Make scripts executable
chmod +x .speck/scripts/*.ts
```

---

**Need more help?** Check out the [full documentation](/docs/getting-started/installation) or open a GitHub Discussion.
