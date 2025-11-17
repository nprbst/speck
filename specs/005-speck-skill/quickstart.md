# Quickstart: Speck Workflow Skill

**Feature**: 005-speck-skill
**Date**: 2025-11-17
**Purpose**: User-facing guide for interacting with the Speck Workflow Skill

---

## What is the Speck Workflow Skill?

The Speck Workflow Skill is a Claude Code skill that enables natural language interaction with your Speck specifications, plans, and tasks—**without running slash commands**. Instead of remembering commands like `/speck.specify` or `/speck.plan`, you can simply ask Claude questions about your features, and the skill automatically activates to help you.

**Key Benefits**:
- 📖 Ask questions about specs naturally: "What are the requirements for feature 003?"
- 🔍 Understand plans without manual reading: "What's the technical approach?"
- ✅ Check task status conversationally: "What tasks are left for the auth feature?"
- 🎯 Compare files against templates: "Does my spec follow the template?"
- 🛡️ Graceful handling of incomplete files: Get partial answers even from in-progress specs

---

## Installation

The Speck Workflow Skill is included in the Speck plugin. If you have Speck installed, the skill is already available.

**Verification**:
```bash
# Check if skill file exists
ls .claude/skills/speck-workflow.md
```

If the file exists, the skill is installed and will activate automatically when you ask Speck-related questions.

---

## How to Use

### 1. Ask Questions About Features

The skill automatically activates when you mention feature numbers, file names, or Speck concepts.

#### Examples:

**Ask about requirements**:
```
User: What are the functional requirements for feature 005?
Claude: [Skill activates, reads specs/005-speck-skill/spec.md, lists FR-001 through FR-012]
```

**Ask about technical approach**:
```
User: What's the technical approach for the speck skill?
Claude: [Skill activates, reads specs/005-speck-skill/plan.md, explains Technical Context section]
```

**Ask about task status**:
```
User: How many tasks are completed for feature 001?
Claude: [Skill activates, reads specs/001-speck-core-project/tasks.md, counts completed tasks]
```

---

### 2. Reference Features Flexibly

The skill understands multiple ways to reference features:

| Reference Style | Example | What It Matches |
|-----------------|---------|-----------------|
| **Numeric** | "feature 005" or just "005" | specs/005-speck-skill/ |
| **Short name** | "speck-skill" | specs/005-speck-skill/ |
| **Full name** | "005-speck-skill" | specs/005-speck-skill/ |
| **Descriptive** | "the skill feature" | Searches for matching feature names |

**Examples**:

```
✅ "Tell me about feature 003"
✅ "What's in 005-speck-skill?"
✅ "Show me the spec for the auth feature"
✅ "What are the requirements for user authentication?"
```

---

### 3. Ask About Specific Sections

The skill understands Speck structure and can extract specific sections:

**User Scenarios**:
```
User: What user stories are in the spec for feature 005?
Claude: [Lists all user stories with priorities and acceptance scenarios]
```

**Requirements**:
```
User: Show me the functional requirements for the auth feature
Claude: [Lists all FR-XXX requirements from specs/003-user-auth/spec.md]
```

**Success Criteria**:
```
User: What are the success criteria for feature 002?
Claude: [Lists all SC-XXX items from specs/002-claude-plugin-packaging/spec.md]
```

**Technical Context**:
```
User: What technologies are we using for the plugin packaging feature?
Claude: [Reads Technical Context section from plan.md]
```

---

### 4. Compare Against Templates

Check if your specs/plans/tasks follow the correct structure:

```
User: Does my spec for feature 005 follow the template?
Claude: [Compares specs/005-speck-skill/spec.md against .specify/templates/spec-template.md]
        ✅ Structure: 100% match
        ⚠️  Missing: Success Criteria section
        Recommendation: Add ## Success Criteria *(mandatory)* section
```

```
User: Is my plan.md complete?
Claude: [Validates plan.md structure]
        ✅ All mandatory sections present
        ✅ Constitution Check passed
        ✓ Ready for task generation
```

---

### 5. Handle Incomplete or Malformed Files

The skill gracefully handles incomplete specs and provides actionable guidance:

**Missing file**:
```
User: What's in the spec for feature 006?
Claude: ❌ spec.md not found at specs/006-feature/
        Recovery: Run /speck.specify "Feature description" to create the spec
```

**Incomplete spec**:
```
User: Show me the requirements for feature 004
Claude: ⚠️  spec.md is incomplete (66% complete)
        Found: 5 functional requirements
        Missing: Success Criteria (mandatory)
        Recovery: Run /speck.clarify to add missing sections
```

**Unresolved clarifications**:
```
User: Is the spec for feature 003 ready for planning?
Claude: ⚠️  spec.md has 3 unresolved [NEEDS CLARIFICATION] markers
        Recovery: Run /speck.clarify to resolve clarifications before /speck.plan
```

---

## Query Patterns That Activate the Skill

The skill activates automatically for these types of questions:

### ✅ High Confidence Triggers

These queries reliably activate the skill:

1. **Feature references**: "feature 003", "005-speck-skill", "the auth feature"
2. **File mentions**: "spec.md", "plan.md", "tasks.md"
3. **Section names**: "requirements", "success criteria", "user stories", "technical approach"
4. **Speck workflow terms**: "acceptance scenarios", "functional requirements", "architecture decisions"

### ❌ Won't Activate

These queries are too generic and won't activate the skill:

1. **No Speck context**: "Can you help me?" (too vague)
2. **Generic spec questions**: "What's the specification for HTTP/2?" (not about Speck artifacts)
3. **Implementation questions**: "How do I write TypeScript?" (not about Speck files)

### 💡 Tip: Be Specific

If the skill doesn't activate when expected, be more specific:

| Too Vague | Better |
|-----------|--------|
| "What's left?" | "What tasks are left for feature 005?" |
| "Show me the plan" | "Show me plan.md for the speck skill" |
| "Is it complete?" | "Is spec.md for feature 003 complete?" |

---

## Multi-Turn Conversations

The skill maintains conversation context, so you can ask follow-up questions naturally:

```
User: Tell me about feature 005
Claude: [Discusses 005-speck-skill: "This feature creates a Claude Skill..."]

User: What are its requirements?
Claude: [Knows we're still discussing 005, reads spec.md requirements]

User: And the success criteria?
Claude: [Still in context, reads success criteria section]

User: Does the plan follow the constitution?
Claude: [Reads plan.md Constitution Check section for feature 005]
```

**Context is maintained for**:
- Recently mentioned features (last 5 turns)
- Current feature being discussed
- Implied references ("it", "that", "the plan")

---

## Troubleshooting

### Issue: Skill doesn't activate when expected

**Symptom**: You ask about a spec but Claude doesn't read it automatically

**Solutions**:
1. Be more specific: Mention the feature number or file type explicitly
   - ❌ "What's in the file?"
   - ✅ "What's in spec.md for feature 005?"

2. Use Speck terminology: Mention sections or concepts
   - ❌ "What do we need to build?"
   - ✅ "What are the functional requirements?"

3. Reference the feature first:
   - "Tell me about feature 005" (establishes context)
   - "What are the requirements?" (skill uses context)

---

### Issue: Skill activates but can't find the file

**Symptom**: Skill tries to read a file but it doesn't exist

**Solutions**:
1. Check the feature directory exists:
   ```bash
   ls specs/
   ```

2. Verify the file exists:
   ```bash
   ls specs/005-speck-skill/spec.md
   ```

3. Create the file if missing:
   ```bash
   /speck.specify "Feature description"
   ```

---

### Issue: Skill reports file is malformed

**Symptom**: Skill warns about missing sections or invalid structure

**Solutions**:
1. Check mandatory sections are present:
   - spec.md: User Scenarios, Requirements, Success Criteria
   - plan.md: Summary, Technical Context, Constitution Check
   - tasks.md: Format, Phase sections

2. Run clarify to fix structure:
   ```bash
   /speck.clarify
   ```

3. Compare against template manually:
   ```bash
   diff specs/005-speck-skill/spec.md .specify/templates/spec-template.md
   ```

---

## Advanced Usage

### Compare Multiple Features

```
User: Compare the requirements between feature 003 and feature 005
Claude: [Reads both specs, extracts FR-XXX from each, presents side-by-side comparison]
```

