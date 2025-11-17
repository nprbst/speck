---
title: "Quick Start Guide"
description: "Install Speck and run your first command in under 10 minutes"
category: "getting-started"
order: 1
lastUpdated: 2025-11-17
tags: ["installation", "setup", "beginner", "plugin"]
---

# Quick Start Guide

Get started with Speck in under 10 minutes. This guide will walk you through plugin installation and running your first specification command.

## Prerequisites

Before you begin, ensure you have:

- **Claude Code 2.0+** - With plugin system support

That's it! No other dependencies required.

### Verify Claude Code Version

```bash
claude --version
# Should show: Claude Code v2.0.0 or higher
```

**If you need to upgrade**: Visit [claude.com/code](https://claude.com/code) for the latest installer.

## Installation

### Install Speck Plugin (2 minutes)

1. **Open Claude Code** in your project directory:
   ```bash
   claude
   ```

2. **Open plugin manager**:
   ```
   /plugin
   ```

3. **Add speck-market**:
   - Select "Manage marketplaces"
   - Select "Add marketplace"
   - Enter: `speck-market`

4. **Install Speck**:
   - Select "speck-market"
   - Find "speck" in the plugin list
   - Select "Install"

✅ **Done!** Speck is now installed.

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
- User stories and acceptance scenarios
- Functional requirements
- Success criteria
- Out of scope items

## Using the Speck Skill

In addition to slash commands, you can ask Speck questions naturally!

### Ask Questions About Your Spec

Try asking:

```
What user stories are in this spec?
```

```
What are the success criteria?
```

```
Show me all functional requirements
```

The Speck skill understands your specs, plans, and tasks - ask it anything!

### Skill vs Commands: When to Use Each

- **Use the skill** for questions and understanding:
  - "What does this spec define?"
  - "What tasks are pending?"
  - "What's the technical approach?"

- **Use slash commands** for actions and generation:
  - `/speck.specify` - Create new spec
  - `/speck.plan` - Generate implementation plan
  - `/speck.tasks` - Break down into tasks

## Next Steps

Now that you've created your first specification, you can:

1. **Clarify your spec**: Run `/speck.clarify` to identify underspecified areas
2. **Plan implementation**: Run `/speck.plan` to generate technical design
3. **Generate tasks**: Run `/speck.tasks` to break down the work
4. **Implement**: Run `/speck.implement` to execute the plan

Or ask the Speck skill:

```
What should I do next in the Speck workflow?
```

## Getting Help

- **Documentation**: Browse the [Commands Reference](/docs/commands/reference) for detailed command syntax
- **Concepts**: Learn about the [Three-Phase Workflow](/docs/concepts/workflow)
- **Examples**: See [real-world examples](/docs/examples/first-feature)
- **Ask the skill**: Type questions naturally in Claude Code
- **GitHub**: Report issues at [github.com/nprbst/speck](https://github.com/nprbst/speck)

## Troubleshooting

### Plugin not found

If Speck doesn't appear in the marketplace:

1. Verify Claude Code version: `claude --version` (must be 2.0.0+)
2. Check that speck-market marketplace was added correctly
3. Try refreshing: `/plugin` → Manage marketplaces → speck-market → Refresh

### Commands not working

If slash commands don't autocomplete:

1. Verify installation: `/plugin` → View installed plugins → Check for "speck"
2. Restart Claude Code
3. If still not working, try reinstalling the plugin

### Skill not responding

If the Speck skill doesn't respond to questions:

1. Ensure you're in a directory with a `specs/` folder
2. Try asking more specific questions:
   ```
   List all specs in this project
   ```
3. Restart Claude Code if needed

---

**Need more help?** Check out the [full documentation](/docs/getting-started/installation) or open a GitHub Discussion.
