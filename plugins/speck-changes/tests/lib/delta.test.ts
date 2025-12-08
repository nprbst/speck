/**
 * Tests for delta file parser/generator
 */

import { describe, test, expect } from 'bun:test';
import {
  parseDeltaFile,
  generateDeltaFile,
  parseDeltaSection,
  type ParsedDelta,
} from '../../scripts/lib/delta';

const SAMPLE_DELTA = `# Delta: auth

## ADDED Requirements

### REQ-AUTH-001: User Login

Users SHALL be able to log in with email and password.

#### Scenario: Successful login

- **Given**: A registered user with valid credentials
- **When**: The user submits login form with correct email and password
- **Then**: The user SHALL be authenticated and redirected to dashboard

### REQ-AUTH-002: Password Reset

Users SHALL be able to reset their password via email.

#### Scenario: Password reset request

- **Given**: A registered user who forgot their password
- **When**: The user requests a password reset
- **Then**: The system SHALL send a reset link to their email

## MODIFIED Requirements

### REQ-USER-001: User Registration

**Before**: Users can register with email only
**After**: Users MUST register with email and verify their email address

## REMOVED Requirements

### REQ-GUEST-001: Guest Access

**Reason**: Guest access is being replaced with anonymous sessions
`;

describe('parseDeltaFile', () => {
  test('parses complete delta file with all sections', () => {
    const result = parseDeltaFile(SAMPLE_DELTA);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const delta = result.delta;
    expect(delta.specName).toBe('auth');
    expect(delta.addedRequirements).toHaveLength(2);
    expect(delta.modifiedRequirements).toHaveLength(1);
    expect(delta.removedRequirements).toHaveLength(1);
  });

  test('parses ADDED requirements with scenarios', () => {
    const result = parseDeltaFile(SAMPLE_DELTA);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const added = result.delta.addedRequirements[0];
    expect(added?.id).toBe('REQ-AUTH-001');
    expect(added?.title).toBe('User Login');
    expect(added?.description).toContain('Users SHALL be able to log in');
    expect(added?.scenarios).toHaveLength(1);
    expect(added?.scenarios[0]?.name).toBe('Successful login');
    expect(added?.scenarios[0]?.given).toContain('registered user');
    expect(added?.scenarios[0]?.when).toContain('submits login form');
    expect(added?.scenarios[0]?.then).toContain('authenticated');
  });

  test('parses MODIFIED requirements with before/after', () => {
    const result = parseDeltaFile(SAMPLE_DELTA);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const modified = result.delta.modifiedRequirements[0];
    expect(modified?.id).toBe('REQ-USER-001');
    expect(modified?.before).toContain('email only');
    expect(modified?.after).toContain('verify their email address');
  });

  test('parses REMOVED requirements with reason', () => {
    const result = parseDeltaFile(SAMPLE_DELTA);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const removed = result.delta.removedRequirements[0];
    expect(removed?.id).toBe('REQ-GUEST-001');
    expect(removed?.reason).toContain('anonymous sessions');
  });

  test('handles delta with only ADDED section', () => {
    const deltaWithOnlyAdded = `# Delta: simple

## ADDED Requirements

### REQ-001: Test Requirement

Simple test requirement.

#### Scenario: Test scenario

- **Given**: A test condition
- **When**: Something happens
- **Then**: Expected outcome
`;

    const result = parseDeltaFile(deltaWithOnlyAdded);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.delta.specName).toBe('simple');
    expect(result.delta.addedRequirements).toHaveLength(1);
    expect(result.delta.modifiedRequirements).toHaveLength(0);
    expect(result.delta.removedRequirements).toHaveLength(0);
  });

  test('returns error for invalid delta without spec name', () => {
    const invalidDelta = `## ADDED Requirements

### REQ-001: Test

Test description.
`;

    const result = parseDeltaFile(invalidDelta);

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error).toContain('spec name');
  });

  test('handles empty sections gracefully', () => {
    const emptyDelta = `# Delta: empty

## ADDED Requirements

## MODIFIED Requirements

## REMOVED Requirements
`;

    const result = parseDeltaFile(emptyDelta);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.delta.specName).toBe('empty');
    expect(result.delta.addedRequirements).toHaveLength(0);
    expect(result.delta.modifiedRequirements).toHaveLength(0);
    expect(result.delta.removedRequirements).toHaveLength(0);
  });
});

