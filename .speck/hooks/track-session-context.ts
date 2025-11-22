#!/usr/bin/env bun

import { existsSync, mkdirSync } from 'fs';
import { writeFile } from 'fs/promises';

interface HookInput {
  session_id: string;
  prompt?: string;
  cwd: string;
}

const hookInput = await Bun.stdin.json() as HookInput;

const { session_id, prompt, cwd } = hookInput;

// Extract feature references from prompt
const featureMatch = prompt?.match(/\b(\d{3})-[\w-]+\b/);
const commandMatch = prompt?.match(/\/(speck\.[\w-]+)/);

const sessionState = {
  type: 'session-context',
  sessionId: session_id,
  timestamp: Date.now(),
  cwd,
  featureId: featureMatch?.[1] || null,
  featureName: featureMatch?.[0] || null,
  command: commandMatch?.[1] || null,
  promptSnippet: prompt?.substring(0, 100), // First 100 chars
};

// Ensure test-logs directory exists
const logDir = `${cwd}/.speck/test-logs`;
if (!existsSync(logDir)) {
  mkdirSync(logDir, { recursive: true });
}

// Append to session log
const logPath = `${logDir}/session-${session_id}.jsonl`;
await writeFile(logPath, JSON.stringify(sessionState) + '\n', { flag: 'a' });

// Inject context for Claude (visible in conversation)
if (commandMatch) {
  console.log(`[Session Tracker] Logged: ${commandMatch[1]}`);
} else {
  console.log(`[Session Tracker] Logged user input`);
}

process.exit(0);
