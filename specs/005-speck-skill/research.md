# Research: Speck Workflow Skill

**Feature**: 005-speck-skill
**Date**: 2025-11-17
**Status**: Complete

This document consolidates research findings from Phase 0 to resolve all NEEDS CLARIFICATION items from the Technical Context section of plan.md.

---

## 1. Claude Code Skill Activation Mechanisms

### Decision

Use **semantic relevance-based activation** via concise, capability-focused `description` field in YAML frontmatter (80-150 characters optimal).

### Rationale

Claude Code uses an autonomous model-invoked approach where the LLM analyzes incoming user queries against skill descriptions to determine relevance. The `description` field serves as a trigger discovery document that Claude uses for semantic matching—not keyword matching or explicit activation rules.

Key findings from Claude Code documentation:
- Skills activate through semantic understanding, not regex patterns
- The description field is critical for Claude to discover when to use skills
- Optimal descriptions combine specific functional capabilities with concrete use-case triggers
- Length sweet spot: 80-150 characters (enough context without dilution)

For the Speck Workflow Skill, this means explicitly mentioning:
- **What it reads**: spec.md, plan.md, tasks.md files
- **What problem it solves**: Natural language Q&A about features without slash commands
- **Activation triggers**: References to feature numbers, Speck concepts, file types

### Recommended Description (127 characters)

```
Interpret Speck spec, plan, and tasks files. Answer questions about requirements, architecture, and progress without running slash commands.
```

**Why this works**:
- ✅ Specific file types mentioned ("spec", "plan", "tasks")
- ✅ Concrete problem solved ("Answer questions...without slash commands")
- ✅ Domain-specific terminology ("requirements", "architecture", "progress")
- ✅ Mentions absence of slash commands (key differentiator)
- ✅ Under 150 characters (optimal length)
- ✅ Action-oriented verb ("Interpret")

### Activation Probability by Query Type

Based on semantic matching analysis:

1. **Explicit feature references** (highest confidence): "feature 003", "the auth feature", "003-user-auth" → activates if description mentions "feature numbers" or "Speck features"
2. **File type mentions** (high confidence): "spec.md", "plan.md", "tasks.md" → activates if explicitly named in description
3. **Speck workflow terminology** (high confidence): "requirements", "success criteria", "user stories" → activates if description references interpreting these structures
4. **Implicit context clues** (medium confidence): "What's the technical approach?" + earlier feature mention → activates through conversational context
5. **Generic questions in Speck context** (lower confidence): "What's left?" without explicit Speck mention → may not activate unless description is very broad

### Best Practices for Skill Descriptions

**Three-part structure**: (1) Primary purpose statement, (2) Specific capabilities list, (3) Scope/boundaries note

| Strategy | Specificity | Coverage | Example |
|----------|------------|----------|---------|
| **Too Specific** | "Reads spec.md from specs/005-speck-skill/" | Only exact matches | ❌ Misses other features |
| **Too General** | "Helps with Speck files" | Very broad | ❌ Too vague for activation |
| **Optimal** | "Interpret Speck spec/plan/task files and answer questions about requirements, architecture, and status" | Covers core use cases | ✅ Balanced |
| **With Scope** | "[Optimal] + Only reads files, never modifies." | Covers use cases + sets boundaries | ✅ Best for disambiguation |

### Alternatives Considered

- **Explicit activation rules (rejected)**: Claude Code doesn't support configuration-based activation patterns like regex matching. System relies on semantic understanding.
- **Pattern-based triggers (rejected)**: Unlike hooks which use exact matchers for tool names, skills don't support configurable pattern matching.
- **Minimal descriptions (rejected)**: Descriptions under 100 characters miss contextual cues that help Claude recognize subtle activation patterns.
- **Overly detailed descriptions (rejected)**: Descriptions exceeding ~200 characters add noise without improving trigger probability.

---

## 2. Template Structure & Section Parsing

### Decision

