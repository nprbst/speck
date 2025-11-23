# Quickstart: Worktree Integration

## Overview

The worktree integration feature allows developers to work on multiple features simultaneously in isolated Git worktrees, with automatic IDE launch and dependency installation. This guide provides a quick reference for understanding and implementing the feature.

**Target Audience**: Developers implementing this feature (spec 012)

**Related Documents**:
- [Feature Specification](./spec.md) - Full requirements and user stories
- [Research](./research.md) - Technical decisions and implementation details
- [Data Model](./data-model.md) - Entities, relationships, and validation rules
- [Contracts](./contracts/) - API interfaces and schemas

---

## Key Concepts

### Git Worktrees
A **worktree** is a separate working directory for the same Git repository. It allows you to have multiple branches checked out simultaneously without switching branches in your main repository.

**Benefits**:
- Work on multiple features without branch-switching overhead
- Keep IDE windows open for different features
- Maintain separate dependency installations per feature

**Example**:
```bash
# Main repository on branch 'main'
/Users/dev/my-project/

# Worktree for feature A on branch '002-user-auth'
/Users/dev/my-project/.speck/worktrees/002-user-auth/

# Worktree for feature B on branch '003-payment-flow'
/Users/dev/my-project/.speck/worktrees/003-payment-flow/
```

### Configuration-Driven Behavior
Worktree integration is **opt-in** and configured via `.speck/config.json`:
- **Master switch**: `worktree.enabled` (default: false)
- **IDE auto-launch**: `worktree.ide.autoLaunch` (default: false)
- **Dependency install**: `worktree.dependencies.autoInstall` (default: false)
- **File rules**: `worktree.files.rules` (default: sensible defaults)

### Lifecycle States
Worktrees progress through states during creation:
1. **CREATING**: Running `git worktree add`
2. **COPYING_FILES**: Applying file copy/symlink rules
3. **INSTALLING_DEPS**: Installing dependencies (if enabled)
4. **READY**: Worktree ready, IDE launches (if enabled)
5. **ERROR**: Creation failed at some step

---

## Directory Structure

```
my-project/                          # Main repository
├── .git/                            # Git metadata
├── .speck/
│   ├── config.json                  # Worktree configuration (NEW)
│   ├── worktrees/                   # Worktree storage (NEW)
│   │   ├── 002-user-auth/          # Worktree for branch 002-user-auth
│   │   │   ├── src/
│   │   │   ├── .env                # Copied from parent
│   │   │   ├── node_modules/       # Symlinked to parent (or separate install)
│   │   │   └── ...
│   │   └── 003-payment-flow/       # Worktree for branch 003-payment-flow
│   │       └── ...
│   ├── branches.json                # Branch metadata (EXTENDED)
│   └── ...
├── src/
├── package.json
└── ...
```

### File Storage Locations

| Data | Location | Format | Persistence |
|------|----------|--------|-------------|
| Worktree config | `.speck/config.json` | JSON (Zod-validated) | Per-repository |
| Worktree directories | `.speck/worktrees/` | File system | Per-repository |
| Branch metadata | `.speck/branches.json` | JSON | Per-repository (existing) |
| Git worktree refs | `.git/worktrees/` | Git internal | Managed by Git |

---

## Configuration Example

### Minimal Configuration (Enable Worktrees Only)
```json
{
  "version": "1.0",
  "worktree": {
    "enabled": true
  }
}
```
All other settings use defaults (no IDE launch, no auto-install).

### Full Configuration (All Features Enabled)
```json
{
  "version": "1.0",
  "worktree": {
    "enabled": true,
    "worktreePath": ".speck/worktrees",
    "branchPrefix": "specs/",
    "ide": {
      "autoLaunch": true,
      "editor": "vscode",
      "newWindow": true
    },
    "dependencies": {
      "autoInstall": true,
      "packageManager": "auto"
    },
    "files": {
      "rules": [
        { "pattern": ".env*", "action": "copy" },
        { "pattern": "*.config.js", "action": "copy" },
        { "pattern": "node_modules", "action": "symlink" }
      ],
      "includeUntracked": true
    }
  }
}
```

