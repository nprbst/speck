# Analysis: Subagent Opportunities in /speck.* Commands

## Executive Summary

After reviewing all 14 `/speck.*` commands, I've identified opportunities where subagents could improve performance and conserve context without degrading UX. The key tension is that subagents are **non-interactive** - they cannot ask clarifying questions or get user feedback mid-execution.

## Command Overview

| Command | Complexity | Interactive? | Subagent Opportunity |
|---------|------------|--------------|---------------------|
| `/speck.specify` | High | Yes (clarification questions) | Partial - research phases only |
| `/speck.plan` | High | No (runs autonomously) | **High** - research/generation phases |
| `/speck.tasks` | Medium | No | **High** - pure generation |
| `/speck.implement` | Very High | Yes (stacked PR prompts) | Partial - per-task execution |
| `/speck.clarify` | High | Yes (sequential Q&A) | **Low** - fundamentally interactive |
| `/speck.analyze` | Medium | No (read-only) | **High** - pure analysis |
| `/speck.checklist` | Medium | Yes (clarifying questions) | Partial - generation phase only |
| `/speck.constitution` | Medium | Low interactivity | **Medium** - template filling |
| `/speck.taskstoissues` | Low | No | **High** - batch operation |
| `/speck.branch` | Low | Yes (PR prompts) | **Low** - relies on user decisions |
| `/speck.link` | Low | No | Not needed (simple) |
| `/speck.env` | Low | No | Not needed (diagnostic) |
| `/speck.check-upstream` | Low | No | Not needed (simple fetch) |
| `/speck.pull-upstream` | Low | No | Not needed (simple) |

## High-Opportunity Commands

### 1. `/speck.plan` - Research & Generation Phases

**Current Structure:**
- Phase 0: Research (NEEDS CLARIFICATION resolution, best practices research)
- Phase 1: Design & Contracts generation (data-model.md, contracts/, quickstart.md)

**Subagent Opportunity:**
The research tasks in Phase 0 are explicitly described as parallelizable ("dispatch research agents"). Each research task is:
- Independent
- Read-only exploration
- No user interaction needed
- Results consolidated afterward

**Recommendation:**
```
Phase 0 Research → Launch 2-3 parallel Explore subagents:
  - Agent 1: Research unknowns from Technical Context
  - Agent 2: Find best practices for identified technologies
  - Agent 3: Research integration patterns for dependencies

Benefits:
  - Parallel execution saves time
  - Reduces main context by offloading research
  - Results come back as summaries, not raw exploration
```

**UX Impact:** None - research happens autonomously anyway

---

### 2. `/speck.tasks` - Task Generation

**Current Structure:**
- Load design documents (spec.md, plan.md, data-model.md, contracts/)
- Generate dependency-ordered tasks organized by user story
- Create tasks.md with proper checklist format

**Subagent Opportunity:**
This is almost entirely a generation task with no user interaction. The entire workflow could be delegated to a subagent:

**Recommendation:**
```
Entire command → Single subagent with:
  - Input: Feature directory, available docs, branch/story filters
  - Output: Generated tasks.md content

OR split into parallel subagents:
  - Agent 1: Analyze spec.md user stories + priorities
  - Agent 2: Analyze plan.md tech stack + architecture
  - Agent 3: Analyze data-model.md + contracts/

  Then synthesize into tasks.md
```

**UX Impact:** Minimal - user just sees faster completion

---

### 3. `/speck.analyze` - Consistency Analysis

**Current Structure:**
- Load spec.md, plan.md, tasks.md, constitution.md
- Build semantic models
- Run detection passes (duplication, ambiguity, underspecification, etc.)
- Generate analysis report

**Subagent Opportunity:**
This is explicitly read-only and non-interactive. Perfect for subagent delegation:

**Recommendation:**
```
Detection passes → Parallel subagents:
  - Agent 1: Duplication & terminology drift detection
  - Agent 2: Ambiguity & underspecification detection
  - Agent 3: Coverage gaps & constitution alignment
  - Agent 4: Consistency & cross-reference validation

Each agent returns structured findings, main agent synthesizes report
```

**UX Impact:** None - user receives same report faster

---

### 4. `/speck.taskstoissues` - GitHub Issue Creation

