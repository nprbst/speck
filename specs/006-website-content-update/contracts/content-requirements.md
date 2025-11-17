# Content Requirements Contract

**Version**: 1.0.0
**Date**: 2025-11-17
**Purpose**: Define requirements and validation rules for website content updates

## Content Update Requirements

### FR-001: Plugin Installation Instructions

**Required Changes**:
- Installation guide MUST use `/plugin` command as primary method
- MUST document marketplace workflow: `/plugin` > "Manage marketplaces" > "speck-market" > Install
- MUST include Claude Code version prerequisite
- MUST remove git clone from primary installation steps

**Validation**:
```typescript
interface PluginInstallationSection {
  prerequisites: {
    claudeCode: {
      minVersion: string; // e.g., "2.0.0"
      pluginSupport: true;
    };
    // Bun and Git removed from required prerequisites
  };
  installationSteps: Array<{
    stepNumber: number;
    command: string; // Must include "/plugin"
    description: string;
    expectedOutput?: string;
  }>;
  verificationSteps: Array<{
    check: string;
    expectedResult: string;
  }>;
}
```

**Must Include**:
1. Minimum Claude Code version with plugin support
2. Step-by-step `/plugin` command usage
3. Marketplace setup (if not already configured)
4. Plugin installation from "speck-market"
5. Verification that plugin is installed
6. Troubleshooting for common plugin issues

**Must NOT Include**:
- Git clone as primary installation method
- Manual dependency installation (Bun install, etc.)
- Repository cloning steps

---

### FR-002: Speck Skill Documentation

**Required Changes**:
- MUST document Speck skill feature in concepts/workflow.md
- MUST provide 3-5 representative examples
- MUST explain when to use skill vs slash commands
- MUST add skill reference to commands/reference.md

**Validation**:
```typescript
interface SkillDocumentation {
  description: string; // What the skill does
  capabilities: string[]; // List of what skill can do
  useCases: Array<{
    category: string; // e.g., "Understanding", "Planning", "Tasks"
    examples: Array<{
      query: string; // Natural language question
      purpose: string; // What this query achieves
    }>;
  }>;
  skillVsCommands: {
    skillUseCases: string[]; // When to use skill
    commandUseCases: string[]; // When to use slash commands
    decisionGuidance: string; // How to choose
  };
}
```

**Must Include**:
1. **Capabilities**: Understanding specs, querying plans, checking tasks
2. **Examples** (3-5 minimum):
   - "What does this spec define?"
   - "What's the technical approach in the plan?"
   - "What tasks are pending?"
   - "What phase am I in?"
   - "List all functional requirements"
3. **Decision Guide**:
   - Use skill for: Questions, understanding, status checks
   - Use commands for: Generation, execution, creation
4. **Integration**: How skill complements slash commands

**Must NOT Include**:
- Confusing skill with slash commands
- Suggesting skill can execute or generate (it only queries/understands)

---

### FR-003: Remove Git Clone References

**Required Changes**:
- MUST remove git clone from primary installation workflow
- MUST update or remove all git clone code examples
- MAY keep git clone as "advanced/alternative" method with clear caveats

**Validation**:
```bash
# This must return 0 results in primary installation paths
grep -r "git clone.*speck" website/src/content/docs/getting-started/
```

**Allowed Exceptions**:
- Advanced installation section (if clearly marked as alternative)
- Contribution guide (for developers, not users)
- Migration documentation (for historical reference)

**Must Update**:
- `installation.md`: Remove git clone from Installation Steps
- `quick-start.md`: Remove git clone from Installation section
- `index.astro`: Remove "Clone Speck" from quick start preview

---

### FR-004: Claude Code Version Requirements

**Required Changes**:
- MUST document minimum Claude Code version
- MUST provide version check command
- MUST include upgrade instructions

**Validation**:
```typescript
interface VersionRequirement {
  minVersion: string; // Semantic version
  checkCommand: string; // How to verify version
  upgradeInstructions: {
    description: string;
    link: string; // Link to official docs
  };
}
```

**Must Include**:
1. Specific minimum version (e.g., "Claude Code 2.0.0+")
2. How to check version: `claude --version` or equivalent
3. Link to Claude Code upgrade documentation
4. Troubleshooting for version incompatibility

