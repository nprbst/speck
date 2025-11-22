import { expect } from 'bun:test';

export interface HookEvent {
  type: string;
  timestamp: number;
  [key: string]: any;
}

declare module 'bun:test' {
  interface Matchers<T> {
    toContainWorkflow(workflowName: string): void;
    toContainContextSwitch(): void;
    toHaveContractViolations(count: number): void;
  }
}

export function setupHookMatchers() {
  expect.extend({
    toContainWorkflow(received: unknown, workflowName: string) {
      const events = received as HookEvent[];
      const workflowEvent = events.find(
        (e) => e.type === 'workflow-complete' && e.workflow === workflowName
      );

      return {
        pass: !!workflowEvent,
        message: () =>
          workflowEvent
            ? `Expected workflow '${workflowName}' not to be found`
            : `Expected workflow '${workflowName}' to be found in hook events`,
      };
    },

    toContainContextSwitch(received: unknown) {
      const events = received as HookEvent[];
      const contextSwitch = events.find((e) => e.type === 'context-switch');

      return {
        pass: !!contextSwitch,
        message: () =>
          contextSwitch
            ? `Expected no context switch, but found: ${JSON.stringify(contextSwitch.features)}`
            : `Expected context switch to be found`,
      };
    },

    toHaveContractViolations(received: unknown, expectedCount: number) {
      const events = received as HookEvent[];
      const violations = events.filter((e) => e.type === 'contract-violation');
      const actualCount = violations.length;

      return {
        pass: actualCount === expectedCount,
        message: () =>
          `Expected ${expectedCount} contract violations, but found ${actualCount}. Violations: ${JSON.stringify(violations)}`,
      };
    },
  });
}

/**
 * Parse hook log file from session ID
 */
export async function parseHookLog(logPath: string): Promise<HookEvent[]> {
  try {
    const content = await Bun.file(logPath).text();
    return content
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch {
    return [];
  }
}

/**
 * Get all contract validation events from hook log
 */
export function getContractValidations(events: HookEvent[]): HookEvent[] {
  return events.filter((e) => e.type === 'contract-validation' || e.type === 'contract-success');
}

/**
 * Get all contract violation events from hook log
 */
export function getContractViolations(events: HookEvent[]): HookEvent[] {
  return events.filter((e) => e.type === 'contract-violation');
}

/**
 * Get all session context events from hook log
 */
export function getSessionContexts(events: HookEvent[]): HookEvent[] {
  return events.filter((e) => e.type === 'session-context');
}

/**
 * Get all workflow completion events from hook log
 */
export function getWorkflowCompletions(events: HookEvent[]): HookEvent[] {
  return events.filter((e) => e.type === 'workflow-complete');
}

/**
 * Get all context switch events from hook log
 */
export function getContextSwitches(events: HookEvent[]): HookEvent[] {
  return events.filter((e) => e.type === 'context-switch');
}

/**
 * Get all multi-repo detection events from hook log
 */
export function getMultiRepoDetections(events: HookEvent[]): HookEvent[] {
  return events.filter((e) => e.type === 'multi-repo-detection');
}
