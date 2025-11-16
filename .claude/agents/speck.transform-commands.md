# Agent: Transform Commands - Extraction & Validation

**Purpose**: Analyze preprocessed command files to extract skills and agents using Claude Code best practices, with validation quality gates.

**Invoked by**: `/speck.transform-upstream` command (after preprocessing step)

**Input**: Preprocessed command files (text replacements already applied)

**Output**:
- Transformed command files in `.claude/commands/`
- Extracted skill files in `.claude/skills/` (if applicable)
- Extracted agent files in `.claude/agents/` (if applicable)
- Extraction decisions recorded in `.speck/memory/transformation-history.json`

---

## IMPORTANT: Preprocessing Has Already Occurred

**CRITICAL**: The invoking command has already run TypeScript preprocessing on all command files. The following transformations are ALREADY DONE:

✅ `/speckit.` → `/speck.` prefix changes (content)
✅ `.specify/` → `.speck/` path normalizations (content)
✅ `speckit.*` → `speck.*` reference updates (content)
✅ `speckit.*.md` → `speck.*.md` filename changes

**Your job is NOT to repeat these transformations.**

**Your job IS to:**
1. **Analyze** preprocessed command files for extraction opportunities
2. **Extract** reusable patterns as skills (auto-invoke, reusable logic)
3. **Extract** complex workflows as agents (multi-step, delegated work)
4. **Validate** all extracted files using validation API before writing
5. **Record** ALL extraction decisions (positive and negative) with rationale
6. **Update** command files to reference extracted components

---

## Context Variables

When invoked, you will receive:

- **UPSTREAM_VERSION**: The version being transformed (e.g., `v0.0.85`)
- **PREVIOUS_VERSION**: The last transformed version, or `"none"` for first transformation
- **CHANGED_SPECKIT_COMMANDS**: List of ONLY the commands that changed (already preprocessed)
- **SOURCE_DIR**: Path to preprocessed command files
- **OUTPUT_DIR**: `.claude/commands/` for transformed commands

---

## Extraction Decision Framework

Use holistic semantic understanding (not mechanical scoring) to evaluate extraction opportunities.

### Best Practices Reference

Load best practices from `.speck/memory/best-practices-cache.json` or from research.md at `specs/003-refactor-transform-commands/research.md`.

Key extraction criteria from research.md:

#### Skill Extraction Criteria (Section 4.1)

Extract as skill when:
- ✅ Used by 2+ commands OR broadly applicable
- ✅ Has 3+ concrete trigger terms (e.g., "validate", "check", "verify")
- ✅ Complexity: 50+ lines OR 2+ distinct functions
- ✅ Description fits under 1024 characters (preferably under ~1200 chars)
- ✅ Tool requirements are clear and can be restricted

**Keep in command when:**
- ❌ Single-use logic (only 1 command)
- ❌ No clear auto-invoke triggers
- ❌ Low complexity (< 50 lines, < 2 functions)
- ❌ Description would exceed 1024 char limit

#### Agent Extraction Criteria (Section 4.2)

Extract as agent when:
- ✅ Complexity: 10+ logical steps OR 6+ file operations
- ✅ Benefits from isolated context (prevents pollution)
- ✅ Needs different tool permissions than parent thread
- ✅ Single clear objective, 3-5 phases
- ✅ Used by 2+ commands OR team-sharable

**Fragility Assessment:**
- **High** (read-only): Read, Grep, Glob only
- **Medium** (controlled write): Read, Write, Edit, Grep, Glob
- **Low** (full access): All tools (inherit from parent)

**Keep in command when:**
- ❌ < 10 steps, < 6 file operations
- ❌ Integrates tightly with main conversation
- ❌ Needs same tools as parent thread
- ❌ Output is inline recommendations (not separate deliverable)

---

## Workflow: Extraction with Validation

For each preprocessed command file:

### Step 1: Analyze for Extraction Opportunities

1. **Read the preprocessed command file** from SOURCE_DIR
2. **Identify workflow sections** by looking for:
   - Numbered step sequences (1. Step one, 2. Step two...)
   - Procedural instructions with multiple stages
   - Conditional logic (if X then Y, when Z, do W)
   - Branching decision points (Option A vs Option B)
3. **Count complexity indicators**:
   - How many distinct steps?
   - Does it have branching logic?
   - Is it reusable across commands?
   - Is it command-specific?
4. **Apply extraction criteria** from research.md sections 4.1-4.2
5. **Make extraction decision** with rationale citing specific best practices

### Step 2: Extract Skills (if applicable)

If skill extraction is warranted:

1. **Determine skill name** with `speck.` prefix (e.g., `speck.validation`)
2. **Draft skill file content**:
   ```markdown
   ---
   description: <Third-person description under 1024 chars with 3+ triggers>
   allowed-tools: [<Restricted tool list based on task>]
   ---

   # Skill: <Name>

   <Implementation with rationale citing best practices>

   <!-- EXTRACTION DECISION
   RATIONALE: <Why extracted - cite research.md criteria>
   CRITERIA MET:
   - Reusability: <N commands>
   - Triggers: <N terms>
   - Complexity: <N lines, N functions>
   - Description: <N chars>
   BEST PRACTICES: <URL references from research.md>
   -->
   ```

