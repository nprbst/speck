# Research: Worktree Integration

## Git Worktree Management

### Decision: Use Git CLI via Bun Shell API with automated pruning

### Rationale
- Git worktree commands are stable, well-documented, and available in Git 2.5+ (2015)
- Bun Shell API provides excellent subprocess management for executing git commands
- Programmatic creation, listing, and removal are straightforward through CLI
- Automatic pruning via `git worktree prune` handles stale references elegantly

### Alternatives Considered
1. **Third-party Git libraries** (e.g., isomorphic-git, simple-git)
   - Rejected: Adds unnecessary dependencies when native Git CLI is universally available
   - Git CLI is already a hard requirement for Speck

2. **Manual .git/worktrees directory manipulation**
   - Rejected: Fragile, error-prone, and bypasses Git's internal consistency checks

### Implementation Notes

#### Creating Worktrees
```typescript
import { $ } from "bun";

// Create worktree for new branch
await $`git worktree add ${worktreePath} -b ${branchName}`;

// Create worktree for existing branch
await $`git worktree add ${worktreePath} ${branchName}`;
```

#### Listing Worktrees
```typescript
// Get all worktrees with paths and branches
const output = await $`git worktree list --porcelain`.text();
// Parse output: lines starting with "worktree", "branch", "HEAD"
```

#### Removing Worktrees
```typescript
// Remove worktree (also deletes directory)
await $`git worktree remove ${worktreePath}`;

// Force removal if worktree has uncommitted changes
await $`git worktree remove ${worktreePath} --force`;
```

#### Cleanup and Pruning
```typescript
// Remove stale administrative files for deleted worktrees
await $`git worktree prune`;

// Can be run automatically before worktree creation to ensure clean state
// Git also auto-prunes during gc (controlled by gc.worktreePruneExpire config)
```

#### Directory Structure and Naming
- **Default location**: `.speck/worktrees/[branch-name]`
- **Naming convention**: Use branch name as directory name (last path component)
- **Organization**: Centralized in `.speck/worktrees/` keeps worktrees together and out of main workspace
- **Benefits**: Easy to find, doesn't clutter main repository, can be added to .gitignore globally

#### Best Practices
1. **Consistent naming**: Use branch name for worktree directory (e.g., `002-user-auth`)
2. **Limit active worktrees**: Only create for current active tasks
3. **Regular cleanup**: Run `git worktree prune` periodically to remove stale references
4. **Check before creation**: Use `git worktree list` to detect existing worktrees
5. **Error handling**: Parse Git error messages for common issues (disk space, invalid paths, etc.)

---

## IDE Launch Integration

### Decision: Multi-IDE support with VSCode as default, using command-line launchers

### Rationale
- VSCode has excellent cross-platform CLI support via `code` command
- Other popular IDEs (Cursor, JetBrains, etc.) also provide CLI launchers
- Command-line approach is simple, reliable, and doesn't require IDE-specific APIs
- New window vs. existing workspace is controllable via CLI flags

### Alternatives Considered
1. **IDE-specific APIs or extensions**
   - Rejected: Requires separate implementation for each IDE, fragile to IDE updates

2. **Desktop automation tools** (e.g., AppleScript on macOS)
   - Rejected: Platform-specific, unreliable, and overly complex

3. **Only support VSCode**
   - Rejected: Many developers use Cursor, JetBrains IDEs, or other editors

### Implementation Notes

#### VSCode CLI Setup
```typescript
// Cross-platform VSCode launch
import { $ } from "bun";

// Open new window with directory
await $`code -n ${worktreePath}`;

// Add to existing workspace (reuse window)
await $`code -r ${worktreePath}`;

// Check if code command is available
const hasVSCode = await $`which code`.nothrow().quiet().exitCode === 0;
```

**Platform-specific paths** (if `code` not in PATH):
- macOS: `/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code`
- Windows: `%LOCALAPPDATA%\Programs\Microsoft VS Code\bin\code.cmd`
- Linux: `/usr/share/code/bin/code` or `/usr/bin/code`

#### Cursor CLI Setup
```typescript
// Cursor uses similar interface to VSCode
await $`cursor -n ${worktreePath}`;

// Check availability
const hasCursor = await $`which cursor`.nothrow().quiet().exitCode === 0;
```

