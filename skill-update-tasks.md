# Speck-Knowledge Skill Backfill Tasks

**Created**: 2025-11-22
**Context**: Constitution v1.8.0 introduced Principle XIII (Documentation Skill Synchronization)
**Requirement**: Backfill features 007-012 into `.claude/skills/speck-knowledge/SKILL.md`

## Background

The `speck-knowledge` Claude Skill (located at `.claude/skills/speck-knowledge/SKILL.md`) is the primary interface for Claude AI to understand and assist with Speck workflows. It was originally created for feature 005 but hasn't been updated for features 007-012. This backfill brings it current with all implemented features.

## Backfill Scope

Update the skill with content from the following features:

1. **007-multi-repo-monorepo-support**: Multi-Repo and Monorepo Support
2. **008-stacked-pr-support**: Stacked PR Support
3. **009-multi-repo-stacked**: Multi-Repo Stacked PR Support
4. **010-virtual-command-pattern**: Virtual Command Pattern with Dual-Mode CLI
5. **011-website-feature-update**: Website Content Update for Advanced Speck Features
6. **012-worktree-integration**: Worktree Integration

## Current Skill Structure

The skill is organized into these major sections:

1. **Plugin Path Setup** - How to locate plugin resources
2. **Core Capabilities**
   - Feature Discovery (3-tier matching)
   - Template References
   - Section Annotation Patterns
   - File State Classification
   - Error Message Format
   - Conversation Context Tracking
3. **Artifact-Specific Interpretation**
   - spec.md Interpretation
   - plan.md Interpretation
   - tasks.md Interpretation
4. **Template Comparison Workflow**
5. **Edge Case Handling**
6. **Usage Examples**
7. **Limitations**
8. **Slash Command Reference**

## Required Updates by Feature

### Feature 007: Multi-Repo and Monorepo Support

**New Concepts to Add:**
- Multi-repo mode vs single-repo mode detection
- Root repo vs child repo terminology
- Symlink-based multi-repo detection (`.speck-root` symlink)
- Parent spec references (`parentSpecId` field in spec.md)
- Shared specs directory structure

**Sections to Update:**

#### 1. Add "Multi-Repo Mode Detection" subsection under "Core Capabilities"
```markdown
### 7. Multi-Repo Mode Detection

When interpreting Speck artifacts, determine if the project is in multi-repo mode:

**Detection Method**:
- Check for `.speck-root` symlink in project root
- If symlink exists and points to parent directory → multi-repo child repo
- If no symlink → single-repo mode

**Child Repo Context**:
When in child repo:
- Specs MAY reference parent specs via `parentSpecId` field in spec.md metadata
- Feature numbers MUST be coordinated across all child repos (no duplicates)
- Constitution lives in root repo, child repos follow root's principles

**Root Repo Context**:
- Contains shared `.speck/` directory with constitution, templates
- Child repos symlink to root's `.speck/` for shared configuration
- Manages global feature numbering

**User Query Examples**:
- "Is this a multi-repo setup?" → Check for `.speck-root` symlink
- "What's the parent spec?" → Read `parentSpecId` from spec.md metadata
- "Where's the constitution?" → Follow `.speck-root` symlink if present
```

#### 2. Update "spec.md Interpretation" section
Add to metadata block parsing:
```markdown
**Multi-Repo Metadata** (optional, only in child repos):
- `**Parent Spec**: [feature-name](link)` - References parent feature spec
- Indicates this feature builds on or extends a parent feature
```

#### 3. Update "Slash Command Reference" section
Add multi-repo commands:
```markdown
| `/speck.link` | Link child repository to multi-repo root | "Run /speck.link to connect this repo to multi-repo root" |
```

---

### Feature 008: Stacked PR Support

**New Concepts to Add:**
- Stacked PR workflow (multiple PRs per feature)
- Branch dependency tracking
- User story to branch mapping
- `.speck/branches.json` metadata file

**Sections to Update:**

#### 1. Add "Stacked PR Mode Detection" subsection under "Core Capabilities"
```markdown
### 8. Stacked PR Mode Detection

Features MAY use stacked PR workflow where each user story gets its own branch/PR:

**Detection Method**:
- Check for `.speck/branches.json` file in repository root
- Check for `**Workflow Mode**: stacked-pr` in plan.md or spec.md
- If present → feature uses stacked PRs

**Branch Metadata Structure** (`.speck/branches.json`):
```json
{
  "features": {
    "005-speck-skill": {
      "branches": [
        {
          "name": "005-speck-skill-us1",
          "userStory": "US1",
          "baseBranch": "main",
          "prNumber": 42,
          "status": "merged"
        },
        {
          "name": "005-speck-skill-us2",
          "userStory": "US2",
          "baseBranch": "005-speck-skill-us1",
          "status": "open"
        }
      ]
    }
  }
}
```

**User Query Examples**:
- "Which branches exist for this feature?" → Read `.speck/branches.json`
- "What's the dependency order?" → Parse `baseBranch` chain
- "Is this using stacked PRs?" → Check workflow mode in plan.md
```

