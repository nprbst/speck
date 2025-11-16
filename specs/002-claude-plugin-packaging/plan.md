# Implementation Plan: Claude Plugin Packaging

**Branch**: `002-claude-plugin-packaging` | **Date**: 2025-11-15 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-claude-plugin-packaging/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Package Speck as an installable Claude Code plugin for distribution via Claude Marketplace. The plugin will bundle all existing Speck slash commands, agents, and templates into a standards-compliant `.claude-plugin/` structure with plugin.json manifest and marketplace.json for discoverability. This enables one-click installation of Speck's complete specification and planning workflow without manual setup.

## Technical Context

**Language/Version**: TypeScript 5.3+ with Bun 1.0+ runtime
**Primary Dependencies**: Bun shell API, JSON/YAML parsers, file system operations
**Storage**: File-based (markdown commands, JSON manifests, templates)
**Testing**: Bun test framework for build script validation
**Target Platform**: Claude Code 2.0+ plugin system (cross-platform: macOS, Linux, Windows)
**Project Type**: Build tooling and packaging (generates plugin artifacts from existing codebase)
**Performance Goals**: Build completes in <5 seconds, package size under 5MB
**Constraints**: Must conform to Claude Plugin specification (.claude-plugin/plugin.json + marketplace.json), preserve existing command/agent functionality
**Scale/Scope**: Package 20+ slash commands, 2+ agents, 10+ templates, constitution files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Status**: ✅ PASS (no constitution file exists yet - no gates to enforce)

Note: This project does not yet have a `.speck/memory/constitution.md` file defining architectural principles or complexity gates. Once established, this section will validate against those principles.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

**Existing Speck structure** (commands/agents to be packaged):
```text
.claude/
├── commands/              # Slash commands (20+ .md files)
│   ├── speck.specify.md
│   ├── speck.plan.md
│   ├── speck.clarify.md
│   ├── speck.tasks.md
│   ├── speck.implement.md
│   └── ... (15+ more)
├── agents/                # Subagents (2 .md files)
│   ├── speck.transform-bash-to-bun.md
│   └── speck.transform-commands.md
└── skills/                # Reusable skills (1 .md file)
    └── speck-runner.md    # Script execution delegate for plugin context

.specify/
├── templates/             # Spec/plan templates
├── scripts/               # Build & workflow scripts
└── memory/                # Constitution & context

.speck/
└── scripts/               # Check & setup scripts
```

**New plugin packaging structure** (to be created):
```text
.claude-plugin/
├── plugin.json            # Plugin manifest (name, version, author, metadata)
└── marketplace.json       # Marketplace listing (description, keywords, source)

dist/plugin/               # Build output directory
├── .claude-plugin/
│   ├── plugin.json
│   └── marketplace.json
├── commands/              # Copied from .claude/commands/
├── agents/                # Copied from .claude/agents/
├── skills/                # Copied from .claude/skills/
├── templates/             # Copied from .specify/templates/
└── scripts/               # Copied from .speck/scripts/ (bundled for skill access)

scripts/
└── build-plugin.ts        # Build script: copies commands/agents/skills/templates/scripts to dist/plugin/, generates manifests
```

**Structure Decision**: Single project with build tooling. The build script copies existing `.claude/commands/`, `.claude/agents/`, and `.specify/templates/` into a new `dist/plugin/` directory alongside generated `.claude-plugin/plugin.json` and `marketplace.json` manifests. The plugin structure conforms to Claude Code plugin specifications discovered in research.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
