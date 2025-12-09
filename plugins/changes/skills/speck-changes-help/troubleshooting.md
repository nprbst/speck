---
name: troubleshooting
description: |
  Troubleshooting guide for OpenSpec change workflow errors. Use when encountering
  validation failures, format errors, or workflow issues. Provides error explanations
  and recovery procedures.
---

# Troubleshooting OpenSpec Changes

## Validation Errors

### "Missing required section: ## ADDED Requirements"

**Cause**: Delta file lacks one of the three required section headers.

**Fix**: Add all three section headers, even if empty:
```markdown
## ADDED Requirements

(none)

## MODIFIED Requirements

(none)

## REMOVED Requirements

(none)
```

### "Requirement missing scenario block"

**Cause**: A requirement doesn't have an associated `#### Scenario:` block.

**Fix**: Add at least one scenario:
```markdown
### Requirement: User Authentication

The system SHALL verify user credentials.

#### Scenario: Valid credentials
- **GIVEN** a registered user
- **WHEN** valid credentials are submitted
- **THEN** access is granted
```

### "Invalid RFC 2119 keyword"

**Cause**: Using non-standard normative keywords.

**Fix**: Use only: SHALL, MUST, SHOULD, MAY (or their negations).

**Wrong**: "The system will...", "The system needs to..."
**Correct**: "The system SHALL...", "The system MUST..."

### "REMOVED requirement missing Reason"

**Cause**: Removed requirement lacks explanation.

**Fix**: Add Reason and Migration fields:
```markdown
### Requirement: Legacy Auth

**Reason**: Replaced by OAuth2 implementation in FR-025
**Migration**: Update clients to use new /auth/oauth2 endpoint
```

### "Change name must be kebab-case"

**Cause**: Using invalid characters in change name.

**Fix**: Use only lowercase letters, numbers, and hyphens:
- ❌ `Add_Auth`, `addAuth`, `Add Auth`
- ✅ `add-auth`, `user-auth-v2`, `fix-login-bug`

## Workflow Errors

### "Change proposal not found"

**Cause**: The change folder doesn't exist or path is wrong.

**Check**:
1. Verify folder exists: `ls .speck/changes/`
2. Check spelling of change name
3. Ensure you're in the correct repository

### "Cannot archive: incomplete tasks"

**Cause**: Tasks in `tasks.md` aren't all marked complete.

**Options**:
1. Complete remaining tasks first
2. Mark tasks as done: `[ ]` → `[x]`
3. Use `--force` flag to bypass (not recommended)

### "Conflict detected in target spec"

**Cause**: Multiple changes modify the same section.

**Resolution**:
1. Run `/speck-changes.show` for both changes
2. Identify overlapping modifications
3. Either:
   - Archive one change first
   - Combine changes into single proposal
   - Manually merge conflicting sections

## Common Mistakes

### Forgetting to create delta files

**Symptom**: Change has tasks but no spec changes tracked.

**Fix**: Create delta file in `.speck/changes/<name>/specs/`:
```bash
touch .speck/changes/add-auth/specs/user-management.md
```

### Wrong target spec path

**Symptom**: Archive can't find spec to merge into.

**Fix**: Verify `**Target Spec**:` path in delta header:
```markdown
**Target Spec**: specs/019-feature/spec.md
```

### Mixing ADDED with MODIFIED

**Symptom**: Validation reports "requirement already exists".

**Clarification**:
- **ADDED**: Completely new requirements
- **MODIFIED**: Changes to existing requirements

## Recovery Procedures

### Restore archived change

```bash
# Find archived change
ls .speck/archive/

# Move back to active
mv .speck/archive/add-auth-20250107/ .speck/changes/add-auth/
```

### Reset change proposal

```bash
# Delete and recreate
rm -rf .speck/changes/<name>/
/speck-changes.propose <name>
```

### Validate after manual edits

```bash
/speck-changes.validate <name>
```

Always validate after making manual edits to ensure format compliance.

## Getting Help

If issues persist:

1. Check `/speck-changes.show <name>` for current state
2. Verify file permissions in `.speck/` directory
3. Review the [spec-format.md](./spec-format.md) for format requirements
4. Consult the [SKILL.md](./SKILL.md) for workflow guidance
