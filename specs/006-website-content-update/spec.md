# Feature Specification: Website Content Update for Plugin Installation

**Feature Branch**: `006-website-content-update`
**Created**: 2025-11-17
**Status**: Draft
**Input**: User description: "Considering the new work we have implemented in specs 002 and 005, we need to update the website content to reflect. In particular, Speck is now a Claude Plugin so it should be installed using /plugins instead of cloning. Also, Speck now includes a Claude Skill for understanding and working with specs, plans, tasks, etc without requiring the use of /speck* commands."

## Clarifications

### Session 2025-11-17

- Q: How are existing specs/plans/tasks files handled during migration from cloned to plugin installation? → A: Claude Marketplace Plugin system manages plugin updates automatically via `/plugin` > "Manage marketplaces" > "speck-market" > "Update marketplace"
- Q: What migration approach should the website take for existing git-clone users? → A: No existing users (unreleased); no migration needed
- Q: What types of examples should be shown for the Speck skill feature? → A: 3-5 representative examples covering different skill use cases (understanding specs, asking about plans, querying tasks status)
- Q: What decision criteria should guide users when choosing between slash commands and the Speck skill? → A: Skill for exploratory questions/understanding; slash commands for execution/generation tasks
- Q: How should the website handle Claude Code version compatibility? → A: Document minimum Claude Code version required for plugin support; provide upgrade instructions if version is incompatible

## User Scenarios & Testing *(mandatory)*

### User Story 1 - New User Installation (Priority: P1)

A new user discovers Speck and wants to install it. They visit the website to learn how to get started. They need clear, accurate instructions that reflect the current installation method using the Claude plugin system.

**Why this priority**: This is the primary entry point for all new users. Incorrect installation instructions will prevent adoption and create a poor first impression. This is the most critical documentation update.

**Independent Test**: Can be fully tested by following the installation instructions as a new user with no prior Speck installation and verifying successful installation via the Claude plugin system.

**Acceptance Scenarios**:

1. **Given** a new user visits the Speck website, **When** they navigate to the installation/getting started section, **Then** they see instructions to use `/plugins` command instead of git clone
2. **Given** a new user follows the installation instructions, **When** they complete the steps, **Then** they have a working Speck installation without needing to clone a repository
3. **Given** a new user reads the installation documentation, **When** they look for prerequisites, **Then** they see Claude Code with plugin support listed as a requirement

---

### User Story 2 - Understanding the Speck skill (Priority: P2)

Users want to understand how to work with Speck specifications, plans, and tasks. They need to know about the Speck skill feature that allows interaction without using slash commands.

**Why this priority**: This enhances the user experience by providing an alternative, more natural way to interact with Speck. While important, it's a secondary feature to basic installation.

**Independent Test**: Can be tested by reviewing the documentation for the Speck skill feature and verifying that users can understand when and how to use it versus slash commands.

**Acceptance Scenarios**:

1. **Given** a user reads the features documentation, **When** they look for ways to work with specs, **Then** they see information about the Speck skill alongside slash commands
2. **Given** a user wants to understand specs/plans/tasks, **When** they check the documentation, **Then** they learn they can use the Speck skill for natural language interaction
3. **Given** a user is choosing between slash commands and the skill, **When** they read the documentation, **Then** they understand the use cases and benefits of each approach

---


### Edge Cases

- Users with older Claude Code versions without plugin support will see documented minimum version requirement and upgrade instructions

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Website MUST display plugin installation instructions using `/plugin` command as the primary installation method
- **FR-002**: Website MUST document the Speck skill feature and explain its purpose for working with specs, plans, and tasks
- **FR-003**: Website MUST remove or update all references to git clone as the installation method
- **FR-004**: Website MUST document minimum Claude Code version required for plugin support and provide upgrade instructions for incompatible versions
- **FR-005**: Website MUST provide 3-5 representative examples of using the Speck skill covering different use cases (understanding specs, asking about plans, querying tasks status)
- **FR-006**: Website MUST explain when to use slash commands versus the Speck skill (skill for exploratory questions/understanding; slash commands for execution/generation tasks)
- **FR-007**: Website MUST include plugin update instructions using `/plugin` > "Manage marketplaces" > "speck-market" > "Update marketplace" for users keeping Speck current
- **FR-008**: Website MUST update any quickstart or tutorial content to reflect plugin-based workflow
- **FR-009**: Website MUST clearly indicate that Speck is now available as a Claude Plugin

### Key Entities

- **Installation Instructions**: Primary content describing how users install Speck via the Claude plugin system, including prerequisites, steps, and verification
- **Speck skill Documentation**: Content explaining the Speck skill feature, its capabilities, use cases, and how it complements slash commands
- **Plugin Update Guide**: Content explaining how to update the Speck plugin using the Claude Marketplace system (`/plugin` > "Manage marketplaces" > "speck-market" > "Update marketplace")

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: New users can successfully install Speck by following website instructions in under 5 minutes (measured from first viewing installation page to verified plugin installation)
- **SC-002**: 100% of installation documentation references the `/plugin` method, with zero references to git clone as the primary method
- **SC-003**: Users can understand the difference between slash commands and the Speck skill within 2 minutes of starting to read the workflow.md skill section
- **SC-004**: Website content accurately reflects features introduced in specs 002 (plugin packaging) and 005 (Speck skill)
- **SC-005**: Plugin update instructions clearly explain the Claude Marketplace update workflow
