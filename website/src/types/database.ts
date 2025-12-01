import type { Generated, Insertable, Selectable, Updateable } from 'kysely';

/**
 * Database schema for Kysely with D1 backend
 */
export interface Database {
  inquiries: InquiriesTable;
  responses: ResponsesTable;
}

/**
 * Inquiry table schema
 * Represents an interest inquiry submission from a visitor
 */
export interface InquiriesTable {
  /** Unique identifier (auto-generated) */
  id: Generated<number>;
  /** Visitor's email address */
  email: string;
  /** Inquiry message (max 2000 chars) */
  message: string;
  /** ISO 8601 timestamp of submission (auto-generated) */
  submitted_at: Generated<string>;
  /** URL path where form was submitted */
  source_page: string;
  /** Inquiry lifecycle status */
  status: 'new' | 'contacted' | 'archived';
  /** Timestamp when marked as contacted (nullable) */
  contacted_at: string | null;
  /** Admin notes for follow-up tracking (nullable) */
  notes: string | null;
}

/** Full inquiry record as returned from SELECT queries */
export type Inquiry = Selectable<InquiriesTable>;

/** Data required to create a new inquiry */
export type NewInquiry = Insertable<InquiriesTable>;

/** Data that can be updated on an existing inquiry */
export type InquiryUpdate = Updateable<InquiriesTable>;

/**
 * Response table schema
 * Stores sent email responses for audit trail
 */
export interface ResponsesTable {
  /** Unique identifier (auto-generated) */
  id: Generated<number>;
  /** Foreign key to inquiries table */
  inquiry_id: number;
  /** Email subject line */
  subject: string;
  /** Original markdown content */
  body_markdown: string;
  /** Rendered HTML content */
  body_html: string;
  /** ISO 8601 timestamp when sent (auto-generated) */
  sent_at: Generated<string>;
  /** Identifier of who sent the response */
  sent_by: Generated<string>;
}

/** Full response record as returned from SELECT queries */
export type Response = Selectable<ResponsesTable>;

/** Data required to create a new response */
export type NewResponse = Insertable<ResponsesTable>;

/**
 * Static content type for service offerings (not stored in DB)
 * Used for displaying services on the help page
 */
export interface ConsultingService {
  id: string;
  title: string;
  description: string;
  outcomes: string[];
}
