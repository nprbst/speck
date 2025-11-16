# speck Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-11-15

## Active Technologies
- TypeScript 5.3+ with Bun 1.0+ runtime (primary)
- Bun Shell API for git operations and command execution
- GitHub REST API for upstream release fetching
- Claude Code agent system and slash commands
- File-based storage (markdown specs, JSON tracking in `.speck/`, `.claude/skills/`, `.claude/agents/` directories)

## Project Structure

```text
.speck/
├── scripts/                    # TypeScript preprocessing and validation
│   ├── preprocess-commands.ts  # Deterministic text replacements
│   ├── validate-extracted-files.ts  # Quality gates for extracted files
│   ├── create-new-feature.ts   # Feature creation with global sequential numbering
│   └── types/                  # TypeScript type definitions
├── memory/                     # Tracking and cache files
│   ├── transformation-history.json  # Extraction decision records
│   └── best-practices-cache.json    # Cached Claude Code docs
└── upstream/                   # Upstream spec-kit releases

.claude/
├── commands/                   # Slash commands (user-invoked)
├── skills/                     # Auto-invoke capabilities
└── agents/                     # Delegated complex work

specs/                          # Feature specifications
tests/                          # Test files
```

## Commands

```bash
bun test                    # Run all tests
bun test <file>            # Run specific test file
```

## Code Style

- TypeScript 5.3+ with strict mode enabled
- Follow standard TypeScript conventions
- Use explicit types for public APIs
- Document complex logic with inline comments
- Prefer functional patterns over classes where appropriate

## Key Features (003-refactor-transform-commands)

### Preprocessing Pipeline
- Deterministic text replacements before agent analysis
- Standard rules: prefix updates, path normalization, reference updates
- Performance monitoring with 30-second threshold warnings
- Batch error reporting with structured error entries

### Extraction System
- Agent-driven extraction of skills (auto-invoke patterns) and agents (delegated work)
- Validation before file writes with retry loop (up to 3 attempts)
- Decision tracking in transformation-history.json for all extraction choices
- Best practices integration with cached Claude Code documentation

### Global Sequential Feature Numbering
- Feature numbers assigned globally across all features (not per-short-name)
- Checks remote branches, local branches, and specs directories
- Validates uniqueness before creation
- No gap filling - always increments from global maximum

## Recent Changes
- 003-refactor-transform-commands (2025-11-15): Completed refactoring of transform-commands agent with preprocessing separation, extraction validation, and global feature numbering
- 001-speck-core-project: Initial TypeScript/Bun implementation with Claude Code integration


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