---

### FR-005: Skill Usage Examples

**Required Changes**:
- MUST provide 3-5 representative skill examples
- MUST cover different use cases (understanding, planning, tasks)
- MUST show natural language queries

**Example Requirements**:

```typescript
interface SkillExample {
  category: "understanding" | "planning" | "tasks" | "workflow" | "requirements";
  query: string; // Natural language question
  purpose: string; // What this achieves
  context?: string; // When to use this
}

const requiredExamples: SkillExample[] = [
  {
    category: "understanding",
    query: "What does this spec define?",
    purpose: "Get overview of specification content",
    context: "When starting work on a feature"
  },
  {
    category: "planning",
    query: "What's the technical approach in the plan?",
    purpose: "Understand architecture decisions",
    context: "Before implementation"
  },
  {
    category: "tasks",
    query: "What tasks are pending?",
    purpose: "Check implementation status",
    context: "During development"
  },
  {
    category: "workflow",
    query: "What phase am I in?",
    purpose: "Understand current workflow stage",
    context: "When unsure of next steps"
  },
  {
    category: "requirements",
    query: "List all functional requirements",
    purpose: "Review requirements completeness",
    context: "During specification review"
  }
];
```

---

### FR-006: Skill vs Commands Decision Guide

**Required Changes**:
- MUST explain when to use skill vs slash commands
- MUST provide clear decision criteria
- MUST include examples of each

**Decision Matrix**:

```typescript
interface DecisionGuide {
  useSkill: {
    when: string[]; // List of scenarios
    examples: string[]; // Example queries
  };
  useCommands: {
    when: string[]; // List of scenarios
    examples: string[]; // Example commands
  };
  decisionCriteria: string; // Simple rule to choose
}

const guide: DecisionGuide = {
  useSkill: {
    when: [
      "Asking questions about existing specs/plans/tasks",
      "Understanding structure and content",
      "Checking status or progress",
      "Exploring without modification"
    ],
    examples: [
      "What are the user stories?",
      "Show me the technical dependencies",
      "What tasks are complete?"
    ]
  },
  useCommands: {
    when: [
      "Generating new specs/plans/tasks",
      "Executing workflow phases",
      "Creating or modifying artifacts",
      "Running implementation"
    ],
    examples: [
      "/speck.specify",
      "/speck.plan",
      "/speck.tasks",
      "/speck.implement"
    ]
  },
  decisionCriteria: "Use skill for questions, commands for actions"
};
```

---

### FR-007: Plugin Update Instructions

**Required Changes**:
- MUST document plugin update workflow
- MUST use `/plugin` > "Manage marketplaces" > "Update marketplace"
- MUST include troubleshooting

**Validation**:
```typescript
interface UpdateInstructions {
  steps: Array<{
    stepNumber: number;
    action: string;
    description: string;
  }>;
  frequency: string; // How often to update
  verification: string; // How to verify update succeeded
  troubleshooting: Array<{
    issue: string;
    solution: string;
  }>;
}
```

**Must Include**:
1. Why to update (new features, bug fixes)
2. Step-by-step update process
3. Verification after update
4. Common update issues and solutions

---

### FR-008: Updated Tutorial Content

**Required Changes**:
- MUST reflect plugin-based workflow in all examples
- MUST update first-feature.md example
- MUST use current installation method

**Validation**: Examples must use:
- Plugin installation (not git clone)
- Skill queries alongside slash commands
- Current command syntax

---

### FR-009: Plugin Status Indication

**Required Changes**:
- Homepage MUST indicate Speck is a Claude Plugin
- Hero/headline MUST mention plugin status
- Features section MUST highlight plugin benefits

**Validation**:
```typescript
interface HomepagePluginMessaging {
  hero: {
    headline: string; // Must mention plugin
    subheadline: string; // Must mention skill + commands
  };
  features: Array<{
    title: string;
    description: string;
    includesPluginRef: boolean; // At least one must be true
  }>;
}
```

---

## Content Quality Requirements

### Code Blocks

