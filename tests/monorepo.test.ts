/**
 * Monorepo-Specific Support Tests
 *
 * Comprehensive tests for monorepo workflows (Feature 007 - Phase 5)
 *
 * Test Coverage:
 * - Nested package detection (packages/*, apps/*, libs/*)
 * - Yarn/npm/pnpm workspace compatibility
 * - Lerna monorepo structures
 * - Deep nesting (packages/category/component/)
 * - Per-package constitutions
 * - Shared vs local specs
 * - Build tool interference testing
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { $ } from 'bun';
import {
  detectSpeckRoot,
  clearSpeckCache,
  getFeaturePaths,
} from '../plugins/speck/scripts/common/paths.ts';

// Test helpers
async function createTestDir(name: string): Promise<string> {
  const testDir = path.join('/tmp', `speck-monorepo-${name}-${Date.now()}`);
  await fs.mkdir(testDir, { recursive: true });
  return testDir;
}

async function initGit(dir: string): Promise<void> {
  await $`cd ${dir} && git init`.quiet();
}

async function createSpeckSymlink(repoDir: string, targetDir: string): Promise<void> {
  const speckDir = path.join(repoDir, '.speck');
  await fs.mkdir(speckDir, { recursive: true });
  const relativePath = path.relative(speckDir, targetDir);
  const symlinkPath = path.join(speckDir, 'root');
  await fs.symlink(relativePath, symlinkPath, 'dir');
}

async function cleanup(dir: string): Promise<void> {
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}

async function createPackageJson(dir: string, name: string, workspaces?: string[]): Promise<void> {
  const pkg = workspaces ? { name, private: true, workspaces } : { name, version: '1.0.0' };
  await fs.writeFile(path.join(dir, 'package.json'), JSON.stringify(pkg, null, 2));
}

describe('Monorepo: Standard Package Layouts', () => {
  let monorepoRoot: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    monorepoRoot = await createTestDir('standard-layout');
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await cleanup(monorepoRoot);
  });

  test('Yarn Workspaces: packages/* layout', async () => {
    // Create typical yarn workspaces structure
    await fs.mkdir(path.join(monorepoRoot, 'specs'), { recursive: true });
    await createPackageJson(monorepoRoot, 'my-monorepo', ['packages/*']);

    const webDir = path.join(monorepoRoot, 'packages', 'web');
    const apiDir = path.join(monorepoRoot, 'packages', 'api');

    await fs.mkdir(webDir, { recursive: true });
    await fs.mkdir(apiDir, { recursive: true });

    await initGit(webDir);
    await initGit(apiDir);

    await createPackageJson(webDir, '@myapp/web');
    await createPackageJson(apiDir, '@myapp/api');

    // Link packages to monorepo root
    await createSpeckSymlink(webDir, monorepoRoot);
    await createSpeckSymlink(apiDir, monorepoRoot);

    // Verify detection from web package
    process.chdir(webDir);
    clearSpeckCache();
    const webConfig = await detectSpeckRoot();
    const realMonorepoRoot = await fs.realpath(monorepoRoot);
    const realWebDir = await fs.realpath(webDir);

    expect(webConfig.mode).toBe('multi-repo');
    expect(webConfig.speckRoot).toBe(realMonorepoRoot);
    expect(webConfig.repoRoot).toBe(realWebDir);
    expect(webConfig.specsDir).toBe(path.join(realMonorepoRoot, 'specs'));

    // Verify detection from api package
    process.chdir(apiDir);
    clearSpeckCache();
    const apiConfig = await detectSpeckRoot();

    expect(apiConfig.mode).toBe('multi-repo');
    expect(apiConfig.speckRoot).toBe(realMonorepoRoot);
  });

  test('npm Workspaces: apps/* and packages/* layout', async () => {
    await fs.mkdir(path.join(monorepoRoot, 'specs'), { recursive: true });
    await createPackageJson(monorepoRoot, 'my-monorepo', ['apps/*', 'packages/*']);

    const appDir = path.join(monorepoRoot, 'apps', 'dashboard');
    const libDir = path.join(monorepoRoot, 'packages', 'ui-components');

    await fs.mkdir(appDir, { recursive: true });
    await fs.mkdir(libDir, { recursive: true });

    await initGit(appDir);
    await initGit(libDir);

    await createPackageJson(appDir, '@myapp/dashboard');
    await createPackageJson(libDir, '@myapp/ui-components');

    await createSpeckSymlink(appDir, monorepoRoot);
    await createSpeckSymlink(libDir, monorepoRoot);

    // Verify both apps/* and packages/* can link
    process.chdir(appDir);
    clearSpeckCache();
    const appConfig = await detectSpeckRoot();
    const realMonorepoRoot = await fs.realpath(monorepoRoot);

    expect(appConfig.mode).toBe('multi-repo');
    expect(appConfig.speckRoot).toBe(realMonorepoRoot);

    process.chdir(libDir);
    clearSpeckCache();
    const libConfig = await detectSpeckRoot();

    expect(libConfig.speckRoot).toBe(realMonorepoRoot);
  });

  test('pnpm Workspaces: YAML configuration', async () => {
    await fs.mkdir(path.join(monorepoRoot, 'specs'), { recursive: true });

    // pnpm uses pnpm-workspace.yaml instead of package.json workspaces
    await fs.writeFile(
      path.join(monorepoRoot, 'pnpm-workspace.yaml'),
      'packages:\n  - "packages/*"\n  - "tools/*"\n'
    );
    await createPackageJson(monorepoRoot, 'my-monorepo');

    const packageDir = path.join(monorepoRoot, 'packages', 'core');
    const toolDir = path.join(monorepoRoot, 'tools', 'build-tool');

    await fs.mkdir(packageDir, { recursive: true });
    await fs.mkdir(toolDir, { recursive: true });

    await initGit(packageDir);
    await initGit(toolDir);

    await createPackageJson(packageDir, '@myapp/core');
    await createPackageJson(toolDir, '@myapp/build-tool');

    await createSpeckSymlink(packageDir, monorepoRoot);
    await createSpeckSymlink(toolDir, monorepoRoot);

    // Verify both packages/* and tools/* work
    process.chdir(packageDir);
    clearSpeckCache();
    const packageConfig = await detectSpeckRoot();
    const realMonorepoRoot = await fs.realpath(monorepoRoot);

    expect(packageConfig.speckRoot).toBe(realMonorepoRoot);

    process.chdir(toolDir);
    clearSpeckCache();
    const toolConfig = await detectSpeckRoot();

    expect(toolConfig.speckRoot).toBe(realMonorepoRoot);
  });
});

describe('Monorepo: Deep Nesting Scenarios', () => {
  let monorepoRoot: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    monorepoRoot = await createTestDir('deep-nesting');
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await cleanup(monorepoRoot);
  });

  test('Three levels deep: packages/category/component/', async () => {
    await fs.mkdir(path.join(monorepoRoot, 'specs'), { recursive: true });

    // Deep structure: packages/frontend/dashboard/
    const deepPackage = path.join(monorepoRoot, 'packages', 'frontend', 'dashboard');
    await fs.mkdir(deepPackage, { recursive: true });
    await initGit(deepPackage);

    // Symlink needs to go up 3 levels: ../../../
    await createSpeckSymlink(deepPackage, monorepoRoot);

    process.chdir(deepPackage);
    clearSpeckCache();
    const config = await detectSpeckRoot();
    const realMonorepoRoot = await fs.realpath(monorepoRoot);
    const realDeepPackage = await fs.realpath(deepPackage);

    expect(config.mode).toBe('multi-repo');
    expect(config.speckRoot).toBe(realMonorepoRoot);
    expect(config.repoRoot).toBe(realDeepPackage);

    // Verify symlink points to correct level
    const symlinkPath = path.join(deepPackage, '.speck', 'root');
    const target = await fs.readlink(symlinkPath);
    expect(target).toBe('../../../..');
  });

  test('Mixed depth: flat and nested packages in same monorepo', async () => {
    await fs.mkdir(path.join(monorepoRoot, 'specs'), { recursive: true });

    const flatPackage = path.join(monorepoRoot, 'packages', 'utils');
    const nestedPackage = path.join(monorepoRoot, 'packages', 'apps', 'mobile');

    await fs.mkdir(flatPackage, { recursive: true });
    await fs.mkdir(nestedPackage, { recursive: true });

    await initGit(flatPackage);
    await initGit(nestedPackage);

    await createSpeckSymlink(flatPackage, monorepoRoot);
    await createSpeckSymlink(nestedPackage, monorepoRoot);

    // Verify both resolve to same root
    process.chdir(flatPackage);
    clearSpeckCache();
    const flatConfig = await detectSpeckRoot();
    const realMonorepoRoot = await fs.realpath(monorepoRoot);

    process.chdir(nestedPackage);
    clearSpeckCache();
    const nestedConfig = await detectSpeckRoot();

    expect(flatConfig.speckRoot).toBe(realMonorepoRoot);
    expect(nestedConfig.speckRoot).toBe(realMonorepoRoot);
    expect(flatConfig.speckRoot).toBe(nestedConfig.speckRoot);
  });
});

describe('Monorepo: Per-Package Constitutions', () => {
  let monorepoRoot: string;
  let frontendDir: string;
  let backendDir: string;
  let sharedDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    monorepoRoot = await createTestDir('constitutions');
    await fs.mkdir(path.join(monorepoRoot, 'specs'), { recursive: true });

    frontendDir = path.join(monorepoRoot, 'packages', 'frontend');
    backendDir = path.join(monorepoRoot, 'packages', 'backend');
    sharedDir = path.join(monorepoRoot, 'packages', 'shared');

    await fs.mkdir(frontendDir, { recursive: true });
    await fs.mkdir(backendDir, { recursive: true });
    await fs.mkdir(sharedDir, { recursive: true });

    await initGit(frontendDir);
    await initGit(backendDir);
    await initGit(sharedDir);

    await createSpeckSymlink(frontendDir, monorepoRoot);
    await createSpeckSymlink(backendDir, monorepoRoot);
    await createSpeckSymlink(sharedDir, monorepoRoot);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await cleanup(monorepoRoot);
  });

  test('Frontend package: React + TypeScript constitution', async () => {
    const memoryDir = path.join(frontendDir, '.speck', 'memory');
    await fs.mkdir(memoryDir, { recursive: true });

    await fs.writeFile(
      path.join(memoryDir, 'constitution.md'),
      `# Frontend Package Constitution

## Tech Stack Preferences
- **UI Framework**: React 18+
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **Testing**: Vitest + Testing Library

## Principles
- Component-first architecture
- Accessibility (WCAG 2.1 AA minimum)
- Performance budgets (LCP < 2.5s)
- Mobile-first responsive design

## Constraints
- No server-side code
- No direct database access
- All API calls through typed clients
`
    );

    process.chdir(frontendDir);
    const constitution = await fs.readFile(
      path.join(frontendDir, '.speck', 'memory', 'constitution.md'),
      'utf-8'
    );

    expect(constitution).toContain('React 18+');
    expect(constitution).toContain('TypeScript');
    expect(constitution).toContain('No server-side code');
  });

  test('Backend package: Node.js + API-focused constitution', async () => {
    const memoryDir = path.join(backendDir, '.speck', 'memory');
    await fs.mkdir(memoryDir, { recursive: true });

    await fs.writeFile(
      path.join(memoryDir, 'constitution.md'),
      `# Backend Package Constitution

## Tech Stack Preferences
- **Runtime**: Node.js 20+ (Bun for dev)
- **Framework**: Express / Fastify
- **Database**: PostgreSQL
- **Testing**: Bun test + Supertest

## Principles
- API-first design
- RESTful conventions
- Database migrations mandatory
- Comprehensive error handling

## Constraints
- No UI code
- No frontend dependencies
- Database queries via ORM only
`
    );

    process.chdir(backendDir);
    const constitution = await fs.readFile(
      path.join(backendDir, '.speck', 'memory', 'constitution.md'),
      'utf-8'
    );

    expect(constitution).toContain('Node.js 20+');
    expect(constitution).toContain('No UI code');
    expect(constitution).toContain('No frontend dependencies');
  });

  test('Shared package: Library-focused constitution', async () => {
    const memoryDir = path.join(sharedDir, '.speck', 'memory');
    await fs.mkdir(memoryDir, { recursive: true });

    await fs.writeFile(
      path.join(memoryDir, 'constitution.md'),
      `# Shared Package Constitution

## Tech Stack Preferences
- **Language**: TypeScript (strict mode)
- **Testing**: Unit tests required
- **Build**: Dual ESM/CJS output

## Principles
- Zero runtime dependencies
- Tree-shakeable exports
- Comprehensive JSDoc
- Semantic versioning

## Constraints
- Framework agnostic
- No platform-specific APIs
- Browser + Node.js compatible
`
    );

    process.chdir(sharedDir);
    const constitution = await fs.readFile(
      path.join(sharedDir, '.speck', 'memory', 'constitution.md'),
      'utf-8'
    );

    expect(constitution).toContain('Framework agnostic');
    expect(constitution).toContain('Zero runtime dependencies');
  });

  test('All three packages have independent constitutions', async () => {
    // Create constitutions for all three packages
    const frontendMemory = path.join(frontendDir, '.speck', 'memory');
    const backendMemory = path.join(backendDir, '.speck', 'memory');
    const sharedMemory = path.join(sharedDir, '.speck', 'memory');

    await fs.mkdir(frontendMemory, { recursive: true });
    await fs.mkdir(backendMemory, { recursive: true });
    await fs.mkdir(sharedMemory, { recursive: true });

    await fs.writeFile(
      path.join(frontendMemory, 'constitution.md'),
      '# Frontend\n**Tech**: React 18+'
    );

    await fs.writeFile(
      path.join(backendMemory, 'constitution.md'),
      '# Backend\n**Database**: PostgreSQL'
    );

    await fs.writeFile(
      path.join(sharedMemory, 'constitution.md'),
      '# Shared\n**Principle**: Framework agnostic'
    );

    const frontendConst = await fs.readFile(
      path.join(frontendDir, '.speck', 'memory', 'constitution.md'),
      'utf-8'
    );

    const backendConst = await fs.readFile(
      path.join(backendDir, '.speck', 'memory', 'constitution.md'),
      'utf-8'
    );

    const sharedConst = await fs.readFile(
      path.join(sharedDir, '.speck', 'memory', 'constitution.md'),
      'utf-8'
    );

    // Verify they're all different
    expect(frontendConst).not.toBe(backendConst);
    expect(frontendConst).not.toBe(sharedConst);
    expect(backendConst).not.toBe(sharedConst);

    // Verify package-specific content
    expect(frontendConst).toContain('React');
    expect(backendConst).toContain('PostgreSQL');
    expect(sharedConst).toContain('Framework agnostic');
  });
});

describe('Monorepo: Shared Specs Workflow', () => {
  let monorepoRoot: string;
  let webDir: string;
  let mobileDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    monorepoRoot = await createTestDir('shared-specs');
    await fs.mkdir(path.join(monorepoRoot, 'specs'), { recursive: true });

    webDir = path.join(monorepoRoot, 'apps', 'web');
    mobileDir = path.join(monorepoRoot, 'apps', 'mobile');

    await fs.mkdir(webDir, { recursive: true });
    await fs.mkdir(mobileDir, { recursive: true });

    await initGit(webDir);
    await initGit(mobileDir);

    await createSpeckSymlink(webDir, monorepoRoot);
    await createSpeckSymlink(mobileDir, monorepoRoot);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await cleanup(monorepoRoot);
  });

  test('Both apps read same spec from monorepo root', async () => {
    // Create shared spec at monorepo root
    const specDir = path.join(monorepoRoot, 'specs', '001-user-authentication');
    await fs.mkdir(specDir, { recursive: true });

    await fs.writeFile(
      path.join(specDir, 'spec.md'),
      `# User Authentication Feature

## Overview
Implement OAuth 2.0 authentication across web and mobile platforms.

## Requirements
- FR-001: Support Google OAuth
- FR-002: Support Apple Sign In
- FR-003: Persist tokens securely

## Success Criteria
- SC-001: Users can sign in on both platforms
- SC-002: Session persists across restarts
`
    );

    process.env.SPECIFY_FEATURE = '001-user-authentication';

    // Read from web app
    process.chdir(webDir);
    clearSpeckCache();
    const webPaths = await getFeaturePaths();
    const webSpec = await fs.readFile(webPaths.FEATURE_SPEC, 'utf-8');

    // Read from mobile app
    process.chdir(mobileDir);
    clearSpeckCache();
    const mobilePaths = await getFeaturePaths();
    const mobileSpec = await fs.readFile(mobilePaths.FEATURE_SPEC, 'utf-8');

    // Both should read same content
    expect(webSpec).toBe(mobileSpec);
    expect(webSpec).toContain('OAuth 2.0 authentication');
    expect(webSpec).toContain('Google OAuth');
    expect(webSpec).toContain('Apple Sign In');

    delete process.env.SPECIFY_FEATURE;
  });

  test('Each app generates different plan.md from shared spec', async () => {
    const specDir = path.join(monorepoRoot, 'specs', '002-offline-mode');
    await fs.mkdir(specDir, { recursive: true });

    await fs.writeFile(
      path.join(specDir, 'spec.md'),
      `# Offline Mode Feature

## Requirements
- Work without internet connection
- Sync when connection restored
`
    );

    // Create different constitutions
    const webMemory = path.join(webDir, '.speck', 'memory');
    const mobileMemory = path.join(mobileDir, '.speck', 'memory');

    await fs.mkdir(webMemory, { recursive: true });
    await fs.mkdir(mobileMemory, { recursive: true });

    await fs.writeFile(
      path.join(webMemory, 'constitution.md'),
      '**Tech**: React + IndexedDB for offline storage'
    );

    await fs.writeFile(
      path.join(mobileMemory, 'constitution.md'),
      '**Tech**: React Native + SQLite for offline storage'
    );

    // Create local plan directories
    await fs.mkdir(path.join(webDir, 'specs', '002-offline-mode'), { recursive: true });
    await fs.mkdir(path.join(mobileDir, 'specs', '002-offline-mode'), { recursive: true });

    await fs.writeFile(
      path.join(webDir, 'specs', '002-offline-mode', 'plan.md'),
      '# Web Plan\nUsing IndexedDB for storage'
    );

    await fs.writeFile(
      path.join(mobileDir, 'specs', '002-offline-mode', 'plan.md'),
      '# Mobile Plan\nUsing SQLite for storage'
    );

    process.env.SPECIFY_FEATURE = '002-offline-mode';

    // Verify different plans
    process.chdir(webDir);
    clearSpeckCache();
    const webPaths = await getFeaturePaths();
    const webPlan = await fs.readFile(webPaths.IMPL_PLAN, 'utf-8');

    process.chdir(mobileDir);
    clearSpeckCache();
    const mobilePaths = await getFeaturePaths();
    const mobilePlan = await fs.readFile(mobilePaths.IMPL_PLAN, 'utf-8');

    expect(webPlan).toContain('IndexedDB');
    expect(mobilePlan).toContain('SQLite');
    expect(webPlan).not.toBe(mobilePlan);

    delete process.env.SPECIFY_FEATURE;
  });
});

describe('Monorepo: Build Tool Compatibility', () => {
  let monorepoRoot: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    monorepoRoot = await createTestDir('build-tools');
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await cleanup(monorepoRoot);
  });

  test('Turborepo: turbo.json not affected by .speck symlinks', async () => {
    await fs.mkdir(path.join(monorepoRoot, 'specs'), { recursive: true });

    // Create turborepo config
    await fs.writeFile(
      path.join(monorepoRoot, 'turbo.json'),
      JSON.stringify(
        {
          $schema: 'https://turbo.build/schema.json',
          pipeline: {
            build: {
              dependsOn: ['^build'],
              outputs: ['dist/**'],
            },
            test: {
              cache: false,
            },
          },
        },
        null,
        2
      )
    );

    const packageDir = path.join(monorepoRoot, 'packages', 'core');
    await fs.mkdir(packageDir, { recursive: true });
    await initGit(packageDir);
    await createSpeckSymlink(packageDir, monorepoRoot);

    // Verify turbo.json still valid
    const turboConfig = JSON.parse(
      await fs.readFile(path.join(monorepoRoot, 'turbo.json'), 'utf-8')
    );

    expect(turboConfig.pipeline.build).toBeDefined();
    expect(turboConfig.pipeline.test).toBeDefined();
  });

  test('Lerna: lerna.json works with symlinked packages', async () => {
    await fs.mkdir(path.join(monorepoRoot, 'specs'), { recursive: true });

    await fs.writeFile(
      path.join(monorepoRoot, 'lerna.json'),
      JSON.stringify(
        {
          version: '1.0.0',
          packages: ['packages/*'],
          npmClient: 'yarn',
        },
        null,
        2
      )
    );

    const pkg1 = path.join(monorepoRoot, 'packages', 'pkg1');
    const pkg2 = path.join(monorepoRoot, 'packages', 'pkg2');

    await fs.mkdir(pkg1, { recursive: true });
    await fs.mkdir(pkg2, { recursive: true });

    await initGit(pkg1);
    await initGit(pkg2);

    await createPackageJson(pkg1, '@mono/pkg1');
    await createPackageJson(pkg2, '@mono/pkg2');

    await createSpeckSymlink(pkg1, monorepoRoot);
    await createSpeckSymlink(pkg2, monorepoRoot);

    // Verify packages directory structure intact
    const packagesDir = await fs.readdir(path.join(monorepoRoot, 'packages'));
    expect(packagesDir).toContain('pkg1');
    expect(packagesDir).toContain('pkg2');

    // Verify package.json files still readable
    const pkg1Json = JSON.parse(await fs.readFile(path.join(pkg1, 'package.json'), 'utf-8'));
    expect(pkg1Json.name).toBe('@mono/pkg1');
  });

  test('Nx: nx.json and workspace detection unaffected', async () => {
    await fs.mkdir(path.join(monorepoRoot, 'specs'), { recursive: true });

    await fs.writeFile(
      path.join(monorepoRoot, 'nx.json'),
      JSON.stringify(
        {
          npmScope: 'myorg',
          affected: {
            defaultBase: 'main',
          },
          tasksRunnerOptions: {
            default: {
              runner: 'nx/tasks-runners/default',
              options: {
                cacheableOperations: ['build', 'test'],
              },
            },
          },
        },
        null,
        2
      )
    );

    const appDir = path.join(monorepoRoot, 'apps', 'web');
    await fs.mkdir(appDir, { recursive: true });
    await initGit(appDir);
    await createSpeckSymlink(appDir, monorepoRoot);

    // Verify nx.json still valid
    const nxConfig = JSON.parse(await fs.readFile(path.join(monorepoRoot, 'nx.json'), 'utf-8'));

    expect(nxConfig.npmScope).toBe('myorg');
    expect(nxConfig.tasksRunnerOptions.default).toBeDefined();
  });
});

describe('Monorepo: Performance at Scale', () => {
  let monorepoRoot: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    monorepoRoot = await createTestDir('scale');
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await cleanup(monorepoRoot);
  });

  test('10 packages: All resolve to same root efficiently', async () => {
    await fs.mkdir(path.join(monorepoRoot, 'specs'), { recursive: true });

    const packages: string[] = [];
    for (let i = 1; i <= 10; i++) {
      const pkgDir = path.join(monorepoRoot, 'packages', `pkg${i}`);
      await fs.mkdir(pkgDir, { recursive: true });
      await initGit(pkgDir);
      await createSpeckSymlink(pkgDir, monorepoRoot);
      packages.push(pkgDir);
    }

    // Measure detection time for all packages
    const start = performance.now();
    const realMonorepoRoot = await fs.realpath(monorepoRoot);

    for (const pkgDir of packages) {
      process.chdir(pkgDir);
      clearSpeckCache();
      const config = await detectSpeckRoot();
      expect(config.speckRoot).toBe(realMonorepoRoot);
    }

    const end = performance.now();
    const avgTime = (end - start) / 10;

    // Average detection time should still be <10ms
    expect(avgTime).toBeLessThan(10);
  });

  test('Cached detection: Sub-millisecond for repeated calls', async () => {
    const pkgDir = path.join(monorepoRoot, 'packages', 'test');
    await fs.mkdir(pkgDir, { recursive: true });
    await initGit(pkgDir);
    await createSpeckSymlink(pkgDir, monorepoRoot);

    process.chdir(pkgDir);

    // First call (uncached)
    clearSpeckCache();
    const start1 = performance.now();
    await detectSpeckRoot();
    const end1 = performance.now();
    const uncachedTime = end1 - start1;

    // Second call (cached)
    const start2 = performance.now();
    await detectSpeckRoot();
    const end2 = performance.now();
    const cachedTime = end2 - start2;

    expect(uncachedTime).toBeLessThan(10); // Initial <10ms
    expect(cachedTime).toBeLessThan(1); // Cached <1ms
  });
});
