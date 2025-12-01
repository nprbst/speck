-- Cloudflare D1 Migration: Create inquiries table
-- Run with: wrangler d1 migrations apply speck-inquiries --local
-- Run remote: wrangler d1 migrations apply speck-inquiries --remote

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
