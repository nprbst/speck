# Quickstart: Multi-Repo Stacked PR Support

**Feature**: 009-multi-repo-stacked
**Date**: 2025-11-19
**Target Audience**: Developers using stacked PRs in multi-repo Speck projects

---

## Prerequisites

- Speck CLI installed and configured
- Multi-repo spec already set up via `/speck.link` (Feature 007)
- Git 2.30+ and GitHub CLI (`gh`) installed (optional for PR creation)
- Familiarity with stacked PR workflows (Feature 008)

---

## 30-Second Start

### Scenario: Create stacked branches in a child repository

```bash
# 1. Navigate to child repository (already linked via /speck.link)
cd /path/to/backend-service

# 2. Verify multi-repo context
/speck.env
# Output shows: "Context: Child repo (backend-service)"
#               "Parent Spec: 007-multi-repo-monorepo-support"

# 3. Create first stacked branch based on main
/speck.branch create nprbst/auth-db --base main --spec 009-multi-repo-stacked
# Output: Branch created, .speck/branches.json initialized

# 4. Do some work, commit changes
git add src/auth/database.ts
git commit -m "feat: add authentication database schema"

# 5. Create second branch stacked on first
/speck.branch create nprbst/auth-api --base nprbst/auth-db
# Output: PR suggestion displayed for nprbst/auth-db

# 6. Copy/paste suggested gh command to create PR
gh pr create --title "[backend-service] Add authentication database schema" \
  --body "..." \
  --base main

# 7. Check aggregate status from root
cd /path/to/speck-root
/speck.env
# Output shows branch stacks for root + all child repos
```

**Result**: Stacked PR workflow active in child repo, independent from other repos, visible from root.

---

## Common Workflows

### Workflow 1: Creating Stacked Branches in Child Repo

**Goal**: Break large feature across multiple reviewable PRs in a microservice child repo

**Steps**:

1. **Navigate to child repository**:
   ```bash
   cd /path/to/backend-service
   ```

2. **Verify multi-repo context**:
   ```bash
   /speck.env | grep "Context:"
   # Expected: "Context: Child repo (backend-service)"
   ```

3. **Create first branch** (database layer):
   ```bash
   /speck.branch create nprbst/auth-db --base main
   # Output:
   # Branch 'nprbst/auth-db' created and checked out
   # Updated .speck/branches.json (with parentSpecId field)
   ```

4. **Implement database layer, commit**:
   ```bash
   # ... make changes ...
   git add .
   git commit -m "feat: add user authentication schema"
   ```

5. **Create second branch** (API layer):
   ```bash
   /speck.branch create nprbst/auth-api --base nprbst/auth-db
   # Output:
   # Branch 'nprbst/auth-api' created and checked out
   #
   # PR Suggestion for nprbst/auth-db:
   # Title: [backend-service] Add user authentication schema
   # Base: main
   #
   # gh pr create --title "[backend-service] Add user authentication schema" \
   #   --body "..." --base main
   ```

6. **Create PR for first branch**:
   ```bash
   git checkout nprbst/auth-db
   gh pr create --title "[backend-service] Add user authentication schema" \
     --body "Implements database schema for user authentication" \
     --base main
   # Output: Created PR #50
   ```

7. **Update branch metadata with PR number** (optional):
   ```bash
   /speck.branch update nprbst/auth-db --pr 50 --status submitted
   ```

8. **View stack status**:
   ```bash
   /speck.branch status
   # Output:
   # Dependency Tree:
   # └─ main (base)
   #    └─ nprbst/auth-db (submitted) → PR #50
   #       └─ nprbst/auth-api (active)
   ```

---

### Workflow 2: Viewing Aggregate Status Across All Repos

**Goal**: See complete picture of stacked PR work across root + all child repos

**Steps**:

1. **Navigate to speck root**:
   ```bash
   cd /path/to/speck-root
   ```

2. **Check aggregate environment status**:
   ```bash
   /speck.env
   # Output includes "Branch Stack Status (Multi-Repo)" section with:
   #   - Root repo branches
   #   - Child: backend-service branches
   #   - Child: frontend-app branches
   ```

3. **List all branches across all repos**:
   ```bash
   /speck.branch list --all
   # Output:
   # Root Repository:
   # Branch             Base    Spec                    PR#   Status
   # nprbst/core-fix    main    008-stacked-pr-support  38    active
   #
   # Child: backend-service
   # Branch             Base             Spec                    PR#   Status
   # nprbst/auth-db     main             009-multi-repo-stacked  50    submitted
   # nprbst/auth-api    nprbst/auth-db   009-multi-repo-stacked  -     active
   ```

4. **View detailed status for all repos**:
   ```bash
   /speck.branch status --all
   # Output: Per-repo dependency trees, warnings, PR summaries
   ```

---

