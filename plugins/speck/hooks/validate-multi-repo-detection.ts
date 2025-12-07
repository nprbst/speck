#!/usr/bin/env bun

import { existsSync, mkdirSync } from 'fs';
import { writeFile } from 'fs/promises';

interface HookInput {
  session_id: string;
  cwd: string;
  tool_name: string;
  tool_input?: { command?: string };
}

const hookInput = (await Bun.stdin.json()) as HookInput;
const { session_id, cwd, tool_name, tool_input } = hookInput;

// Only validate SlashCommand tool
if (tool_name !== 'SlashCommand') {
  process.exit(0);
}

const command = tool_input?.command || '';

// Only validate /speck.specify commands
if (!command.includes('/speck.specify')) {
  process.exit(0);
}

// Check if multi-repo mode
const speckLinkPath = `${cwd}/.speck-link`;
const isMultiRepo = existsSync(speckLinkPath);

// Ensure test-logs directory exists
const logDir = `${cwd}/.speck/test-logs`;
if (!existsSync(logDir)) {
  mkdirSync(logDir, { recursive: true });
}

const logPath = `${logDir}/session-${session_id}.jsonl`;

if (isMultiRepo) {
  // Log multi-repo detection
  await writeFile(
    logPath,
    JSON.stringify({
      type: 'multi-repo-detection',
      timestamp: Date.now(),
      mode: 'multi-repo',
      speckLinkExists: true,
    }) + '\n',
    { flag: 'a' }
  );

  // Inject reminder to Claude
  console.log(
    JSON.stringify({
      additionalContext:
        '🔗 Multi-repo mode detected (.speck-link exists). Ensure agent prompts user for parent vs. local spec creation.',
      permissionDecision: 'allow',
    })
  );
} else {
  // Log single-repo detection
  await writeFile(
    logPath,
    JSON.stringify({
      type: 'multi-repo-detection',
      timestamp: Date.now(),
      mode: 'single-repo',
      speckLinkExists: false,
    }) + '\n',
    { flag: 'a' }
  );

  console.log(
    JSON.stringify({
      additionalContext: `Single-repo mode. Spec will be created at ${cwd}/specs/`,
      permissionDecision: 'allow',
    })
  );
}

process.exit(0);
