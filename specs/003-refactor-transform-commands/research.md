# Claude Code Best Practices Research

**Research Date**: 2025-11-15
**Purpose**: Inform transformation agent's extraction decisions for skills, agents, and commands
**Sources**: Claude Code official documentation at https://code.claude.com/docs/

---

## Executive Summary

This research document synthesizes Claude Code best practices to establish concrete extraction thresholds and patterns for the transform-commands agent. Key findings:

1. **Skill descriptions must be under 1024 characters** with quality degradation above ~300 tokens (~1200 chars)
2. **Tool permissions follow least-privilege principle** - only grant tools necessary for the task
3. **Single responsibility design** - agents should address one clear objective
4. **Auto-invoke via description specificity** - include concrete trigger terms users would mention
5. **Progressive disclosure** - load supporting files only when contextually relevant

---

## 1. Skill Authoring Best Practices

### 1.1 Description Format Requirements

**Decision**: Skill descriptions MUST be maximum 1,024 characters and articulate both functionality and activation triggers in third-person language.

**Rationale**:
- The `description` field is critical for Claude to discover when to use the skill
- Effective descriptions include specific use-case language for trigger matching
- Third-person format distinguishes skills from direct instructions

**Specific Criteria**:
- **Hard limit**: 1,024 characters (enforced by Claude Code)
- **Soft threshold**: ~300 tokens (~1,200 characters) where quality degradation begins
- **Required elements**:
  - Functionality summary
  - Trigger terms (concrete words/phrases users would mention)
  - Use cases (when to activate)
- **Format**: Third person (e.g., "Extract text and tables from PDF files" not "You extract...")

**Example**:
```markdown
Extract text and tables from PDF files, fill forms, merge documents. Use when working with PDF files or when the user mentions PDFs, forms, or document extraction.
```

**Alternatives Considered**:
- First-person descriptions → Rejected: Creates confusion between skills and direct instructions
- Verbose explanations → Rejected: Reduces discoverability due to noise
- Generic descriptions → Rejected: Prevents appropriate auto-invocation

---

### 1.2 Skill Name Constraints

**Decision**: Skill names MUST use lowercase letters, numbers, and hyphens only, with 64-character maximum.

**Specific Criteria**:
- **Character set**: `[a-z0-9-]` only
- **Maximum length**: 64 characters
- **Convention**: Descriptive, action-oriented names (e.g., `pdf-extract`, `validate-schema`)

---

### 1.3 Auto-Invoke vs Manual-Invoke Patterns

**Decision**: Skills operate through model-invoked automation—Claude independently determines when to activate them based on request context and description matching. Commands require explicit user triggering via slash syntax.

**Rationale**:
- Skills enable Claude to proactively apply capabilities when contextually appropriate
- Commands provide user control over when functionality is invoked
- This separation creates a clear abstraction boundary

**Extraction Threshold**:
- **Extract as Skill** when:
  - Logic should activate automatically based on context
  - User shouldn't need to remember to invoke it
  - Functionality enhances Claude's general capabilities
  - Pattern applies across multiple command invocations

- **Keep as Command** when:
  - User needs explicit control over invocation timing
  - Workflow is sequential/procedural (not context-triggered)
  - Functionality is project-specific rather than generally applicable
  - User must approve before execution starts

**Alternatives Considered**:
- Making all capabilities commands → Rejected: Requires users to remember and manually invoke everything
- Making all capabilities skills → Rejected: Removes user control over explicit workflows

---

### 1.4 Progressive Disclosure Pattern

**Decision**: Load supporting files (reference.md, scripts, templates) only when contextually relevant to manage token efficiency through staged information revelation.

**Rationale**:
- Reduces context window usage for common operations
- Enables richer documentation without constant overhead
- Supports complexity scaling (simple operations stay simple)

**Structure**:
```
.claude/skills/speck.example/
├── SKILL.md              # Core skill with description, basic logic
├── reference.md          # Detailed documentation (loaded on demand)
└── scripts/              # Supporting code (loaded on demand)
    └── helper.ts
```

**Extraction Threshold**:
- **Use Progressive Disclosure** when:
  - Skill has 3+ distinct complexity levels (basic, intermediate, advanced)
  - Reference documentation exceeds ~500 tokens
  - Supporting scripts/templates add significant context

- **Keep in Single File** when:
  - Skill is straightforward with minimal documentation needs
  - All logic fits comfortably in SKILL.md without bloat

---

### 1.5 Tool Restriction Mechanism

**Decision**: Use `allowed-tools` frontmatter field to constrain Claude's available capabilities to a specified subset for focused, secure skill execution.

**Rationale**:
- Improves security by limiting tool access to only what's necessary
- Maintains focus by preventing tool sprawl
- Enables explicit permission grants without runtime prompts

**Format**:
```yaml
---
name: example-skill
description: Example skill description under 1024 chars
allowed-tools: [Read, Grep, Glob]
---
```

