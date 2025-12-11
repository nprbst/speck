/**
 * Tests for validate command
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { validateChange, validateProposalStructure, validateDeltaFiles } from '../scripts/validate';

// Test temporary directory
let testDir: string;

beforeEach(async () => {
  testDir = join(import.meta.dir, '.test-tmp', `validate-${Date.now()}`);
  await mkdir(testDir, { recursive: true });
  await mkdir(join(testDir, '.speck', 'changes'), { recursive: true });
});

afterEach(async () => {
  if (existsSync(testDir)) {
    await rm(testDir, { recursive: true, force: true });
  }
});

async function createMockChange(
  name: string,
  options: {
    proposal?: string;
    tasks?: string;
    deltas?: Record<string, string>;
  } = {}
): Promise<string> {
  const changeDir = join(testDir, '.speck', 'changes', name);
  await mkdir(changeDir, { recursive: true });
  await mkdir(join(changeDir, 'specs'), { recursive: true });

  // Create proposal.md
  const proposalContent =
    options.proposal ??
    `# Change Proposal: ${name}

**Created**: 2025-12-07
**Status**: Draft

## Summary

Brief description of the proposed change.

## Rationale

Why this change is needed.

## Scope

- Feature area 1
- Feature area 2

## Expected Outcome

What success looks like.
`;
  await writeFile(join(changeDir, 'proposal.md'), proposalContent);

  // Create tasks.md
  const tasksContent =
    options.tasks ??
    `# Tasks: ${name}

## Implementation Checklist

- [ ] T001: First task
- [ ] T002: Second task
`;
  await writeFile(join(changeDir, 'tasks.md'), tasksContent);

  // Create delta files
  if (options.deltas) {
    for (const [specName, content] of Object.entries(options.deltas)) {
      await writeFile(join(changeDir, 'specs', `${specName}.md`), content);
    }
  }

  return changeDir;
}

describe('validateChange', () => {
  test('validates a well-formed change proposal', async () => {
    await createMockChange('valid-change', {
      deltas: {
        auth: `# Delta: auth

## ADDED Requirements

### REQ-001: User authentication

Users SHALL be able to log in with email and password.

#### Scenario: Successful login

- **Given**: A registered user
- **When**: They enter valid credentials
- **Then**: They are authenticated successfully

## MODIFIED Requirements

## REMOVED Requirements
`,
      },
    });

    const result = await validateChange('valid-change', { rootDir: testDir });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.errors).toHaveLength(0);
  });

  test('returns error for nonexistent change', async () => {
    const result = await validateChange('nonexistent', { rootDir: testDir });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('not found');
  });

  test('reports errors and warnings separately', async () => {
    await createMockChange('partial-change', {
      proposal: `# Change Proposal: partial-change

**Created**: 2025-12-07

## Summary

Brief description.
`,
    });

    const result = await validateChange('partial-change', { rootDir: testDir });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Missing sections should be warnings
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

describe('validateProposalStructure', () => {
  test('validates all required sections present', () => {
    const content = `# Change Proposal: test

**Created**: 2025-12-07

## Summary

Brief description.

## Rationale

Why needed.

## Scope

- Area 1

## Expected Outcome

Success criteria.
`;

    const result = validateProposalStructure(content);

    expect(result.errors).toHaveLength(0);
  });

  test('reports missing required sections', () => {
    const content = `# Change Proposal: test

**Created**: 2025-12-07

## Summary

Brief description.
`;

    const result = validateProposalStructure(content);

    expect(result.warnings.some((w) => w.includes('Rationale'))).toBe(true);
    expect(result.warnings.some((w) => w.includes('Expected Outcome'))).toBe(true);
  });

  test('reports missing title', () => {
    const content = `## Summary

Brief description.
`;

    const result = validateProposalStructure(content);

    expect(result.errors.some((e) => e.includes('title'))).toBe(true);
  });
});

describe('validateDeltaFiles', () => {
  test('validates well-formed delta file', async () => {
    await createMockChange('delta-test', {
      deltas: {
        auth: `# Delta: auth

## ADDED Requirements

### REQ-001: New feature

Description of the new feature.

#### Scenario: Test scenario

- **Given**: A precondition
- **When**: An action occurs
- **Then**: Expected result

## MODIFIED Requirements

## REMOVED Requirements
`,
      },
    });

    const changeDir = join(testDir, '.speck', 'changes', 'delta-test');
    const result = await validateDeltaFiles(changeDir);

    expect(result.errors).toHaveLength(0);
  });

  test('reports malformed delta header', async () => {
    await createMockChange('bad-delta', {
      deltas: {
        auth: `# Bad Header

## ADDED Requirements
`,
      },
    });

    const changeDir = join(testDir, '.speck', 'changes', 'bad-delta');
    const result = await validateDeltaFiles(changeDir);

    expect(result.errors.some((e) => e.includes('Delta:'))).toBe(true);
  });

  test('reports missing section headers', async () => {
    await createMockChange('missing-sections', {
      deltas: {
        auth: `# Delta: auth

## ADDED Requirements
`,
      },
    });

    const changeDir = join(testDir, '.speck', 'changes', 'missing-sections');
    const result = await validateDeltaFiles(changeDir);

    expect(result.warnings.some((w) => w.includes('MODIFIED'))).toBe(true);
    expect(result.warnings.some((w) => w.includes('REMOVED'))).toBe(true);
  });

  test('validates scenario format', async () => {
    await createMockChange('bad-scenario', {
      deltas: {
        auth: `# Delta: auth

## ADDED Requirements

### REQ-001: New feature

Description.

#### Scenario: Test

- Given: No asterisks
- When: Missing format
- Then: Invalid

## MODIFIED Requirements

## REMOVED Requirements
`,
      },
    });

    const changeDir = join(testDir, '.speck', 'changes', 'bad-scenario');
    const result = await validateDeltaFiles(changeDir);

    expect(result.warnings.some((w) => w.includes('scenario') || w.includes('Given'))).toBe(true);
  });

  test('validates RFC 2119 keywords in requirements', async () => {
    await createMockChange('no-keywords', {
      deltas: {
        auth: `# Delta: auth

## ADDED Requirements

### REQ-001: New feature

Users can do something without any normative language.

#### Scenario: Test

- **Given**: A condition
- **When**: An action
- **Then**: A result

## MODIFIED Requirements

## REMOVED Requirements
`,
      },
    });

    const changeDir = join(testDir, '.speck', 'changes', 'no-keywords');
    const result = await validateDeltaFiles(changeDir);

    // Should warn about missing RFC 2119 keywords (SHALL, MUST, etc.)
    expect(
      result.warnings.some(
        (w) => w.includes('RFC 2119') || w.includes('SHALL') || w.includes('MUST')
      )
    ).toBe(true);
  });

  test('returns empty results when no delta files exist', async () => {
    await createMockChange('no-deltas');

    const changeDir = join(testDir, '.speck', 'changes', 'no-deltas');
    const result = await validateDeltaFiles(changeDir);

    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });
});

describe('validate output format', () => {
  test('includes file and line information in errors', async () => {
    await createMockChange('error-location', {
      deltas: {
        auth: `# Bad Header
`,
      },
    });

    const result = await validateChange('error-location', { rootDir: testDir });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Check that at least one error/warning includes file information
    const allMessages = [...result.errors, ...result.warnings];
    expect(allMessages.some((m) => m.includes('auth.md'))).toBe(true);
  });
});
