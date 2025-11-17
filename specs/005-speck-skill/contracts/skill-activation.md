# Contract: Skill Activation

**Feature**: 005-speck-skill
**Date**: 2025-11-17
**Purpose**: Define the contract for when and how the Speck Workflow Skill activates

---

## Overview

This contract specifies the input patterns that should trigger skill activation and the decision output. The skill uses **semantic relevance matching** rather than explicit keyword matching.

---

## Input: User Query Patterns

### Input Schema

```typescript
interface UserQuery {
  text: string;              // Natural language query
  conversationContext: {
    recentlyMentioned: string[];  // Feature IDs mentioned in last 5 turns
    currentFeature?: string;      // Currently active feature context
  };
}
```

### Expected Activation Triggers

#### 1. Explicit Feature References (Highest Confidence)

**Pattern**: Direct mention of feature numbers or full names

```
Examples:
- "Tell me about feature 003"
- "What's in 005-speck-skill?"
- "Show me the spec for the auth feature"
- "What are the requirements for 001-speck-core-project?"
```

**Activation**: ✅ **SHOULD activate** (90%+ confidence)

**Rationale**: User explicitly references a Speck feature by number or name. Skill's description mentions "feature" and "spec files."

---

#### 2. File Type Mentions (High Confidence)

**Pattern**: Direct reference to spec.md, plan.md, or tasks.md

```
Examples:
- "What's in the spec.md file?"
- "Does my plan.md follow the template?"
- "Show me the tasks for this feature"
- "What's in the Requirements section of the spec?"
```

**Activation**: ✅ **SHOULD activate** (85%+ confidence)

**Rationale**: User explicitly names Speck artifact files. Skill description mentions "spec, plan, and tasks files."

---

#### 3. Speck Workflow Terminology (High Confidence)

**Pattern**: Questions about requirements, success criteria, user stories, architecture decisions

```
Examples:
- "What are the functional requirements?"
- "What success criteria do we have?"
- "What user stories are prioritized?"
- "What's the technical approach?"
- "What are the architecture decisions?"
```

**Activation**: ✅ **SHOULD activate** (80%+ confidence)

**Rationale**: User asks about specific Speck sections using domain terminology. Skill description mentions "requirements, architecture, and progress."

---

#### 4. Implicit Context Clues (Medium Confidence)

**Pattern**: Follow-up questions after feature discussion

```
Example conversation:
User: "Tell me about feature 003"
Assistant: [Discusses 003-user-auth]
User: "What about the tasks?"  ← Implicit reference to 003-user-auth/tasks.md
```

**Activation**: ✅ **SHOULD activate** (70%+ confidence)

**Rationale**: Conversation context provides feature reference. "The tasks" resolves to current feature's tasks.md via context tracking.

---

#### 5. Generic Questions in Speck Context (Lower Confidence)

**Pattern**: Vague questions without explicit Speck mentions

```
Examples:
- "What's left?" (no feature context)
- "What should I do next?" (no feature mention)
- "Can you help with the project?" (too generic)
```

**Activation**: ❌ **SHOULD NOT activate** (below 50% confidence)

**Rationale**: No clear Speck-specific triggers. Too ambiguous without explicit feature references or context.

---

## Output: Activation Decision

### Output Schema

```typescript
interface ActivationDecision {
  activate: boolean;         // Whether skill should activate
  confidence: number;        // 0-100 confidence score
  reason: string;            // Why activation decision was made
  extractedContext: {
    featureReference?: string;   // Extracted feature number/name
    fileType?: 'spec' | 'plan' | 'tasks';
    section?: string;            // Extracted section name
  };
}
```

### Decision Logic

```typescript
function shouldActivate(query: UserQuery): ActivationDecision {
  // Check for explicit feature references
  if (hasFeatureNumber(query.text) || hasFeatureName(query.text)) {
    return { activate: true, confidence: 90, reason: "Explicit feature reference" };
  }

  // Check for file type mentions
  if (mentionsSpecFile(query.text) || mentionsPlanFile(query.text) || mentionsTasksFile(query.text)) {
    return { activate: true, confidence: 85, reason: "File type mentioned" };
  }

  // Check for Speck workflow terminology
  if (hasSpeckTerminology(query.text)) {
    return { activate: true, confidence: 80, reason: "Speck workflow terminology" };
  }

  // Check conversation context
  if (query.conversationContext.currentFeature && hasImplicitReference(query.text)) {
    return { activate: true, confidence: 70, reason: "Implicit context reference" };
  }

  // Too generic, don't activate
  return { activate: false, confidence: 30, reason: "No clear Speck-specific triggers" };
}
```

