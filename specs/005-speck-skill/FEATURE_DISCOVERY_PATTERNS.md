# Speck Feature Discovery & Matching Design Patterns

Analysis of regex/glob patterns, discovery strategies, and best practices for handling user queries with partial feature names.

**Analysis Date**: 2025-11-17
**Scope**: Feature discovery patterns for `specs/NUM-short-name/` directories
**Current State**: 3 features exist (001-speck-core-project, 002-claude-plugin-packaging, 005-speck-skill)

---

## Decision: Tiered Matching Strategy with Context-Aware Fallbacks

**Recommended Approach**: Implement a three-tier matching system that prioritizes exact matches, then numeric prefix matches, then fuzzy substring matches—with conversation context awareness to reduce ambiguity.

---

## Pattern Analysis

### Current Directory Naming Convention

```
specs/[NUM-SHORT-NAME]/
  ├── spec.md          (feature specification)
  ├── plan.md          (implementation plan)
  ├── tasks.md         (task breakdown)
  └── [other files]
```

**Observed Examples**:
- `001-speck-core-project`
- `002-claude-plugin-packaging`
- `005-speck-skill`

**Key Characteristics**:
1. NUM: Zero-padded 3-digit integer (001, 002, ..., 999)
2. SHORT-NAME: Hyphenated lowercase words (2-4 typically)
3. Gap in numbering: 003 and 004 missing (reserved or future features)

---

## Recommended Regex/Glob Patterns

### Pattern 1: Directory Glob (for filesystem discovery)
```bash
# Find all feature directories
specs/[0-9][0-9][0-9]-*/

# More explicit pattern
specs/[0-9][0-9][0-9]-*-*/
```

**Usage in TypeScript**:
```typescript
// List all feature directories
const featureDirs = readdirSync('specs', { withFileTypes: true })
  .filter(d => d.isDirectory() && /^\d{3}-/.test(d.name))
  .map(d => d.name);
```

### Pattern 2: Feature Number Extraction
```regex
^(\d{3})-(.+)$
```

**Breakdown**:
- `^` = Start of string
- `(\d{3})` = Capture group 1: exactly 3 digits (the feature number)
- `-` = Literal hyphen separator
- `(.+)` = Capture group 2: one or more characters (the short name)
- `$` = End of string

**Example Matches**:
```
001-speck-core-project
  ├─ Group 1: "001"
  └─ Group 2: "speck-core-project"

005-speck-skill
  ├─ Group 1: "005"
  └─ Group 2: "speck-skill"
```

### Pattern 3: Numeric Prefix Matching (for branch name resolution)
```regex
^(\d{3})-
```

**Use Case**: When user on branch `005-speck-skill-bugfix`, find feature dir `005-speck-skill`
- Allows multiple branches per feature number
- Only exact numeric prefix match required

---

## Feature Discovery Implementation

### Tier 1: Exact Match (Highest Priority)

```typescript
function findFeatureByExactName(repoRoot: string, query: string): string | null {
  const specsDir = path.join(repoRoot, 'specs');
  const dirs = readdirSync(specsDir, { withFileTypes: true });

  // Exact directory name match
  const exact = dirs.find(d =>
    d.isDirectory() && d.name === query && /^\d{3}-/.test(d.name)
  );

  return exact ? path.join(specsDir, exact.name) : null;
}

// Examples:
// findFeatureByExactName(root, '005-speck-skill')   → Found
// findFeatureByExactName(root, '005')               → Not found
// findFeatureByExactName(root, 'speck-skill')       → Not found
```

### Tier 2: Numeric Prefix Match (High Priority)

```typescript
function findFeatureByNumber(repoRoot: string, featureNum: string | number): string | null {
  const specsDir = path.join(repoRoot, 'specs');
  const numStr = String(featureNum).padStart(3, '0');

  const dirs = readdirSync(specsDir, { withFileTypes: true });
  const matches = dirs.filter(d =>
    d.isDirectory() && d.name.startsWith(`${numStr}-`)
  );

  if (matches.length === 1) {
    return path.join(specsDir, matches[0].name);
  }

  // Multiple matches is error condition (shouldn't happen with proper naming)
  return null;
}

// Examples:
// findFeatureByNumber(root, '005')                  → Found: 005-speck-skill
// findFeatureByNumber(root, 5)                      → Found: 005-speck-skill
// findFeatureByNumber(root, '999')                  → Not found
```