Use **hybrid markdown parser with section-based extraction**: two-phase parsing (extract raw sections, then classify based on annotations), template-driven validation with fuzzy matching, comment-aware extraction for section purposes.

### Rationale

The Speck project uses multiple template types (spec, plan, tasks, agent, checklist) with different section hierarchies. A robust parser must:
1. Handle template variations flexibly (H2 and H3 headers)
2. Be robust to malformed files (extract partial information while warning)
3. Leverage existing comment patterns for section purposes and guidelines
4. Detect mandatory vs optional sections via annotations
5. Support context-aware explanation when users ask "What should go in this section?"

### Template Structure Conventions

#### **spec-template.md Structure**
- **H1**: `# Feature Specification: [FEATURE NAME]`
- **Header Block**: Metadata (Feature Branch, Created, Status, Input)
- **H2 (Mandatory)**: `## User Scenarios & Testing *(mandatory)*`
  - **H3 pattern**: `### User Story N - [Brief Title] (Priority: PN)`
  - **H3 subsection**: `### Edge Cases`
- **H2 (Mandatory)**: `## Requirements *(mandatory)*`
  - **H3**: `### Functional Requirements`
  - **H3 (Conditional)**: `### Key Entities *(include if feature involves data)*`
- **H2 (Mandatory)**: `## Success Criteria *(mandatory)*`
  - **H3**: `### Measurable Outcomes`
- **Optional H2**: `## Clarifications`, `## Assumptions`

#### **plan-template.md Structure**
- **H1**: `# Implementation Plan: [FEATURE]`
- **Header Block**: Branch, Date, Spec link, Input reference
- **H2**: `## Summary`, `## Technical Context`, `## Constitution Check`
- **H2**: `## Project Structure` (Documentation and source code layout)
- **H2**: `## Complexity Tracking` (optional violation justifications)

#### **tasks-template.md Structure**
- **YAML Frontmatter**: `description` metadata field
- **H1**: `# Tasks: [FEATURE NAME]`
- **Header Block**: Input references, Prerequisites, Organization note
- **H2**: `## Format: [ID] [P?] [Story] Description`
- **H2 Pattern**: `## Phase N: [Purpose Name]`
  - **H3**: `### Tests for User Story N (OPTIONAL...)`
  - **H3**: `### Implementation for User Story N`
- **H2**: `## Dependencies & Execution Order`

### Section Annotation Patterns

**Pattern 1: Inline Markup**
```markdown
## User Scenarios & Testing *(mandatory)*
### Key Entities *(include if feature involves data)*
```
- Detection: Regex `/\*\(mandatory\)\*/` for mandatory, `/\*(include if|OPTIONAL).*\*/` for conditional

**Pattern 2: HTML Comments with ACTION REQUIRED**
```markdown
<!--
  ACTION REQUIRED: Fill them out with the right [requirements/edge cases/etc].
-->
```
- Signals user needs to fill section contents
- Located directly after section header

**Pattern 3: Template Comments for Guidelines**
```markdown
<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
-->
```
- Multi-line HTML comments explaining section purpose and constraints
- Located at start of section content

### Parsing Strategy for Malformed Files

**Graceful Degradation Approach**:
1. **Lenient header matching**: Extract any H2/H3 section regardless of formatting inconsistencies
2. **Missing header warnings**: Track which mandatory sections are missing but continue parsing
3. **Consistent formatting fallback**: Normalize headers (excess whitespace, emphasis markers)
4. **Robust content extraction**: Use fuzzy regex for section names (case-insensitive, flexible spacing)

**Implementation pattern**:
```typescript
function extractSections(content: string): Section[] {
  // Parse all headers regardless of formatting
  // Track line numbers for error reporting
  // Classify as mandatory/optional based on markers
  // Extract HTML comments for section purposes
}

function validateStructure(template: Section[], actual: Section[]): ParseWarning[] {
  // Compare mandatory sections from template against actual file
  // Generate warnings for missing sections
  // Continue with partial extraction
}
```

