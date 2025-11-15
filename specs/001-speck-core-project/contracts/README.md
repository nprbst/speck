# API Contracts

This directory contains JSON Schema contracts for all Speck CLI commands and Claude Code slash commands.

## Contract Files

| Command | Schema File | Description |
|---------|-------------|-------------|
| `/speck.specify` | [specify.schema.json](./specify.schema.json) | Create feature specification from natural language description |
| `/speck.clarify` | [clarify.schema.json](./clarify.schema.json) | Resolve specification ambiguities through Q&A |
| `/speck.plan` | [plan.schema.json](./plan.schema.json) | Generate implementation plan with technical context |
| `/speck.tasks` | [tasks.schema.json](./tasks.schema.json) | Generate actionable task list with dependencies |
| `/speck.transform-upstream` | [transform-upstream.schema.json](./transform-upstream.schema.json) | Sync upstream spec-kit changes via Claude agent |

## Usage

### CLI (TypeScript)

```typescript
import { SpecifyInputSchema } from './contracts/specify.schema.json';

// Validate user input
const validated = SpecifyInputSchema.parse(userInput);

// Execute command with validated input
const result = await specifyCommand.execute(validated);
```

### Claude Code (Slash Commands)

Slash commands use the same contracts but accept natural language input that is parsed into the structured format.

Example:
```
User: /speck.specify "Add user authentication with OAuth2"

Claude parses to:
{
  "command": "specify",
  "input": {
    "description": "Add user authentication with OAuth2"
  }
}
```

## Contract Structure

Each command contract defines:

1. **Input**: User-provided parameters (arguments, options, flags)
2. **Output**: Success response with generated artifacts
3. **Errors**: Typed error responses with error codes
4. **Examples**: Sample usage with real data

## Validation

All contracts use JSON Schema Draft 7 for validation:
- TypeScript: Validated via Zod (schemas derived from JSON Schema)
- JSON output: Validated via AJV or equivalent JSON Schema validator

## Behavioral Parity

CLI and Claude Code slash commands share identical contracts, ensuring <1% behavioral deviation (SC-005).