#### JetBrains CLI Setup
```typescript
// JetBrains IDEs have per-product launchers
await $`webstorm ${worktreePath}`;  // WebStorm
await $`idea ${worktreePath}`;      // IntelliJ IDEA
await $`pycharm ${worktreePath}`;   // PyCharm

// Check availability
const hasWebStorm = await $`which webstorm`.nothrow().quiet().exitCode === 0;
```

**JetBrains setup requirements**:
- Manual install: Use "Tools > Create Command-line Launcher..." in IDE
- Toolbox install: Configure in JetBrains Toolbox settings

#### IDE Detection Strategy
```typescript
interface IDEInfo {
  name: string;
  command: string;
  args: string[];
  available: boolean;
}

async function detectAvailableIDEs(): Promise<IDEInfo[]> {
  const ides = [
    { name: "VSCode", command: "code", args: ["-n"] },
    { name: "Cursor", command: "cursor", args: ["-n"] },
    { name: "WebStorm", command: "webstorm", args: [] },
    { name: "IntelliJ IDEA", command: "idea", args: [] },
  ];

  for (const ide of ides) {
    ide.available = await $`which ${ide.command}`.nothrow().quiet().exitCode === 0;
  }

  return ides.filter(ide => ide.available);
}
```

#### Configuration
Store user's IDE preference in `.speck/config.json`:
```json
{
  "worktree": {
    "ide": {
      "autoLaunch": true,
      "editor": "vscode",  // or "cursor", "webstorm", etc.
      "newWindow": true    // true = new window, false = add to workspace
    }
  }
}
```

#### Error Handling
- **IDE not found**: Provide clear message with installation instructions for selected IDE
- **Launch fails**: Catch subprocess errors and suggest checking IDE installation
- **Permission denied**: Suggest checking file permissions or running from different location

---

## Dependency Installation

### Decision: Detect package manager from lockfiles, use native package manager with stdio streaming

### Rationale
- Lockfile detection is reliable and matches what package managers themselves use
- Using native package managers ensures compatibility and leverages their optimizations
- Stdio streaming provides real-time progress feedback to users
- No need for additional dependencies when Bun Shell API handles subprocess I/O

### Alternatives Considered
1. **Use nypm (unified package manager)**
   - Considered: Provides nice unified API
   - Rejected: Adds dependency, doesn't provide significant benefit over direct CLI usage

2. **Always use Bun for installation**
   - Rejected: May cause lockfile drift if project uses different package manager
   - Better to match project's existing package manager

3. **Skip detection, require configuration**
   - Rejected: Poor developer experience, detection is reliable enough

### Implementation Notes

#### Package Manager Detection
```typescript
import { existsSync } from "fs";
import { join } from "path";

type PackageManager = "bun" | "pnpm" | "yarn" | "npm";

async function detectPackageManager(projectPath: string): Promise<PackageManager> {
  // Check for lockfiles in priority order (fastest to slowest)
  if (existsSync(join(projectPath, "bun.lockb"))) return "bun";
  if (existsSync(join(projectPath, "pnpm-lock.yaml"))) return "pnpm";
  if (existsSync(join(projectPath, "yarn.lock"))) return "yarn";
  if (existsSync(join(projectPath, "package-lock.json"))) return "npm";

  // Check package.json for packageManager field (npm 7.24+)
  const packageJsonPath = join(projectPath, "package.json");
  if (existsSync(packageJsonPath)) {
    const packageJson = await Bun.file(packageJsonPath).json();
    if (packageJson.packageManager) {
      const [pm] = packageJson.packageManager.split("@");
      return pm as PackageManager;
    }
  }

  // Default to npm (most compatible)
  return "npm";
}
```

#### Running Installation with Progress
```typescript
async function installDependencies(
  worktreePath: string,
  packageManager: PackageManager,
  onProgress: (line: string) => void
): Promise<{ success: boolean; error?: string }> {
  const commands: Record<PackageManager, string[]> = {
    bun: ["bun", "install"],
    pnpm: ["pnpm", "install", "--frozen-lockfile"],
    yarn: ["yarn", "install", "--frozen-lockfile"],
    npm: ["npm", "ci"], // ci is faster and respects lockfile
  };

  const args = commands[packageManager];

  try {
    const proc = Bun.spawn(args, {
      cwd: worktreePath,
      stdout: "pipe",
      stderr: "pipe",
    });

    // Stream output for progress feedback
    const reader = proc.stdout.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value);
      onProgress(text);
    }

    const exitCode = await proc.exited;

    if (exitCode !== 0) {
      const errorText = await new Response(proc.stderr).text();
      return { success: false, error: errorText };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
```