**Extraction Threshold**:
- **Restrict Tools** when:
  - Skill has clear, limited tool requirements (< 5 tools)
  - Task is read-only or has narrow modification scope
  - Security/safety considerations benefit from explicit limitations

- **Inherit All Tools** when:
  - Skill needs flexible tool access across many operations
  - Tool requirements vary significantly by context
  - Omit `allowed-tools` field to inherit from parent thread

**Alternatives Considered**:
- Always restricting tools → Rejected: Too rigid for complex multi-step skills
- Never restricting tools → Rejected: Reduces security and focus

---

### 1.6 Discovery Triggers

**Decision**: Include concrete terms users would mention when needing the capability, avoiding vague language that obscures activation contexts.

**Rationale**:
- Specificity drives discoverability
- Claude matches user requests against skill descriptions
- Clear triggers reduce false positives and false negatives

**Examples**:
- **Good**: "PDF files, forms, document extraction, merge documents"
- **Bad**: "helps with documents, useful for files"

**Extraction Threshold**:
- Skill descriptions MUST include at least 2-3 concrete trigger terms
- Trigger terms should map to vocabulary users actually employ
- Avoid generic terms like "data", "files", "processing" without specifics

---

## 2. Agent Authoring Best Practices

### 2.1 Tool Permission Specifications

**Decision**: Follow principle of least privilege—only grant tools necessary for the agent's specific purpose. Use `/agents` interface for interactive tool selection.

**Rationale**:
- Improves security by limiting attack surface
- Maintains focus by preventing tool sprawl
- Makes agent behavior more predictable

**Configuration Options**:
1. **Omit `tools` field**: Inherits all parent thread tools (default)
2. **Specify comma-separated list**: Granular control (e.g., `Read,Write,Bash`)
3. **Include MCP server tools**: When MCP integrations are available

**Fragility Levels**:

| Fragility | Tool Access | Use Case |
|-----------|-------------|----------|
| **High** (Low degrees of freedom) | Read-only tools (Read, Grep, Glob) | Analysis, research, reporting tasks that shouldn't modify state |
| **Medium** (Moderate degrees of freedom) | Read + limited write (Read, Write, Edit, Grep, Glob) | Tasks with controlled modifications, validation before changes |
| **Low** (High degrees of freedom) | Full tool access (inherit all) | Complex workflows requiring flexible tool use, trusted operations |

**Extraction Threshold**:
- **High Fragility → Restrict to Read-Only** when:
  - Agent performs analysis without modifications
  - Output is recommendations/reports, not file changes
  - Risk of incorrect modifications is high

- **Medium Fragility → Selective Tools** when:
  - Agent modifies files but changes are predictable
  - Validation/verification steps precede modifications
  - Rollback is straightforward if errors occur

- **Low Fragility → Inherit All Tools** when:
  - Agent orchestrates complex multi-step workflows
  - Tool requirements vary significantly by context
  - Developer reviews output before accepting changes

**Alternatives Considered**:
- Always granting full tool access → Rejected: Security risk, reduces predictability
- Always restricting to minimal tools → Rejected: Too rigid for complex agents

---

### 2.2 Single Responsibility Design

**Decision**: Create agents addressing one clear objective rather than multipurpose agents.

**Rationale**:
- Improves performance through focused context
- Makes agent behavior more predictable
- Enables composition (chaining multiple specialized agents)
- Simplifies debugging and maintenance

**Extraction Threshold**:
- **Extract as Agent** when:
  - Task has 3+ distinct processing phases (e.g., analyze → transform → validate)
  - Work can be delegated to separate context window
  - Specialized system prompt would improve quality
  - Task benefits from isolation (prevents main thread pollution)

- **Keep in Command** when:
  - Task is single-phase or tightly coupled
  - Latency of agent invocation outweighs benefits
  - Task requires tight integration with main conversation

**Complexity Heuristics**:
- **Low complexity**: 1-2 file operations, < 10 logical steps → Keep in command
- **Medium complexity**: 3-5 file operations, 10-20 logical steps → Consider agent
- **High complexity**: 6+ file operations, 20+ logical steps → Extract to agent

---

### 2.3 Composition Patterns

**Decision**: Complex workflows should sequence multiple specialized agents (chaining), with each agent focused on a single objective.

**Pattern**: Analyze → Transform → Validate
- **Analyze Agent**: Read-only tools, produces recommendations/insights
- **Transform Agent**: Read + write tools, applies changes based on analysis
- **Validate Agent**: Read-only tools, verifies transformation correctness

**Resumable Agents**:
- Agents can continue previous conversations using stored agent IDs
- Enables long-running research and iterative refinement across sessions
- Useful for multi-session workflows

**Extraction Threshold**:
- **Use Agent Chaining** when:
  - Workflow has 3+ independent phases
  - Each phase has distinct tool requirements
  - Failure in one phase shouldn't block others

- **Use Single Agent** when:
  - Phases are tightly coupled
  - All phases need same tool access
  - Overhead of multiple agent invocations exceeds benefits