**Requirements**:
```markdown
# VALID: With language identifier
```bash
/plugin
```

# INVALID: No language identifier
```
/plugin
```
```

**Must Have**:
- Language identifier for syntax highlighting
- Proper indentation
- Copy-pastable content
- Expected output where helpful

---

### Links

**Requirements**:
```typescript
interface LinkValidation {
  internal: {
    format: "relative"; // e.g., "/docs/getting-started/installation"
    mustExist: true; // Must point to real file
  };
  external: {
    target: "_blank"; // Open in new tab
    rel: "noopener noreferrer"; // Security
  };
}
```

---

### Frontmatter

**Requirements**: Must conform to [content-frontmatter.schema.json](./content-frontmatter.schema.json)

**Validation**:
- All required fields present
- `lastUpdated` reflects actual update date
- `order` is unique within category

---

## Validation Checklist

### Installation Content
- [ ] `/plugin` command used for installation
- [ ] Git clone removed from primary steps
- [ ] Claude Code version requirement documented
- [ ] Marketplace setup documented
- [ ] Verification steps provided
- [ ] Troubleshooting includes plugin-specific issues

### Skill Content
- [ ] 3-5 skill examples provided
- [ ] Examples cover different categories
- [ ] Decision guide present (skill vs commands)
- [ ] Skill capabilities documented
- [ ] Integration with commands explained

### Update Content
- [ ] Plugin update workflow documented
- [ ] `/plugin` update process explained
- [ ] Troubleshooting for updates provided

### Quality
- [ ] All code blocks have language identifiers
- [ ] All internal links use relative paths
- [ ] All external links open in new tab
- [ ] Frontmatter validates against schema
- [ ] No broken links
- [ ] Consistent terminology throughout

---

## Success Criteria Mapping

| Success Criterion | Content Requirement | Validation Method |
|-------------------|-------------------|-------------------|
| SC-001: <5min install | FR-001: Plugin installation | Manual test following docs |
| SC-002: 100% `/plugins` | FR-003: Remove git clone | Grep search returns 0 results |
| SC-003: <2min skill understanding | FR-006: Decision guide | Manual test with new users |
| SC-004: Accurate features | FR-002, FR-009: Skill + plugin docs | Content review |
| SC-005: Update instructions | FR-007: Update workflow | Manual test of update process |

---

## Implementation Notes

### Priority Order

1. **P1 - Critical**: Installation guide updates (FR-001, FR-003, FR-004)
2. **P2 - Important**: Skill documentation (FR-002, FR-005, FR-006)
3. **P3 - Nice to have**: Examples and homepage updates (FR-008, FR-009)

### Testing Strategy

1. **Manual Testing**: Follow installation docs as new user
2. **Link Validation**: Check all internal/external links
3. **Content Search**: Verify git clone removed from primary paths
4. **Schema Validation**: Validate frontmatter against JSON schema
5. **Accessibility**: Run axe-core on updated pages
6. **Visual Regression**: Playwright tests for layout changes

---

## Appendix: Content Templates

### Plugin Installation Section Template

```markdown
## Installation

### Prerequisites

- **Claude Code** with plugin support (version 2.0.0+)
  - Download: [claude.com/code](https://claude.com/code)
  - Check version: `claude --version`

### Install Speck Plugin

1. Open Claude Code
2. Run the plugin command:
   ```
   /plugin
   ```
3. Select "Manage marketplaces"
4. Add "speck-market" marketplace (if not already added)
5. Install the "speck" plugin

### Verify Installation

Check that Speck commands appear in autocomplete:
```
/speck.
```

You should see commands like `/speck.specify`, `/speck.plan`, etc.
```

### Skill Example Template

```markdown
## Using the Speck Skill

Ask questions naturally to understand your specs, plans, and tasks:

**Understanding specs**:
- "What does this spec define?"
- "Show me the user stories"

**Querying plans**:
- "What's the technical approach?"
- "What dependencies are needed?"

**Checking tasks**:
- "What tasks are pending?"
- "Show me the implementation order"

**When to use skill vs commands**:
- **Skill**: Questions, understanding, status checks
- **Commands**: Generating specs, running phases, creating tasks
```
