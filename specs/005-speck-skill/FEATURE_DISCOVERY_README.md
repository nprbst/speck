# Speck Feature Discovery & Matching Documentation

Complete design patterns, implementation guide, and reference materials for discovering and matching feature directories in Speck.

**Analysis Date**: November 17, 2025
**Current State**: 3 features (001, 002, 005); gaps at 003, 004

---

## Overview

Speck features live in directories following the pattern:
```
specs/[NUM-SHORT-NAME]/
  ├── spec.md
  ├── plan.md
  ├── tasks.md
  └── ...
```

When users interact with Speck (via skills, commands, or agents), they reference features in various ways:
- "Show me feature 005" (numeric)
- "Tell me about the skill" (partial name)
- "What's in the auth spec?" (substring)
- "That feature" (pronouns, requires context)

This documentation covers how to reliably match these queries to feature directories.

---

## Documentation Files

### 1. FEATURE_DISCOVERY_PATTERNS.md (19 KB, 660 lines)
**Primary reference document** - Complete analysis and design patterns

Contains:
- Pattern analysis for directory naming conventions
- Regex/glob patterns with detailed explanations
- Three-tier matching strategy (exact → number → substring)
- Conversation context management for disambiguation
- Best practices for error handling and suggestions
- Complete code examples with inline documentation

**Read this if**: You're implementing feature discovery and want to understand the design rationale.

**Key Sections**:
- Pattern Analysis (regex patterns with examples)
- Feature Discovery Implementation (functions with pseudo-code)
- Handling Partial Name Queries (multi-stage resolution)
- Conversation Context Management (tracking user references)
- Best Practices for Suggesting Alternatives (fuzzy matching)

---

### 2. FEATURE_DISCOVERY_QUICK_REFERENCE.md (5.5 KB, 209 lines)
**Fast lookup guide** - Copy & paste ready patterns and examples

Contains:
- Ready-to-use regex patterns
- Three-tier matching logic in pseudo-code
- Real-world examples (user says "005", "auth", etc.)
- Error message templates
- Implementation checklist
- Current feature list

**Read this if**: You need quick lookup of specific patterns or error messages.

**Key Sections**:
- Recommended Patterns (copy-paste ready)
- Three-Tier Matching Logic (pseudo-code)
- Real-World Examples (actual match scenarios)
- Error Messages (user-facing text templates)

---

### 3. FEATURE_DISCOVERY_IMPLEMENTATION.ts (13 KB, 494 lines)
**Production-ready code** - Complete TypeScript implementation

Contains:
- `findFeatureByExactName()` - Tier 1 exact matching
- `findFeatureByNumber()` - Tier 2 numeric prefix matching
- `findFeatureBySubstring()` - Tier 3 fuzzy/substring matching
- `findFeature()` - Master three-tier discovery function
- `SpeckFeatureResolver` class - Conversation-context-aware resolver
- Levenshtein distance for typo tolerance
- `getAllFeatures()` and suggestion functions
- Full inline documentation and examples

**Read this if**: You're ready to implement and want copy-paste code.

**Key Classes/Functions**:
- `SpeckFeatureResolver` - Main class for resolving features with context
- `findFeature()` - Three-tier matching algorithm
- `suggestSimilar()` - Fuzzy matching for suggestions
- Helper functions for parsing and validation

---

## Quick Start

### For Quick Implementation

1. Open `FEATURE_DISCOVERY_QUICK_REFERENCE.md`
2. Copy the three-tier matching logic (pseudo-code section)
3. Implement in your language (patterns are language-agnostic)

### For Complete Understanding

1. Start with `FEATURE_DISCOVERY_PATTERNS.md` - Read "Decision" and "Pattern Analysis" sections
2. Review "Real-World Examples" in the Quick Reference
3. Look at `FEATURE_DISCOVERY_IMPLEMENTATION.ts` for reference implementation

### For Direct Implementation

1. Copy functions from `FEATURE_DISCOVERY_IMPLEMENTATION.ts`
2. Adapt to your environment (Bun, Deno, Node.js, etc.)
3. Integrate into your skill/command
4. Use `SpeckFeatureResolver` class for conversation context

