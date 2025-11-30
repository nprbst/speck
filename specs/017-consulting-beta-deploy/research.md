# Research: Consulting Page & Beta Deployment

**Feature**: 017-consulting-beta-deploy
**Date**: 2025-11-30
**Purpose**: Resolve technical unknowns and establish best practices for implementation

## Decision Summary

| Topic | Decision | Rationale |
|-------|----------|-----------|
| Database | Cloudflare D1 | Native integration, serverless, free tier sufficient |
| Query Builder | Kysely with kysely-d1 adapter | Type-safe queries, no raw SQL strings, better DX |
| Spam Prevention | Cloudflare Turnstile (invisible mode) + honeypot | Layered defense without UX friction |
| Server Functions | Cloudflare Pages Functions | Native integration, no additional infrastructure |
| Beta Deployment | Branch alias with custom domain | Official Cloudflare feature for staging environments |
| Production Redirect | speck.codes → beta.speck.codes (until GA) | Single source of truth during beta period |

---

## 1. Cloudflare D1 for Form Submissions

### Decision
Use Cloudflare D1 with Kysely query builder for type-safe, secure inquiry storage.

### Rationale
- **Native Integration**: D1 binds directly to Pages Functions via `wrangler.toml`
- **Type Safety**: Kysely provides compile-time type checking for all queries
- **Serverless**: No connection pooling, cold starts acceptable for low-volume inquiries
- **Free Tier**: Sufficient for inquiry capture (5GB storage, 5M reads/day)

### Best Practices Applied
- **Kysely Query Builder**: Type-safe queries without raw SQL strings
- **Single Writes**: D1 allows only one write transaction at a time; simple inserts are fine
- **Migrations**: Use `wrangler d1 migrations` for schema changes
- **Local Dev**: Use `wrangler d1 execute --local` for testing

### Sources
- [Cloudflare D1 Overview](https://developers.cloudflare.com/d1/)
- [Query D1 Best Practices](https://developers.cloudflare.com/d1/best-practices/query-d1/)
- [D1 SQLite Schema & Migrations](https://www.thisdot.co/blog/d1-sqlite-schema-migrations-and-seeds)

---

## 1a. Kysely Query Builder for D1

### Decision
Use Kysely with the `kysely-d1` adapter for all database interactions.

### Rationale
- **Type Safety**: Compile-time type checking catches SQL errors before runtime
- **No Raw SQL Strings**: Queries are built with method chaining, reducing injection risk
- **Autocompletion**: IDE support for table names, column names, and query methods
- **D1 Compatibility**: The `kysely-d1` adapter provides full D1 binding support
- **Lightweight**: Kysely adds minimal overhead compared to full ORMs

### Implementation Pattern

**Install dependencies:**
```bash
bun add kysely kysely-d1
```

**Database type definitions (generated or manual):**
```typescript
// types/database.ts
import type { Generated, Insertable, Selectable, Updateable } from 'kysely';

export interface Database {
  inquiries: InquiriesTable;
}

export interface InquiriesTable {
  id: Generated<number>;
  email: string;
  message: string;
  submitted_at: Generated<string>;
  source_page: string;
  status: 'new' | 'contacted' | 'archived';
  contacted_at: string | null;
  notes: string | null;
}

export type Inquiry = Selectable<InquiriesTable>;
export type NewInquiry = Insertable<InquiriesTable>;
export type InquiryUpdate = Updateable<InquiriesTable>;
```

**Create Kysely instance:**
```typescript
// lib/db.ts
import { Kysely } from 'kysely';
import { D1Dialect } from 'kysely-d1';
import type { Database } from '../types/database';

export function createDb(d1: D1Database): Kysely<Database> {
  return new Kysely<Database>({
    dialect: new D1Dialect({ database: d1 }),
  });
}
```

**Usage in Pages Function:**
```typescript
// functions/api/inquiry.ts
import { createDb } from '../../lib/db';

export async function onRequestPost(context: EventContext<Env, string, unknown>) {
  const db = createDb(context.env.DB);
  const { email, message } = await context.request.json();

  await db
    .insertInto('inquiries')
    .values({
      email,
      message,
      source_page: '/expert-help',
    })
    .execute();

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
```

### Best Practices Applied
- **Centralized DB Factory**: Create Kysely instance via factory function for testability
- **Type Exports**: Export `Selectable`, `Insertable`, `Updateable` variants for different contexts
- **No Transactions**: D1 doesn't support transactions via Kysely; use single operations
- **Type Generation**: Consider `kysely-codegen` for automatic type generation from schema

### Sources
- [Kysely Official Documentation](https://kysely.dev/)
- [kysely-d1 Adapter](https://github.com/aidenwallis/kysely-d1)
- [Cloudflare D1 Community Projects](https://developers.cloudflare.com/d1/reference/community-projects/)

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

## 4a. Production Domain Redirect (Pre-GA)

### Decision
Redirect `speck.codes` to `beta.speck.codes` until General Availability.

### Rationale
- **Single Source of Truth**: All traffic goes to beta during development period
- **No Content Duplication**: Avoids maintaining two separate deployments
- **Clear Signal**: Users understand they're accessing a beta/preview version
- **Easy GA Transition**: Simply remove redirect rule when ready for production

### Implementation Pattern

**Option 1: Cloudflare Redirect Rules (Recommended)**

In Cloudflare Dashboard → Rules → Redirect Rules:

1. Create new redirect rule:
   - **Rule name**: "Redirect speck.codes to beta (pre-GA)"
   - **When incoming requests match**: Hostname equals `speck.codes`
   - **Then**: Dynamic redirect to `https://beta.speck.codes${http.request.uri.path}`
   - **Status code**: 302 (Temporary) - use 302 so search engines don't cache permanently
   - **Preserve query string**: Yes

**Option 2: DNS-Level with Page Rules (Legacy)**

```text
# Page Rule (being deprecated, use Redirect Rules instead)
URL: speck.codes/*
Setting: Forwarding URL (302)
Destination: https://beta.speck.codes/$1
```

**Option 3: Worker-Based Redirect**

```typescript
// workers/redirect.ts (if more complex logic needed)
export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.hostname === 'speck.codes') {
      url.hostname = 'beta.speck.codes';
      return Response.redirect(url.toString(), 302);
    }
    return fetch(request);
  }
};
```

### DNS Requirements

For the redirect to work, both domains need DNS records:

```text
# speck.codes zone
@       A       100::        ; Proxied (orange cloud) - placeholder for redirect
beta    CNAME   <project>.pages.dev  ; Proxied - actual site

# Or use AAAA with 100:: for apex domain without origin
```

**Note**: The `100::` IPv6 address is a Cloudflare convention for domains that only need proxy features (like redirects) without an actual origin server.

### GA Transition Plan

When ready for General Availability:
1. Remove the redirect rule from Cloudflare Dashboard
2. Point `speck.codes` to the production Pages deployment
3. Keep `beta.speck.codes` for preview/staging purposes
4. Consider 301 redirect from `beta.speck.codes` to `speck.codes` post-GA

### Sources
- [Cloudflare Redirect Rules](https://developers.cloudflare.com/rules/url-forwarding/)
- [Redirect Rules Cheat Sheet](https://community.cloudflare.com/t/redirect-rules-cheat-sheet/508780)
- [URL Forwarding with Page Rules](https://developers.cloudflare.com/rules/page-rules/how-to/url-forwarding/)

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
