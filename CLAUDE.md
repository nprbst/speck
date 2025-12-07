# speck Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-11-15

## Active Technologies
- TypeScript 5.3+ with Bun 1.0+ runtime + Bun Shell API (filesystem, subprocess), GitHub REST API (releases), `gh` CLI (authentication) (019-openspec-changes-plugin)
- File-based (`.speck/changes/`, `.speck/archive/`, `upstream/openspec/`, `releases.json`) (019-openspec-changes-plugin)

- TypeScript 5.3+ with Bun 1.0+ runtime + Zod (schema validation), Git 2.5+ CLI
  (worktree support), Bun Shell API
- Git worktrees as peer directories of main repository (naming based on
  repository layout)
- Astro 5.15+ + Astro (SSG), Cloudflare Pages (hosting), Cloudflare D1
  (database), Cloudflare Turnstile (spam prevention), Wrangler CLI
- Cloudflare D1 (SQLite-based, serverless)
- `gh` CLI (user-provided)
- File-based configuration (`.speck/config.json`)
- File-based JSON (`.speck/review-state.json`)

### Core Runtime & Languages

- TypeScript 5.3+ with strict type checking
- Bun 1.0+ runtime (primary)
- Git 2.30+

### Core Architecture

- File-based storage: Markdown specs, JSON tracking files in `.speck/` and
  `upstream/` directories
- Symlink-based multi-repo detection (007)
- Virtual command pattern with hook-based architecture (010)

### Claude Code Integration

- Plugin system 2.0+: `.claude-plugin/plugin.json` manifest, marketplace.json
  listing
- Markdown commands/agents/skills with YAML frontmatter
- Hook integration for prerequisite checks and context pre-loading (010)
- Commander.js CLI framework for dual-mode command execution (010)

### Build & Development Tools

- Bun Shell API (filesystem operations, subprocess/stdio, symlinks)
- JSON/YAML parsing
- GitHub REST API (upstream release fetching)
- Handlebars templates (`.specify/templates/`)

### Website Stack (004, 006, 011)

- Astro 5.15+ (static site generator)
- Cloudflare Pages (hosting)
- Shiki 3.15+ (syntax highlighting)
- Markdown content files in `website/src/content/docs/`

### Testing & Quality

- Playwright (visual regression testing)
- Axe-core (accessibility testing)
- TypeScript type checking + ESLint validation

### Multi-Repo & Branching (007, 008, 009)

- `.speck/branches.json` per repository (stacked PR tracking)
- Per-repo constitutions with shared specs
- GitHub CLI (optional, for PR automation)

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

plugins/
├── speck/                 # Main Speck plugin (@speck/speck-plugin)
│   ├── scripts/           # CLI implementations
│   ├── commands/          # Slash command definitions
│   └── skills/            # Skill definitions
└── reviewer/              # PR review plugin (@speck/reviewer-plugin)
    ├── src/               # CLI source code
    ├── commands/          # Slash command definitions
    └── skills/            # Skill definitions

packages/
├── common/                # Shared utilities (@speck/common)
└── maintainer/            # Maintainer tools (@speck/maintainer)

.speck/                    # User project config (runtime directory)
└── config.json            # Worktree and IDE settings

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

- TypeScript 5.3+ with Bun 1.0+ runtime (primary), Deno 1.40+ compatibility
  (secondary): Follow standard conventions
- Astro components: Use `.astro` file extension, TypeScript for scripts, CSS
  scoped styles
- Component props: Define interfaces in
  `specs/004-public-website/contracts/components.ts`
- File naming: PascalCase for components, kebab-case for pages/content

## Terminology Standards

- **Child repo** (preferred): Use consistently instead of "multi-repo child",
  "child repository", "child repo context"
- **Root repo** (preferred): Use instead of "multi-repo root", "parent repo"
  (reserve "parent" for parent spec)
- **Parent spec**: The root specification directory referenced by `parentSpecId`
  field

## Recent Changes
- 019-openspec-changes-plugin: Added TypeScript 5.3+ with Bun 1.0+ runtime + Bun Shell API (filesystem, subprocess), GitHub REST API (releases), `gh` CLI (authentication)

- 018-speck-reviewer-plugin: Added TypeScript 5.3+ with Bun 1.0+ runtime + Bun
  Shell API, `gh` CLI (user-provided)
- 018-speck-reviewer-plugin: Added TypeScript 5.3+ with Bun 1.0+ runtime + Bun
  Shell API, `gh` CLI (user-provided)
  5.15+ + Astro (SSG), Cloudflare Pages (hosting), Cloudflare D1 (database),
  Cloudflare Turnstile (spam prevention), Wrangler CLI

<!-- MANUAL ADDITIONS START -->

## Git Practices

- **Always use `git mv` instead of `mv`** when moving or renaming tracked files.
  This preserves git history and ensures proper tracking of file renames.

<!-- MANUAL ADDITIONS END -->
