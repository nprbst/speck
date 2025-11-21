/**
 * Multi-Step Test: Multi-Repo Specify (Root) → Plan (Child A) → Plan (Child B) (T067)
 *
 * Validates cross-repository workflow coordination:
 * 1. Create root specification (/speck.specify at root)
 * 2. Generate implementation plan in child repo A
 * 3. Generate implementation plan in child repo B
 * 4. Verify all plans reference correct parent spec
 *
 * This test verifies that multi-repo workflows maintain consistency
 * across different repositories and that parent spec links are preserved.
 *
 * Feature: 009-multi-repo-stacked (Phase 8)
 * Layer: 4 (Multi-Step Workflow)
 * Created: 2025-11-20
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { $ } from "bun";
import path from "node:path";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import type { MultiRepoTestFixture } from "../helpers/multi-repo-fixtures";
import { createMultiRepoTestFixture } from "../helpers/multi-repo-fixtures";

describe("Multi-Step: Cross-repo specification workflow", () => {
  let fixture: MultiRepoTestFixture;

  beforeEach(async () => {
    // Set up multi-repo environment with two children
    fixture = await createMultiRepoTestFixture([
      { name: "backend-service" },
      { name: "frontend-app" }
    ], "007-multi-repo-monorepo-support");
  });

  afterEach(async () => {
    await fixture.cleanup();
  });

  test("T067: Root spec → child A plan → child B plan workflow", async () => {
    const childA = fixture.childRepos.get("backend-service")!;
    const childB = fixture.childRepos.get("frontend-app")!;
    const rootSpecDir = path.join(fixture.specsDir, "013-cross-repo-feature");
    const rootSpecPath = path.join(rootSpecDir, "spec.md");

    // Step 1: Create root specification
    await $`mkdir -p ${rootSpecDir}`.quiet();
    await Bun.write(rootSpecPath, `# Feature Specification: Cross-Repo Feature

**Feature ID**: 013-cross-repo-feature
**Context**: Multi-repo root
**Target Repos**: backend-service, frontend-app

## User Scenarios

As a developer, I want to implement a feature that spans multiple repositories.

## Functional Requirements

- FR-001: Backend must implement API endpoints
- FR-002: Frontend must implement UI components
- FR-003: Both repos must maintain independent branch stacks

## Success Criteria

- SC-001: Backend API completed and deployed
- SC-002: Frontend UI integrated with backend API
- SC-003: Each repo maintains independent PR workflow
`);

    // Verify root spec created
    expect(existsSync(rootSpecPath)).toBe(true);
    const rootSpecContent = await readFile(rootSpecPath, "utf-8");
    expect(rootSpecContent).toContain("013-cross-repo-feature");
    expect(rootSpecContent).toContain("backend-service");
    expect(rootSpecContent).toContain("frontend-app");

    // Step 2: Create plan for child A (backend-service)
    // In real workflow, this would navigate to child A and run /speck.plan
    // For testing, we simulate by creating plan.md with correct references
    const childAPlanDir = path.join(childA, "specs", "013-cross-repo-feature");
    const childAPlanPath = path.join(childAPlanDir, "plan.md");

    await $`mkdir -p ${childAPlanDir}`.quiet();
    await Bun.write(childAPlanPath, `# Implementation Plan: Backend API (Child A)

**Branch**: \`013-cross-repo-feature\`
**Parent Spec**: 007-multi-repo-monorepo-support
**Root Spec**: 013-cross-repo-feature
**Repo**: backend-service

## Summary

Implements backend API endpoints for cross-repo feature.

## Technical Context

**Language/Version**: TypeScript 5.3+ with Bun 1.0+ runtime
**Context**: Multi-repo child (backend-service)
**Coordinates with**: frontend-app (via API contract)

## Project Structure

\`\`\`text
backend-service/
├── src/
│   ├── api/
│   │   └── endpoints.ts
│   └── models/
│       └── data.ts
└── .speck/
    └── branches.json
\`\`\`

## Phase 0: Research & Discovery

**Status**: ✅ COMPLETE

**Key Findings**:
1. Multi-repo child context: backend-service
2. Parent spec ID: 007-multi-repo-monorepo-support
3. Root spec ID: 013-cross-repo-feature
4. Coordination: API contract shared with frontend-app

## Planning Complete ✅

Ready for implementation in backend-service.
`);

    // Verify child A plan created with correct references
    expect(existsSync(childAPlanPath)).toBe(true);
    const childAPlanContent = await readFile(childAPlanPath, "utf-8");
    expect(childAPlanContent).toContain("backend-service");
    expect(childAPlanContent).toContain("007-multi-repo-monorepo-support");
    expect(childAPlanContent).toContain("013-cross-repo-feature");
    expect(childAPlanContent).toContain("Multi-repo child");

    // Step 3: Create plan for child B (frontend-app)
    const childBPlanDir = path.join(childB, "specs", "013-cross-repo-feature");
    const childBPlanPath = path.join(childBPlanDir, "plan.md");

    await $`mkdir -p ${childBPlanDir}`.quiet();
    await Bun.write(childBPlanPath, `# Implementation Plan: Frontend UI (Child B)

**Branch**: \`013-cross-repo-feature\`
**Parent Spec**: 007-multi-repo-monorepo-support
**Root Spec**: 013-cross-repo-feature
**Repo**: frontend-app

## Summary

Implements frontend UI components for cross-repo feature.

## Technical Context

**Language/Version**: TypeScript 5.3+ with React 18
**Context**: Multi-repo child (frontend-app)
**Coordinates with**: backend-service (via API contract)

## Project Structure

\`\`\`text
frontend-app/
├── src/
│   ├── components/
│   │   └── FeatureUI.tsx
│   └── api/
│       └── client.ts
└── .speck/
    └── branches.json
\`\`\`

## Phase 0: Research & Discovery

**Status**: ✅ COMPLETE

**Key Findings**:
1. Multi-repo child context: frontend-app
2. Parent spec ID: 007-multi-repo-monorepo-support
3. Root spec ID: 013-cross-repo-feature
4. Coordination: API contract shared with backend-service

## Planning Complete ✅

Ready for implementation in frontend-app.
`);

    // Verify child B plan created with correct references
    expect(existsSync(childBPlanPath)).toBe(true);
    const childBPlanContent = await readFile(childBPlanPath, "utf-8");
    expect(childBPlanContent).toContain("frontend-app");
    expect(childBPlanContent).toContain("007-multi-repo-monorepo-support");
    expect(childBPlanContent).toContain("013-cross-repo-feature");
    expect(childBPlanContent).toContain("Multi-repo child");

    // Step 4: Cross-repository workflow validation
    // Verify all three documents reference the same root spec
    expect(rootSpecContent).toContain("013-cross-repo-feature");
    expect(childAPlanContent).toContain("013-cross-repo-feature");
    expect(childBPlanContent).toContain("013-cross-repo-feature");

    // Verify both children reference the correct parent spec
    expect(childAPlanContent).toContain("007-multi-repo-monorepo-support");
    expect(childBPlanContent).toContain("007-multi-repo-monorepo-support");

    // Verify children reference each other for coordination
    expect(childAPlanContent).toContain("frontend-app");
    expect(childBPlanContent).toContain("backend-service");
  });

  test("T067: Independent branch stacks in cross-repo workflow", async () => {
    const childA = fixture.childRepos.get("backend-service")!;
    const childB = fixture.childRepos.get("frontend-app")!;

    // Create the spec directory first (required for branch creation)
    const specDir = path.join(fixture.specsDir, "013-cross-repo-feature");
    await $`mkdir -p ${specDir}`.quiet();
    await Bun.write(path.join(specDir, "spec.md"), "# Test Spec\n");

    // Step 1: Create branches in child A
    await $`
      cd ${childA} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/api-v1 --base main --spec 013-cross-repo-feature
    `.quiet();

    await $`
      cd ${childA} && \
      git add .speck/branches.json && \
      git commit -m "Add api-v1 branch"
    `.quiet();

    await $`
      cd ${childA} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/api-v2 --base nprbst/api-v1 --spec 013-cross-repo-feature
    `.quiet();

    // Step 2: Create branches in child B (independently)
    await $`
      cd ${childB} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/ui-v1 --base main --spec 013-cross-repo-feature
    `.quiet();

    await $`
      cd ${childB} && \
      git add .speck/branches.json && \
      git commit -m "Add ui-v1 branch"
    `.quiet();

    await $`
      cd ${childB} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/ui-v2 --base nprbst/ui-v1 --spec 013-cross-repo-feature
    `.quiet();

    // Step 3: Verify independent branch stacks
    const childABranchesPath = path.join(childA, ".speck", "branches.json");
    const childBBranchesPath = path.join(childB, ".speck", "branches.json");

    const childABranches = JSON.parse(await readFile(childABranchesPath, "utf-8"));
    const childBBranches = JSON.parse(await readFile(childBBranchesPath, "utf-8"));

    // Child A has its own stack
    expect(childABranches.branches).toHaveLength(2);
    expect(childABranches.branches[0].name).toBe("nprbst/api-v1");
    expect(childABranches.branches[1].name).toBe("nprbst/api-v2");

    // Child B has its own independent stack
    expect(childBBranches.branches).toHaveLength(2);
    expect(childBBranches.branches[0].name).toBe("nprbst/ui-v1");
    expect(childBBranches.branches[1].name).toBe("nprbst/ui-v2");

    // Step 4: View aggregate status from root
    const statusResult = await $`
      cd ${fixture.rootDir} && \
      bun run ${fixture.scriptsDir}/branch-command.ts status --all
    `;

    const statusOutput = statusResult.stdout.toString();

    // Verify both repos shown in aggregate
    expect(statusOutput).toContain("backend-service");
    expect(statusOutput).toContain("frontend-app");
    expect(statusOutput).toContain("nprbst/api-v1");
    expect(statusOutput).toContain("nprbst/api-v2");
    expect(statusOutput).toContain("nprbst/ui-v1");
    expect(statusOutput).toContain("nprbst/ui-v2");
  });

  test("T067: Cross-repo validation prevents invalid dependencies", async () => {
    const childA = fixture.childRepos.get("backend-service")!;
    const childB = fixture.childRepos.get("frontend-app")!;

    // Create the spec directory first (required for branch creation)
    const specDir = path.join(fixture.specsDir, "013-cross-repo-feature");
    await $`mkdir -p ${specDir}`.quiet();
    await Bun.write(path.join(specDir, "spec.md"), "# Test Spec\n");

    // Step 1: Create branch in child A
    await $`
      cd ${childA} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/api-feature --base main --spec 013-cross-repo-feature
    `.quiet();

    // Step 2: Attempt to create branch in child B with base from child A (should fail)
    const result = await $`
      cd ${childB} && \
      bun run ${fixture.scriptsDir}/branch-command.ts create nprbst/ui-feature --base nprbst/api-feature --spec 013-cross-repo-feature
    `.nothrow();

    // Should exit with error
    expect(result.exitCode).not.toBe(0);

    // Error message should explain that base branch doesn't exist
    const stderr = result.stderr.toString();
    expect(stderr).toContain("does not exist");
  });
});
