---
title: "Monorepo Support"
description: "Manage workspace projects in monorepos with Speck's automatic detection and cross-workspace coordination."
category: advanced-features
audience: [existing-users, evaluators]
prerequisites: ["/docs/getting-started/installation", "/docs/core-concepts/workflow"]
tags: ["monorepo", "workspace", "pnpm", "yarn", "lerna"]
lastUpdated: 2025-11-22
relatedPages: ["/docs/advanced-features/multi-repo-support", "/docs/core-concepts/multi-repo"]
---

# Monorepo Support

Speck automatically detects monorepo workspaces and provides cross-workspace coordination similar to multi-repo support. Use shared specifications across workspace packages while maintaining independent implementation plans per package.

## What is a Monorepo?

A monorepo is a single repository containing multiple related projects (packages/workspaces). Common monorepo tools include:

- **pnpm workspaces** - Fast, disk-efficient package manager
- **Yarn workspaces** - Yarn's built-in workspace support
- **npm workspaces** - Native npm workspace support (v7+)
- **Lerna** - Monorepo management tool
- **Nx** - Smart build system for monorepos

## Automatic Detection

Speck detects monorepo mode by checking for workspace configuration files:

**pnpm**:
```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
  - 'apps/*'
```

**Yarn/npm**:
```json
// package.json
{
  "workspaces": [
    "packages/*",
    "apps/*"
  ]
}
```

**Lerna**:
```json
// lerna.json
{
  "packages": [
    "packages/*"
  ]
}
```

When detected, Speck treats each workspace as a separate context similar to multi-repo children.

## Monorepo vs Multi-Repo

|  | Monorepo | Multi-Repo |
|---|----------|------------|
| **Structure** | Single repo, multiple workspaces | Multiple separate repos |
| **Detection** | Automatic (workspace config) | Manual (symlinks via `/speck.link`) |
| **Shared specs** | Optional (same as multi-repo) | Yes (via root directory) |
| **Version control** | Single git repository | Separate git repositories |
| **Dependencies** | Internal workspace dependencies | External package dependencies |

## Using Speck in Monorepos

### Workspace-Level Specifications

Create specifications at the workspace level for features spanning multiple packages:

```
my-monorepo/
├── pnpm-workspace.yaml
├── packages/
│   ├── ui/           # Workspace package
│   ├── api/          # Workspace package
│   └── shared/       # Workspace package
└── specs/            # Shared specifications (root level)
    └── 001-user-auth/
        ├── spec.md
        └── contracts/
```

Each package generates its own plan:

```bash
# From UI package
cd packages/ui
/speck.plan

# From API package
cd packages/api
/speck.plan
```

### Package-Level Specifications

Alternatively, create specifications within individual packages for package-specific features:

```
my-monorepo/
├── pnpm-workspace.yaml
└── packages/
    ├── ui/
    │   └── specs/
    │       └── 001-button-component/
    │           ├── spec.md
    │           └── plan.md
    └── api/
        └── specs/
            └── 001-rest-endpoints/
                ├── spec.md
                └── plan.md
```

This approach works for features that don't require cross-package coordination.

### Hybrid Approach (Recommended)

Use both workspace-level and package-level specs:

- **Workspace-level**: Cross-package features (user auth, payment processing)
- **Package-level**: Package-specific features (UI components, API utilities)

```
my-monorepo/
├── specs/                    # Shared cross-package features
│   └── 001-user-auth/
└── packages/
    ├── ui/
    │   └── specs/            # UI-specific features
    │       └── 002-button-component/
    └── api/
        └── specs/            # API-specific features
            └── 003-rate-limiting/
```

## Shared Specifications in Monorepos

To use shared specs across workspaces (similar to multi-repo), create a root spec directory and link packages to it:

### Option 1: Root-Level Shared Specs

```bash
# Create shared specs at monorepo root
cd /monorepo-root
mkdir shared-specs

# In Claude Code, from shared-specs/
/speck.specify "User authentication"

# Link packages to shared specs
cd packages/ui
/speck.link ../../shared-specs

cd ../api
/speck.link ../../shared-specs
```

Now both packages read from the same shared specification.

### Option 2: Dedicated Specs Package

Create a workspace package just for specifications:

```json
// pnpm-workspace.yaml
packages:
  - 'packages/*'
  - 'specs'
```

```
my-monorepo/
├── pnpm-workspace.yaml
├── specs/              # Workspace package for specs
│   └── 001-user-auth/
└── packages/
    ├── ui/
    └── api/
```

Link other packages to the specs workspace:

```bash
cd packages/ui
/speck.link ../../specs

cd ../api
/speck.link ../../specs
```