3. **Validate using validation API** (from `.speck/scripts/validate-extracted-files.ts`):
   ```typescript
   import { validateExtractedSkillFile } from ".speck/scripts/validate-extracted-files.ts";

   const validation = validateExtractedSkillFile(
     name,          // e.g., "speck.validation"
     description,   // third-person description
     content,       // full markdown content
   );
   ```

4. **If validation fails**:
   - Read validation errors from `validation.errors`
   - Read validation warnings from `validation.warnings`
   - **Retry**: Fix issues based on validation feedback (up to 3 attempts total)
   - **If still fails after 3 attempts**: Record as failed extraction, keep logic in command

5. **If validation succeeds**:
   - Write skill file to `.claude/skills/speck.<name>.md`
   - Record extraction decision in transformation-history.json

### Step 3: Extract Agents (if applicable)

If agent extraction is warranted:

1. **Determine agent name** with `speck.` prefix (e.g., `speck.plan-workflow`)
2. **Draft agent file content**:
   ```markdown
   # Agent: <Purpose>

   **Purpose**: <Single clear objective>

   **Invoked by**: <Command that calls this agent>

   **Input**: <Context/data the agent receives>

   **Output**: <What the agent produces>

   ---

   ## Phases

   ### Phase 1: <Name>
   <Instructions>

   ### Phase 2: <Name>
   <Instructions>

   ### Phase 3-5: <Names>
   <Instructions>

   ---

   ## Tool Permissions

   **Fragility Level**: <High/Medium/Low>
   **Allowed Tools**: <List based on fragility>
   **Rationale**: <Why these tools are necessary>

   <!-- EXTRACTION DECISION
   RATIONALE: <Why extracted - cite research.md criteria>
   CRITERIA MET:
   - Complexity: <N steps, N file operations>
   - Context: <Benefits from isolation>
   - Tools: <Fragility level>
   - Objective: <Single clear purpose>
   BEST PRACTICES: <URL references from research.md>
   -->
   ```

3. **Validate using validation API**:
   ```typescript
   import { validateExtractedAgentFile } from ".speck/scripts/validate-extracted-files.ts";

   const validation = validateExtractedAgentFile(
     name,            // e.g., "speck.plan-workflow"
     objective,       // single clear purpose statement
     toolPermissions, // array of allowed tools
     fragilityLevel,  // "high" | "medium" | "low"
     content,         // full markdown content
     phaseCount,      // number of execution phases (3-5)
   );
   ```

4. **If validation fails**:
   - Read validation errors and warnings
   - **Retry**: Fix issues (up to 3 attempts total)
   - **If still fails**: Record as failed extraction, keep logic in command

5. **If validation succeeds**:
   - Write agent file to `.claude/agents/speck.<name>.md`
   - Record extraction decision in transformation-history.json

### Step 4: Update Command File References

If skills or agents were extracted:

1. **Read the preprocessed command file**
2. **Locate the extracted sections** in the command body
3. **Replace extracted content** with invocations:

   **For skills:**
   ```markdown
   The <capability> is handled automatically by the `speck.<skill-name>` skill.
   ```

   **For agents:**
   ```markdown
   Use the Task tool to invoke the `speck.<agent-name>` agent:

   ````
   Task(
     subagent_type: "general-purpose",
     description: "<Brief description>",
     prompt: "Execute the workflow defined in .claude/agents/speck.<agent-name>.md with inputs: ..."
   )
   ````
   ```

4. **Preserve**:
   - `{SCRIPT}` placeholders (Bun TypeScript script references)
   - `{AGENT_SCRIPT}` placeholders (agent context management)
   - User input sections (`$ARGUMENTS`)
   - Simple setup steps
   - Handoff instructions
   - **`[SPECK-EXTENSION:START/END]` blocks** - NEVER modify these

5. **Write updated command file** to OUTPUT_DIR

### Step 5: Record Extraction Decisions

For EVERY command processed (even if no extraction occurred):

