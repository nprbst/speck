# Speck

**Claude Code-Native Spec-Driven Development**

[![Version](https://img.shields.io/badge/version-1.10.2-blue.svg)](https://github.com/nprbst/speck/releases)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Bun](https://img.shields.io/badge/Bun-1.0+-black.svg)](https://bun.sh)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-2.0+-orange.svg)](https://claude.ai/code)

Speck is a specification-driven development framework that brings GitHub's
[spec-kit](https://github.com/github/spec-kit) methodology to Claude Code. It
provides slash commands, a natural language skill, and a CLI to help teams
structure feature development through a disciplined three-phase workflow:
**Specify** what you're building, **Plan** how you'll build it, **Implement**
the plan.

<!-- TODO: Add asciinema recording demonstrating the workflow -->

## The Workflow

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   SPECIFY   │  →   │    PLAN     │  →   │  IMPLEMENT  │
└─────────────┘      └─────────────┘      └─────────────┘
     What?               How?               Execute
```

Define _what_ you're building (stakeholder-friendly, technology-agnostic),
design _how_ you'll build it (architecture, contracts, tech stack), then execute
with dependency-ordered tasks.

## Features

- **Three-phase workflow** — Structured specify → plan → implement cycle
  inherited from spec-kit
- **Claude Code plugin** — Native slash commands (`/speck.specify`,
  `/speck.plan`, etc.)
- **Natural language skill** — Ask questions about your specs, plans, and tasks
- **Dual-mode CLI** — Same commands work in Claude Code and terminal
- **Multi-repo support** — Share specifications across repositories
- **Worktree integration** — Work on multiple features in parallel with
  automatic IDE launch
- **spec-kit compatible** — 100% file format compatibility, easy migration

## Quick Start

### Install the Plugin (2 minutes)

1. Open Claude Code in your project:
   ```bash
   claude
   ```

2. Open plugin manager:
   ```
   /plugin
   ```

3. Add the marketplace:
   - Select "Manage marketplaces" → "Add marketplace"
   - Enter: `speck-market`

4. Install Speck:
   - Select "speck-market" → "speck" → "Install"

### Create Your First Spec

```
/speck.specify Add user authentication with email and password login
```

Speck generates a structured specification in
`specs/001-user-authentication/spec.md` with user stories, requirements, and
success criteria.

See the
[Quick Start Guide](https://speck.codes/docs/getting-started/quick-start) for
detailed setup including optional worktree integration.

## Core Commands

| Command            | Description                                       |
| ------------------ | ------------------------------------------------- |
| `/speck.specify`   | Create or update a feature specification          |
| `/speck.clarify`   | Resolve ambiguities with targeted questions       |
| `/speck.plan`      | Generate implementation plan and design artifacts |
| `/speck.tasks`     | Break down into dependency-ordered tasks          |
| `/speck.implement` | Execute tasks automatically                       |
| `/speck.help`      | Load the Speck skill for Q&A                      |

See the [Commands Reference](https://speck.codes/docs/commands/reference) for
all commands and options.

## Speck Skill

In addition to slash commands, ask Speck questions naturally:

```
What user stories are in this spec?
What's the technical approach in the plan?
What tasks are pending?
```

**Rule of thumb**: Skill for questions, commands for actions.

## Advanced Features

| Feature            | Description                                                                                                                               |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Speck Reviewer** | Cluster-based PR reviews with spec awareness — [Learn more](https://speck.codes/docs/whats-new#december-2025-speck-reviewer-plugin-spec-018) |
| **Multi-Repo**     | Share specs across microservices or frontend/backend splits — [Learn more](https://speck.codes/docs/advanced-features/multi-repo-support)   |
| **Worktrees**      | Work on multiple features simultaneously with IDE auto-launch — [Learn more](https://speck.codes/docs/advanced-features/worktrees)          |
| **Monorepos**      | Manage workspace projects with shared specifications — [Learn more](https://speck.codes/docs/advanced-features/monorepos)                   |
| **spec-kit**       | 100% file format compatible with GitHub's spec-kit — [Learn more](https://speck.codes/docs/about/speck-and-spec-kit)                        |

## Project Structure

```
.claude/
├── commands/          # Slash commands (/speck.*)
├── agents/            # Subagents for complex workflows
└── skills/            # Natural language skill

.speck/
├── scripts/           # CLI implementations
└── config.json        # Worktree and IDE settings

specs/                 # Feature specifications (spec.md, plan.md, tasks.md)
website/               # Documentation site source
```

## Contributing & Customization

### Fork for Customization

Speck is designed to be forked and customized. Teams can adapt templates,
commands, and workflows to match their development practices. The upstream
transform process works for forks too—you can stay synced with spec-kit releases
while maintaining your customizations.

### Upstream Transform Process

Speck stays aligned with GitHub's spec-kit through an automated transform
process:

```
Your Fork ← Transform ← spec-kit upstream
```

Commands for syncing:

- `/speck.check-upstream` — Check for new spec-kit releases
- `/speck.pull-upstream` — Fetch upstream content to `upstream/`
- `/speck.transform-upstream` — Convert bash scripts to Bun TypeScript

Forks can use this same process to pull Speck updates while preserving local
customizations.

### Pull Requests Welcome

PRs with new features, bug fixes, and documentation improvements are welcome!

**A note on scope**: Speck is opinionated and Claude-native by design. We
prioritize deep Claude Code integration over multi-agent compatibility. Features
that dilute this focus or add complexity without Claude-specific benefit may not
be accepted.

**Good PR candidates**:

- Bug fixes and performance improvements
- Claude Code integrations and optimizations
- Documentation and examples
- Template improvements

For larger features, please
[open an issue](https://github.com/nprbst/speck/issues) first to discuss the
approach.

## Development

### Prerequisites

- [Bun](https://bun.sh) 1.0+
- Git 2.30+
- Node 18+ (for some tooling)

### Setup

```bash
git clone https://github.com/nprbst/speck.git
cd speck
bun install
```

### Common Commands

```bash
bun test              # Run tests
bun run lint          # Lint code
bun run typecheck     # Type check
bun run preflight     # Full check before PR
bun run website:dev   # Local docs site (localhost:4321)
```

### Code Style

- TypeScript 5.3+ with strict mode
- Follow existing patterns in the codebase
- Run `bun run fix` before committing

## Documentation

- [Website](https://speck.codes) — Full documentation
- [Quick Start](https://speck.codes/docs/getting-started/quick-start) —
  Installation and first command
- [Three-Phase Workflow](https://speck.codes/docs/core-concepts/workflow) — Core
  methodology
- [Commands Reference](https://speck.codes/docs/commands/reference) — All
  commands and options
- [Speck & spec-kit](https://speck.codes/docs/about/speck-and-spec-kit) —
  Origins and compatibility

## Acknowledgments

Speck builds on GitHub's excellent
[spec-kit](https://github.com/github/spec-kit) project, extending its
specification-driven methodology for Claude Code users. We're grateful to the
spec-kit team for creating this foundation.

For teams using other AI assistants or working outside Claude Code,
[spec-kit](https://github.com/github/spec-kit) remains the canonical choice.

## License

[MIT](LICENSE)
