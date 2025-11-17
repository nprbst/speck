# speck Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-11-15

## Active Technologies
- File-based (markdown specs, JSON tracking files in `.speck/` directory) (001-speck-core-project)
- TypeScript 5.3+ with Bun 1.0+ runtime (primary), Deno 1.40+ compatibility (secondary) + Bun runtime, Git 2.30+, Claude Code (slash command + agent support) (001-speck-core-project)
- TypeScript 5.3+ with Bun 1.0+ runtime (primary), Deno 1.40+ compatibility (secondary - out of scope after clarification) + Bun runtime, Bun Shell API, GitHub REST API (for fetching releases), Claude Code slash command and agent system (001-speck-core-project)
- File-based (markdown specs, JSON tracking files in `.speck/` and `upstream/` directories) (001-speck-core-project)
- TypeScript 5.3+ with Bun 1.0+ runtime (primary), Deno 1.40+ compatibility (secondary) (001-speck-core-project)
- Claude Code plugin system 2.0+: .claude-plugin/plugin.json manifest, .claude-plugin/marketplace.json listing, Markdown commands/agents with YAML frontmatter, JSON schema validation (002-claude-plugin-packaging)
- Build tooling: Bun shell API for file operations, JSON/YAML parsing, package size validation (<5MB), semantic versioning from package.json (002-claude-plugin-packaging)

## Project Structure

```text
.claude/
├── commands/              # Slash commands (Markdown with YAML frontmatter)
├── agents/                # Subagents (Markdown with YAML frontmatter)
└── skills/                # Skills (Markdown with YAML frontmatter)

.claude-plugin/            # Plugin manifests (002-claude-plugin-packaging)
├── plugin.json            # Plugin metadata and configuration
└── marketplace.json       # Marketplace listing information

.specify/
├── templates/             # Handlebars templates for specs/plans/tasks
└── scripts/               # Build and workflow automation scripts

.speck/
└── scripts/               # Feature management scripts

dist/plugin/               # Build output (002-claude-plugin-packaging)
├── .claude-plugin/        # Generated manifests
├── commands/              # Packaged slash commands
├── agents/                # Packaged subagents
├── skills/                # Packaged skills
├── templates/             # Packaged templates
└── scripts/               # Packaged scripts

specs/                     # Feature specifications and plans
tests/                     # Test files
```

## Commands

```bash
# Testing
bun test && bun run lint

# Build plugin package (002-claude-plugin-packaging)
bun run scripts/build-plugin.ts

# Validate plugin package
du -sh dist/plugin/  # Check size < 5MB
tree dist/plugin/    # Inspect structure
```

## Code Style

TypeScript 5.3+ with Bun 1.0+ runtime (primary), Deno 1.40+ compatibility (secondary): Follow standard conventions

## Recent Changes
- 002-claude-plugin-packaging: Added Claude Code plugin system 2.0+ with plugin.json manifest, marketplace.json listing, build tooling for packaging
- 002-claude-plugin-packaging: Implemented build process with size validation (<5MB), JSON schema contracts, semantic versioning
- 001-speck-core-project: Added TypeScript 5.3+ with Bun 1.0+ runtime (primary), Deno 1.40+ compatibility (secondary - out of scope after clarification) + Bun runtime, Bun Shell API, GitHub REST API (for fetching releases), Claude Code slash command and agent system
- 001-speck-core-project: Added TypeScript 5.3+ with Bun 1.0+ runtime (primary), Deno 1.40+ compatibility (secondary) + Bun runtime, Git 2.30+, Claude Code (slash command + agent support)
- 001-speck-core-project: Added TypeScript 5.3+


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
