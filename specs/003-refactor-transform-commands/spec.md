# Feature Specification: Refactor Transform Commands Agent

**Feature Branch**: `003-refactor-transform-commands`
**Created**: 2025-11-15
**Status**: Draft
**Input**: User description: "The speck.transform-commands agent is failing to extract any skills or agents from the upstream commands. This is one of the purposes of this project...to factor the spec-kit commands into a Claude-native representation. I suspect that we are overloading the transform-commands agent with responsibilities, some of which would be better accomplished with TS code (copy and search/replace) than with the LLM agent's verbose instructions. Let us consider how we can extract the simple copy-and-modify behavior into TS (as a first step) and then reduce the instructions to the agent to only factoring out agents and skills. We should also research the best-practices for authoring and composing Claude Commands, Agents, and Skills."

## Clarifications

### Session 2025-11-15

- Q: Should the agent generate recommendations for skills/agents or actually create the extracted files? → A: Agent should actually extract skills/agents to new files and reference them from the source command
- Q: Where should extracted skill and agent files be stored in the repository structure? → A: Standard Claude Code locations with speck. prefix (.claude/skills/speck.*.md, .claude/agents/speck.*.md)
- Q: When a command contains both skill-worthy and agent-worthy logic, how should transformation handle this? → A: Extract both - create separate files for each, update command to reference both
- Q: How should system determine threshold for extractable logic? → A: Heuristic-based with explicit criteria; agent must record explanation of extraction decisions (both positive and negative) in existing transformation-history.json
- Q: When preprocessing fails due to unexpected file formats or encoding issues, should transformation continue? → A: Continue with remaining files, log failures, produce error report at end
- Q: What should TypeScript preprocessing handle vs what should the agent handle? → A: TypeScript handles ONLY mechanical string replacements (add speck. prefix, change .specify/ to .speck/, update command references). Agent handles ALL analysis and extraction decisions including identifying sections, calculating complexity, evaluating reusability, and creating files
- Q: When should validation of extracted skill/agent files occur? → A: After agent creates files but before writing to disk - validation layer (Bun validation script) checks descriptions, tool permissions, structure, then either writes valid files or returns errors to agent for correction
- Q: Should the transform-commands agent extract skills/agents from ONLY commands or also from other extracted agents? → A: Agent extracts ONLY from original upstream commands - extracted agents/skills are terminal outputs and not subject to further extraction
- Q: When there are gaps in feature numbering (e.g., 001, 003, 005), should the script use the next sequential number or fill gaps? → A: Use next sequential number (no gap filling)
- Q: When best practices conflict (e.g., conciseness vs completeness in skill descriptions), how should the agent prioritize? → A: Prefer conciseness, cap at 1024 chars; degradation starts above ~300 tokens

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Reliable Command File Transformation (Priority: P1)

When developers run the transformation process, simple copy-and-modify operations are handled automatically through deterministic code, while only the complex factoring decisions (identifying skills vs agents vs commands) require AI agent involvement.

**Why this priority**: This is the core reliability issue blocking the current transformation pipeline. Without reliable extraction of skills and agents, the project cannot fulfill its primary purpose of converting spec-kit commands into Claude-native representations.

**Independent Test**: Can be fully tested by running the transformation on a single upstream command file and verifying that the output command file exists with correct prefixes, basic structure, and identified factoring opportunities. Delivers immediate value by restoring the broken transformation pipeline.

**Acceptance Scenarios**:

1. **Given** an upstream command file with standard structure, **When** transformation runs, **Then** the output command file is created with correct `speck.` prefix and preserved content
2. **Given** an upstream command file, **When** TypeScript preprocessing completes, **Then** all simple text replacements (prefixes, paths, references) are applied correctly
3. **Given** multiple upstream command files, **When** batch transformation runs, **Then** each file is processed with consistent naming and structure

---

### User Story 2 - Automatic Skills/Agents Extraction (Priority: P2)

When the transform-commands agent analyzes preprocessed command files, it automatically extracts reusable logic into skill files and delegates work to subagent files, updating the source command to reference these extracted components.