### Tier 3: Substring/Fuzzy Match (Lower Priority)

```typescript
function findFeatureBySubstring(
  repoRoot: string,
  query: string,
  options?: { returnMultiple?: boolean }
): string | string[] | null {
  const specsDir = path.join(repoRoot, 'specs');
  const queryLower = query.toLowerCase();

  const dirs = readdirSync(specsDir, { withFileTypes: true });
  const matches = dirs.filter(d => {
    if (!d.isDirectory() || !/^\d{3}-/.test(d.name)) return false;

    // Extract short name (everything after ###-)
    const shortName = d.name.slice(4); // Skip "###-"

    // Match: substring, word boundary, or fuzzy token match
    return (
      shortName.includes(queryLower) ||  // "auth" in "user-auth"
      shortName.split('-').some(word => word.startsWith(queryLower))  // word prefix
    );
  });

  if (matches.length === 0) return null;
  if (options?.returnMultiple) {
    return matches.map(m => path.join(specsDir, m.name));
  }

  return matches.length === 1
    ? path.join(specsDir, matches[0].name)
    : null;  // Ambiguous
}

// Examples:
// findFeatureBySubstring(root, 'auth')              → Ambiguous: [003-user-auth, 012-auth-tokens]
// findFeatureBySubstring(root, 'plugin')            → Found: 002-claude-plugin-packaging
// findFeatureBySubstring(root, 'speck')             → Ambiguous: multiple matches
// findFeatureBySubstring(root, 'xyz')               → Not found

// With returnMultiple option:
// findFeatureBySubstring(root, 'auth', { returnMultiple: true })
//   → [specs/003-user-auth, specs/012-auth-tokens]
```

### Master Discovery Function

```typescript
interface FeatureMatch {
  path: string;
  name: string;
  number: number;
  shortName: string;
  matchType: 'exact' | 'number' | 'substring';
  alternatives?: FeatureMatch[];
}

function findFeature(
  repoRoot: string,
  query: string,
  conversationContext?: { recentlyMentioned?: string[] }
): FeatureMatch | null {
  // Normalize query
  const cleanQuery = query.trim().toLowerCase();

  // Tier 1: Exact match on full directory name
  const exactMatch = findFeatureByExactName(repoRoot, cleanQuery);
  if (exactMatch) {
    return parseFeatureMatch(exactMatch, 'exact');
  }

  // Tier 2: Try numeric prefix
  if (/^\d+$/.test(cleanQuery)) {
    const numberMatch = findFeatureByNumber(repoRoot, cleanQuery);
    if (numberMatch) {
      return parseFeatureMatch(numberMatch, 'number');
    }
  }

  // Tier 3: Substring match (with alternatives)
  const substringMatches = findFeatureBySubstring(repoRoot, cleanQuery, { returnMultiple: true });

  if (!substringMatches) {
    return null;  // No matches found
  }

  if (typeof substringMatches === 'string') {
    // Single unambiguous match
    return parseFeatureMatch(substringMatches, 'substring');
  }

  // Multiple matches - use conversation context to disambiguate
  const matches = (substringMatches as string[]).map(p => parseFeatureMatch(p, 'substring'));

  if (conversationContext?.recentlyMentioned?.length) {
    const recent = matches.find(m =>
      conversationContext.recentlyMentioned!.includes(m.name)
    );
    if (recent) {
      return { ...recent, alternatives: matches };
    }
  }

  // Return first match but flag as ambiguous
  return {
    ...matches[0],
    alternatives: matches.slice(1),
    matchType: 'substring'
  };
}

// Helper to parse feature directory into structured data
function parseFeatureMatch(dirPath: string, matchType: 'exact' | 'number' | 'substring'): FeatureMatch {
  const name = path.basename(dirPath);
  const match = name.match(/^(\d{3})-(.+)$/);

  if (!match) {
    throw new Error(`Invalid feature directory: ${name}`);
  }

  return {
    path: dirPath,
    name,
    number: parseInt(match[1], 10),
    shortName: match[2],
    matchType
  };
}

// Examples:
// findFeature(root, '005-speck-skill')              → Exact match
// findFeature(root, '005')                          → Number match
// findFeature(root, 'plugin')                       → Substring match
// findFeature(root, 'auth')                         → Ambiguous (alternatives provided)
// findFeature(root, 'xyz')                          → null (not found)
```

