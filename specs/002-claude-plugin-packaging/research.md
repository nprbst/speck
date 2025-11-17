# Research: Claude Plugin Packaging

**Feature**: 002-claude-plugin-packaging
**Date**: 2025-11-15
**Purpose**: Determine Claude Code plugin format specifications and best practices for packaging Speck

## Overview

This document consolidates research findings on Claude Code's plugin system, marketplace structure, and packaging requirements to inform the implementation of Speck as an installable plugin.

## Decision 1: Plugin Manifest Format

**Decision**: Use `.claude-plugin/plugin.json` with required fields: name, description, version, author

**Rationale**:
- Official Claude Code plugin specification requires `plugin.json` at `.claude-plugin/` directory
- Manifest provides metadata for plugin discovery, installation, and management
- Supports semantic versioning for update mechanism
- Author field enables attribution and support contact

**Schema** (based on official docs):
```json
{
  "name": "plugin-identifier",
  "description": "Brief explanation of plugin purpose",
  "version": "1.0.0",
  "author": {
    "name": "Author Name"
  }
}
```

**Optional fields**: homepage, repository, license, keywords

**Alternatives considered**:
- ❌ Package.json only: Rejected because Claude Code expects `.claude-plugin/plugin.json` specifically
- ❌ YAML manifest: Rejected because spec requires JSON format

**References**:
- https://code.claude.com/docs/en/plugins
- Plugin manifest must be at `.claude-plugin/plugin.json` (exact path)

---

## Decision 2: Marketplace Distribution Format

**Decision**: Use `.claude-plugin/marketplace.json` with plugins array listing source and metadata

**Rationale**:
- Marketplace enables plugin discoverability and centralized distribution
- Git repository hosting (GitHub) provides free, version-controlled marketplace hosting
- Supports both strict mode (requires plugin.json) and non-strict mode (marketplace.json as manifest)
- Allows categorization via tags/keywords for searchability

**Schema**:
```json
{
  "name": "marketplace-name",
  "owner": {
    "name": "Maintainer Name"
  },
  "plugins": [
    {
      "name": "plugin-name",
      "source": "https://github.com/user/repo",
      "description": "Plugin description",
      "version": "1.0.0",
      "keywords": ["tag1", "tag2"],
      "category": "development-tools"
    }
  ]
}
```

**Required fields**: name, owner, plugins (array with name + source per entry)

**Alternatives considered**:
- ❌ npm registry: Rejected - Claude Code uses git-based distribution, not npm
- ❌ Custom hosting: Rejected - GitHub provides free hosting with built-in version control
- ❌ No marketplace: Rejected - reduces discoverability and user adoption

**References**:
- https://code.claude.com/docs/en/plugin-marketplaces
- Marketplace hosting: "all you need is a git repository"

---

## Decision 3: Plugin Directory Structure

**Decision**: Use standard plugin structure with `commands/`, `agents/`, and custom `templates/` directory

**Directory layout**:
```
plugin-root/
├── .claude-plugin/
│   ├── plugin.json
│   └── marketplace.json
├── commands/              # Slash commands (.md files)
├── agents/                # Subagents (.md files)
├── templates/             # Custom: Speck templates
└── scripts/               # Custom: Speck helper scripts
```

**Rationale**:
- `commands/` and `agents/` are standard Claude plugin directories recognized automatically
- Templates and scripts are Speck-specific resources needed for workflow execution
- Plugin manifest can specify custom paths via component configuration fields
- Structure preserves existing Speck organization while conforming to plugin conventions

**Component defaults** (overridable in plugin.json):
- Commands: `commands/` directory
- Agents: `agents/` directory
- Skills: `skills/` directory (not used by Speck)
- Hooks: `hooks.json` (not used by Speck)
- MCP servers: `.mcp.json` (not used by Speck)

**Alternatives considered**:
- ❌ Flatten all files to root: Rejected - loses organization, conflicts with plugin conventions
- ❌ Single bundled file: Rejected - plugin system expects directory structure
- ❌ Nested subdirectories in commands/: Possible but adds complexity; flat structure sufficient

