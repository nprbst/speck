# Agent: Transform Bash to Bun TypeScript

**Purpose**: Analyze bash scripts from upstream spec-kit releases and generate functionally equivalent Bun TypeScript implementations that maintain 100% CLI interface compatibility.

**Invoked by**: `/speck.transform-upstream` command

**Input**: Path to bash script(s) in `upstream/<version>/scripts/bash/` directory

**Output**: Bun TypeScript implementation(s) in `.speck/scripts/` directory with transformation rationale

---

## Transformation Strategy

Follow this priority order when choosing transformation approach:

### 1. Pure TypeScript (PREFERRED)

Use native TypeScript/JavaScript for:
- File I/O operations (`Bun.file()`, `Bun.write()`)
- JSON parsing and generation (`JSON.parse()`, `JSON.stringify()`)
- String manipulation (native JS string methods)
- Path operations (`import path from "node:path"`)
- Environment variable access (`process.env`)
- CLI argument parsing (manual or simple library)

**Example**:
```bash
# Bash
VERSION=$(cat version.json | jq -r '.version')
```

```typescript
// TypeScript
const versionData = await Bun.file("version.json").json();
const version = versionData.version;
```

### 2. Bun Shell API (for shell-like constructs)

Use `import { $ } from "bun"` for:
- Pipelines (`|`)
- Command chaining (`&&`, `||`)
- Output redirection
- Process substitution
- When bash script heavily uses shell features

**Example**:
```bash
# Bash
find . -name "*.md" | wc -l
```

```typescript
// Bun Shell
import { $ } from "bun";
const count = await $`find . -name "*.md" | wc -l`.text();
```

### 3. Bun.spawn() (LAST RESORT)

Use `Bun.spawn()` only for:
- Complex bash-specific constructs that can't be reimplemented
- Legacy bash functions with complex state
- When bash script sources other bash scripts with circular dependencies

**Example**:
```typescript
// Bun.spawn()
const proc = Bun.spawn(["bash", "-c", "source .env && complex_bash_function"], {
  cwd: "/path",
  env: process.env,
  stdout: "pipe"
});
const output = await new Response(proc.stdout).text();
```

---

## CLI Interface Compatibility Requirements

**CRITICAL**: The generated TypeScript implementation MUST maintain byte-for-byte compatibility with the bash script's CLI interface.

### Exit Codes

Match exit codes exactly:
- **0**: Success
- **1**: User error (invalid arguments, invalid input)
- **2**: System error (network failure, filesystem error, external tool missing)

```typescript
// Example exit code handling
if (invalidVersion) {
  console.error("ERROR: Invalid version format");
  process.exit(1);  // User error
}

if (networkError) {
  console.error("ERROR: GitHub API request failed");
  process.exit(2);  // System error
}

console.log(JSON.stringify(result));
process.exit(0);  // Success
```

### CLI Flags

Parse and handle ALL flags from the bash script:

```typescript
// Example flag parsing
interface CliOptions {
  json?: boolean;
  help?: boolean;
  version?: boolean;
  requireTasks?: boolean;
  includeTasks?: boolean;
  pathsOnly?: boolean;
}

function parseArgs(args: string[]): CliOptions {
  return {
    json: args.includes("--json"),
    help: args.includes("--help") || args.includes("-h"),
    version: args.includes("--version"),
    requireTasks: args.includes("--require-tasks"),
    includeTasks: args.includes("--include-tasks"),
    pathsOnly: args.includes("--paths-only"),
  };
}
```

### JSON Output Structure

When `--json` flag is used, output MUST match the bash script's JSON structure exactly:

```typescript
// Example: Ensure JSON keys, types, and structure match bash output
interface CheckUpstreamOutput {
  releases: Array<{
    version: string;
    date: string;
    summary: string;
  }>;
}

// Output JSON to stdout
console.log(JSON.stringify(output));
```

### Error Messages

Preserve error message wording and formatting from bash script:

```bash
# Bash
echo "ERROR: Unknown option '$arg'. Use --help for usage information." >&2
exit 1
```

```typescript
// TypeScript
console.error(`ERROR: Unknown option '${arg}'. Use --help for usage information.`);
process.exit(1);
```

---

## Extension Marker Preservation

**CRITICAL**: If the bash script contains `[SPECK-EXTENSION:START]` and `[SPECK-EXTENSION:END]` markers, you MUST:

1. **Detect markers** in the source bash script
2. **Preserve content** between markers in the generated TypeScript
3. **Adapt syntax** to TypeScript while maintaining functionality
4. **Document** what was preserved and why

**Example**:
```bash
# Bash script with extension
echo "Upstream functionality"

# [SPECK-EXTENSION:START]
# Speck-specific: Additional validation for feature naming
if [[ ! "$FEATURE_NAME" =~ ^[0-9]{3}- ]]; then
  echo "ERROR: Feature name must start with ###-" >&2
  exit 1
fi
# [SPECK-EXTENSION:END]

echo "Continue upstream functionality"
```

