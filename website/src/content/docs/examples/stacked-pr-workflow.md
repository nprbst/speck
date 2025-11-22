---
title: "Stacked PR Workflow Tutorial"
description: "Learn how to break a large authentication feature into three reviewable pull requests using Speck's stacked PR support."
category: "examples"
order: 3
tags: ["stacked-prs", "tutorial", "workflow", "authentication"]
lastUpdated: 2025-11-22
---
relatedPages: ["/docs/examples/multi-repo-workflow"]
---

# Stacked PR Workflow Tutorial

Build a JWT authentication feature split into three reviewable pull requests: database schema, API endpoints, and frontend UI. Learn how to work in parallel while PRs are under review.

## What You'll Build

A complete authentication system broken into reviewable chunks:

```
main
└─ username/auth-db-schema [20 commits, ~400 lines] → PR #1
   └─ username/auth-api-endpoints [25 commits, ~500 lines] → PR #2
      └─ username/auth-login-ui [30 commits, ~600 lines] → PR #3
```

Each PR is:
- **Independently reviewable** (15-30 minutes review time)
- **Logically complete** (implements full layer)
- **Incrementally valuable** (enables next team to start work)

## Prerequisites

- Speck plugin installed in Claude Code
- Node.js/Express backend project (or similar)
- React frontend project (or similar)
- GitHub CLI (`gh`) installed (optional, for PR automation)

## Part 1: Database Layer (Branch 1)

### Step 1: Create Feature Specification

In your backend repository:

```bash
# In Claude Code
/speck.specify
```

Describe your feature:

```
Add JWT-based user authentication with email/password login.
Users should be able to register, log in, and access protected routes.
```

Speck generates `specs/001-jwt-auth/spec.md`.

### Step 2: Create First Branch

```bash
/speck.branch create username/auth-db-schema --base main
```

Speck creates the branch and tracks it:

```
✓ Created branch: username/auth-db-schema
✓ Base: main
✓ Checked out: username/auth-db-schema
```

### Step 3: Implement Database Schema

Focus only on database layer:

```sql
-- migrations/001_create_users_table.sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- migrations/002_create_refresh_tokens_table.sql
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

Commit your work:

```bash
git add migrations/
git commit -m "Add users table migration"
git commit -m "Add refresh_tokens table migration"
git commit -m "Add database indexes for performance"
```

### Step 4: Create PR for Database Layer

Push your branch:

```bash
git push -u origin username/auth-db-schema
```

Speck suggests PR creation command:

```bash
# Auto-generated suggestion:
gh pr create \
  --title "Add authentication database schema" \
  --body "Implements users and refresh_tokens tables for JWT authentication. Migration files included." \
  --base main
```

Run the command (or create PR manually via GitHub web UI).

Update Speck with PR number:

```bash
/speck.branch update username/auth-db-schema --status submitted --pr 123
```

**Time check**: Database layer complete, PR #123 submitted for review (Day 1 morning).

## Part 2: API Endpoints (Branch 2) - Parallel Work!

### Step 5: Create Second Branch (Don't Wait for Review!)

While PR #123 is being reviewed, start the next layer:

```bash
/speck.branch create username/auth-api-endpoints --base username/auth-db-schema
```

Key insight: **Base is username/auth-db-schema**, not `main`. This branch builds on the previous one.

### Step 6: Implement Authentication API

Focus only on API layer:

```javascript
// src/routes/auth.js
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User, RefreshToken } = require('../models');

const router = express.Router();

// POST /auth/register
router.post('/register', async (req, res) => {
  const { email, password } = req.body;
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await User.create({ email, passwordHash });
  res.status(201).json({ userId: user.id });
});

// POST /auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ where: { email } });

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const accessToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = await RefreshToken.create({ userId: user.id });

  res.json({ accessToken, refreshToken: refreshToken.token });
});

// POST /auth/refresh
router.post('/refresh', async (req, res) => {
  // Implementation for token refresh
});

module.exports = router;
```

Commit incrementally:

```bash
git commit -m "Add user registration endpoint"
git commit -m "Add login endpoint with JWT generation"
git commit -m "Add token refresh endpoint"
git commit -m "Add authentication middleware"
git commit -m "Add input validation"
```

### Step 7: Create PR for API Layer

Push and create PR:

```bash
git push -u origin username/auth-api-endpoints

gh pr create \
  --title "Add authentication API endpoints" \
  --body "Implements register, login, and refresh token endpoints. Builds on #123." \
  --base username/auth-db-schema