---

## Decision Summary

**Approach**: Three-tier matching with conversation context awareness

**Tiers** (in priority order):
1. **Exact Match**: User query exactly matches directory name
2. **Number Match**: User provides feature number (padded to 3 digits)
3. **Substring Match**: User provides partial name (with disambiguation)

**Context Handling**: When ambiguous, use:
1. Recently mentioned features in conversation
2. Current feature context
3. Ask user for clarification

**Error Handling**: When not found:
1. Suggest similar features (fuzzy match)
2. List all available features
3. Explain how to be more specific

---

## Regex Patterns Reference

| Purpose | Pattern | Example |
|---------|---------|---------|
| Parse directory | `^(\d{3})-(.+)$` | "005-speck-skill" → ("005", "speck-skill") |
| Valid feature? | `^\d{3}-` | Matches "001-anything" |
| Extract number | `^\d{3}` | "005-speck-skill" → "005" |
| Glob all features | `specs/[0-9][0-9][0-9]-*/` | Shell glob pattern |

---

## Current Features (Reference)

As of analysis date (2025-11-17):

| Num | Name | Short Name | Status |
|-----|------|-----------|--------|
| 001 | Speck Core Project | speck-core-project | Active |
| 002 | Claude Plugin Packaging | claude-plugin-packaging | Active |
| 005 | Speck Skill | speck-skill | Draft |

**Note**: 003, 004 are reserved/not yet created

---

## Integration Points

### Existing Codebase

The following files already have related implementations:

- **`.speck/scripts/common/paths.ts`**:
  - `findFeatureDirByPrefix()` - Implements Tier 2 (number) matching
  - `getCurrentBranch()` - Uses pattern `^(\d{3})-` for branch detection
  - Can be reused or extended for feature discovery

- **`.claude/commands/speck.specify.md`**:
  - Lines 40-66: Describes feature discovery strategy
  - Shows how branches and specs directories are checked
  - Practical example of multi-source discovery

### Where to Integrate

**Speck Skill** (primary use case):
- Located at: `specs/005-speck-skill/spec.md`
- Requirement FR-006: Locate feature directories using pattern `specs/NUM-short-name/`
- Use `SpeckFeatureResolver` to handle feature references in user questions

**New Commands/Agents**:
- Use `findFeature()` for one-off lookups
- Use `SpeckFeatureResolver` class for multi-turn conversations
- Pass `conversationState` between function calls

---

## Implementation Checklist

When building a feature discovery system:

- [ ] **Tier 1**: Implement exact directory name matching
- [ ] **Tier 2**: Implement numeric prefix matching (pad to 3 digits)
- [ ] **Tier 3**: Implement substring matching (word boundaries)
- [ ] **Context**: Track recently mentioned features in session
- [ ] **Disambiguation**: Show alternatives when ambiguous
- [ ] **Suggestions**: Offer fuzzy-matched alternatives when not found
- [ ] **Error Messages**: Use provided templates for consistency
- [ ] **Validation**: Ensure directories match `^\d{3}-` pattern
- [ ] **File Handling**: Check for spec.md, plan.md, tasks.md existence
- [ ] **Conversation State**: Update context after each mention

---

## Examples: How Users Reference Features

### Numeric References
```
User: "What's in feature 005?"
→ Tier 2 match
→ Resolves to: 005-speck-skill
```

### Partial Name References
```
User: "Tell me about the plugin"
→ Tier 3 substring match
→ Resolves to: 002-claude-plugin-packaging
```

### Ambiguous References (Requires Context)
```
User 1: "Tell me about the auth feature"
→ Tier 3 substring match
→ Multiple matches: 003-user-auth, 012-auth-tokens
→ Use context: User just asked about authentication
→ Could suggest both: "Did you mean user-auth or auth-tokens?"

Later, User says: "What about the plan?"
→ No query provided, use pronouns
→ Current context: Last discussed feature
→ Could resolve to: Same feature as before
```