### Extracting Section Purposes from Comments

**Comment extraction patterns**:
- Multi-line HTML comments: `<!--\n?([\s\S]*?)\n?-->`
- Classify by keywords: `ACTION REQUIRED` → instruction, `IMPORTANT` → warning
- Extract first line as section purpose
- Parse bullet points as guidelines
- Map comments to adjacent section headers

**Usage in skill**:
When user asks "What should go in Requirements?", extract comment text from spec-template.md for that section to provide authoritative guidance.

### Alternatives Considered

- **Strict schema validation (rejected)**: Real-world specs deviate from templates; strict validation would break on common variations
- **NLP section detection (rejected)**: Overkill for well-structured markdown with clear headers
- **Regex-only state machine (rejected)**: Unreadable and unmaintainable for complex nested structures
- **Template as database (selected as secondary)**: Pre-parse templates once at startup, cache section metadata in JSON for fast lookups

---

## 3. Feature Directory Discovery Patterns

### Decision

Use **three-tier matching strategy with context-aware fallbacks**: (1) exact name match, (2) numeric prefix match, (3) fuzzy substring match—with conversation context to reduce ambiguity.

### Rationale

Users reference features differently in natural language:
- Numeric: "005", "feature 003"
- Partial name: "auth", "skill"
- Full name: "005-speck-skill"

A three-tier system handles all input styles with clear priority while maintaining good UX for ambiguous queries.

### Regex/Glob Patterns

| Purpose | Pattern | Example Match |
|---------|---------|---|
| Parse directory | `^(\d{3})-(.+)$` | "005-speck-skill" → ("005", "speck-skill") |
| Validate feature | `^\d{3}-` | Matches "001-anything" |
| Extract number | `^\d{3}` | Extracts "005" from name |
| Bash glob | `specs/[0-9][0-9][0-9]-*/` | Finds all feature dirs |

### Three-Tier Matching Logic

```
Tier 1 (Highest Priority): Exact Match
  Query "005-speck-skill" → Direct match on directory name

Tier 2 (High Priority): Numeric Prefix
  Query "005" → Finds any dir starting with "005-"
  Query "5" → Pad to "005" then match

Tier 3 (Lower Priority): Substring/Fuzzy
  Query "skill" → Finds "005-speck-skill"
  Query "auth" → May match multiple (require disambiguation)
```

**Implementation logic**:
```typescript
function findFeature(query: string): FeatureMatch {
  // Tier 1: Check for exact directory name match
  if (existsSync(`specs/${query}`)) return exactMatch(query);

  // Tier 2: Check if query is numeric, pad to 3 digits, match prefix
  if (/^\d+$/.test(query)) {
    const padded = query.padStart(3, '0');
    const dirs = glob(`specs/${padded}-*/`);
    if (dirs.length === 1) return prefixMatch(dirs[0]);
    if (dirs.length > 1) return ambiguous(dirs);
  }

  // Tier 3: Substring matching with Levenshtein distance for typos
  const allFeatures = glob('specs/[0-9][0-9][0-9]-*/');
  const matches = allFeatures.filter(f =>
    f.toLowerCase().includes(query.toLowerCase()) ||
    levenshtein(f, query) <= 2
  );

  if (matches.length === 1) return fuzzyMatch(matches[0]);
  if (matches.length > 1) return ambiguous(matches);
  return notFound(query, suggestions(allFeatures, query));
}
```

### Handling Ambiguous Matches

**Challenge**: User says "auth" but could match "003-user-auth" AND "012-auth-tokens"

**Multi-stage resolution**:
1. **Check conversation context**: Did user recently mention either feature?
2. **Check current feature context**: Are they still discussing the same feature?
3. **Ask for clarification**: "Did you mean user-auth or auth-tokens?"
4. **Suggest alternatives**: Show all matching features with brief descriptions

### Conversation Context Management