**Current Structure:**
- Read tasks.md
- Create GitHub issues for each task via MCP

**Subagent Opportunity:**
Pure batch operation with no user interaction:

**Recommendation:**
```
Single subagent → Batch issue creation
  - Input: tasks.md content, repo remote URL
  - Output: List of created issue numbers/URLs
  - MCP tool access: github/github-mcp-server/issue_write
```

**UX Impact:** None - batch operation anyway

---

## Medium-Opportunity Commands

### 5. `/speck.constitution` - Template Population

**Current Structure:**
- Load or create constitution template
- Collect/derive values for placeholders
- Validate and write updated constitution
- Generate sync impact report

**Subagent Opportunity:**
The consistency propagation checklist (step 4) reads multiple template files - this could be parallelized:

**Recommendation:**
```
Consistency check → Parallel subagents:
  - Agent 1: Validate plan-template.md alignment
  - Agent 2: Validate spec-template.md alignment
  - Agent 3: Validate tasks-template.md alignment
  - Agent 4: Scan commands/ for outdated references
```

**Caveat:** Only useful if constitution changes are complex enough to warrant parallel validation.

---

### 6. `/speck.specify` - Spec Generation (Partial)

**Current Structure:**
- Generate branch name
- Check existing branches
- Create new feature with script
- Load template and fill spec
- Run validation + clarification questions

**Subagent Opportunity:**
Steps 1-2 (branch name generation + existence checks) are non-interactive and could be parallelized, but the spec generation itself requires clarification questions.

**Recommendation:**
```
Limited opportunity:
  - Parallel git checks (remote branches, local branches, specs dirs)
    → Could use Explore subagent

  NOT suitable for subagent:
  - Spec generation (needs clarification Q&A)
  - Validation (may need user input)
```

---

## Low-Opportunity Commands (Interactive Core)

### 7. `/speck.clarify` - Sequential Q&A

**Why Not Subagent:**
The entire command is sequential Q&A with the user. Each question depends on previous answers. Subagents cannot interact with users.

### 8. `/speck.implement` - Task Execution with PR Prompts

**Why Mostly Not Subagent:**
- Stacked PR automation requires user prompts at story boundaries
- Checklist verification may pause for user confirmation
- Error handling needs user decisions

**Limited Opportunity:**
Individual task execution could theoretically be subagented if the task is self-contained, but the inter-task dependencies and user checkpoints make this risky.

### 9. `/speck.branch` - Branch Management with Prompts

**Why Not Subagent:**
- PR creation prompts require user confirmation
- Import workflow requires interactive spec mapping
- Delete requires force confirmation

### 10. `/speck.checklist` - Interactive Scoping

**Why Mostly Not Subagent:**
Step 2 explicitly generates "up to THREE initial contextual clarifying questions" that require user answers before generation proceeds.

**Limited Opportunity:**
The actual checklist generation (step 5) after clarification could be subagented, but the value is marginal since it's a single generation step.

---

## Implementation Recommendations

### Priority 1: High-Value, Low-Risk

1. **`/speck.analyze`** - Convert to subagent-based parallel detection
   - Highest value: Truly read-only, no interaction needed
   - Clear input/output contract
   - Natural parallelism in detection passes

2. **`/speck.tasks`** - Convert generation to subagent
   - High value: No interaction in generation phase
   - Clean separation of concerns

3. **`/speck.taskstoissues`** - Batch subagent
   - Simple: Just needs MCP access passed through
   - No user decisions needed

### Priority 2: Medium-Value, Medium-Risk

4. **`/speck.plan` Phase 0 Research** - Parallel research subagents
   - Moderate complexity: Need to coordinate research tasks
   - Clear benefit: Research is explicitly described as parallelizable

### Priority 3: Lower Value (Partial Opportunities)

5. **`/speck.specify` branch checks** - Minor optimization
6. **`/speck.constitution` validation** - Only useful for complex constitutions

---

## Other Observations

### Context Conservation Strategy

Beyond subagents, these commands could benefit from:

1. **Progressive Loading**: Load only necessary doc sections, not entire files
   - `/speck.checklist` already mentions this: "Prefer summarizing long sections"
   - Could be applied more consistently

2. **Structured Outputs**: Have subagents return JSON summaries instead of raw findings
   - Reduces context when synthesizing results

