#!/usr/bin/env bun
/**
 * Inquiry Management Script
 * Manages inquiries stored in Cloudflare D1 via Wrangler CLI
 *
 * Usage:
 *   bun run .claude/scripts/inquiries/manage.ts list [--status=new|contacted|archived]
 *   bun run .claude/scripts/inquiries/manage.ts view <id>
 *   bun run .claude/scripts/inquiries/manage.ts mark-contacted <id>
 *   bun run .claude/scripts/inquiries/manage.ts archive <id> [--notes="reason"]
 *   bun run .claude/scripts/inquiries/manage.ts stats
 *
 * This script uses Wrangler to execute SQL against the D1 database.
 * Ensure you have Wrangler configured with your Cloudflare credentials.
 */

import { $ } from 'bun';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const DATABASE_NAME = 'speck-inquiries';
const USE_REMOTE = process.env.USE_REMOTE === 'true' || process.argv.includes('--remote');

// Find the website directory (contains wrangler.toml)
const __dirname = dirname(fileURLToPath(import.meta.url));
const WEBSITE_DIR = resolve(__dirname, '../../../website');

interface Inquiry {
  id: number;
  email: string;
  message: string;
  submitted_at: string;
  source_page: string;
  status: 'new' | 'contacted' | 'archived';
  contacted_at: string | null;
  notes: string | null;
}

interface D1Response {
  success: boolean;
  results?: Inquiry[];
  error?: string;
}