---

### 2.4 When to Use Agents vs Commands

**Decision**: Deploy agents when tasks require separate context windows, domain-specific expertise, reusable workflows, or different tool access levels.

**Agent Indicators**:
- Task complexity justifies separate context (prevents main thread pollution)
- Specialized system prompt improves output quality
- Workflow is reusable across team/projects
- Strategic tool isolation enhances security

**Command Indicators**:
- Simple prompt snippets used frequently
- Task requires tight integration with main conversation
- Latency is unacceptable for user experience
- Single-file, self-contained logic

**Extraction Threshold Matrix**:

| Factor | Keep as Command | Extract as Agent |
|--------|----------------|------------------|
| **Complexity** | < 10 logical steps | 10+ logical steps |
| **Reusability** | Project-specific | Team/cross-project |
| **Tool Access** | Same as parent thread | Different permissions needed |
| **Context** | Integrates with main thread | Benefits from isolation |
| **Latency** | Must be instant | Can tolerate startup cost |

---

### 2.5 Fragility Considerations

**Decision**: Balance latency trade-off (agents start with clean slate, must gather context) against benefits (isolation, specialized prompts).

**Latency Impact**:
- Agents add initialization overhead as they gather context
- Beneficial for overall session length by preventing context pollution
- Use agent chaining to amortize startup costs across phases

**Description Specificity**:
- Include action-oriented language like "use PROACTIVELY" for automatic delegation
- Specify trigger conditions clearly to prevent false invocations
- Balance specificity (correct activation) vs generality (coverage)

---

### 2.6 Authoring Criteria

**Decision**: Include specific instructions, examples, and constraints in agent prompts for optimal performance. Generate initial versions with Claude, then customize.

**Prompt Structure**:
```markdown
---
name: agent-name
description: Third-person description of role, expertise, when to invoke (under 1024 chars)
tools: Read,Write,Grep
---

# Agent Role

You are a specialized agent for [specific purpose].

## Responsibilities

- [Specific task 1]
- [Specific task 2]

## Constraints

- [Limitation 1]
- [Limitation 2]

## Examples

[Concrete examples of input → output]
```

**Extraction Threshold**:
- Agent prompts SHOULD include:
  - Role definition (1-2 sentences)
  - Specific responsibilities (3-5 bullet points)
  - Constraints/limitations (2-4 rules)
  - Examples (1-2 concrete cases)

---

## 3. Command Composition Patterns

### 3.1 File Structure Conventions

**Decision**: Organize commands in `.claude/commands/` (project-level, shared with teams) or `~/.claude/commands/` (personal-level, user-specific).

**Structure**:
```
.claude/
├── commands/           # Project-level (team-shared)
│   ├── speck.analyze.md
│   ├── speck.plan.md
│   └── frontend/       # Subdirectories for logical grouping
│       └── component.md  # Creates /component command
├── agents/             # Project-level agents
│   └── speck.analyzer.md
└── skills/             # Project-level skills
    └── speck.validation/
        ├── SKILL.md
        └── reference.md
```

**Rationale**:
- Subdirectories enable logical grouping without affecting invocation syntax
- Project-level commands support team collaboration through version control
- Personal-level commands allow individual customization

**Extraction Decision**:
- **Project-level** (`.claude/`) when:
  - Command/skill/agent is reusable across team
  - Logic is project-specific (not personal workflow)
  - Version control and sharing are beneficial

- **Personal-level** (`~/.claude/`) when:
  - Workflow is individual-specific
  - Command wraps personal tools/preferences
  - Not intended for team sharing

---

### 3.2 Naming Patterns

**Decision**: Command names derive directly from markdown filenames (minus `.md` extension). Skills and agents follow same pattern with directory support.

**Naming Conventions**:
- **Commands**: `speck.action-name.md` → `/speck.action-name`
- **Skills**: `speck.capability-name/SKILL.md` → Auto-invoked (no slash command)
- **Agents**: `speck.agent-role.md` → Referenced by commands/skills

**Prefix Strategy**:
- Use consistent prefix (`speck.`) to namespace project-specific items
- Prevents naming conflicts with built-in commands
- Enables filtering and organization

**Extraction Threshold**:
- ALL extracted components MUST use `speck.` prefix for consistency
- Names SHOULD be descriptive and action-oriented
- Avoid abbreviations unless widely understood in domain

---

### 3.3 Parameter Handling

**Decision**: Use `$ARGUMENTS` for capture-all flexibility or positional parameters (`$1`, `$2`) for structured inputs with defaults.

**Patterns**:

**Capture-All** (flexible):
```markdown
Process the following: $ARGUMENTS
```
Use when: Arguments are freeform, order doesn't matter, count varies

**Positional** (structured):
```markdown
Feature name: ${1:-default-feature}
Priority: ${2:-P2}
Description: $3
```
Use when: Arguments have specific meaning, order matters, defaults needed