### Workflow 3: Importing Existing Git Branches

**Goal**: Migrate existing manually-created branches into Speck tracking

**Steps (Single Child Repo)**:

1. **Navigate to child repo with existing branches**:
   ```bash
   cd /path/to/backend-service
   git branch --list 'nprbst/*'
   # Output: nprbst/auth-db, nprbst/auth-api, nprbst/auth-ui
   ```

2. **Run import**:
   ```bash
   /speck.branch import
   # Output:
   # Detected 3 git branches for import:
   #   nprbst/auth-db (parent: main)
   #   nprbst/auth-api (parent: nprbst/auth-db)
   #   nprbst/auth-ui (parent: nprbst/auth-api)
   #
   # Import these branches? [y/N]:
   ```

3. **Confirm import**:
   ```bash
   # Type: y
   # Output:
   # Imported 3 branches successfully.
   # Updated .speck/branches.json (with parentSpecId field)
   ```

4. **Verify imported branches**:
   ```bash
   /speck.branch list
   # Output: All 3 branches now tracked with inferred parent relationships
   ```

**Steps (All Repos from Root)**:

1. **Navigate to speck root**:
   ```bash
   cd /path/to/speck-root
   ```

2. **Run import with --all flag**:
   ```bash
   /speck.branch import --all
   # Output:
   # Import branches for which child repos?
   #
   # [ ] Root repository
   # [x] backend-service (3 branches detected)
   # [x] frontend-app (1 branch detected)
   ```

3. **Select repos and confirm**:
   ```bash
   # Use arrow keys to select, space to toggle, enter to confirm
   # Output:
   # Importing from 2 child repositories...
   #
   # backend-service: Imported 3 branches
   # frontend-app: Imported 1 branch
   #
   # Done.
   ```

---

### Workflow 4: Independent Stacking Across Multiple Child Repos

**Goal**: Parallel stacked PR workflows in multiple microservices without cross-repo dependencies

**Setup**:
- Speck root with 3 child repos: `backend-service`, `frontend-app`, `notification-service`
- Each child implements different part of same parent feature (e.g., "009-multi-repo-stacked")

**Steps**:

1. **Backend team creates stacked branches**:
   ```bash
   cd backend-service
   /speck.branch create nprbst/auth-db --base main
   /speck.branch create nprbst/auth-api --base nprbst/auth-db
   ```

2. **Frontend team creates stacked branches** (in parallel):
   ```bash
   cd ../frontend-app
   /speck.branch create nprbst/login-ui --base main
   /speck.branch create nprbst/profile-ui --base nprbst/login-ui
   ```

3. **Notification team creates single branch**:
   ```bash
   cd ../notification-service
   /speck.branch create nprbst/email-templates --base main
   ```

4. **View aggregate status from root**:
   ```bash
   cd ..
   /speck.branch status --all
   # Output:
   # Root Repository: (no branches)
   #
   # Child: backend-service
   #   2 active branches
   #   └─ nprbst/auth-db → nprbst/auth-api
   #
   # Child: frontend-app
   #   2 active branches
   #   └─ nprbst/login-ui → nprbst/profile-ui
   #
   # Child: notification-service
   #   1 active branch
   #   └─ nprbst/email-templates
   ```

5. **List all branches with repo disambiguation**:
   ```bash
   /speck.branch list --all
   # Output shows branches prefixed with repo name where needed
   ```

---

## Troubleshooting

### Issue: "Base branch 'X' does not exist in current repository"

**Symptom**: Creating branch fails with cross-repo dependency error

**Cause**: Attempting to use base branch from different child repo

**Solution**:
```bash
# Bad: Trying to stack on branch from different repo
/speck.branch create nprbst/frontend-auth --base nprbst/backend-auth
# Error: Base branch 'nprbst/backend-auth' does not exist

# Good: Stack on local branch or main
/speck.branch create nprbst/frontend-auth --base main
```

**Alternatives**:
1. Complete work in other repo first, merge to main
2. Use shared contracts/APIs for cross-repo coordination
3. Coordinate PR merge order manually

---

### Issue: "Failed to resolve multi-repo symlink"

**Symptom**: Commands fail with symlink resolution error

**Cause**: Broken symlink (target deleted) or permissions issue

**Diagnosis**:
```bash
# Check symlink status
ls -l .speck-link-*
# Output: .speck-link-backend -> ../backend-service (broken)

# Verify target exists
ls -d ../backend-service
# Output: No such file or directory
```

**Solution**:
```bash
# Remove broken symlink
rm .speck-link-backend

# Re-link to correct location
/speck.link /path/to/backend-service
```

---

### Issue: "No git remote configured for this repository"

**Symptom**: PR suggestion skipped with warning

**Cause**: Child repo has no remote URL (local-only development)