#### Performance Comparison (for reference)
Based on benchmarks for ~1.1k packages (Next.js app):
- **Bun**: ~8.6s (fastest)
- **pnpm**: ~31.9s
- **npm**: ~57.4s
- **Yarn**: ~138s

#### Error Handling
Common failure scenarios and handling:
1. **Network errors**: Display clear message, suggest checking internet connection
2. **Lockfile out of sync**: Suggest running package manager update in main repo
3. **Disk space**: Check available disk space before installation
4. **Permission errors**: Suggest checking directory permissions
5. **Invalid lockfile**: Suggest regenerating lockfile in main repo

```typescript
function interpretInstallError(error: string, pm: PackageManager): string {
  if (error.includes("ENOSPC")) {
    return "Insufficient disk space. Free up space and try again.";
  }
  if (error.includes("EACCES")) {
    return "Permission denied. Check directory permissions.";
  }
  if (error.includes("network") || error.includes("timeout")) {
    return "Network error. Check internet connection and try again.";
  }
  if (error.includes("lockfile")) {
    return `Lockfile issue. Try running '${pm} install' in main repository.`;
  }
  return `Installation failed: ${error}`;
}
```

---

## File Copy/Symlink Strategy

### Decision: Use Bun.Glob for pattern matching, copy by default, symlink large directories

### Rationale
- Bun.Glob is fast and built-in, no additional dependencies needed
- Glob patterns are familiar to developers (same as .gitignore)
- Copy-by-default ensures isolation and prevents accidental shared state
- Selective symlinking for large directories (node_modules) saves space and time
- TypeScript has known issues with symlinked node_modules, so copy may be safer

### Alternatives Considered
1. **Third-party glob libraries** (minimatch, fast-glob)
   - Rejected: Bun.Glob is faster and built-in

2. **Symlink-by-default**
   - Rejected: Can cause subtle issues with module resolution, build tools
   - Better to be conservative and copy unless explicitly configured

3. **Always copy everything**
   - Rejected: Wasteful for large dependency directories
   - node_modules can be 500MB-1GB per project

### Implementation Notes

#### Glob Pattern Matching with Bun
```typescript
import { Glob } from "bun";

async function matchFiles(
  basePath: string,
  patterns: string[]
): Promise<string[]> {
  const matches = new Set<string>();

  for (const pattern of patterns) {
    const glob = new Glob(pattern);

    for await (const file of glob.scan({
      cwd: basePath,
      dot: true, // Include dotfiles
    })) {
      matches.add(file);
    }
  }

  return Array.from(matches);
}
```

#### Copy Strategy
```typescript
import { copyFile, mkdir } from "fs/promises";
import { dirname, join } from "path";

async function copyFiles(
  sourcePath: string,
  destPath: string,
  patterns: string[]
): Promise<void> {
  const files = await matchFiles(sourcePath, patterns);

  for (const file of files) {
    const source = join(sourcePath, file);
    const dest = join(destPath, file);

    // Ensure parent directory exists
    await mkdir(dirname(dest), { recursive: true });

    // Copy file
    await copyFile(source, dest);
  }
}
```

#### Symlink Strategy
```typescript
import { symlink, mkdir } from "fs/promises";
import { dirname, join } from "path";
import { existsSync } from "fs";

async function symlinkDirectories(
  sourcePath: string,
  destPath: string,
  patterns: string[]
): Promise<void> {
  const dirs = await matchFiles(sourcePath, patterns);

  for (const dir of dirs) {
    const source = join(sourcePath, dir);
    const dest = join(destPath, dir);

    // Only symlink if source exists
    if (!existsSync(source)) continue;

    // Ensure parent directory exists
    await mkdir(dirname(dest), { recursive: true });

    // Create symlink (type: "dir" for directories)
    await symlink(source, dest, "dir");
  }
}
```

