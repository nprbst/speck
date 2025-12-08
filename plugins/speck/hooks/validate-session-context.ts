#!/usr/bin/env bun

import { existsSync } from 'fs';
import { writeFile, readFile } from 'fs/promises';

interface HookInput {
  session_id: string;
  cwd: string;
}

interface LogEvent {
  type: string;
  featureId?: string;
  command?: string;
  [key: string]: unknown;
}

const hookInput = (await Bun.stdin.json()) as HookInput;
const { session_id, cwd } = hookInput;

// Read session log
const logPath = `${cwd}/.speck/test-logs/session-${session_id}.jsonl`;

let events: LogEvent[] = [];
try {
  if (existsSync(logPath)) {
    const logContent = await readFile(logPath, 'utf-8');
    events = logContent
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line) as LogEvent);
  }
} catch {
  // No log file yet, skip validation
  process.exit(0);
}

// Extract feature IDs and commands
const featureIds = events
  .filter(
    (e): e is LogEvent & { featureId: string } => e.type === 'session-context' && !!e.featureId
  )
  .map((e) => e.featureId);

const commands = events
  .filter((e): e is LogEvent & { command: string } => e.type === 'session-context' && !!e.command)
  .map((e) => e.command);

// Detect context switches (feature ID changed mid-session)
const uniqueFeatures = [...new Set(featureIds)];

if (uniqueFeatures.length > 1) {
  console.error(
    JSON.stringify({
      systemMessage: `⚠️  Context Switch Detected: Session referenced features ${uniqueFeatures.join(', ')}`,
      continue: true, // Don't block, just warn
    })
  );

  // Log context switch
  await writeFile(
    logPath,
    JSON.stringify({
      type: 'context-switch',
      timestamp: Date.now(),
      features: uniqueFeatures,
    }) + '\n',
    { flag: 'a' }
  );
}

// Validate workflow sequences
const EXPECTED_WORKFLOWS: Record<string, string[]> = {
  'specify-plan-tasks': ['speck.specify', 'speck.plan', 'speck.tasks'],
  'specify-clarify-plan': ['speck.specify', 'speck.clarify', 'speck.plan'],
  'stacked-pr-flow': ['speck.branch'],
};

for (const [workflowName, expectedSeq] of Object.entries(EXPECTED_WORKFLOWS)) {
  if (commands.length >= expectedSeq.length) {
    const matches = expectedSeq.every((cmd, i) => commands[i] === cmd);

    if (matches) {
      console.log(
        JSON.stringify({
          systemMessage: `✅ Workflow '${workflowName}' completed successfully`,
          continue: false,
        })
      );

      // Log workflow completion
      await writeFile(
        logPath,
        JSON.stringify({
          type: 'workflow-complete',
          timestamp: Date.now(),
          workflow: workflowName,
          commands,
        }) + '\n',
        { flag: 'a' }
      );

      process.exit(0);
    }
  }
}

// Output workflow summary
console.log(
  JSON.stringify({
    systemMessage: `✅ Session workflow: ${commands.join(' → ') || 'no commands'}`,
    suppressOutput: false,
  })
);

// Log workflow summary
await writeFile(
  logPath,
  JSON.stringify({
    type: 'workflow-summary',
    timestamp: Date.now(),
    commands,
  }) + '\n',
  { flag: 'a' }
);

process.exit(0);
