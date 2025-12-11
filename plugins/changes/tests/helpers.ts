/**
 * Test helpers for speck-changes plugin tests
 */

import { mkdir, rm, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Creates a temporary directory for tests
 */
export async function createTempDir(prefix: string): Promise<string> {
  const tmpBase = join(import.meta.dir, '..', '.test-tmp');
  if (!existsSync(tmpBase)) {
    await mkdir(tmpBase, { recursive: true });
  }
  const tmpDir = join(tmpBase, `${prefix}-${Date.now()}`);
  await mkdir(tmpDir, { recursive: true });
  return tmpDir;
}

/**
 * Cleans up a temporary directory
 */
export async function cleanupTempDir(dir: string): Promise<void> {
  if (existsSync(dir)) {
    await rm(dir, { recursive: true, force: true });
  }
}

/**
 * Creates a mock change proposal in a temporary directory
 */
export async function createMockChangeProposal(
  baseDir: string,
  name: string,
  options: {
    withDesign?: boolean;
    withDelta?: boolean;
  } = {}
): Promise<string> {
  const changeDir = join(baseDir, '.speck', 'changes', name);
  await mkdir(changeDir, { recursive: true });

  // Create proposal.md
  const proposalContent = `# Change Proposal: ${name}

**Created**: ${new Date().toISOString().split('T')[0]}
**Status**: Draft

## Summary

Test proposal for ${name}.

## Rationale

Testing purposes.

## Scope

- [ ] Test module

## Expected Outcome

Tests pass.
`;
  await writeFile(join(changeDir, 'proposal.md'), proposalContent);

  // Create tasks.md
  const tasksContent = `# Tasks: ${name}

**Created**: ${new Date().toISOString().split('T')[0]}

## Implementation Checklist

- [ ] T001: Test task
`;
  await writeFile(join(changeDir, 'tasks.md'), tasksContent);

  // Optionally create design.md
  if (options.withDesign) {
    const designContent = `# Design: ${name}

**Created**: ${new Date().toISOString().split('T')[0]}

## Overview

Test design document.
`;
    await writeFile(join(changeDir, 'design.md'), designContent);
  }

  // Optionally create delta file
  if (options.withDelta) {
    const specsDir = join(changeDir, 'specs');
    await mkdir(specsDir, { recursive: true });
    const deltaContent = `# Delta: test-spec

## ADDED Requirements

### REQ-TEST-001: Test Requirement

Test description.

#### Scenario: Test scenario

- **Given**: A test precondition
- **When**: The test action occurs
- **Then**: The expected outcome happens
`;
    await writeFile(join(specsDir, 'test-spec.md'), deltaContent);
  }

  return changeDir;
}

/**
 * Creates a mock releases.json file
 */
export async function createMockReleasesJson(
  baseDir: string,
  releases: Array<{
    version: string;
    status?: 'active' | 'superseded';
  }> = []
): Promise<string> {
  const upstreamDir = join(baseDir, 'upstream', 'openspec');
  await mkdir(upstreamDir, { recursive: true });

  const releasesData = {
    releases: releases.map((r, i) => ({
      version: r.version,
      pullDate: new Date().toISOString(),
      commitSha: 'a'.repeat(40),
      status: r.status ?? (i === 0 ? 'active' : 'superseded'),
      releaseDate: new Date().toISOString(),
      releaseNotes: `Release ${r.version}`,
    })),
    latestVersion: releases[0]?.version ?? '',
  };

  const releasesPath = join(upstreamDir, 'releases.json');
  await writeFile(releasesPath, JSON.stringify(releasesData, null, 2));
  return releasesPath;
}

/**
 * Reads a JSON file and parses it
 */
export async function readJsonFile<T>(path: string): Promise<T> {
  const content = await readFile(path, 'utf-8');
  return JSON.parse(content) as T;
}

/**
 * Gets the path to test fixtures
 */
export function getFixturePath(...segments: string[]): string {
  return join(import.meta.dir, 'fixtures', ...segments);
}
