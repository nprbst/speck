# Custom Domain Email Setup: Cloudflare Email Routing + Resend SMTP

This guide sets up a professional custom domain email (e.g.,
`inquiry@speck.codes`) that:

- **Receives** mail via Cloudflare Email Routing → forwarded to Gmail
- **Sends** mail via Resend SMTP → clean headers, no Gmail fingerprints

---

## Prerequisites

- A domain with DNS managed by Cloudflare
- A Gmail account (or any IMAP-capable inbox)
- A Resend account (free tier: 3,000 emails/month)

---

## Part 1: Cloudflare Email Routing (Inbound)

### Step 1: Enable Email Routing

1. Log into [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Select your domain
3. Navigate to **Email** → **Email Routing** in the sidebar
4. Click **Get started** if this is your first time

### Step 2: Add Destination Address

1. Go to **Email Routing** → **Destination addresses**
2. Click **Add destination address**
3. Enter your Gmail address (e.g., `yourname@gmail.com`)
4. Check your Gmail inbox for the verification email and click the link

### Step 3: Create Routing Rules

1. Go to **Email Routing** → **Routing rules**
2. Click **Create address**
3. Configure your custom address:
   - **Custom address**: `hello` (or your preferred prefix)
   - **Action**: Send to an email
   - **Destination**: Select your verified Gmail address
4. Click **Save**

You can create multiple addresses (e.g., `support@`, `nathan@`, etc.) all
routing to the same or different destinations.

### Step 4: Verify DNS Records

Cloudflare automatically adds the required MX records. Verify them under **Email
Routing** → **Settings**:

| Type | Name | Content                                      | Priority |
| ---- | ---- | -------------------------------------------- | -------- |
| MX   | @    | `route1.mx.cloudflare.net`                   | 69       |
| MX   | @    | `route2.mx.cloudflare.net`                   | 34       |
| MX   | @    | `route3.mx.cloudflare.net`                   | 5        |
| TXT  | @    | `v=spf1 include:_spf.mx.cloudflare.net ~all` | -        |

> **Note**: If you already have SPF records, you'll need to merge them. See
> Part 3.

### Step 5: Test Inbound

Send an email from another account to `inquiry@yourdomain.com`. It should arrive
in your Gmail inbox within seconds.

---

## Part 2: Resend Setup (Outbound SMTP)

### Step 1: Create Resend Account

1. Go to [resend.com](https://resend.com) and sign up
2. Verify your email address

### Step 2: Add Your Domain

1. In Resend dashboard, go to **Domains**
2. Click **Add domain**
3. Enter your domain (e.g., `speck.codes`)
4. Select your region (US or EU)

### Step 3: Add DNS Records for Resend

Resend will provide DNS records to add. Go to Cloudflare and add them:

#### DKIM Records (3 required)

| Type | Name                 | Content                                 | TTL  |
| ---- | -------------------- | --------------------------------------- | ---- |
| TXT  | `resend._domainkey`  | `p=MIGfMA0GCSq...` (provided by Resend) | Auto |
| TXT  | `resend2._domainkey` | (provided by Resend)                    | Auto |
| TXT  | `resend3._domainkey` | (provided by Resend)                    | Auto |

> **Important**: Copy the exact values from Resend's dashboard. They're unique
> to your domain.

### Step 4: Verify Domain in Resend

1. Return to Resend dashboard
2. Click **Verify** next to your domain
3. Wait for verification (usually 1-5 minutes, can take up to 72 hours)

Status should change from "Pending" to "Verified" ✓

### Step 5: Generate SMTP Credentials

1. Go to **API Keys** in Resend dashboard
2. Click **Create API Key**
3. Name it something like `Gmail SMTP - speck.codes`
4. Set permission to **Sending access**
5. Optionally restrict to your domain
6. Click **Add**
7. **Copy the API key immediately** — you won't see it again

Your SMTP credentials are:

- **Host**: `smtp.resend.com`
- **Port**: `587` (TLS) or `465` (SSL)
- **Username**: `resend`
- **Password**: Your API key (starts with `re_`)

---

## Part 3: DNS Records (Complete Setup)

Your final DNS configuration should include all of these:

### MX Records (Cloudflare Email Routing)

| Type | Name | Content                    | Priority |
| ---- | ---- | -------------------------- | -------- |
| MX   | @    | `route1.mx.cloudflare.net` | 69       |
| MX   | @    | `route2.mx.cloudflare.net` | 34       |
| MX   | @    | `route3.mx.cloudflare.net` | 5        |

### SPF Record (Combined)

You need ONE SPF record that includes both Cloudflare and Resend:

```
v=spf1 include:_spf.mx.cloudflare.net include:resend.com ~all
```

| Type | Name | Content                                                         |
| ---- | ---- | --------------------------------------------------------------- |
| TXT  | @    | `v=spf1 include:_spf.mx.cloudflare.net include:resend.com ~all` |

> **Warning**: You can only have ONE SPF record. If you have an existing one,
> merge the `include:` statements.

### DKIM Records (Resend)

Add the 3 DKIM TXT records provided by Resend (see Part 2, Step 3).

### DMARC Record (Recommended)

Add a DMARC policy for better deliverability:

| Type | Name     | Content                                               |
| ---- | -------- | ----------------------------------------------------- |
| TXT  | `_dmarc` | `v=DMARC1; p=none; rua=mailto:inquiry@yourdomain.com` |

Start with `p=none` (monitoring only). Once you confirm everything works, you
can tighten to `p=quarantine` or `p=reject`.

---

## Part 4: Gmail "Send As" Configuration

### Step 1: Open Gmail Settings

1. Open Gmail
2. Click the gear icon → **See all settings**
3. Go to **Accounts and Import** tab

### Step 2: Add Send-As Address

1. Find **Send mail as** section
2. Click **Add another email address**
3. Enter:
   - **Name**: Your name or project name
   - **Email address**: `inquiry@yourdomain.com`
   - **Uncheck** "Treat as an alias" (optional, but recommended)
4. Click **Next Step**

### Step 3: Configure SMTP

Enter the Resend SMTP credentials:

| Field              | Value                          |
| ------------------ | ------------------------------ |
| SMTP Server        | `smtp.resend.com`              |
| Port               | `587`                          |
| Username           | `resend`                       |
| Password           | Your Resend API key (`re_...`) |
| Secured connection | TLS (selected)                 |

Click **Add Account**.

### Step 4: Skip Verification (or Complete It)

Gmail will send a verification code to `inquiry@yourdomain.com`. Since
Cloudflare is forwarding to your Gmail, you should receive it in your inbox.
Enter the code to verify.

### Step 5: Set as Default (Optional)

Back in Gmail settings → **Accounts and Import** → **Send mail as**:

1. Click **make default** next to your custom domain address
2. This ensures replies go out from your custom domain by default

---

## Part 5: Testing

### Test Inbound

1. Send an email from an external account to `inquiry@yourdomain.com`
2. Confirm it arrives in Gmail

### Test Outbound

1. Compose a new email in Gmail
2. Click the "From" field and select `inquiry@yourdomain.com`
3. Send to a test address (use a different provider like Outlook or a temp mail
   service)
4. Verify the recipient sees `inquiry@yourdomain.com` as the sender

### Verify Clean Headers

Ask the recipient to view raw headers (in Gmail: three dots → "Show original").
Check that:

- ✓ `From:` shows your custom domain
- ✓ `Return-Path:` shows your custom domain (via Resend)
- ✓ No `X-Google-DKIM-Signature` header
- ✓ DKIM signature is from Resend
- ✓ SPF and DKIM both pass

---

## Troubleshooting

### Emails not forwarding (Cloudflare)

- Verify MX records are correct and propagated (`dig MX yourdomain.com`)
- Check that destination address is verified in Cloudflare
- Ensure routing rule is enabled (not paused)

### "Send As" verification email not arriving

- Check spam folder
- Verify Cloudflare routing rule is active
- Try resending the verification from Gmail

### Outbound emails going to spam

- Ensure SPF, DKIM, and DMARC records are all configured
- Wait 24-48 hours after DNS changes for propagation
- Check your domain reputation at [mail-tester.com](https://www.mail-tester.com)
- Start with a warm-up period: send to engaged recipients first

### "Authentication failed" in Gmail SMTP setup

- Confirm you're using `resend` as username (not your email)
- Verify the API key is correct (no extra spaces)
- Ensure API key has "Sending access" permission
- Check that your domain is verified in Resend

---

## Quick Reference

| Service                  | Purpose              | Free Tier             |
| ------------------------ | -------------------- | --------------------- |
| Cloudflare Email Routing | Receive mail         | Unlimited             |
| Resend                   | Send mail (SMTP)     | 3,000 emails/month    |
| Gmail                    | Inbox + "Send As" UI | Standard Gmail limits |

### SMTP Credentials (Resend)

```
Host: smtp.resend.com
Port: 587 (TLS) or 465 (SSL)
Username: resend
Password: <your-api-key>
```

---

## Security Notes

- Keep your Resend API key secret — treat it like a password
- Consider enabling 2FA on all services (Cloudflare, Resend, Gmail)
- Periodically review Resend's sending logs for unexpected activity
- If you suspect API key compromise, rotate it immediately in Resend dashboard
