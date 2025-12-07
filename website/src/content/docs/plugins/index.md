---
title: "Plugin Extensibility"
description: "Extend Speck's capabilities with optional plugins for specialized workflows"
category: "plugins"
order: 1
lastUpdated: 2025-12-07
tags: ["plugins", "extensibility", "marketplace", "architecture"]
---

# Plugin Extensibility

Speck follows a modular architecture where specialized capabilities are
delivered as optional plugins. This keeps the core Speck plugin focused while
enabling powerful extensions for specific workflows.

## Architecture Overview

Speck's plugin ecosystem consists of:

- **Core Plugin (`speck`)** - Specification workflow: `/speck.specify`,
  `/speck.plan`, `/speck.tasks`, `/speck.implement`
- **Extension Plugins** - Specialized capabilities that build on the core
  workflow

Extension plugins are distributed through the same marketplace as the core
plugin, making installation seamless.

## Available Plugins

| Plugin                                     | Purpose                                     | Status    |
| ------------------------------------------ | ------------------------------------------- | --------- |
| [speck-reviewer](./plugins/speck-reviewer) | AI-assisted PR review with cluster analysis | Available |

## Installation

All Speck plugins are installed through the Claude Code plugin system:

```bash
# Add the Speck marketplace (if not already added)
/plugin marketplace add nprbst/speck-market

# Install any Speck plugin
/plugin install <plugin-name>@speck-market
```

## Plugin Coexistence

Speck plugins are designed to work alongside each other without conflicts:

- Each plugin has its own namespace for commands and skills
- Plugins share the `.speck/` configuration directory when appropriate
- No plugin dependencies are forced - install only what you need

## Creating Plugins

Speck's plugin architecture follows the Claude Code plugin specification. To
create your own Speck extension:

1. Create a `plugin.json` manifest with your commands/skills
2. Register your plugin in a marketplace (or create a PR against `speck-market`)
3. Users install via `/plugin install`

See the
[Claude Code Plugin Documentation](https://code.claude.com/docs/en/plugins) for
the full specification.

## Next Steps

- [Install Speck Reviewer](./plugins/speck-reviewer) - AI-assisted PR review
- [Quick Start Guide](/getting-started/quick-start) - Get started with core
  Speck