```

**Important**: PR base is `username/auth-db-schema`, not `main`.

Update Speck:

```bash
/speck.branch update username/auth-api-endpoints --status submitted --pr 124
```

**Time check**: API layer complete, PR #124 submitted (Day 1 afternoon). PR #123 still under review!

## Part 3: Frontend UI (Branch 3) - Keep Going!

### Step 8: Create Third Branch

```bash
/speck.branch create username/auth-login-ui --base username/auth-api-endpoints
```

### Step 9: Implement Login UI

In your frontend repository:

```jsx
// src/components/LoginForm.jsx
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading, error } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    await login(email, password);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Logging in...' : 'Log In'}
      </button>
      {error && <p className="error">{error}</p>}
    </form>
  );
}
```

Commit work:

```bash
git commit -m "Add LoginForm component"
git commit -m "Add useAuth hook for authentication state"
git commit -m "Add protected route wrapper"
git commit -m "Add logout functionality"
```

### Step 10: Create PR for UI Layer

```bash
git push -u origin username/auth-login-ui

gh pr create \
  --title "Add authentication login UI" \
  --body "Implements login form, protected routes, and logout. Builds on #124." \
  --base username/auth-api-endpoints

/speck.branch update username/auth-login-ui --status submitted --pr 125
```

**Time check**: All three layers implemented and submitted for review (Day 2).

## Part 4: Managing the Stack

### View Your Stack

```bash
/speck.branch list
```

**Output:**
```
Branch                       Base                         Spec    PR#   Status
username/auth-db-schema      main                         001     123   submitted
username/auth-api-endpoints  username/auth-db-schema      001     124   submitted
username/auth-login-ui       username/auth-api-endpoints  001     125   submitted
```

### Check Stack Health

```bash
/speck.branch status
```

**Output:**
```
✓ No circular dependencies
✓ All branches have valid bases
✓ 3 active stacked branches
```

### Responding to Reviews

**Scenario**: PR #123 approved, changes requested on #124

```bash
# Check out branch 2
git checkout username/auth-api-endpoints

# Make requested changes
# ... edit code ...
git commit -m "Fix: Use 401 status for invalid credentials"
git push

# Update if needed
/speck.branch update username/auth-api-endpoints --status submitted
```

## Part 5: Merging the Stack

### Step 11: Merge First PR

PR #123 approved! Merge it:

```bash
# Via GitHub UI: Click "Merge pull request"
```

Update Speck:

```bash
/speck.branch update username/auth-db-schema --status merged
```

### Step 12: Rebase Dependent Branches

Now that `username/auth-db-schema` merged to `main`, update PR #124's base:

```bash
# Update PR base via GitHub UI: main (was username/auth-db-schema)

# Rebase local branch
git checkout username/auth-api-endpoints
git rebase main
git push --force-with-lease

/speck.branch update username/auth-api-endpoints --base main
```

Repeat for PR #125 after #124 merges.

### Step 13: Final Merge

After all PRs merge:

```bash
/speck.branch status
```

**Output:**
```
✓ All branches merged
✓ Feature complete!
```

## Workflow Timeline

**Day 1 Morning**:
- Create spec, plan, tasks
- Implement database schema (Branch 1)
- Submit PR #123

**Day 1 Afternoon** (while #123 under review):
- Implement API endpoints (Branch 2)
- Submit PR #124

**Day 2 Morning** (while #123, #124 under review):
- Implement login UI (Branch 3)
- Submit PR #125

**Day 3**:
- PR #123 approved → merge
- Rebase #124, #125
- PR #124 approved → merge
- Rebase #125
- PR #125 approved → merge

**Result**: Feature shipped in 3 days with parallel work. Traditional single-branch approach would take 5+ days (sequential implementation + review).

## Key Takeaways

1. **Don't wait for reviews**: Create next branch immediately after submitting PR
2. **Small, focused PRs**: 400-600 lines per PR (reviewable in 15-30 minutes)
3. **Clear dependencies**: Each branch builds logically on previous layer
4. **Rebase when needed**: Update bases after merges to keep clean history
5. **Track everything**: Use `/speck.branch update` to maintain accurate metadata

## Troubleshooting

### "Merge conflicts during rebase"

**Cause**: Changes in merged base conflict with your branch

**Fix**: Resolve conflicts manually

```bash
git checkout username/auth-api-endpoints
git rebase main
# ... fix conflicts ...
git rebase --continue
git push --force-with-lease
```

### "PR shows too many commits"

**Cause**: PR includes commits from base branch

**Fix**: Update PR base to `main` after base branch merges

```bash
# Via GitHub UI: Edit PR → Change base to main
```

### "Can't create branch: circular dependency"

**Cause**: Trying to create invalid dependency chain

**Fix**: Check base branch is not descendant of new branch

## Next Steps

- [Multi-Repo Workflow](/docs/examples/multi-repo-workflow) - Combine stacked PRs with multi-repo
- [Stacked PR Concepts](/docs/core-concepts/stacked-prs) - Deep dive into theory
- [Commands Reference](/docs/commands/reference) - Full `/speck.branch` syntax
