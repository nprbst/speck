-- Migration: 002_create_responses
-- Description: Create responses table for storing sent email responses
-- Created: 2025-11-30

CREATE TABLE IF NOT EXISTS responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  inquiry_id INTEGER NOT NULL REFERENCES inquiries(id),
  subject TEXT NOT NULL,
  body_markdown TEXT NOT NULL,
  body_html TEXT NOT NULL,
  sent_at TEXT DEFAULT (datetime('now')),
  sent_by TEXT DEFAULT 'admin'
);

-- Index for fast lookup by inquiry
CREATE INDEX IF NOT EXISTS idx_responses_inquiry_id ON responses(inquiry_id);

-- Index for chronological listing
CREATE INDEX IF NOT EXISTS idx_responses_sent_at ON responses(sent_at DESC);
