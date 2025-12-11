# Research: OpenSpec Changes Plugin

**Date**: 2025-12-07
**Feature**: 019-openspec-changes-plugin
**Status**: Complete

## 1. OpenSpec CLI Analysis

### 1.1 Repository Structure

**Repository**: https://github.com/Fission-AI/OpenSpec

```text
Fission-AI/OpenSpec/
├── bin/openspec.js           # CLI entry point
├── src/
│   ├── cli/                  # CLI presentation layer
│   ├── commands/             # Command handlers
│   │   ├── change.ts         # Change proposal management (10.6 KB)
│   │   ├── show.ts           # Display information (5 KB)
│   │   ├── spec.ts           # Spec management (9 KB)
│   │   └── validate.ts       # Validation logic (12.5 KB)
│   ├── core/                 # Business logic
│   └── utils/                # Shared utilities
├── openspec/                 # Template structure
│   ├── AGENTS.md             # Agent documentation template
│   ├── project.md            # Project overview template
│   ├── specs/                # Specification directory
│   └── changes/              # Change proposals directory
└── test/                     # Test files
```

### 1.2 Technology Stack

| Component | OpenSpec | Speck Equivalent |
|-----------|----------|------------------|
| Runtime | Node.js 20.19+ | Bun 1.0+ |
| CLI Framework | commander | Bun Shell / direct |
| Prompts | @inquirer/prompts | Bun Shell stdin |
| Styling | chalk | Bun console formatting |
| Spinners | ora | Simple console output |
| Validation | zod | zod (same) |
| Testing | vitest | bun test |

### 1.3 Version History

Latest: **v0.16.0** (Nov 21, 2025)

Key versions:
- v0.16.0: Antigravity + iFlow Support
- v0.15.0: Gemini CLI, RooCode Support
- v0.14.0: CoStrict AI, Qoder CLI, Qwen Code
- v0.13.0: Cline, Crush, Auggie, CodeBuddy
- v0.12.0: Droid CLI, factory functions
- v0.11.0: Amazon Q Developer CLI
- v0.9.0: Codex and GitHub Copilot
- v0.1.0: First public release

**Decision**: Target v0.16.0 for initial pull/transform

## 2. Transformation Strategy

### 2.1 Command Mapping

| OpenSpec Command | Speck Command | Notes |
|------------------|---------------|-------|
| `openspec init` | N/A | Speck has existing init |
| `openspec change draft` | `/speck-changes.propose` | Renamed from draft→propose |
| `openspec change list` | `/speck-changes.list` | Direct mapping |
| `openspec change show` | `/speck-changes.show` | Direct mapping |
| `openspec change archive` | `/speck-changes.archive` | Direct mapping |
| `openspec validate` | `/speck-changes.validate` | Scoped to changes |
| `openspec show` | N/A | Speck has existing show commands |

### 2.2 Node.js to Bun Transformation

**Patterns to Apply**:

1. **Import statements**: ESM imports work in both, no change needed
2. **File operations**: Replace `fs/promises` with Bun.file/Bun.write
3. **Process execution**: Replace `child_process` with Bun.spawn or Bun Shell `$`
4. **Path handling**: Keep `path` module (Bun compatible)
5. **CLI parsing**: Replace commander with Bun.argv parsing or simple args

**Example Transformations**:

```typescript
// Node.js (OpenSpec)
import { readFile, writeFile } from 'fs/promises';
await readFile(path, 'utf-8');
await writeFile(path, content);

// Bun (Speck)
const file = Bun.file(path);
await file.text();
await Bun.write(path, content);
```

```typescript
// Node.js (OpenSpec)
import { execSync } from 'child_process';
execSync('git status');

// Bun (Speck)
import { $ } from 'bun';
await $`git status`;
```

### 2.3 Template Extraction Strategy

Per FR-004b, OpenSpec lacks standalone command files - templates are embedded in CLI code.

**Extraction Approach**:
1. Pull upstream release to temp directory
2. Parse `src/commands/*.ts` to extract template strings
3. Write extracted templates to `.speck/plugins/speck-changes/templates/`
4. Transform remaining logic to Bun TypeScript

**Template Files to Extract**:
- `proposal.md` - From change.ts draft command
- `tasks.md` - From change.ts draft command
- `design.md` - From change.ts draft command (optional flag)

## 3. Delta File Format

### 3.1 OpenSpec Delta Structure