### Interactive Setup
Instead of manual editing, users can run:
```bash
speck worktree init
```
This launches an interactive wizard to configure all settings.

---

## Common Workflows

### Workflow 1: Create Spec with Worktree (User Story 1)

**User action**:
```bash
/speck:specify "User Authentication"
```

**System behavior** (if `worktree.enabled=true`):
1. Generate spec number (e.g., "002")
2. Calculate branch name: "002-user-auth" (or "specs/002-user-auth" if prefix set)
3. **Prompt user for approval**: "Create branch 'specs/002-user-auth'? (y/n)"
4. If approved:
   - Run `git worktree prune` (cleanup stale refs)
   - Create worktree at `.speck/worktrees/002-user-auth`
   - Copy files matching `{ action: "copy" }` rules
   - Symlink directories matching `{ action: "symlink" }` rules
   - Install dependencies (if `autoInstall=true`)
   - Launch IDE (if `autoLaunch=true`)

**Result**: Developer can immediately start working in worktree with IDE open.

---

### Workflow 2: Create Branch with Worktree (User Story 1)

**User action**:
```bash
/speck:branch feat/new-feature
```

**System behavior**: Same as Workflow 1, but for a custom branch name.

**Flag overrides**:
```bash
# Skip worktree creation for this one branch
/speck:specify "Quick Fix" --no-worktree

# Create worktree but skip IDE launch
/speck:branch feat/experimental --no-ide

# Create worktree but skip dependency install
/speck:specify "Large Feature" --no-deps
```

---

### Workflow 3: Manual Worktree Management

**Create worktree for existing branch**:
```bash
speck worktree create 002-user-auth
```

**List all worktrees**:
```bash
speck worktree list
```

**Remove worktree** (branch remains):
```bash
speck worktree remove 002-user-auth
```

**Cleanup stale references**:
```bash
speck worktree prune
```

---

### Workflow 4: IDE Auto-Launch (User Story 2)

**Configuration**:
```json
{
  "worktree": {
    "enabled": true,
    "ide": {
      "autoLaunch": true,
      "editor": "vscode",
      "newWindow": true
    }
  }
}
```

**User action**:
```bash
/speck:specify "Payment Flow"
```

**System behavior**:
1. Create worktree as usual
2. After worktree is READY, run:
   ```bash
   code -n /path/to/worktree/003-payment-flow
   ```
3. VSCode opens in new window with worktree as workspace

**Supported IDEs**:
- `vscode` → `code -n <path>`
- `cursor` → `cursor -n <path>`
- `webstorm` → `webstorm <path>`
- `idea` → `idea <path>`
- `pycharm` → `pycharm <path>`

---

### Workflow 5: Dependency Pre-Installation (User Story 3)

**Configuration**:
```json
{
  "worktree": {
    "enabled": true,
    "dependencies": {
      "autoInstall": true,
      "packageManager": "auto"
    }
  }
}
```

**User action**:
```bash
/speck:specify "New Feature"
```

**System behavior**:
1. Create worktree
2. Copy/symlink files
3. **Detect package manager** (check for lockfiles):
   - `bun.lockb` → use Bun
   - `pnpm-lock.yaml` → use pnpm
   - `yarn.lock` → use Yarn
   - `package-lock.json` → use npm
4. **Install dependencies** (blocking, with progress):
   ```
   Installing dependencies with npm...
   [====================] 100% - 1234/1234 packages installed
   ```
5. After installation completes, launch IDE (if enabled)

**Error handling**: If installation fails, IDE is NOT launched and error is shown with troubleshooting steps.

---

### Workflow 6: Custom File Rules (User Story 4)

