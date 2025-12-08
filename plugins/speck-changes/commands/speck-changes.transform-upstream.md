---
description: Transform OpenSpec CLI code to Bun TypeScript
arguments:
  - name: options
    description: "Command options: --version <ver>, --json, --dry-run"
    required: false
---

# Transform OpenSpec to Bun TypeScript

Transform pulled OpenSpec CLI source code from Node.js to Bun TypeScript.

## Usage

```bash
/speck-changes.transform-upstream [--version <ver>] [--json] [--dry-run]
```

## Options

- `--version <ver>` - Specific version to transform (default: latest)
- `--json` - Output in JSON format
- `--dry-run` - Show what would be done without making changes

## Execute

Run the transform-upstream script:

```bash
bun ${CLAUDE_PLUGIN_ROOT}/scripts/transform-upstream.ts $ARGUMENTS
```

## What This Does

1. Reads source files from `upstream/openspec/<version>/`
2. Applies Node.js to Bun transformations:
   - `fs/promises` -> `Bun.file()` API
   - `child_process` -> Bun Shell `$``
   - `readFile/writeFile` -> `Bun.file()/Bun.write()`
3. Preserves SPECK-EXTENSION blocks (Speck-specific code)
4. Writes transformed files to `plugins/speck-changes/scripts/`
5. Records transformation history in `transform-history.json`

## SPECK-EXTENSION Preservation

Code between these markers is preserved unchanged:

```typescript
// [SPECK-EXTENSION:START]
// Speck-specific code here will NOT be transformed
// [SPECK-EXTENSION:END]
```

## Output

On success:
```
Transformed 5 files from v0.16.0

Transformed files:
  src/commands/change.ts -> scripts/propose.ts
  src/commands/validate.ts -> scripts/validate.ts
```

## Next Steps

After transformation:

1. Review transformed files in `plugins/speck-changes/scripts/`
2. Run `bun run typecheck` to verify type safety
3. Run tests with `bun test plugins/speck-changes/`
