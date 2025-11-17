# Tasks: Claude Plugin Packaging

**Input**: Design documents from `/specs/002-claude-plugin-packaging/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not explicitly requested in specification - tests excluded from this task list.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US4)
- Include exact file paths in descriptions

## Path Conventions

Build output: `dist/plugin/`
Plugin manifests: `.claude-plugin/`
Build scripts: `scripts/`
Source commands: `.claude/commands/`
Source agents: `.claude/agents/`
Source templates: `.specify/templates/`
Source scripts: `.specify/scripts/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Create `.claude-plugin/` directory at repository root
- [X] T002 Create `dist/plugin/` build output directory structure
- [X] T003 Create `scripts/` directory for build tooling

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Create JSON schema contracts in `specs/002-claude-plugin-packaging/contracts/plugin.schema.json` for plugin.json validation
- [X] T005 [P] Create JSON schema contracts in `specs/002-claude-plugin-packaging/contracts/marketplace.schema.json` for marketplace.json validation
- [X] T006 [P] Create JSON schema contracts in `specs/002-claude-plugin-packaging/contracts/command-frontmatter.schema.json` for command validation
- [X] T007 [P] Create JSON schema contracts in `specs/002-claude-plugin-packaging/contracts/agent-frontmatter.schema.json` for agent validation
- [X] T008 Create build script skeleton in `scripts/build-plugin.ts` with Bun imports and basic structure
- [X] T009 Implement version detection from `package.json` in `scripts/build-plugin.ts`
- [X] T010 Implement directory creation utilities in `scripts/build-plugin.ts` (mkdir, copy functions)
- [X] T010f Create `hooks/hooks.json` at repository root with SessionStart hook configuration pointing to scripts/setup-env.sh
- [X] T010g Create `scripts/setup-env.sh` bash script with shebang and CLAUDE_ENV_FILE detection logic
- [X] T010h Implement setup-env.sh core logic: if CLAUDE_ENV_FILE exists, write `export SPECK_PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT}/.speck"` to file, exit 0
- [X] T010i Add hooks/ directory copy logic in `scripts/build-plugin.ts` to copy `hooks/hooks.json` to `dist/plugin/hooks/hooks.json`
- [X] T010j Add scripts/setup-env.sh copy logic in `scripts/build-plugin.ts` to copy to `dist/plugin/scripts/setup-env.sh` with executable permissions

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Install Speck Plugin from Marketplace (Priority: P1) 🎯 MVP

**Goal**: Package all Speck components (commands, agents, templates, scripts) into a Claude Marketplace-compliant plugin that users can install with one command

**Independent Test**: Build the plugin with `bun run scripts/build-plugin.ts`, verify `dist/plugin/` contains all required files, install locally with `/plugin install file:///absolute/path/to/dist/plugin`, verify `/speck.specify` command works

### Implementation for User Story 1