**References**:
- https://code.claude.com/docs/en/plugins (directory structure)
- Plugin manifest supports custom component paths via configuration fields

---

## Decision 4: Slash Command Format

**Decision**: Use Markdown files with YAML frontmatter for command definitions

**Format**:
```markdown
---
description: Brief command description
allowed-tools: Read, Grep, Glob, Bash
model: sonnet
---

Command instructions and prompt content...
```

**Rationale**:
- Official Claude Code command format is Markdown with optional YAML frontmatter
- Frontmatter allows metadata (description, allowed-tools, model) without modifying content
- Existing Speck commands already use this format - no conversion needed
- `description` field appears in `/help` output and autocomplete
- `allowed-tools` restricts tool access for security/scoping

**Required fields**: None (frontmatter is optional, but description recommended for UX)

**Optional frontmatter fields**:
- `description`: Command description for help text
- `allowed-tools`: Comma-separated tool list (e.g., "Read, Grep, Glob")
- `model`: Model preference (sonnet, opus, haiku, inherit)
- `argument-hint`: Usage hint for command arguments
- `disable-model-invocation`: Skip LLM for pure text expansion

**Alternatives considered**:
- ❌ JSON command definitions: Rejected - not supported by Claude Code
- ❌ Executable scripts: Rejected - commands are prompts, not executables
- ❌ No frontmatter: Possible but loses metadata/configuration benefits

**References**:
- https://code.claude.com/docs/en/slash-commands
- Commands are "Markdown files with optional frontmatter metadata"

---

## Decision 5: Agent/Subagent Format

**Decision**: Use Markdown files with YAML frontmatter in `agents/` directory

**Format**:
```markdown
---
name: agent-identifier
description: Natural language description of agent purpose
tools: Tool1, Tool2, Tool3
model: sonnet
---

System prompt defining agent role, capabilities, and behavior...
```

**Rationale**:
- Official format for Claude Code subagents
- Frontmatter defines agent metadata (name, description, tool access, model)
- Body contains system prompt guiding agent behavior
- `tools` field restricts available tools for security/focus
- Existing Speck agents already use this format

**Required frontmatter fields**:
- `name`: Unique identifier (lowercase letters, hyphens)
- `description`: When and why to use this agent

**Optional frontmatter fields**:
- `tools`: Comma-separated tool list (inherits all if omitted)
- `model`: Model preference (sonnet, opus, haiku, inherit)

**Storage locations**:
- Project: `.claude/agents/` (highest priority)
- User: `~/.claude/agents/` (cross-project)
- Plugin: `agents/` directory in plugin root

**Alternatives considered**:
- ❌ JSON agent definitions: Rejected - not supported format
- ❌ Programmatic agent SDK: Rejected - Markdown format is simpler, sufficient
- ❌ Inline system prompts without frontmatter: Rejected - loses metadata

**References**:
- https://code.claude.com/docs/en/sub-agents
- "Markdown files with YAML frontmatter"

---

## Decision 6: Build Process Strategy

**Decision**: Create TypeScript build script (`scripts/build-plugin.ts`) using Bun runtime

**Build steps**:
1. Validate source files exist (commands, agents, templates)
2. Generate `.claude-plugin/plugin.json` from template with version from package.json
3. Generate `.claude-plugin/marketplace.json` with metadata
4. Copy commands from `.claude/commands/` to `dist/plugin/commands/`
5. Copy agents from `.claude/agents/` to `dist/plugin/agents/`
6. Copy templates from `.specify/templates/` to `dist/plugin/templates/`
7. Copy scripts from `.specify/scripts/` to `dist/plugin/scripts/`
8. Validate total size < 5MB
9. Validate all command files are well-formed markdown
10. Output `dist/plugin/` directory ready for distribution

**Rationale**:
- TypeScript + Bun aligns with existing Speck tech stack
- Bun shell API simplifies file operations (copy, mkdir)
- Build script can validate package before distribution
- Automated process prevents manual packaging errors
- Version sync from package.json ensures consistency

**Alternatives considered**:
- ❌ Manual packaging: Rejected - error-prone, not repeatable
- ❌ Bash script: Rejected - TypeScript provides better error handling and validation
- ❌ npm/package.json scripts only: Rejected - need validation logic beyond simple copy