**Extraction Threshold**:
- **Capture-All** when:
  - Arguments are natural language descriptions
  - No specific structure required
  - Count/order varies by invocation

- **Positional** when:
  - Arguments have specific semantic meaning
  - Validation benefits from position
  - Defaults improve usability

---

### 3.4 Integration with Skills and Agents

**Decision**: Commands provide user-facing layer (explicit invocation), skills enable auto-invoke capabilities, agents handle delegated complex work. Commands can reference both but remain single-file.

**Composition Pattern**:
```markdown
# Command File: .claude/commands/speck.validate.md

Check the codebase for validation issues.

Claude will use the validation skill to analyze patterns automatically.

For complex multi-file validation, delegate to the validator agent.
```

**Reference Pattern**:
- Commands SHOULD NOT embed skill/agent logic
- Commands SHOULD describe what will happen (referencing skills/agents by name)
- Skills/agents contain actual implementation

**Extraction Threshold**:
- **Extract to Skill** when:
  - Logic should auto-invoke based on context
  - Pattern is reusable across multiple commands
  - Complexity: 2-5 functions, clear trigger patterns

- **Extract to Agent** when:
  - Work is complex enough to justify separate context
  - Tool permissions should differ from main thread
  - Complexity: 5+ functions, multiple phases

- **Keep in Command** when:
  - Logic is simple prompt text
  - No auto-invoke or delegation needed
  - Single-use, project-specific workflow

---

### 3.5 Composition Layering

**Decision**: Commands form the user-facing layer, triggering focused prompts. Skills work beneath the surface, automatically handling patterns. Agents provide delegation for complex multi-step tasks.

**Layering**:
```
User
  ↓ (explicit invocation)
Command (/speck.analyze)
  ↓ (describes workflow)
Skill (auto-invokes analysis patterns)
  ↓ (delegates complex work)
Agent (isolated context for multi-step processing)
```

**File References**:
- Use `@file` to include content in commands
- Supports composition without inline duplication
- Example: `@.claude/templates/analysis-template.md`

**Extraction Threshold**:
- **Single Layer** (command only) when:
  - Workflow is straightforward prompt
  - No auto-invoke or delegation needed

- **Two Layers** (command + skill) when:
  - Auto-invoke patterns enhance the command
  - Reusable logic benefits other commands

- **Three Layers** (command + skill + agent) when:
  - Auto-invoke patterns + complex delegation both needed
  - Workflow has distinct phases with different tool needs

---

## 4. Extraction Thresholds

### 4.1 Skill Extraction Criteria

**Decision**: Extract as skill when logic is reusable across multiple commands AND has clear auto-invoke triggers AND complexity justifies separate file.

**Threshold Matrix**:

| Factor | Threshold | Measurement |
|--------|-----------|-------------|
| **Reusability** | Used by 2+ commands OR broadly applicable | Count referencing commands |
| **Auto-Invoke Clarity** | 3+ concrete trigger terms | Count specific terms in description |
| **Complexity** | 50+ lines OR 2+ distinct functions | Count lines/functions in implementation |
| **Description Fit** | Full description under 1024 chars | Character count |
| **Token Efficiency** | Supporting docs would add 200+ tokens | Estimate reference.md size |

**Concrete Examples**:

**Extract as Skill**:
```markdown
# Validation logic that:
- Is used by analyze, plan, and implement commands (3 commands)
- Triggers on: "validate", "check", "verify", "lint" (4 terms)
- Contains 120 lines with 4 validation functions
- Description: 850 characters
- Reference docs: 300 tokens
→ EXTRACT to .claude/skills/speck.validation/
```

**Keep in Command**:
```markdown
# Validation logic that:
- Is used only by analyze command (1 command)
- No clear auto-invoke triggers (manual invoke only)
- Contains 30 lines with 1 function
- Would require 1200-char description (too long)
→ KEEP in command file
```

---

### 4.2 Agent Extraction Criteria

**Decision**: Extract as agent when work is complex enough to justify separate context window AND benefits from different tool permissions AND addresses single clear objective.

**Threshold Matrix**:

| Factor | Threshold | Measurement |
|--------|-----------|-------------|
| **Complexity** | 10+ logical steps OR 6+ file operations | Count steps/operations |
| **Context Isolation** | Benefits from clean slate OR prevents pollution | Qualitative assessment |
| **Tool Permissions** | Needs different tools than parent thread | Compare tool requirements |
| **Single Responsibility** | One clear objective, 3-5 phases max | Count distinct phases |
| **Reusability** | Used by 2+ commands OR team-sharable | Count referencing commands |

**Fragility Assessment**:

| Task Characteristics | Fragility Level | Tool Restriction |
|---------------------|----------------|------------------|
| Read-only analysis, reporting | **High** (low degrees of freedom) | Read, Grep, Glob only |
| Controlled modifications with validation | **Medium** (moderate degrees of freedom) | Read, Write, Edit, Grep, Glob |
| Complex multi-step workflows | **Low** (high degrees of freedom) | Inherit all tools |