**Why this priority**: This delivers on the project's goal of factoring commands into Claude-native representations. It builds on P1's reliable preprocessing to add intelligent factoring with actual file creation.

**Independent Test**: Can be tested by running transformation on command files with clear skill-worthy patterns (e.g., repeated validation logic) or agent-worthy tasks (e.g., parallel file processing). Success means new skill/agent files are created and the source command references them correctly.

**Acceptance Scenarios**:

1. **Given** a command with reusable validation logic, **When** agent processes it, **Then** agent creates a new skill file with proper description and updates the command to reference it
2. **Given** a command with parallel independent tasks, **When** agent processes it, **Then** agent creates subagent files with appropriate tool permissions and updates the command to invoke them
3. **Given** a command with context-driven auto-activation needs, **When** agent processes it, **Then** agent correctly chooses skill (auto-invoke) vs command (manual invoke) extraction
4. **Given** transformation output, **When** developer reviews it, **Then** each extracted skill/agent file includes inline rationale citing Claude Code best practices

---

### User Story 3 - Best Practices Documentation Integration (Priority: P3)

The transformation process embeds Claude Code authoring best practices into its decision-making, ensuring that extracted skills and agents follow official guidelines for description fields, file structure, progressive disclosure, and composition.

**Why this priority**: This ensures long-term maintainability and correctness of transformed output. It's lower priority because manual review can catch these issues initially, but automation improves consistency.

**Independent Test**: Can be tested by examining extracted skill/agent files and verifying they include required best-practice elements (third-person descriptions under 1024 chars, appropriate degrees of freedom, file structure). Delivers value by reducing manual review effort.

**Acceptance Scenarios**:

1. **Given** an extracted skill file, **When** reviewing the output, **Then** the description is written in third person, includes triggers, and stays under 1024 characters
2. **Given** an extracted agent file, **When** reviewing the output, **Then** tool permissions match task fragility (high/medium/low degrees of freedom)
3. **Given** complex command logic, **When** factoring occurs, **Then** progressive disclosure patterns are implemented (SKILL.md with references to specialized files)
4. **Given** transformation output, **When** validating against guidelines, **Then** all extracted files follow file structure best practices (forward slashes, descriptive names, one-level-deep references)

---

### User Story 4 - Global Sequential Feature Numbering (Priority: P3)

When developers create new features using the create-new-feature script, the feature number is assigned sequentially across all features in the repository, not per-short-name, ensuring a globally unique and monotonically increasing numbering scheme.

**Why this priority**: This fixes a discovered bug in the create-new-feature.ts script that causes incorrect numbering. While not blocking the transformation work, it prevents confusion and ensures consistency in feature tracking across the repository.

**Independent Test**: Can be tested by creating multiple features with different short-names and verifying that each receives the next available number globally (e.g., if 002-foo exists, the next feature should be 003-bar, not 001-bar). Delivers immediate value by ensuring proper feature numbering.

**Acceptance Scenarios**:

1. **Given** existing features numbered 001 and 002, **When** creating a new feature with any short-name, **Then** the feature is numbered 003
2. **Given** a repository with highest feature number 005, **When** creating a new feature, **Then** the script assigns number 006 regardless of the short-name
3. **Given** multiple branches and specs directories with varying numbers, **When** determining next number, **Then** the script finds the maximum across all sources (remote branches, local branches, specs directories) and increments by one
4. **Given** no existing features, **When** creating the first feature, **Then** the feature is numbered 001

---

### Edge Cases

