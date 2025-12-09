---
description: Validate a change proposal structure and formatting
arguments:
  - name: change-name
    description: Name of the change proposal to validate
    required: true
---

# Validate Change Proposal

Validate the structure and formatting of a change proposal.

## Usage

```bash
/speck-changes.validate <change-name>
```

## Validation Checks

- **proposal.md structure**: Required sections (Summary, Rationale, Expected Outcome)
- **tasks.md structure**: Task items present
- **Delta file format**: ADDED/MODIFIED/REMOVED sections
- **Scenario blocks**: Given-When-Then format
- **RFC 2119 keywords**: Normative language (SHALL, MUST, SHOULD, etc.)

## Example

```bash
/speck-changes.validate add-auth
```

## Implementation

```bash
bun ${CLAUDE_PLUGIN_ROOT}/scripts/validate.js $ARGUMENTS
```
