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
 *   bun run .claude/scripts/inquiries/manage.ts respond <id>
 *   bun run .claude/scripts/inquiries/manage.ts send <id> --subject="..." --body="..."
 *
 * This script uses Wrangler to execute SQL against the D1 database.
 * Ensure you have Wrangler configured with your Cloudflare credentials.
 */

import { $ } from 'bun';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { markdownToHtml, renderEmailTemplate } from './templates';
import { sendEmail, isEmailConfigured } from './email';

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

/**
 * Fetch inquiry and format for Claude drafting
 */
async function respondToInquiry(id: number): Promise<void> {
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

  // Output formatted for Claude to draft a response
  console.log(`\n📝 Draft Response for Inquiry #${inquiry.id}\n`);
  console.log('═'.repeat(70));
  console.log(`\nTo: ${inquiry.email}`);
  console.log(`Submitted: ${formatDate(inquiry.submitted_at)}`);
  console.log(`Status: ${inquiry.status}`);
  console.log('\n─── Original Message ───\n');
  console.log(inquiry.message);
  console.log('\n─── Draft Your Response Below ───\n');
  console.log(`Subject: Re: Your Speck Inquiry`);
  console.log(`\nDear visitor,\n`);
  console.log(`Thank you for your interest in Speck.\n`);
  console.log(`[Your response here]\n`);
  console.log(`Best regards,`);
  console.log(`The Speck Team`);
  console.log('\n═'.repeat(70));
  console.log('\nTo send this response, use:');
  console.log(`  bun run .claude/scripts/inquiries/manage.ts send ${id} --subject="Re: Your Speck Inquiry" --body="Your markdown response here"${USE_REMOTE ? ' --remote' : ''}`);
  console.log('');
}

/**
 * Send email response via Resend and record in D1
 */
async function sendResponse(id: number, subject: string, markdownBody: string): Promise<void> {
  // Check email configuration
  if (!isEmailConfigured()) {
    console.error('Error: RESEND_API_KEY environment variable is not set.');
    console.error('Set it with: export RESEND_API_KEY=your_api_key');
    process.exit(1);
  }

  // Fetch the inquiry
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

  console.log(`\n📧 Sending response to ${inquiry.email}...\n`);

  // Convert markdown to HTML
  const bodyHtml = markdownToHtml(markdownBody);

  // Render complete email template
  const fullHtml = renderEmailTemplate({
    recipientEmail: inquiry.email,
    subject,
    bodyHtml,
  });

  // Send via Resend
  const emailResult = await sendEmail({
    to: inquiry.email,
    subject,
    html: fullHtml,
    text: markdownBody, // Plain text fallback
  });

  if (!emailResult.success) {
    console.error('Error sending email:', emailResult.error);
    process.exit(1);
  }

  console.log(`✅ Email sent successfully (ID: ${emailResult.messageId})`);

  // Record response in D1
  const escapedSubject = subject.replace(/'/g, "''");
  const escapedMarkdown = markdownBody.replace(/'/g, "''");
  const escapedHtml = fullHtml.replace(/'/g, "''");

  const insertSql = `INSERT INTO responses (inquiry_id, subject, body_markdown, body_html) VALUES (${id}, '${escapedSubject}', '${escapedMarkdown}', '${escapedHtml}')`;
  const insertResult = await executeSQL(insertSql);

  if (!insertResult.success) {
    console.error('Warning: Email sent but failed to record in database:', insertResult.error);
  } else {
    console.log('📝 Response recorded in database');
  }

  // Update inquiry status to contacted
  const updateSql = `UPDATE inquiries SET status = 'contacted', contacted_at = datetime('now') WHERE id = ${id}`;
  const updateResult = await executeSQL(updateSql);

  if (!updateResult.success) {
    console.error('Warning: Failed to update inquiry status:', updateResult.error);
  } else {
    console.log('✅ Inquiry marked as contacted');
  }

  console.log('\n═'.repeat(50));
  console.log('Response sent and recorded successfully!');
  console.log('═'.repeat(50));
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
  respond <id>                            Show inquiry for Claude to draft a response
  send <id> --subject="..." --body="..."  Send email response via Resend

Options:
  --remote                                Use remote D1 database (default: local)
  --subject="..."                         Email subject line (for send command)
  --body="..."                            Email body in markdown (for send command)

Examples:
  bun run .claude/scripts/inquiries/manage.ts list
  bun run .claude/scripts/inquiries/manage.ts list --status=new
  bun run .claude/scripts/inquiries/manage.ts view 1
  bun run .claude/scripts/inquiries/manage.ts mark-contacted 1
  bun run .claude/scripts/inquiries/manage.ts archive 1 --notes="Handled via email"
  bun run .claude/scripts/inquiries/manage.ts stats --remote
  bun run .claude/scripts/inquiries/manage.ts respond 1
  bun run .claude/scripts/inquiries/manage.ts send 1 --subject="Re: Inquiry" --body="Thank you..."

Environment Variables:
  RESEND_API_KEY                          Required for 'send' command
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

  const subjectFlag = flags.find((f) => f.startsWith('--subject='));
  const subject = subjectFlag?.split('=').slice(1).join('=').replace(/^["']|["']$/g, '');

  const bodyFlag = flags.find((f) => f.startsWith('--body='));
  const body = bodyFlag?.split('=').slice(1).join('=').replace(/^["']|["']$/g, '');

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

    case 'respond':
      const respondId = parseInt(args[1], 10);
      if (isNaN(respondId)) {
        console.error('Error: Please provide a valid inquiry ID.');
        process.exit(1);
      }
      await respondToInquiry(respondId);
      break;

    case 'send':
      const sendId = parseInt(args[1], 10);
      if (isNaN(sendId)) {
        console.error('Error: Please provide a valid inquiry ID.');
        process.exit(1);
      }
      if (!subject) {
        console.error('Error: --subject is required for send command.');
        process.exit(1);
      }
      if (!body) {
        console.error('Error: --body is required for send command.');
        process.exit(1);
      }
      await sendResponse(sendId, subject, body);
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
