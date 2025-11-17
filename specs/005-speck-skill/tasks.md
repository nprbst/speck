---
description: "Task list for Speck Workflow Skill implementation"
---

# Tasks: Speck Workflow Skill

**Input**: Design documents from `/specs/005-speck-skill/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Tests are NOT explicitly requested in the specification, so test tasks are OMITTED.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Skill directory**: `.claude/skills/speck-workflow/` (skill directory structure)
- **Skill file**: `.claude/skills/speck-workflow/SKILL.md` (main skill implementation)
- **Templates**: `.specify/templates/*.md` (read-only reference)
- **Feature directories**: `specs/NUM-short-name/` (read by skill)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the skill directory structure and YAML frontmatter configuration

- [x] T001 Create `.claude/skills/speck-workflow/SKILL.md` with YAML frontmatter structure in skill directory
- [x] T002 Write skill description in frontmatter: "Interpret Speck spec, plan, and tasks files. Answer questions about requirements, architecture, and progress without running slash commands." (127 characters)
- [x] T003 Add skill name field to frontmatter: "speck-workflow"

**Checkpoint**: ✅ Skill directory exists with valid SKILL.md and YAML frontmatter

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core skill instructions that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Document feature discovery patterns in skill instructions: three-tier matching (exact → numeric → fuzzy) with regex patterns from research.md
- [x] T005 Document template file locations and structure in skill instructions: `.specify/templates/spec-template.md`, `.specify/templates/plan-template.md`, `.specify/templates/tasks-template.md`
- [x] T006 Document section annotation patterns in skill instructions: `*(mandatory)*`, `*(include if...)*`, HTML comment extraction
- [x] T007 Document five file states in skill instructions: MISSING, EMPTY, MALFORMED, INCOMPLETE, VALID with recovery guidance
- [x] T008 Document error message format in skill instructions: structured format with severity, context, and recovery commands
- [x] T009 Add conversation context tracking guidance in skill instructions: recently mentioned features, current feature context, implicit references

**Checkpoint**: ✅ Foundation ready - skill has complete interpretation framework documented

---

## Phase 3: User Story 1 - Read and Interpret Specs (Priority: P1) 🎯 MVP

**Goal**: Enable users to ask natural language questions about spec.md files and receive accurate answers about requirements, user stories, and success criteria

**Independent Test**: Ask Claude "What are the functional requirements for feature 005?" and verify it correctly reads specs/005-speck-skill/spec.md and lists all FR-XXX items

### Implementation for User Story 1

- [x] T010 [US1] Add spec.md interpretation instructions: explain H1 title format, metadata block structure, mandatory sections
- [x] T011 [US1] Document User Scenarios & Testing section parsing: H3 user story pattern `### User Story N - [Title] (Priority: PN)`, priority extraction, acceptance scenario format (Given/When/Then)
- [x] T012 [US1] Document Requirements section parsing: `## Requirements *(mandatory)*` with subsections `### Functional Requirements` (FR-XXX format) and `### Key Entities` (conditional)
- [x] T013 [US1] Document Success Criteria section parsing: `## Success Criteria *(mandatory)*` with subsection `### Measurable Outcomes` (SC-XXX format)
- [x] T014 [US1] Add instructions for extracting and explaining [NEEDS CLARIFICATION] markers without triggering slash commands
- [x] T015 [US1] Add instructions for handling missing/incomplete spec.md files: detect MISSING state, provide "/speck.specify" recovery guidance
- [x] T016 [US1] Add instructions for graceful degradation: parse partial specs, warn about missing mandatory sections, return completeness percentage

**Checkpoint**: ✅ User Story 1 complete - skill can accurately interpret spec.md structure and answer questions about requirements, user stories, and success criteria

---

## Phase 4: User Story 2 - Understand Plan Structure (Priority: P2)

**Goal**: Enable users to ask natural language questions about plan.md files and receive accurate answers about technical approach, architecture decisions, and dependencies

**Independent Test**: Ask Claude "What technologies are we using for feature 005?" and verify it correctly reads specs/005-speck-skill/plan.md Technical Context section

### Implementation for User Story 2

- [x] T017 [US2] Add plan.md interpretation instructions: explain H1 title format, metadata block with branch/date/spec link, Summary section
- [x] T018 [US2] Document Technical Context section parsing: language, dependencies, storage, testing, platform, performance goals, constraints, scale/scope
- [x] T019 [US2] Document Constitution Check section parsing: principle references, PASS/violation status, justifications in Complexity Tracking
- [x] T020 [US2] Document Project Structure section parsing: documentation tree (specs/###-feature/), source code tree (extract from code blocks)
- [x] T021 [US2] Document Phase sections parsing: Phase 0 research, Phase 1 design artifacts, research.md/data-model.md/contracts/ references
- [x] T022 [US2] Add instructions for explaining scope boundaries: In Scope vs Out of Scope sections, decision rationale extraction
- [x] T023 [US2] Add instructions for handling missing/incomplete plan.md files: detect MISSING/INCOMPLETE states, suggest "/speck.plan" for missing, "/speck.clarify" for incomplete

**Checkpoint**: ✅ User Story 2 complete - skill can accurately interpret plan.md structure and answer questions about technical approach, architecture, and scope

---

## Phase 5: User Story 3 - Navigate Task Lists (Priority: P3)

**Goal**: Enable users to ask natural language questions about tasks.md files and receive accurate answers about task status, remaining work, and dependencies

**Independent Test**: Ask Claude "How many tasks are completed for feature 005?" and verify it correctly counts tasks by status in specs/005-speck-skill/tasks.md

### Implementation for User Story 3

- [x] T024 [US3] Add tasks.md interpretation instructions: explain YAML frontmatter, H1 title format, Format explanation section
- [x] T025 [US3] Document task format parsing: checkbox `- [ ]`, Task ID (T###), [P] parallelizable marker, [Story] label (US1/US2/etc), description with file path
- [x] T026 [US3] Document Phase structure parsing: Phase 1 Setup, Phase 2 Foundational, Phase 3+ User Stories, Final Phase Polish
- [x] T027 [US3] Document task status detection: unchecked `- [ ]` = pending, checked `- [x]` = completed, "in_progress" marker if present
- [x] T028 [US3] Document dependency parsing: Dependencies & Execution Order section, phase completion order, user story independence
- [x] T029 [US3] Add instructions for identifying available work: tasks with satisfied dependencies + pending status, checkpoint markers between phases
- [x] T030 [US3] Add instructions for handling missing/incomplete tasks.md files: detect MISSING state, suggest "/speck.tasks" recovery guidance

**Checkpoint**: ✅ User Story 3 complete - skill can accurately interpret tasks.md structure and answer questions about task status and remaining work

---

## Phase 6: User Story 4 - Compare Templates to Actual Files (Priority: P4)

**Goal**: Enable users to ask Claude to compare their spec/plan/tasks files against templates to identify missing or misplaced sections

**Independent Test**: Create an incomplete spec.md missing Success Criteria section, ask "Does my spec follow the template?", verify Claude identifies missing mandatory section

### Implementation for User Story 4

- [x] T031 [US4] Add template comparison workflow instructions: load template file from `.specify/templates/`, load actual file from feature directory, extract sections from both
- [x] T032 [US4] Document template section extraction: parse `##` and `###` headers, identify mandatory markers `*(mandatory)*`, identify conditional markers `*(include if...)*`
- [x] T033 [US4] Document structural comparison logic: check for missing mandatory sections, check for out-of-order sections, check for wrong heading levels (H2 vs H3)
- [x] T034 [US4] Document content completeness checking: detect empty sections (header present but no content), detect placeholder markers `[FEATURE]`, `[DATE]`, `TODO`, `[NEEDS CLARIFICATION]`
- [x] T035 [US4] Add instructions for extracting section purposes from template comments: parse HTML comments `<!-- ... -->`, extract first line as purpose, parse ACTION REQUIRED/IMPORTANT keywords
- [x] T036 [US4] Add instructions for generating comparison report: list missing sections with severity (error for mandatory), suggest specific fixes, calculate completeness percentage
- [x] T037 [US4] Add instructions for explaining section purposes when user asks: extract comment text from template for requested section, explain intent and expected content

**Checkpoint**: ✅ User Story 4 complete - skill can compare actual files against templates and identify structural issues

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Refinements that improve the skill across all user stories

- [x] T038 [P] Add edge case handling instructions: non-existent feature references (suggest alternatives using Levenshtein distance), invalid file type requests (explain valid types), ambiguous feature names (ask for clarification)
- [x] T038a [P] Add template version tolerance instructions: when comparing files to templates, ignore minor formatting differences (extra whitespace, comment style variations), focus on structural completeness (mandatory sections present), warn user if template has new sections not in their file but don't mark as error
- [x] T039 [P] Add multi-feature conversation handling: maintain conversation context, track recently mentioned features, resolve pronoun references ("it", "that", "the spec")
- [x] T040 [P] Add helpful error message templates: feature not found format, file missing format, section incomplete format with recovery commands
- [x] T040a [P] Implement error message templates in skill instructions: use templates from T040 for feature-not-found (with Levenshtein suggestions), file-missing (with /speck.* recovery commands), section-incomplete (with completeness %) (validates FR-012)
- [x] T041 [P] Document feature number padding logic: recognize "5" as "005", "42" as "042" for consistent matching
- [x] T042 Validate skill frontmatter YAML syntax: ensure valid YAML delimiters `---`, verify description length 80-150 characters, verify name is unique
- [x] T043 Run manual validation tests from quickstart.md: test activation with explicit feature references, test activation with file type mentions, test activation with Speck terminology
- [x] T043a Validate automatic skill activation: test 10 representative queries (e.g., "What are the requirements for feature 005?", "Tell me about the auth spec", "What tasks remain?") and verify skill activates within 1 turn without user repeating question (validates FR-001, SC-003)
- [x] T044 Add final skill documentation: (1) Slash Command Reference section listing core commands (/speck.specify, /speck.plan, /speck.tasks, /speck.clarify, /speck.implement, /speck.analyze) with format "command name | 1-2 sentence purpose | example trigger phrase", (2) usage examples for each user story, (3) troubleshooting section for common activation issues, (4) limitations note (read-only, no file modification) (validates FR-013)
- [x] T045 Implement /speck. to /speck: pattern replacement in build script: update scripts/build-plugin.ts to perform regex replacement `/speck\.([a-z-]+)` → `/speck:$1` on SKILL.md content during plugin packaging, preserving all other content unchanged (validates FR-015)

**Checkpoint**: ✅ Skill polished and ready for validation testing

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational completion
- **User Story 2 (Phase 4)**: Depends on Foundational completion - CAN run in parallel with US1
- **User Story 3 (Phase 5)**: Depends on Foundational completion - CAN run in parallel with US1/US2
- **User Story 4 (Phase 6)**: Depends on Foundational completion - CAN run in parallel with US1/US2/US3
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: No dependencies on other stories - Can start after Foundational phase
- **User Story 2 (P2)**: No dependencies on other stories - Can start after Foundational phase
- **User Story 3 (P3)**: No dependencies on other stories - Can start after Foundational phase
- **User Story 4 (P4)**: Builds on US1 template parsing knowledge but is independently testable

### Within Each User Story

- All tasks within a user story should be completed sequentially in task ID order
- Tasks build on each other (e.g., T010 defines spec structure before T011 defines subsections)
- Each user story ends with a checkpoint validating independent functionality

### Parallel Opportunities

- **Phase 1**: All tasks (T001-T003) can run in parallel (different sections of same file, no dependencies)
- **Phase 2**: Tasks T004-T009 should be sequential (build foundational knowledge progressively)
- **User Stories**: After Phase 2 completes, all user stories (Phase 3, 4, 5, 6) can start in parallel by different developers
- **Phase 7**: Tasks T038-T041 marked [P] can run in parallel (different sections/concerns)

---

## Parallel Example: After Foundational Phase

```bash
# Once Phase 2 (Foundational) is complete, launch all user stories in parallel:

Developer A:
Task: "Add spec.md interpretation instructions" (T010-T016)

Developer B:
Task: "Add plan.md interpretation instructions" (T017-T023)

Developer C:
Task: "Add tasks.md interpretation instructions" (T024-T030)

Developer D:
Task: "Add template comparison workflow instructions" (T031-T037)

# All developers work on same file (.claude/skills/speck-workflow.md) but different logical sections
# Git merge conflicts minimal due to section-based organization
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T009) - CRITICAL, blocks all stories
3. Complete Phase 3: User Story 1 (T010-T016)
4. **STOP and VALIDATE**: Test by asking Claude about spec.md files
5. Use skill for reading specs, validate 95% accuracy (SC-001)

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test spec.md interpretation independently → Deploy (MVP!)
3. Add User Story 2 → Test plan.md interpretation independently → Deploy
4. Add User Story 3 → Test tasks.md interpretation independently → Deploy
5. Add User Story 4 → Test template comparison independently → Deploy
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers working on same file:

1. Team completes Setup + Foundational together (T001-T009)
2. Once Foundational is done, assign sections:
   - Developer A: spec.md interpretation section (US1)
   - Developer B: plan.md interpretation section (US2)
   - Developer C: tasks.md interpretation section (US3)
   - Developer D: template comparison section (US4)
3. Merge sections together, test integration
4. Complete Polish phase together

---

## Notes

- **Directory-based skill approach**: Skill implemented in `.claude/skills/speck-workflow/SKILL.md` per Claude Code plugin 2.0 standards
- **[P] tasks**: Different logical sections, minimal dependencies
- **[Story] labels**: Track which user story each task serves for traceability
- **Each user story independently testable**: Can validate spec interpretation without plan interpretation
- **Research.md reference**: Tasks T004-T009 implement findings from research.md Phase 0
- **Contracts reference**: User Story 1 (T010-T016) implements file-interpretation.md contract for spec.md
- **No tests requested**: Specification does not request automated tests, so test tasks are omitted (manual testing via natural queries)
- **Read-only constraint**: Skill never modifies files (FR-012, Assumptions section)
- **Graceful degradation**: All user stories include instructions for handling missing/incomplete files
- **Activation probability**: Description field (T002) optimized per research.md findings (127 characters, semantic relevance-based)

---

## Success Criteria Mapping

- **SC-001**: Achieved by completing all user stories (T010-T037) - 95% accuracy in natural language Q&A
- **SC-002**: Achieved by US1 (T010-T016) - 100% accuracy in section extraction when section exists
- **SC-003**: Achieved by Foundational (T004-T009) and description field (T002) - skill activates within 1 turn
- **SC-004**: Achieved by all user stories - 80% reduction in manual slash command usage for reading
- **SC-005**: Achieved by US1-US3 (T015, T023, T030) - helpful guidance for missing files
- **SC-006**: Achieved by US4 (T031-T037) - 100% accuracy in identifying missing mandatory sections
- **SC-007**: Achieved by Polish phase (T038-T041) - multi-feature conversation support

---

## Task Count Summary

- **Total tasks**: 47
- **Phase 1 (Setup)**: 3 tasks
- **Phase 2 (Foundational)**: 6 tasks
- **Phase 3 (User Story 1 - P1)**: 7 tasks
- **Phase 4 (User Story 2 - P2)**: 7 tasks
- **Phase 5 (User Story 3 - P3)**: 7 tasks
- **Phase 6 (User Story 4 - P4)**: 7 tasks
- **Phase 7 (Polish)**: 10 tasks

**Parallel opportunities**: 14 tasks marked [P] (30% of total)

**MVP scope**: Phases 1-3 (16 tasks) delivers User Story 1 - Read and Interpret Specs

**Format validation**: ✅ All tasks follow checklist format with checkbox, task ID, story label (where applicable), and exact file paths
