# Quickstart: Building and Publishing Speck Plugin

**Feature**: 002-claude-plugin-packaging
**Date**: 2025-11-15
**Audience**: Developers contributing to Speck plugin packaging

## Overview

This guide walks through the complete workflow for building, testing, and publishing the Speck plugin for Claude Code. The process automates packaging of all Speck commands, agents, and templates into a Claude Marketplace-compliant plugin.

## Prerequisites

Before starting, ensure you have:

- ✅ Bun 1.0+ installed (`bun --version`)
- ✅ Git 2.30+ installed (`git --version`)
- ✅ Node.js/npm (for dependency management)
- ✅ Write access to Speck repository
- ✅ Claude Code 2.0+ for testing (optional but recommended)

## Quick Start (5 minutes)

### 1. Build the Plugin

```bash
# From repository root
bun run scripts/build-plugin.ts
```

This generates `dist/plugin/` with:
- `.claude-plugin/plugin.json` (manifest)
- `.claude-plugin/marketplace.json` (marketplace listing)
- `commands/` (all slash commands)
- `agents/` (all subagents)
- `templates/` (spec/plan/task templates)
- `scripts/` (build and workflow scripts)
- `README.md` (plugin documentation)
- `CHANGELOG.md` (version history)

### 2. Validate the Build

```bash
# Check package size
du -sh dist/plugin/

# Expected: < 1MB (well under 5MB limit)

# Validate manifest JSON
cat dist/plugin/.claude-plugin/plugin.json | bun run -e "JSON.parse(await Bun.stdin.text())"
cat dist/plugin/.claude-plugin/marketplace.json | bun run -e "JSON.parse(await Bun.stdin.text())"

# List packaged files
tree dist/plugin/ -L 2
```

### 3. Test Locally

```bash
# Install plugin locally for testing
claude-code plugin install ./dist/plugin/

# Or use the /plugin command in Claude Code:
# /plugin install file:///absolute/path/to/dist/plugin

# Verify commands are available
/speck.specify --help
/speck.plan --help

# Test a command
/speck.specify "test feature"
```

### 4. Publish to GitHub

```bash
# Create plugin release branch
git checkout -b plugin/v0.1.0

# Commit plugin artifacts
git add .claude-plugin/ dist/plugin/
git commit -m "feat: package Speck as Claude plugin v0.1.0"

# Push to GitHub
git push origin plugin/v0.1.0

# Create GitHub release
gh release create v0.1.0 \
  --title "Speck Plugin v0.1.0" \
  --notes "Initial plugin release with 20+ commands and 2 agents" \
  --target plugin/v0.1.0
```

### 5. Add to Claude Marketplace

Users can now install via:

```bash
# Install from GitHub repository
/plugin install https://github.com/nprbst/speck
```

Or add to a marketplace catalog:

1. Create `.claude-plugin/marketplace.json` in a marketplace repo
2. Add Speck entry with source URL
3. Users install marketplace: `/plugin marketplace add https://github.com/your-org/marketplace`
4. Users install Speck: `/plugin install speck`

## Detailed Workflow

### Build Process

The build script (`scripts/build-plugin.ts`) performs these steps:

1. **Version Detection**: Reads version from `package.json`
2. **Directory Setup**: Creates `dist/plugin/` and subdirectories
3. **Manifest Generation**:
   - Generates `.claude-plugin/plugin.json` with metadata
   - Generates `.claude-plugin/marketplace.json` with listing info
4. **File Copying**:
   - Commands: `.claude/commands/*.md` → `dist/plugin/commands/`
   - Agents: `.claude/agents/*.md` → `dist/plugin/agents/`
   - Templates: `.specify/templates/*` → `dist/plugin/templates/`
   - Scripts: `.specify/scripts/*` → `dist/plugin/scripts/`
5. **Documentation**:
   - Copies/generates `README.md`
   - Copies/generates `CHANGELOG.md`
