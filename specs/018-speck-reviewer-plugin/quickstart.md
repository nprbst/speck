# Quickstart: Speck Reviewer Plugin Development

**Feature Branch**: `018-speck-reviewer-plugin`
**Created**: 2025-12-07

## Prerequisites

- **Bun 1.0+**: `curl -fsSL https://bun.sh/install | bash`
- **Git 2.30+**: For worktree and branch operations
- **GitHub CLI (`gh`)**: `brew install gh` then `gh auth login`
- **Claude Code**: For plugin installation and usage

Verify setup:
```bash
bun --version    # Should show 1.0.0+
gh auth status   # Should show authenticated
```

## Repository Structure

```
plugins/
├── speck/                      # Existing speck plugin (migrated)
│   ├── .claude-plugin/
│   │   └── plugin.json
│   ├── commands/
│   ├── skills/
│   └── cli/
│
└── speck-reviewer/             # New plugin (this feature)
    ├── .claude-plugin/
    │   └── plugin.json
    ├── commands/
    │   └── review.md
    ├── skills/
    │   └── pr-review/
    │       └── SKILL.md
    └── cli/
        ├── src/
        │   ├── index.ts        # CLI entry point
        │   ├── state.ts        # Session persistence
        │   ├── clustering.ts   # File clustering
        │   ├── github.ts       # GitHub API operations
        │   └── speck.ts        # Speck integration
        ├── package.json
        └── tsconfig.json

.claude-plugin/
└── marketplace.json            # Root marketplace (lists both plugins)
```

## Installation (Development)

```bash
# Clone the repository
git clone https://github.com/nprbst/speck .
cd speck

# Install dependencies
bun install

# Build CLI
cd plugins/speck-reviewer/cli
bun install
bun run build

# Symlink CLI to PATH (optional, for testing)
ln -sf $(pwd)/dist/speck-review ~/.local/bin/speck-review
```

## Development Commands

```bash
# Run tests
bun test

# Run specific test file
bun test plugins/speck-reviewer/cli/src/state.test.ts

# Type check
bun run typecheck

# Lint
bun run lint

# Build CLI
cd plugins/speck-reviewer/cli && bun run build

# Run CLI directly (development)
bun run plugins/speck-reviewer/cli/src/index.ts help
```

## Plugin Testing

### Local Plugin Installation

```bash
# From repo root, test plugin manifest
cat plugins/speck-reviewer/.claude-plugin/plugin.json | jq .

# Validate marketplace
cat .claude-plugin/marketplace.json | jq .
```

### Manual Testing in Claude Code

1. Open Claude Code in a test repository with a PR
2. Add local marketplace: `/plugin marketplace add file:///path/to/speck`
3. Install plugin: `/plugin install speck-reviewer@speck-market`
4. Test command: `/review`

### CLI Testing

```bash
# In a repo with a checked-out PR
speck-review help
speck-review files
speck-review analyze
speck-review state show
```

## Common Development Tasks

### Adding a New CLI Command

1. Add handler to `cli/src/index.ts`:
```typescript
async "new-command"(args) {
  // Implementation
}
```

2. Add help text to `help()` function

3. Add tests in `cli/src/new-command.test.ts`

### Modifying State Schema

1. Update types in `cli/src/state.ts`
2. Increment schema version: `STATE_SCHEMA_VERSION = "review-state-v2"`
3. Add migration logic in `loadState()` for backwards compatibility
4. Update `data-model.md` documentation

### Updating the Skill

1. Edit `skills/pr-review/SKILL.md`
2. Test by running `/review` command
3. Verify guidance produces expected behavior

### Adding Speck Integration

1. Check `speck.ts` for spec detection logic
2. Test with a branch that has a spec in `specs/NNN-name/spec.md`
3. Verify spec content appears in review context

## Testing Strategy

### Unit Tests

```bash
# State management
bun test cli/src/state.test.ts

# Clustering algorithm
bun test cli/src/clustering.test.ts

# GitHub operations (mocked)
bun test cli/src/github.test.ts
```

### Integration Tests

```bash
# Full CLI workflow (requires gh auth)
bun test cli/src/integration.test.ts
```

### Manual E2E Testing

1. Create a test PR in a sandbox repo
2. Run `/review` command
3. Verify:
   - Cluster analysis groups files sensibly
   - Navigation ("next", "back") works
   - Comments can be staged and posted
   - State persists across sessions

## Debugging

### Enable Debug Logging

```bash
SPECK_DEBUG=1 speck-review analyze
# or
SPECK_LOG_LEVEL=debug speck-review state show
```

### Log File Locations

```bash
speck-review logs
# Shows: ~/.speck/logs/cli.log
```

### Common Issues

**gh CLI not authenticated**:
```bash
gh auth login
gh auth status
```

**State file corrupted**:
```bash
speck-review state clear
# or manually delete .speck/review-state.json
```

**Plugin not loading**:
```bash
# Verify plugin.json is valid JSON
cat plugins/speck-reviewer/.claude-plugin/plugin.json | jq .

# Check marketplace lists the plugin
cat .claude-plugin/marketplace.json | jq '.plugins[].name'
```

## Build for Distribution

```bash
# Build CLI binary
cd plugins/speck-reviewer/cli
bun build src/index.ts --compile --outfile dist/speck-review

# Verify size
du -sh dist/speck-review

# Test binary
./dist/speck-review help
```

## Release Checklist

- [ ] All tests pass: `bun test`
- [ ] Lint clean: `bun run lint`
- [ ] Type check clean: `bun run typecheck`
- [ ] CLI builds: `bun run build`
- [ ] Plugin manifest valid
- [ ] Marketplace updated with new version
- [ ] CHANGELOG updated
- [ ] Version bumped in plugin.json
