# Feature Specification: Atomic Transform Rollback

**Feature Branch**: `016-atomic-transform-rollback`
**Created**: 2025-11-30
**Status**: Draft
**Input**: User description: "Implement staged transformation with atomic rollback for transform-upstream command to fulfill FR-012 atomic operation guarantee. When Agent 1 transforms scripts but Agent 2 fails, the system must rollback to prevent broken state. Uses staging directory pattern with commit/rollback semantics."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Successful Two-Agent Transformation (Priority: P1)

A developer runs the transform-upstream command to pull and transform a new upstream release. Both Agent 1 (script transformation) and Agent 2 (command transformation) complete successfully. All transformed files are atomically moved from staging to production directories.

**Why this priority**: This is the happy path that must work correctly. Without atomic commit, successful transformations could still leave files in inconsistent locations.

**Independent Test**: Run transform-upstream on a test release with known transformable files. Verify all transformed scripts and commands appear in production directories only after both agents complete.

**Acceptance Scenarios**:

1. **Given** a new upstream release is available, **When** the developer runs transform-upstream and both agents succeed, **Then** all transformed files appear in their production directories atomically
2. **Given** transformation is in progress, **When** Agent 1 completes but Agent 2 is still running, **Then** no transformed files exist in production directories yet
3. **Given** both agents have completed successfully, **When** commit is performed, **Then** the staging directory is cleaned up and removed

---

### User Story 2 - Agent 2 Failure with Clean Rollback (Priority: P1)

A developer runs transform-upstream. Agent 1 successfully transforms scripts to the staging directory. Agent 2 then fails (e.g., syntax error in a command template, network issue, or validation failure). The system automatically rolls back by deleting the staging directory, leaving production directories unchanged.

**Why this priority**: This is the critical failure scenario that motivated this feature. Without rollback, Agent 1's transformed scripts would exist without corresponding command updates, breaking the system.

**Independent Test**: Simulate Agent 2 failure (via test hook or mock). Verify that after rollback, production directories contain exactly the same files as before transformation started.

**Acceptance Scenarios**:

1. **Given** Agent 1 has completed writing to staging, **When** Agent 2 fails, **Then** the staging directory is deleted and no changes exist in production
2. **Given** Agent 2 fails mid-transformation, **When** rollback occurs, **Then** the transformation status is updated to 'failed' with an appropriate error message
3. **Given** rollback completes, **When** developer runs transform-upstream again, **Then** the system starts fresh with no remnants of the previous failed attempt

---

### User Story 3 - Recovery from Orphaned Staging (Priority: P2)

A developer's transform-upstream command crashes unexpectedly (power loss, process killed, system crash) leaving an orphaned staging directory. On the next run, the system detects the orphaned staging and prompts the developer with recovery options: commit (if transformation was complete), rollback (clean delete), or inspect (examine staging contents).

**Why this priority**: While less common than Agent 2 failures, system crashes can happen. Recovery prevents developers from being stuck with manual cleanup.

**Independent Test**: Create an orphaned staging directory manually, then run transform-upstream. Verify the recovery prompt appears with all three options functional.

**Acceptance Scenarios**:

1. **Given** an orphaned staging directory exists from a previous crash, **When** transform-upstream is run, **Then** the system detects it and presents recovery options
2. **Given** orphaned staging with completed transformation, **When** developer chooses "commit", **Then** staged files are moved to production and staging is cleaned up
3. **Given** orphaned staging with incomplete transformation, **When** developer chooses "rollback", **Then** staging is deleted with no production changes
4. **Given** orphaned staging exists, **When** developer chooses "inspect", **Then** the system displays staging contents and transformation progress

---

### User Story 4 - Agent 1 Failure (Priority: P2)

A developer runs transform-upstream and Agent 1 fails before completing (e.g., malformed upstream source, unsupported script pattern). The system cleans up any partial staging files and reports the failure without ever invoking Agent 2.

**Why this priority**: Agent 1 failures are simpler since Agent 2 never runs, but the cleanup behavior must still be correct.

**Independent Test**: Provide upstream content that causes Agent 1 to fail. Verify no staging directory remains after failure.

**Acceptance Scenarios**:

1. **Given** Agent 1 encounters an error, **When** it fails, **Then** any partial staging files are deleted
2. **Given** Agent 1 fails, **When** failure is reported, **Then** Agent 2 is never invoked
3. **Given** Agent 1 fails, **When** the developer checks the transformation status, **Then** it shows 'failed' with Agent 1 error details

---

### Edge Cases

- What happens when the filesystem runs out of disk space during staging?
- How does the system handle file permission errors during commit (move from staging to production)?
- What if a production file was modified by another process during the transformation window?
- What happens if the staging directory path already exists but is not from a previous transformation?
- How does the system handle symbolic links in staged files during commit?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST create a versioned staging directory at `.speck/.transform-staging/<version>/` before any transformation begins
- **FR-002**: System MUST direct Agent 1 to write transformed scripts to the staging scripts subdirectory, not production
- **FR-003**: System MUST direct Agent 2 to write transformed commands to the staging commands subdirectory, not production
- **FR-004**: System MUST atomically move all staged files to production directories only after both agents complete successfully
- **FR-005**: System MUST delete the staging directory and all contents if any agent fails (rollback)
- **FR-006**: System MUST detect existing staging directories at startup and present recovery options (commit/rollback/inspect)
- **FR-007**: System MUST refuse to start a new transformation if an unresolved staging directory exists
- **FR-008**: System MUST update transformation status to 'failed' with error details when rollback occurs
- **FR-009**: System MUST clean up staging directory after successful commit
- **FR-010**: System MUST preserve production directories unchanged until commit succeeds
- **FR-011**: System MUST report the list of files that will be committed before performing the commit (for transparency)
- **FR-012**: System MUST handle file conflicts where a production file changed during staging by warning the user before commit

### Key Entities

- **StagingContext**: Represents an active staging session including staging directory path, scripts subdirectory, commands subdirectory, and target version
- **TransformationStatus**: Tracks current state (staging, committing, committed, failed, orphaned) and error information
- **StagedFile**: Represents a file in staging with its source path, destination path, and modification timestamp

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero production directory modifications occur when any transformation agent fails
- **SC-002**: Developers can recover from any interrupted transformation within one additional command invocation
- **SC-003**: Transformation history accurately reflects all attempts including failures with rollback
- **SC-004**: No orphaned staging directories remain after normal operation (success or failure)
- **SC-005**: File conflict detection correctly identifies 100% of production file changes during staging window
- **SC-006**: Recovery options (commit/rollback/inspect) successfully resolve 100% of orphaned staging scenarios

## Assumptions

- The staging directory `.speck/.transform-staging/` is not used by any other Speck functionality
- File system atomic move operations (rename) work correctly on the target operating systems (macOS, Linux)
- Agents will respect the OUTPUT_DIR parameter passed to them and write exclusively to that location
- The version string used for staging directories is unique and valid as a directory name
