# Research: Website Content Update for Plugin Installation

**Date**: 2025-11-17
**Status**: Complete

## Purpose

Research to support updating Speck website content to reflect:
1. Plugin-based installation (spec 002)
2. Speck skill for natural language interaction (spec 005)

## Research Areas

### 1. Plugin Installation Workflow

**Decision**: Use `/plugin` slash command with Claude Marketplace for installation

**Rationale**:
- Spec 002 implemented full Claude Code plugin system 2.0+ support
- Plugin installation is simpler and more integrated than git clone
- Automatic updates via Claude Marketplace system
- No manual dependency installation required

**Key Installation Steps**:
1. Prerequisites: Claude Code with plugin support (minimum version required)
2. Install: `/plugin` → "Manage marketplaces" → Add "speck-market" → Install "speck"
3. Verify: Commands appear in `/` autocomplete
4. Update: `/plugin` → "Manage marketplaces" → "speck-market" → "Update marketplace"

**Alternatives Considered**:
- Git clone (previous method) - More complex, requires manual setup, harder to update
- npm/Bun global install - Not compatible with Claude Code plugin system
- Direct file download - No update mechanism, not integrated with Claude

### 2. Speck Skill Feature

**Decision**: Document skill as companion to slash commands for exploratory/understanding tasks

**Rationale**:
- Spec 005 implemented Speck skill using Claude Code skill format
- Provides natural language interface to specs/plans/tasks
- Complements slash commands (skill for questions, commands for execution)
- Skill reads from `specs/` directories and `.specify/templates/`

**Skill Capabilities**:
- Understanding spec structure and content
- Querying plan details and architecture decisions
- Checking task status and dependencies
- Explaining workflow phases
- Answering questions about requirements

**Use Cases**:
1. **Understanding**: "What does this spec define?" "Show me the user stories"
2. **Planning**: "What's the technical approach in the plan?" "What dependencies are needed?"
3. **Tasks**: "What tasks are pending?" "Show me the implementation order"
4. **Workflow**: "What phase am I in?" "What comes after clarification?"
5. **Requirements**: "What are the success criteria?" "List all functional requirements"

**When to Use Skill vs Slash Commands**:
- **Skill**: Exploratory questions, understanding existing specs/plans/tasks, status queries
- **Slash Commands**: Generating specs (`/speck.specify`), planning (`/speck.plan`), creating tasks (`/speck.tasks`), implementation (`/speck.implement`)

**Alternatives Considered**:
- Only slash commands - Less intuitive for understanding/exploration, requires knowing exact command
- CLI tool - Not integrated with Claude Code conversation flow
- Direct file reading - Requires knowing file structure, no contextual help

### 3. Documentation Structure Best Practices

**Decision**: Update existing structure (getting-started, concepts, commands, examples) rather than restructure

**Rationale**:
- Current structure already established in spec 004
- Maintains consistency for existing documentation
- Plugin installation fits naturally into "getting-started"
- Skill documentation fits into "concepts" and "commands"

**Update Strategy**:
- **Installation guide**: Replace git clone with plugin installation, update prerequisites
- **Quick start**: Streamline with plugin workflow, remove dependency installation steps
- **Workflow concepts**: Add skill as complementary tool to slash commands
- **Commands reference**: Add skill section explaining when to use it
- **Examples**: Update to show plugin-based workflow
- **Homepage**: Highlight plugin status and skill feature

**Content Tone and Clarity**:
- Clear distinction between skill (questions) and commands (execution)
- Step-by-step plugin installation with screenshots/code blocks
- Examples showing both skill and command usage
- Prerequisites clearly stating Claude Code version requirements

### 4. Version Compatibility

**Decision**: Document minimum Claude Code version requirement and provide upgrade path

**Rationale**:
- Plugin system requires specific Claude Code version
- Users with older versions need clear upgrade instructions
- Prevents confusion and failed installation attempts

**Version Requirements**:
- Minimum: Claude Code with plugin system 2.0+ support
- Recommended: Latest Claude Code version for best compatibility
- Check: Document how to verify Claude Code version

**Upgrade Path**:
- Link to official Claude Code installation/upgrade docs
- Clear error messages if version incompatible
- FAQ section for version-related issues

### 5. Migration Path for Existing Users

**Decision**: No migration needed (clarified in spec)

**Rationale**:
- Spec clarification confirmed: No existing users (unreleased)
- No need to document git-clone-to-plugin migration
- Focus on fresh plugin installation only

**Documentation Impact**:
- Remove any migration language
- Focus entirely on new installation method
- Archive or remove git clone instructions

## Implementation Notes

### Files to Update (Priority Order)

1. **High Priority** (P1 - Installation):
   - `website/src/content/docs/getting-started/installation.md`
   - `website/src/content/docs/getting-started/quick-start.md`
   - `website/src/pages/index.astro`

2. **Medium Priority** (P2 - Skill Documentation):
   - `website/src/content/docs/concepts/workflow.md`
   - `website/src/content/docs/commands/reference.md`

3. **Low Priority** (P3 - Examples):
   - `website/src/content/docs/examples/first-feature.md`

### Key Messaging

**Installation**: "Speck is now a Claude Plugin - install in seconds with `/plugin`"

**Skill**: "Ask questions naturally or use slash commands - Speck works how you work"

**Value Proposition**: "Faster setup, integrated updates, natural language queries"

## References

- Spec 002: Claude Plugin Packaging (`specs/002-claude-plugin-packaging/`)
- Spec 005: Speck Skill (`specs/005-speck-skill/`)
- Spec 004: Public Website (`specs/004-public-website/`)
- Claude Code plugin system docs: [claude.com/code/docs](https://claude.com/code/docs)

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Users with old Claude Code version | Installation fails | Document minimum version, clear upgrade instructions |
| Confusion between skill and commands | Poor UX, inefficient usage | Clear use case examples, decision guide |
| Missing plugin marketplace | Cannot install | Document marketplace setup, troubleshooting |
| Unclear update process | Outdated plugins | Step-by-step update instructions |

## Open Questions

None - all clarifications resolved in spec.md (Session 2025-11-17)