**References**:
- Existing Speck build scripts in `.speck/scripts/` use TypeScript + Bun
- Package.json already configured for Bun 1.0+

---

## Decision 7: Versioning Strategy

**Decision**: Use semantic versioning (semver) with initial release as `0.1.0`

**Version source**: `package.json` version field (single source of truth)

**Rationale**:
- Semantic versioning required by Claude plugin specification
- Initial `0.1.0` signals early/beta status appropriate for first release
- Syncing from package.json prevents version drift between npm and plugin
- Supports standard npm version bumping workflow

**Version format**: `MAJOR.MINOR.PATCH`
- MAJOR: Breaking changes to command interfaces or workflows
- MINOR: New commands, agents, or features (backward compatible)
- PATCH: Bug fixes, documentation updates

**Alternatives considered**:
- ❌ Date-based versioning (2025.11.15): Rejected - semver required by spec
- ❌ Separate plugin version: Rejected - creates drift risk
- ❌ Start at 1.0.0: Rejected - 0.x signals pre-stable development

**References**:
- Spec requirement FR-009: "plugin manifest MUST use version '0.1.0' for initial release"
- Spec requirement FR-026: "build MUST fail if version doesn't conform to semantic versioning"

---

## Decision 8: Package Size Management

**Decision**: Enforce 5MB limit with build-time validation, exclude node_modules and tests

**Size budget allocation**:
- Commands (~20 files × ~2KB): ~40KB
- Agents (~2 files × ~5KB): ~10KB
- Templates (~10 files × ~5KB): ~50KB
- Scripts (~10 files × ~10KB): ~100KB
- Documentation (README, CHANGELOG): ~20KB
- Manifests (plugin.json, marketplace.json): ~5KB
- **Total estimated**: ~225KB (well under 5MB limit)

**Excluded from package**:
- node_modules/ (users install plugin, not npm dependencies)
- tests/ (not needed at runtime)
- .git/ (version control not needed in distribution)
- specs/ (implementation artifacts, not user-facing)
- dist/ (build outputs)

**Rationale**:
- 5MB limit specified in requirements (FR-022, SC-007)
- Build script calculates total size and fails if exceeded (FR-025)
- Excluding dev dependencies dramatically reduces size
- Commands/agents/templates are text files - inherently small

**Monitoring strategy**:
- Build script logs total package size
- Fail build with descriptive error if > 5MB
- List largest files if approaching limit

**Alternatives considered**:
- ❌ No size limit: Rejected - spec requires <5MB
- ❌ Compression/minification: Rejected - unnecessary given small text file sizes
- ❌ Lazy loading: Rejected - plugin system loads all files on install

**References**:
- Spec requirement FR-022: "plugin package size MUST be under 5MB"
- Spec requirement FR-025: "build MUST fail with descriptive error if total package size exceeds 5MB"

---

## Decision 9: Template and Script Handling

**Decision**: Include templates and scripts in plugin package under custom `templates/` and `scripts/` directories

**Rationale**:
- Speck commands depend on templates (spec.md, plan.md, tasks.md templates)
- Speck commands invoke scripts (check-prerequisites.ts, setup-plan.ts, etc.)
- Plugin manifest supports custom paths for non-standard components
- Distributing templates/scripts with plugin ensures commands work out-of-box

**Template organization**:
```
templates/
├── spec.md.hbs          # Handlebars template for specifications
├── plan.md.hbs          # Handlebars template for plans
├── tasks.md.hbs         # Handlebars template for tasks
└── ... (other templates)
```

**Script organization**:
```
scripts/
├── check-prerequisites.ts
├── setup-plan.ts
├── update-agent-context.ts
└── ... (other helper scripts)
```

**Path resolution**:
- Commands reference templates/scripts via relative paths from plugin root
- Plugin installation places files in user's `.claude/plugins/speck/` directory
- Scripts can resolve paths using `import.meta.url` or plugin root detection