**Solution**:
```bash
# Add remote
git remote add origin https://github.com/org/backend-service.git

# Push branch with upstream tracking
git push -u origin nprbst/auth-db

# Retry branch creation for PR suggestion
/speck.branch create nprbst/auth-api --base nprbst/auth-db
# Now displays PR suggestion
```

---

### Issue: Orphaned `.speck/branches.json` after unlinking

**Symptom**: Child repo has branches.json but no parent spec symlink

**Cause**: Symlink removed manually while branch metadata exists

**Diagnosis**:
```bash
cd /path/to/backend-service
ls -la .speck-link
# Output: No such file or directory

ls -la .speck/branches.json
# Output: .speck/branches.json (exists)

/speck.env
# Output: Warning about orphaned metadata
```

**Solutions**:

**Option 1**: Re-link repo
```bash
cd /path/to/speck-root
/speck.link /path/to/backend-service
cd /path/to/backend-service
/speck.env
# Now shows correct multi-repo context
```

**Option 2**: Remove orphaned metadata
```bash
cd /path/to/backend-service
rm -rf .speck/
# Starts fresh (loses branch tracking history)
```

---

### Issue: Branch name collision across repos in aggregate view

**Symptom**: Two repos have branches with same name, display is confusing

**Example**:
```bash
# backend-service has: nprbst/api-v2
# frontend-app has: nprbst/api-v2

/speck.branch list --all
# Output disambiguates:
# Child: backend-service
#   nprbst/api-v2 ...
# Child: frontend-app
#   nprbst/api-v2 ...
```

**Solution**: System automatically disambiguates by grouping under repo names (no action needed)

**Best Practice**: Use repo-specific branch prefixes to avoid confusion:
- Backend: `nprbst/be-api-v2`
- Frontend: `nprbst/fe-api-v2`

---

## Best Practices

### 1. Branch Naming in Multi-Repo

**Recommendation**: Include repo context in branch names for clarity

```bash
# Good (explicit repo context)
/speck.branch create nprbst/be-auth-db      # backend-service
/speck.branch create nprbst/fe-login-ui     # frontend-app

# Acceptable (generic names, rely on repo grouping)
/speck.branch create nprbst/auth-layer      # context inferred from repo
```

### 2. PR Title Prefixes

**Automatic behavior**: System adds `[repo-name]` prefix to PR titles in child repos

```bash
# You provide:
Title: "Add authentication endpoints"

# System generates:
Title: "[backend-service] Add authentication endpoints"
```

**Benefits**:
- Clear visual identification in PR lists
- Easy filtering by repo in GitHub
- Prevents confusion when multiple repos have similar features

### 3. Coordination Patterns

**Anti-pattern**: Cross-repo branch dependencies
```bash
# DON'T: Try to stack on branch from different repo
cd frontend-app
/speck.branch create nprbst/ui-layer --base backend-service/nprbst/api-layer
# Error: Cross-repo dependencies not supported
```

**Pattern 1**: Sequential merging
```bash
# 1. Complete backend work first
cd backend-service
/speck.branch create nprbst/auth-api --base main
# ... implement, create PR, merge to main ...

# 2. Pull merged work into frontend
cd frontend-app
git pull origin main
/speck.branch create nprbst/auth-ui --base main
# Now has access to merged backend changes
```

**Pattern 2**: Shared contracts/APIs
```bash
# 1. Define API contract at speck root
cd speck-root
mkdir -p specs/009-multi-repo-stacked/contracts/
# ... define API spec ...

# 2. Backend implements contract
cd backend-service
/speck.branch create nprbst/api-impl --base main
# ... implement per contract ...

# 3. Frontend implements against same contract
cd frontend-app
/speck.branch create nprbst/api-client --base main
# ... implement per contract ...
```

### 4. Aggregate Status Monitoring

**Daily workflow**:
```bash
# Morning: Check all work in progress
cd /path/to/speck-root
/speck.branch status --all

# Review:
# - Which repos have active work
# - Which PRs merged (may need downstream rebases)
# - Which branches ready for PR creation
```

### 5. Import Timing

**When to import**:
- Migrating existing multi-repo project to Speck stacking
- Team members created branches manually before adoption

**When NOT to import**:
- Starting new feature (use `/speck.branch create` instead)
- Branches already tracked (redundant, will error)

---

## Next Steps

After completing quickstart:

1. **Learn advanced workflows**: Read [spec.md](./spec.md) for all user stories
2. **Understand testing strategy**: Review [testing-strategy/](testing-strategy/) directory
3. **Explore command reference**: See [contracts/command-interfaces.md](contracts/command-interfaces.md)
4. **Review data model**: Check [data-model.md](data-model.md) for entity details
5. **Integration with CI/CD**: Configure hooks for automated PR creation (future feature)

---

**Quickstart Complete**: 2025-11-19
