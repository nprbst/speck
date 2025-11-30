---
description: Manage inquiries from the expert-help page stored in Cloudflare D1
---

# /speck.inquiries

Manage interest inquiries submitted through the expert-help page contact form. This command queries and updates inquiries stored in Cloudflare D1.

## Quick Reference

| Action | Command |
|--------|---------|
| List all new inquiries | `/speck.inquiries list` |
| Filter by status | `/speck.inquiries list --status=contacted` |
| View inquiry details | `/speck.inquiries view 123` |
| Mark as contacted | `/speck.inquiries mark-contacted 123` |
| Archive inquiry | `/speck.inquiries archive 123 --notes="Handled"` |
| View statistics | `/speck.inquiries stats` |
| Draft email response | `/speck.inquiries respond 123` |
| Send email response | `/speck.inquiries send 123 --subject="..." --body="..."` |

## Usage

Run the inquiry management script with the specified action:

```bash
bun run .claude/scripts/inquiries/manage.ts <action> [options]
```

### Actions

**list** - Show recent inquiries (newest first)
```bash
# All inquiries
bun run .claude/scripts/inquiries/manage.ts list

# Filter by status
bun run .claude/scripts/inquiries/manage.ts list --status=new
bun run .claude/scripts/inquiries/manage.ts list --status=contacted
bun run .claude/scripts/inquiries/manage.ts list --status=archived
```

**view** - Show full details of a specific inquiry
```bash
bun run .claude/scripts/inquiries/manage.ts view <id>
```

**mark-contacted** - Update inquiry status to "contacted" and set timestamp
```bash
bun run .claude/scripts/inquiries/manage.ts mark-contacted <id>
```

**archive** - Archive an inquiry with optional notes
```bash
bun run .claude/scripts/inquiries/manage.ts archive <id>
bun run .claude/scripts/inquiries/manage.ts archive <id> --notes="Handled via email on 2025-01-15"
```

**stats** - Show inquiry statistics by status
```bash
bun run .claude/scripts/inquiries/manage.ts stats
```

**respond** - Fetch inquiry details for drafting an email response
```bash
bun run .claude/scripts/inquiries/manage.ts respond <id>
```
This outputs the inquiry details formatted for Claude to draft a response, including the original message and a template to fill in.

**send** - Send an email response via Resend API and record in database
```bash
bun run .claude/scripts/inquiries/manage.ts send <id> --subject="Re: Your Speck Inquiry" --body="Your markdown response..."
```
This command:
- Converts the markdown body to HTML
- Sends the email via Resend API
- Records the response in the `responses` table
- Updates the inquiry status to "contacted"

## Database Location

By default, the script queries the **local** D1 database (development).

To query the **remote** (production) database, add the `--remote` flag:

```bash
bun run .claude/scripts/inquiries/manage.ts list --remote
bun run .claude/scripts/inquiries/manage.ts view 123 --remote
```

## Inquiry Status Values

| Status | Description | Emoji |
|--------|-------------|-------|
| `new` | Unread inquiry, needs attention | 🆕 |
| `contacted` | Admin has reached out to the inquirer | 📧 |
| `archived` | Handled or no longer active | 📁 |

## Example Workflow

### Basic Status Management

1. Check for new inquiries:
   ```bash
   bun run .claude/scripts/inquiries/manage.ts list --status=new --remote
   ```

2. Review an inquiry:
   ```bash
   bun run .claude/scripts/inquiries/manage.ts view 42 --remote
   ```

3. After responding via email, mark as contacted:
   ```bash
   bun run .claude/scripts/inquiries/manage.ts mark-contacted 42 --remote
   ```

4. If no follow-up needed, archive:
   ```bash
   bun run .claude/scripts/inquiries/manage.ts archive 42 --notes="Scheduled call for next week" --remote
   ```

### Email Response Workflow

1. Review a new inquiry and prepare to respond:
   ```bash
   bun run .claude/scripts/inquiries/manage.ts respond 42 --remote
   ```

2. Ask Claude to draft a response based on the inquiry content

3. Send the email (Claude drafts the markdown body):
   ```bash
   bun run .claude/scripts/inquiries/manage.ts send 42 \
     --subject="Re: Your Speck Inquiry" \
     --body="Thank you for your interest in Speck!

   I'd be happy to discuss implementation support for your team.

   **Next Steps:**
   - Schedule a 30-minute discovery call
   - Review your current development workflow

   Best regards,
   The Speck Team" --remote
   ```

4. The email is sent, recorded in the database, and the inquiry is marked as contacted

## Prerequisites

- **Wrangler CLI**: Must be installed and authenticated (`wrangler login`)
- **D1 Database**: The `speck-inquiries` database must exist (created via `wrangler d1 create`)
- **Migrations**: Run `wrangler d1 migrations apply speck-inquiries` first
- **RESEND_API_KEY**: Required for `send` command. Set via `export RESEND_API_KEY=re_xxxxx`

## Troubleshooting

**"no such table: inquiries"**
- Run migrations: `cd website && wrangler d1 migrations apply speck-inquiries --local`

**"no such table: responses"**
- Run migrations: `cd website && wrangler d1 migrations apply speck-inquiries --local`
- Ensure migration 002_create_responses.sql exists

**"authentication required"**
- Run `wrangler login` to authenticate with Cloudflare

**"RESEND_API_KEY environment variable is not set"**
- Set the API key: `export RESEND_API_KEY=re_xxxxx`
- Get your API key from https://resend.com/api-keys

**Email send fails with "domain not verified"**
- Verify your sending domain in Resend dashboard
- Default from address is `hello@speck.codes`

**Empty results**
- Ensure you're querying the correct database (local vs remote)
- Check that inquiries have been submitted via the form
