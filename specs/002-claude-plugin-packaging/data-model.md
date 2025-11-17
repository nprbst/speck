# Data Model: Claude Plugin Packaging

**Feature**: 002-claude-plugin-packaging
**Date**: 2025-11-15
**Purpose**: Define entities, attributes, relationships, and validation rules for Speck plugin packaging

## Overview

This data model describes the entities involved in packaging Speck as a Claude Code plugin and distributing it via Claude Marketplace. The model focuses on the structure of plugin artifacts, manifests, and build configuration.

---

## Entity: Plugin Package

**Description**: The complete distributable artifact containing all Speck components, manifests, and documentation.

### Attributes

| Attribute | Type | Required | Validation | Description |
|-----------|------|----------|------------|-------------|
| `rootPath` | string (path) | Yes | Valid directory path | Root directory of plugin package |
| `manifestPath` | string (path) | Yes | `.claude-plugin/plugin.json` | Path to plugin manifest |
| `marketplacePath` | string (path) | Yes | `.claude-plugin/marketplace.json` | Path to marketplace manifest |
| `commandsPath` | string (path) | Yes | `commands/` | Directory containing slash commands |
| `agentsPath` | string (path) | Yes | `agents/` | Directory containing subagents |
| `templatesPath` | string (path) | Yes | `templates/` | Directory containing spec/plan templates |
| `scriptsPath` | string (path) | Yes | `scripts/` | Directory containing build/workflow scripts |
| `readmePath` | string (path) | Yes | `README.md` | Plugin documentation file |
| `changelogPath` | string (path) | Yes | `CHANGELOG.md` | Version history file |
| `totalSizeBytes` | number | Yes | Must be ≤ 5242880 (5MB) | Total package size in bytes |
| `version` | string | Yes | Semantic versioning format (e.g., "0.1.0") | Plugin version |
| `createdAt` | ISO 8601 datetime | Yes | Valid datetime | Build timestamp |

### Relationships

- **Contains** 1..* Command Files
- **Contains** 1..* Agent Files
- **Contains** 1..* Template Files
- **Contains** 1..* Script Files
- **Has** 1 Plugin Manifest
- **Has** 1 Marketplace Manifest
- **Includes** 1 README
- **Includes** 1 CHANGELOG

### State Transitions

```
[Not Built] --[Build Initiated]--> [Building]
[Building] --[Validation Failed]--> [Build Failed]
[Building] --[Validation Passed]--> [Built]
[Built] --[Distribution]--> [Published]
```

### Validation Rules

1. **Size Constraint**: `totalSizeBytes <= 5242880` (5MB limit per FR-022)
2. **Version Format**: `version` must match regex `^\d+\.\d+\.\d+$` (semver per FR-026)
3. **Required Files**: All paths must exist and be readable
4. **Manifest Validity**: Both manifests must parse as valid JSON
5. **Command Validity**: All `.md` files in `commandsPath` must be valid Markdown
6. **Agent Validity**: All `.md` files in `agentsPath` must have valid YAML frontmatter

---

## Entity: Plugin Manifest

**Description**: Configuration file (`.claude-plugin/plugin.json`) defining plugin metadata, dependencies, and installation behavior.

### Attributes

| Attribute | Type | Required | Validation | Description |
|-----------|------|----------|------------|-------------|
| `name` | string | Yes | Lowercase, hyphens only, max 64 chars | Plugin identifier ("speck") |
| `description` | string | Yes | Max 1024 chars | Brief plugin purpose |
| `version` | string | Yes | Semantic versioning format | Plugin version ("0.1.0") |
| `author` | object | Yes | Must contain `name` field | Author information |
| `author.name` | string | Yes | Non-empty string | Author's name |
| `author.email` | string | No | Valid email format | Author's email |
| `author.url` | string | No | Valid URL | Author's website |
| `homepage` | string | No | Valid URL | Plugin homepage |
| `repository` | string | No | Valid URL or git URL | Source repository |
| `license` | string | No | SPDX identifier | License type ("MIT") |
| `keywords` | array[string] | No | Max 10 items | Search keywords |
| `dependencies` | object | No | Key-value pairs | Required system dependencies |