**Concrete Examples**:

**Extract as Agent**:
```markdown
# Transform logic that:
- Has 15 logical steps across 8 file operations
- Benefits from isolated context (preprocessed files)
- Needs Read, Write, Edit, Grep (subset of parent tools)
- Single objective: Extract skills/agents from commands
- Used by transform-upstream command, reusable for other transformations
→ EXTRACT to .claude/agents/speck.transformer.md with Medium fragility
```

**Keep in Command**:
```markdown
# Analysis logic that:
- Has 5 logical steps across 2 file reads
- Integrates tightly with main conversation
- Needs same tools as parent thread
- Output is inline recommendations (not separate deliverable)
→ KEEP in command file
```

---

### 4.3 Progressive Disclosure Criteria

**Decision**: Use progressive disclosure (SKILL.md + reference.md + scripts/) when skill has multiple complexity levels AND reference docs exceed ~500 tokens AND supporting files add significant context.

**Threshold Matrix**:

| Factor | Threshold | File Structure |
|--------|-----------|----------------|
| **Complexity Levels** | 3+ distinct levels (basic, intermediate, advanced) | Use progressive disclosure |
| **Reference Size** | 500+ tokens of documentation | Split to reference.md |
| **Supporting Code** | 2+ helper scripts/templates | Add scripts/ directory |
| **Token Efficiency** | 80%+ invocations don't need reference docs | Load reference on demand |

**File Structure Decision**:

**Single File** (SKILL.md only):
```markdown
# When:
- Skill is straightforward
- Documentation under 500 tokens
- No supporting scripts
- All users need all context
→ .claude/skills/speck.simple.md
```

**Progressive Disclosure** (SKILL.md + reference.md + scripts/):
```markdown
# When:
- Skill has 3+ complexity levels
- Reference docs 500+ tokens
- 2+ supporting scripts
- Most invocations don't need full context
→ .claude/skills/speck.complex/
  ├── SKILL.md (core logic, description)
  ├── reference.md (detailed docs)
  └── scripts/
      ├── helper1.ts
      └── helper2.ts
```

---

### 4.4 Complexity Scoring Heuristics

**Decision**: Use holistic semantic understanding, not mechanical scoring, to evaluate extraction decisions. Record explanations for all decisions (both positive and negative).

**Evaluation Dimensions**:

1. **Functional Complexity**: Count distinct functions, logical branches, file operations
2. **Reusability**: Identify patterns used across multiple commands or contexts
3. **Trigger Clarity**: Assess specificity of auto-invoke conditions
4. **Tool Requirements**: Compare tool needs to parent thread capabilities
5. **Context Benefits**: Evaluate if isolation improves quality or prevents pollution

**Decision Recording**:
```json
{
  "extraction_decisions": [
    {
      "source": "speck.analyze.md",
      "decision": "extracted_skill",
      "target": ".claude/skills/speck.validation.md",
      "rationale": "Logic is used by 3 commands (analyze, plan, implement), has 4 clear trigger terms (validate, check, verify, lint), contains 120 lines with 4 functions, description fits in 850 chars",
      "criteria_met": {
        "reusability": "3 commands",
        "triggers": "4 terms",
        "complexity": "120 lines, 4 functions",
        "description": "850 chars"
      }
    },
    {
      "source": "speck.analyze.md",
      "decision": "no_extraction",
      "section": "feature numbering logic",
      "rationale": "Used only by analyze command (1 command), no clear auto-invoke triggers (manual invoke only), 30 lines with 1 function, would require 1200-char description (exceeds limit)",
      "criteria_not_met": {
        "reusability": "1 command (threshold: 2+)",
        "triggers": "none (threshold: 3+)",
        "description": "1200 chars (limit: 1024)"
      }
    }
  ]
}
```

---

## 5. Security and Permission Best Practices

### 5.1 Principle of Least Privilege

**Decision**: Only grant tools that are necessary for the agent/skill's purpose. Default to read-only unless write access is required.

**Rationale**:
- Reduces attack surface and potential for unintended modifications
- Makes behavior more predictable
- Enables safer auto-invocation of skills

**Permission Tiers**:

| Tier | Tools | Use Case |
|------|-------|----------|
| **Read-Only** | Read, Grep, Glob | Analysis, research, reporting |
| **Controlled Write** | Read, Write, Edit, Grep, Glob | Targeted file modifications |
| **Extended** | + Bash (safe commands) | Testing, validation, builds |
| **Full** | All tools | Complex workflows, trusted operations |

**Extraction Threshold**:
- Start with minimal tools needed for core functionality
- Add tools only when specific use cases require them
- Document why each tool is necessary in agent/skill description

---

### 5.2 Risk Assessment

**Decision**: Evaluate task fragility (potential for harm if errors occur) to inform tool restriction and review requirements.

**Fragility Assessment**:

| Risk Level | Characteristics | Tool Restriction | Review Requirement |
|-----------|----------------|------------------|-------------------|
| **Low Risk** | Read-only, no state changes | Read, Grep, Glob | Optional review |
| **Medium Risk** | Controlled modifications, validation steps | Read, Write, Edit, Grep, Glob | Recommended review |
| **High Risk** | Broad modifications, irreversible changes | Full tools, with explicit approvals | Required review |

**Extraction Threshold**:
- **Low Risk** tasks → Can auto-invoke safely via skills
- **Medium Risk** tasks → Require user awareness, suitable for agents with validation
- **High Risk** tasks → Should use commands (explicit invocation) with clear prompts

---

### 5.3 Allowlisting and Approval Workflows

**Decision**: Leverage Claude Code's permission system for explicit approval of risky operations. Allowlist safe, frequently-used commands per-project.

**Patterns**:
- Network-dependent tools (curl, wget) are blocked by default
- File modifications require user approval unless allowlisted
- Skills with controlled tool sets reduce approval prompts

**Extraction Threshold**:
- Skills performing read-only analysis → No approvals needed
- Skills performing targeted writes → One approval per invocation
- Agents performing multi-step changes → Approval for each write operation (unless allowlisted)

---

## 6. Team Collaboration and Sharing

### 6.1 Version Control Integration

**Decision**: Check project-level commands, skills, and agents into version control for team distribution. Use personal-level for individual workflows.

**Structure**:
```
.claude/                  # Version controlled (team-shared)
├── commands/
│   └── speck.*.md
├── agents/
│   └── speck.*.md
└── skills/
    └── speck.*/

~/.claude/                # Personal (not version controlled)
├── commands/
│   └── personal.*.md
└── skills/
    └── personal.*/
```

**Extraction Decision**:
- **Project-level** when:
  - Logic is reusable across team members
  - Workflow is project-specific (not personal preference)
  - Version control and history are beneficial

- **Personal-level** when:
  - Workflow is individual-specific
  - Wraps personal tools or preferences
  - Not intended for team sharing

---

### 6.2 Naming Conventions for Team Sharing

**Decision**: Use consistent prefix (`speck.`) for all project-level components to prevent naming conflicts and enable organizational clarity.

**Benefits**:
- Prevents conflicts with built-in commands
- Enables filtering (e.g., `/help speck.` shows all speck commands)
- Communicates ownership and scope

**Extraction Threshold**:
- ALL project-level extractions MUST use `speck.` prefix
- Personal-level extractions MAY use different prefix or no prefix

---

## 7. Synthesis: Extraction Decision Framework

### 7.1 Decision Tree

```
Start: Analyze upstream command content
  │
  ├─> Is logic reusable across 2+ commands?
  │   ├─> Yes: Has 3+ clear auto-invoke triggers?
  │   │   ├─> Yes: Complexity ≥ 50 lines OR 2+ functions?
  │   │   │   ├─> Yes: → EXTRACT AS SKILL
  │   │   │   └─> No: → KEEP IN COMMAND
  │   │   └─> No: Complexity ≥ 10 steps OR 6+ file operations?
  │   │       ├─> Yes: → EXTRACT AS AGENT
  │   │       └─> No: → KEEP IN COMMAND
  │   └─> No: Complexity ≥ 10 steps OR 6+ file operations?
  │       ├─> Yes: Benefits from isolated context?
  │       │   ├─> Yes: → EXTRACT AS AGENT
  │       │   └─> No: → KEEP IN COMMAND
  │       └─> No: → KEEP IN COMMAND
```

### 7.2 Extraction Checklist

Before extracting logic as a skill, verify:
- [ ] Used by 2+ commands OR broadly applicable across contexts
- [ ] Has 3+ concrete trigger terms for auto-invoke
- [ ] Complexity ≥ 50 lines OR 2+ distinct functions
- [ ] Description fits under 1024 chars (preferably under ~1200 chars)
- [ ] Tool requirements are clear and can be restricted via `allowed-tools`

Before extracting logic as an agent, verify:
- [ ] Complexity ≥ 10 logical steps OR 6+ file operations
- [ ] Benefits from separate context window (isolation or specialization)
- [ ] Needs different tool permissions than parent thread
- [ ] Addresses single clear objective (not multipurpose)
- [ ] Used by 2+ commands OR reusable across team

Before keeping logic in command, verify:
- [ ] Logic is simple prompt text (< 10 steps, < 50 lines)
- [ ] No auto-invoke patterns identified
- [ ] No delegation benefits from agent context
- [ ] Single-use or project-specific workflow
- [ ] Tight integration with main conversation required

---

## 8. Documentation and Rationale Requirements

### 8.1 Inline Justification

**Decision**: Every extraction decision (both positive and negative) MUST include explanation citing Claude Code best practices.