**Configuration**:
```json
{
  "worktree": {
    "enabled": true,
    "files": {
      "rules": [
        { "pattern": ".env*", "action": "copy" },
        { "pattern": "*.config.ts", "action": "copy" },
        { "pattern": "credentials.json", "action": "copy" },
        { "pattern": "node_modules", "action": "symlink" },
        { "pattern": ".cache", "action": "symlink" },
        { "pattern": "dist", "action": "ignore" },
        { "pattern": "build", "action": "ignore" }
      ],
      "includeUntracked": true
    }
  }
}
```

**File operation behavior**:
- **copy**: Files/directories are duplicated (isolation)
- **symlink**: Directories are symlinked (shared, space-efficient)
- **ignore**: Not copied or symlinked (excluded from worktree)

**Untracked files**: If `includeUntracked=true`, untracked files in parent that match copy rules are also copied (e.g., `.env.local`).

**Default rules** (if `rules=[]`): See `DEFAULT_FILE_RULES` in `contracts/config-schema.ts`.

---

## Implementation Checklist

### Phase 1: Configuration & Core (P1)
- [ ] Add Zod dependency to package.json
- [ ] Implement config schema (contracts/config-schema.ts)
- [ ] Implement config load/save functions (internal-api.ts)
- [ ] Implement `git worktree add` wrapper (internal-api.ts)
- [ ] Implement `git worktree remove` wrapper (internal-api.ts)
- [ ] Implement `git worktree list` wrapper (internal-api.ts)
- [ ] Implement `git worktree prune` wrapper (internal-api.ts)
- [ ] Add `--no-worktree` flag to /speck:specify
- [ ] Add `--no-worktree` flag to /speck:branch
- [ ] Test: Create worktree, verify it's at expected path

### Phase 2: File Operations (P2)
- [ ] Implement glob matching with Bun.Glob (internal-api.ts)
- [ ] Implement file copying logic (internal-api.ts)
- [ ] Implement symlink creation logic (internal-api.ts)
- [ ] Implement untracked file detection (git ls-files --others)
- [ ] Implement file rule application (applyFileRules)
- [ ] Test: Verify files copied/symlinked correctly

### Phase 3: IDE Launch (P2)
- [ ] Implement IDE detection (detectAvailableIDEs)
- [ ] Implement IDE launch for VSCode (launchIDE)
- [ ] Implement IDE launch for Cursor
- [ ] Implement IDE launch for JetBrains IDEs
- [ ] Add `--no-ide` flag to commands
- [ ] Test: Verify IDE opens with correct workspace

### Phase 4: Dependency Installation (P3)
- [ ] Implement package manager detection (detectPackageManager)
- [ ] Implement dependency installation with progress (installDependencies)
- [ ] Implement error interpretation (interpretInstallError)
- [ ] Block IDE launch until dependencies installed
- [ ] Add `--no-deps` flag to commands
- [ ] Test: Verify dependencies installed before IDE launch

### Phase 5: User Experience (P2)
- [ ] Implement interactive setup wizard (speck worktree init)
- [ ] Implement progress indicators for all steps
- [ ] Implement branch name approval prompt (FR-016)
- [ ] Implement error handling with actionable messages
- [ ] Add `--reuse-worktree` flag support (FR-013)
- [ ] Test: Complete end-to-end workflow

### Phase 6: Advanced Features (P3)
- [ ] Implement branch prefix support (FR-017)
- [ ] Implement config migration (migrateConfig)
- [ ] Add manual worktree commands (create/remove/list/prune)
- [ ] Add disk space checking
- [ ] Add Git version checking
- [ ] Test: All edge cases and error scenarios

---

## Testing Strategy

### Unit Tests
- Config validation (valid/invalid schemas)
- File matching (glob patterns)
- Package manager detection (lockfile presence)
- Branch name construction (with/without prefix)

### Integration Tests
- Worktree creation end-to-end
- File operations (copy/symlink)
- Dependency installation
- IDE launch
- Error scenarios (disk space, network, etc.)

