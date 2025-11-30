# Tasks: Consulting Page & Beta Deployment

**Input**: Design documents from `/specs/017-consulting-beta-deploy/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: Included per Constitution Principle XI (TDD).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and Cloudflare configuration

- [x] T001 Install Astro Cloudflare adapter: `bun add @astrojs/cloudflare` in website/
- [x] T002 Install Kysely dependencies: `bun add kysely kysely-d1` in website/
- [x] T003 [P] Install Cloudflare Workers types: `bun add -d @cloudflare/workers-types` in website/
- [x] T004 [P] Create wrangler.toml with D1 binding placeholder in website/wrangler.toml
- [x] T005 Update astro.config.mjs with Cloudflare adapter (hybrid mode, platformProxy enabled) in website/astro.config.mjs
- [ ] T006 Create D1 database via Wrangler: `wrangler d1 create speck-inquiries` and update database_id in wrangler.toml

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema and type-safe query infrastructure

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T007 Create D1 migration file with inquiries table schema in website/migrations/001_create_inquiries.sql
- [x] T008 [P] Create Kysely type definitions with InquiriesTable interface in website/src/types/database.ts
- [x] T009 [P] Create Kysely database factory function in website/src/lib/db.ts
- [ ] T010 Run D1 migration locally: `wrangler d1 migrations apply speck-inquiries --local`
- [x] T011 [P] Create development seed data file in website/migrations/seed.sql
- [x] T012 [P] Create environment variable template files (.dev.vars, .env) in website/
- [ ] T013 Configure Turnstile site in Cloudflare Dashboard (localhost, beta.speck.codes, speck.codes)

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Visitor Explores Help Options (Priority: P1) MVP

**Goal**: Display help page at /expert-help with service descriptions, benefits, and community expert positioning

**Independent Test**: Navigate to /expert-help and verify service descriptions, benefits, and disclaimer are displayed

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T014 [P] [US1] E2E test for help page content and navigation in tests/e2e/expert-help.spec.ts
- [x] T015 [P] [US1] Accessibility test for help page (90+ Lighthouse) in tests/e2e/expert-help-a11y.spec.ts

### Implementation for User Story 1

- [x] T016 [P] [US1] Create form-specific styles (will be shared with US2) in website/src/styles/form.css
- [x] T017 [US1] Create expert-help page with service descriptions in website/src/pages/expert-help.astro
- [x] T018 [US1] Add static consulting service content (implementation-support, training, architecture-review) in website/src/pages/expert-help.astro
- [x] T019 [US1] Add soft disclaimer ("responses when schedule permits") per FR-014 in website/src/pages/expert-help.astro
- [x] T020 [US1] Add footer navigation link to /expert-help across all pages in website/src/components/ (footer component)
- [ ] T021 [US1] Verify mobile responsiveness and accessibility (FR-012, SC-007)

**Checkpoint**: Help page displays correctly with all service information

---

## Phase 4: User Story 2 - Visitor Submits Interest Inquiry (Priority: P1) MVP

**Goal**: Enable visitors to submit inquiry form with validation, spam prevention, and D1 storage

**Independent Test**: Submit form with valid data and verify confirmation message; submit invalid data and verify error feedback

### Tests for User Story 2

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T022 [P] [US2] Unit tests for form validation (email format, message length) in tests/unit/inquiry-form.test.ts
- [x] T023 [P] [US2] Contract test for POST /api/inquiry endpoint in tests/contract/inquiry-api.test.ts
- [x] T024 [P] [US2] E2E test for full form submission flow in tests/e2e/inquiry-submission.spec.ts

### Implementation for User Story 2

- [x] T025 [P] [US2] Create client-side validation functions (validateEmail, validateMessage) in website/src/lib/validation.ts
- [x] T026 [US2] Create InquiryForm component with email, message fields, and honeypot in website/src/components/InquiryForm.astro
- [x] T027 [US2] Add Turnstile widget (invisible mode) to InquiryForm in website/src/components/InquiryForm.astro
- [x] T028 [US2] Implement character counter (2000 max) per FR-005 in website/src/components/InquiryForm.astro
- [x] T029 [US2] Create Turnstile server verification function in website/src/lib/turnstile.ts
- [x] T030 [US2] Create server-side validation for inquiry data in website/src/pages/api/inquiry.ts
- [x] T031 [US2] Implement POST /api/inquiry endpoint with honeypot check, Turnstile verify, D1 insert in website/src/pages/api/inquiry.ts
- [x] T032 [US2] Add success/error response handling per contracts/api.md in website/src/pages/api/inquiry.ts
- [x] T033 [US2] Implement form submission feedback (success confirmation, error display) in website/src/components/InquiryForm.astro
- [x] T034 [US2] Integrate InquiryForm component into expert-help page in website/src/pages/expert-help.astro
- [ ] T035 [US2] Test form submission locally with wrangler pages dev

**Checkpoint**: Form submission works end-to-end with validation and D1 storage

---

## Phase 5: User Story 3 - Admin Manages Inquiries via Slash Command (Priority: P2)

**Goal**: Enable admin to query, view, and manage inquiries via /speck.inquiries Claude Code command

**Independent Test**: Run /speck.inquiries and verify inquiries are listed; mark an inquiry as contacted and verify status update

### Tests for User Story 3

- [ ] T036 [P] [US3] Unit tests for inquiry management script in tests/unit/inquiries-manage.test.ts

### Implementation for User Story 3

- [x] T037 [US3] Create inquiry management TypeScript script in .claude/scripts/inquiries/manage.ts
- [x] T038 [US3] Implement list action (filter by status, newest first) in .claude/scripts/inquiries/manage.ts
- [x] T039 [US3] Implement view action (full details by ID) in .claude/scripts/inquiries/manage.ts
- [x] T040 [US3] Implement mark-contacted action (update status, set contacted_at) in .claude/scripts/inquiries/manage.ts
- [x] T041 [US3] Implement archive action (update status, add notes) in .claude/scripts/inquiries/manage.ts
- [x] T042 [US3] Create /speck.inquiries slash command file in .claude/commands/speck.inquiries.md
- [x] T043 [US3] Document command usage and actions in .claude/commands/speck.inquiries.md
- [ ] T044 [US3] Test slash command against local D1 database

**Checkpoint**: Slash command successfully queries and modifies inquiry status in D1

---

## Phase 5.5: User Story 5 - Admin Responds to Inquiries via Email (Priority: P2)

**Goal**: Enable admin to respond to inquiries via email with Claude-drafted responses, Resend API, and audit trail

**Independent Test**: Run `/speck.inquiries respond <id>`, iterate on draft, send email, verify delivery and database storage

### Setup for User Story 5

- [x] T060 Install email dependencies: `bun add resend marked` in project root
- [x] T061 [P] Install marked types: `bun add -d @types/marked` in project root (not needed - marked has built-in types)
- [x] T062 Create D1 migration for responses table in website/migrations/002_create_responses.sql
- [x] T063 Run responses migration locally: `wrangler d1 migrations apply speck-inquiries --local`

### Tests for User Story 5

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T064 [P] [US5] Unit tests for email template rendering in tests/unit/email-templates.test.ts
- [x] T065 [P] [US5] Unit tests for markdown to HTML conversion in tests/unit/email-markdown.test.ts

### Implementation for User Story 5

- [x] T066 [US5] Create email HTML template function in .claude/scripts/inquiries/templates.ts
- [x] T067 [US5] Create Resend email client wrapper in .claude/scripts/inquiries/email.ts
- [x] T068 [US5] Implement `respond` action (fetch inquiry, format for Claude drafting) in .claude/scripts/inquiries/manage.ts
- [x] T069 [US5] Implement `send` action (markdown→HTML, Resend API, D1 insert, status update) in .claude/scripts/inquiries/manage.ts
- [x] T070 [US5] Update /speck.inquiries slash command with respond/send documentation in .claude/commands/speck.inquiries.md
- [x] T071 [US5] Test email workflow against local D1 database with test Resend API key

### Email Routing Setup for User Story 5

- [ ] T072 [US5] Configure Cloudflare Email Routing for speck.codes domain in Cloudflare dashboard
- [ ] T073 [US5] Create email routing rule: `inquiries@speck.codes` → admin Gmail (via dashboard, not code)
- [ ] T074 [US5] Add Resend domain verification in Resend dashboard
- [ ] T075 [US5] Add SPF record for Resend in Cloudflare DNS: `v=spf1 include:_spf.resend.com ~all`
- [ ] T076 [US5] Add DKIM records for Resend in Cloudflare DNS (3 CNAME records from Resend dashboard)
- [ ] T077 [US5] Verify email routing: send test email TO `inquiries@speck.codes`, confirm forwarding
- [ ] T078 [US5] Verify email sending: send test email FROM `inquiries@speck.codes` via Resend, check SPF/DKIM pass

**Checkpoint**: Email response workflow works end-to-end with Claude drafting and Resend delivery

---

## Phase 6: User Story 4 - Website Deployed to Beta Environment (Priority: P2)

**Goal**: Deploy website to beta.speck.codes with automatic deployments and production redirect

**Independent Test**: Push to beta branch and verify site loads at beta.speck.codes; visit speck.codes and verify redirect to beta

### Implementation for User Story 4

- [ ] T045 [US4] Create beta branch in repository
- [ ] T046 [US4] Deploy to beta branch via Cloudflare Pages (creates preview URL)
- [ ] T047 [US4] Run D1 migration on remote database: `wrangler d1 migrations apply speck-inquiries --remote`
- [ ] T048 [US4] Add custom domain beta.speck.codes in Cloudflare Pages dashboard
- [ ] T049 [US4] Configure DNS CNAME record: beta → speck-website.pages.dev (proxied)
- [ ] T050 [US4] Set environment variables in Cloudflare Pages (TURNSTILE_SECRET_KEY, PUBLIC_TURNSTILE_SITE_KEY)
- [ ] T051 [US4] Create redirect rule in Cloudflare Dashboard: speck.codes → beta.speck.codes (302, preserve path) per FR-018, FR-019
- [ ] T052 [US4] Verify beta.speck.codes loads correctly with <2 second load time (SC-005)
- [ ] T053 [US4] Verify speck.codes redirects to beta.speck.codes with path preserved
- [ ] T054 [US4] Test form submission on beta environment

**Checkpoint**: Beta deployment works with automatic deployments and production redirect active

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, accessibility, and skill updates

- [ ] T055 [P] Run Lighthouse accessibility audit and fix any issues below 90 score (SC-007)
- [ ] T056 [P] Update speck-help skill with /speck.inquiries command documentation per plan.md
- [ ] T057 [P] Run quickstart.md validation - verify all setup steps work
- [ ] T058 Verify all acceptance scenarios from spec.md pass
- [ ] T059 Run full test suite: `bun test`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Foundational (T007-T013)
- **US2 (Phase 4)**: Depends on Foundational; can run parallel with US1 until T034 (integration)
- **US3 (Phase 5)**: Depends on Foundational; can run parallel with US1/US2
- **US5 (Phase 5.5)**: Depends on US3 completion (extends inquiry management)
- **US4 (Phase 6)**: Depends on US1 + US2 completion (need deployable content)
- **Polish (Phase 7)**: Depends on all user stories complete

### User Story Dependencies

- **US1 (P1)**: Independent after Foundational
- **US2 (P1)**: Independent after Foundational; integrates with US1 page at T034
- **US3 (P2)**: Independent after Foundational; reads data created by US2
- **US5 (P2)**: Depends on US3; extends slash command with email capability
- **US4 (P2)**: Requires US1 + US2 for meaningful deployment

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Models/types before services
- Services before endpoints
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

**Setup Phase:**
```bash
Task: "Install Cloudflare Workers types" (T003)
Task: "Create wrangler.toml" (T004)
```

**Foundational Phase:**
```bash
Task: "Create Kysely type definitions" (T008)
Task: "Create Kysely database factory" (T009)
Task: "Create seed data file" (T011)
Task: "Create environment templates" (T012)
```

**US1 Tests:**
```bash
Task: "E2E test for help page" (T014)
Task: "Accessibility test for help page" (T015)
```

**US2 Tests:**
```bash
Task: "Unit tests for form validation" (T022)
Task: "Contract test for /api/inquiry" (T023)
Task: "E2E test for form submission" (T024)
```

**Cross-Story Parallel (after Foundational):**
- US1 implementation (T016-T021) can run parallel with US2 tests (T022-T024)
- US3 implementation (T036-T044) can run parallel with US1/US2

---

## Implementation Strategy

### MVP First (US1 + US2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: US1 - Help page displays
4. Complete Phase 4: US2 - Form submission works
5. **STOP and VALIDATE**: Test both stories independently
6. Deploy to local preview and verify

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. US1 (Help page) → Test independently → Preview
3. US2 (Form submission) → Test independently → Preview (MVP complete!)
4. US3 (Slash command) → Test independently → Admin ready
5. US4 (Beta deployment) → Test independently → Live at beta.speck.codes
6. Polish → Accessibility + documentation complete

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: US1 (help page)
   - Developer B: US2 (form submission) - tests first
   - Developer C: US3 (slash command) - tests first
3. Integration: US1 + US2 merge for MVP
4. All: US4 deployment together

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing (TDD per Constitution XI)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Total tasks: 78
