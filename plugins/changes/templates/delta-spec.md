# Delta Specification: {{capability}}

**Target Spec**: {{target_spec}}
**Change Proposal**: {{change_name}}
**Created**: {{date}}

---

## ADDED Requirements

### Requirement: {{requirement_name}}

The system SHALL {{requirement_description}}.

#### Scenario: {{scenario_name}}

- **GIVEN** {{precondition}}
- **WHEN** {{action}}
- **THEN** {{expected_outcome}}

---

## MODIFIED Requirements

### Requirement: {{requirement_name}}

**Replaces**: Section X.Y in {{target_spec}}

The system MUST {{modified_requirement_description}}.

#### Scenario: {{scenario_name}}

- **GIVEN** {{precondition}}
- **WHEN** {{action}}
- **THEN** {{expected_outcome}}

---

## REMOVED Requirements

### Requirement: {{requirement_name}}

**Reason**: {{removal_reason}}

**Migration**: {{migration_instructions}}

---

## Notes

- Use RFC 2119 normative keywords: SHALL, MUST, SHOULD, MAY
- Each requirement MUST include at least one scenario
- MODIFIED requirements replace existing requirements entirely
- REMOVED requirements must include reason and migration path