### Relationships

- **Belongs to** 1 Plugin Package
- **References** 1..* Command Files (implicitly via `commandsPath`)
- **References** 1..* Agent Files (implicitly via `agentsPath`)

### State Transitions

```
[Template] --[Generate]--> [Draft]
[Draft] --[Validate]--> [Valid]
[Draft] --[Validate]--> [Invalid]
[Valid] --[Write to Disk]--> [Persisted]
```

### Validation Rules

1. **Name Format**: Lowercase letters, numbers, hyphens only; max 64 chars (per research findings)
2. **Version Format**: Must match semantic versioning (per FR-012, FR-026)
3. **Required Fields**: name, description, version, author.name must be present
4. **JSON Validity**: Must parse as valid JSON with proper encoding
5. **Description Length**: Max 1024 characters (per research)
6. **Keywords Count**: Max 10 keywords (reasonable limit for searchability)

### Example

```json
{
  "name": "speck",
  "description": "Specification and planning workflow framework for Claude Code",
  "version": "0.1.0",
  "author": {
    "name": "Nathan Prabst",
    "email": "nathan@example.com"
  },
  "homepage": "https://github.com/nprbst/speck",
  "repository": "https://github.com/nprbst/speck",
  "license": "MIT",
  "keywords": [
    "specification",
    "planning",
    "workflow",
    "feature-management",
    "development-tools"
  ],
  "dependencies": {
    "git": ">=2.30.0",
    "shell": "bash"
  }
}
```

---

## Entity: Marketplace Manifest

**Description**: Configuration file (`.claude-plugin/marketplace.json`) for plugin listing in Claude Marketplace catalogs.

### Attributes

| Attribute | Type | Required | Validation | Description |
|-----------|------|----------|------------|-------------|
| `name` | string | Yes | Kebab-case | Marketplace identifier |
| `owner` | object | Yes | Must contain `name` field | Marketplace maintainer |
| `owner.name` | string | Yes | Non-empty string | Maintainer name |
| `owner.email` | string | No | Valid email | Maintainer contact |
| `metadata` | object | No | Valid object | Marketplace-level metadata |
| `metadata.description` | string | No | Max 2048 chars | Marketplace overview |
| `metadata.version` | string | No | Semantic versioning | Marketplace version |
| `metadata.pluginRoot` | string | No | Valid path | Base path for relative sources |
| `plugins` | array[object] | Yes | Non-empty array | Plugin entries |

### Plugin Entry Schema

Each entry in `plugins` array:

| Attribute | Type | Required | Validation | Description |
|-----------|------|----------|------------|-------------|
| `name` | string | Yes | Kebab-case | Plugin identifier |
| `source` | string or object | Yes | Valid URL or path | Plugin location |
| `description` | string | No | Max 1024 chars | Plugin description |
| `version` | string | No | Semantic versioning | Plugin version |
| `author` | object | No | Valid object | Author info |
| `keywords` | array[string] | No | Max 10 items | Search keywords |
| `category` | string | No | Predefined categories | Plugin category |
| `strict` | boolean | No | Default: true | Require plugin.json? |

### Relationships

- **Belongs to** 1 Plugin Package
- **Lists** 1..* Plugin Entries
- **Each Entry References** 1 Plugin Source (URL or path)

### State Transitions

```
[Template] --[Generate]--> [Draft]
[Draft] --[Add Plugin Entry]--> [Updated]
[Updated] --[Validate]--> [Valid]
[Updated] --[Validate]--> [Invalid]
[Valid] --[Publish to Git]--> [Published]
```

### Validation Rules

1. **Required Fields**: name, owner, plugins array must be present
2. **Plugins Array**: Must contain at least one entry
3. **Plugin Entry**: Each entry must have `name` and `source`
4. **Source Validity**: Source must be valid URL or relative path
5. **Strict Mode**: When `strict: true`, plugin must include plugin.json manifest
6. **JSON Validity**: Must parse as valid JSON

