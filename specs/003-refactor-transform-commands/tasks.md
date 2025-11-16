---
description: "Task list for refactoring transform commands agent"
---

# Tasks: Refactor Transform Commands Agent

**Input**: Design documents from `/specs/003-refactor-transform-commands/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ (all complete)

**Tests**: Not explicitly requested in specification - test tasks not included

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- Single project structure
- `.speck/scripts/` for TypeScript preprocessing and validation
- `.claude/commands/`, `.claude/skills/`, `.claude/agents/` for transformed outputs
- `specs/003-refactor-transform-commands/` for documentation
- `tests/` for test files (at repository root)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Create directory structure for feature 003 in .speck/scripts/ for preprocessing, validation, and transformation modules
- [X] T002 [P] Initialize TypeScript types for preprocessing in .speck/scripts/types/preprocessing.ts
- [X] T003 [P] Initialize TypeScript types for validation in .speck/scripts/types/validation.ts
- [X] T004 [P] Initialize TypeScript types for extraction in .speck/scripts/types/extraction.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 Setup preprocessing rules infrastructure in .speck/scripts/preprocess-commands.ts with STANDARD_PREPROCESSING_RULES export
- [X] T006 [P] Setup validation infrastructure in .speck/scripts/validate-extracted-files.ts with ValidationResult types
- [X] T007 [P] Setup best practices cache mechanism in .speck/memory/best-practices-cache.json
- [X] T008 Create transformation history schema enhancement in .speck/memory/transformation-history.json for extraction decisions
- [X] T009 [P] Setup error reporting structure in .speck/scripts/types/error-reporting.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Reliable Command File Transformation (Priority: P1) 🎯 MVP

**Goal**: Separate deterministic text replacements (TypeScript preprocessing) from intelligent extraction decisions (agent analysis), enabling reliable extraction of skills and agents from upstream command files

**Independent Test**: Run transformation on a single upstream command file and verify that the output command file exists with correct prefixes, basic structure, and identified factoring opportunities. All preprocessing rules applied correctly with consistent naming.

### Implementation for User Story 1

- [X] T010 [P] [US1] Implement add-speck-prefix preprocessing rule in .speck/scripts/preprocess-commands.ts (replaces /speckit. with /speck. in content)
- [X] T011 [P] [US1] Implement normalize-paths preprocessing rule in .speck/scripts/preprocess-commands.ts (replaces .specify/ with .speck/ in content)
- [X] T012 [P] [US1] Implement update-command-refs preprocessing rule in .speck/scripts/preprocess-commands.ts (replaces speckit.taskname with speck.taskname in references)
- [X] T013 [P] [US1] Implement update-filename preprocessing rule in .speck/scripts/preprocess-commands.ts (renames file from speckit.* to speck.*)
- [X] T014 [US1] Implement preprocessCommandFile function in .speck/scripts/preprocess-commands.ts applying all rules sequentially (depends on T010-T013)
- [X] T015 [US1] Implement preprocessBatch function in .speck/scripts/preprocess-commands.ts for batch file processing (depends on T014)
- [X] T016 [P] [US1] Implement validatePreprocessedFile function in .speck/scripts/preprocess-commands.ts checking prefixes, paths, references
- [X] T017 [US1] Add error handling and logging for preprocessing in .speck/scripts/preprocess-commands.ts (depends on T014, T015)
- [X] T018 [US1] Update /speck.transform-upstream command in .claude/commands/speck.transform-upstream.md to call preprocessing before agent invocation

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently - preprocessing works reliably with all text replacements applied correctly

---

## Phase 4: User Story 2 - Automatic Skills/Agents Extraction (Priority: P2)

**Goal**: When the transform-commands agent analyzes preprocessed command files, it automatically extracts reusable logic into skill files and delegates work to subagent files, updating the source command to reference these extracted components

**Independent Test**: Run transformation on command files with clear skill-worthy patterns (e.g., repeated validation logic) or agent-worthy tasks (e.g., parallel file processing). Success means new skill/agent files are created and the source command references them correctly.

### Implementation for User Story 2

- [ ] T019 [P] [US2] Implement validateExtractedFile function in .speck/scripts/validate-extracted-files.ts for skill files (description, triggers, structure checks)
- [ ] T020 [P] [US2] Implement validateExtractedFile function in .speck/scripts/validate-extracted-files.ts for agent files (objective, tool permissions, phase count checks)
- [ ] T021 [P] [US2] Implement validateSkillDescription function in .speck/scripts/validate-extracted-files.ts (third person, length, triggers validation)
- [ ] T022 [P] [US2] Implement validateAgentToolPermissions function in .speck/scripts/validate-extracted-files.ts (fragility level matching)
- [ ] T023 [P] [US2] Implement validateMarkdownStructure function in .speck/scripts/validate-extracted-files.ts (balanced code blocks, valid links, section requirements)
- [ ] T024 [US2] Implement validateAndWrite function in .speck/scripts/validate-extracted-files.ts combining validation and file writes (depends on T019-T023)
- [ ] T024a [US2] Implement quality gate enforcement in .speck/scripts/validate-extracted-files.ts that blocks file writes when validation fails (constitutional requirement - Principle IV)
- [ ] T025 [US2] Refactor transform-commands agent in .claude/agents/speck.transform-commands.md to focus ONLY on extraction decisions using holistic semantic understanding (depends on T019-T024)
- [ ] T026 [US2] Add skill extraction logic to agent in .claude/agents/speck.transform-commands.md using extraction criteria from research.md
- [ ] T027 [US2] Add agent extraction logic to agent in .claude/agents/speck.transform-commands.md using extraction criteria from research.md
- [ ] T028 [US2] Implement extraction decision recording in agent to update transformation-history.json with rationale for ALL decisions (positive and negative)
- [ ] T029 [US2] Add validation retry loop to agent (up to 3 attempts) with error correction based on validation feedback
- [ ] T030 [US2] Implement file reference updates in transformed command files to point to extracted skills/agents

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - transformation pipeline extracts skills/agents automatically with validation

---

## Phase 5: User Story 3 - Best Practices Documentation Integration (Priority: P3)

**Goal**: The transformation process embeds Claude Code authoring best practices into its decision-making, ensuring that extracted skills and agents follow official guidelines for description fields, file structure, progressive disclosure, and composition

**Independent Test**: Examine extracted skill/agent files and verify they include required best-practice elements (third-person descriptions under 1024 chars, appropriate degrees of freedom, file structure). Validation catches issues automatically.

### Implementation for User Story 3

- [ ] T031 [P] [US3] Create best practices cache script in .speck/scripts/cache-best-practices.ts to fetch and cache Claude Code documentation
- [ ] T032 [P] [US3] Implement cache refresh logic in .speck/scripts/cache-best-practices.ts (30-day staleness check)
- [ ] T033 [US3] Add best practices reference loader to agent in .claude/agents/speck.transform-commands.md (depends on T031, T032)
- [ ] T034 [P] [US3] Enhance validateExtractedFile to verify best practices citations are valid URLs/sections in .speck/scripts/validate-extracted-files.ts
- [ ] T035 [US3] Update agent extraction logic to cite specific best practices in rationale fields in .claude/agents/speck.transform-commands.md (depends on T033)
- [ ] T036 [US3] Add progressive disclosure detection to agent in .claude/agents/speck.transform-commands.md using criteria from research.md section 4.3 (3+ complexity levels, 500+ token reference docs, 2+ supporting scripts)
- [ ] T037 [US3] Implement skill description quality checks in .speck/scripts/validate-extracted-files.ts (warn above 300 tokens ~1200 chars, enforce 1024 char limit)
- [ ] T038 [US3] Add tool permission fragility validation in .speck/scripts/validate-extracted-files.ts (high/medium/low mappings from research.md)

**Checkpoint**: All user stories should now be independently functional - best practices fully integrated into transformation pipeline

---

## Phase 6: User Story 4 - Global Sequential Feature Numbering (Priority: P3)

**Goal**: When developers create new features using the create-new-feature script, the feature number is assigned sequentially across all features in the repository, not per-short-name, ensuring a globally unique and monotonically increasing numbering scheme

**Independent Test**: Create multiple features with different short-names and verify that each receives the next available number globally (e.g., if 002-foo exists, the next feature should be 003-bar, not 001-bar)

### Implementation for User Story 4

- [ ] T039 [P] [US4] Update getNextFeatureNumber function in .speck/scripts/create-new-feature.ts to check remote branches for highest number
- [ ] T040 [P] [US4] Update getNextFeatureNumber function in .speck/scripts/create-new-feature.ts to check local branches for highest number
- [ ] T041 [P] [US4] Update getNextFeatureNumber function in .speck/scripts/create-new-feature.ts to check specs directories for highest number
- [ ] T042 [US4] Implement global maximum calculation across all three sources (remote, local, specs) in .speck/scripts/create-new-feature.ts (depends on T039-T041)
- [ ] T043 [US4] Update feature creation logic to use global sequential numbering (no gap filling) in .speck/scripts/create-new-feature.ts (depends on T042)
- [ ] T044 [US4] Add validation to ensure feature number is globally unique in .speck/scripts/create-new-feature.ts

**Checkpoint**: Feature numbering now works correctly with global sequential assignment

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T045 [P] Add comprehensive error reporting in .speck/scripts/types/error-reporting.ts for batch transformation failures
- [ ] T046 [P] Implement error report generation in .speck/scripts/preprocess-commands.ts for preprocessBatch function
- [ ] T047 [P] Add performance monitoring to track transformation time per file (30 second target) with warning logs when threshold exceeded in .speck/scripts/preprocess-commands.ts
- [ ] T048 Code cleanup and refactoring across all .speck/scripts/ modules for consistency
- [ ] T049 [P] Update transformation-history.json schema documentation in specs/003-refactor-transform-commands/data-model.md
- [ ] T050 Run quickstart.md validation scenarios from specs/003-refactor-transform-commands/quickstart.md
- [ ] T051 [P] Document API contracts in specs/003-refactor-transform-commands/contracts/ (already complete, verify accuracy)
- [ ] T052 Update CLAUDE.md with new technologies and structure from feature 003

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - User Story 1 (US1): Can start after Foundational - No dependencies on other stories
  - User Story 2 (US2): Can start after Foundational - Depends on US1 preprocessing being complete
  - User Story 3 (US3): Can start after Foundational - Depends on US2 extraction being functional
  - User Story 4 (US4): Can start after Foundational - Independent of US1/US2/US3 (separate script)
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - Implements preprocessing pipeline
- **User Story 2 (P2)**: Requires US1 complete - Builds on preprocessed files to add extraction
- **User Story 3 (P3)**: Requires US2 complete - Enhances extraction with best practices validation
- **User Story 4 (P3)**: Can start after Foundational (Phase 2) - Independent feature numbering fix

### Within Each User Story

#### User Story 1 (Preprocessing)
- Preprocessing rules (T010-T013) can all run in parallel
- preprocessCommandFile (T014) depends on all rules
- preprocessBatch (T015) depends on preprocessCommandFile
- Validation (T016) can run in parallel with batch function
- Error handling (T017) depends on core functions
- Command update (T018) depends on all preprocessing being complete

#### User Story 2 (Extraction)
- All validation functions (T019-T023) can run in parallel
- validateAndWrite (T024) depends on all validation functions
- Agent refactoring (T025) depends on validation being complete
- Skill extraction (T026) and agent extraction (T027) can run in parallel
- Decision recording (T028) depends on extraction logic
- Retry loop (T029) depends on validation integration
- Reference updates (T030) depends on extraction being complete

#### User Story 3 (Best Practices)
- Cache creation (T031) and cache refresh (T032) can run in parallel
- Reference loader (T033) depends on cache scripts
- Citation validation (T034) can run in parallel with cache work
- Agent updates (T035, T036) depend on reference loader
- Quality checks (T037, T038) can run in parallel

#### User Story 4 (Feature Numbering)
- All source checking (T039-T041) can run in parallel
- Global maximum (T042) depends on all source checks
- Feature creation (T043) depends on global maximum
- Validation (T044) depends on feature creation

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- User Story 4 can start in parallel with User Story 1 (independent workflows)
- Within each story, all tasks marked [P] can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all preprocessing rules together:
Task: "Implement add-speck-prefix preprocessing rule in .speck/scripts/preprocess-commands.ts"
Task: "Implement normalize-paths preprocessing rule in .speck/scripts/preprocess-commands.ts"
Task: "Implement update-command-refs preprocessing rule in .speck/scripts/preprocess-commands.ts"
Task: "Implement update-filename preprocessing rule in .speck/scripts/preprocess-commands.ts"

# After rules complete, these can run together:
Task: "Implement preprocessBatch function in .speck/scripts/preprocess-commands.ts"
Task: "Implement validatePreprocessedFile function in .speck/scripts/preprocess-commands.ts"
```