---

## Handling Partial Name Queries

### Challenge: User Query "auth" Matches Multiple Features

When directory structure includes both `003-user-auth` and `012-auth-tokens`, query "auth" is ambiguous.

### Solution: Multi-Stage Resolution with Friendly Fallbacks

```typescript
function resolveFeatureWithContext(
  repoRoot: string,
  query: string,
  conversationState: {
    recentlyMentioned?: string[];
    currentFeature?: string;
    mentionHistory?: Record<string, number>;
  }
): { feature: FeatureMatch; suggestion?: string } | { error: string; alternatives: FeatureMatch[] } {
  const match = findFeature(repoRoot, query, conversationState);

  if (match && !match.alternatives) {
    // Unambiguous - return directly
    return { feature: match };
  }

  if (!match) {
    // No match at all - suggest similar features
    const allFeatures = getAllFeatures(repoRoot);
    const suggestions = suggestSimilar(query, allFeatures, { maxSuggestions: 3 });

    return {
      error: `Feature not found: "${query}"`,
      alternatives: suggestions
    };
  }

  if (match.alternatives && match.alternatives.length > 0) {
    // Ambiguous match - apply context-based resolution

    // Strategy 1: Use conversation context (recently mentioned?)
    const recentlyMentioned = conversationState.recentlyMentioned || [];
    const contextMatch = match.alternatives.find(alt =>
      recentlyMentioned.includes(alt.name)
    );
    if (contextMatch) {
      return {
        feature: contextMatch,
        suggestion: `Resolving to "${contextMatch.name}" based on recent conversation context.`
      };
    }

    // Strategy 2: Use current feature context
    if (conversationState.currentFeature && !query.includes('-')) {
      // If user just said "auth" while on 003-user-auth, assume they mean that
      const currentNum = parseInt(conversationState.currentFeature.slice(0, 3), 10);
      const contextMatch = match.alternatives.find(alt => alt.number === currentNum);
      if (contextMatch) {
        return {
          feature: contextMatch,
          suggestion: `Resolving to "${contextMatch.name}" (current feature).`
        };
      }
    }

    // Strategy 3: Return ambiguity message with clear options
    return {
      error: `Multiple features match "${query}". Please be more specific.`,
      alternatives: [match, ...match.alternatives]
    };
  }

  return { feature: match };
}
```

### User-Facing Error Messages

```typescript
// Case: No match found
"I couldn't find feature '${query}'. Did you mean one of these?
 • 001-speck-core-project
 • 005-speck-skill"

// Case: Ambiguous match
"Your query 'auth' matches multiple features:
 1. 003-user-auth (recently discussed)
 2. 012-auth-tokens

Which one did you mean? You can say:
 • 'Tell me about 003-user-auth'
 • 'Tell me about 012-auth-tokens'
 • Reference by full name: 'user-auth' or 'auth-tokens'"

// Case: Context-resolved match
"Found feature '005-speck-skill' based on your question about a Speck skill."
```

---

## Conversation Context Management

### Why Context Matters

In a multi-turn conversation, users often discuss multiple features:

```
User: "Tell me about the auth feature"      → Resolves to 003-user-auth
User: "What about the tokens feature?"      → Ambiguous without context
  Without context: Could mean 012-auth-tokens OR others
  With context: User likely means 012-auth-tokens (another auth-related feature)
```

