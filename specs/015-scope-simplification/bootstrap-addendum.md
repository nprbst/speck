# Bun Bootstrap Addendum

**Feature**: 015-scope-simplification
**Date**: 2025-11-29
**Status**: Implementation Reference
**Source**: CLI bootstrap wrapper research conversation

This addendum captures the self-removing Bun bootstrap pattern for the Speck CLI.

---

## 1. Design Goals

A cross-platform bash script for Mac/Linux/WSL that:
1. Provides helpful instructions if Bun is not installed
2. **Self-removes from the execution path** once Bun is found, eliminating overhead on subsequent runs
3. Leverages `#!/usr/bin/env bun` shebang in `index.ts` for direct execution

---

## 2. Bootstrap Flow

```
User runs `speck` (symlink → bootstrap.sh)
         ↓
    Check for Bun
         ↓
    ┌────┴────┐
    │         │
  Found    Not Found
    │         │
    ↓         ↓
Rewire      Show platform-specific
symlink     install instructions
to index.ts     │
    │         ↓
    ↓      Exit with
Exec       helpful message
entrypoint
(this time and forever after)
```

After setup, the `speck` symlink points directly to `index.ts`, bypassing `bootstrap.sh` entirely. The shebang `#!/usr/bin/env bun` handles execution.

---

## 3. Implementation

### File: `src/cli/bootstrap.sh`

```bash
#!/bin/bash

# bootstrap.sh - Cross-platform Bun bootstrap wrapper
# On first run: checks for bun, guides installation, then rewires itself out
# After setup: symlink points directly to index.ts, zero overhead

set -e

# Resolve the actual script path (follow symlinks)
SOURCE="${BASH_SOURCE[0]}"
while [[ -L "$SOURCE" ]]; do
    DIR="$(cd -P "$(dirname "$SOURCE")" && pwd)"
    SOURCE="$(readlink "$SOURCE")"
    [[ "$SOURCE" != /* ]] && SOURCE="$DIR/$SOURCE"
done
SCRIPT_DIR="$(cd -P "$(dirname "$SOURCE")" && pwd)"

ENTRYPOINT="${SCRIPT_DIR}/index.ts"

# Detect OS for install instructions
detect_platform() {
    case "$(uname -s)" in
        Darwin*)  echo "macos" ;;
        Linux*)
            if grep -qi microsoft /proc/version 2>/dev/null; then
                echo "wsl"
            else
                echo "linux"
            fi
            ;;
        *)        echo "unknown" ;;
    esac
}

install_instructions() {
    local platform=$(detect_platform)

    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  Bun is not installed"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Install with:"
    echo ""
    echo "  curl -fsSL https://bun.sh/install | bash"
    echo ""

    case "$platform" in
        macos)
            echo "Or via Homebrew:"
            echo ""
            echo "  brew install oven-sh/bun/bun"
            echo ""
            ;;
        wsl)
            echo "Note: You're running in WSL. After installing, you may need to"
            echo "restart your terminal or run: source ~/.bashrc"
            echo ""
            ;;
    esac

    echo "After installing, run this command again to complete setup."
    echo ""
}

find_bun() {
    # Check common locations in order of preference
    local bun_paths=(
        "$HOME/.bun/bin/bun"
        "/usr/local/bin/bun"
        "/opt/homebrew/bin/bun"
    )

    # First check if it's in PATH
    if command -v bun &>/dev/null; then
        command -v bun
        return 0
    fi

    # Check common install locations
    for path in "${bun_paths[@]}"; do
        if [[ -x "$path" ]]; then
            echo "$path"
            return 0
        fi
    done

    return 1
}

update_symlink() {
    local symlink_path="$1"

    # Only update if it's a symlink pointing to bootstrap.sh
    if [[ -L "$symlink_path" ]]; then
        local current_target=$(readlink "$symlink_path")
        if [[ "$current_target" == *"bootstrap.sh" ]]; then
            rm "$symlink_path"
            # Point directly to index.ts - shebang handles execution
            ln -s "$ENTRYPOINT" "$symlink_path"
            return 0
        fi
    fi
    return 1
}

main() {
    local bun_path

    if ! bun_path=$(find_bun); then
        install_instructions
        exit 1
    fi

    echo "Found Bun at: $bun_path"

    # Try to update the symlink to point directly to index.ts
    local symlink_candidates=(
        "$HOME/.local/bin/speck"
        "/usr/local/bin/speck"
    )

    for symlink in "${symlink_candidates[@]}"; do
        if update_symlink "$symlink"; then
            echo "Updated symlink: $symlink → index.ts"
            echo "Future runs will execute directly (zero bootstrap overhead)."
            break
        fi
    done

    echo ""

    # Run the entrypoint this time
    exec "$bun_path" "$ENTRYPOINT" "$@"
}

main "$@"
```

---

## 4. Install Flow

```
speck init → symlink ~/.local/bin/speck → src/cli/bootstrap.sh
                                                ↓ (first run)
                                          find_bun()
                                                ↓ found
                                          update symlink → index.ts
                                                ↓ (subsequent runs)
                                          direct exec via shebang
```

---

## 5. Key Implementation Notes

1. **Platform Detection**: Distinguishes macOS, Linux, and WSL for appropriate install instructions

2. **Bun Location Search**: Checks in order:
   - `PATH` (via `command -v bun`)
   - `$HOME/.bun/bin/bun` (default bun install location)
   - `/usr/local/bin/bun` (manual install)
   - `/opt/homebrew/bin/bun` (Homebrew on Apple Silicon)

3. **Self-Removal Pattern**: The bootstrap rewires the symlink to point directly to `index.ts`, which has `#!/usr/bin/env bun` shebang for direct execution

4. **Idempotency**: Running bootstrap multiple times is safe - it will update the symlink each time

5. **Entrypoint**: Uses `index.ts` directly (Bun can execute TypeScript natively via shebang)

---

## 6. Graceful Degradation

| Scenario | Behavior |
|----------|----------|
| Bun not installed | Show platform-specific instructions, exit 1 |
| Bun installed but not in PATH | Find in common locations, proceed |
| Symlink not found/not writable | Bootstrap works, symlink not updated (still overhead) |

---

## 7. Testing Strategy

### Unit Tests (`tests/unit/bootstrap.test.ts`)

1. **Platform detection**: Mock `/proc/version` for WSL detection
2. **Bun finding**: Test each search location

### Integration Tests (`tests/integration/init.test.ts`)

1. **Full flow**: Simulate first run → verify symlink updated
2. **Symlink update**: Verify symlink rewiring works
3. **Subsequent runs**: Verify bootstrap.sh is bypassed

---

## 8. References

- Spec: [spec.md](./spec.md) - FR-020a through FR-020e
- Plan: [plan.md](./plan.md) - Phase 6 install flow
- Tasks: [tasks.md](./tasks.md) - T058 through T058f