- [X] T011 [P] [US1] Create plugin.json manifest generator in `scripts/build-plugin.ts` with name, version, description, author fields per plugin.schema.json
- [X] T012 [P] [US1] Create marketplace.json manifest generator in `scripts/build-plugin.ts` with marketplace structure per marketplace.schema.json
- [X] T013 [US1] Implement command file copy logic in `scripts/build-plugin.ts` to copy `.claude/commands/*.md` to `dist/plugin/commands/`
- [X] T014 [US1] Implement agent file copy logic in `scripts/build-plugin.ts` to copy `.claude/agents/*.md` to `dist/plugin/agents/`
- [X] T015 [US1] Implement template file copy logic in `scripts/build-plugin.ts` to copy `.specify/templates/*` to `dist/plugin/templates/`
- [X] T016 [US1] Implement script file copy logic in `scripts/build-plugin.ts` to copy `.specify/scripts/*` to `dist/plugin/scripts/`
- [X] T016a [P] [US1] Implement constitution file copy logic in `scripts/build-plugin.ts` to copy `.specify/memory/constitution.md` to `dist/plugin/memory/` if it exists
- [X] T016b [P] [US1] Implement .speck/scripts/ copy logic in `scripts/build-plugin.ts` to copy `.speck/scripts/*.ts` to `dist/plugin/scripts/` for speck-runner skill access
- [X] T017 [US1] Implement package size validation in `scripts/build-plugin.ts` to ensure total size < 5MB (5242880 bytes)
- [X] T018 [US1] Implement command Markdown validation in `scripts/build-plugin.ts` to verify all .md files in commands/ are valid
- [X] T019 [US1] Implement agent frontmatter validation in `scripts/build-plugin.ts` to verify required name and description fields
- [X] T020 [US1] Implement manifest JSON validation in `scripts/build-plugin.ts` to verify plugin.json and marketplace.json parse correctly
- [X] T021 [US1] Implement missing file detection in `scripts/build-plugin.ts` to fail build if required files absent
- [X] T022 [US1] Add build output logging in `scripts/build-plugin.ts` showing package size, file counts, and validation results
- [X] T022a [US1] Implement BUILD FAILED error message pattern in `scripts/build-plugin.ts` following format: "BUILD FAILED: [description]. [details]. Action: [fix]" per FR-030
- [X] T023 [US1] Create initial plugin.json manifest in `.claude-plugin/plugin.json` with name "speck", version "0.1.0", required metadata
- [X] T024 [US1] Create initial marketplace.json manifest in `.claude-plugin/marketplace.json` with Speck plugin entry
- [X] T025 [US1] Add dependencies declaration in `.claude-plugin/plugin.json` for git >=2.30.0 and bash shell
- [X] T026 [US1] Add keywords to `.claude-plugin/plugin.json` for searchability: "specification", "planning", "workflow", "feature-management", "development-tools"
- [X] T026a [US1] Update all `.claude/commands/*.md` files to use bash pattern `bun run ${SPECK_PLUGIN_ROOT:-".speck"}/scripts/<script-name>.ts` for script execution
- [X] T026b [US1] Add debugging output `echo "DEBUG: $(env | grep PLUGIN)"` at the beginning of bash execution steps in all `.claude/commands/*.md` files
- [X] T027 [US1] Run build script and verify `dist/plugin/` structure matches Claude Plugin format specification
- [ ] T028 [US1] Test local plugin installation with `/plugin install file:///path/to/dist/plugin` and verify all commands available

**Checkpoint**: At this point, User Story 1 should be fully functional - plugin builds successfully and installs locally with all commands working

---

## Phase 4: User Story 4 - Discover Plugin Capabilities (Priority: P2)

**Goal**: Provide comprehensive documentation and marketplace listing content so users can understand Speck's capabilities before installing

**Independent Test**: View generated README.md and verify it clearly explains what Speck does, lists all commands with descriptions, and includes installation instructions

### Implementation for User Story 4

- [X] T029 [P] [US4] Create README.md template in `scripts/build-plugin.ts` with plugin description section
- [X] T030 [P] [US4] Add installation instructions to README.md template in `scripts/build-plugin.ts` showing `/plugin install` command
- [X] T031 [US4] Add commands reference section to README.md template in `scripts/build-plugin.ts` listing all 20+ slash commands with descriptions
- [X] T032 [US4] Add system requirements section to README.md template in `scripts/build-plugin.ts` specifying git 2.30+, bash, Claude Code 2.0+
- [X] T033 [US4] Add quick start guide to README.md template in `scripts/build-plugin.ts` with example workflow
- [X] T034 [US4] Add usage examples to README.md template in `scripts/build-plugin.ts` showing `/speck.specify` and `/speck.plan` commands
- [X] T035 [US4] Implement README.md generation in `scripts/build-plugin.ts` to write to `dist/plugin/README.md`
- [X] T036 [US4] Enhance marketplace.json in `.claude-plugin/marketplace.json` with comprehensive description field (max 1024 chars)
- [X] T037 [US4] Add category "development-tools" to marketplace.json plugin entry in `.claude-plugin/marketplace.json`
- [X] T038 [US4] Verify README.md appears in `dist/plugin/` after build
- [X] T039 [US4] Review README.md content for clarity, completeness, and accuracy

**Checkpoint**: At this point, User Stories 1 AND 4 should both work - plugin installs and documentation clearly explains capabilities

---

## Phase 5: User Story 2 - Update Installed Plugin (Priority: P2)

