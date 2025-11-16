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
- Markdown with YAML frontmatter (Claude Code skill format) + Claude Code plugin system 2.0+, existing Speck templates in `.specify/templates/` (005-speck-skill)
- File-based, reads from `specs/NUM-short-name/` directories and `.specify/templates/` (005-speck-skill)
- Astro 4.x (static site generator), Cloudflare Pages (hosting), Cloudflare Images (image optimization), Shiki or Prism (syntax highlighting), Playwright (visual regression testing), Axe-core (accessibility testing) (004-public-website)

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

src/                       # Core Speck CLI/scripts (001-speck-core-project)

website/                   # Public website (004-public-website)
├── src/
│   ├── components/        # Astro components
│   ├── content/docs/      # Documentation (synced from main repo)
│   ├── layouts/           # Page layouts
│   ├── pages/             # File-based routing
│   └── styles/            # Global styles, theme
├── public/                # Static assets
└── scripts/               # Build scripts (doc sync)
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

# Website (004-public-website)
bun run website:sync      # Sync docs from main repo
bun run website:dev       # Start dev server (localhost:4321)
bun run website:build     # Build for production
bun test                  # Run all tests (unit, visual, a11y)
```

## Code Style

- TypeScript 5.3+ with Bun 1.0+ runtime (primary), Deno 1.40+ compatibility (secondary): Follow standard conventions
- Astro components: Use `.astro` file extension, TypeScript for scripts, CSS scoped styles
- Component props: Define interfaces in `specs/004-public-website/contracts/components.ts`
- File naming: PascalCase for components, kebab-case for pages/content

## Recent Changes
- 005-speck-skill: Added Markdown with YAML frontmatter (Claude Code skill format) + Claude Code plugin system 2.0+, existing Speck templates in `.specify/templates/`
- 004-public-website: Added Astro 4.x static site generator, Cloudflare Pages deployment, documentation sync from main repo, visual regression testing with Playwright, accessibility testing with Axe-core
- 002-claude-plugin-packaging: Added Claude Code plugin system 2.0+ with plugin.json manifest, marketplace.json listing, build tooling for packaging
- 002-claude-plugin-packaging: Implemented build process with size validation (<5MB), JSON schema contracts, semantic versioning
- 001-speck-core-project: Added TypeScript 5.3+ with Bun 1.0+ runtime (primary), Deno 1.40+ compatibility (secondary - out of scope after clarification) + Bun runtime, Bun Shell API, GitHub REST API (for fetching releases), Claude Code slash command and agent system
- 001-speck-core-project: Added TypeScript 5.3+ with Bun 1.0+ runtime (primary), Deno 1.40+ compatibility (secondary) + Bun runtime, Git 2.30+, Claude Code (slash command + agent support)
- 001-speck-core-project: Added TypeScript 5.3+


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