## Parallel Example: User Story 2

```bash
# Launch all validation functions together:
Task: "Implement validateExtractedFile for skill files in .speck/scripts/validate-extracted-files.ts"
Task: "Implement validateExtractedFile for agent files in .speck/scripts/validate-extracted-files.ts"
Task: "Implement validateSkillDescription in .speck/scripts/validate-extracted-files.ts"
Task: "Implement validateAgentToolPermissions in .speck/scripts/validate-extracted-files.ts"
Task: "Implement validateMarkdownStructure in .speck/scripts/validate-extracted-files.ts"

# After validation complete, these can run together:
Task: "Add skill extraction logic to agent in .claude/agents/speck.transform-commands.md"
Task: "Add agent extraction logic to agent in .claude/agents/speck.transform-commands.md"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Reliable Command File Transformation)
4. **STOP and VALIDATE**: Test preprocessing on a single upstream command file
5. Verify output has correct prefixes, paths, and references

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test preprocessing independently → Delivers reliable text transformations
3. Add User Story 2 → Test extraction independently → Delivers automatic skills/agents extraction
4. Add User Story 3 → Test best practices integration independently → Delivers validation and quality
5. Add User Story 4 (parallel) → Test feature numbering independently → Fixes numbering bug
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (Preprocessing)
   - Developer B: User Story 4 (Feature Numbering - independent)
3. After US1 complete:
   - Developer A: User Story 2 (Extraction)
   - Developer B: Continues US4 or helps with US2
4. After US2 complete:
   - Developer A: User Story 3 (Best Practices)
   - Developer B: Polish tasks

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability (US1, US2, US3, US4)
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- User Story 2 builds on User Story 1 (sequential dependency)
- User Story 3 builds on User Story 2 (sequential dependency)
- User Story 4 is independent and can run in parallel with US1
- Target: <30 seconds per command file transformation (preprocessing + agent extraction + file creation combined)
- All extracted files must pass validation before writes
- All extraction decisions (positive and negative) must be recorded in transformation-history.json