### Context Tracking Strategy

```typescript
interface ConversationState {
  // Feature numbers/names mentioned in this conversation
  mentionedFeatures: Set<string>;

  // Most recent feature mentioned (default for pronouns/vague references)
  currentFeature?: string;

  // Feature mention timeline (for context-aware matching)
  mentionHistory: Array<{
    feature: string;
    timestamp: number;
    context: string;  // What user was asking about
  }>;

  // Implicit context (e.g., "it" refers to most recent)
  implicitReferences: Map<string, string>;
}

class SpeckFeatureResolver {
  private conversationState: ConversationState = {
    mentionedFeatures: new Set(),
    mentionHistory: [],
    implicitReferences: new Map()
  };

  resolveFeature(query: string, repoRoot: string): FeatureMatch {
    const feature = resolveFeatureWithContext(repoRoot, query, {
      recentlyMentioned: Array.from(this.conversationState.mentionedFeatures),
      currentFeature: this.conversationState.currentFeature
    });

    if ('feature' in feature) {
      // Update conversation state
      this.conversationState.mentionedFeatures.add(feature.feature.name);
      this.conversationState.currentFeature = feature.feature.name;
      this.conversationState.mentionHistory.push({
        feature: feature.feature.name,
        timestamp: Date.now(),
        context: query
      });

      return feature.feature;
    }

    // Handle error case
    throw new Error(feature.error);
  }

  // For pronouns: "What about the plan?" → Use current feature
  resolvePronounReference(pronoun: string): string | null {
    return this.conversationState.implicitReferences.get(pronoun) ||
           this.conversationState.currentFeature ||
           null;
  }
}
```

---

## Best Practices for Suggesting Alternatives

### When Feature Doesn't Exist

**Scenario**: User asks about "feature 999" which doesn't exist

**Solution**: Suggest similar features using fuzzy matching

```typescript
function suggestSimilar(
  query: string,
  allFeatures: FeatureMatch[],
  options: { maxSuggestions?: number; maxDistance?: number } = {}
): FeatureMatch[] {
  const maxDistance = options.maxDistance ?? 2;
  const maxSuggestions = options.maxSuggestions ?? 3;

  // Levenshtein distance for fuzzy matching
  function distance(a: string, b: string): number {
    const m = a.length, n = b.length;
    const d: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) d[i][0] = i;
    for (let j = 0; j <= n; j++) d[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        d[i][j] = Math.min(
          d[i-1][j] + 1,
          d[i][j-1] + 1,
          d[i-1][j-1] + (a[i-1] !== b[j-1] ? 1 : 0)
        );
      }
    }

    return d[m][n];
  }

  const queryLower = query.toLowerCase();
  const scored = allFeatures
    .map(f => ({
      feature: f,
      score: Math.min(
        distance(queryLower, f.name.toLowerCase()),
        distance(queryLower, f.shortName.toLowerCase())
      )
    }))
    .filter(s => s.score <= maxDistance)
    .sort((a, b) => a.score - b.score)
    .slice(0, maxSuggestions)
    .map(s => s.feature);

  return scored;
}

// Examples:
// suggestSimilar('003', allFeatures)          → [] (no close matches, numeric)
// suggestSimilar('speck-skil', allFeatures)   → [005-speck-skill] (typo: missing 'l')
// suggestSimilar('auth', allFeatures)         → [003-user-auth] (substring in name)
```

### Handling Non-Existent File References

**Scenario**: User asks "Show me the contracts for feature 001" but contracts/ doesn't exist

```typescript
function findFeatureFile(
  featurePath: string,
  filePattern: string
): { found: boolean; suggestions: string[] } {
  const validFiles = ['spec.md', 'plan.md', 'tasks.md', 'research.md', 'data-model.md'];

  const filePath = path.join(featurePath, filePattern);

  if (existsSync(filePath)) {
    return { found: true, suggestions: [] };
  }

  // File not found - suggest what exists
  const existing = validFiles.filter(f =>
    existsSync(path.join(featurePath, f))
  );

  return {
    found: false,
    suggestions: existing.length > 0
      ? existing
      : ['No Speck files found in this feature directory']
  };
}

// User message: "I don't see a contracts.md file in the feature"
// Response: "The feature has these files available:
//   • spec.md
//   • plan.md
//   • tasks.md
//  (contracts/ would be a subdirectory with TypeScript/JSON contract definitions)"
```