**Goal**: Enable version tracking and changelog so users can see what changed between releases and update their installed plugin

**Independent Test**: Update version in package.json to 0.1.1, add CHANGELOG entry, rebuild plugin, verify new version appears in plugin.json and CHANGELOG.md exists in dist/plugin/

### Implementation for User Story 2

- [X] T040 [P] [US2] Create CHANGELOG.md template in `scripts/build-plugin.ts` following Keep a Changelog format
- [X] T041 [P] [US2] Add initial v0.1.0 entry to CHANGELOG.md template with "Added" section listing initial features
- [X] T042 [US2] Implement CHANGELOG.md generation in `scripts/build-plugin.ts` to copy from repository root to `dist/plugin/CHANGELOG.md`
- [X] T043 [US2] Add version sync logic in `scripts/build-plugin.ts` to read from package.json and write to plugin.json
- [X] T044 [US2] Add version sync logic in `scripts/build-plugin.ts` to update marketplace.json version field
- [X] T045 [US2] Add version validation in `scripts/build-plugin.ts` to ensure semantic versioning format (regex: `^\d+\.\d+\.\d+$`)
- [X] T046 [US2] Add build failure handler in `scripts/build-plugin.ts` for invalid version format with descriptive error
- [X] T047 [US2] Create initial CHANGELOG.md in repository root documenting v0.1.0 release (will be copied to dist/plugin/ by T042)
- [X] T048 [US2] Test version bump workflow: update package.json to 0.1.1, rebuild, verify all manifests updated
- [X] T049 [US2] Verify CHANGELOG.md appears in `dist/plugin/` after build

**Checkpoint**: All user stories (US1, US2, US4) should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T050 [P] Update CLAUDE.md with new technologies: "Claude Code plugin system 2.0+", "Build tooling: Bun shell API"
- [X] T051 [P] Update CLAUDE.md with new commands: "bun run scripts/build-plugin.ts" for building plugin package
- [X] T052 [P] Add .gitignore entry for `dist/plugin/` build output directory
- [X] T053 [P] Create package.json script alias: "build-plugin": "bun run scripts/build-plugin.ts"
- [X] T054 Add error handling for file copy failures in `scripts/build-plugin.ts`
- [X] T055 Add error handling for insufficient disk space in `scripts/build-plugin.ts`
- [X] T056 Add error handling for permission errors in `scripts/build-plugin.ts`
- [X] T057 Add build-time validation for duplicate command names in `scripts/build-plugin.ts`
- [X] T058 Add build-time validation for duplicate agent names in `scripts/build-plugin.ts`
- [X] T059 Add final build summary in `scripts/build-plugin.ts` showing total files, total size, validation status
- [X] T060 Run quickstart.md validation: execute all commands from quickstart.md and verify outputs match expectations
- [X] T061 Final end-to-end test: clean build, local install, test all commands, verify documentation accuracy

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3, 4, 5)**: All depend on Foundational phase completion
  - US1 (Phase 3) can proceed independently after Foundational
  - US4 (Phase 4) depends on US1 completion (needs build system to generate README)
  - US2 (Phase 5) depends on US1 completion (needs build system to generate CHANGELOG)
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1) - Phase 3**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 4 (P2) - Phase 4**: Depends on US1 (build system must exist to generate documentation)
- **User Story 2 (P2) - Phase 5**: Depends on US1 (build system must exist to generate changelog and sync versions)

### Within Each User Story

**User Story 1 (Core Build System)**:
- Manifest generators (T011, T012) before file copying (T013-T016)
- File copying (T013-T016) before validation (T017-T021)
- Validation (T017-T021) before logging (T022)
- Build script complete before creating manifests (T023-T024)
- Manifests complete before testing (T027-T028)

**User Story 4 (Documentation)**:
- README template (T029-T034) before generation (T035)
- Marketplace description (T036-T037) can run in parallel with README
- Generation before verification (T038-T039)

**User Story 2 (Versioning)**:
- CHANGELOG template (T040-T041) before generation (T042)
- Version sync (T043-T044) in parallel with CHANGELOG
- Validation (T045-T046) before testing (T048-T049)