#### 2. Update "plan.md Interpretation" section
Add to metadata block:
```markdown
**Workflow Mode** (optional):
- `**Workflow Mode**: stacked-pr` - Feature uses stacked PR workflow
- `**Workflow Mode**: single-branch` - Traditional single branch (default)
```

#### 3. Update "tasks.md Interpretation" section
Add note about task-to-branch mapping:
```markdown
**Stacked PR Task Organization**:
When using stacked PR workflow:
- Each user story phase maps to a separate branch
- Tasks for US1 go on branch `NNN-feature-us1`
- Tasks for US2 go on branch `NNN-feature-us2` (based on us1)
- Shared setup tasks go on first branch
```

#### 4. Update "Slash Command Reference" section
```markdown
| `/speck.branch` | Manage stacked PR branches with dependency tracking | "Run /speck.branch to create next stacked PR branch" |
```

---

### Feature 009: Multi-Repo Stacked PR Support

**New Concepts to Add:**
- Combining multi-repo mode with stacked PRs
- Cross-repo branch dependencies
- Coordinated feature numbering across repos

**Sections to Update:**

#### 1. Update "Multi-Repo Mode Detection" subsection
Add stacked PR considerations:
```markdown
**Multi-Repo + Stacked PRs**:
When combining both modes:
- Each child repo MAY use stacked PRs independently
- Branch naming remains per-repo: `NNN-feature-usX`
- Feature numbers MUST still be unique across all child repos
- `.speck/branches.json` lives in each child repo (not shared)
```

---

### Feature 010: Virtual Command Pattern with Dual-Mode CLI

**New Concepts to Add:**
- Virtual commands (sub-100ms execution via hooks)
- Prerequisite checking hooks
- Context pre-loading via hooks
- Dual-mode execution (Claude Code + direct CLI)

**Sections to Update:**

#### 1. Add "Virtual Command Detection" subsection under "Core Capabilities"
```markdown
### 9. Virtual Command Architecture

Speck uses virtual commands for sub-100ms execution via Claude Code hooks:

**Virtual Command Pattern**:
- Commands appear as `/speck.*` slash commands
- Actual implementation in `.speck/scripts/*.ts`
- Hooks handle prerequisite checking and context loading
- Example: `/speck.specify`, `/speck.plan`, `/speck.tasks`

**Hook Types**:
1. **UserPromptSubmit hook**: Runs on every user message
   - Checks if user is in feature directory
   - Pre-loads SPECK_PREREQ_CONTEXT with mode and paths
   - Enables sub-100ms command execution

2. **SessionStart hook**: Runs once per session
   - Sets up plugin path resolution
   - Configures runtime environment

**When Explaining Commands**:
- Commands execute instantly because hooks pre-validate context
- No need for manual directory checking or path resolution
- Works in both Claude Code and direct CLI (`bun run`)

**User Query Examples**:
- "Why are commands so fast?" → Explain hook-based prerequisite checking
- "What's the virtual command pattern?" → Explain hooks + dual-mode execution
```

#### 2. Update "Slash Command Reference" section introduction
```markdown
**Virtual Command Architecture**: All `/speck.*` commands use virtual command
pattern with hook-based prerequisite checking for sub-100ms execution. Commands
work identically in Claude Code and direct CLI (`bun run .speck/scripts/<name>.ts`).
```

---

### Feature 011: Website Feature Update

**Note**: This is a documentation update feature, minimal skill impact.

**Sections to Update:**

#### Update "Slash Command Reference" if new website commands exist
Check if any new website-related commands were added. If so, document them.

---

### Feature 012: Worktree Integration

**New Concepts to Add:**
- Git worktree support for isolated feature development
- Worktree metadata (`.speck/worktrees/`)
- Isolated vs shared specs mode
- Worktree lifecycle management

**Sections to Update:**

#### 1. Add "Worktree Mode Detection" subsection under "Core Capabilities"
```markdown
### 10. Worktree Mode Detection

Features MAY use Git worktrees for isolated parallel development:

**Detection Method**:
- Check for `.speck/worktrees/` directory
- Check for `.speck/worktrees/[branch-name]/` subdirectories
- Each worktree has metadata JSON file with configuration

**Worktree Metadata Structure** (`.speck/worktrees/[branch]/metadata.json`):
```json
{
  "branch": "012-worktree-integration",
  "featureDir": "specs/012-worktree-integration",
  "createdAt": "2025-11-22T10:30:00Z",
  "specsMode": "isolated",
  "baseBranch": "main"
}
```

**Specs Modes**:
1. **Isolated mode** (`specsMode: "isolated"`):
   - Each worktree has its own `specs/` directory
   - Complete isolation between features
   - Recommended for team environments

2. **Shared mode** (`specsMode: "shared"`):
   - All worktrees share main repo's `specs/` directory
   - Changes visible across worktrees
   - Simpler for solo development

**Worktree Lifecycle**:
- Create: `/speck.specify` with worktree config OR manual `git worktree add`
- Update: Metadata tracks feature association
- Cleanup: Worktree removal cleans up metadata

**User Query Examples**:
- "Is this in a worktree?" → Check current directory path for `.speck/worktrees/`
- "What's the specs mode?" → Read `specsMode` from metadata.json
- "Which worktrees exist?" → List `.speck/worktrees/*/metadata.json` files
```