---

## Regex/Glob Pattern Reference

### Quick Reference Table

| Pattern | Use Case | Match Example | Non-Match Example |
|---------|----------|---|---|
| `^(\d{3})-(.+)$` | Parse directory name | `001-speck-skill` | `1-speck`, `001speck` |
| `^\d{3}-` | Check if valid feature dir | `005-speck` | `5-speck`, `spec-005` |
| `specs/[0-9][0-9][0-9]-*/` | Glob all features (basic) | `specs/001-*` | `specs/1-*` |
| `^(\d{3})-${shortName}$` | Match exact feature | `003-user-auth` | `003-auth`, `3-user-auth` |
| `^(\d{3})-` | Match by prefix only | `003-*` (any dir) | `3-*` (single digit) |

### POSIX vs TypeScript Regex

**POSIX Regex (for bash/grep)**:
```bash
# Find directories matching pattern
find specs -type d -regex 'specs/[0-9]\{3\}-.*'

# Extract number from name
echo "005-speck-skill" | grep -oE '^[0-9]{3}'
```

**TypeScript Regex** (preferred for this project):
```typescript
// More readable and Bun-native
const match = dirName.match(/^(\d{3})-(.+)$/);
if (match) {
  const [, num, shortName] = match;
}
```

---

## Summary: Implementation Checklist

- [ ] **Pattern Matching**: Implement three-tier matching (exact → number → substring)
- [ ] **Context Tracking**: Store recent features mentioned in conversation
- [ ] **Disambiguation**: Show alternatives when multiple features match
- [ ] **Error Messages**: Provide helpful suggestions when feature not found
- [ ] **Conversation State**: Track feature references across turns
- [ ] **File Validation**: Check file existence and suggest alternatives
- [ ] **Fuzzy Matching**: Use Levenshtein distance for typo tolerance
- [ ] **Pronoun Resolution**: Handle "it", "that feature", "the other one" via context

---

## Code Example: Complete Feature Resolution

```typescript
// Integration example for Speck Skill
async function resolveUserFeatureReference(
  userQuery: string,
  conversationState: ConversationState
): Promise<{
  feature: FeatureMatch;
  message: string;  // User-facing explanation
} | {
  error: string;
  alternatives: FeatureMatch[];
}> {
  const repoRoot = await getRepoRoot();

  // Parse feature reference from user query
  const featureRef = extractFeatureReference(userQuery);

  if (!featureRef) {
    return {
      error: 'No feature reference found in your question',
      alternatives: getAllFeatures(repoRoot).slice(0, 5)
    };
  }

  // Resolve with conversation context
  const result = resolveFeatureWithContext(repoRoot, featureRef, conversationState);

  if ('feature' in result) {
    conversationState.currentFeature = result.feature.name;
    conversationState.mentionedFeatures.add(result.feature.name);

    return {
      feature: result.feature,
      message: result.suggestion || `Working with feature: ${result.feature.name}`
    };
  }

  return result;
}
```

---

## References

- **Existing Implementation**: `/Users/nathan/git/github.com/nprbst/speck-005-speck-skill/.speck/scripts/common/paths.ts`
  - `findFeatureDirByPrefix()` - Already implements numeric prefix matching
  - `getCurrentBranch()` - Uses pattern `^(\d{3})-` for branch detection

- **Current Features**: 001-speck-core-project, 002-claude-plugin-packaging, 005-speck-skill

- **Speck Specification**: `/Users/nathan/git/github.com/nprbst/speck-005-speck-skill/specs/005-speck-skill/spec.md`
  - FR-006: Feature directory pattern matching requirement
  - Edge cases: Non-existent references, malformed files, invalid file type requests
