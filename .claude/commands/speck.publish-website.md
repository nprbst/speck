---
description: Update and publish website documentation (maintainer-only)
---

You are being invoked as a Claude Code slash command to update the Speck website
documentation and optionally deploy changes.

This command is project-local and not published to the marketplace.

## Your Task

Execute the website publish workflow to identify undocumented features, generate
what's-new entries, and deploy updates.

---

## Phase 1: Discovery

Read the current state and identify what needs updating.

### Step 1.1: Get Last Update Date

Read the whats-new.md frontmatter:

```bash
head -10 website/src/content/docs/whats-new.md
```

Extract the `lastUpdated` date from the YAML frontmatter.

### Step 1.2: List All Specs

```bash
ls -d specs/0* 2>/dev/null | sort
```

### Step 1.3: Find Documented Specs

Read the whats-new.md file and identify which specs are already documented by
looking for "(Spec NNN)" patterns in the headings.

### Step 1.4: Check Recent CHANGELOG

```bash
head -100 CHANGELOG.md
```

Look for entries since the `lastUpdated` date.

### Step 1.5: Present Discovery Report

Present a summary to the user:

```
## Discovery Report

**Last Updated**: [date from frontmatter]
**Specs in Repository**: [list]
**Already Documented**: [list with spec numbers]
**Undocumented Specs**: [list]
**Recent CHANGELOG Highlights**: [summary]
```

If there are no undocumented specs, report "Website is up to date!" and stop.

---

## Phase 2: Draft Generation

For each undocumented spec, generate a what's-new entry.

### Step 2.1: Read Spec Files

For each undocumented spec, read its spec.md:

```bash
cat specs/NNN-feature-name/spec.md
```

### Step 2.2: Extract Key Information

From each spec.md, extract:

- **Title**: From the `# ` heading or frontmatter
- **Description**: The overview or first paragraph
- **Key Capabilities**: From requirements or features sections
- **Benefits**: From goals, outcomes, or benefits sections

### Step 2.3: Determine Release Date

Check git log for when the spec was completed:

```bash
git log --oneline --since="LAST_UPDATED" -- "specs/NNN-*" | head -5
```

Or use the CHANGELOG to find the release version/date.

### Step 2.4: Generate Draft Entry

Format each entry using this template:

```markdown
## [Month] [Year]: [Feature Name] (Spec [NNN])

### [Short Subtitle]
**Released**: [Month] [Year]

[One-sentence description of what this feature does.]

**Key Capabilities**:
- **[Capability 1]**: [Brief description]
- **[Capability 2]**: [Brief description]
- **[Capability 3]**: [Brief description]

**Benefits**:
- [Benefit 1]
- [Benefit 2]

**Learn More**:
- [Relevant Doc Page](/docs/path/to/doc)

---
```

### Step 2.5: Present Drafts for Review

Show all generated drafts to the user:

```
## Draft Entries

Here are the proposed what's-new entries. Please review and let me know if
you'd like any changes before I apply them.

[Draft 1]

[Draft 2]

...
```

Wait for user approval before proceeding to Phase 3.

---

## Phase 3: Apply Updates

After user approves the drafts:

### Step 3.1: Update whats-new.md

Insert the new entries after the intro section (after the `---` separator
following "Track the latest features...").

Order entries by spec number descending (newest first).

### Step 3.2: Update lastUpdated

Change the `lastUpdated` field in the frontmatter to today's date (YYYY-MM-DD).

### Step 3.3: Show Changes

After making edits, show the user a summary of what changed.

---

## Phase 4: Build Verification

### Step 4.1: Run Website Build

```bash
cd website && bun run build
```

### Step 4.2: Report Results

If build succeeds:

```
Build successful! Website is ready for deployment.
```

If build fails, show the error and stop:

```
Build failed. Please fix the following errors before deploying:
[error output]
```

---

## Phase 5: Commit & Deploy (Optional)

### Step 5.1: Ask User

Ask the user:

```
Would you like me to commit and push these changes to deploy the website?

This will:
1. Stage website/src/content/docs/whats-new.md
2. Create a commit with message: "docs(website): update whats-new for Spec NNN"
3. Push to main (triggers Cloudflare Pages deployment)

Reply "yes" to proceed or "no" to leave changes uncommitted.
```

### Step 5.2: If Yes - Commit and Push

```bash
git add website/src/content/docs/whats-new.md
git commit -m "docs(website): update whats-new for Spec NNN

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
git push origin main
```

Report:

```
Changes deployed! The website will update shortly at https://beta.speck.codes

Updated what's-new page: https://beta.speck.codes/docs/whats-new
```

### Step 5.3: If No - Leave Uncommitted

Report:

```
Changes are ready for manual review. Files modified:
- website/src/content/docs/whats-new.md

To commit manually:
  git add website/src/content/docs/whats-new.md
  git commit -m "docs(website): update whats-new"
  git push
```

---

## Notes

- This command is for maintainers only (project-local, not in marketplace)
- The website auto-deploys to Cloudflare Pages when changes are pushed to main
- Entries should highlight user-facing value, not technical implementation details
- Link to relevant documentation pages in the "Learn More" section