### Check Workflow Phase

```
User: Which features are ready for task generation?
Claude: [Checks all feature directories, identifies which have complete plan.md]
        Ready: 001-speck-core-project, 002-claude-plugin-packaging
        Not Ready: 005-speck-skill (plan.md incomplete)
```

### Explain Template Structure

```
User: What should go in the Success Criteria section?
Claude: [Reads .specify/templates/spec-template.md, extracts HTML comments explaining section purpose]
        "Success Criteria must contain measurable outcomes (SC-XXX format)..."
```

---

## Best Practices

### ✅ Do This

1. **Be specific with feature references**: Use numbers or full names
2. **Ask about specific sections**: "requirements", "tasks", "technical approach"
3. **Let the skill handle file reading**: Don't manually use `/cat` or `Read` tool
4. **Use natural language**: The skill understands conversational queries
5. **Check completeness before progressing**: "Is the spec complete?" before running `/speck.plan`

### ❌ Avoid This

1. **Don't be too vague**: "What's in the file?" → "What's in spec.md for feature 005?"
2. **Don't assume context without establishing it**: First mention the feature, then ask follow-ups
3. **Don't ask about implementation details**: The skill reads specs/plans/tasks, not source code
4. **Don't expect file modification**: The skill only reads files; use slash commands to modify

---

## When to Use Slash Commands Instead

The skill is for **reading and understanding** Speck artifacts. Use slash commands for:

| Task | Use This Command |
|------|------------------|
| Create new spec | `/speck.specify "Feature description"` |
| Resolve clarifications | `/speck.clarify` |
| Generate plan | `/speck.plan` |
| Generate tasks | `/speck.tasks` |
| Analyze consistency | `/speck.analyze` |
| Create checklist | `/speck.checklist` |

**When in doubt**: If you need to **create or modify** files, use slash commands. If you want to **read or understand** existing files, just ask naturally and let the skill handle it.

---

## Examples by Use Case

### Use Case 1: Starting a New Feature Review

```
User: I want to review feature 003. What does the spec say?
Claude: [Skill activates, reads specs/003-user-auth/spec.md]
        Feature: User Authentication
        Status: Draft
        User Stories: 4 (P1: 2, P2: 2)
        Functional Requirements: 12
        Success Criteria: 8
        [Provides summary of each section]
```

### Use Case 2: Checking Implementation Readiness

```
User: Is feature 005 ready to start implementing?
Claude: [Skill checks spec.md, plan.md, tasks.md]
        ✅ spec.md: Complete (no [NEEDS CLARIFICATION])
        ✅ plan.md: Complete (Constitution Check passed)
        ❌ tasks.md: Missing
        Next Step: Run /speck.tasks to generate task breakdown
```

### Use Case 3: Understanding Architecture Decisions

```
User: Why did we choose Bun for the plugin packaging feature?
Claude: [Skill reads specs/002-claude-plugin-packaging/plan.md]
        From Technical Context:
        - Primary runtime: Bun 1.0+ (chosen for fast TypeScript execution)
        - Build tooling: Bun shell API (native file operations without dependencies)
        Rationale: [Extracts from research.md if available]
```

### Use Case 4: Tracking Progress

```
User: What's the status of all features?
Claude: [Skill scans all specs/* directories]
        001-speck-core-project: Implementing (12/24 tasks completed)
        002-claude-plugin-packaging: Complete (24/24 tasks completed)
        005-speck-skill: Planning (plan.md in progress)
```

---

## Summary

The Speck Workflow Skill makes working with Speck natural and intuitive:
- ✅ Ask questions in plain English
- ✅ No need to remember slash command syntax for reading
- ✅ Graceful handling of incomplete or malformed files
- ✅ Multi-turn conversations with context awareness
- ✅ Automatic template validation and comparison

Just ask Claude about your features, and the skill takes care of the rest!

---

**Questions or Issues?**
- Check [FEATURE_DISCOVERY_PATTERNS.md](FEATURE_DISCOVERY_PATTERNS.md) for feature matching details
- Check [ERROR_HANDLING_DESIGN.md](ERROR_HANDLING_DESIGN.md) for malformed file handling
- Review [contracts/](contracts/) for detailed skill behavior specifications