#### 2. Update "Feature Discovery" section
Add worktree considerations:
```markdown
**Worktree Context**:
When searching for features:
- In isolated mode: Only search current worktree's `specs/` directory
- In shared mode: Search main repo's `specs/` directory
- Check `.speck/worktrees/[current-branch]/metadata.json` for `specsMode`
```

#### 3. Update "Slash Command Reference" section
```markdown
| `/speck.specify` | Create feature spec (with optional worktree creation) | "Run /speck.specify to create spec in new worktree" |
```

---

## Implementation Checklist

- [ ] **Review feature 007 spec/plan/tasks** - Extract multi-repo concepts
- [ ] **Update skill section 7** - Add Multi-Repo Mode Detection
- [ ] **Review feature 008 spec/plan/tasks** - Extract stacked PR concepts
- [ ] **Update skill section 8** - Add Stacked PR Mode Detection
- [ ] **Review feature 009 spec/plan/tasks** - Extract combined mode concepts
- [ ] **Update skill section 7** - Add multi-repo + stacked PR notes
- [ ] **Review feature 010 spec/plan/tasks** - Extract virtual command concepts
- [ ] **Update skill section 9** - Add Virtual Command Architecture
- [ ] **Review feature 011 spec/plan/tasks** - Check for website command changes
- [ ] **Review feature 012 spec/plan/tasks** - Extract worktree concepts
- [ ] **Update skill section 10** - Add Worktree Mode Detection
- [ ] **Update Feature Discovery section** - Add worktree context handling
- [ ] **Update Slash Command Reference** - Add new commands (link, branch)
- [ ] **Update YAML frontmatter** - Add activation triggers for new terminology
- [ ] **Update Examples section** - Add examples for new features
- [ ] **Test skill activation** - Ask Claude questions about new features to verify

## Testing Strategy

After backfill, test the skill by asking Claude:

1. "Is this a multi-repo setup?" (should detect via symlink)
2. "Which branches exist for feature 008?" (should read branches.json)
3. "What's the virtual command pattern?" (should explain hooks)
4. "Is this feature using worktrees?" (should check metadata)
5. "What's the workflow mode for this feature?" (should read plan.md)

## Notes

- **Preserve existing structure**: Don't remove or reorganize existing sections
- **Add incrementally**: Insert new subsections in logical order
- **Update examples**: Ensure examples reference new features where relevant
- **Maintain consistency**: Use same formatting/style as existing content
- **Test thoroughly**: Verify skill can answer questions about all features 007-012

## Success Criteria

- ✅ Skill accurately explains multi-repo mode detection and parent specs
- ✅ Skill accurately explains stacked PR workflow and branch dependencies
- ✅ Skill accurately explains virtual command pattern and hooks
- ✅ Skill accurately explains worktree mode and specs isolation
- ✅ Skill activation triggers include new terminology (worktree, stacked-pr, multi-repo)
- ✅ All new slash commands documented in reference table
- ✅ Manual testing confirms Claude provides accurate guidance on features 007-012

## Estimated Effort

- Research (read specs 007-012): 1-2 hours
- Update skill sections 7-10: 2-3 hours
- Update examples and references: 1 hour
- Testing and refinement: 1 hour
- **Total**: 5-7 hours

---

**Next Steps**: When ready to implement, work through the checklist above, updating one feature at a time and testing after each update.
