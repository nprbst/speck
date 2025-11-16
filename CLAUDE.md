# speck Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-11-14

## Active Technologies
- File-based (markdown specs, JSON tracking files in `.speck/` directory) (001-speck-core-project)
- TypeScript 5.3+ with Bun 1.0+ runtime (primary), Deno 1.40+ compatibility (secondary) + Bun runtime, Git 2.30+, Claude Code (slash command + agent support) (001-speck-core-project)
- TypeScript 5.3+ with Bun 1.0+ runtime (primary), Deno 1.40+ compatibility (secondary - out of scope after clarification) + Bun runtime, Bun Shell API, GitHub REST API (for fetching releases), Claude Code slash command and agent system (001-speck-core-project)
- File-based (markdown specs, JSON tracking files in `.speck/` and `upstream/` directories) (001-speck-core-project)
- TypeScript 5.3+ with Bun 1.0+ runtime + Bun runtime, Bun Shell API, Claude Code agent system, GitHub REST API (for fetching upstream releases) (003-refactor-transform-commands)
- File-based (markdown specs, JSON tracking files in `.speck/`, `.claude/skills/`, `.claude/agents/` directories) (003-refactor-transform-commands)
- TypeScript 5.3+ with Bun 1.0+ runtime + Bun Shell API, GitHub REST API (for upstream releases), Claude Code agent system (003-refactor-transform-commands)

- TypeScript 5.3+ with Bun 1.0+ runtime (primary), Deno 1.40+ compatibility (secondary) (001-speck-core-project)

## Project Structure

```text
src/
tests/
```

## Commands

bun test && bun run lint

## Code Style

TypeScript 5.3+ with Bun 1.0+ runtime (primary), Deno 1.40+ compatibility (secondary): Follow standard conventions

## Recent Changes
- 003-refactor-transform-commands: Added TypeScript 5.3+ with Bun 1.0+ runtime + Bun Shell API, GitHub REST API (for upstream releases), Claude Code agent system
- 003-refactor-transform-commands: Added TypeScript 5.3+ with Bun 1.0+ runtime + Bun runtime, Bun Shell API, Claude Code agent system, GitHub REST API (for fetching upstream releases)
- 001-speck-core-project: Added TypeScript 5.3+ with Bun 1.0+ runtime (primary), Deno 1.40+ compatibility (secondary - out of scope after clarification) + Bun runtime, Bun Shell API, GitHub REST API (for fetching releases), Claude Code slash command and agent system


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