### Non-Existent References
```
User: "Show me feature 999"
→ All tiers fail
→ Suggest similar: Did you mean 099-payment-gateway?
→ Or list available: 001-..., 002-..., 005-...
```

---

## Testing Approach

### Unit Tests (for matching functions)

```typescript
// Test Tier 1: Exact match
assert(findFeatureByExactName(root, '005-speck-skill') !== null);
assert(findFeatureByExactName(root, '005') === null);

// Test Tier 2: Number match
assert(findFeatureByNumber(root, '005') !== null);
assert(findFeatureByNumber(root, '5').includes('speck-skill'));

// Test Tier 3: Substring match
assert(findFeatureBySubstring(root, 'plugin') !== null);
assert(findFeatureBySubstring(root, 'auth', { returnMultiple: true }).length >= 1);
```

### Integration Tests (for full resolver)

```typescript
// Test exact match
assert(findFeature(root, '005-speck-skill').matchType === 'exact');

// Test with context
const resolver = new SpeckFeatureResolver(root);
resolver.resolveFeature('auth'); // Adds to context
// Later query disambiguates based on context
```

### User Testing

Ask real users to reference features in natural ways:
- "What's in 005?" (numeric)
- "Tell me about the skill" (partial)
- "Show me the plugin" (substring)
- "That one" (pronouns - requires prior context)

---

## FAQ

### Q: Why three tiers instead of just one?
**A**: User input varies widely. Some say "005", others say "skill", others say "005-speck-skill". Three tiers handle all cases with clear priority ordering.

### Q: What if a feature number has multiple directories?
**A**: Current design assumes one directory per number (e.g., only one dir starting with "005-"). This is enforced at creation time by `create-new-feature.ts`.

### Q: How does context help disambiguate?
**A**: If user asks about "003-user-auth", then later says "What about the plan?" we know they mean the same feature (user-auth). Store mentions and use them to resolve pronouns.

### Q: Can I use this in other languages?
**A**: Yes. The patterns are language-agnostic:
- Regex works in Python, Go, Rust, etc.
- Three-tier logic is pseudo-code that maps to any language
- TypeScript implementation is reference only

### Q: What about new features added in the future?
**A**: Just ensure they follow `###-short-name` pattern. All discovery functions work regardless of total feature count. Current limit: 999 features (3 digits).

---

## Related Documentation

- **Speck Specification**: `/specs/005-speck-skill/spec.md`
  - FR-006: Feature directory discovery requirement
  - Edge cases section: Handling non-existent references

- **Existing Path Utilities**: `.speck/scripts/common/paths.ts`
  - `findFeatureDirByPrefix()` - Can reuse for Tier 2
  - Already tested in production

- **Quick Reference**: `FEATURE_DISCOVERY_QUICK_REFERENCE.md`
  - Copy-paste patterns
  - Error message templates

---

## File Locations

```
/Users/nathan/git/github.com/nprbst/speck-005-speck-skill/
├── FEATURE_DISCOVERY_README.md           ← You are here
├── FEATURE_DISCOVERY_PATTERNS.md         ← Full analysis (start here)
├── FEATURE_DISCOVERY_QUICK_REFERENCE.md  ← Quick lookup
└── FEATURE_DISCOVERY_IMPLEMENTATION.ts   ← Ready-to-use code
```

---

## Next Steps

1. **Review**: Read `FEATURE_DISCOVERY_PATTERNS.md` section "Decision" first
2. **Understand**: Study the three-tier matching logic
3. **Implement**: Copy relevant functions from `FEATURE_DISCOVERY_IMPLEMENTATION.ts`
4. **Test**: Write unit tests for each tier
5. **Integrate**: Add feature discovery to your skill/command
6. **Validate**: Test with real user queries from the spec

---

## Document History

| Date | Version | Notes |
|------|---------|-------|
| 2025-11-17 | 1.0 | Initial analysis with 3 existing features |

---

## Questions or Issues?

If you need clarification on any pattern or example, refer to the specific section in `FEATURE_DISCOVERY_PATTERNS.md` or raise an issue with the specific query that's unclear.
