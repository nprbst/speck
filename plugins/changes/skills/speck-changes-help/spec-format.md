---
name: spec-format
description: |
  Delta specification format guide. Use when creating or editing delta files that
  describe changes to existing specifications. Covers ADDED/MODIFIED/REMOVED sections
  and RFC 2119 normative keywords.
---

# Delta Specification Format

## Overview

Delta specifications describe **changes** to existing spec files. They use a structured format with three sections for additions, modifications, and removals.

## File Location

Delta files go in: `.speck/changes/<change-name>/specs/<affected-spec>.md`

Example: `.speck/changes/add-auth/specs/user-management.md`

## Document Structure

```markdown
# Delta Specification: <capability>

**Target Spec**: <path/to/target/spec.md>
**Change Proposal**: <change-name>
**Created**: <YYYY-MM-DD>

---

## ADDED Requirements

### Requirement: <name>
The system SHALL <requirement description>.

#### Scenario: <scenario-name>
- **GIVEN** <precondition>
- **WHEN** <action>
- **THEN** <expected outcome>

---

## MODIFIED Requirements

### Requirement: <name>
**Replaces**: Section X.Y in <target-spec>

The system MUST <modified requirement>.

#### Scenario: <scenario-name>
- **GIVEN** <precondition>
- **WHEN** <action>
- **THEN** <expected outcome>

---

## REMOVED Requirements

### Requirement: <name>
**Reason**: <why this requirement is being removed>
**Migration**: <how existing implementations should adapt>
```

## Section Rules

### ADDED Requirements

- Completely new requirements not in target spec
- MUST include at least one scenario
- Use `### Requirement:` header format

### MODIFIED Requirements

- Changes to existing requirements
- **Replaces entire requirement** - provide full replacement text
- MUST reference which section is being replaced
- MUST include at least one scenario

### REMOVED Requirements

- Requirements being deleted from target spec
- MUST include `**Reason**:` explaining why
- MUST include `**Migration**:` for adaptation guidance

## RFC 2119 Keywords

Use normative keywords to indicate requirement levels:

| Keyword | Meaning |
|---------|---------|
| **SHALL** / **MUST** | Absolute requirement |
| **SHALL NOT** / **MUST NOT** | Absolute prohibition |
| **SHOULD** | Recommended |
| **SHOULD NOT** | Not recommended |
| **MAY** | Optional |

Example:
```markdown
The system SHALL authenticate users before granting access.
The system SHOULD cache tokens for performance.
The system MAY support OAuth2 refresh tokens.
```

## Scenario Format

Use Given-When-Then structure:

```markdown
#### Scenario: Successful login

- **GIVEN** a registered user with valid credentials
- **WHEN** the user submits login form
- **THEN** the system creates a session and redirects to dashboard
```

## Validation Checklist

Before submitting, verify:

- [ ] All sections use `##` headers (ADDED/MODIFIED/REMOVED)
- [ ] All requirements use `###` headers
- [ ] All scenarios use `####` headers
- [ ] Each requirement has at least one scenario
- [ ] RFC 2119 keywords used correctly
- [ ] REMOVED requirements have Reason and Migration
- [ ] Target spec path is correct
