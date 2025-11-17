/**
 * Speck Feature Discovery Implementation Examples
 *
 * This file contains complete, copy-paste-ready implementations of the
 * feature discovery patterns for use in Speck skills and commands.
 *
 * Based on: FEATURE_DISCOVERY_PATTERNS.md
 */

import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

/**
 * Structured feature match result
 */
export interface FeatureMatch {
  path: string;
  name: string;
  number: number;
  shortName: string;
  matchType: 'exact' | 'number' | 'substring';
  alternatives?: FeatureMatch[];
}

/**
 * Conversation context tracking
 */
export interface ConversationState {
  mentionedFeatures: Set<string>;
  currentFeature?: string;
  mentionHistory: Array<{
    feature: string;
    timestamp: number;
    context: string;
  }>;
}

// ============================================================================
// Tier 1: Exact Match on Full Directory Name
// ============================================================================

export function findFeatureByExactName(
  repoRoot: string,
  query: string
): string | null {
  const specsDir = path.join(repoRoot, 'specs');
  const dirs = readdirSync(specsDir, { withFileTypes: true });

  // Exact directory name match - case sensitive, must match entire name
  const exact = dirs.find(d =>
    d.isDirectory() &&
    d.name === query &&
    /^\d{3}-/.test(d.name)
  );

  return exact ? path.join(specsDir, exact.name) : null;
}

// ============================================================================
// Tier 2: Numeric Prefix Match (Number Only or ###-suffix)
// ============================================================================

export function findFeatureByNumber(
  repoRoot: string,
  featureNum: string | number
): string | null {
  const specsDir = path.join(repoRoot, 'specs');
  const numStr = String(featureNum).padStart(3, '0');

  const dirs = readdirSync(specsDir, { withFileTypes: true });
  const matches = dirs.filter(d =>
    d.isDirectory() && d.name.startsWith(`${numStr}-`)
  );

  if (matches.length === 1) {
    return path.join(specsDir, matches[0].name);
  }

  // Multiple matches is an error (shouldn't happen with proper naming)
  if (matches.length > 1) {
    console.error(
      `ERROR: Multiple spec directories found with prefix '${numStr}': ` +
      `${matches.map(m => m.name).join(", ")}`
    );
  }

  return null;
}

// ============================================================================
// Tier 3: Substring and Fuzzy Match
// ============================================================================

export function findFeatureBySubstring(
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
    const shortName = d.name.slice(4);

    // Matching strategies:
    // 1. Full substring match (e.g., "plugin" in "claude-plugin-packaging")
    if (shortName.includes(queryLower)) {
      return true;
    }

    // 2. Word boundary match (e.g., "plugin" starts "plugin-packaging")
    if (shortName.split('-').some(word => word.startsWith(queryLower))) {
      return true;
    }

    return false;
  });

  if (matches.length === 0) return null;

  if (options?.returnMultiple) {
    return matches.map(m => path.join(specsDir, m.name));
  }

  // Single match = unambiguous
  if (matches.length === 1) {
    return path.join(specsDir, matches[0].name);
  }

  // Multiple matches = ambiguous, return null to signal ambiguity
  return null;
}

// ============================================================================
// Helper: Parse Feature Match Into Structured Data
// ============================================================================

export function parseFeatureMatch(
  dirPath: string,
  matchType: 'exact' | 'number' | 'substring'
): FeatureMatch {
  const name = path.basename(dirPath);
  const match = name.match(/^(\d{3})-(.+)$/);

  if (!match) {
    throw new Error(`Invalid feature directory: ${name}`);
  }

  const [, numberStr, shortName] = match;

  return {
    path: dirPath,
    name,
    number: parseInt(numberStr, 10),
    shortName,
    matchType
  };
}

// ============================================================================
// Master Discovery Function: Three-Tier Matching
// ============================================================================

export function findFeature(
  repoRoot: string,
  query: string,
  conversationContext?: { recentlyMentioned?: string[] }
): FeatureMatch | null {
  // Normalize input
  const cleanQuery = query.trim().toLowerCase();

  // TIER 1: Exact match on full directory name
  const exactPath = findFeatureByExactName(repoRoot, cleanQuery);
  if (exactPath) {
    return parseFeatureMatch(exactPath, 'exact');
  }

  // TIER 2: Try numeric prefix (3-digit number)
  if (/^\d+$/.test(cleanQuery)) {
    const numberPath = findFeatureByNumber(repoRoot, cleanQuery);
    if (numberPath) {
      return parseFeatureMatch(numberPath, 'number');
    }
  }

  // TIER 3: Substring match (with disambiguation)
  const substringPaths = findFeatureBySubstring(repoRoot, cleanQuery, {
    returnMultiple: true
  });

  if (!substringPaths) {
    return null; // No substring matches
  }

  if (typeof substringPaths === 'string') {
    // Single unambiguous substring match
    return parseFeatureMatch(substringPaths, 'substring');
  }

  // Multiple substring matches - try to use conversation context
  const matches = (substringPaths as string[]).map(p =>
    parseFeatureMatch(p, 'substring')
  );

  if (conversationContext?.recentlyMentioned?.length) {
    const contextMatch = matches.find(m =>
      conversationContext.recentlyMentioned!.includes(m.name)
    );
    if (contextMatch) {
      return { ...contextMatch, alternatives: matches };
    }
  }

  // No context match, return first with alternatives noted
  return {
    ...matches[0],
    alternatives: matches.slice(1)
  };
}

// ============================================================================
// Get All Features
// ============================================================================

