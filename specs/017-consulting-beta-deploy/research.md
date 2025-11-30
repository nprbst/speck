# Research: Consulting Page & Beta Deployment

**Feature**: 017-consulting-beta-deploy
**Date**: 2025-11-30
**Purpose**: Resolve technical unknowns and establish best practices for implementation

## Decision Summary

| Topic | Decision | Rationale |
|-------|----------|-----------|
| Database | Cloudflare D1 | Native integration, serverless, free tier sufficient |
| Spam Prevention | Cloudflare Turnstile (invisible mode) + honeypot | Layered defense without UX friction |
| Server Functions | Cloudflare Pages Functions | Native integration, no additional infrastructure |
| Beta Deployment | Branch alias with custom domain | Official Cloudflare feature for staging environments |

---

## 1. Cloudflare D1 for Form Submissions

### Decision
Use Cloudflare D1 with prepared statements for secure inquiry storage.

### Rationale
- **Native Integration**: D1 binds directly to Pages Functions via `wrangler.toml`
- **SQLite Semantics**: Familiar SQL syntax, no ORM required for simple use case
- **Serverless**: No connection pooling, cold starts acceptable for low-volume inquiries
- **Free Tier**: Sufficient for inquiry capture (5GB storage, 5M reads/day)

### Implementation Pattern

```typescript
// In Pages Function (functions/api/inquiry.ts)
export async function onRequestPost(context: EventContext<Env, string, unknown>) {
  const { DB } = context.env;

  const { email, message } = await context.request.json();

  // Use prepared statements to prevent SQL injection
  const stmt = DB.prepare(`
    INSERT INTO inquiries (email, message, submitted_at, status)
    VALUES (?, ?, datetime('now'), 'new')
  `);

  await stmt.bind(email, message).run();

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
```

### Best Practices Applied
- **Prepared Statements**: Always use `DB.prepare()` with `.bind()` for parameterized queries
- **Single Writes**: D1 allows only one write transaction at a time; simple inserts are fine
- **Migrations**: Use `wrangler d1 migrations` for schema changes
- **Local Dev**: Use `wrangler d1 execute --local` for testing