6. **Validation**:
   - Checks total package size < 5MB
   - Validates all command files are valid Markdown
   - Validates agent frontmatter (name, description)
   - Validates manifest JSON syntax
   - Reports missing required files

### Build Configuration

Customize build via environment variables or config file:

```typescript
// scripts/build-plugin.config.ts
export const buildConfig = {
  version: "0.1.0",                    // Override package.json version
  outputDir: "dist/plugin/",           // Build output directory
  maxSizeBytes: 5 * 1024 * 1024,      // 5MB limit
  validateCommands: true,              // Validate command Markdown
  validateAgents: true,                // Validate agent frontmatter
  failOnOversized: true,               // Fail if > 5MB
  includeTests: false,                 // Exclude test files
  includeNodeModules: false,           // Exclude dependencies
};
```

### Directory Structure

**Before build** (source):
```
.claude/
├── commands/           # 20+ slash commands
└── agents/             # 2 subagents

.specify/
├── templates/          # Spec/plan templates
└── scripts/            # Build scripts

package.json            # Version source
```

**After build** (output):
```
dist/plugin/
├── .claude-plugin/
│   ├── plugin.json           # Manifest
│   └── marketplace.json      # Marketplace listing
├── commands/                 # Copied commands
├── agents/                   # Copied agents
├── templates/                # Copied templates
├── scripts/                  # Copied scripts
├── README.md                 # Plugin docs
└── CHANGELOG.md              # Version history
```

### Testing Checklist

Before publishing, verify:

- [ ] **Build succeeds** without errors
- [ ] **Package size** < 5MB (check with `du -sh dist/plugin/`)
- [ ] **Manifests valid** (JSON parses correctly)
- [ ] **Commands work** when plugin installed locally
- [ ] **Agents work** when invoked via Task tool
- [ ] **Version correct** in plugin.json and marketplace.json
- [ ] **README complete** with all commands documented
- [ ] **CHANGELOG updated** with release notes

### Installation Testing

Test installation methods:

**Local file installation**:
```bash
/plugin install file:///Users/nathan/git/speck/dist/plugin
```

**GitHub repository installation**:
```bash
/plugin install https://github.com/nprbst/speck
```

**Marketplace installation** (after marketplace setup):
```bash
/plugin marketplace add https://github.com/nprbst/speck-marketplace
/plugin install speck
```

**Verify installation**:
```bash
# List installed plugins
/plugin list

# Check Speck is present
/plugin info speck

# Verify commands available
/help | grep speck
```

## Version Bump Workflow

When releasing a new version:

### 1. Update Version

```bash
# Bump version in package.json (patch: 0.1.0 -> 0.1.1)
npm version patch

# Or minor: 0.1.1 -> 0.2.0
npm version minor

# Or major: 0.2.0 -> 1.0.0
npm version major
```

### 2. Update CHANGELOG

Add entry to `CHANGELOG.md`:

```markdown
## [0.1.1] - 2025-11-16

### Fixed
- Fixed issue with template path resolution
- Corrected version display in /speck.specify

### Added
- New /speck.export command for exporting specs to PDF
```

### 3. Rebuild Plugin

```bash
# Build with new version from package.json
bun run scripts/build-plugin.ts

# Verify new version in manifest
cat dist/plugin/.claude-plugin/plugin.json | grep version
```

### 4. Commit and Tag

```bash
git add package.json CHANGELOG.md dist/plugin/
git commit -m "chore: bump version to 0.1.1"
git tag v0.1.1
git push origin main --tags
```

### 5. Create GitHub Release

```bash
gh release create v0.1.1 \
  --title "Speck Plugin v0.1.1" \
  --notes-file CHANGELOG.md \
  --target main
```

Users with Speck installed will receive update notifications automatically.

## Troubleshooting

### Build Fails: "Package size exceeds 5MB"

**Cause**: Too many large files included

**Solution**:
```bash
# Find largest files
find dist/plugin/ -type f -exec du -h {} + | sort -rh | head -20

# Exclude unnecessary files in build script
# Edit scripts/build-plugin.ts to add exclusions:
const excludePatterns = [
  "node_modules/**",
  "tests/**",
  "*.test.ts",
  "*.spec.ts",
  ".git/**"
];
```

