# UX Flows: Multi-Repo and Monorepo Support

**Feature**: 007-multi-repo-monorepo-support
**Created**: 2025-11-17
**Audience**: Developers using Speck in various repository configurations

---

## Table of Contents

1. [Single-Repo Flow (Unchanged)](#single-repo-flow-unchanged)
2. [Multi-Repo Setup Flow](#multi-repo-setup-flow)
3. [Multi-Repo Development Flow](#multi-repo-development-flow)
4. [Monorepo Setup Flow](#monorepo-setup-flow)
5. [Monorepo Development Flow](#monorepo-development-flow)
6. [Migration Flows](#migration-flows)
7. [Troubleshooting Flows](#troubleshooting-flows)

---

## Single-Repo Flow (Unchanged)

### Persona: Sarah - Solo Developer

**Context**: Sarah maintains a single web application in one repository. She's never worked with microservices or monorepos.

### Setup (First Time)

```bash
# Sarah clones her project
git clone https://github.com/sarah/my-app
cd my-app

# Speck is already installed (via plugin)
# No additional setup needed
```

**Time**: 0 seconds (no new steps)

**Mental Model**: "Specs live in my project's `specs/` folder"

---

### Creating a Feature

```bash
# Sarah creates a new feature
/speck.specify "Add dark mode toggle to settings page"
```

**Output**:
```
✓ Created spec at specs/001-dark-mode/spec.md
Next: Run /speck.plan to generate implementation plan
```

**File Created**:
- `specs/001-dark-mode/spec.md`

**Sarah's Experience**:
- ✓ Simple, familiar
- ✓ No mention of "multi-repo" or symlinks
- ✓ Identical to current Speck behavior

---

### Planning & Implementation

```bash
/speck.plan
# Reads: specs/001-dark-mode/spec.md
# Reads: .speck/constitution.md
# Creates: specs/001-dark-mode/plan.md

/speck.tasks
# Creates: specs/001-dark-mode/tasks.md

/speck.implement
# Implements tasks
```

**Sarah's Mental Model**: "Everything is local to my project"

**UX Principle**: Sarah never learns about multi-repo features unless she needs them.

---

## Multi-Repo Setup Flow

### Persona: Alex - Backend Developer on Microservices Team

**Context**: Alex's team has separate `auth-service` and `user-service` repositories. They want to implement "OAuth Integration" which requires changes in both services.

### Initial Setup (One-Time, Per Repository)

**Step 1: Create Shared Speck Root**

```bash
# Team creates shared parent directory (one-time setup)
mkdir ~/my-company/services
cd ~/my-company/services
mkdir specs  # Central spec storage

# Clone existing services
git clone https://github.com/company/auth-service
git clone https://github.com/company/user-service
```

**Directory Structure** (after setup):
```
~/my-company/services/
├── specs/              # Empty (specs will go here)
├── auth-service/       # Backend service
└── user-service/       # Backend service
```

**Time**: 2 minutes

---

**Step 2: Link Repositories to Shared Root**

```bash
# Alex links auth-service
cd auth-service
/speck.link ..
```

**Output**:
```
✓ Multi-repo mode enabled
  Speck Root: /Users/alex/my-company/services
  Specs: /Users/alex/my-company/services/specs

Next steps:
  1. Create specs: /speck.specify "Feature description"
  2. Generate plan: /speck.plan
```

**What Happened**:
- Created `.speck/root` symlink → `..`
- Enabled multi-repo detection

**Visual Confirmation**:
```bash
ls -la .speck/
# drwxr-xr-x  .
# drwxr-xr-x  ..
# lrwxr-xr-x  root -> ..          # <-- Symlink visible!
# -rw-r--r--  constitution.md
```

---

**Step 3: Link Second Repository**

```bash
cd ../user-service
/speck.link ..
```

**Output**: Same success message

**Time**: 30 seconds per repo

---

**Step 4: Verify Configuration**

```bash
# Alex checks environment
/speck.env
```

**Output**:
```
=== Speck Configuration ===
Mode: Multi-repo
Speck Root: /Users/alex/my-company/services
Repo Root: /Users/alex/my-company/services/auth-service
Specs Directory: /Users/alex/my-company/services/specs

=== Linked Configuration ===
.speck/root → .. (valid)

=== Constitution ===
Location: .speck/constitution.md (local)
Status: Found
```

**Alex's Mental Model**: "My specs live one level up, shared with other services"

---

## Multi-Repo Development Flow

### Persona: Alex & Jordan - Two Developers, Two Services

**Context**: Alex works on `auth-service`, Jordan works on `user-service`. They need to implement "OAuth Integration" together.

---

### Creating Shared Spec (Either Developer Can Do This)

**Alex creates the spec** (from auth-service directory):

```bash
cd ~/my-company/services/auth-service
/speck.specify "Implement OAuth 2.0 integration with Google and GitHub providers"
```

**Output**:
```
✓ Created spec at ../specs/001-oauth-integration/spec.md
Next: Run /speck.plan to generate implementation plan
```

**File Created**:
- `~/my-company/services/specs/001-oauth-integration/spec.md` (at shared root!)

**Key Insight**: Spec is created at speck root, not inside `auth-service/`

---

**Jordan sees the spec immediately** (from user-service directory):

```bash
cd ~/my-company/services/user-service
ls ../specs/
# 001-oauth-integration/
```

**Mental Model**: "Specs are shared at the parent level"

---

### Generating Service-Specific Plans

**Alex generates auth-service plan**:

```bash
cd ~/my-company/services/auth-service
/speck.plan
```

**Process**:
1. Reads: `../specs/001-oauth-integration/spec.md` (shared)
2. Reads: `.speck/constitution.md` (auth-service constitution)
3. Generates: `specs/001-oauth-integration/plan.md` (local to auth-service)

**Output**:
```
✓ Generated plan at specs/001-oauth-integration/plan.md

Constitution Check:
  Principle 1: Stateless services - PASS
  Principle 2: JWT-only auth - PASS
  Principle 3: No session storage - PASS

Next: Run /speck.tasks to break down into tasks
```

---

**Jordan generates user-service plan** (simultaneously):

```bash
cd ~/my-company/services/user-service
/speck.plan
```

**Process**:
1. Reads: `../specs/001-oauth-integration/spec.md` (same shared spec!)
2. Reads: `.speck/constitution.md` (user-service constitution - different!)
3. Generates: `specs/001-oauth-integration/plan.md` (local to user-service)

**Output**:
```
✓ Generated plan at specs/001-oauth-integration/plan.md

Constitution Check:
  Principle 1: Postgres-backed storage - PASS
  Principle 2: Event-sourced user changes - PASS
  Principle 3: No direct auth handling - VIOLATION
    Justification: OAuth tokens received from auth-service

Next: Run /speck.tasks to break down into tasks
```

**Key Insight**: Same spec, different constitutions → different plans!

---

### Comparing Plans

**Directory structure now**:

```
~/my-company/services/
├── specs/
│   └── 001-oauth-integration/
│       └── spec.md                  # Shared spec (one source of truth)
│
├── auth-service/
│   └── specs/
│       └── 001-oauth-integration/
│           ├── spec.md -> ../../../../specs/001-oauth-integration/spec.md  # Symlink
│           └── plan.md              # Auth-specific plan
│
└── user-service/
    └── specs/
        └── 001-oauth-integration/
            ├── spec.md -> ../../../../specs/001-oauth-integration/spec.md  # Symlink
            └── plan.md              # User-specific plan (different!)
```

**Alex inspects both plans**:

```bash
# View auth-service plan
cat ~/my-company/services/auth-service/specs/001-oauth-integration/plan.md
# Shows: OAuth provider integration, token generation, /oauth/callback endpoint

# View user-service plan
cat ~/my-company/services/user-service/specs/001-oauth-integration/plan.md
# Shows: User profile creation from OAuth data, linking OAuth accounts to users
```

**Mental Model**: "One spec tells us WHAT to build. Each service's plan tells us HOW to build it in that service."

---

### Implementation (Independent)

**Alex implements auth-service tasks**:

```bash
cd ~/my-company/services/auth-service
/speck.tasks
/speck.implement
```

**Jordan implements user-service tasks**:

```bash
cd ~/my-company/services/user-service
/speck.tasks
/speck.implement
```

**UX Principle**: Each developer works independently in their own repo, using standard Speck commands.

---

### Committing Changes

**Alex commits auth-service changes**:

```bash
cd ~/my-company/services/auth-service
git status
```

**Output**:
```
On branch 001-oauth-integration

Untracked files:
  specs/001-oauth-integration/plan.md
  specs/001-oauth-integration/tasks.md
  src/oauth/google-provider.ts
  src/oauth/github-provider.ts
```

**Notice**: `spec.md` is NOT shown (it's a symlink, ignored by git)

```bash
git add .
git commit -m "Implement OAuth provider integration"
git push
```

**Files Committed**:
- ✓ `plan.md` (auth-service specific)
- ✓ `tasks.md` (auth-service specific)
- ✓ Implementation files
- ✗ `spec.md` (symlink, not committed)

**Jordan's commit** (user-service):

```bash
git add .
git commit -m "Add OAuth account linking"
git push
```

**Files Committed**:
- ✓ `plan.md` (user-service specific, different from auth-service)
- ✓ `tasks.md` (user-service specific)
- ✓ Implementation files
- ✗ `spec.md` (symlink, not committed)

**Key Insight**: Each repo commits only its own plan/tasks, not the shared spec.

---

## Monorepo Setup Flow

### Persona: Maria - Frontend Developer on Monorepo Team

**Context**: Maria's team uses a monorepo with structure:

```
monorepo/
├── packages/
│   ├── ui/         # React component library
│   ├── web/        # Next.js web app
│   └── mobile/     # React Native app
├── apps/
│   └── admin/      # Admin dashboard
└── package.json    # Workspace config
```

They want to implement "Design System Tokens" that affects `ui`, `web`, and `mobile` packages.

---

### One-Time Setup

**Step 1: Create Central Specs at Monorepo Root**

```bash
cd ~/projects/monorepo
mkdir specs  # Central spec storage for all packages
```

---

**Step 2: Link Each Package**

```bash
# Link UI package
cd packages/ui
/speck.link ../..
# Creates .speck/root -> ../..

# Link web app
cd ../web
/speck.link ../..

# Link mobile app
cd ../mobile
/speck.link ../..

# Link admin app
cd ../../apps/admin
/speck.link ../..
```

**Time**: 2 minutes (30 seconds per package)

---

**Step 3: Verify Setup**

```bash
cd ~/projects/monorepo/packages/ui
/speck.env
```

**Output**:
```
Mode: Multi-repo
Speck Root: /Users/maria/projects/monorepo
Repo Root: /Users/maria/projects/monorepo/packages/ui
Specs: /Users/maria/projects/monorepo/specs
```

**Maria's Mental Model**: "Even though this is a monorepo, Speck treats each package like a separate repo. Specs live at the root."

---

## Monorepo Development Flow

### Creating Package-Spanning Feature

**Maria creates spec from ui package**:

```bash
cd ~/projects/monorepo/packages/ui
/speck.specify "Design system tokens (colors, spacing, typography) consumable across web, mobile, and admin"
```

**Output**:
```
✓ Created spec at ../../specs/001-design-tokens/spec.md
```

**File Created**:
- `~/projects/monorepo/specs/001-design-tokens/spec.md` (at monorepo root)

---

### Generating Package-Specific Plans

**UI package plan** (component library):

```bash
cd ~/projects/monorepo/packages/ui
/speck.plan
```

**Constitution Principles** (ui package):
- Principle 1: Zero runtime dependencies
- Principle 2: Framework-agnostic tokens
- Principle 3: TypeScript + CSS variables

**Plan Output**: Token definitions as TypeScript types + CSS variables

---

**Web package plan** (Next.js app):

```bash
cd ~/projects/monorepo/packages/web
/speck.plan
```

**Constitution Principles** (web package):
- Principle 1: Server components by default
- Principle 2: TailwindCSS for styling
- Principle 3: Import from @company/ui

**Plan Output**: Tailwind config using design tokens, Next.js integration

---

**Mobile package plan** (React Native):

```bash
cd ~/projects/monorepo/packages/mobile
/speck.plan
```

**Constitution Principles** (mobile package):
- Principle 1: React Native StyleSheet
- Principle 2: No web-specific dependencies
- Principle 3: iOS/Android platform-specific tokens

**Plan Output**: Native token definitions, platform-specific overrides

---

### Directory Structure After Planning

```
monorepo/
├── specs/
│   └── 001-design-tokens/
│       └── spec.md              # Shared spec (single source of truth)
│
├── packages/
│   ├── ui/
│   │   ├── .speck/
│   │   │   └── root -> ../..
│   │   └── specs/
│   │       └── 001-design-tokens/
│   │           ├── spec.md -> ../../../../specs/001-design-tokens/spec.md
│   │           └── plan.md      # UI-specific: TypeScript + CSS vars
│   │
│   ├── web/
│   │   ├── .speck/
│   │   │   └── root -> ../..
│   │   └── specs/
│   │       └── 001-design-tokens/
│   │           ├── spec.md -> ../../../../specs/001-design-tokens/spec.md
│   │           └── plan.md      # Web-specific: Tailwind integration
│   │
│   └── mobile/
│       ├── .speck/
│       │   └── root -> ../..
│       └── specs/
│           └── 001-design-tokens/
│               ├── spec.md -> ../../../../specs/001-design-tokens/spec.md
│               └── plan.md      # Mobile-specific: RN StyleSheet
│
└── apps/
    └── admin/
        ├── .speck/
        │   └── root -> ../..
        └── specs/
            └── 001-design-tokens/
                ├── spec.md -> ../../../../specs/001-design-tokens/spec.md
                └── plan.md      # Admin-specific: similar to web
```

**Key Insight**: One spec, four different plans tailored to each package's technology and constraints.

---

### Implementation (Coordinated)

**Maria implements UI package** (tokens definition):

```bash
cd packages/ui
/speck.tasks
/speck.implement
# Creates: src/tokens/colors.ts, src/tokens/spacing.ts, etc.
```

**Other developers implement consumers** (after UI is done):

```bash
cd packages/web
/speck.implement
# Integrates tokens into Tailwind config

cd ../mobile
/speck.implement
# Creates native token mappings
```

**UX Principle**: Monorepo coordination is manual (implementation order), but each package uses standard Speck workflow.

---

## Migration Flows

### Flow 1: Single-Repo → Multi-Repo

**Persona**: Team splits monolithic app into frontend + backend

**Before**:
```
my-app/
├── .git/
├── specs/
│   ├── 001-auth/
│   └── 002-payments/
├── frontend/
└── backend/
```

**Migration Steps**:

1. **Create new repo structure**:
   ```bash
   mkdir my-product
   mv my-app my-product/monolith
   cd my-product
   git clone <new-frontend-repo> frontend
   git clone <new-backend-repo> backend
   ```

2. **Move specs to central location**:
   ```bash
   mv monolith/specs ./specs
   ```

3. **Link monolith to central specs** (temporary, during migration):
   ```bash
   cd monolith
   /speck.link ..
   ```

4. **Link new repos**:
   ```bash
   cd ../frontend
   /speck.link ..

   cd ../backend
   /speck.link ..
   ```

5. **Create symlinks for existing specs**:
   ```bash
   cd frontend/specs
   mkdir 001-auth
   ln -s ../../../specs/001-auth/spec.md 001-auth/spec.md
   # Repeat for each spec
   ```

6. **Generate new plans**:
   ```bash
   cd frontend
   /speck.plan  # Generates frontend-specific plan

   cd ../backend
   /speck.plan  # Generates backend-specific plan
   ```

**Time**: 15 minutes (manual), 5 minutes (with script)

---

### Flow 2: Monorepo Setup from Scratch

**Persona**: Team creates new monorepo

**Steps**:

1. **Initialize monorepo**:
   ```bash
   mkdir my-monorepo && cd my-monorepo
   git init
   mkdir -p packages/ui packages/api specs
   ```

2. **Link packages**:
   ```bash
   cd packages/ui
   /speck.link ../..

   cd ../api
   /speck.link ../..
   ```

3. **Start development**:
   ```bash
   cd ../ui
   /speck.specify "Component library foundations"
   /speck.plan
   ```

**Time**: 5 minutes

---

## Troubleshooting Flows

### Problem 1: "Where are my specs?"

**User**: Clones a repo, doesn't realize it's in multi-repo mode

**Solution**:

```bash
/speck.env
```

**Output**:
```
Mode: Multi-repo
Speck Root: /Users/dev/my-product
Specs: /Users/dev/my-product/specs

Note: Specs are stored at parent directory (shared across multiple repos)
```

**User**: "Oh, specs are one level up!"

---

### Problem 2: "Multi-repo setup is broken"

**User**: Moved repositories, symlinks are broken

**Error**:
```bash
/speck.plan
ERROR: Multi-repo configuration broken

.speck/root points to: /old/path/my-product
This directory does not exist.

Fix:
  1. Remove broken symlink: rm .speck/root
  2. Link to correct location: /speck.link <path-to-speck-root>
```

**Solution**:
```bash
rm .speck/root
/speck.link ../../new-location/my-product
```

**Output**:
```
✓ Multi-repo mode enabled
  Speck Root: /Users/dev/new-location/my-product
```

---

### Problem 3: "Which mode am I in?"

**User**: Forgets if repo is single or multi-repo

**Solution**:
```bash
/speck.env
```

**Output (single-repo)**:
```
Mode: Single-repo
Specs: ./specs
```

**Output (multi-repo)**:
```
Mode: Multi-repo
Speck Root: /Users/dev/my-product
```

**UX Principle**: One command to discover configuration.

---

### Problem 4: "I want to go back to single-repo"

**User**: Decides multi-repo is too complex

**Solution**:

1. **Remove symlink**:
   ```bash
   rm .speck/root
   ```

2. **Copy specs locally** (optional):
   ```bash
   cp -r ../specs/* ./specs/
   ```

3. **Verify**:
   ```bash
   /speck.env
   ```

   **Output**:
   ```
   Mode: Single-repo
   Specs: ./specs
   ```

**Time**: 30 seconds

---

## Summary Comparison

| Aspect | Single-Repo | Multi-Repo | Monorepo |
|--------|-------------|------------|----------|
| **Setup** | None (default) | `/speck.link ..` per repo | `/speck.link ../..` per package |
| **Spec Location** | `./specs/` | `<speck-root>/specs/` | `<monorepo-root>/specs/` |
| **Plan Location** | `./specs/NNN/plan.md` | `./specs/NNN/plan.md` (local) | `./specs/NNN/plan.md` (local) |
| **Constitution** | `.speck/constitution.md` | `.speck/constitution.md` (per repo) | `.speck/constitution.md` (per package) |
| **Commands** | All standard | All standard (no changes) | All standard (no changes) |
| **Mental Model** | "Everything is local" | "Specs shared, plans local" | "Specs at root, plans per package" |
| **Collaboration** | N/A (single dev/team) | Manual coordination | Manual coordination |
| **Git Commits** | All files local | Only plan.md/tasks.md | Only plan.md/tasks.md |
| **Learning Curve** | 0 (existing behavior) | +5 min (understand linking) | +5 min (same as multi-repo) |

---

## User Quotes (Simulated)

**Sarah (Single-Repo)**:
> "I didn't even know multi-repo was a thing. Speck just works."

**Alex (Multi-Repo)**:
> "Setup took 2 minutes. Now auth-service and user-service share specs but have different implementation plans. Perfect."

**Maria (Monorepo)**:
> "Our UI, web, and mobile packages all work from the same spec but generate platform-specific plans. Exactly what we needed."

**Jordan (Migration)**:
> "We split our monolith into microservices. Moving specs to a shared directory and linking repos took 10 minutes."

---

## Conclusion

The UX flows demonstrate that:

1. **Single-repo remains pristine**: No changes, no new concepts
2. **Multi-repo is explicit**: One command (`/speck.link`) makes intent clear
3. **Monorepo = Multi-repo**: Identical mental model, zero additional learning
4. **Troubleshooting is transparent**: `/speck.env` reveals configuration instantly

Users encounter complexity only when they need it, and the learning curve is minimal (5 minutes to understand symlink-based linking).