```typescript
// TypeScript with preserved extension
console.log("Upstream functionality");

// [SPECK-EXTENSION:START]
// Speck-specific: Additional validation for feature naming
if (!/^[0-9]{3}-/.test(featureName)) {
  console.error("ERROR: Feature name must start with ###-");
  process.exit(1);
}
// [SPECK-EXTENSION:END]

console.log("Continue upstream functionality");
```

---

## Common Transformation Patterns

### Pattern 1: File Existence Checks

```bash
# Bash
if [ -f "$FILE" ]; then
  echo "File exists"
fi
```

```typescript
// TypeScript
import { existsSync } from "node:fs";
if (existsSync(file)) {
  console.log("File exists");
}
```

### Pattern 2: Read File Content

```bash
# Bash
CONTENT=$(cat file.txt)
```

```typescript
// TypeScript
const content = await Bun.file("file.txt").text();
```

### Pattern 3: Write File Content

```bash
# Bash
echo "content" > file.txt
```

```typescript
// TypeScript
await Bun.write("file.txt", "content");
```

### Pattern 4: JSON Manipulation

```bash
# Bash (using jq)
VERSION=$(cat package.json | jq -r '.version')
echo "{\"version\":\"$VERSION\"}" > output.json
```

```typescript
// TypeScript
const pkg = await Bun.file("package.json").json();
const version = pkg.version;
await Bun.write("output.json", JSON.stringify({ version }));
```

### Pattern 5: Command Execution

```bash
# Bash
git rev-parse --git-dir 2>/dev/null && echo "GIT_REPO" || echo "NOT_GIT_REPO"
```

```typescript
// TypeScript
import { $ } from "bun";
try {
  await $`git rev-parse --git-dir`.quiet();
  console.log("GIT_REPO");
} catch {
  console.log("NOT_GIT_REPO");
}
```

### Pattern 6: Directory Creation

```bash
# Bash
mkdir -p "$DIR"
```

```typescript
// TypeScript
import { mkdirSync } from "node:fs";
mkdirSync(dir, { recursive: true });
```

### Pattern 7: Symlink Creation

```bash
# Bash
ln -sf "$TARGET" "$LINK"
```

```typescript
// TypeScript
import { symlinkSync, existsSync, unlinkSync } from "node:fs";
if (existsSync(link)) {
  unlinkSync(link);
}
symlinkSync(target, link);
```

---

## Transformation Workflow

### Step 1: Analyze Bash Script

1. **Identify CLI interface**: Flags, arguments, exit codes
2. **Map dependencies**: External commands (git, jq, curl), sourced files (common.sh)
3. **Detect extension markers**: `[SPECK-EXTENSION:START/END]`
4. **Categorize operations**: File I/O, process execution, JSON manipulation, string processing

### Step 2: Choose Transformation Strategy

For each operation in the bash script:
- Can it be pure TypeScript? → Use native TypeScript
- Does it need shell-like syntax? → Use Bun Shell API
- Is it bash-specific and complex? → Use Bun.spawn() (document why)

### Step 3: Generate TypeScript Implementation

1. **Create file** in `.speck/scripts/` with same base name (e.g., `check-prerequisites.sh` → `check-prerequisites.ts`)
2. **Add header comment** documenting transformation rationale
3. **Import dependencies** (Bun APIs, Node.js modules)
4. **Implement CLI parsing** (flags, arguments, help text)
5. **Implement core logic** using chosen transformation strategy
6. **Preserve extension markers** with adapted syntax
7. **Add error handling** with proper exit codes
8. **Format output** (JSON mode, human-readable mode)

### Step 4: Validate Compatibility

1. **Document CLI interface** in header comment: flags, exit codes, JSON schema
2. **Preserve help text** from bash script (same wording, formatting)
3. **Match error messages** exactly (same wording, stderr vs stdout)
4. **Verify exit codes** match bash behavior

---

## Output Format

Generate a TypeScript file with this structure:

```typescript
/**
 * Bun TypeScript implementation of check-prerequisites.sh
 *
 * Transformation Date: 2025-11-15
 * Source: upstream/v1.0.0/scripts/bash/check-prerequisites.sh
 * Strategy: Pure TypeScript (file I/O, JSON parsing) + Bun Shell API (git commands)
 *
 * CLI Interface:
 * - Flags: --json, --require-tasks, --include-tasks, --paths-only, --help
 * - Exit Codes: 0 (success), 1 (user error), 2 (system error)
 * - JSON Output: { FEATURE_DIR: string, AVAILABLE_DOCS: string[] }
 *
 * Transformation Rationale:
 * - Replaced bash file existence checks with Node.js fs.existsSync()
 * - Replaced jq JSON parsing with native JSON.parse()
 * - Preserved git commands using Bun Shell API for compatibility
 * - Preserved [SPECK-EXTENSION] blocks with adapted TypeScript syntax
 */

import { existsSync } from "node:fs";
import { $ } from "bun";

// Type definitions
interface CheckPrerequisitesOutput {
  FEATURE_DIR: string;
  AVAILABLE_DOCS: string[];
}

// CLI parsing
function parseArgs(args: string[]): CliOptions {
  // ...
}

// Main function
async function main(args: string[]): Promise<number> {
  const options = parseArgs(args);

  if (options.help) {
    printHelp();
    return 0;
  }

  // Implementation...

  if (options.json) {
    console.log(JSON.stringify(output));
  } else {
    printHumanReadable(output);
  }

  return 0;
}

// Entry point
const exitCode = await main(process.argv.slice(2));
process.exit(exitCode);
```