1. **Read current transformation history** from `.speck/memory/transformation-history.json`
2. **Add extraction decision entry**:
   ```json
   {
     "timestamp": "<ISO 8601>",
     "upstreamVersion": "v0.0.85",
     "filesTransformed": ["speckit.plan.md"],
     "extractionDecisions": [
       {
         "sourceFile": "speckit.plan.md",
         "extracted": true,
         "extractedType": "agent",
         "extractedFiles": [".claude/agents/speck.plan-workflow.md"],
         "rationale": "Multi-step workflow with 9 steps and branching logic (constitution check, conditional contracts generation). Meets agent extraction criteria per research.md section 4.2.",
         "criteriaApplied": {
           "size": 150,
           "complexity": 9,
           "reusability": 1,
           "triggers": 0
         },
         "bestPracticesCited": [
           "specs/003-refactor-transform-commands/research.md#section-4.2",
           "https://code.claude.com/docs/en/sub-agents.md"
         ]
       },
       {
         "sourceFile": "speckit.plan.md",
         "sourceSection": "User Input boilerplate",
         "extracted": false,
         "extractedType": "none",
         "extractedFiles": [],
         "rationale": "Simple boilerplate (1 step, no branching). Does not meet extraction criteria per research.md section 4.1 (requires 50+ lines or 2+ functions for skills).",
         "criteriaApplied": {
           "size": 5,
           "complexity": 1
         },
         "bestPracticesCited": [
           "specs/003-refactor-transform-commands/research.md#section-4.1"
         ]
       }
     ]
   }
   ```

3. **Write updated transformation history** back to `.speck/memory/transformation-history.json`

---

## Validation Retry Loop

**CRITICAL**: Validation must pass before file writes (Constitutional Principle IV - Quality Gates)

For each extracted skill or agent:

1. **Attempt 1**: Draft content, validate, write if valid
2. **Attempt 2** (if validation fails):
   - Analyze validation errors
   - Fix specific issues (e.g., shorten description, add triggers, adjust tool permissions)
   - Re-validate
3. **Attempt 3** (if still fails):
   - Make final corrections
   - Re-validate
4. **If still fails after 3 attempts**:
   - Log failure reason
   - Record negative extraction decision
   - Keep logic in command file (do not extract)
   - Report failure in JSON output

**Example validation error corrections:**
- "Description exceeds 1024 chars" → Shorten description, remove redundant phrases
- "Insufficient triggers (2 < 3)" → Add concrete trigger terms to description
- "Tool permissions don't match medium fragility" → Adjust tool list to allowed set
- "Unbalanced code blocks" → Fix markdown syntax, ensure all ``` are closed

---

## Output Format

Return JSON summary:

```json
{
  "speckCommandsGenerated": [
    {
      "commandName": "speck.plan",
      "sourceFile": "speckit.plan.md",
      "outputPath": ".claude/commands/speck.plan.md",
      "changeType": "updated",
      "extractionsPerformed": ["agent: speck.plan-workflow"]
    }
  ],
  "agentsExtracted": [
    {
      "path": ".claude/agents/speck.plan-workflow.md",
      "purpose": "Multi-step planning workflow",
      "extractedFrom": "speckit.plan.md",
      "validationAttempts": 1,
      "validationStatus": "passed"
    }
  ],
  "skillsExtracted": [
    {
      "path": ".claude/skills/speck.validation.md",
      "purpose": "Validate feature specifications",
      "extractedFrom": "Multiple commands",
      "validationAttempts": 2,
      "validationStatus": "passed"
    }
  ],
  "extractionDecisions": 15,
  "validationFailures": [
    {
      "file": "speck.complex-skill.md",
      "reason": "Description exceeded 1024 chars after 3 correction attempts",
      "decision": "Kept logic in command file"
    }
  ],
  "errors": [],
  "warnings": []
}
```

---

## Error Handling

### Validation Failures

If validation fails after 3 attempts:
- Do NOT write the file
- Record negative extraction decision in transformation-history.json
- Keep extracted logic in command file
- Report in JSON output with reason

### Extension Marker Conflicts

If preprocessing created conflicts with `[SPECK-EXTENSION]` blocks:
- Preserve SPECK extension content
- Report conflict for manual review
- Do NOT proceed with that file

### Missing Context

If unable to load research.md or best-practices-cache:
- Use built-in extraction criteria (hardcoded thresholds)
- Record warning in JSON output
- Proceed with transformation

---

## Validation API Reference

Import validation functions from `.speck/scripts/validate-extracted-files.ts`:

```typescript
// For skills
import {
  validateExtractedSkillFile,
  validateSkillDescription,
  DEFAULT_SKILL_CRITERIA
} from ".speck/scripts/validate-extracted-files.ts";

// For agents
import {
  validateExtractedAgentFile,
  validateAgentToolPermissions,
  FRAGILITY_TOOL_PERMISSIONS,
  DEFAULT_AGENT_CRITERIA
} from ".speck/scripts/validate-extracted-files.ts";

// For markdown structure
import { validateMarkdownStructure } from ".speck/scripts/validate-extracted-files.ts";
```

---

## Notes

- **Preprocessing is complete**: Text replacements already applied, focus on extraction
- **Validation is mandatory**: Quality gates must pass before writes (Principle IV)
- **Record ALL decisions**: Both positive (extracted) and negative (not extracted)
- **Use holistic understanding**: Not mechanical scoring, semantic analysis
- **Cite best practices**: Reference research.md sections in all rationales
- **Preserve extensions**: Never modify SPECK-EXTENSION blocks
- **Retry validation**: Up to 3 attempts with error correction
- **Target performance**: <30 seconds per command file (includes extraction + validation)
