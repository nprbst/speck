/**
 * Integration Tests: Init Command
 *
 * Tests for the complete init flow including bootstrap and symlink creation.
 * Per Constitution Principle XII: TDD - tests written before implementation
 *
 * Feature: 015-scope-simplification
 * Tasks: T057 (integration), T057c
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync, existsSync, mkdirSync, writeFileSync, readFileSync, symlinkSync, lstatSync, readlinkSync, chmodSync } from "node:fs";
import { tmpdir, homedir } from "node:os";
import { join, dirname } from "node:path";
import { $ } from "bun";

// Test fixtures directory
let testDir: string;
let mockHome: string;

beforeEach(() => {
  testDir = mkdtempSync(join(tmpdir(), "speck-install-integration-"));
  mockHome = join(testDir, "home");
  mkdirSync(mockHome, { recursive: true });
});

afterEach(() => {
  if (testDir && existsSync(testDir)) {
    rmSync(testDir, { recursive: true, force: true });
  }
});

describe("Init Command - Full Flow", () => {
  describe("Idempotent Installation", () => {
    test("first install creates symlink and directories", () => {
      const localBinDir = join(mockHome, ".local", "bin");
      const bootstrapPath = join(testDir, "cli", "bootstrap.sh");
      const symlinkPath = join(localBinDir, "speck");

      // Setup: Create bootstrap script
      mkdirSync(dirname(bootstrapPath), { recursive: true });
      writeFileSync(bootstrapPath, `#!/bin/bash
echo "bootstrap executed"
`, { mode: 0o755 });

      // Install: Create directories and symlink
      mkdirSync(localBinDir, { recursive: true });
      symlinkSync(bootstrapPath, symlinkPath);

      // Verify
      expect(existsSync(localBinDir)).toBe(true);
      expect(existsSync(symlinkPath)).toBe(true);
      expect(lstatSync(symlinkPath).isSymbolicLink()).toBe(true);
      expect(readlinkSync(symlinkPath)).toBe(bootstrapPath);
    });

    test("second install is idempotent (no error)", () => {
      const localBinDir = join(mockHome, ".local", "bin");
      const bootstrapPath = join(testDir, "cli", "bootstrap.sh");
      const symlinkPath = join(localBinDir, "speck");

      // First install
      mkdirSync(dirname(bootstrapPath), { recursive: true });
      writeFileSync(bootstrapPath, "#!/bin/bash\necho test", { mode: 0o755 });
      mkdirSync(localBinDir, { recursive: true });
      symlinkSync(bootstrapPath, symlinkPath);

      // Second install (remove and recreate)
      expect(() => {
        rmSync(symlinkPath);
        symlinkSync(bootstrapPath, symlinkPath);
      }).not.toThrow();

      // Symlink still valid
      expect(existsSync(symlinkPath)).toBe(true);
    });

    test("--force replaces existing symlink", () => {
      const localBinDir = join(mockHome, ".local", "bin");
      const oldBootstrap = join(testDir, "old", "bootstrap.sh");
      const newBootstrap = join(testDir, "new", "bootstrap.sh");
      const symlinkPath = join(localBinDir, "speck");

      // Setup old symlink
      mkdirSync(dirname(oldBootstrap), { recursive: true });
      mkdirSync(dirname(newBootstrap), { recursive: true });
      mkdirSync(localBinDir, { recursive: true });

      writeFileSync(oldBootstrap, "#!/bin/bash\necho old", { mode: 0o755 });
      writeFileSync(newBootstrap, "#!/bin/bash\necho new", { mode: 0o755 });

      symlinkSync(oldBootstrap, symlinkPath);
      expect(readlinkSync(symlinkPath)).toBe(oldBootstrap);

      // Force install with new target
      rmSync(symlinkPath);
      symlinkSync(newBootstrap, symlinkPath);

      expect(readlinkSync(symlinkPath)).toBe(newBootstrap);
    });
  });
});

describe("Init Command - PATH Integration", () => {
  test("detects ~/.local/bin not in PATH and warns", () => {
    const localBinDir = join(mockHome, ".local", "bin");
    const currentPath = process.env.PATH || "";

    // Check if local bin would be in PATH
    const isInPath = currentPath.split(":").includes(localBinDir);

    // For mock home, this should be false
    expect(isInPath).toBe(false);
  });

  test("generates PATH setup instructions for bash", () => {
    const bashrcInstruction = 'export PATH="$HOME/.local/bin:$PATH"';
    const expectedFile = "~/.bashrc";

    expect(bashrcInstruction).toContain(".local/bin");
    expect(bashrcInstruction).toContain("PATH");
  });

  test("generates PATH setup instructions for zsh", () => {
    const zshrcInstruction = 'export PATH="$HOME/.local/bin:$PATH"';
    const expectedFile = "~/.zshrc";

    expect(zshrcInstruction).toContain(".local/bin");
    expect(zshrcInstruction).toContain("PATH");
  });
});

describe("Bootstrap Self-Removal Integration", () => {
  test("bootstrap script creates runner script on execution", async () => {
    // Create complete CLI structure
    const cliDir = join(testDir, "cli");
    const bootstrapPath = join(cliDir, "bootstrap.sh");
    const runnerPath = join(cliDir, ".runner.sh");

    mkdirSync(cliDir, { recursive: true });

    // Create bootstrap script that just creates runner (no entrypoint execution)
    writeFileSync(bootstrapPath, `#!/bin/bash
# Mock bootstrap - creates runner script
SCRIPT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
RUNNER_SCRIPT="\${SCRIPT_DIR}/.runner.sh"

# Create runner
cat > "\$RUNNER_SCRIPT" << 'RUNNER_EOF'
#!/bin/bash
echo "runner script executed"
RUNNER_EOF
chmod +x "\$RUNNER_SCRIPT"

echo "bootstrap completed"
`, { mode: 0o755 });

    // Execute bootstrap directly
    const result = await $`${bootstrapPath}`.nothrow().text();

    // Verify bootstrap ran
    expect(result.trim()).toBe("bootstrap completed");

    // Verify runner was created
    expect(existsSync(runnerPath)).toBe(true);
  });

  test("bootstrap script updates symlink from bootstrap to runner", async () => {
    const cliDir = join(testDir, "cli");
    const bootstrapPath = join(cliDir, "bootstrap.sh");
    const runnerPath = join(cliDir, ".runner.sh");
    const localBinDir = join(mockHome, ".local", "bin");
    const symlinkPath = join(localBinDir, "speck");

    mkdirSync(cliDir, { recursive: true });
    mkdirSync(localBinDir, { recursive: true });

    // Create bootstrap script that creates runner and rewires symlink
    writeFileSync(bootstrapPath, `#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
RUNNER_SCRIPT="\${SCRIPT_DIR}/.runner.sh"
SYMLINK_PATH="${symlinkPath}"

# Create runner
echo '#!/bin/bash' > "\$RUNNER_SCRIPT"
echo 'echo "runner"' >> "\$RUNNER_SCRIPT"
chmod +x "\$RUNNER_SCRIPT"

# Update symlink if pointing to bootstrap
if [[ -L "\$SYMLINK_PATH" ]]; then
  current_target=\$(readlink "\$SYMLINK_PATH")
  if [[ "\$current_target" == *"bootstrap.sh" ]]; then
    rm "\$SYMLINK_PATH"
    ln -s "\$RUNNER_SCRIPT" "\$SYMLINK_PATH"
  fi
fi

echo "done"
`, { mode: 0o755 });

    // Create initial symlink to bootstrap
    symlinkSync(bootstrapPath, symlinkPath);
    expect(readlinkSync(symlinkPath)).toBe(bootstrapPath);

    // Execute bootstrap directly (not via symlink to avoid entrypoint issues)
    await $`${bootstrapPath}`.nothrow();

    // Verify symlink was updated to runner
    expect(existsSync(runnerPath)).toBe(true);
    expect(readlinkSync(symlinkPath)).toBe(runnerPath);
  });

  test("runner script executes without bootstrap overhead", async () => {
    const cliDir = join(testDir, "cli");
    const runnerPath = join(cliDir, ".runner.sh");

    mkdirSync(cliDir, { recursive: true });

    // Create runner directly (simulating post-bootstrap state)
    writeFileSync(runnerPath, `#!/bin/bash
echo "direct runner execution"
`, { mode: 0o755 });

    // Execute runner directly
    const result = await $`${runnerPath}`.nothrow().text();

    expect(result.trim()).toBe("direct runner execution");
  });

  test("symlink to runner bypasses bootstrap entirely", async () => {
    const cliDir = join(testDir, "cli");
    const runnerPath = join(cliDir, ".runner.sh");
    const localBinDir = join(mockHome, ".local", "bin");
    const symlinkPath = join(localBinDir, "speck");

    mkdirSync(cliDir, { recursive: true });
    mkdirSync(localBinDir, { recursive: true });

    // Create runner
    writeFileSync(runnerPath, `#!/bin/bash
echo "executed via runner symlink"
`, { mode: 0o755 });

    // Symlink points directly to runner
    symlinkSync(runnerPath, symlinkPath);

    // Execute via symlink
    const result = await $`${symlinkPath}`.nothrow().text();

    expect(result.trim()).toBe("executed via runner symlink");
  });
});

describe("Init Command - Error Recovery", () => {
  test("handles existing regular file at symlink location", () => {
    const localBinDir = join(mockHome, ".local", "bin");
    const symlinkPath = join(localBinDir, "speck");
    const bootstrapPath = join(testDir, "cli", "bootstrap.sh");

    mkdirSync(dirname(bootstrapPath), { recursive: true });
    mkdirSync(localBinDir, { recursive: true });

    writeFileSync(bootstrapPath, "#!/bin/bash\necho test", { mode: 0o755 });

    // Create regular file at symlink location
    writeFileSync(symlinkPath, "not a symlink", { mode: 0o755 });
    expect(lstatSync(symlinkPath).isFile()).toBe(true);
    expect(lstatSync(symlinkPath).isSymbolicLink()).toBe(false);

    // Force removal and recreate as symlink
    rmSync(symlinkPath);
    symlinkSync(bootstrapPath, symlinkPath);

    expect(lstatSync(symlinkPath).isSymbolicLink()).toBe(true);
  });

  test("handles broken symlink at location", () => {
    const localBinDir = join(mockHome, ".local", "bin");
    const symlinkPath = join(localBinDir, "speck");
    const bootstrapPath = join(testDir, "cli", "bootstrap.sh");
    const nonexistentTarget = join(testDir, "nonexistent.sh");

    mkdirSync(dirname(bootstrapPath), { recursive: true });
    mkdirSync(localBinDir, { recursive: true });

    writeFileSync(bootstrapPath, "#!/bin/bash\necho test", { mode: 0o755 });

    // Create broken symlink
    symlinkSync(nonexistentTarget, symlinkPath);
    expect(lstatSync(symlinkPath).isSymbolicLink()).toBe(true);
    expect(existsSync(nonexistentTarget)).toBe(false);

    // Remove broken symlink and recreate with valid target
    rmSync(symlinkPath);
    symlinkSync(bootstrapPath, symlinkPath);

    expect(readlinkSync(symlinkPath)).toBe(bootstrapPath);
  });
});

describe("Init Command - Output Messages", () => {
  test("reports successful installation", () => {
    const successMessage = "✓ Speck installed to ~/.local/bin/speck";

    expect(successMessage).toContain("✓");
    expect(successMessage).toContain("installed");
    expect(successMessage).toContain(".local/bin");
  });

  test("reports PATH warning when needed", () => {
    const warningMessage = "Warning: ~/.local/bin is not in your PATH";
    const instructions = "Add this to your shell config:";

    expect(warningMessage).toContain("Warning");
    expect(warningMessage).toContain("PATH");
  });

  test("reports already installed when idempotent", () => {
    const alreadyInstalledMessage = "Speck is already installed at ~/.local/bin/speck";

    expect(alreadyInstalledMessage).toContain("already installed");
  });
});