#### Handling Untracked Files
```typescript
import { $ } from "bun";

async function getUntrackedFiles(repoPath: string): Promise<string[]> {
  // Get untracked files from git
  const output = await $`git ls-files --others --exclude-standard`.cwd(repoPath).text();
  return output.trim().split("\n").filter(Boolean);
}

async function copyUntrackedFiles(
  sourcePath: string,
  destPath: string,
  patterns: string[]
): Promise<void> {
  const untrackedFiles = await getUntrackedFiles(sourcePath);

  // Filter untracked files by patterns
  const filesToCopy: string[] = [];
  for (const pattern of patterns) {
    const glob = new Glob(pattern);
    for (const file of untrackedFiles) {
      if (glob.match(file)) {
        filesToCopy.push(file);
      }
    }
  }

  // Copy matched untracked files
  for (const file of filesToCopy) {
    const source = join(sourcePath, file);
    const dest = join(destPath, file);
    await mkdir(dirname(dest), { recursive: true });
    await copyFile(source, dest);
  }
}
```

#### Default Configuration
```typescript
interface FileRule {
  pattern: string;
  action: "copy" | "symlink" | "ignore";
}

const DEFAULT_FILE_RULES: FileRule[] = [
  // Copy configuration files
  { pattern: ".env*", action: "copy" },
  { pattern: "*.config.js", action: "copy" },
  { pattern: "*.config.ts", action: "copy" },
  { pattern: "*.config.json", action: "copy" },
  { pattern: ".nvmrc", action: "copy" },
  { pattern: ".node-version", action: "copy" },

  // Symlink large dependency directories (if they exist)
  { pattern: "node_modules", action: "symlink" },
  { pattern: ".bun", action: "symlink" },
  { pattern: ".cache", action: "symlink" },

  // Ignore (don't copy or symlink)
  { pattern: ".git", action: "ignore" },
  { pattern: ".speck", action: "ignore" },
  { pattern: "dist", action: "ignore" },
  { pattern: "build", action: "ignore" },
];
```

#### Performance Considerations
- **Large directories**: Symlink instead of copy (saves 500MB-1GB+ for node_modules)
- **Small files**: Copy is fast and safer than symlinks
- **Parallel operations**: Use `Promise.all()` to copy multiple files concurrently
- **Glob optimization**: Combine patterns when possible to reduce scan passes

```typescript
// Efficient parallel copying
async function copyFilesParallel(
  sourcePath: string,
  destPath: string,
  files: string[]
): Promise<void> {
  const CONCURRENCY = 10; // Limit concurrent operations

  for (let i = 0; i < files.length; i += CONCURRENCY) {
    const batch = files.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(file =>
        copyFile(join(sourcePath, file), join(destPath, file))
      )
    );
  }
}
```

---

## Configuration Management

### Decision: Use Zod for schema validation with `.speck/config.json` storage

### Rationale
- Zod provides TypeScript-first validation with excellent type inference
- No separate JSON Schema file needed - schema and types are unified
- Excellent error messages for validation failures
- Zero-overhead type safety (compile-time types from runtime schema)
- Well-maintained and widely adopted in TypeScript ecosystem (38k+ stars)

### Alternatives Considered
1. **Ajv (JSON Schema validator)**
   - Considered: Industry standard, highly performant
   - Rejected: Requires separate JSON Schema definitions, less TypeScript-friendly

2. **TypeBox**
   - Considered: Good TypeScript integration
   - Rejected: Less popular, smaller ecosystem than Zod

3. **Manual validation**
   - Rejected: Error-prone, verbose, lacks type safety

### Implementation Notes

#### Schema Definition
```typescript
import { z } from "zod";

const FileRuleSchema = z.object({
  pattern: z.string(),
  action: z.enum(["copy", "symlink", "ignore"]),
});

const WorktreeConfigSchema = z.object({
  enabled: z.boolean().default(false),
  worktreePath: z.string().default(".speck/worktrees"),
  branchPrefix: z.string().optional(), // e.g., "specs/" for "specs/002-feature"

  ide: z.object({
    autoLaunch: z.boolean().default(false),
    editor: z.enum(["vscode", "cursor", "webstorm", "idea", "pycharm"]).default("vscode"),
    newWindow: z.boolean().default(true),
  }).default({}),

  dependencies: z.object({
    autoInstall: z.boolean().default(false),
    packageManager: z.enum(["npm", "yarn", "pnpm", "bun", "auto"]).default("auto"),
  }).default({}),

  files: z.object({
    rules: z.array(FileRuleSchema).default([]),
    includeUntracked: z.boolean().default(true),
  }).default({}),
});

const SpeckConfigSchema = z.object({
  version: z.string().default("1.0"),
  worktree: WorktreeConfigSchema.default({}),
});

// Infer TypeScript types from schema
type SpeckConfig = z.infer<typeof SpeckConfigSchema>;
type WorktreeConfig = z.infer<typeof WorktreeConfigSchema>;
type FileRule = z.infer<typeof FileRuleSchema>;
```