- What happens when an upstream command has both skill-worthy and agent-worthy sections? → Extract both as separate files and update command to reference both (clarified 2025-11-15)
- How does the system handle commands with nested dependencies or circular references?
- What happens when preprocessing fails due to unexpected file formats or encoding issues? → Continue processing remaining files, collect failures, produce error report at end (clarified 2025-11-15)
- How does the agent distinguish between command-specific logic (keep in command) vs reusable patterns (extract to skill)? → Use heuristic criteria (size, reusability, complexity) and record all decisions in transformation log (clarified 2025-11-15)
- What happens when best practices conflict (e.g., conciseness vs completeness in skill descriptions)? → Prefer conciseness, cap at 1024 chars; quality degradation starts above ~300 tokens (clarified 2025-11-15)
- What happens when there are gaps in feature numbering (e.g., 001, 003, 005) - should the script use the next sequential number or fill gaps? → Use next sequential number (no gap filling) (clarified 2025-11-15)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST separate deterministic text transformations (prefix changes, path updates, reference replacements) into standalone TypeScript preprocessing code; TypeScript preprocessing handles ONLY mechanical string replacements and does NOT perform any semantic analysis, section identification, complexity calculation, or extraction decisions
- **FR-002**: System MUST apply all preprocessing transformations before invoking the transform-commands agent
- **FR-003**: Transform-commands agent MUST focus exclusively on extracting skills, agents, and architectural patterns rather than performing text replacements; agent performs ALL semantic analysis including section identification, complexity scoring, reusability evaluation, and extraction decisions
- **FR-003a**: Transform-commands agent MUST apply explicit heuristic criteria for extraction decisions (size, reusability, complexity) through holistic semantic understanding, not through TypeScript-calculated scores
- **FR-003b**: Transform-commands agent MUST record explanation for ALL extraction decisions in transformation-history.json (both positive: "extracted X because Y" and negative: "no extraction because Z")
- **FR-004**: System MUST validate that each extracted skill or agent file includes specific justification citing Claude Code best practices (as inline comments or metadata); validation occurs after agent generates file content but before writing to disk, using Bun validation scripts that return errors for agent correction if invalid
- **FR-005**: System MUST distinguish between manual-invoke patterns (keep as commands) and auto-invoke patterns (extract as skills) based on usage context
- **FR-006**: TypeScript preprocessing MUST handle batch transformations of multiple command files with consistent rules
- **FR-007**: System MUST provide clear error messages when preprocessing fails, indicating which file and which transformation step failed
- **FR-007a**: When preprocessing fails for individual files, system MUST continue processing remaining files and collect all failures
- **FR-007b**: System MUST produce a comprehensive error report at the end of batch transformation listing all failed files with specific error details
- **FR-008**: Transform-commands agent MUST reference official Claude Code best practices documentation when making factoring decisions
- **FR-009**: System MUST generate transformation output that includes the transformed command file and any extracted skill/agent files with proper references in the source command; extraction occurs ONLY from upstream commands, not recursively from extracted agents
- **FR-010**: Extracted skill files MUST include properly formatted description fields (third person, triggers, under 1024 chars); prefer conciseness with quality degradation starting above ~300 tokens; when practices conflict, technical constraints (1024 char limit) take precedence
- **FR-011**: Extracted agent files MUST specify appropriate tool permissions based on task fragility
- **FR-012**: System MUST detect progressive disclosure opportunities where command content should be split across referenced files and automatically implement the file structure
- **FR-012a**: Extracted skill files MUST be created in `.claude/skills/` directory with `speck.` prefix (e.g., `speck.validation.md`)
- **FR-012b**: Extracted agent files MUST be created in `.claude/agents/` directory with `speck.` prefix (e.g., `speck.validator.md`)
- **FR-012c**: Skill descriptions MUST be designed to auto-invoke when appropriate based on trigger patterns
- **FR-012d**: When a command contains both skill-worthy and agent-worthy logic, system MUST extract both as separate files and update the command to reference both
- **FR-013**: Create-new-feature script MUST assign feature numbers sequentially across ALL features in the repository, not per-short-name
- **FR-014**: Create-new-feature script MUST check all three sources (remote branches, local branches, specs directories) to find the globally highest feature number
- **FR-015**: Create-new-feature script MUST increment the globally highest feature number by one when assigning a new feature number
- **FR-016**: Create-new-feature script MUST use monotonically increasing numbers (no gap filling) even when gaps exist in the sequence

### Key Entities *(include if feature involves data)*