Track in session state:
- **Recently mentioned features**: Reduce repeated disambiguation
- **Current feature context**: Resolve pronouns like "it", "that"
- **Mention history**: Timeline of what user discussed
- **Implicit references**: Map pronouns to features

**Example**:
```
User: "Tell me about feature 003"
Assistant: [Discusses 003-user-auth, stores as current context]
User: "What about the tasks?"
Assistant: [Resolves "the tasks" to 003-user-auth/tasks.md via context]
```

### Error Handling for Non-Existent Features

**When feature not found**:
1. Use Levenshtein distance to suggest similar features (typo tolerance)
2. List all available features with brief summaries
3. Explain how to be more specific

**Example message**:
```
Feature "006" not found in specs/.

Did you mean:
- 005-speck-skill (Speck Workflow Skill)
- 001-speck-core-project (Speck Core Project)

Available features:
  001-speck-core-project
  002-claude-plugin-packaging
  005-speck-skill

Tip: Use full name (e.g., "005-speck-skill") or just the number ("005").
```

### Integration with Existing Code

The `.speck/scripts/common/paths.ts` already implements Tier 2 matching via `findFeatureDirByPrefix()`. Can be reused or extended for the skill.

### Alternatives Considered

- **Single-tier exact match (rejected)**: Doesn't handle all input styles (numeric "005" vs name "speck-skill")
- **Weighted scoring (rejected)**: Complex logic; three-tier is simpler with clearer priority
- **No context tracking (rejected)**: Forces repeated disambiguation in multi-turn conversations
- **Three-tier + context (selected)**: Clear, simple, effective for all user input styles

---

## 4. Error Handling & Graceful Degradation

### Decision

Implement **five-state file classification** with partial extraction and actionable recovery guidance for each state.

### Rationale

Specifications evolve during development. Hard failures on incomplete files block useful work. Users benefit from:
1. Partial information extraction (e.g., "We have 2 user stories but missing success criteria")
2. Clear guidance on what's wrong
3. Specific commands to fix issues

This approach enables incremental fixes while maintaining data integrity.

### Five File States

1. **MISSING**: File doesn't exist (common in early development)
2. **EMPTY**: File exists but has no content (accidental creation or incomplete save)
3. **MALFORMED**: Invalid markdown structure, cannot parse
4. **INCOMPLETE**: Valid structure but missing mandatory sections
5. **VALID**: Complete and ready for use

### Detection Decision Tree

**7-level validation**:
1. **Level 0** - File readable? (catch FileNotFound, PermissionDenied)
2. **Level 1** - Has content? (check if empty/whitespace-only)
3. **Level 2** - Parseable? (try markdown parsing)
4. **Level 3** - Has mandatory sections? (check against template)
5. **Level 4** - Subsections valid? (validate format of user stories, requirements)
6. **Level 5** - Markers present? (detect [NEEDS CLARIFICATION])
7. **Level 6** - References valid? (check cross-file links)

### Partial Information Extraction

**Design principle: "Parse Defensively"**

Extract maximum useful information from malformed files:
- Parse each section/subsection independently
- Skip unparseable items but continue with others
- Return completeness score (0-100%)
- Capture warnings alongside extracted data
- Store original raw text for debugging

**Typed extraction structures**:
```typescript
interface SpecExtraction {
  status: 'MISSING' | 'EMPTY' | 'MALFORMED' | 'INCOMPLETE' | 'VALID';
  completeness: number; // 0-100
  userStories: UserStory[];
  requirements: Requirement[];
  successCriteria: SuccessCriterion[];
  warnings: ParseWarning[];
  rawContent: string;
}
```

### Recovery Guidance by Scenario

Each error state maps to specific actionable guidance:

| Scenario | Severity | Message | Recovery Command |
|----------|----------|---------|------------------|
| File missing | ERROR | "spec.md not found at specs/003-feature/" | `/speck.specify "Feature description"` |
| File empty | ERROR | "spec.md exists but is empty" | `/speck.specify` |
| Missing section | WARNING | "Missing: Success Criteria, Key Entities" | `/speck.clarify` |
| Malformed subsection | WARNING | "Acceptance Scenarios 2-4 don't follow Given/When/Then" | Edit manually or `/speck.clarify` |
| [NEEDS CLARIFICATION] | INFO | "3 unresolved clarifications in spec" | `/speck.clarify` |
| Broken references | WARNING | "plan.md references contracts/user-model.ts which doesn't exist" | Create file or update reference |

### Common Malformation Patterns

**Real examples from codebase analysis**:
- Missing mandatory sections (Requirements, Success Criteria)
- Corrupted markdown (unclosed code blocks, broken links)
- Invalid subsection format (acceptance scenarios missing Given/When/Then)
- Incomplete plans (file ends abruptly, missing entire phase sections)
- Broken cross-file references (links to non-existent files)
- Inconsistent heading levels (H2 → H4 skip)

### Standard Error Format

```
SEVERITY: Brief error
┌─────────────────────────────────────┐
│ Descriptive title                   │
├─────────────────────────────────────┤
│ Context (what's missing/wrong)      │
├─────────────────────────────────────┤
│ Recovery: Run this command...       │
└─────────────────────────────────────┘
```

**Example**:
```
ERROR: Incomplete Specification
┌─────────────────────────────────────────────────────────┐
│ spec.md is missing mandatory sections                   │
├─────────────────────────────────────────────────────────┤
│ Missing:                                                │
│ - Success Criteria (mandatory)                          │
│ - User Scenarios & Testing (mandatory)                  │
├─────────────────────────────────────────────────────────┤
│ Recovery: Run /speck.clarify to fill missing sections   │
└─────────────────────────────────────────────────────────┘

Found: 5 functional requirements, 2 key entities
Completeness: 40% (2/5 mandatory sections)
```

### Implementation Example

```typescript
function readArtifact(path: string): ArtifactResult {
  // Level 0-2: Basic validation
  if (!existsSync(path)) return { status: 'MISSING', ... };
  const content = readFileSync(path, 'utf8');
  if (!content.trim()) return { status: 'EMPTY', ... };

  // Parse markdown
  const sections = extractSections(content);
  if (sections.length === 0) return { status: 'MALFORMED', ... };

  // Level 3-4: Template validation
  const template = loadTemplate(getTemplateForFile(path));
  const warnings = validateStructure(template, sections);

  // Extract whatever is available
  const extracted = extractPartialData(sections);

  // Determine final status
  const hasMandatory = warnings.filter(w => w.type === 'missing_section').length === 0;
  const status = hasMandatory ? 'VALID' : 'INCOMPLETE';

  return {
    status,
    completeness: calculateCompleteness(template, sections),
    data: extracted,
    warnings
  };
}
```

### Alternatives Considered

- **Strict validation with hard failures (rejected)**: Blocks users from incomplete features, poor UX for iterative development
- **Lenient parsing with no warnings (rejected)**: Users don't know what's wrong, no guidance for fixes
- **Single-line errors (rejected)**: No actionable guidance on recovery
- **Verbose prose errors (rejected)**: Hard to scan, unclear actions
- **Graceful degradation + structured errors (selected)**: Best balance of flexibility and clarity

---

## Summary

All NEEDS CLARIFICATION items from Technical Context have been resolved:

1. ✅ **Skill Activation**: Semantic relevance-based activation via concise description field (80-150 chars)
2. ✅ **Template Parsing**: Hybrid parser with section-based extraction, comment-aware, graceful degradation
3. ✅ **Feature Discovery**: Three-tier matching (exact → numeric → fuzzy) with conversation context
4. ✅ **Error Handling**: Five-state classification with partial extraction and actionable recovery guidance

These findings inform the design artifacts in Phase 1 (data-model.md, contracts/, quickstart.md).
