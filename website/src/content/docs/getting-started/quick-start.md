---
title: "Quick Start Guide"
description: "Install Speck and run your first command in 2 minutes"
category: "getting-started"
order: 1
lastUpdated: 2025-11-22
tags: ["installation", "setup", "beginner", "plugin"]
---

# Quick Start Guide

Get started with Speck in 2 minutes. This guide will walk you through plugin installation and running your first specification command.

## Prerequisites

Before you begin, ensure you have:

- **Claude Code 2.0+** - With plugin system support

That's it! No other dependencies are required to be preinstalled.

### Verify Claude Code Version

```bash
claude --version
# Should show: Claude Code v2.0.56 or higher
```

**If you need to upgrade**: Visit [claude.com/code](https://claude.com/code) for the latest installer.

## Installation

### Install Speck Plugin (2 minutes)

1. **Open Claude Code** in your project directory:
   ```bash
   claude
   ```

2. **Install the `speck-market`place**:
   ```
   /plugin marketplace add nprbst/speck-market
   ```

4. **Install Speck**:
   ```
   /plugin install speck@speck-market
   ```

✅ **Done!** Speck is now installed.

## Optional: Worktree Integration Setup

Work on multiple features simultaneously using Git worktrees with automatic IDE launch and dependency installation.

### What are Worktrees?

Worktrees let you have multiple branches checked out at the same time, eliminating branch-switching overhead. When enabled, Speck automatically:
- Creates isolated worktree directories for each feature
- Launches your IDE pointing to the worktree
- Pre-installs dependencies before the IDE opens

**Benefits**: Context-switch instantly between features, maintain multiple working states, keep separate IDE windows open.

### Quick Setup (2 minutes)

**Option 1: Interactive Wizard** (Recommended)

```
/speck:init
```

Follow the prompts to configure:
- Enable/disable worktree integration
- Enable/disable IDE auto-launch
  - Choose your IDE (VSCode for now...others coming soon?)
  - Configure dependency auto-install
- Set file copy/symlink rules

**Option 2: Manual Configuration**

Create `.speck/config.json` in your repository:

```json
{
  "version": "1.0",
  "worktree": {
    "enabled": true,
    "ide": {
      "autoLaunch": true,
      "editor": "vscode"
    },
    "dependencies": {
      "autoInstall": true
    }
  }
}
```

## Your First Specification

Now that Speck is installed, let's create your first feature specification.

### 1. Start Claude Code

```bash
# In your git project directory
claude
```

### 2. Run the Specify Command

In Claude Code, type:

```
/speck:specify [Basic desciption of the feature you would like to build]
```

### 3. Describe Your Feature

If you don't provide a description to the `speck:specify` command, Claude will prompt you to describe your feature in natural language. For example:

```
Add a user authentication system with email and password login
```

### 4. Review the Generated Spec

Speck will generate a `spec.md` file in `specs/001-your-feature/` with:

- Feature overview
- User stories and acceptance scenarios
- Functional requirements
- Success criteria
- Out of scope items

## Using the Speck Skill

In addition to slash commands, you can ask Speck questions naturally!

### Ask Questions About Your Spec

Try asking:

```
/speck:help What user stories are in this spec?
```

```
/speck:help What are the success criteria?
```

```
/speck:help Show me all functional requirements
```

The Speck skill understands your specs, plans, and tasks - ask it anything! (After the first `/speck:help` you can omit it for future questions.)

### Skill vs Commands: When to Use Each

- **Use the skill** for questions and understanding:
  - "What does this spec define?"
  - "What tasks are pending?"
  - "What's the technical approach?"

- **Use slash commands** for actions and generation:
  - `/speck:specify` - Create new spec
  - `/speck:plan` - Generate implementation plan
  - `/speck:tasks` - Break down into tasks

## Next Steps

Now that you've created your first specification, you can:

1. **Clarify your spec**: Run `/speck:clarify` to identify underspecified areas
2. **Plan implementation**: Run `/speck:plan` to generate technical research & design
3. **Generate tasks**: Run `/speck:tasks` to break down the work
4. **Implement**: Run `/speck:implement` to execute the plan

Or ask the Speck skill:

```
/speck:help What should I do next in the Speck workflow?
```

### Advanced Capabilities

Ready to scale beyond single-repo projects? Speck supports:

- **Multi-Repo Projects**: Share specifications across microservices with `/speck:link` - [Learn more](/docs/advanced-features/multi-repo-support)
- **Monorepo Workspaces**: Manage multiple features within a monorepo - [Learn more](/docs/advanced-features/monorepos)
- **Worktree Integration**: Work on multiple features in parallel with session handoff - [Learn more](/docs/advanced-features/worktrees)

## Getting Help

- **Documentation**: Browse the [Commands Reference](/docs/commands/reference) for detailed command syntax
- **Concepts**: Learn about the [Three-Phase Workflow](/docs/core-concepts/workflow)
- **Examples**: See [real-world examples](/docs/examples/first-feature)
- **Ask the skill**: Type questions naturally in Claude Code
- **GitHub**: Report issues at [github.com/nprbst/speck](https://github.com/nprbst/speck)

## Troubleshooting

Having issues? See the [Troubleshooting Guide](/docs/getting-started/troubleshooting) for solutions to common problems including:
- Plugin not found or commands not working
- Skill not responding
- Version compatibility issues

---

**Need more help?** Check out the [Setup Reference](/docs/getting-started/setup-reference) for detailed installation info, or open a GitHub Discussion.
