# Speck Feature Discovery - Quick Reference

Fast lookup guide for implementing feature matching in Speck skills/commands.

---

## Recommended Patterns (Copy & Paste Ready)

### TypeScript: Extract Feature Number and Name

```typescript
// Parse "005-speck-skill" into number and short name
const match = dirName.match(/^(\d{3})-(.+)$/);
if (match) {
  const featureNumber = match[1];    // "005"
  const shortName = match[2];         // "speck-skill"
}
```

### TypeScript: Check if Directory is Valid Feature

```typescript
const isFeatureDir = /^\d{3}-/.test(directoryName);
```

### Bash/Find: Glob All Feature Directories

```bash
# List all feature directories
find specs -maxdepth 1 -type d -regex 'specs/[0-9]\{3\}-.*' -printf '%f\n' | sort
```

### Bash/Grep: Extract Number from Feature Name

```bash
echo "005-speck-skill" | grep -oE '^[0-9]{3}'  # Output: 005
```

---

## Three-Tier Matching Logic (Pseudo-Code)

```
Input: user query (e.g., "auth", "005", "005-speck-skill")

Tier 1 - Exact Match: Does query exactly match any directory name?
  YES → Return that feature
  NO  → Go to Tier 2

Tier 2 - Number Match: Is query a 1-3 digit number?
  YES → Pad to 3 digits, find dir starting with "###-"
  NO  → Go to Tier 3

Tier 3 - Substring Match: Does query appear in any short name?
  0 matches  → Return error, suggest similar
  1 match    → Return that feature
  2+ matches → Check conversation context
              If feature recently mentioned → use that
              Else → Return ambiguity, show all matches
```

---

## Real-World Examples

### Example 1: User says "005"
```
Query: "005"
→ Tier 2 (number match)
→ Finds: specs/005-speck-skill
→ Result: Success
```

### Example 2: User says "speck-skill"
```
Query: "speck-skill"
→ Tier 1 (exact? no, missing the number)
→ Tier 2 (number? no, not numeric)
→ Tier 3 (substring? yes, in short name)
→ Finds: 1 match in "005-speck-skill"
→ Result: Success
```

### Example 3: User says "auth" (ambiguous)
```
Query: "auth"
→ Tier 1, 2 fail
→ Tier 3 finds: "003-user-auth" AND "012-auth-tokens"
→ Check conversation context (was 003 or 012 mentioned recently?)
→ If yes → use recent one, note it in message
→ If no  → ask user to clarify
```

### Example 4: User says "xyz"
```
Query: "xyz"
→ All tiers fail
→ Suggest similar: ["001-speck-core-project", "005-speck-skill", ...]
→ Show fuzzy matches with lowest Levenshtein distance
```

---

## Conversation Context Quick Start

```typescript
// When user mentions a feature:
// 1. Extract feature reference
// 2. Store in session state:
conversationContext.recentlyMentioned.add(featureName);
conversationContext.currentFeature = featureName;

// 3. When ambiguous later, check:
if (multipleMatches.some(m =>
    conversationContext.recentlyMentioned.has(m.name)
)) {
  // Use the one user was just discussing
}
```

---

## Error Messages - Copy & Paste

### When Feature Not Found
```
I couldn't find feature "{query}". Did you mean one of these?
• 001-speck-core-project
• 002-claude-plugin-packaging
• 005-speck-skill
```

### When Ambiguous
```
Your query "{query}" matches multiple features:
1. 003-user-auth (recently discussed)
2. 012-auth-tokens

Which one did you mean? You can say:
• "Tell me about user-auth"
• "Show 003"
• "The one with tokens"
```

### When File Missing
```
This feature directory exists, but I couldn't find {filename}.
Available files in 005-speck-skill:
• spec.md (feature requirements)
• plan.md (implementation plan)
• tasks.md (task breakdown)
```

---

## Current Speck Features (Update as New Features Added)

| Number | Name | Short Name | Directory |
|--------|------|-----------|-----------|
| 001 | Speck Core Project | speck-core-project | specs/001-speck-core-project |
| 002 | Claude Plugin Packaging | claude-plugin-packaging | specs/002-claude-plugin-packaging |
| 005 | Speck Skill | speck-skill | specs/005-speck-skill |

Note: 003, 004 are reserved/not yet created

---

## Implementation Checklist

For a new Speck skill or command:

- [ ] Accept user query without requiring specific format
- [ ] Implement Tier 1 exact matching
- [ ] Implement Tier 2 numeric prefix matching
- [ ] Implement Tier 3 substring matching
- [ ] Track recently mentioned features in conversation state
- [ ] Show disambiguation message when ambiguous
- [ ] Provide helpful suggestions when feature not found
- [ ] Handle missing files gracefully
- [ ] Validate directory exists and matches `^\d{3}-` pattern

---

## Key Files

- **Pattern Definitions**: `/Users/nathan/git/github.com/nprbst/speck-005-speck-skill/FEATURE_DISCOVERY_PATTERNS.md`
- **Existing Implementation**: `/Users/nathan/git/github.com/nprbst/speck-005-speck-skill/.speck/scripts/common/paths.ts`
  - `findFeatureDirByPrefix()` function
  - Already handles Tier 2 matching

---

## Regex Patterns at a Glance

| Purpose | Pattern | Example |
|---------|---------|---------|
| Parse directory | `^(\d{3})-(.+)$` | Matches: `005-speck-skill` → Groups: ("005", "speck-skill") |
| Is valid feature? | `^\d{3}-` | Matches: `001-anything` |
| All features (bash) | `[0-9]\{3\}-` | find specs -regex 'specs/[0-9]\{3\}-.*' |
| Just the number | `^\d{3}` | grep -oE '^\d{3}' → "005" |
| Short name only | `-(.+)$` | sed 's/^[0-9]*-//g' → "speck-skill" |

---

## See Also

- Full analysis: `FEATURE_DISCOVERY_PATTERNS.md` (this directory)
- Speck spec for feature discovery: `/specs/005-speck-skill/spec.md` (FR-006, Edge Cases)
- Existing path utilities: `.speck/scripts/common/paths.ts`