### Build Fails: "Invalid command frontmatter"

**Cause**: YAML syntax error in command .md file

**Solution**:
```bash
# Find problematic file (shown in error)
# Validate YAML:
cat .claude/commands/speck.specify.md | head -20

# Common issues:
# - Missing closing --- delimiter
# - Unquoted strings with colons
# - Incorrect indentation
```

### Build Fails: "Missing required agent field: description"

**Cause**: Agent file missing required frontmatter

**Solution**:
```bash
# Check agent file structure:
cat .claude/agents/my-agent.md | head -15

# Required frontmatter:
---
name: agent-name
description: Agent description here
---
```

### Plugin Install Fails: "Manifest not found"

**Cause**: Missing `.claude-plugin/plugin.json`

**Solution**:
```bash
# Verify manifest exists
ls -la dist/plugin/.claude-plugin/plugin.json

# If missing, rebuild
bun run scripts/build-plugin.ts
```

### Commands Not Showing After Install

**Cause**: Commands directory not copied or wrong path

**Solution**:
```bash
# Verify commands exist
ls dist/plugin/commands/

# Check plugin.json for custom commands path
cat dist/plugin/.claude-plugin/plugin.json | grep commands

# Reinstall plugin
/plugin uninstall speck
/plugin install file:///path/to/dist/plugin
```

## Advanced: Marketplace Hosting

### Create Dedicated Marketplace Repository

```bash
# Create new repo
mkdir speck-marketplace
cd speck-marketplace

# Create marketplace manifest
cat > .claude-plugin/marketplace.json << 'EOF'
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
      "description": "Specification and planning framework",
      "version": "0.1.0",
      "keywords": ["specification", "planning"],
      "category": "development-tools"
    }
  ]
}
EOF

# Commit and push
git init
git add .claude-plugin/marketplace.json
git commit -m "feat: initial marketplace with Speck plugin"
git remote add origin https://github.com/nprbst/speck-marketplace
git push -u origin main
```

### Users Add Marketplace

```bash
/plugin marketplace add https://github.com/nprbst/speck-marketplace
/plugin marketplace list
/plugin install speck
```

## CI/CD Integration

### Automated Build on Release

Create `.github/workflows/build-plugin.yml`:

```yaml
name: Build Plugin

on:
  release:
    types: [created]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - name: Install dependencies
        run: bun install
      - name: Build plugin
        run: bun run scripts/build-plugin.ts
      - name: Validate package size
        run: |
          SIZE=$(du -sb dist/plugin/ | cut -f1)
          MAX_SIZE=5242880
          if [ $SIZE -gt $MAX_SIZE ]; then
            echo "Error: Package size $SIZE exceeds limit $MAX_SIZE"
            exit 1
          fi
      - name: Upload plugin artifact
        uses: actions/upload-artifact@v3
        with:
          name: speck-plugin
          path: dist/plugin/
```

## Next Steps

After successfully building and publishing:

1. **Announce Release**: Share on GitHub, social media, Claude community
2. **Gather Feedback**: Create GitHub issues template for bug reports
3. **Monitor Usage**: Track installation metrics (if available)
4. **Plan Updates**: Maintain CHANGELOG with upcoming features
5. **Documentation**: Create wiki or docs site with detailed guides

## Resources

- [Claude Code Plugin Docs](https://code.claude.com/docs/en/plugins)
- [Claude Marketplace Docs](https://code.claude.com/docs/en/plugin-marketplaces)
- [Semantic Versioning](https://semver.org/)
- [Keep a Changelog](https://keepachangelog.com/)
- [GitHub Releases](https://docs.github.com/en/repositories/releasing-projects-on-github)

## Support

- **Issues**: https://github.com/nprbst/speck/issues
- **Discussions**: https://github.com/nprbst/speck/discussions
- **Email**: nathan@example.com (replace with actual)