- **Upstream Command File**: A spec-kit command markdown file from the upstream repository, containing instructions, arguments, and workflow logic
- **Transformed Command File**: The speck-native version of the command with updated prefixes, paths, structure, and references to extracted skills/agents
- **Extracted Skill File**: A standalone skill markdown file containing reusable, auto-invoked logic with proper description field, triggers, and implementation details
- **Extracted Agent File**: A standalone agent markdown file containing delegated work with tool permissions, isolation rationale, and task boundaries
- **Transformation History**: The existing transformation-history.json file, enhanced to include extraction decision explanations (both positive and negative) alongside transformation metadata
- **Error Report**: A summary document produced at the end of batch transformations listing all failed files with specific error details, allowing developers to address issues and re-run
- **Preprocessing Rules**: Deterministic text transformation patterns applied to all upstream commands (prefix replacements, path normalization, reference updates)
- **Best Practices Reference**: The corpus of Claude Code authoring guidelines for commands, skills, agents, and composition patterns

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Developers can successfully transform 100% of upstream command files without preprocessing errors
- **SC-002**: Transform-commands agent extracts at least one skill or agent file in 80% of command files that contain extractable patterns
- **SC-003**: Every extracted skill file includes a valid description field that passes automated validation (third person, contains triggers, under 1024 chars)
- **SC-004**: Every extracted agent file includes specific tool permission specifications matching task fragility levels
- **SC-005**: Transformation process completes in under 30 seconds per command file (preprocessing + agent extraction + file creation combined)
- **SC-006**: 90% of transformation outputs require zero manual corrections for basic structural issues (prefixes, paths, references, file creation)
- **SC-007**: Developers can review extracted skill/agent files without consulting external documentation (files are self-contained with inline rationale)
- **SC-007a**: 100% of transformations update transformation-history.json with explanations for all extraction decisions (both positive and negative)
- **SC-008**: Create-new-feature script assigns globally sequential numbers with 100% accuracy across all test scenarios (including gaps, missing specs, and mixed remote/local branches)

## Assumptions *(document reasonable defaults)*

- Upstream command files follow the spec-kit markdown structure with consistent section headings and frontmatter
- The transform-commands agent has access to Claude Code best practices documentation during analysis
- Developers will manually review extracted skill/agent files after transformation completes
- TypeScript preprocessing runs in the Bun runtime environment with access to file system operations
- The transformation pipeline is triggered via the existing `/speck.transform-upstream` command
- Extracted skills are created in `.claude/skills/` directory with `speck.` prefix and auto-invoke descriptions
- Extracted agents are created in `.claude/agents/` directory with `speck.` prefix
- Best practices documentation remains relatively stable and doesn't require frequent re-indexing
- Command files are UTF-8 encoded text files under 50KB in size
- The transformation process is idempotent (running it multiple times produces the same output)

## Out of Scope

- Migration of existing speck commands to the new factoring pattern (focus is on upstream transformations only)
- Runtime validation of skill descriptions or agent tool permissions (validation happens at transformation time)
- Interactive prompting during transformation (fully automated batch process)
- Transformation of non-command files from upstream (templates, documentation, etc.)
- Performance optimization beyond the 30-second per-file target
- Support for non-markdown command file formats

## Dependencies

- Existing `/speck.transform-upstream` command infrastructure
- Access to Claude Code best practices documentation (online or cached)
- Bun runtime environment with TypeScript support
- File system access to upstream command files and output directories
- Transform-commands agent with sufficient context window for best practices reference

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Best practices documentation changes frequently | High - extracted files become outdated | Cache documentation with version tracking; periodically validate against latest docs |
| Preprocessing rules miss edge cases in command formats | Medium - transformation failures | Comprehensive error handling with specific failure messages; expand preprocessing rules iteratively |
| Agent over-extracts or under-extracts skills/agents | Medium - too many files or missed opportunities | Provide clear threshold criteria for skill vs agent vs command patterns; allow tuning based on feedback |
| Extracted files break existing workflows or have incorrect references | High - regression in transformation pipeline | Validate extracted files and references against original functionality; automated testing of file structure |
| Performance degrades with large command files | Low - most files are small | Implement streaming processing for large files; optimize agent prompt to focus on summary analysis |
| Agent creates files with invalid syntax or structure | High - broken output files | Validate extracted files against Claude Code schema; automated syntax checking before writing files |
