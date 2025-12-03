---
title: "Troubleshooting"
description: "Solutions to common Speck issues organized by category."
category: getting-started
order: 2
lastUpdated: 2025-12-02
tags: ["troubleshooting", "help", "errors", "issues"]
---

# Troubleshooting

This guide covers common issues and their solutions. Use the sections below to find help for your specific problem.

## Quick Fixes

Most issues can be resolved with these steps:

1. **Verify Claude Code version**: `claude --version` (requires 2.0.0+)
2. **Check plugin is installed**: `/plugin` → View installed plugins → look for "speck"
3. **Restart Claude Code**: Many issues resolve after a restart
4. **Ensure you're in a project directory**: Commands need a `specs/` folder to work

---

## Installation Issues

### Plugin not found

**Symptom**: "Plugin `speck` not found in marketplace"

**Solution**:

1. Verify Claude Code version: `claude --version` (must be 2.0.0+)
2. Ensure speck-market marketplace is added correctly
3. Try refreshing the marketplace:
   ```
   /plugin → Manage marketplaces → speck-market → Refresh
   ```
4. Check your internet connection

### Version compatibility issues

**Symptom**: "This plugin requires Claude Code 2.0.0 or higher"

**Solution**:

1. Check your Claude Code version: `claude --version`
2. If below 2.0.0, upgrade Claude Code
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

---

## Command Issues

### Commands not recognized

**Symptom**: Slash commands (`/speck:*`) not showing in autocomplete

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

### Skill not responding

**Symptom**: Speck skill doesn't respond to natural language queries

**Solution**:

1. Verify plugin is installed and active
2. Force Claude to use the skill via the slash command:
   ```
   /speck:help What does this spec define?
   ```
3. Ensure you're in a directory with `specs/` folder
4. Restart Claude Code if needed

---

## Multi-Repo Issues

### "Repository mode: single-repo" when expecting multi-repo

**Cause**: `.speck/root` symlink missing or broken

**Solution**:
```bash
# Check if symlink exists
ls -la .speck/root

# If missing, create it
/speck:link ../shared-specs

# If broken, remove and recreate
rm .speck/root
/speck:link ../shared-specs
```

### "Spec file not found" error

**Cause**: Symlink points to wrong directory

**Solution**:
```bash
# Verify symlink target
ls -la .speck/root

# Should show valid path to root repo
# If wrong, remove and recreate
rm .speck/root
/speck:link /correct/path/to/shared-specs
```

### Plans out of sync with shared spec

**Cause**: Spec updated but plans not regenerated

**Solution**:
```bash
# Regenerate plan in each child repo
cd frontend-repo
/speck:plan

cd backend-repo
/speck:plan
```

---

## Monorepo Issues

### Workspace not detected

**Symptom**: `/speck:env` doesn't show workspace context

**Solution**: Ensure workspace configuration file exists at root:
```bash
# Check for workspace config
ls pnpm-workspace.yaml
# or
grep workspaces package.json
```

### Cross-package imports failing

**Symptom**: TypeScript errors importing from other packages

**Solution**: Configure workspace dependencies in package.json:
```json
{
  "dependencies": {
    "@myorg/shared": "workspace:*"
  }
}
```

### Plans identical across packages

**Symptom**: UI and API packages generate same implementation plan

**Solution**: Each package should have its own constitution defining different tech stacks. Update per-package constitutions, then regenerate plans.

---

## Worktree Issues

### Insufficient disk space

**Error**:
```
Error: Insufficient disk space
  Available: 512 MB
  Required: 1 GB minimum
```

**Solution**: Free up disk space or disable dependency auto-install:
```bash
# Remove unused worktrees
bun .speck/scripts/worktree/cli.ts prune

# Clear package manager cache
bun pm cache rm --all

# Identify large files
du -sh *
```

### Existing worktree collision

**Error**:
```
Error: Worktree directory already exists
  Path: /Users/dev/my-app-002-user-auth
```

**Solution**: Remove existing worktree or use `--reuse-worktree` flag:
```bash
# Remove existing worktree
bun .speck/scripts/worktree/cli.ts remove 002-user-auth

# Or reuse with flag
--reuse-worktree
```

### IDE launch failure

**Error**:
```
Error: Failed to launch IDE
  Command: code /Users/dev/my-app-002-user-auth
  Exit code: 127
```

**Solution**: Worktree remains usable; verify IDE command:
```bash
# Verify IDE is installed
which code

# Check IDE command in config
cat .speck/config.json

# Open manually if needed
code /Users/dev/my-app-002-user-auth
```

### Dependency installation failure

**Error**:
```
Error: Dependency installation failed
  Package manager: bun
  Exit code: 1
```

**Solution**:
1. Check network connectivity
2. Verify package.json is valid
3. Try manual install: `cd /path/to/worktree && bun install`
4. Disable auto-install in config if needed

### Stale worktree references

Speck automatically detects and cleans up stale references when you run any worktree command. If you see:
```
Detected stale worktree reference: 002-user-auth
  Worktree directory was manually deleted
  Cleaning up Git references...
  ✓ Stale reference removed
```

This is normal behavior - no action needed.

### Unsupported Git version

**Error**:
```
Error: Git version too old
  Current: 2.4.0
  Required: 2.5.0+
```

**Solution**: [Upgrade Git](https://git-scm.com/downloads) to version 2.5 or later.

---

## Getting More Help

If your issue isn't covered here:

1. **Check the docs**: Browse the sidebar for relevant guides
2. **GitHub Issues**: [Report a bug](https://github.com/nprbst/speck/issues) with steps to reproduce
3. **GitHub Discussions**: [Ask questions](https://github.com/nprbst/speck/discussions) and get community help