**Format**:
```markdown
<!-- EXTRACTION DECISION: Skill
RATIONALE: This validation logic is used by 3 commands (analyze, plan, implement),
has 4 clear trigger terms (validate, check, verify, lint), contains 120 lines
with 4 functions, and fits description under 1024 chars (850 chars).

CRITERIA MET:
- Reusability: 3 commands (threshold: 2+)
- Triggers: 4 terms (threshold: 3+)
- Complexity: 120 lines, 4 functions (threshold: 50 lines OR 2+ functions)
- Description: 850 chars (limit: 1024)

BEST PRACTICE REFERENCE: https://code.claude.com/docs/en/skills.md
-->
```

**Extraction Threshold**:
- ALL extractions MUST include inline rationale
- ALL non-extractions SHOULD include explanation (for complex sections)
- Rationales MUST cite specific criteria from this research document

---

### 8.2 Transformation History Recording

**Decision**: Record all extraction decisions in transformation-history.json with structured explanation for auditing and learning.

**Format**:
```json
{
  "version": "v0.0.85",
  "transformed_at": "2025-11-15T10:30:00Z",
  "extraction_decisions": [
    {
      "source_file": ".claude/commands/upstream/analyze.md",
      "decision": "extracted_skill",
      "target_file": ".claude/skills/speck.validation.md",
      "rationale": "Logic is used by 3 commands, has 4 clear trigger terms, contains 120 lines with 4 functions, description fits in 850 chars",
      "criteria_met": {
        "reusability": "3 commands",
        "triggers": "4 terms",
        "complexity": "120 lines, 4 functions",
        "description": "850 chars"
      },
      "best_practice_ref": "https://code.claude.com/docs/en/skills.md"
    }
  ]
}
```

---

## 9. Performance and Optimization

### 9.1 Token Efficiency

**Decision**: Optimize for token efficiency through progressive disclosure, focused descriptions, and selective tool grants.

