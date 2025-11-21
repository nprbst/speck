#!/usr/bin/env bun

import Ajv from 'ajv';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { writeFile } from 'fs/promises';
import { dirname } from 'path';

// Load JSON schemas
const PR_SUGGESTION_SCHEMA = JSON.parse(
  readFileSync('.speck/hooks/schemas/pr-suggestion.schema.json', 'utf-8')
);

const IMPORT_PROMPT_SCHEMA = JSON.parse(
  readFileSync('.speck/hooks/schemas/import-prompt.schema.json', 'utf-8')
);

interface HookInput {
  session_id: string;
  cwd: string;
  tool_name: string;
  tool_input?: { command?: string };
  tool_response?: {
    exitCode: number;
    stdout: string;
    stderr: string;
  };
}

const hookInput: HookInput = await Bun.stdin.json();

// Only validate Bash commands
if (hookInput.tool_name !== 'Bash') {
  process.exit(0);
}

const command = hookInput.tool_input?.command || '';
const exitCode = hookInput.tool_response?.exitCode ?? 0;
const stderr = hookInput.tool_response?.stderr || '';
const stdout = hookInput.tool_response?.stdout || '';

// Ensure test-logs directory exists
const logDir = `${hookInput.cwd}/.speck/test-logs`;
if (!existsSync(logDir)) {
  mkdirSync(logDir, { recursive: true });
}

// Log event
const logPath = `${logDir}/session-${hookInput.session_id}.jsonl`;
await writeFile(
  logPath,
  JSON.stringify({
    type: 'contract-validation',
    timestamp: Date.now(),
    command,
    exitCode,
  }) + '\n',
  { flag: 'a' }
);

// Validate contract: branch-command.ts exit codes
if (command.includes('branch-command.ts')) {
  // Exit code 2: PR suggestion required
  if (exitCode === 2) {
    try {
      const json = JSON.parse(stderr);
      const ajv = new Ajv();
      const validate = ajv.compile(PR_SUGGESTION_SCHEMA);

      if (!validate(json)) {
        console.error(
          JSON.stringify({
            decision: 'block',
            reason: '❌ Contract Violation: Exit code 2 without valid PR suggestion JSON',
            additionalContext: `Schema errors: ${JSON.stringify(validate.errors)}`,
          })
        );

        // Log violation
        await writeFile(
          logPath,
          JSON.stringify({
            type: 'contract-violation',
            timestamp: Date.now(),
            command,
            exitCode: 2,
            error: 'Invalid PR suggestion JSON schema',
            schemaErrors: validate.errors,
          }) + '\n',
          { flag: 'a' }
        );

        process.exit(2); // Block execution
      }
    } catch (err: any) {
      console.error(
        JSON.stringify({
          decision: 'block',
          reason: '❌ Contract Violation: Exit code 2 with invalid JSON in stderr',
          additionalContext: `Parse error: ${err.message}`,
        })
      );

      await writeFile(
        logPath,
        JSON.stringify({
          type: 'contract-violation',
          timestamp: Date.now(),
          command,
          exitCode: 2,
          error: 'Invalid JSON in stderr',
          parseError: err.message,
        }) + '\n',
        { flag: 'a' }
      );

      process.exit(2);
    }
  }

  // Exit code 3: Import prompt required
  if (exitCode === 3) {
    try {
      const json = JSON.parse(stderr);
      const ajv = new Ajv();
      const validate = ajv.compile(IMPORT_PROMPT_SCHEMA);

      if (!validate(json)) {
        console.error(
          JSON.stringify({
            decision: 'block',
            reason: '❌ Contract Violation: Exit code 3 without valid import prompt JSON',
            additionalContext: `Schema errors: ${JSON.stringify(validate.errors)}`,
          })
        );

        await writeFile(
          logPath,
          JSON.stringify({
            type: 'contract-violation',
            timestamp: Date.now(),
            command,
            exitCode: 3,
            error: 'Invalid import prompt JSON schema',
            schemaErrors: validate.errors,
          }) + '\n',
          { flag: 'a' }
        );

        process.exit(2);
      }
    } catch (err: any) {
      console.error(
        JSON.stringify({
          decision: 'block',
          reason: '❌ Contract Violation: Exit code 3 with invalid JSON in stderr',
          additionalContext: `Parse error: ${err.message}`,
        })
      );

      await writeFile(
        logPath,
        JSON.stringify({
          type: 'contract-violation',
          timestamp: Date.now(),
          command,
          exitCode: 3,
          error: 'Invalid JSON in stderr',
          parseError: err.message,
        }) + '\n',
        { flag: 'a' }
      );

      process.exit(2);
    }
  }

  // Log successful validation
  await writeFile(
    logPath,
    JSON.stringify({
      type: 'contract-success',
      timestamp: Date.now(),
      command,
      exitCode,
    }) + '\n',
    { flag: 'a' }
  );

  console.log(
    JSON.stringify({
      systemMessage: `✅ Contract validated: ${command} (exit ${exitCode})`,
      suppressOutput: true,
    })
  );
}

process.exit(0);