### Sources
- [Cloudflare D1 Overview](https://developers.cloudflare.com/d1/)
- [Query D1 Best Practices](https://developers.cloudflare.com/d1/best-practices/query-d1/)
- [D1 SQLite Schema & Migrations](https://www.thisdot.co/blog/d1-sqlite-schema-migrations-and-seeds)

---

## 2. Cloudflare Turnstile Integration

### Decision
Use Cloudflare Turnstile in "invisible" mode with honeypot field as backup.

### Rationale
- **Invisible Mode**: No visual CAPTCHA puzzle, zero UX friction for legitimate users
- **Layered Defense**: Honeypot catches simple bots without external API calls; Turnstile handles sophisticated attacks
- **Free Unlimited**: No per-verification costs
- **Server Verification Required**: Must validate token server-side

### Implementation Pattern

**Client-side (Astro component):**
```astro
---
// InquiryForm.astro
---
<form id="inquiry-form">
  <input type="email" name="email" required />
  <textarea name="message" maxlength="2000" required></textarea>

  <!-- Honeypot field (hidden from users) -->
  <input type="text" name="website" class="hp-field" tabindex="-1" autocomplete="off" />

  <!-- Turnstile widget (invisible mode) -->
  <div class="cf-turnstile"
       data-sitekey={import.meta.env.PUBLIC_TURNSTILE_SITE_KEY}
       data-callback="onTurnstileSuccess"
       data-size="invisible"></div>

  <button type="submit">Submit Inquiry</button>
</form>

<script is:inline src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
```

**Server-side verification:**
```typescript
// functions/api/inquiry.ts
async function verifyTurnstile(token: string, secret: string): Promise<boolean> {
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      secret,
      response: token,
    }),
  });

  const result = await response.json();
  return result.success === true;
}
```

### Best Practices Applied
- **Invisible by Default**: Use `data-size="invisible"` to avoid showing widget
- **Server Verification**: Never trust client-side validation alone
- **Honeypot Field**: Hide with CSS `position: absolute; left: -9999px;`
- **Environment Variables**: Store `TURNSTILE_SECRET_KEY` in Cloudflare Pages settings

### Sources
- [Using Cloudflare Turnstile on an Astro Form](https://flaviocopes.com/using-cloudflare-turnstile-on-a-astro-form/)
- [Astro Turnstile Template](https://github.com/sapphic-archive/astro-turnstile-template)
- [Protect Auth Forms with Turnstile](https://blog.hijabicoder.dev/how-to-protect-auth-forms-with-cloudflare-supabase-ssr-and-astro-actions)

---

## 3. Cloudflare Pages Functions Setup

### Decision
Use Cloudflare Pages Functions with `@astrojs/cloudflare` adapter in hybrid mode.

### Rationale
- **Hybrid Rendering**: Static pages for content, SSR only for form submission endpoint
- **Native D1 Bindings**: Access database via `context.env.DB`
- **No Extra Infrastructure**: Functions deploy alongside static assets
- **wrangler.toml Config**: Single configuration file for all Cloudflare services

### Implementation Pattern

**astro.config.mjs:**
```javascript
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  output: 'hybrid', // Static by default, opt-in to SSR
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
    },
  }),
});
```

**wrangler.toml:**
```toml
name = "speck-website"
compatibility_date = "2025-01-01"
pages_build_output_dir = "dist"

[[d1_databases]]
binding = "DB"
database_name = "speck-inquiries"
database_id = "<your-database-id>"
```

**tsconfig.json additions:**
```json
{
  "compilerOptions": {
    "types": ["@cloudflare/workers-types"]
  }
}
```

### Best Practices Applied
- **Hybrid Mode**: Use `export const prerender = false` only where needed
- **Type Safety**: Install `@cloudflare/workers-types` for proper typing
- **Local Dev**: Run `wrangler types` after config changes
- **Platform Proxy**: Enable for local access to D1 bindings

### Sources
- [Astro Cloudflare Adapter](https://docs.astro.build/en/guides/integrations-guide/cloudflare/)
- [Deploy Astro to Cloudflare](https://docs.astro.build/en/guides/deploy/cloudflare/)
- [Cloudflare Pages Functions Configuration](https://developers.cloudflare.com/pages/functions/wrangler-configuration/)

---

## 4. Beta Deployment Configuration

### Decision
Use Cloudflare Pages branch alias with custom domain `beta.speck.codes`.

### Rationale
- **Official Feature**: Cloudflare natively supports custom domains per branch
- **Automatic Updates**: Push to designated branch triggers deployment
- **Same Build**: Identical to production, different domain
- **DNS Proxied**: Required for branch alias feature

### Implementation Pattern

**Setup Steps:**
1. Create `beta` branch in repository
2. Deploy successfully to `beta` branch (creates preview URL)
3. In Cloudflare Pages dashboard: Custom Domains → Add custom domain
4. Enter `beta.speck.codes` and select `beta` branch
5. Add DNS CNAME record: `beta` → `<project>.pages.dev`

**wrangler.toml (environment-specific):**
```toml
[env.beta]
name = "speck-website-beta"
vars = { ENVIRONMENT = "beta" }

[[env.beta.d1_databases]]
binding = "DB"
database_name = "speck-inquiries-beta"
database_id = "<beta-database-id>"
```

### Best Practices Applied
- **Separate Database**: Use different D1 database for beta vs production
- **Environment Variables**: Set `ENVIRONMENT` to distinguish contexts
- **Proxied DNS**: CNAME must be orange-clouded in Cloudflare DNS
- **Branch Protection**: Consider requiring PR for production branch

### Sources
- [Cloudflare Pages Preview Deployments](https://developers.cloudflare.com/pages/configuration/preview-deployments/)
- [Custom Branch Aliases](https://developers.cloudflare.com/pages/how-to/custom-branch-aliases/)
- [Custom Domains for Pages](https://developers.cloudflare.com/pages/configuration/custom-domains/)

---

## 5. Form Validation Best Practices

### Decision
Client-side validation with server-side enforcement; 2000 character limit for messages.

### Rationale
- **Immediate Feedback**: Client validation provides <500ms response (SC-004)
- **Defense in Depth**: Server always validates regardless of client
- **Character Limit**: 2000 characters balances expressiveness with storage

### Implementation Pattern

**Client-side validation:**
```typescript
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validateMessage(message: string): { valid: boolean; error?: string } {
  if (!message.trim()) {
    return { valid: false, error: 'Message is required' };
  }
  if (message.length > 2000) {
    return { valid: false, error: 'Message must be under 2000 characters' };
  }
  return { valid: true };
}
```

**Server-side validation:**
```typescript
function validateInquiry(data: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (typeof data !== 'object' || data === null) {
    return { valid: false, errors: ['Invalid request body'] };
  }

  const { email, message } = data as Record<string, unknown>;

  if (typeof email !== 'string' || !validateEmail(email)) {
    errors.push('Valid email address is required');
  }

  if (typeof message !== 'string' || !message.trim()) {
    errors.push('Message is required');
  } else if (message.length > 2000) {
    errors.push('Message must be under 2000 characters');
  }

  return { valid: errors.length === 0, errors };
}
```

---

## Alternatives Considered

### Database Alternatives

| Option | Pros | Cons | Why Rejected |
|--------|------|------|--------------|
| Supabase | More features, real-time | External dependency, another account | Over-engineered for simple form storage |
| Cloudflare KV | Fast reads | Not relational, awkward for queries | Need to query/filter inquiries |
| External PostgreSQL | Full SQL features | Latency, connection management | Adds operational complexity |

### Spam Prevention Alternatives

| Option | Pros | Cons | Why Rejected |
|--------|------|------|--------------|
| reCAPTCHA | Well-known | Google dependency, privacy concerns, UX friction | User experience impact |
| hCaptcha | Privacy-focused | Still requires solving puzzles | UX friction |
| Honeypot only | Simple, no external calls | Ineffective against sophisticated bots | Need layered approach |

---

## Open Questions (None)

All technical unknowns from the plan have been resolved. The implementation can proceed.