describe('generateDeltaFile', () => {
  test('generates valid delta markdown', () => {
    const delta: ParsedDelta = {
      specName: 'test',
      addedRequirements: [
        {
          id: 'REQ-001',
          title: 'Test Requirement',
          description: 'A test requirement description.',
          scenarios: [
            {
              name: 'Happy path',
              given: 'A valid input',
              when: 'The action is performed',
              then: 'The expected result occurs',
            },
          ],
        },
      ],
      modifiedRequirements: [
        {
          id: 'REQ-002',
          before: 'Old behavior',
          after: 'New behavior',
        },
      ],
      removedRequirements: [
        {
          id: 'REQ-003',
          reason: 'No longer needed',
        },
      ],
    };

    const markdown = generateDeltaFile(delta);

    expect(markdown).toContain('# Delta: test');
    expect(markdown).toContain('## ADDED Requirements');
    expect(markdown).toContain('### REQ-001: Test Requirement');
    expect(markdown).toContain('A test requirement description');
    expect(markdown).toContain('#### Scenario: Happy path');
    expect(markdown).toContain('**Given**:');
    expect(markdown).toContain('**When**:');
    expect(markdown).toContain('**Then**:');
    expect(markdown).toContain('## MODIFIED Requirements');
    expect(markdown).toContain('**Before**: Old behavior');
    expect(markdown).toContain('**After**: New behavior');
    expect(markdown).toContain('## REMOVED Requirements');
    expect(markdown).toContain('**Reason**: No longer needed');
  });

  test('round-trips parse and generate', () => {
    const result1 = parseDeltaFile(SAMPLE_DELTA);
    expect(result1.ok).toBe(true);
    if (!result1.ok) return;

    const generated = generateDeltaFile(result1.delta);
    const result2 = parseDeltaFile(generated);

    expect(result2.ok).toBe(true);
    if (!result2.ok) return;

    // Verify key data survived round-trip
    expect(result2.delta.specName).toBe(result1.delta.specName);
    expect(result2.delta.addedRequirements).toHaveLength(result1.delta.addedRequirements.length);
    expect(result2.delta.modifiedRequirements).toHaveLength(
      result1.delta.modifiedRequirements.length
    );
    expect(result2.delta.removedRequirements).toHaveLength(
      result1.delta.removedRequirements.length
    );
  });

  test('generates empty sections when no content', () => {
    const delta: ParsedDelta = {
      specName: 'empty-test',
      addedRequirements: [],
      modifiedRequirements: [],
      removedRequirements: [],
    };

    const markdown = generateDeltaFile(delta);

    expect(markdown).toContain('# Delta: empty-test');
    // Should still have section headers
    expect(markdown).toContain('## ADDED Requirements');
    expect(markdown).toContain('## MODIFIED Requirements');
    expect(markdown).toContain('## REMOVED Requirements');
  });
});

describe('parseDeltaSection', () => {
  test('parses ADDED section', () => {
    const content = `### REQ-001: Test

Description here.

#### Scenario: Test

- **Given**: Condition
- **When**: Action
- **Then**: Result
`;

    const result = parseDeltaSection(content, 'ADDED');

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.requirements).toHaveLength(1);
    const req = result.requirements[0] as { id: string; title: string };
    expect(req.id).toBe('REQ-001');
    expect(req.title).toBe('Test');
  });

  test('parses MODIFIED section', () => {
    const content = `### REQ-001: Test

**Before**: Old
**After**: New
`;

    const result = parseDeltaSection(content, 'MODIFIED');

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.requirements).toHaveLength(1);
    const req = result.requirements[0] as { id: string; before: string; after: string };
    expect(req.id).toBe('REQ-001');
    expect(req.before).toBe('Old');
    expect(req.after).toBe('New');
  });

  test('parses REMOVED section', () => {
    const content = `### REQ-001: Test

**Reason**: Not needed anymore
`;

    const result = parseDeltaSection(content, 'REMOVED');

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.requirements).toHaveLength(1);
    const req = result.requirements[0] as { id: string; reason: string };
    expect(req.id).toBe('REQ-001');
    expect(req.reason).toBe('Not needed anymore');
  });

  test('handles multiple requirements in section', () => {
    const content = `### REQ-001: First

**Reason**: First reason

### REQ-002: Second

**Reason**: Second reason
`;

    const result = parseDeltaSection(content, 'REMOVED');

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.requirements).toHaveLength(2);
  });
});