---

## Transformation Report

After transformation, generate a markdown report summarizing:

1. **Source file**: Path to bash script in `upstream/<version>/`
2. **Output file**: Path to generated TypeScript in `.speck/scripts/`
3. **Strategy used**: Pure TypeScript / Bun Shell API / Bun.spawn() breakdown
4. **CLI compatibility**: Flags, exit codes, JSON schema preserved
5. **Extensions preserved**: List of `[SPECK-EXTENSION]` blocks maintained
6. **Rationale**: Why this transformation approach was chosen
7. **Testing recommendations**: Which contract tests to write

**Example Report Section**:
```markdown
## check-prerequisites.ts

**Source**: `upstream/v1.0.0/scripts/bash/check-prerequisites.sh`
**Output**: `.speck/scripts/check-prerequisites.ts`
**Strategy**: 70% Pure TypeScript, 20% Bun Shell API, 10% sourced common functions

**Transformations**:
- Bash file checks (`[ -f ]`) → Node.js `existsSync()`
- jq JSON parsing → Native `JSON.parse()`
- Git commands → Bun Shell API (`$\`git ...\``)
- Bash functions from common.sh → TypeScript imports from `common/utils.ts`

**CLI Compatibility**:
- ✅ All flags preserved: --json, --require-tasks, --include-tasks, --paths-only, --help
- ✅ Exit codes match: 0 (success), 1 (invalid args), 2 (missing files)
- ✅ JSON output structure identical to bash version

**Extensions Preserved**: None found

**Testing Priority**: HIGH - This is a core prerequisite checker used by all commands
```

---

## Error Handling

### Conflicting Extension Markers

If upstream changes overlap with `[SPECK-EXTENSION]` blocks:

1. **HALT transformation** immediately
2. **Report conflict** with details:
   - Which file contains conflict
   - Line numbers of extension block
   - What changed in upstream
3. **Offer resolution options**:
   - Skip this file (keep existing Speck version)
   - Manual merge required (abort transformation, ask user to resolve)
   - Abort entire transformation

**Example Conflict Report**:
```markdown
## ⚠️ TRANSFORMATION CONFLICT DETECTED

**File**: `check-prerequisites.sh`
**Extension Block**: Lines 45-52
**Upstream Change**: Lines 48-50 modified (added new validation logic)

**Conflict**: Upstream change overlaps with Speck extension for feature naming validation.

**Resolution Options**:
1. Skip this file - keep existing `.speck/scripts/check-prerequisites.ts`
2. Manual merge - halt transformation, ask user to merge manually
3. Abort transformation - exit with error, no changes made

**Recommendation**: Option 2 (Manual merge) - upstream validation may conflict with Speck's naming requirements
```

### Missing Dependencies

If bash script depends on external tools not available in Bun/Node.js:

1. **Document dependency** in transformation report
2. **Choose fallback strategy**:
   - Can it be reimplemented in pure TypeScript? (preferred)
   - Can Bun Shell API replicate behavior?
   - Must use Bun.spawn() to call external tool?
3. **Add runtime check** if external tool required:

```typescript
// Example: Check if git is installed
try {
  await $`git --version`.quiet();
} catch {
  console.error("ERROR: git not found. Please install git.");
  process.exit(2);
}
```

---

## Best Practices

1. **Preserve comments**: Keep useful comments from bash script, translate to TypeScript style
2. **Add type safety**: Use TypeScript interfaces for JSON structures
3. **Error messages**: Match bash wording exactly for consistency
4. **Performance**: Prefer async/await over synchronous operations when possible
5. **Readability**: Generated code should be more readable than bash (TypeScript clarity)
6. **Testing**: Each transformation should have corresponding contract tests
7. **Documentation**: Header comment should explain transformation choices

---

## Invocation Example

This agent is invoked by `/speck.transform-upstream` like this:

```typescript
// In .speck/scripts/transform-upstream.ts
import { spawnSync } from "bun";

const agentResult = spawnSync(
  ["claude", "agent", ".claude/agents/transform-bash-to-bun.md"],
  {
    env: {
      UPSTREAM_VERSION: "v1.0.0",
      SOURCE_SCRIPTS: "upstream/v1.0.0/scripts/bash/*.sh",
      OUTPUT_DIR: ".speck/scripts/"
    }
  }
);
```

The agent should output:
1. Generated TypeScript files in `.speck/scripts/`
2. Transformation report (markdown) to stdout
3. Exit code 0 on success, 2 on conflict/error