### Example

```json
{
  "name": "speck-marketplace",
  "owner": {
    "name": "Nathan Prabst",
    "email": "nathan@example.com"
  },
  "metadata": {
    "description": "Official Speck plugin marketplace",
    "version": "1.0.0"
  },
  "plugins": [
    {
      "name": "speck",
      "source": "https://github.com/nprbst/speck",
      "description": "Specification and planning workflow framework for Claude Code",
      "version": "0.1.0",
      "keywords": [
        "specification",
        "planning",
        "workflow"
      ],
      "category": "development-tools",
      "strict": true
    }
  ]
}
```

---

## Entity: Command File

**Description**: Markdown file defining a slash command with optional YAML frontmatter.

### Attributes

| Attribute | Type | Required | Validation | Description |
|-----------|------|----------|------------|-------------|
| `filePath` | string (path) | Yes | `.md` extension | File path relative to commands/ |
| `fileName` | string | Yes | Kebab-case, no spaces | Command file name |
| `commandName` | string | Yes | Derived from fileName (without .md) | Command invocation name |
| `frontmatter` | object | No | Valid YAML | YAML frontmatter metadata |
| `frontmatter.description` | string | No | Max 256 chars | Command description for help |
| `frontmatter.allowed-tools` | string | No | Comma-separated tool names | Restricted tool access |
| `frontmatter.model` | string | No | sonnet\|opus\|haiku\|inherit | Model preference |
| `frontmatter.argument-hint` | string | No | Max 128 chars | Argument usage hint |
| `frontmatter.disable-model-invocation` | boolean | No | true\|false | Skip LLM invocation |
| `content` | string | Yes | Valid Markdown | Command prompt/instructions |
| `sizeBytes` | number | Yes | ≤ 100KB (reasonable limit) | File size in bytes |

### Relationships

- **Belongs to** 1 Plugin Package
- **Invoked by** 0..* Users (at runtime)

### State Transitions

```
[Source File] --[Copy to Package]--> [Packaged]
[Packaged] --[Validation]--> [Valid]
[Packaged] --[Validation]--> [Invalid]
[Valid] --[Plugin Install]--> [Available]
```

### Validation Rules

1. **File Extension**: Must be `.md`
2. **Frontmatter Format**: If present, must be valid YAML between `---` delimiters
3. **Content Format**: Must be valid Markdown (parseable)
4. **Command Name**: Derived from file name; must be unique within package
5. **Tool Names**: If `allowed-tools` specified, must be valid Claude tool names
6. **Model Values**: If `model` specified, must be one of: sonnet, opus, haiku, inherit
7. **File Size**: Should be ≤ 100KB (individual command file size limit)

### Example File Structure

**File**: `commands/speck.specify.md`

```markdown
---
description: Create or update feature specification from natural language
allowed-tools: Read, Write, Glob, Grep, Bash
model: sonnet
argument-hint: "feature description"
---

You are creating or updating a feature specification...
[Command instructions continue...]
```

---

## Entity: Agent File

**Description**: Markdown file defining a subagent with required YAML frontmatter.

### Attributes

| Attribute | Type | Required | Validation | Description |
|-----------|------|----------|------------|-------------|
| `filePath` | string (path) | Yes | `.md` extension | File path relative to agents/ |
| `fileName` | string | Yes | Kebab-case | Agent file name |
| `agentName` | string | Yes | From frontmatter `name` field | Agent identifier |
| `frontmatter` | object | Yes | Valid YAML with required fields | Agent metadata |
| `frontmatter.name` | string | Yes | Lowercase, hyphens only | Agent identifier |
| `frontmatter.description` | string | Yes | Max 1024 chars | Agent purpose and usage |
| `frontmatter.tools` | string | No | Comma-separated tool names | Allowed tools |
| `frontmatter.model` | string | No | sonnet\|opus\|haiku\|inherit | Model preference |
| `content` | string | Yes | Valid Markdown | System prompt defining agent behavior |
| `sizeBytes` | number | Yes | ≤ 50KB (reasonable limit) | File size in bytes |

