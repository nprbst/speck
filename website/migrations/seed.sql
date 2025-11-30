-- Development seed data for testing
-- Run with: wrangler d1 execute speck-inquiries --local --file=./migrations/seed.sql

INSERT INTO inquiries (email, message, submitted_at, source_page, status) VALUES
  ('test@example.com', 'We are interested in adopting Speck for our team of 10 developers. Would love to learn more about implementation support options.', datetime('now', '-3 days'), '/expert-help', 'new'),
  ('demo@company.org', 'Would like to schedule a call to discuss implementation support. Our team is transitioning to AI-assisted development.', datetime('now', '-1 day'), '/expert-help', 'contacted'),
  ('old@legacy.com', 'This inquiry was handled and archived. No longer needs follow-up.', datetime('now', '-7 days'), '/expert-help', 'archived');
