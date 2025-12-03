---
title: "Setup Reference"
description: "Detailed version compatibility, updating, and verification for Speck"
category: "getting-started"
order: 3
lastUpdated: 2025-12-02
tags: ["installation", "setup", "prerequisites", "versions", "reference"]
---

# Setup Reference

This reference covers version compatibility, updating Speck, and verifying your installation. For quick installation, see the [Quick Start Guide](/docs/getting-started/quick-start).

---

## Prerequisites

### Required

- **Claude Code 2.0.56+** - With plugin system support
  - Download: [claude.com/code](https://claude.com/code)

**Verify your version:**

```bash
claude --version
# Expected: Claude Code v2.0.56 or higher
```

### Optional

- **VS Code** - Recommended editor with Claude Code extension
- **Git 2.5+** - Required for Worktree integration

---

## Version Compatibility

### Minimum Versions

| Component | Minimum Version | Notes |
|-----------|----------------|-------|
| Claude Code | 2.0.56 | Plugin system 2.0+ support |
| Git | 2.5.0 | Only for worktree features |
| Speck Plugin | Latest | Always use latest from marketplace |

### Checking Versions

**Claude Code:**

```bash
claude --version
```

**Speck plugin version:**

In Claude Code, type `/plugin` → "View installed plugins" → look for "speck"

**Git (if using worktrees):**

```bash
git --version
```

### Upgrading Claude Code

1. Visit [claude.com/code](https://claude.com/code)
2. Download the latest installer
3. Run the installer to upgrade
4. Restart your terminal
5. Verify: `claude --version`

---

## Updating Speck

Keep Speck up to date with the latest features and bug fixes.

### Update Steps

1. In Claude Code, type: `/plugin`
2. Select "Manage marketplaces"
3. Select "speck-market"
4. Select "Update marketplace"
5. Wait for update to complete

**Update frequency**: Check for updates monthly, or more often during beta when new features are announced regularly.

---

## Verifying the Installation

Run through this checklist to ensure everything is working:

### ✅ Prerequisites Check

```bash
# Check Claude Code version
claude --version
# Expected: 2.0.56 or higher
```

### ✅ Plugin Installation

In Claude Code:

```
/plugin
```

Navigate to installed plugins - you should see "speck" listed.

### ✅ Speck Commands

Test command autocomplete:

```
/speck
```

You should see all available commands:
- `/speck:specify`
- `/speck:clarify`
- `/speck:plan`
- `/speck:tasks`
- `/speck:implement`
- And more...

### ✅ Speck Skill

Test the skill with a natural language query:

```
/speck:help What workflow phases does Speck support?
```

The skill should respond with information about Speck's three-phase workflow.

---

## Troubleshooting

For installation and setup issues, see the [Troubleshooting Guide](/docs/getting-started/troubleshooting).

---

## Getting Help

**Installation Issues:**
- Check the [Troubleshooting Guide](/docs/getting-started/troubleshooting)
- Review Claude Code plugin docs: [claude.com/code/docs/plugins](https://claude.com/code/docs/plugins)

**Speck-Specific Questions:**
- Use the Speck skill: Ask "How do I use Speck?" in Claude Code
- Open a GitHub Discussion: [github.com/nprbst/speck/discussions](https://github.com/nprbst/speck/discussions)
- Report a bug: [github.com/nprbst/speck/issues](https://github.com/nprbst/speck/issues)
