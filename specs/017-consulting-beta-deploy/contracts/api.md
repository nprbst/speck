# API Contracts: Consulting Page & Beta Deployment

**Feature**: 017-consulting-beta-deploy
**Date**: 2025-11-30
**Protocol**: HTTP REST
**Base Path**: `/api`

## Endpoints Overview

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/inquiry` | Submit new inquiry | Turnstile token |

## POST /api/inquiry

Submit an interest inquiry from the help page form.

### Request

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "email": "user@example.com",
  "message": "Interested in implementing Speck for our team...",
  "turnstile_token": "0.xxxx..."
}
```

**Fields:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `email` | string | Yes | Valid email format | Submitter's email address |
| `message` | string | Yes | 1-2000 characters | Inquiry message |
| `turnstile_token` | string | Yes | Cloudflare Turnstile token | Bot verification token |

### Responses

#### 201 Created - Success

```json
{
  "success": true,
  "message": "Thank you for your inquiry. We'll respond when schedule permits."
}
```

#### 400 Bad Request - Validation Error

```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    "Valid email address is required",
    "Message must be between 1 and 2000 characters"
  ]
}
```

#### 403 Forbidden - Bot Detection Failed

```json
{
  "success": false,
  "error": "Verification failed. Please try again."
}
```

#### 500 Internal Server Error - Storage Failure

```json
{
  "success": false,
  "error": "Unable to process your inquiry. Please try again later."
}
```

### Implementation Notes

1. **Honeypot Check**: Before Turnstile verification, check if honeypot field is filled
2. **Turnstile Verification**: POST to `https://challenges.cloudflare.com/turnstile/v0/siteverify`
3. **Rate Limiting**: Cloudflare's built-in rate limiting recommended
4. **CORS**: Allow only same-origin requests

### Sequence Diagram

```
┌──────────┐     ┌───────────┐     ┌──────────┐     ┌────────┐
│  Client  │     │ Turnstile │     │ Function │     │   D1   │
└────┬─────┘     └─────┬─────┘     └────┬─────┘     └───┬────┘
     │                 │                │               │
     │  Load widget    │                │               │
     │────────────────>│                │               │
     │                 │                │               │
     │  Token          │                │               │
     │<────────────────│                │               │
     │                 │                │               │
     │  POST /api/inquiry (with token)  │               │
     │─────────────────────────────────>│               │
     │                 │                │               │
     │                 │  Verify token  │               │
     │                 │<───────────────│               │
     │                 │                │               │
     │                 │  Success       │               │
     │                 │───────────────>│               │
     │                 │                │               │
     │                 │                │  INSERT       │
     │                 │                │──────────────>│
     │                 │                │               │
     │                 │                │  OK           │
     │                 │                │<──────────────│
     │                 │                │               │
     │  201 Created                     │               │
     │<─────────────────────────────────│               │
```

---

## Admin CLI Contracts

The `/speck.inquiries` slash command interacts with D1 via Wrangler CLI.

### List Inquiries

```bash
# Via Wrangler D1 remote execution
wrangler d1 execute speck-inquiries --remote --command "SELECT * FROM inquiries WHERE status = 'new' ORDER BY submitted_at DESC"
```

### View Inquiry Details

```bash
wrangler d1 execute speck-inquiries --remote --command "SELECT * FROM inquiries WHERE id = 123"
```

### Mark as Contacted

```bash
wrangler d1 execute speck-inquiries --remote --command "UPDATE inquiries SET status = 'contacted', contacted_at = datetime('now') WHERE id = 123"
```

### Archive Inquiry

```bash
wrangler d1 execute speck-inquiries --remote --command "UPDATE inquiries SET status = 'archived', notes = 'Reason here' WHERE id = 123"
```

---

## Error Codes

| Code | Meaning | Client Action |
|------|---------|---------------|
| 201 | Inquiry saved | Show success message |
| 400 | Invalid input | Highlight validation errors |
| 403 | Bot verification failed | Ask user to retry |
| 500 | Server error | Show generic error, suggest retry |

## Rate Limits

Cloudflare's default rate limiting applies. For additional protection:
- Consider 10 requests per IP per minute
- Turnstile already prevents automated abuse