async function executeSQL(sql: string): Promise<D1Response> {
  const locationFlag = USE_REMOTE ? '--remote' : '--local';

  try {
    // Run wrangler from the website directory where wrangler.toml lives
    // Use double quotes for --command and let Bun shell handle the escaping
    const result = await $`cd ${WEBSITE_DIR} && bunx wrangler d1 execute ${DATABASE_NAME} ${locationFlag} --json --command=${sql}`.quiet();

    // Parse the JSON output
    const output = result.stdout.toString().trim();
    if (!output) {
      return { success: true, results: [] };
    }

    try {
      const parsed = JSON.parse(output);
      // Wrangler returns an array with result objects
      if (Array.isArray(parsed) && parsed.length > 0) {
        return { success: true, results: parsed[0]?.results || [] };
      }
      return { success: true, results: [] };
    } catch {
      // If JSON parsing fails, check if it's an error
      if (output.includes('error') || output.includes('Error')) {
        return { success: false, error: output };
      }
      return { success: true, results: [] };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, error: errorMessage };
  }
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

async function listInquiries(status?: string): Promise<void> {
  let sql = 'SELECT * FROM inquiries';

  if (status && ['new', 'contacted', 'archived'].includes(status)) {
    sql += ` WHERE status = '${status}'`;
  }

  sql += ' ORDER BY submitted_at DESC LIMIT 50';

  const result = await executeSQL(sql);

  if (!result.success) {
    console.error('Error fetching inquiries:', result.error);
    process.exit(1);
  }

  const inquiries = result.results || [];

  if (inquiries.length === 0) {
    console.log(`No inquiries found${status ? ` with status '${status}'` : ''}.`);
    return;
  }

  console.log(`\n📋 Inquiries${status ? ` (${status})` : ''} - ${inquiries.length} result(s)\n`);
  console.log('─'.repeat(100));

  for (const inquiry of inquiries) {
    const statusEmoji =
      inquiry.status === 'new' ? '🆕' : inquiry.status === 'contacted' ? '📧' : '📁';

    console.log(
      `${statusEmoji} #${inquiry.id} | ${inquiry.email} | ${formatDate(inquiry.submitted_at)}`
    );
    console.log(`   ${truncate(inquiry.message, 80)}`);
    console.log('─'.repeat(100));
  }
}

async function viewInquiry(id: number): Promise<void> {
  const sql = `SELECT * FROM inquiries WHERE id = ${id}`;
  const result = await executeSQL(sql);

  if (!result.success) {
    console.error('Error fetching inquiry:', result.error);
    process.exit(1);
  }

  const inquiry = result.results?.[0];

  if (!inquiry) {
    console.log(`Inquiry #${id} not found.`);
    process.exit(1);
  }

  const statusEmoji =
    inquiry.status === 'new' ? '🆕' : inquiry.status === 'contacted' ? '📧' : '📁';

  console.log(`\n${statusEmoji} Inquiry #${inquiry.id}\n`);
  console.log('═'.repeat(60));
  console.log(`Email:        ${inquiry.email}`);
  console.log(`Status:       ${inquiry.status}`);
  console.log(`Submitted:    ${formatDate(inquiry.submitted_at)}`);
  console.log(`Source:       ${inquiry.source_page}`);
  if (inquiry.contacted_at) {
    console.log(`Contacted:    ${formatDate(inquiry.contacted_at)}`);
  }
  if (inquiry.notes) {
    console.log(`Notes:        ${inquiry.notes}`);
  }
  console.log('─'.repeat(60));
  console.log('\nMessage:');
  console.log(inquiry.message);
  console.log('\n' + '═'.repeat(60));
}

async function markContacted(id: number): Promise<void> {
  const sql = `UPDATE inquiries SET status = 'contacted', contacted_at = datetime('now') WHERE id = ${id}`;
  const result = await executeSQL(sql);

  if (!result.success) {
    console.error('Error updating inquiry:', result.error);
    process.exit(1);
  }

  console.log(`✅ Inquiry #${id} marked as contacted.`);

  // Show updated inquiry
  await viewInquiry(id);
}

async function archiveInquiry(id: number, notes?: string): Promise<void> {
  const notesValue = notes ? `'${notes.replace(/'/g, "''")}'` : 'NULL';
  const sql = `UPDATE inquiries SET status = 'archived', notes = ${notesValue} WHERE id = ${id}`;
  const result = await executeSQL(sql);

  if (!result.success) {
    console.error('Error archiving inquiry:', result.error);
    process.exit(1);
  }

  console.log(`📁 Inquiry #${id} archived.`);

  // Show updated inquiry
  await viewInquiry(id);
}

async function showStats(): Promise<void> {
  const sql = `SELECT status, COUNT(*) as count FROM inquiries GROUP BY status`;
  const result = await executeSQL(sql);

  if (!result.success) {
    console.error('Error fetching stats:', result.error);
    process.exit(1);
  }

  const stats = result.results as Array<{ status: string; count: number }> | undefined;

  console.log('\n📊 Inquiry Statistics\n');
  console.log('═'.repeat(40));

  let total = 0;
  const statusCounts: Record<string, number> = {
    new: 0,
    contacted: 0,
    archived: 0,
  };

  for (const row of stats || []) {
    statusCounts[row.status] = row.count;
    total += row.count;
  }

  console.log(`🆕 New:        ${statusCounts.new}`);
  console.log(`📧 Contacted:  ${statusCounts.contacted}`);
  console.log(`📁 Archived:   ${statusCounts.archived}`);
  console.log('─'.repeat(40));
  console.log(`📋 Total:      ${total}`);
  console.log('═'.repeat(40));
}

function printUsage(): void {
  console.log(`
Inquiry Management Script

Usage:
  bun run .claude/scripts/inquiries/manage.ts <command> [options]

Commands:
  list [--status=new|contacted|archived]  List inquiries (newest first)
  view <id>                               View full details of an inquiry
  mark-contacted <id>                     Mark an inquiry as contacted
  archive <id> [--notes="reason"]         Archive an inquiry with optional notes
  stats                                   Show inquiry statistics

Options:
  --remote                                Use remote D1 database (default: local)

Examples:
  bun run .claude/scripts/inquiries/manage.ts list
  bun run .claude/scripts/inquiries/manage.ts list --status=new
  bun run .claude/scripts/inquiries/manage.ts view 1
  bun run .claude/scripts/inquiries/manage.ts mark-contacted 1
  bun run .claude/scripts/inquiries/manage.ts archive 1 --notes="Handled via email"
  bun run .claude/scripts/inquiries/manage.ts stats --remote
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
  const flags = process.argv.slice(2).filter((arg) => arg.startsWith('--'));

  const command = args[0];

  // Parse flags
  const statusFlag = flags.find((f) => f.startsWith('--status='));
  const status = statusFlag?.split('=')[1];

  const notesFlag = flags.find((f) => f.startsWith('--notes='));
  const notes = notesFlag?.split('=').slice(1).join('=').replace(/^["']|["']$/g, '');

  switch (command) {
    case 'list':
      await listInquiries(status);
      break;

    case 'view':
      const viewId = parseInt(args[1], 10);
      if (isNaN(viewId)) {
        console.error('Error: Please provide a valid inquiry ID.');
        process.exit(1);
      }
      await viewInquiry(viewId);
      break;

    case 'mark-contacted':
      const contactId = parseInt(args[1], 10);
      if (isNaN(contactId)) {
        console.error('Error: Please provide a valid inquiry ID.');
        process.exit(1);
      }
      await markContacted(contactId);
      break;

    case 'archive':
      const archiveId = parseInt(args[1], 10);
      if (isNaN(archiveId)) {
        console.error('Error: Please provide a valid inquiry ID.');
        process.exit(1);
      }
      await archiveInquiry(archiveId, notes);
      break;

    case 'stats':
      await showStats();
      break;

    default:
      printUsage();
      break;
  }
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
