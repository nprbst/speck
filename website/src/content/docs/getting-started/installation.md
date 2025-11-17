---
title: "Installation Guide"
description: "Complete installation and setup instructions for Speck"
category: "getting-started"
order: 2
lastUpdated: 2025-11-17
tags: ["installation", "setup", "prerequisites", "plugin"]
---

# Installation Guide

This guide provides complete installation instructions for Speck as a Claude Code plugin. Install in under 5 minutes using the Claude Marketplace.

---

## Prerequisites

Speck requires Claude Code with plugin support:

### Required

1. **Claude Code 2.0+** - With plugin system support
   - Download: [claude.com/code](https://claude.com/code)
   - Minimum version: 2.0.0 (with plugin system support)
   - Used for: Running Speck slash commands and skill

**Verification**:

```bash
claude --version
# Expected output: Claude Code v2.0.0 or higher
```

If your version is older, upgrade Claude Code following the [official upgrade guide](https://claude.com/code/docs/installation).

### Optional

- **VS Code** - Recommended editor with Claude Code extension
- **Git 2.30+** - If you plan to contribute to Speck or work with the source code

---

## Installation Steps

### 1. Open Claude Code

Start Claude Code in your project directory:

```bash
claude
```

### 2. Install Speck Plugin

In Claude Code, type:

```
/plugin
```

This opens the plugin management interface.

### 3. Add speck-market Marketplace

1. Select "Manage marketplaces"
2. Select "Add marketplace"
3. Enter the marketplace name: `speck-market`
4. Confirm

### 4. Install Speck

1. In the plugin interface, select "speck-market"
2. Find "speck" in the available plugins list
3. Select "Install"
4. Wait for installation to complete

**Expected output:**

```
✓ Speck plugin installed successfully
✓ Commands registered: /speck.specify, /speck.clarify, /speck.plan, /speck.tasks, /speck.implement
✓ Speck skill available for natural language queries
```

### 5. Verify Installation

Check that Speck commands are available:

```
/speck
```

You should see autocomplete suggestions for all Speck commands:
- `/speck.specify` - Create feature specifications
- `/speck.clarify` - Identify underspecified areas
- `/speck.plan` - Generate implementation plans
- `/speck.tasks` - Break down work into tasks
- `/speck.implement` - Execute implementation

---

## First Command

Test that Speck is working by running your first command:

```
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

## Version Compatibility

### Minimum Versions

- **Claude Code**: 2.0.0 or higher (with plugin system 2.0+ support)
- **Speck Plugin**: Latest version from speck-market

### Checking Your Version

**Claude Code version:**

```bash
claude --version
```

**Speck plugin version:**

In Claude Code:

```
/plugin
```

Then select "Manage marketplaces" → "speck-market" → View installed plugins

### Upgrading Claude Code

If you have an older version of Claude Code:

1. Visit [claude.com/code](https://claude.com/code)
2. Download the latest installer
3. Run the installer to upgrade
4. Restart your terminal
5. Verify: `claude --version`

---

## Updating Speck

Keep Speck up to date with the latest features and bug fixes:

### Update Steps

1. In Claude Code, type: `/plugin`
2. Select "Manage marketplaces"
3. Select "speck-market"
4. Select "Update marketplace"
5. Wait for update to complete

**Update frequency**: Check for updates monthly or when new features are announced.

---

## Troubleshooting

### Plugin not found

**Symptom**: "Plugin 'speck' not found in marketplace"

**Solution**:

1. Verify Claude Code version: `claude --version` (must be 2.0.0+)
2. Ensure speck-market marketplace is added correctly
3. Try refreshing the marketplace:
   ```
   /plugin → Manage marketplaces → speck-market → Refresh
   ```
4. Check your internet connection

### Commands not recognized

**Symptom**: Slash commands (`/speck.*`) not showing in autocomplete

**Solution**:

1. Verify Speck is installed:
   ```
   /plugin → View installed plugins
   ```
2. If installed but not working, try reinstalling:
   ```
   /plugin → speck → Uninstall → Install again
   ```
3. Restart Claude Code

### Version compatibility issues

**Symptom**: "This plugin requires Claude Code 2.0.0 or higher"

**Solution**:

1. Check your Claude Code version: `claude --version`
2. If below 2.0.0, upgrade following the [upgrade steps](#upgrading-claude-code)
3. After upgrading, reinstall Speck plugin

### Marketplace connection issues

**Symptom**: "Failed to connect to speck-market"

**Solution**:

1. Check internet connection
2. Verify marketplace URL is correct
3. Try removing and re-adding the marketplace:
   ```
   /plugin → Manage marketplaces → Remove → Add marketplace (speck-market)
   ```
4. Check firewall/proxy settings

### Permission errors

**Symptom**: `EACCES: permission denied` when running commands

**Solution (macOS/Linux)**:

```bash
# Ensure write permissions for specs directory
chmod -R u+w specs/

# If using sudo, avoid it - Speck should run with user permissions
```

### Skill not responding

**Symptom**: Speck skill doesn't respond to natural language queries

**Solution**:

1. Verify plugin is installed and active
2. Try specific skill queries:
   ```
   What does this spec define?
   ```
3. Ensure you're in a directory with `specs/` folder
4. Restart Claude Code if needed

---

## Verifying the Installation

Run through this checklist to ensure everything is working:

### ✅ Prerequisites Check

```bash
# Check Claude Code version
claude --version
# Expected: 2.0.0 or higher
```

### ✅ Plugin Installation

In Claude Code:

```
/plugin
```

Then navigate to installed plugins - you should see "speck" listed.

### ✅ Speck Commands

Test command autocomplete:

```
/speck.
```

You should see all available commands:
- `/speck.specify`
- `/speck.clarify`
- `/speck.plan`
- `/speck.tasks`
- `/speck.implement`
- And more...

### ✅ Speck Skill

Test the skill with a natural language query:

```
What workflow phases does Speck support?
```

The skill should respond with information about Speck's three-phase workflow.

---

## Next Steps

Once installation is complete:

1. **Read the Quick Start**: Follow the [Quick Start Guide](/docs/getting-started/quick-start) for a hands-on tutorial
2. **Learn the workflow**: Understand the [Three-Phase Workflow](/docs/concepts/workflow)
3. **Use the skill**: Ask questions naturally or use slash commands - [Learn when to use each](/docs/commands/reference#speck-skill)
4. **Try an example**: Build your [First Feature](/docs/examples/first-feature) with Speck

---

## Getting Help

**Installation Issues**:
- Check the [Troubleshooting](#troubleshooting) section above
- Review Claude Code plugin docs: [claude.com/code/docs/plugins](https://claude.com/code/docs/plugins)

**Speck-Specific Questions**:
- Use the Speck skill: Ask "How do I use Speck?" in Claude Code
- Open a GitHub Discussion: [github.com/nprbst/speck/discussions](https://github.com/nprbst/speck/discussions)
- Report a bug: [github.com/nprbst/speck/issues](https://github.com/nprbst/speck/issues)

**Claude Code Questions**:
- Refer to Claude Code documentation: [claude.com/code/docs](https://claude.com/code/docs)

---

**Last Updated**: 2025-11-17
**Minimum Claude Code Version**: 2.0.0
