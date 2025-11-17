# Quick Start: Website Content Update Implementation

**For**: Developers implementing this feature
**Estimated Time**: 2-3 hours
**Branch**: `006-website-content-update`

## Prerequisites

- Familiarity with Astro and Markdown
- Access to the Speck repository
- Claude Code installed (for testing plugin docs)
- Understanding of spec 002 (plugin) and spec 005 (skill)

## Implementation Checklist

### Phase 1: Update Installation Documentation (45 min)

**File**: `website/src/content/docs/getting-started/installation.md`

- [ ] Update frontmatter `lastUpdated` to current date
- [ ] Replace git clone prerequisites with Claude Code version requirement
- [ ] Replace "Clone Speck Repository" section with "Install Speck Plugin" section
- [ ] Update installation steps to use `/plugin` command
- [ ] Add marketplace setup instructions
- [ ] Update verification section to check plugin installation
- [ ] Update troubleshooting for plugin-specific issues
- [ ] Remove Bun/Git installation from primary prerequisites (move to "Optional" or remove)
- [ ] Add version compatibility section with minimum Claude Code version
- [ ] Update "First Command" section to reflect plugin workflow

**Validation**:
```bash
# Check no git clone in primary installation
grep -n "git clone" website/src/content/docs/getting-started/installation.md
# Should only appear in advanced/alternative sections if at all

# Check /plugin is present
grep -n "/plugin" website/src/content/docs/getting-started/installation.md
# Should have multiple occurrences
```

---

### Phase 2: Update Quick Start Guide (30 min)

**File**: `website/src/content/docs/getting-started/quick-start.md`

- [ ] Update frontmatter `lastUpdated` to current date
- [ ] Simplify prerequisites to just Claude Code with plugin support
- [ ] Replace git clone installation with `/plugin` workflow
- [ ] Remove "Install Dependencies" section (not needed for plugin)
- [ ] Add brief section on Speck skill usage
- [ ] Update "Your First Specification" to include skill example
- [ ] Ensure completion time stays under 10 minutes
- [ ] Update Next Steps to mention skill

**Validation**:
```bash
# Quick start should be streamlined (shorter than before)
wc -l website/src/content/docs/getting-started/quick-start.md
# Should be fewer lines than previous version

# Should mention skill
grep -n "skill" website/src/content/docs/getting-started/quick-start.md
```

---

### Phase 3: Document Speck Skill in Concepts (45 min)

**File**: `website/src/content/docs/concepts/workflow.md`

- [ ] Update frontmatter `lastUpdated` to current date
- [ ] Add new section "Working with Speck: Two Ways to Interact"
- [ ] Document Speck skill capabilities
- [ ] Provide 3-5 skill example queries
- [ ] Add decision guide: when to use skill vs commands
- [ ] Update each workflow phase to mention skill usage
- [ ] Add table or visual guide for skill vs commands

**Key Content to Add**:
```markdown
## Working with Speck

Speck provides two ways to interact:

1. **Speck Skill**: Natural language questions for understanding and exploration
2. **Slash Commands**: Execution and generation of specs, plans, and tasks

### When to Use the Skill

Use the Speck skill for:
- Understanding existing specifications
- Querying plan details and architecture
- Checking task status and dependencies
- Exploring without modification

Example queries:
- "What does this spec define?"
- "What's the technical approach in the plan?"
- "What tasks are pending?"

### When to Use Slash Commands

Use slash commands for:
- Generating new specifications: `/speck.specify`
- Creating implementation plans: `/speck.plan`
- Breaking down tasks: `/speck.tasks`
- Executing implementation: `/speck.implement`
```

**Validation**:
```bash
# Must have at least 3 skill examples
grep -c "\".*\"" website/src/content/docs/concepts/workflow.md
# Should show several quoted examples
```

---

### Phase 4: Update Commands Reference (30 min)

**File**: `website/src/content/docs/commands/reference.md`

