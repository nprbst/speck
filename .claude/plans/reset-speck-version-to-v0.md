# Plan: Reset Speck to v0.x with New GitHub Org

## Goal
- Reset version numbering to v0.x to signal pre-GA state
- Move to new GitHub org `inspeck` for clean namespace
- Fresh start with proper semantic versioning

## Steps

### 1. Create New GitHub Organization
1. Go to https://github.com/organizations/new
2. Create org named `inspeck`
3. Set up org profile (optional)

### 2. Create Fresh Repos in New Org
1. Create `inspeck/speck` repository (empty, no README)
2. Create `inspeck/marketplace` repository (empty, no README)

### 3. Update Local Repo Remote
```bash
cd /Users/nathan/git/github.com/nprbst/speck

# Add new remote
git remote add inspeck git@github.com:inspeck/speck.git

# Push all branches (without tags)
git push inspeck main

# Remove old remote (optional, can keep for reference)
git remote remove origin
git remote rename inspeck origin
```

### 4. Reset Version
```bash
# Set version to 0.1.0
bun run scripts/version.ts 0.1.0 --no-push

# Push the version commit and new tag
git push origin main --tags
```

### 5. Update Code References
Files that reference `nprbst/speck-market`:
- `scripts/publish-plugin.ts` - update MARKET_REPO to `inspeck/marketplace`
- `.claude-plugin/marketplace.json` - update source repo
- Any docs referencing the old repo URLs

### 6. Update CHANGELOG.md
Add reset notice:
```markdown
## Version Reset Notice
Prior to v0.1.0, this project was developed at nprbst/speck with v1.x versioning.
Moved to inspeck org and reset to v0.x to properly signal pre-GA status.
v1.0.0 will mark the first stable GA release.
```

### 7. First Publish to New Marketplace
```bash
bun run publish-plugin
```

### 8. Update Local Plugin Installation
```bash
# Remove old marketplace
rm -rf ~/.claude/plugins/marketplaces/speck-market

# Install from new marketplace
# (via Claude Code: /marketplace install https://github.com/inspeck/marketplace)
```

### 9. Handle Old Repos (nprbst/speck, nprbst/speck-market)
Options:
- **Archive**: Keep read-only for historical reference
- **Delete**: Clean break, no confusion
- **Add redirect notice**: Update README pointing to new location

## Files to Modify
- `package.json` - version → "0.1.0"
- `scripts/publish-plugin.ts` - MARKET_REPO → "inspeck/marketplace"
- `.claude-plugin/marketplace.json` - source repo reference
- `CHANGELOG.md` - add reset notice
- Any docs with old GitHub URLs

## Post-Reset Versioning
- `bun run version:patch` → 0.1.1, 0.1.2, etc.
- `bun run version:minor` → 0.2.0, 0.3.0, etc. (breaking changes)
- `bun run version:major` → 1.0.0 (GA release)