**Alternatives considered**:
- ❌ Inline templates in commands: Rejected - reduces maintainability, increases command file size
- ❌ External template repository: Rejected - creates dependency, complicates installation
- ❌ User provides templates: Rejected - defeats "zero-config" installation goal

**References**:
- Plugin manifest "supports including both executable code and data files" (spec assumption #7)

---

## Decision 10: Documentation and Changelog Requirements

**Decision**: Include README.md and CHANGELOG.md in plugin package root

**README.md contents**:
- Plugin description and purpose
- Quick start guide (installation via `/plugin` command)
- List of available commands with brief descriptions
- Links to full documentation
- System requirements (git, bash/shell access, Claude Code 2.0+)

**CHANGELOG.md format**: Keep a Changelog standard
```markdown
# Changelog

## [0.1.0] - 2025-11-15

### Added
- Initial plugin packaging for Speck
- 20+ slash commands for specification workflow
- 2 specialized agents for transformations
- Complete template library
- Build and workflow scripts
```

**Rationale**:
- FR-016: "plugin package MUST include usage documentation for marketplace display"
- FR-017: "plugin package MUST include changelog documenting version history"
- README shown on marketplace page - critical for user education
- CHANGELOG enables users to track updates and breaking changes

**Alternatives considered**:
- ❌ Link to external docs: Rejected - users want immediate info on marketplace page
- ❌ Minimal docs: Rejected - reduces adoption due to unclear value proposition
- ❌ No changelog: Rejected - required by spec, best practice for version tracking

**References**:
- Spec requirements FR-016, FR-017
- https://keepachangelog.com/ for changelog format standard

---

## Summary of Key Findings

### Claude Plugin Format Specifications

1. **Manifest location**: `.claude-plugin/plugin.json` (required)
2. **Marketplace location**: `.claude-plugin/marketplace.json` (for distribution)
3. **Component directories**:
   - `commands/` - Slash commands (Markdown with YAML frontmatter)
   - `agents/` - Subagents (Markdown with YAML frontmatter)
   - `skills/` - Skills (SKILL.md format) - not used by Speck
   - Custom dirs supported via manifest configuration

4. **File formats**:
   - Commands: Markdown with optional YAML frontmatter
   - Agents: Markdown with required YAML frontmatter (name, description)
   - Manifests: JSON

5. **Distribution**: Git-based (GitHub recommended), installed via `/plugin` command

### Best Practices

1. **Semantic versioning**: Required, start with 0.1.0 for initial release
2. **Size management**: Keep under 5MB (trivial for text-based plugins)
3. **Documentation**: Include README.md and CHANGELOG.md
4. **Validation**: Build script should validate files before packaging
5. **Version sync**: Use package.json as single source of truth
6. **Tool restrictions**: Use `allowed-tools` in frontmatter for security/focus
7. **Descriptions**: Always include for commands/agents (improves UX)

### Implementation Approach

1. Create `.claude-plugin/` directory with manifests
2. Build script copies existing `.claude/commands/` and `.claude/agents/`
3. Include `.specify/templates/` and `.speck/scripts/` for command dependencies
4. Validate package size < 5MB
5. Output to `dist/plugin/` for distribution
6. Host marketplace.json in GitHub repository

### Open Questions Resolved

- ✅ Plugin format specification: Documented and stable (researched Oct-Nov 2025 docs)
- ✅ Manifest schema: Required fields identified (name, description, version, author)
- ✅ Directory structure: Standard `commands/` + `agents/` + custom dirs supported
- ✅ File formats: Markdown + YAML frontmatter for commands/agents
- ✅ Distribution mechanism: Git-based marketplace with `/plugin` installation
- ✅ Size limits: 5MB confirmed, easily achievable with text files
- ✅ Version strategy: Semantic versioning from package.json, start at 0.1.0
- ✅ Template/script handling: Include as custom directories, reference via relative paths

### Next Steps

Proceed to Phase 1 (Design & Contracts):
1. Generate data-model.md defining Plugin Package, Manifest, Marketplace Listing entities
2. Create JSON schemas for plugin.json and marketplace.json in contracts/
3. Generate quickstart.md for plugin development workflow
4. Update CLAUDE.md with plugin packaging technology
