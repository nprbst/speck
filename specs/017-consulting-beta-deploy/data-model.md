# Data Model: Consulting Page & Beta Deployment

**Feature**: 017-consulting-beta-deploy
**Date**: 2025-11-30
**Storage**: Cloudflare D1 (SQLite)
**Query Builder**: Kysely with kysely-d1 adapter

## Entity Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Inquiry                             │
├─────────────────────────────────────────────────────────────┤
│ id            : INTEGER PRIMARY KEY AUTOINCREMENT           │
│ email         : TEXT NOT NULL                               │
│ message       : TEXT NOT NULL (max 2000 chars)              │
│ submitted_at  : TEXT NOT NULL (ISO 8601 datetime)           │
│ source_page   : TEXT NOT NULL (URL path)                    │
│ status        : TEXT NOT NULL DEFAULT 'new'                 │
│ contacted_at  : TEXT (nullable, ISO 8601 datetime)          │
│ notes         : TEXT (nullable, admin notes)                │
├─────────────────────────────────────────────────────────────┤
│ CONSTRAINT: status IN ('new', 'contacted', 'archived')      │
│ INDEX: idx_inquiries_status (status)                        │
│ INDEX: idx_inquiries_submitted_at (submitted_at DESC)       │
└─────────────────────────────────────────────────────────────┘
```

## Entities

### Inquiry

Represents an interest inquiry submission from a visitor.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | Unique identifier |
| `email` | TEXT | NOT NULL | Visitor's email address |
| `message` | TEXT | NOT NULL, max 2000 chars | Inquiry message |
| `submitted_at` | TEXT | NOT NULL | ISO 8601 timestamp of submission |
| `source_page` | TEXT | NOT NULL | URL path where form was submitted |
| `status` | TEXT | NOT NULL, DEFAULT 'new' | Inquiry lifecycle status |
| `contacted_at` | TEXT | NULL | Timestamp when marked as contacted |
| `notes` | TEXT | NULL | Admin notes for follow-up tracking |

**Status Values:**
- `new` - Unread inquiry (default)
- `contacted` - Admin has reached out
- `archived` - No longer active (handled or declined)

**Validation Rules:**
- `email`: Must match standard email format regex
- `message`: 1-2000 characters, trimmed whitespace
- `status`: Must be one of the allowed enum values
- `submitted_at`: Auto-generated on insert

### Consulting Service (Static Content)

Content type for displaying service offerings on the help page. Not stored in database; defined as static content in the Astro page.

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique slug identifier |
| `title` | string | Display name of the service |
| `description` | string | What the engagement includes |
| `outcomes` | string[] | Example outcomes clients can expect |

**Defined Services:**
1. **implementation-support** - Help organizations integrate Speck into their development workflow
2. **training** - Team training on spec-driven AI development practices
3. **architecture-review** - Review and recommendations for AI-assisted development setup

## SQL Schema

### Migration: 001_create_inquiries.sql

```sql
-- Cloudflare D1 Migration: Create inquiries table
-- Run with: wrangler d1 migrations apply speck-inquiries

CREATE TABLE IF NOT EXISTS inquiries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  message TEXT NOT NULL CHECK (length(message) <= 2000),
  submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
  source_page TEXT NOT NULL DEFAULT '/expert-help',
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'archived')),
  contacted_at TEXT,
  notes TEXT
);

-- Index for filtering by status (admin view)
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status);

-- Index for sorting by submission date (newest first)
CREATE INDEX IF NOT EXISTS idx_inquiries_submitted_at ON inquiries(submitted_at DESC);
```

### Seed Data (Development Only)

```sql
-- Development seed data for testing
-- Run with: wrangler d1 execute speck-inquiries --local --file=./seed.sql

INSERT INTO inquiries (email, message, submitted_at, source_page, status) VALUES
  ('test@example.com', 'We are interested in adopting Speck for our team of 10 developers.', datetime('now', '-3 days'), '/expert-help', 'new'),
  ('demo@company.org', 'Would like to schedule a call to discuss implementation support.', datetime('now', '-1 day'), '/expert-help', 'contacted'),
  ('old@legacy.com', 'This inquiry was handled and archived.', datetime('now', '-7 days'), '/expert-help', 'archived');
```

## TypeScript Types (Kysely)

```typescript
// types/database.ts
import type { Generated, Insertable, Selectable, Updateable } from 'kysely';

/**
 * Database schema for Kysely
 */
export interface Database {
  inquiries: InquiriesTable;
}

/**
 * Inquiry table schema
 */
export interface InquiriesTable {
  id: Generated<number>;
  email: string;
  message: string;
  submitted_at: Generated<string>; // ISO 8601, auto-generated
  source_page: string;
  status: 'new' | 'contacted' | 'archived';
  contacted_at: string | null;
  notes: string | null;
}

// Kysely helper types for different operations
export type Inquiry = Selectable<InquiriesTable>;
export type NewInquiry = Insertable<InquiriesTable>;
export type InquiryUpdate = Updateable<InquiriesTable>;

/**
 * Static content type for service offerings (not stored in DB)
 */
export interface ConsultingService {
  id: string;
  title: string;
  description: string;
  outcomes: string[];
}
```

## Database Factory

```typescript
// lib/db.ts
import { Kysely } from 'kysely';
import { D1Dialect } from 'kysely-d1';
import type { Database } from '../types/database';

/**
 * Create a Kysely instance from a D1 binding
 */
export function createDb(d1: D1Database): Kysely<Database> {
  return new Kysely<Database>({
    dialect: new D1Dialect({ database: d1 }),
  });
}
```

## Query Patterns (Kysely)

All queries use Kysely's type-safe query builder. Assume `db` is created via `createDb(context.env.DB)`.

### Insert New Inquiry

```typescript
await db
  .insertInto('inquiries')
  .values({
    email,
    message,
    source_page: '/expert-help',
  })
  .execute();
```

### List Inquiries by Status

```typescript
const inquiries = await db
  .selectFrom('inquiries')
  .selectAll()
  .where('status', '=', 'new')
  .orderBy('submitted_at', 'desc')
  .execute();
```

### Get Inquiry by ID

```typescript
const inquiry = await db
  .selectFrom('inquiries')
  .selectAll()
  .where('id', '=', id)
  .executeTakeFirst();
```

### Mark as Contacted

```typescript
import { sql } from 'kysely';

await db
  .updateTable('inquiries')
  .set({
    status: 'contacted',
    contacted_at: sql`datetime('now')`,
  })
  .where('id', '=', id)
  .execute();
```

### Archive Inquiry

```typescript
import { sql } from 'kysely';

await db
  .updateTable('inquiries')
  .set({
    status: 'archived',
    notes,
  })
  .where('id', '=', id)
  .execute();
```

### Count by Status

```typescript
const counts = await db
  .selectFrom('inquiries')
  .select(['status', db.fn.count<number>('id').as('count')])
  .groupBy('status')
  .execute();
```

## Relationships

This feature has no entity relationships. The `Inquiry` table is standalone.

Future considerations:
- If email notifications are added, may track `notification_sent_at`
- If multiple contact forms exist, `source_page` enables analytics

## Data Retention

Per GDPR/privacy best practices:
- Inquiries should be reviewed and archived within 90 days
- Archived inquiries may be purged after 1 year
- Implementation of retention policy is out of scope for this feature
