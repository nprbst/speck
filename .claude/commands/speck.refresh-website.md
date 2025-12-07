---
description: Identify changes since last website refresh and update documentation
---

You are being invoked as a Claude Code slash command to identify website content
that needs updating and refresh the documentation.

## Your Task

Execute the website refresh exploration methodology to identify what has changed
since the last website update, then update the relevant documentation.

## Exploration Methodology

### Step 1: Identify Last Website Update

Read the website's What's New page to determine when it was last updated:

```bash
# Read the whats-new.md frontmatter and first heading
head -30 website/src/content/docs/whats-new.md
```

Extract from the output:
- `lastUpdated` date from YAML frontmatter
- Most recent spec/feature documented (first `## ` heading after frontmatter)

### Step 2: Check Upstream Releases

Read the upstream releases tracker:

```bash
cat upstream/releases.json
```

Note:
- Latest transformed version
- Transform date of latest release
- Compare to what's documented on the website

### Step 3: Check Recent Git Activity

Run git log since the last website update:

```bash
# Replace DATE with the lastUpdated date from Step 1
git log --since="DATE" --oneline --no-merges | head -20
```

Look for:
- Feature completions (feat commits)
- Version bumps
- Significant changes that users should know about

### Step 4: Identify Undocumented Specs

List all specs and compare to documented features:

```bash
ls -d specs/0* | sort
```

Cross-reference with the features listed in `whats-new.md`. Any specs that are
complete but not documented need entries.

### Step 5: Check Current Version

```bash
cat package.json | grep '"version"'
```

Compare to what's mentioned in the website (if version is highlighted anywhere).

## Generate Update Report

After completing Steps 1-5, present a summary:

1. **Last Updated**: [date from frontmatter]
2. **Latest Documented Spec**: [spec number and name]
3. **Current Upstream**: [version from releases.json]
4. **Current Speck Version**: [version from package.json]
5. **Missing Documentation**:
   - List any specs completed but not documented
   - List any significant changes from git log

## Execute Updates

Based on the report, update the website content:

### Primary: Update whats-new.md

Add new sections for undocumented features. Follow the existing format:

```markdown
## [Month] [Year]: [Feature Name] (Spec [NNN])

### [Subtitle]
**Released**: [Month] [Year]

[One sentence description]

**Key Capabilities**:
- **[Feature 1]**: [Description]
- **[Feature 2]**: [Description]

**Benefits**:
- [Benefit 1]
- [Benefit 2]

**Learn More**:
- [Relevant Doc Link](/docs/...)
```

Update the `lastUpdated` field in the frontmatter to today's date.

### Secondary: Other Docs (if needed)

If a new feature affects existing documentation pages, update them as well.
Common pages to check:
- `commands/reference.md` - if new commands were added
- `getting-started/quick-start.md` - if setup process changed
- `core-concepts/workflow.md` - if workflow changed
- `README.md` - if any of the above changed (see Step 6)

### Step 6: Check README Alignment

After updating website docs, verify `README.md` reflects the changes:

1. **Compare README sections to website equivalents**:
   - Quick Start ↔ `getting-started/quick-start.md`
   - Core Commands ↔ `commands/reference.md`
   - Features ↔ `core-concepts/workflow.md`
   - Advanced Features ↔ `advanced-features/*.md`

2. **Update README if**:
   - New commands were added (update Core Commands table)
   - Installation process changed (update Quick Start)
   - New features were added (update Features list)
   - Advanced features changed (update Advanced Features table)

3. **Keep README concise** - highlights + links, not full duplicates of website
   content

## Example Output

After running this command, you should have:

1. A clear report of what's changed since last update
2. Updated `whats-new.md` with new feature sections
3. Updated `lastUpdated` date
4. Any other necessary documentation updates
5. Updated `README.md` if affected sections changed

## Notes

- This command is project-local and not published to the marketplace
- The website content lives in `website/src/content/docs/`
- There is no separate `docs/` directory - edit website content directly
- To verify changes: `cd website && bun run build`