3. **Early Exit Patterns**: Commands like `/speck.analyze` could short-circuit if no issues found
   - "Zero issues gracefully" is mentioned but could be more aggressive

### Existing Agent Patterns

The project already has agents in `.claude/agents/`:
- `speck.transform-bash-to-bun.md` - Complex transformation with conflict detection
- `speck.transform-commands.md` - Command transformation with extraction analysis

These demonstrate the pattern of delegating complex, autonomous workflows to agents.

---

## User Feedback

1. **`/speck.implement` interaction**: User prefers current visibility - not interested in subagent-based task execution
2. **`/speck.plan` "dispatch research agents"**: Generic instructions, not tuned for Claude Code - unknown if they work
3. **`/speck.checklist`**: Current flow is fine, rarely used
4. **Priority commands**: `plan`, `tasks`, `analyze`, `implement` are the core workflow

---

## Refined Recommendations

Given the feedback, here are the actionable opportunities:

### Tier 1: High-Value Targets

#### `/speck.analyze` - Best Candidate
- **Why**: Purely read-only, no user interaction, naturally parallel
- **How**: Split detection passes into parallel subagents:
  ```
  Main agent orchestrates:
  ├─ Subagent 1: Duplication + terminology analysis
  ├─ Subagent 2: Ambiguity + underspecification detection
  ├─ Subagent 3: Coverage gaps + constitution alignment
  └─ Main synthesizes findings into report
  ```
- **Risk**: Low - no UX change, just faster results
- **Context savings**: Each subagent works on subset, returns structured findings

#### `/speck.tasks` - Strong Candidate
- **Why**: Pure generation, no mid-execution user interaction
- **How**: Delegate entire generation to single subagent OR parallel analysis:
  ```
  Option A (simpler): Single subagent generates entire tasks.md
  Option B (parallel):
  ├─ Subagent 1: Parse spec.md user stories + priorities
  ├─ Subagent 2: Parse plan.md architecture + tech stack
  └─ Main synthesizes into tasks.md
  ```
- **Risk**: Low - user just gets faster task generation
- **Context savings**: Significant if docs are large

### Tier 2: Worth Investigating

#### `/speck.plan` Phase 0 Research
- **Current state**: Instructions mention "dispatch research agents" but unclear if functional
- **Opportunity**: The research phase (NEEDS CLARIFICATION resolution, best practices) could use parallel Explore subagents
- **Action needed**: Test if current instructions actually invoke subagents, or if it's just aspirational text
- **If not working**: Could be enhanced with explicit Task tool calls for parallel research

### Tier 3: Not Recommended

#### `/speck.implement`
- Per user feedback, keep current interactive flow
- The stacked PR prompts and progress visibility are valued

---

## Implementation Approach

### For `/speck.analyze`:

1. Create `.claude/agents/speck.analyze-duplication.md` - finds duplicates + terminology drift
2. Create `.claude/agents/speck.analyze-ambiguity.md` - finds vague terms + underspecification
3. Create `.claude/agents/speck.analyze-coverage.md` - finds coverage gaps + constitution issues
4. Update `/speck.analyze` command to:
   - Load artifacts once
   - Launch 3 subagents in parallel with Task tool
   - Synthesize results into unified report

### For `/speck.tasks`:

1. Option A: Single subagent approach
   - Create `.claude/agents/speck.generate-tasks.md`
   - Command passes all loaded context, agent returns tasks.md content

2. Option B: Parallel analysis (if docs are typically large)
   - Create analysis agents for spec/plan parsing
   - Main command synthesizes into tasks

### For `/speck.plan` investigation:

1. Test current "dispatch research agents" behavior
2. If not functional, add explicit Task tool invocations for Phase 0 research
3. Keep Phase 1 (design/contracts) in main context since it's generative

---

## Key Files to Modify

| File | Change |
|------|--------|
| `.claude/commands/speck.analyze.md` | Add parallel subagent orchestration |
| `.claude/commands/speck.tasks.md` | Add subagent delegation |
| `.claude/commands/speck.plan.md` | Investigate/fix research agent dispatch |
| `.claude/agents/speck.analyze-*.md` | New - detection subagents |
| `.claude/agents/speck.generate-tasks.md` | New - task generation subagent |