---

## Examples with Expected Outcomes

### Example 1: Explicit Feature Reference

**Input**:
```json
{
  "text": "What are the functional requirements for feature 005?",
  "conversationContext": {
    "recentlyMentioned": [],
    "currentFeature": null
  }
}
```

**Expected Output**:
```json
{
  "activate": true,
  "confidence": 90,
  "reason": "Explicit feature reference",
  "extractedContext": {
    "featureReference": "005",
    "fileType": "spec",
    "section": "Requirements"
  }
}
```

---

### Example 2: File Type Mention with Section

**Input**:
```json
{
  "text": "Does my plan.md include all mandatory sections?",
  "conversationContext": {
    "recentlyMentioned": ["005-speck-skill"],
    "currentFeature": "005-speck-skill"
  }
}
```

**Expected Output**:
```json
{
  "activate": true,
  "confidence": 85,
  "reason": "File type mentioned",
  "extractedContext": {
    "featureReference": "005-speck-skill",
    "fileType": "plan",
    "section": null
  }
}
```

---

### Example 3: Implicit Context Reference

**Input**:
```json
{
  "text": "What tasks are left?",
  "conversationContext": {
    "recentlyMentioned": ["003-user-auth", "005-speck-skill"],
    "currentFeature": "003-user-auth"
  }
}
```

**Expected Output**:
```json
{
  "activate": true,
  "confidence": 70,
  "reason": "Implicit context reference",
  "extractedContext": {
    "featureReference": "003-user-auth",
    "fileType": "tasks",
    "section": null
  }
}
```

---

### Example 4: Too Generic (Should Not Activate)

**Input**:
```json
{
  "text": "Can you help me with something?",
  "conversationContext": {
    "recentlyMentioned": [],
    "currentFeature": null
  }
}
```

**Expected Output**:
```json
{
  "activate": false,
  "confidence": 20,
  "reason": "No clear Speck-specific triggers",
  "extractedContext": {}
}
```

---

## Edge Cases

### Edge Case 1: Ambiguous File Reference

**Query**: "What's in the file?"

**Without context**: ❌ Should not activate (too vague)
**With context** (user previously mentioned "spec.md"): ✅ Should activate (resolve via conversation history)

---

### Edge Case 2: Multiple Features Mentioned

**Query**: "Compare the requirements between feature 003 and feature 005"

**Expected**: ✅ Should activate
**Reason**: Explicit feature references for both
**Extracted Context**: `featureReference: ["003", "005"], fileType: "spec", section: "Requirements"`

---

### Edge Case 3: Non-Speck Question About Specifications

**Query**: "What's the specification for HTTP/2?"

**Expected**: ❌ Should not activate
**Reason**: "Specification" in general sense, not Speck artifact. No feature reference or Speck terminology.

---

### Edge Case 4: Slash Command Mention

**Query**: "Should I run /speck.specify or /speck.clarify first?"

**Expected**: ✅ Should activate
**Reason**: User asking about Speck workflow commands. Skill can explain workflow order.

---

## Acceptance Criteria

1. ✅ Skill activates for explicit feature references with 90%+ confidence
2. ✅ Skill activates for file type mentions (spec.md, plan.md, tasks.md) with 85%+ confidence
3. ✅ Skill activates for Speck workflow terminology (requirements, success criteria, etc.) with 80%+ confidence
4. ✅ Skill activates for implicit references when conversation context provides feature with 70%+ confidence
5. ✅ Skill does NOT activate for generic questions without Speck-specific triggers (below 50% confidence)
6. ✅ Skill extracts feature reference, file type, and section from query when available
7. ✅ Skill handles ambiguous references by checking conversation context before failing

---

## Notes

- **Semantic matching**: Claude Code performs semantic analysis, not exact keyword matching. The confidence levels are approximate based on semantic relevance.
- **Description field impact**: Skill activation heavily depends on the skill's `description` field in YAML frontmatter. The recommended description explicitly mentions "spec, plan, and tasks files" and "requirements, architecture, and progress."
- **No false positives**: Skill should err on the side of not activating for generic queries to avoid interfering with other skills or general Claude Code assistance.
- **Context awareness**: Conversation context is critical for resolving implicit references and maintaining natural multi-turn dialogue.