- [ ] Update frontmatter `lastUpdated` to current date
- [ ] Add new top-level section: "Speck Skill"
- [ ] Document skill invocation (natural language in conversation)
- [ ] List skill capabilities
- [ ] Provide 3-5 skill examples
- [ ] Add comparison table: skill vs slash commands
- [ ] Update installation/update section to use `/plugin`
- [ ] Add plugin update instructions

**New Section Structure**:
```markdown
## Speck Skill

### Overview
The Speck skill provides natural language interaction with your specs, plans, and tasks.

### When to Use
- Exploratory questions
- Understanding existing artifacts
- Status checks
- Workflow guidance

### Capabilities
1. Understanding spec structure and content
2. Querying plan details and architecture decisions
3. Checking task status and dependencies
4. Explaining workflow phases
5. Answering requirement questions

### Example Queries
[3-5 examples with purposes]

### Skill vs Slash Commands
[Comparison table]
```

---

### Phase 5: Update Homepage (30 min)

**File**: `website/src/pages/index.astro`

- [ ] Update hero headline to mention plugin status
- [ ] Update hero subheadline to mention skill feature
- [ ] Update "Claude-Native Commands" feature to include skill
- [ ] Update Quick Start Preview step 2 from "Clone Speck" to "Install Plugin"
- [ ] Update Quick Start Preview step 3 to mention skill option
- [ ] Update CTA links if needed

**Changes**:
```typescript
// Before
const hero = {
  headline: "Opinionated feature specs for Claude Code",
  // ...
};

// After
const hero = {
  headline: "Claude Plugin for opinionated feature specs",
  subheadline: "Install in seconds, use slash commands or natural language skill - Speck adapts to your workflow",
  // ...
};

// Quick Start Preview - Step 2
// Before: "Clone Speck"
// After: "Install Plugin"
```

---

### Phase 6: Update Examples (20 min)

**File**: `website/src/content/docs/examples/first-feature.md`

- [ ] Update frontmatter `lastUpdated` to current date
- [ ] Update installation references to use plugin
- [ ] Add skill usage examples in the workflow
- [ ] Show both skill queries and slash commands

**Example Addition**:
```markdown
## Understanding Your Spec

Before planning, you can ask the Speck skill about your specification:

```
What user stories are defined in this spec?
```

Or use the skill to check requirements:

```
List all functional requirements
```

Then proceed with planning:

```
/speck.plan
```
```

---

### Phase 7: Testing and Validation (30 min)

**Build and Visual Tests**:
```bash
# Navigate to website directory
cd website

# Type check
bun run typecheck

# Build site
bun run build

# Start dev server for manual testing
bun run dev
# Visit http://localhost:4321
```

**Content Validation**:
```bash
# Verify no git clone in primary installation docs
grep -r "git clone.*speck" website/src/content/docs/getting-started/
# Should return 0 results or only in clearly marked alternative sections

# Verify /plugin command is present
grep -r "/plugin" website/src/content/docs/
# Should have multiple results

# Verify skill is documented
grep -r "Speck skill" website/src/content/docs/
# Should have results in workflow.md and reference.md

# Check all markdown files validate
find website/src/content/docs -name "*.md" -exec echo "Checking {}" \; -exec head -20 {} \;
# Manually verify frontmatter looks correct
```

**Manual Testing**:
- [ ] Follow installation guide as if you're a new user
- [ ] Verify installation completes in under 5 minutes
- [ ] Check that skill vs commands distinction is clear
- [ ] Test all internal links work
- [ ] Verify code blocks have syntax highlighting
- [ ] Check responsive design on mobile

---

## File Change Summary

### Modified Files
1. `website/src/content/docs/getting-started/installation.md` - Plugin installation
2. `website/src/content/docs/getting-started/quick-start.md` - Simplified plugin workflow
3. `website/src/content/docs/concepts/workflow.md` - Skill documentation
4. `website/src/content/docs/commands/reference.md` - Skill reference + plugin updates
5. `website/src/pages/index.astro` - Homepage updates
6. `website/src/content/docs/examples/first-feature.md` - Plugin-based examples

