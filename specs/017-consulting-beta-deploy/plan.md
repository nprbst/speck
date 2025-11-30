# Implementation Plan: Consulting Page & Beta Deployment

**Branch**: `017-consulting-beta-deploy` | **Date**: 2025-11-30 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/017-consulting-beta-deploy/spec.md`

## Summary

This feature adds a help page at `/expert-help` where visitors can learn about implementation assistance and submit interest inquiries. Inquiries are stored in Cloudflare D1 (via Kysely query builder) and managed via a private Claude Code slash command (`/speck.inquiries`). The website will be deployed to `beta.speck.codes` on Cloudflare Pages, with `speck.codes` redirecting to beta until GA.

## Technical Context

**Language/Version**: TypeScript 5.7+ with Bun 1.0+ runtime, Astro 5.15+
**Primary Dependencies**: Astro (SSG), Cloudflare Pages (hosting), Cloudflare D1 (database), Kysely + kysely-d1 (type-safe query builder), Cloudflare Turnstile (spam prevention), Wrangler CLI, Resend (email API), marked (markdown to HTML)
**Storage**: Cloudflare D1 (SQLite-based, serverless) via Kysely query builder
**Testing**: Playwright (visual regression), Axe-core (accessibility), Bun test (unit)
**Target Platform**: Web (Cloudflare Pages)
**Project Type**: Web application (static site + serverless functions)
**Performance Goals**: <2 second page load, <500ms form validation feedback, <5 minute deployment
**Constraints**: Form submission requires Cloudflare Functions, D1 requires Wrangler configuration
**Scale/Scope**: Single page addition, one D1 table, one slash command, one redirect rule

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| III. Specification-First | ✅ PASS | Spec is technology-agnostic, requirements testable |
| V. Claude Code Native | ⚠️ ACTION | Must create `/speck.inquiries` slash command |
| VII. File Format Compatibility | ✅ PASS | Standard specs/ structure maintained |
| VIII. Command-Implementation Separation | ⚠️ ACTION | Slash command must delegate to TypeScript script |
| IX. Preflight Gate | ⚠️ ACTION | Must run `bun preflight` before completion |
| X. Website Documentation Sync | ✅ N/A | This IS a website feature (no separate docs needed) |
| XI. Test-Driven Development | ⚠️ ACTION | Must write tests before implementation |
| XII. Documentation Skill Sync | ⚠️ ACTION | Update speck-help skill with `/speck.inquiries` command |

**Gate Status**: PASS - No blocking violations. Action items to be addressed during implementation.

## Project Structure

### Documentation (this feature)

```text
specs/017-consulting-beta-deploy/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (API contracts)
└── tasks.md             # Phase 2 output (/speck.tasks)
```

### Source Code (repository root)

```text
website/
├── src/
│   ├── components/
│   │   └── InquiryForm.astro      # New: Contact form component
│   ├── pages/
│   │   └── expert-help.astro      # New: Help/consulting page
│   ├── lib/
│   │   └── db.ts                  # New: Kysely database factory
│   ├── types/
│   │   └── database.ts            # New: Kysely type definitions
│   └── styles/
│       └── form.css               # New: Form-specific styles
├── functions/
│   └── api/
│       └── inquiry.ts             # New: D1 inquiry submission endpoint
├── migrations/
│   ├── 001_create_inquiries.sql   # New: D1 schema migration
│   └── 002_create_responses.sql   # New: Email responses table
└── wrangler.toml                  # New: Cloudflare configuration

.claude/
├── commands/
│   └── speck.inquiries.md         # New: Inquiry management command
└── scripts/
    └── inquiries/
        ├── manage.ts              # New: Inquiry management implementation
        ├── email.ts               # New: Resend email integration
        └── templates.ts           # New: Email HTML templates

tests/
├── e2e/
│   └── expert-help.spec.ts        # New: E2E tests for help page
└── unit/
    └── inquiry-form.test.ts       # New: Form validation unit tests
```

**Structure Decision**: Web application pattern with Astro static pages + Cloudflare Functions for form submission. Uses Kysely query builder for type-safe D1 interactions. Slash command follows Constitution Principle VIII with command file delegating to TypeScript script.

## Documentation Impact

**Website**: This feature IS a website update - the help page itself is the deliverable.

**Skill Update Required**: The `speck-help` skill must be updated to include:
- `/speck.inquiries` command documentation and usage
- Inquiry management workflow guidance

## Testing Strategy (TDD)

Per Constitution Principle XI, tests must be written before implementation.

**Coverage Targets**:
- Unit tests: Form validation logic (100% coverage)
- Integration tests: D1 database operations
- E2E tests: Full form submission flow
- Accessibility: 90+ Lighthouse score (SC-007)

**Test-First Task Ordering**:
1. Write form validation unit tests → Implement validation
2. Write D1 schema tests → Create database schema
3. Write API endpoint tests → Implement endpoint
4. Write E2E submission tests → Implement form component
5. Write accessibility tests → Verify compliance

## Complexity Tracking

No Constitution violations requiring justification. Feature uses standard patterns within existing architecture.

## Phased Delivery

### Phase 1: Page & Form (US1, US2) - P1
- Help page at `/expert-help` with service descriptions
- Inquiry form with email + message fields
- Client-side validation
- Cloudflare D1 storage via Kysely query builder
- Success confirmation display

### Phase 2: Admin & Deployment (US3, US4, US5) - P2
- `/speck.inquiries` slash command
- Beta deployment to `beta.speck.codes`
- Cloudflare Pages preview environment
- Production redirect: `speck.codes` → `beta.speck.codes` (until GA)

### Phase 2.5: Email Response Workflow (US5) - P2
- `respond` action to fetch inquiry for Claude drafting
- `send` action with Resend API integration
- Markdown to HTML conversion via `marked`
- `responses` table for email audit trail
- Environment variable: `RESEND_API_KEY`

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| D1 cold start latency | Medium | Low | Acceptable for inquiry submissions |
| Cloudflare Turnstile blocks legitimate users | Low | Medium | Use invisible mode, monitor false positives |
| Beta deployment conflicts with production | Low | Low | Separate Cloudflare Pages project |

## Dependencies

- Cloudflare account with D1 and Pages access (assumed available per spec)
- `speck.codes` domain DNS configured for beta subdomain
- Wrangler CLI for local D1 development

## Next Steps

1. Generate `research.md` with Cloudflare D1/Turnstile best practices
2. Generate `data-model.md` with Inquiry entity schema
3. Generate `contracts/` with API endpoint specifications
4. Generate `quickstart.md` with developer setup instructions
5. Run `/speck.tasks` to generate implementation tasks
