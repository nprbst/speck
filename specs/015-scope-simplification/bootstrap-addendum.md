# Bun Bootstrap Addendum

**Feature**: 015-scope-simplification
**Date**: 2025-11-29
**Status**: Implementation Reference
**Source**: CLI bootstrap wrapper research conversation

This addendum captures the self-removing Bun bootstrap pattern for the Speck CLI.

---

## 1. Design Goals

A cross-platform bash script for Mac/Linux/WSL that:
1. Wraps execution of the CLI entrypoint with Bun when installed
2. Provides helpful instructions if Bun is not installed
3. **Self-removes from the execution path** once Bun is found, eliminating overhead on subsequent runs

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
Create      Show platform-specific
.runner.sh  install instructions
    │         │
    ↓         ↓
Rewire      Exit with
symlink     helpful message
    │
    ↓
Exec entrypoint
(this time and forever after)
```

After setup, the `speck` symlink points to `.runner.sh`, bypassing `bootstrap.sh` entirely.

---

## 3. Implementation

### File: `src/cli/bootstrap.sh`

```bash
#!/bin/bash

# bootstrap.sh - Cross-platform Bun bootstrap wrapper
# On first run: checks for bun, guides installation, then rewires itself out
# After setup: symlink points directly to runner, zero overhead

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENTRYPOINT="${SCRIPT_DIR}/index.ts"
RUNNER_SCRIPT="${SCRIPT_DIR}/.runner.sh"

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

create_runner_script() {
    local bun_path="$1"

    cat > "$RUNNER_SCRIPT" << EOF
#!/bin/bash
exec "$bun_path" "$ENTRYPOINT" "\$@"
EOF
    chmod +x "$RUNNER_SCRIPT"
}

update_symlink() {
    local symlink_path="$1"

    # Only update if it's a symlink pointing to bootstrap.sh
    if [[ -L "$symlink_path" ]]; then
        local current_target=$(readlink "$symlink_path")
        if [[ "$current_target" == *"bootstrap.sh" ]]; then
            rm "$symlink_path"
            ln -s "$RUNNER_SCRIPT" "$symlink_path"
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

    # Create the direct runner script
    create_runner_script "$bun_path"

    # Try to update the symlink if we can find it
    local symlink_candidates=(
        "$HOME/.local/bin/speck"
        "/usr/local/bin/speck"
    )

    for symlink in "${symlink_candidates[@]}"; do
        if update_symlink "$symlink"; then
            echo "Updated symlink: $symlink → .runner.sh"
            echo "Future runs will execute directly via Bun (zero bootstrap overhead)."
            break
        fi
    done

    echo ""

    # Run the entrypoint this time
    exec "$bun_path" "$ENTRYPOINT" "$@"
}

main "$@"
```

### File: `src/cli/.runner.sh` (Generated)

After bootstrap runs successfully, it creates this minimal wrapper:

```bash
#!/bin/bash
exec "/path/to/bun" "/path/to/src/cli/index.ts" "$@"
```

This is what the symlink points to after setup - pure exec, no detection overhead.

---

## 4. Install Flow Update

### Before (Current Plan)

```
speck install → symlink ~/.local/bin/speck → src/cli/index.ts
```

### After (With Bootstrap)

```
speck install → symlink ~/.local/bin/speck → src/cli/bootstrap.sh
                                                    ↓ (first run)
                                              find_bun()
                                                    ↓ found
                                              create .runner.sh
                                              update symlink → .runner.sh
                                                    ↓ (subsequent runs)
                                              exec bun index.ts "$@"
```

---

## 5. Key Implementation Notes

1. **Platform Detection**: Distinguishes macOS, Linux, and WSL for appropriate install instructions

2. **Bun Location Search**: Checks in order:
   - `PATH` (via `command -v bun`)
   - `$HOME/.bun/bin/bun` (default bun install location)
   - `/usr/local/bin/bun` (manual install)
   - `/opt/homebrew/bin/bun` (Homebrew on Apple Silicon)

3. **Self-Removal Pattern**: The bootstrap rewires the symlink to point to `.runner.sh`, which is a minimal exec wrapper with no detection logic

4. **Idempotency**: Running bootstrap multiple times is safe - it will recreate `.runner.sh` and update the symlink

5. **Entrypoint**: Uses `index.ts` directly (Bun can execute TypeScript natively, no compilation needed)

---

## 6. Graceful Degradation

| Scenario | Behavior |
|----------|----------|
| Bun not installed | Show platform-specific instructions, exit 1 |
| Bun installed but not in PATH | Find in common locations, proceed |
| Symlink not found/not writable | Bootstrap works, symlink not updated (still overhead) |
| `.runner.sh` creation fails | Bootstrap still execs bun directly this time |

---

## 7. Testing Strategy

### Unit Tests (`tests/unit/bootstrap.test.ts`)

1. **Platform detection**: Mock `/proc/version` for WSL detection
2. **Bun finding**: Test each search location
3. **Runner script generation**: Verify correct paths embedded

### Integration Tests (`tests/integration/bootstrap.test.ts`)

1. **Full flow**: Simulate first run → verify `.runner.sh` created
2. **Symlink update**: Verify symlink rewiring works
3. **Subsequent runs**: Verify bootstrap.sh is bypassed

---

## 8. References

- Spec: [spec.md](./spec.md) - FR-019a through FR-019e
- Plan: [plan.md](./plan.md) - Phase 6 install flow
- Tasks: [tasks.md](./tasks.md) - T058a through T058h