### Created Files
None (all updates to existing files)

### Deleted Files
None (no files removed)

---

## Common Pitfalls

### 1. Leaving Git Clone References

**Problem**: Forgetting to remove all git clone references

**Solution**:
```bash
# Find all references
grep -rn "git clone" website/src/content/docs/

# Review each and remove or mark as "advanced alternative"
```

### 2. Confusing Skill with Commands

**Problem**: Documentation doesn't clearly distinguish skill from commands

**Solution**: Always show skill as questions ("What...?", "Show me...") and commands as actions (`/speck.specify`)

### 3. Outdated Prerequisites

**Problem**: Still listing Bun/Git as required for basic installation

**Solution**: Move Bun/Git to "Optional" or "Advanced" sections, main prerequisite is Claude Code with plugin support

### 4. Missing Version Requirements

**Problem**: Not specifying minimum Claude Code version

**Solution**: Add clear version requirement and check command in prerequisites

### 5. Broken Links

**Problem**: Internal links don't work after content reorganization

**Solution**: Use relative paths and test all links after updates

---

## Testing Checklist

### Content Quality
- [ ] All code blocks have language identifiers
- [ ] All internal links use relative paths and work
- [ ] External links open in new tab
- [ ] Frontmatter validates against schema
- [ ] No broken images or assets
- [ ] Consistent terminology (skill vs commands)

### Functional Requirements
- [ ] FR-001: `/plugin` command documented
- [ ] FR-002: Skill documented with examples
- [ ] FR-003: Git clone removed from primary installation
- [ ] FR-004: Claude Code version requirements present
- [ ] FR-005: 3-5 skill examples provided
- [ ] FR-006: Skill vs commands decision guide present
- [ ] FR-007: Plugin update instructions present
- [ ] FR-008: Examples use plugin workflow
- [ ] FR-009: Homepage indicates plugin status

### Success Criteria
- [ ] SC-001: Installation completes in under 5 minutes (manual test)
- [ ] SC-002: 100% `/plugins` references (grep verification)
- [ ] SC-003: Skill distinction clear in under 2 minutes (user test)
- [ ] SC-004: Content reflects spec 002 and 005 features
- [ ] SC-005: Update instructions clear and complete

---

## Deployment

### Pre-Deploy Checklist
- [ ] All tests pass (`bun test`)
- [ ] Build succeeds (`bun run build`)
- [ ] Manual review of updated pages
- [ ] Link validation complete
- [ ] Accessibility check passes (axe-core)

### Deploy Command
```bash
# Build production site
cd website
bun run build

# Deploy to Cloudflare Pages
# (Typically handled by CI/CD on push to main)
```

---

## Rollback Plan

If issues are discovered after deployment:

1. **Immediate Rollback**:
   ```bash
   git revert HEAD
   git push
   ```

2. **Partial Rollback** (specific files):
   ```bash
   git checkout HEAD~1 -- website/src/content/docs/getting-started/installation.md
   git commit -m "Rollback installation.md"
   ```

3. **Redeploy** previous version from Cloudflare Pages dashboard

---

## Next Steps After Implementation

1. **Create PR**: Push changes and create pull request
2. **Review**: Request review focusing on content clarity
3. **Test**: Have someone unfamiliar with changes follow installation docs
4. **Deploy**: Merge to main and verify deployment
5. **Monitor**: Check for user feedback or issues
6. **Update**: Address any feedback in follow-up commits

---

## Resources

- [Spec 002: Claude Plugin Packaging](../002-claude-plugin-packaging/)
- [Spec 005: Speck Skill](../005-speck-skill/)
- [Spec 004: Public Website](../004-public-website/)
- [Astro Documentation](https://docs.astro.build)
- [Claude Code Plugin Docs](https://claude.com/code/docs)

---

**Questions?** Review the [feature spec](./spec.md) or [implementation plan](./plan.md) for more details.