```markdown
# Delta: <spec-name>

## ADDED Requirements

### REQ-XXX: <requirement title>
<requirement description>

#### Scenario: <scenario name>
- **Given**: <precondition>
- **When**: <action>
- **Then**: <expected outcome>

## MODIFIED Requirements

### REQ-XXX: <requirement title>
**Before**: <original text>
**After**: <new text>

## REMOVED Requirements

### REQ-XXX: <requirement title>
**Reason**: <why removed>
```

### 3.2 Validation Rules

From `validate.ts` analysis:
- All sections must use `## ADDED`, `## MODIFIED`, or `## REMOVED` headers
- Requirements must have unique IDs (REQ-XXX format optional in changes)
- Scenarios must follow Given-When-Then format
- REMOVED sections must include reason

**Decision**: Adopt OpenSpec format with flexible requirement IDs (kebab-case names acceptable)

## 4. GitHub API Authentication

### 4.1 Authentication Strategy

Per FR-008: Use `gh` CLI when available, fall back to unauthenticated.

```typescript
async function getGitHubToken(): Promise<string | null> {
  try {
    const result = await $`gh auth token`.text();
    return result.trim();
  } catch {
    return null; // gh not available or not authenticated
  }
}

async function fetchReleases(token: string | null): Promise<Release[]> {
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github+json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(
    'https://api.github.com/repos/Fission-AI/OpenSpec/releases',
    { headers }
  );

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }

  return response.json();
}
```

### 4.2 Rate Limits

- **Authenticated**: 5,000 requests/hour
- **Unauthenticated**: 60 requests/hour

**Mitigation**: Cache releases.json locally, only fetch when explicitly requested.

## 5. SPECK-EXTENSION Preservation

### 5.1 Extension Marker Pattern

```typescript
// [SPECK-EXTENSION:START]
// Custom Speck-specific code that must be preserved during transformation
function speckSpecificFeature() {
  // ...
}
// [SPECK-EXTENSION:END]
```

### 5.2 Transformation Agent Behavior

1. Parse source file identifying extension blocks
2. Store extension content with location markers
3. Apply semantic transformation to non-extension code
4. Re-insert extension blocks at corresponding locations
5. If extension location conflicts with upstream changes, HALT and request human review

**Decision**: Extension blocks have absolute priority. Transformation never modifies their content.

## 6. Alternatives Considered

### 6.1 Config-based Transformation (Rejected)

**Alternative**: Define transformation rules in JSON/YAML config file.

**Rejection Reason**: Per FR-004a, transformation must be semantic and LLM-driven to handle:
- Variable renaming across scopes
- Idiom translation (Node patterns → Bun patterns)
- Error handling adaptation
- Context-aware modifications

Config-based approaches fail on edge cases and miss semantic context.

### 6.2 Direct OpenSpec Integration (Rejected)

**Alternative**: Install OpenSpec as npm dependency and call directly.

**Rejection Reason**:
- Adds Node.js runtime dependency to Bun project
- Harder to customize for Speck workflows
- Plugin size bloat
- Violates Claude Code native principle (V)

### 6.3 Manual Translation (Rejected)

**Alternative**: Manually translate OpenSpec code once, maintain separately.

**Rejection Reason**:
- Loses upstream fidelity (Principle I)
- Maintenance burden scales with OpenSpec updates
- Misses improvements from OpenSpec community

## 7. Open Questions (Resolved)

| Question | Resolution |
|----------|------------|
| How to handle OpenSpec's `AGENTS.md` generation? | Out of scope per spec - multi-tool integration not included |
| What about the `openspec view` TUI? | Out of scope per spec - use list/show commands instead |
| How to name change proposals? | Kebab-case only (FR-010a) |
| Where to store change status? | Folder location only - no status field (Clarification 2025-12-07) |

## 8. Summary

**Key Decisions**:
1. Target OpenSpec v0.16.0 for initial transformation
2. Use semantic/LLM-driven transformation per speckit pattern
3. Extract templates by parsing source code (not standalone files)
4. Adopt OpenSpec delta format with flexible requirement IDs
5. Use `gh` CLI for authentication with unauthenticated fallback
6. Preserve SPECK-EXTENSION blocks with absolute priority

**Technical Approach**:
1. `/speck-changes.check-upstream`: Query GitHub API, display releases
2. `/speck-changes.pull-upstream`: Fetch release tarball, extract to temp, install CLI, extract templates
3. `/speck-changes.transform-upstream`: Launch Claude agents for semantic transformation
4. Change management commands: Direct Bun TypeScript implementation of validated OpenSpec patterns