### Relationships

- **Belongs to** 1 Plugin Package
- **Invoked by** 0..* Commands or Main Agent (at runtime)

### State Transitions

```
[Source File] --[Copy to Package]--> [Packaged]
[Packaged] --[Validation]--> [Valid]
[Packaged] --[Validation]--> [Invalid]
[Valid] --[Plugin Install]--> [Available]
```

### Validation Rules

1. **File Extension**: Must be `.md`
2. **Frontmatter Required**: Must have YAML frontmatter with `---` delimiters
3. **Required Fields**: `name` and `description` must be present in frontmatter
4. **Name Format**: Lowercase letters, numbers, hyphens only; max 64 chars
5. **Description Length**: Max 1024 characters
6. **Content Format**: Must be valid Markdown
7. **Unique Name**: Agent name must be unique within package

### Example File Structure

**File**: `agents/speck.transform-bash-to-bun.md`

```markdown
---
name: speck-transform-bash-to-bun
description: Transform bash scripts to Bun TypeScript equivalents
tools: Read, Write, Grep, Glob
model: sonnet
---

You are a specialized agent for transforming bash scripts...
[Agent system prompt continues...]
```

---

## Entity: Template File

**Description**: Handlebars template file for generating specifications, plans, or tasks.

### Attributes

| Attribute | Type | Required | Validation | Description |
|-----------|------|----------|------------|-------------|
| `filePath` | string (path) | Yes | `.md.hbs` or `.md` extension | File path relative to templates/ |
| `fileName` | string | Yes | Descriptive name | Template file name |
| `templateType` | string | Yes | spec\|plan\|tasks\|constitution | Template category |
| `content` | string | Yes | Valid Handlebars or Markdown | Template content |
| `sizeBytes` | number | Yes | ≤ 50KB | File size in bytes |

### Relationships

- **Belongs to** 1 Plugin Package
- **Used by** 1..* Commands (at runtime)

### State Transitions

```
[Source File] --[Copy to Package]--> [Packaged]
[Packaged] --[Plugin Install]--> [Available]
[Available] --[Command Invocation]--> [Rendered]
```

### Validation Rules

1. **File Extension**: `.md.hbs` for Handlebars templates, `.md` for static Markdown
2. **Content Format**: Valid Handlebars syntax (if `.hbs`) or Markdown
3. **Template Type**: Must be categorized (spec, plan, tasks, constitution, etc.)
4. **Size Limit**: ≤ 50KB per template file

---

## Entity: Script File

**Description**: TypeScript executable script for build and workflow automation.

### Attributes

| Attribute | Type | Required | Validation | Description |
|-----------|------|----------|------------|-------------|
| `filePath` | string (path) | Yes | `.ts` extension | File path relative to scripts/ |
| `fileName` | string | Yes | Kebab-case | Script file name |
| `scriptPurpose` | string | Yes | Descriptive purpose | What the script does |
| `content` | string | Yes | Valid TypeScript | Script code |
| `executable` | boolean | Yes | true | Must be executable |
| `sizeBytes` | number | Yes | ≤ 100KB | File size in bytes |

### Relationships

- **Belongs to** 1 Plugin Package
- **Invoked by** 1..* Commands (at runtime)

### State Transitions

```
[Source File] --[Copy to Package]--> [Packaged]
[Packaged] --[Plugin Install]--> [Available]
[Available] --[Command Execution]--> [Running]
```

### Validation Rules

1. **File Extension**: `.ts` (TypeScript)
2. **Content Format**: Valid TypeScript syntax
3. **Executable**: Must have execute permissions (chmod +x)
4. **Runtime**: Must be runnable with Bun runtime
5. **Size Limit**: ≤ 100KB per script file

---

## Entity: Build Configuration

**Description**: Configuration object controlling the build process for plugin packaging.

### Attributes

