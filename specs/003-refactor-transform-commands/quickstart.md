# Quick Start: Refactor Transform Commands Agent

**Feature**: 003-refactor-transform-commands
**Date**: 2025-11-15

## Overview

This guide helps you understand and work with the refactored transformation pipeline that separates deterministic preprocessing (TypeScript) from intelligent extraction (agent).

## What Changed

### Before (Current State)
- Transform-commands agent handles both text replacements AND extraction decisions
- No validation before file writes
- Extraction decisions not recorded
- High failure rate on skill/agent extraction

### After (This Feature)
- **TypeScript preprocessing**: Handles all deterministic text replacements (prefixes, paths, references)
- **Transform-commands agent**: Focuses exclusively on extraction decisions (skills vs agents vs commands)
- **Validation layer**: Checks extracted files before writing, returns errors to agent for correction
- **Decision tracking**: All extraction decisions recorded in transformation-history.json

## Architecture

```text
┌─────────────────────┐
│ Upstream Command    │
│ (speckit.*.md)      │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ TypeScript          │  ← Deterministic text replacements
│ Preprocessing       │    - Add speck. prefix
│                     │    - Change .specify/ → .speck/
└──────┬──────────────┘    - Update command refs
       │
       ▼
┌─────────────────────┐
│ Preprocessed File   │
│ (speck.*.md)        │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Transform-Commands  │  ← Semantic analysis & extraction
│ Agent               │    - Identify skills (auto-invoke)
│                     │    - Identify agents (delegated work)
└──────┬──────────────┘    - Record ALL decisions
       │
       ▼
┌─────────────────────┐
│ Validation Layer    │  ← Quality gates before writes
│ (Bun Script)        │    - Check descriptions
│                     │    - Check tool permissions
└──────┬──────────────┘    - Check structure
       │
       ▼
┌──────────────────────────────────────────┐
│ Output Files                             │
│ - .claude/commands/speck.*.md (updated)  │
│ - .claude/skills/speck.*.md (extracted)  │
│ - .claude/agents/speck.*.md (extracted)  │
│ - transformation-history.json (updated)  │
└──────────────────────────────────────────┘
```

## 5-Minute Quick Start

### 1. Prerequisites

```bash
# Ensure Bun is installed
bun --version  # Should be 1.0+

# Ensure upstream commands exist
ls upstream/spec-kit/current/commands/
```

### 2. Transform a Single Command

```bash
# Run the enhanced transformation
/speck.transform-upstream --file speckit.specify.md
```

**What happens**:
1. TypeScript preprocessing applies text replacements
2. Transform-commands agent analyzes preprocessed file
3. Agent extracts skills/agents (if applicable)
4. Validation ensures quality before writes
5. Transformation history records all decisions

### 3. Review the Output

```bash
# Check transformed command
cat .claude/commands/speck.specify.md

# Check extracted skills (if any)
ls .claude/skills/speck.*

# Check extracted agents (if any)
ls .claude/agents/speck.*

# Review extraction decisions
cat .speck/memory/transformation-history.json | bun run -p 'JSON.parse(require("fs").readFileSync(0,"utf8"))' | tail -n 50
```

### 4. Verify Extraction Quality

Look for these markers in extracted files:

**In Skills** (`.claude/skills/speck.*.md`):
- Third-person description under 1024 chars
- 3+ concrete trigger terms
- Rationale citing Claude Code best practices
- Valid markdown structure

**In Agents** (`.claude/agents/speck.*.md`):
- Single clear objective
- Tool permissions matching fragility level
- 3-5 execution phases
- Rationale citing Claude Code best practices

**In Transformation History** (`.speck/memory/transformation-history.json`):
- Extraction decisions for both extracted AND non-extracted sections
- Criteria applied (size, complexity, reusability)
- Best practices citations

## Common Workflows

### Batch Transform All Commands

```bash
# Transform all upstream commands in batch
/speck.transform-upstream --batch

# Review summary
# (Error report generated if any failures)
```

### Dry Run (Analysis Only)

```bash
# Analyze without writing files
/speck.transform-upstream --file speckit.specify.md --dry-run

# Review what would be extracted
# Agent reports findings without file writes
```

### Custom Extraction Thresholds

```bash
# Adjust thresholds for extraction
/speck.transform-upstream --file speckit.specify.md \
  --min-complexity 75 \
  --min-reusability 3 \
  --min-triggers 4
```

### Re-run Failed Transformations

```bash
# Check error report
cat .speck/output/error-report.json

# Re-run specific files
/speck.transform-upstream --file speckit.problematic-command.md --verbose
```

## How to Read Transformation History

The `transformation-history.json` now includes detailed extraction decisions:

```json
{
  "transformations": [
    {
      "timestamp": "2025-11-15T21:00:00Z",
      "upstreamVersion": "0.0.85",
      "filesTransformed": ["speckit.specify.md"],
      "extractionDecisions": [
        {
          "sourceFile": "speckit.specify.md",
          "sourceSection": "Validation logic",
          "extracted": true,
          "extractedType": "skill",
          "extractedFiles": [".claude/skills/speck.spec-validation.md"],
          "rationale": "Reusable validation logic appearing in 3+ commands. Extracted per 'Skills for Reusable Patterns' best practice.",
          "criteriaApplied": {
            "size": 75,
            "complexity": 4,
            "reusability": 3,
            "triggers": ["spec.md", "validate", "requirements"]
          },
          "bestPracticesCited": [
            "https://docs.claude.com/skills-guide#reusable-patterns"
          ]
        },
        {
          "sourceFile": "speckit.specify.md",
          "sourceSection": "Template rendering",
          "extracted": false,
          "extractedType": null,
          "extractedFiles": [],
          "rationale": "Single-use template specific to specify command. Does not meet reusability threshold (1 command) or complexity threshold (30 lines).",
          "criteriaApplied": {
            "size": 30,
            "complexity": 2,
            "reusability": 1
          },
          "bestPracticesCited": [
            "https://docs.claude.com/skills-guide#extraction-thresholds"
          ]
        }
      ]
    }
  ]
}
```

**Key Fields**:
- `extracted: true` → Skill/agent was created
- `extracted: false` → Logic kept in command (with rationale)
- `criteriaApplied` → Heuristic scores used for decision
- `bestPracticesCited` → Documentation references

## Troubleshooting

### Issue: Preprocessing Fails

**Symptom**: Error during preprocessing stage

**Solution**:
```bash
# Check file encoding
file upstream/spec-kit/current/commands/problematic.md

# Should be UTF-8. If not, convert:
iconv -f ISO-8859-1 -t UTF-8 problematic.md > problematic-utf8.md

# Check file size
ls -lh upstream/spec-kit/current/commands/problematic.md
# Should be <50KB
```

### Issue: No Skills/Agents Extracted

**Symptom**: Agent reports "No extraction opportunities"

**Analysis**: This may be valid! Not all commands have extractable patterns.

**Check**:
1. Review transformation history for rationale
2. Look for negative extraction decisions
3. Verify command is simple/single-use (expected behavior)

**Example Valid Cases**:
- Very simple commands (<50 lines, <3 functions)
- Single-use project-specific logic
- Commands with no auto-invoke trigger patterns

### Issue: Validation Fails Repeatedly

**Symptom**: Agent retries validation 3 times and gives up

**Solution**:
```bash
# Run transformation with verbose logging
/speck.transform-upstream --file speckit.problematic.md --verbose

# Check validation errors
# Agent will report specific issues:
# - "Description exceeds 1024 chars" → Agent must shorten
# - "Insufficient triggers (2 < 3)" → Agent must add triggers
# - "Tool permissions don't match fragility" → Agent must adjust

# If errors persist, check validation API
bun test tests/validation.test.ts
```

### Issue: Transformation Too Slow

**Symptom**: Takes >30 seconds per file

**Solution**:
```bash
# Check agent token usage
# Agent should use concise analysis, not verbose explanations

# Check best practices cache
ls -lh .speck/memory/best-practices-cache.json
# Should be <1MB and <30 days old

# Refresh cache if stale
/speck.refresh-best-practices-cache
```

## Testing Your Changes

### Run Unit Tests

```bash
# Test preprocessing
bun test tests/preprocessing.test.ts

# Test extraction logic
bun test tests/extraction.test.ts

# Test validation
bun test tests/validation.test.ts

# Run all tests
bun test
```

### Test End-to-End

```bash
# Create a test upstream command
echo "# Test Command" > upstream/test/commands/speckit.test.md

# Transform it
/speck.transform-upstream --file speckit.test.md

# Verify outputs
ls .claude/commands/speck.test.md
ls .claude/skills/speck.*
ls .claude/agents/speck.*

# Check transformation history
cat .speck/memory/transformation-history.json | grep "test.md"
```

## Next Steps

1. **Review extracted files**: Check `.claude/skills/` and `.claude/agents/` for quality
2. **Test extracted components**: Invoke skills/agents to verify they work correctly
3. **Tune thresholds**: Adjust extraction criteria based on results
4. **Monitor performance**: Ensure transformations complete in <30 seconds
5. **Provide feedback**: Report issues or improvements to the team

## Key Files

| File | Purpose |
|------|---------|
| `.speck/scripts/preprocess-commands.ts` | TypeScript preprocessing (text replacements) |
| `.speck/scripts/validate-extracted-files.ts` | Validation API (quality gates) |
| `.claude/agents/speck.transform-commands.md` | Transform-commands agent (extraction logic) |
| `.claude/commands/speck.transform-upstream.md` | Main transformation command |
| `.speck/memory/transformation-history.json` | Extraction decision tracking |
| `specs/003-refactor-transform-commands/research.md` | Claude Code best practices reference |
| `specs/003-refactor-transform-commands/contracts/` | API contracts for all components |

## References

- **Feature Spec**: [spec.md](spec.md)
- **Implementation Plan**: [plan.md](plan.md)
- **Research**: [research.md](research.md)
- **Data Model**: [data-model.md](data-model.md)
- **API Contracts**: [contracts/](contracts/)
