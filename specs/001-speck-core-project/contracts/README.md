# API Contracts for Speck

This directory contains JSON Schema definitions for Speck's command interfaces and data structures.

## Schemas

### `specify.schema.json`
Contract for the `/speck.specify` command - creates a new feature specification from a natural language description.

**Key Operations**:
- Input validation for feature descriptions
- Output structure for created features and specifications
- Error contracts for git validation, duplicate detection, and branch name length handling

**Related Entities**: Feature, Specification

---

### `transform-upstream.schema.json`
Contract for the `/speck.transform-upstream` command - syncs upstream spec-kit changes via AI-driven semantic transformation.

**Key Operations**:
- Input validation for sync parameters (target commit, dry-run mode)
- Output structure for sync reports, applied changes, and conflicts
- Error contracts for type check failures, test failures, extension violations, and breaking changes

**Related Entities**: UpstreamTracker, SyncedFile, ExtensionMarker

---

## Usage

These schemas serve multiple purposes:

1. **Documentation**: Define expected inputs, outputs, and error cases for each command
2. **Validation**: Can be used with JSON Schema validators to ensure contract compliance
3. **Type Generation**: Can generate TypeScript types for implementation (e.g., via `json-schema-to-typescript`)
4. **Testing**: Provide contract test fixtures for validating command behavior

## Validation

To validate data against these schemas:

```bash
# Using Bun with a JSON Schema validator
bun install ajv ajv-cli
bunx ajv validate -s specify.schema.json -d example-specify-output.json
```

## Schema Evolution

When modifying schemas:
1. Follow semantic versioning for breaking changes
2. Update the `$id` field version if breaking changes occur
3. Document changes in the schema's `description` fields
4. Ensure backward compatibility where possible
5. Update corresponding TypeScript types in implementation

## Related Documentation

- [Data Model](../data-model.md): Full entity definitions with fields, relationships, and validation rules
- [Specification](../spec.md): Feature requirements and user scenarios
- [Implementation Plan](../plan.md): Technical context and architecture decisions