| Attribute | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `sourceRoot` | string (path) | Yes | - | Repository root directory |
| `outputDir` | string (path) | Yes | `dist/plugin/` | Build output directory |
| `commandsSourceDir` | string (path) | Yes | `.claude/commands/` | Source directory for commands |
| `agentsSourceDir` | string (path) | Yes | `.claude/agents/` | Source directory for agents |
| `templatesSourceDir` | string (path) | Yes | `.specify/templates/` | Source directory for templates |
| `scriptsSourceDir` | string (path) | Yes | `.specify/scripts/` | Source directory for scripts |
| `version` | string | Yes | From package.json | Plugin version |
| `maxSizeBytes` | number | Yes | 5242880 | Maximum package size (5MB) |
| `validateCommands` | boolean | No | true | Validate command Markdown/frontmatter |
| `validateAgents` | boolean | No | true | Validate agent frontmatter |
| `failOnOversized` | boolean | No | true | Fail build if size exceeds max |

### Relationships

- **Configures** 1 Build Process
- **Produces** 1 Plugin Package

### Validation Rules

1. **Source Directories**: All source directories must exist and be readable
2. **Output Directory**: Must be writable
3. **Version Format**: Must be valid semantic versioning
4. **Max Size**: Must be positive integer
5. **Path Resolution**: All paths must resolve correctly from sourceRoot

---

## Relationships Diagram

```
Plugin Package (1)
├── Contains (1) Plugin Manifest
├── Contains (1) Marketplace Manifest
├── Contains (*) Command Files
├── Contains (*) Agent Files
├── Contains (*) Template Files
├── Contains (*) Script Files
├── Includes (1) README
└── Includes (1) CHANGELOG

Build Configuration (1)
└── Produces (1) Plugin Package

Marketplace Manifest (1)
└── Lists (*) Plugin Entries
    └── References (1) Plugin Source
```

---

## Key Validation Chains

### Build-Time Validation Chain

1. **Build Configuration Validation**
   - Source directories exist and readable
   - Version is valid semver
   - Output directory is writable

2. **Source File Validation**
   - All command files are valid Markdown with proper frontmatter
   - All agent files have required frontmatter (name, description)
   - All template files are valid Handlebars or Markdown
   - All script files are valid TypeScript

3. **Package Validation**
   - Total size ≤ 5MB (FR-022, FR-025)
   - Plugin manifest is valid JSON with required fields
   - Marketplace manifest is valid JSON with required fields
   - All required files present (commands, agents, templates, scripts, README, CHANGELOG)

4. **Post-Build Validation**
   - Package structure matches plugin specification
   - All file paths resolve correctly
   - No duplicate command/agent names

### Installation-Time Validation (Out of Scope)

Installation, dependency checking, and runtime validation are handled by Claude Plugin system (per spec scope boundaries).

---

## Size Budget Breakdown

| Component | Estimated Count | Size per File | Total |
|-----------|----------------|---------------|-------|
| Commands | 20 files | ~2KB | ~40KB |
| Agents | 2 files | ~5KB | ~10KB |
| Templates | 10 files | ~5KB | ~50KB |
| Scripts | 10 files | ~10KB | ~100KB |
| README | 1 file | ~10KB | ~10KB |
| CHANGELOG | 1 file | ~10KB | ~10KB |
| Manifests | 2 files | ~2KB | ~4KB |
| **Total** | **46 files** | - | **~224KB** |

**Margin**: 4.82MB remaining under 5MB limit (96% headroom)

---

## Glossary

- **Plugin Package**: Complete distributable artifact with all Speck components
- **Plugin Manifest**: `.claude-plugin/plugin.json` configuration file
- **Marketplace Manifest**: `.claude-plugin/marketplace.json` listing configuration
- **Command File**: Markdown file defining a slash command
- **Agent File**: Markdown file defining a subagent
- **Template File**: Handlebars or Markdown template for generating artifacts
- **Script File**: TypeScript automation script
- **Semver**: Semantic versioning (MAJOR.MINOR.PATCH format)
- **Frontmatter**: YAML metadata block at top of Markdown files
- **Kebab-case**: Lowercase with hyphens (e.g., "speck-specify")