#### Loading and Validating Configuration
```typescript
import { existsSync } from "fs";
import { join } from "path";

async function loadConfig(repoPath: string): Promise<SpeckConfig> {
  const configPath = join(repoPath, ".speck", "config.json");

  // Use defaults if config doesn't exist
  if (!existsSync(configPath)) {
    return SpeckConfigSchema.parse({});
  }

  try {
    const configData = await Bun.file(configPath).json();
    const config = SpeckConfigSchema.parse(configData);
    return config;
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Format validation errors nicely
      const messages = error.errors.map(err =>
        `  - ${err.path.join(".")}: ${err.message}`
      ).join("\n");

      throw new Error(
        `Invalid configuration in .speck/config.json:\n${messages}`
      );
    }
    throw error;
  }
}
```

#### Saving Configuration
```typescript
import { mkdir, writeFile } from "fs/promises";
import { dirname } from "path";

async function saveConfig(
  repoPath: string,
  config: SpeckConfig
): Promise<void> {
  const configPath = join(repoPath, ".speck", "config.json");

  // Validate before saving
  const validated = SpeckConfigSchema.parse(config);

  // Ensure directory exists
  await mkdir(dirname(configPath), { recursive: true });

  // Write formatted JSON
  await writeFile(
    configPath,
    JSON.stringify(validated, null, 2) + "\n"
  );
}
```

#### Merging with Defaults
```typescript
function mergeWithDefaults(
  userConfig: Partial<SpeckConfig>
): SpeckConfig {
  // Zod's .parse() automatically applies defaults from schema
  return SpeckConfigSchema.parse(userConfig);
}
```

#### Configuration Migration
```typescript
async function migrateConfig(
  repoPath: string
): Promise<void> {
  const configPath = join(repoPath, ".speck", "config.json");

  if (!existsSync(configPath)) return;

  const configData = await Bun.file(configPath).json();

  // Check version and migrate if needed
  const currentVersion = configData.version || "0.0";

  if (currentVersion === "1.0") {
    // Already current version
    return;
  }

  // Perform migration
  let migrated = { ...configData };

  if (currentVersion < "1.0") {
    // Example: migrate old structure to new
    // migrated = migrateFrom0to1(migrated);
    migrated.version = "1.0";
  }

  // Validate and save
  const validated = SpeckConfigSchema.parse(migrated);
  await saveConfig(repoPath, validated);

  console.log(`Migrated config from v${currentVersion} to v${validated.version}`);
}
```

#### Interactive Configuration Setup
```typescript
async function interactiveSetup(repoPath: string): Promise<SpeckConfig> {
  // This would use a CLI prompt library (e.g., @clack/prompts)
  const config: SpeckConfig = {
    version: "1.0",
    worktree: {
      enabled: true, // from prompt
      worktreePath: ".speck/worktrees", // from prompt or default

      ide: {
        autoLaunch: true, // from prompt
        editor: "vscode", // from selection prompt
        newWindow: true, // from prompt
      },

      dependencies: {
        autoInstall: true, // from prompt
        packageManager: "auto", // from selection prompt
      },

      files: {
        rules: [], // use defaults or customize
        includeUntracked: true,
      },
    },
  };

  await saveConfig(repoPath, config);
  return config;
}
```

#### Example Configuration File
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

---

## Summary of Key Decisions

1. **Git Worktree**: Use native Git CLI via Bun Shell API with automated `git worktree prune`
2. **IDE Launch**: Multi-IDE support (VSCode, Cursor, JetBrains) via CLI launchers, VSCode as default
3. **Dependencies**: Auto-detect package manager from lockfiles, stream installation output for progress
4. **File Operations**: Bun.Glob for pattern matching, copy-by-default with selective symlinking
5. **Configuration**: Zod for schema validation, store in `.speck/config.json` with version migration support

All decisions align with Speck's constitution: TypeScript-first, Bun runtime, file-based storage, minimal dependencies.