## Common Monorepo Patterns

### Frontend + Backend Monorepo

```
my-monorepo/
├── pnpm-workspace.yaml
├── specs/                      # Shared specifications
│   └── 001-user-auth/
│       ├── spec.md
│       └── contracts/api.md    # API contract
├── apps/
│   ├── web/                    # Next.js frontend
│   │   ├── .speck/root → ../../specs
│   │   └── specs/001-user-auth/
│   │       ├── plan.md         # Next.js implementation
│   │       └── tasks.md
│   └── api/                    # Express backend
│       ├── .speck/root → ../../specs
│       └── specs/001-user-auth/
│           ├── plan.md         # Express implementation
│           └── tasks.md
└── packages/
    └── shared/                 # Shared types/utils
```

### Component Library Monorepo

```
design-system/
├── pnpm-workspace.yaml
└── packages/
    ├── components/
    │   └── specs/
    │       ├── 001-button/
    │       ├── 002-input/
    │       └── 003-modal/
    ├── icons/
    │   └── specs/
    │       └── 001-icon-set/
    └── themes/
        └── specs/
            └── 001-dark-theme/
```

Each package manages its own specifications independently.

## Workspace Commands

Run commands from any package or the monorepo root:

```bash
# From package directory
cd packages/ui
/speck.plan       # Generates plan for current package

# From monorepo root
cd /monorepo-root
/speck.env --all  # Shows status across all workspaces
```

## Best Practices

### 1. Consistent Structure

Maintain consistent spec directory structure across all workspaces:

```
packages/*/specs/NNN-feature-name/
  ├── spec.md
  ├── plan.md
  └── tasks.md
```

### 2. Shared Contracts

For cross-package features, define contracts at the root level:

```
specs/001-user-auth/
  └── contracts/
      ├── api.md        # API endpoints (for backend)
      ├── types.md      # TypeScript types (for frontend)
      └── events.md     # Event payloads (for both)
```

### 3. Package Boundaries

Respect workspace boundaries when implementing features:

**Good**:
```markdown
# UI package plan.md
- Implement login form component
- Call API via shared types contract
- Handle auth state in React context
```

**Bad**:
```markdown
# UI package plan.md
- Implement login form component
- Directly import backend database models (crosses boundary)
```

### 4. Version Control

```gitignore
# .gitignore at monorepo root
.speck/root       # Symlinks are local to workspace
node_modules/
```

Commit all specs:
```bash
git add specs/
git add packages/*/specs/
git commit -m "Add user auth specification"
```

## Troubleshooting

### Workspace Not Detected

**Symptom**: `/speck.env` doesn't show workspace context

**Solution**: Ensure workspace configuration file exists at root:
```bash
# Check for workspace config
ls pnpm-workspace.yaml
# or
grep workspaces package.json
```

### Cross-Package Imports Failing

**Symptom**: TypeScript errors importing from other packages

**Solution**: Configure workspace dependencies in package.json:
```json
{
  "dependencies": {
    "@myorg/shared": "workspace:*"
  }
}
```

### Plans Identical Across Packages

**Symptom**: UI and API packages generate same implementation plan

**Solution**: Each package should have its own constitution defining different tech stacks. Update per-package constitutions, then regenerate plans.

## Performance

Monorepo detection is automatic and adds minimal overhead:

- **Detection**: <5ms (checks for workspace config files)
- **Per-package operations**: Same performance as single-repo
- **Aggregate commands**: <1s for 10+ workspaces

## Migration from Multi-Repo

Converting multi-repo setup to monorepo:

1. **Move repos into monorepo structure**:
```bash
mkdir my-monorepo
cd my-monorepo
git init

# Move existing repos as packages
mv /old/frontend packages/frontend
mv /old/backend packages/backend
```

2. **Configure workspaces**:
```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
```

3. **Move shared specs to root**:
```bash
mkdir specs
mv /old/shared-specs/* specs/
```

4. **Update symlinks** (if using shared specs):
```bash
cd packages/frontend
rm .speck/root
/speck.link ../../specs

cd ../backend
rm .speck/root
/speck.link ../../specs
```

5. **Verify**:
```bash
cd packages/frontend
/speck.env  # Should show monorepo context
```

## Next Steps

- [Multi-Repo Support](/docs/advanced-features/multi-repo-support) - Compare with multi-repo approach
- [Multi-Repo Workflow Example](/docs/examples/multi-repo-workflow) - Practical example (applies to monorepos)
- [Core Concepts](/docs/core-concepts/multi-repo) - Understanding multi-repo architecture
- [Capability Matrix](/docs/reference/capability-matrix) - Feature compatibility