**Strategies**:
- Skills: Core logic in SKILL.md, detailed docs in reference.md (loaded on demand)
- Agents: Focused system prompts (1-2 paragraphs max)
- Commands: Reference skills/agents by name (don't duplicate implementation)

**Extraction Threshold**:
- If adding reference.md would save 200+ tokens on 80%+ invocations → Use progressive disclosure
- If description would exceed ~1200 chars → Consider refactoring or keeping in command

---

### 9.2 Latency Considerations

**Decision**: Balance initialization latency of agents against benefits of isolation and specialization.

**Trade-offs**:
- Agents add startup overhead (gathering context)
- Benefits: Prevent main thread pollution, enable resumable work, support specialization
- Mitigation: Use agent chaining to amortize costs across multiple phases

**Extraction Threshold**:
- If user experience requires instant response → Keep in command
- If workflow benefits from clean context → Extract to agent despite latency
- For long-running tasks (> 30 seconds) → Agent latency is negligible

---

## 10. Recommendations for Transform-Commands Agent

### 10.1 Primary Extraction Patterns

Based on this research, the transform-commands agent should prioritize:

1. **Skill Extraction** for:
   - Validation/verification logic (clear triggers: "validate", "check", "verify")
   - File pattern analysis (triggers: "analyze", "detect", "identify")
   - Schema/structure operations (triggers: "parse", "format", "transform")

2. **Agent Extraction** for:
   - Multi-step transformation pipelines (10+ steps)
   - Parallel file processing (6+ file operations)
   - Analysis-then-modification workflows (separate phases)

3. **Keep in Command** for:
   - Simple prompt templates (< 50 lines)
   - Project-specific workflows (single-use)
   - Tight main-thread integration (interactive refinement)

### 10.2 Validation Criteria

For each extraction, verify:
- [ ] Description under 1024 chars (skill) or focused prompt (agent)
- [ ] Tool permissions specified based on fragility assessment
- [ ] Inline rationale citing specific best practices
- [ ] Transformation history entry with structured explanation
- [ ] File structure follows conventions (.claude/skills/, .claude/agents/)
- [ ] Naming uses speck. prefix consistently

### 10.3 Quality Thresholds

**Minimum Requirements**:
- Skill descriptions: 100-1024 chars, 3+ trigger terms
- Agent prompts: Single objective, tool permissions specified
- Both: Rationale citing 2+ best practice criteria

**Ideal Targets**:
- Skill descriptions: 300-800 chars (sweet spot for quality)
- Agent prompts: 1-2 paragraphs with examples
- Both: Comprehensive rationale with alternatives considered

---

## Appendix A: Reference URLs

- **Skills Guide**: https://code.claude.com/docs/en/skills.md
- **Subagents Documentation**: https://code.claude.com/docs/en/sub-agents.md
- **Slash Commands Reference**: https://code.claude.com/docs/en/slash-commands.md
- **Common Workflows**: https://code.claude.com/docs/en/common-workflows.md
- **Plugin Reference**: https://code.claude.com/docs/en/plugins-reference.md
- **Security Best Practices**: https://code.claude.com/docs/en/security.md
- **IAM & Permissions**: https://code.claude.com/docs/en/iam.md

---

## Appendix B: Glossary

- **Auto-Invoke**: Skills that Claude activates automatically based on context matching
- **Fragility**: Degree of risk/harm if task errors occur (high fragility = low degrees of freedom)
- **Progressive Disclosure**: Pattern of loading supporting files only when contextually relevant
- **Trigger Terms**: Concrete words/phrases users would mention when needing a capability
- **Tool Restriction**: Limiting available tools via `allowed-tools` frontmatter
- **Agent Chaining**: Sequencing multiple specialized agents for complex workflows
- **Single Responsibility**: Design principle where each agent addresses one clear objective

---

## Appendix C: Extraction Examples

### Example 1: Extract as Skill

**Source** (from upstream command):
```markdown
# Validation Logic (120 lines)

Validate the feature specification against these criteria:
- Required sections present
- User scenarios include test scenarios
- Success criteria are measurable
- No TODO placeholders remain

[... detailed validation functions ...]
```

**Extraction Decision**: EXTRACT AS SKILL
- Reusability: Used by analyze, plan, implement commands (3)
- Triggers: "validate", "check", "verify", "specification" (4 terms)
- Complexity: 120 lines, 4 validation functions
- Description: 820 chars (fits limit)

**Output**: `.claude/skills/speck.validation.md`
```markdown
---
name: speck.validation
description: Validate feature specifications against required criteria including section presence, test scenarios, measurable success criteria, and completeness. Use when validating, checking, or verifying specification files or when user mentions spec validation.
allowed-tools: [Read, Grep]
---

# Specification Validation Skill

[Implementation...]

<!-- EXTRACTION DECISION: Skill
RATIONALE: Logic used by 3 commands, 4 trigger terms, 120 lines with 4 functions
CRITERIA MET: Reusability (3 commands), Triggers (4 terms), Complexity (120 lines)
-->
```

---

### Example 2: Extract as Agent

**Source** (from upstream command):
```markdown
# Transformation Pipeline (200 lines, 15 steps, 8 file operations)

1. Read all upstream command files
2. Preprocess: Add speck. prefix to names
3. Preprocess: Update path references
4. Analyze: Identify extractable patterns
5. Extract: Create skill files for reusable logic
6. Extract: Create agent files for complex tasks
7. Validate: Check extracted files
8. Update: Modify source commands to reference extracted components
9. Write: Save all transformed files
10. Report: Generate transformation summary

[... detailed implementation ...]
```

**Extraction Decision**: EXTRACT AS AGENT
- Complexity: 15 logical steps, 8 file operations
- Context: Benefits from isolated context (preprocessed files)
- Tools: Needs Read, Write, Edit, Grep (subset of parent)
- Responsibility: Single objective (transform commands)
- Reusability: Used by transform-upstream, reusable for other transformations

**Output**: `.claude/agents/speck.transformer.md`
```markdown
---
name: speck.transformer
description: Transform upstream spec-kit commands into Claude-native representations by extracting skills and agents, updating references, and validating output. Use when transforming command files or extracting reusable patterns.
tools: Read,Write,Edit,Grep,Glob
---

# Transformation Agent

You are a specialized agent for transforming spec-kit commands into Claude Code representations.

## Responsibilities

- Extract reusable logic as skills (auto-invoke patterns)
- Extract complex tasks as agents (delegated work)
- Update source commands to reference extracted components
- Validate all output against Claude Code best practices

## Tool Permissions

Medium fragility (controlled modifications):
- Read: Access upstream and transformed files
- Write: Create new skill/agent files
- Edit: Update source commands with references
- Grep: Identify extractable patterns
- Glob: Batch process multiple files

[Implementation...]

<!-- EXTRACTION DECISION: Agent
RATIONALE: 15 steps, 8 file ops, benefits from isolation, needs subset of tools
CRITERIA MET: Complexity (15 steps), Context (isolation), Tools (Medium fragility)
-->
```

---

### Example 3: Keep in Command

**Source** (from upstream command):
```markdown
# Feature Numbering Logic (30 lines, 1 function)

Determine the next feature number by checking existing specs and branches.

[... simple implementation ...]
```

**Extraction Decision**: KEEP IN COMMAND
- Reusability: Used only by this command (1)
- Triggers: No clear auto-invoke patterns (manual invoke only)
- Complexity: 30 lines, 1 function
- Description: Would require 1200+ chars to explain context (exceeds limit)

**Rationale**:
```markdown
<!-- NON-EXTRACTION DECISION
RATIONALE: Single-use logic (1 command), no auto-invoke triggers, low complexity (30 lines, 1 function), would require 1200+ char description
CRITERIA NOT MET: Reusability (1 command, threshold 2+), Triggers (none, threshold 3+), Description (1200 chars, limit 1024)
-->
```

---

## Document Metadata

- **Version**: 1.0
- **Last Updated**: 2025-11-15
- **Research Sources**: Claude Code official documentation
- **Target Audience**: Transform-commands agent, speck developers
- **Purpose**: Establish extraction criteria and best practices for skill/agent factoring