### Parallel Opportunities

**Phase 2 (Foundational)**: Tasks T004-T007 (all schema creation) can run in parallel
**Phase 3 (US1)**: Tasks T011-T012 (manifest generators) can run in parallel
**Phase 4 (US4)**: Tasks T029-T030 (README sections) can run in parallel
**Phase 5 (US2)**: Tasks T040-T041 (CHANGELOG template) can run in parallel with T043-T044 (version sync)
**Phase 6 (Polish)**: Tasks T050-T053 (documentation and config updates) can run in parallel

---

## Parallel Example: User Story 1 (Core Build)

```bash
# Launch manifest generators in parallel:
Task: "Create plugin.json manifest generator in scripts/build-plugin.ts"
Task: "Create marketplace.json manifest generator in scripts/build-plugin.ts"

# Launch file copy operations in parallel (after manifest generators complete):
Task: "Implement command file copy logic in scripts/build-plugin.ts"
Task: "Implement agent file copy logic in scripts/build-plugin.ts"
Task: "Implement template file copy logic in scripts/build-plugin.ts"
Task: "Implement script file copy logic in scripts/build-plugin.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (create directory structure)
2. Complete Phase 2: Foundational (schemas and build script skeleton)
3. Complete Phase 3: User Story 1 (core build system)
4. **STOP and VALIDATE**: Run `bun run scripts/build-plugin.ts`, verify `dist/plugin/` structure, test local installation
5. Deploy/demo if ready

At this point you have a working plugin package that can be installed!

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → **MVP: Installable plugin! ✅**
3. Add User Story 4 → Test independently → **Plugin with great documentation! 📚**
4. Add User Story 2 → Test independently → **Plugin with version tracking! 🔄**
5. Polish → Final production-ready plugin

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (core build system)
3. Once User Story 1 complete:
   - Developer B: User Story 4 (documentation)
   - Developer C: User Story 2 (versioning)
4. Both complete and integrate independently

---

## Summary

**Total Tasks**: 71 tasks (removed 6 obsolete speck-runner tasks, added 5 SessionStart hook tasks, added 3 command/error tasks)
- Phase 1 (Setup): 3 tasks
- Phase 2 (Foundational): 16 tasks (added T010f-T010j for SessionStart hooks)
- Phase 3 (US1 - Install): 24 tasks (added T022a, T026a, T026b)
- Phase 4 (US4 - Discover): 11 tasks
- Phase 5 (US2 - Update): 10 tasks
- Phase 6 (Polish): 12 tasks

**Task Count per User Story**:
- User Story 1 (P1 - Install): 19 tasks
- User Story 2 (P2 - Update): 10 tasks
- User Story 4 (P2 - Discover): 11 tasks
- User Story 3 (P3 - Uninstall): 0 tasks (out of scope - handled by Claude Plugin system)

**Parallel Opportunities Identified**:
- 4 schema creation tasks in Phase 2
- 2 manifest generator tasks in Phase 3
- 4 file copy tasks in Phase 3
- 2 README section tasks in Phase 4
- 4 documentation tasks in Phase 6

**Independent Test Criteria**:
- US1: Build plugin, install locally, verify commands work
- US4: Review README.md, verify clarity and completeness
- US2: Bump version, rebuild, verify version sync and changelog

**Suggested MVP Scope**:
- Phase 1 (Setup) + Phase 2 (Foundational) + Phase 3 (User Story 1)
- This delivers the core capability: a working Claude Code plugin that can be installed

**Implementation Notes**:
- User Story 3 (Uninstall) is entirely handled by Claude Plugin system - no implementation tasks needed
- Tests are NOT requested in the specification - excluded from task list
- Build validation tasks (T017-T021) are critical for catching packaging errors early
- Version sync (T043-T044) ensures consistency between package.json and plugin manifests

---

## Notes

- [P] tasks = different files, no dependencies, can run in parallel
- [Story] label maps task to specific user story (US1, US2, US4) for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group for clean git history
- Stop at any checkpoint to validate story independently
- Build script (`scripts/build-plugin.ts`) is the central implementation artifact
- All validation should fail fast with descriptive errors per requirements FR-024 to FR-027