### Manual Tests
- Interactive setup wizard
- Progress indicators
- Error messages
- IDE window opening
- Multiple worktrees simultaneously

---

## Troubleshooting Guide

### Issue: Worktree creation fails with "insufficient disk space"
**Cause**: Not enough space for worktree + dependencies
**Solution**:
1. Free up disk space
2. Use `--no-deps` to skip dependency installation
3. Configure symlinks for large directories (node_modules)

### Issue: IDE doesn't launch
**Cause**: IDE command not in PATH
**Solution**:
1. Install IDE and ensure CLI is available
2. For VSCode: Run "Shell Command: Install 'code' command in PATH"
3. For JetBrains: Use "Tools > Create Command-line Launcher..."
4. Disable auto-launch if IDE not needed

### Issue: Dependency installation fails
**Cause**: Network error, lockfile issue, etc.
**Solution**:
1. Check internet connection
2. Verify lockfile is up-to-date in main repo
3. Manually run package manager in worktree
4. Check error output for specific issue

### Issue: "Worktree directory already exists"
**Cause**: Previous worktree not cleaned up, or directory manually created
**Solution**:
1. Use `--reuse-worktree` to skip recreation
2. Use `--force` to remove and recreate
3. Manually delete directory and try again
4. Run `speck worktree prune` to cleanup stale references

### Issue: Files missing in worktree
**Cause**: File rules exclude them, or not tracked by Git
**Solution**:
1. Check `files.rules` in config - ensure files are set to "copy"
2. Enable `includeUntracked` for untracked files
3. Add custom rules for specific files/patterns

---

## Performance Considerations

### Worktree Creation Time
**Target**: < 30 seconds (excluding dependency installation)

**Breakdown**:
- Git worktree add: ~1-2s
- File copy (config files): ~1-3s
- Symlink creation: <1s
- Dependency installation: 5-120s (varies by package manager)
- IDE launch: 2-5s

### Optimization Tips
1. **Symlink large directories**: Use `{ pattern: "node_modules", action: "symlink" }` to save space and time
2. **Limit copied files**: Only copy necessary config files
3. **Use Bun for dependencies**: Bun is 6-15x faster than npm/yarn
4. **Parallel file operations**: Copy files concurrently (10 at a time)

### Disk Space Usage
- **Without symlinks**: Each worktree = full copy (~500MB-2GB per feature)
- **With symlinks**: Each worktree = config files only (~1-10MB per feature)

**Recommendation**: Symlink `node_modules` and `.cache` directories by default.

---

## Code Organization

### Recommended File Structure
```
src/worktree/                    # Or .speck/scripts/worktree/
├── config.ts                    # Config load/save/migrate
├── git.ts                       # Git worktree operations
├── files.ts                     # File copy/symlink logic
├── dependencies.ts              # Package manager detection/install
├── ide.ts                       # IDE detection/launch
├── workflows.ts                 # High-level workflows (createBranchWithWorktree)
└── validation.ts                # Validation helpers
```

### Import Dependencies
```typescript
// Core
import { z } from "zod";                    // Config validation
import { $ } from "bun";                    // Git/shell commands
import { Glob } from "bun";                 // File matching
import { existsSync } from "fs";            // File system checks
import { copyFile, mkdir, symlink } from "fs/promises"; // File operations
import { join, dirname } from "path";       // Path utilities

// Optional (for interactive setup)
import * as prompts from "@clack/prompts";  // CLI prompts
```

---

## Next Steps

1. **Review contracts**: Ensure all function signatures match requirements
2. **Start with Phase 1**: Get config and basic worktree creation working
3. **Iterate on phases**: Build features incrementally (P1 → P2 → P3)
4. **Test continuously**: Verify each phase before moving to next
5. **Document edge cases**: Update this guide as issues are discovered

**Questions?** Refer to:
- [spec.md](./spec.md) for full requirements
- [research.md](./research.md) for technical decisions
- [data-model.md](./data-model.md) for data structures
- [contracts/](./contracts/) for API interfaces