export function getAllFeatures(repoRoot: string): FeatureMatch[] {
  const specsDir = path.join(repoRoot, 'specs');

  if (!existsSync(specsDir)) {
    return [];
  }

  const dirs = readdirSync(specsDir, { withFileTypes: true });
  const features: FeatureMatch[] = [];

  for (const dir of dirs) {
    if (dir.isDirectory() && /^\d{3}-/.test(dir.name)) {
      try {
        features.push(parseFeatureMatch(path.join(specsDir, dir.name), 'exact'));
      } catch (e) {
        // Skip invalid directory names
      }
    }
  }

  // Sort by feature number
  return features.sort((a, b) => a.number - b.number);
}

// ============================================================================
// Fuzzy Matching: Levenshtein Distance for Typo Tolerance
// ============================================================================

function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const d: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  // Initialize first row and column
  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;

  // Fill in the rest
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,    // deletion
        d[i][j - 1] + 1,    // insertion
        d[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return d[m][n];
}

export function suggestSimilar(
  query: string,
  allFeatures: FeatureMatch[],
  options: { maxSuggestions?: number; maxDistance?: number } = {}
): FeatureMatch[] {
  const maxDistance = options.maxDistance ?? 3;
  const maxSuggestions = options.maxSuggestions ?? 3;

  const queryLower = query.toLowerCase();
  const scored = allFeatures
    .map(f => ({
      feature: f,
      score: Math.min(
        levenshteinDistance(queryLower, f.name.toLowerCase()),
        levenshteinDistance(queryLower, f.shortName.toLowerCase())
      )
    }))
    .filter(s => s.score <= maxDistance)
    .sort((a, b) => a.score - b.score)
    .slice(0, maxSuggestions)
    .map(s => s.feature);

  return scored;
}

// ============================================================================
// Resolve with Context-Aware Fallbacks
// ============================================================================

export function resolveFeatureWithContext(
  repoRoot: string,
  query: string,
  conversationState: {
    recentlyMentioned?: string[];
    currentFeature?: string;
  }
): {
  feature: FeatureMatch;
  suggestion?: string;
} | {
  error: string;
  alternatives: FeatureMatch[];
} {
  const match = findFeature(repoRoot, query, conversationState);

  if (match && !match.alternatives) {
    // Unambiguous match
    return { feature: match };
  }

  if (!match) {
    // No match - suggest alternatives
    const allFeatures = getAllFeatures(repoRoot);
    const suggestions = suggestSimilar(query, allFeatures);

    return {
      error: `Feature not found: "${query}"`,
      alternatives: suggestions.length > 0 ? suggestions : allFeatures.slice(0, 3)
    };
  }

  if (match.alternatives && match.alternatives.length > 0) {
    // Ambiguous match

    // Strategy 1: Use conversation context
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
      const currentNum = parseInt(conversationState.currentFeature.slice(0, 3), 10);
      const contextMatch = match.alternatives.find(alt => alt.number === currentNum);
      if (contextMatch) {
        return {
          feature: contextMatch,
          suggestion: `Resolving to "${contextMatch.name}" (current feature).`
        };
      }
    }

    // Return ambiguity message
    return {
      error: `Multiple features match "${query}". Please be more specific.`,
      alternatives: [match, ...match.alternatives]
    };
  }

  return { feature: match };
}

// ============================================================================
// Main Integration: Feature Resolver Class
// ============================================================================

export class SpeckFeatureResolver {
  private conversationState: ConversationState = {
    mentionedFeatures: new Set(),
    mentionHistory: []
  };

  constructor(private repoRoot: string) {}

  /**
   * Resolve a feature reference from user query
   * Updates conversation state automatically
   */
  resolveFeature(query: string): FeatureMatch {
    const result = resolveFeatureWithContext(this.repoRoot, query, {
      recentlyMentioned: Array.from(this.conversationState.mentionedFeatures),
      currentFeature: this.conversationState.currentFeature
    });

    if ('feature' in result) {
      // Update conversation state
      this.conversationState.mentionedFeatures.add(result.feature.name);
      this.conversationState.currentFeature = result.feature.name;
      this.conversationState.mentionHistory.push({
        feature: result.feature.name,
        timestamp: Date.now(),
        context: query
      });

      if (result.suggestion) {
        console.log(`[info] ${result.suggestion}`);
      }

      return result.feature;
    }

    // Handle error case
    const alternatives = result.alternatives
      .map(f => `• ${f.name} (${f.shortName})`)
      .join('\n');

    throw new Error(
      `${result.error}\n\nDid you mean one of these?\n${alternatives}`
    );
  }

  /**
   * Get conversation history
   */
  getHistory(): Array<{
    feature: string;
    timestamp: number;
    context: string;
  }> {
    return this.conversationState.mentionHistory;
  }

  /**
   * Reset conversation state
   */
  reset(): void {
    this.conversationState = {
      mentionedFeatures: new Set(),
      mentionHistory: []
    };
  }
}

// ============================================================================
// Example Usage
// ============================================================================

/*
import { $ } from "bun";

async function example() {
  const repoRoot = await $`git rev-parse --show-toplevel`.quiet().then(r => r.text().trim());

  // Create resolver
  const resolver = new SpeckFeatureResolver(repoRoot);

  // Example 1: User says "005"
  try {
    const match1 = resolver.resolveFeature("005");
    console.log(`Found: ${match1.name}`);
  } catch (e) {
    console.error(e.message);
  }

  // Example 2: User says "plugin"
  try {
    const match2 = resolver.resolveFeature("plugin");
    console.log(`Found: ${match2.name}`);
  } catch (e) {
    console.error(e.message);
  }

  // Example 3: User says "skill" (later in conversation)
  try {
    const match3 = resolver.resolveFeature("skill");
    console.log(`Found: ${match3.name}`);
  } catch (e) {
    console.error(e.message);
  }

  // Show conversation history
  console.log("Conversation history:", resolver.getHistory());
}
*/

export default SpeckFeatureResolver;
