# Feature Specification: Consulting Page & Beta Deployment

**Feature Branch**: `017-consulting-beta-deploy`
**Created**: 2025-11-30
**Status**: Draft
**Input**: User description: "Add a consulting page offering to help with Speck implementations at organizations attempting to adopt Spec-Driven AI development practices. This should include a CTA where the user provides their email address and a brief message describing their needs/interest. This should get captured somewhere like Cloudflare D1 or Supabase. Also walk through the deployment process of the website to the beta.speck.codes domain on Cloudflare."

## Clarifications

### Session 2025-11-30

- Q: How should the consulting offering be framed/positioned? → A: Community expert—open to helping organizations adopt Speck when schedule permits; emphasizes passion project, not business
- Q: How prominent should the help page be in site navigation? → A: Footer only—discoverable but not prominent
- Q: Should the page include explicit availability/response-time messaging? → A: Soft disclaimer—brief note that responses come "when schedule permits"
- Q: What URL path should the page use? → A: /expert-help
- Q: Which data store should be used for lead storage? → A: Cloudflare D1 (SQLite-based, stays in Cloudflare ecosystem); plus a private slash-command/agent for querying and managing inquiries

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Visitor Explores Help Options (Priority: P1)

A visitor discovers Speck through organic search or GitHub and wants to understand if hands-on help is available for their organization adopting Spec-Driven AI development practices. They visit the help page to understand what assistance the project creator offers and whether to reach out.

**Why this priority**: The help page enables interested organizations to connect with the project creator for guidance, positioned as a passion-project community resource rather than a commercial consulting practice.

**Independent Test**: Can be fully tested by navigating to /consulting and verifying that service descriptions, benefits, and engagement approach are clearly presented.

**Acceptance Scenarios**:

1. **Given** a visitor is on the Speck website, **When** they navigate to the consulting page, **Then** they see a clear description of consulting services offered
2. **Given** a visitor is reading the consulting page, **When** they scroll through the content, **Then** they understand the types of engagements available (e.g., implementation support, training, architecture review)
3. **Given** a visitor is on the consulting page, **When** they look for contact options, **Then** they see a prominent call-to-action to submit an inquiry

---

### User Story 2 - Visitor Submits Interest Inquiry (Priority: P1)

A visitor has reviewed what help is available and wants to express interest. They fill out the contact form with their email and a brief message describing their needs, expecting acknowledgment of receipt.

**Why this priority**: Inquiry capture enables the connection between interested organizations and the project creator—without it, there is no path to provide assistance.

**Independent Test**: Can be fully tested by submitting the form with valid data and verifying the submission is stored and acknowledged.

**Acceptance Scenarios**:

1. **Given** a visitor is on the consulting page, **When** they fill out the inquiry form with email and message, **Then** the form validates input before submission
2. **Given** a visitor has completed the form, **When** they submit the inquiry, **Then** they see a confirmation message acknowledging receipt
3. **Given** a visitor submits an inquiry, **When** the form is submitted, **Then** the lead data (email, message, timestamp) is stored in the backend
4. **Given** a visitor submits an invalid email, **When** they try to submit, **Then** they see an error message indicating the issue

---

### User Story 3 - Admin Manages Inquiries via Slash Command (Priority: P2)

The Speck maintainer (Nathan) needs to review and respond to inquiries without leaving their development workflow. They run a private slash command in Claude Code to query D1 for new inquiries and take quick actions (mark as contacted, archive, etc.).

**Why this priority**: Inquiry management is essential for follow-up, but the capture must work first. A slash command keeps management in the existing workflow.

**Independent Test**: Can be fully tested by running the slash command with valid Cloudflare credentials and verifying inquiries are listed and actions execute correctly.

**Acceptance Scenarios**:

1. **Given** inquiries have been submitted, **When** the admin runs `/speck.inquiries`, **Then** new inquiries are listed with email, message preview, and submission date
2. **Given** multiple inquiries exist, **When** the admin views the list, **Then** they are sorted by submission date (newest first)
3. **Given** an inquiry is displayed, **When** the admin marks it as "contacted", **Then** its status is updated in D1
4. **Given** the admin wants to see inquiry details, **When** they select an inquiry, **Then** the full message and metadata are displayed

---

### User Story 4 - Website Deployed to Beta Environment (Priority: P2)

The Speck maintainer deploys the website to beta.speck.codes to test new features before production release. This enables preview of changes on a real domain.

**Why this priority**: Beta deployment enables safe testing before production, but the core consulting page and form must be built first.

**Independent Test**: Can be fully tested by deploying to Cloudflare Pages and verifying the site loads at beta.speck.codes.

**Acceptance Scenarios**:

1. **Given** the website is built successfully, **When** deployed to Cloudflare Pages, **Then** the site is accessible at beta.speck.codes
2. **Given** the beta environment is configured, **When** a push is made to the designated branch, **Then** the site automatically deploys to beta
3. **Given** the site is deployed to beta, **When** a visitor accesses beta.speck.codes, **Then** they see the same content as local development

---

### Edge Cases

- What happens when the form is submitted with an extremely long message? (Message should have reasonable character limit)
- How does the system handle duplicate submissions from the same email? (Allow duplicates—user may have new inquiries)
- What happens if the data store is unavailable? (Display friendly error, do not lose user's input)
- How does the site behave on beta vs production? (Same build, different domains, possibly different database)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display a dedicated help page at the `/expert-help` URL path
- **FR-002**: Consulting page MUST describe the types of consulting engagements offered
- **FR-003**: Consulting page MUST include a lead capture form with email address and message fields
- **FR-004**: Form MUST validate email format before allowing submission
- **FR-005**: Form MUST enforce a maximum message length of 2000 characters
- **FR-006**: System MUST display a confirmation message after successful form submission
- **FR-007**: System MUST store submitted leads with email, message, and timestamp
- **FR-008**: System MUST handle form submission errors gracefully with user-friendly messaging
- **FR-009**: Leads MUST be retrievable by the admin with all submitted data
- **FR-010**: Website MUST be deployable to beta.speck.codes on Cloudflare Pages
- **FR-011**: Beta deployment MUST be triggered by push to a designated branch (e.g., `beta` or `preview`)
- **FR-012**: Help page MUST be mobile-responsive and accessible
- **FR-013**: Form MUST include layered spam prevention: honeypot field (catches simple bots without external calls) and Cloudflare Turnstile (handles sophisticated bots, invisible to most users)
- **FR-014**: Page MUST include a soft disclaimer indicating responses come "when schedule permits" to set appropriate expectations
- **FR-015**: System MUST provide a private slash command (`/speck.inquiries`) for querying and managing inquiries via Claude Code
- **FR-016**: Slash command MUST connect to Cloudflare D1 using locally-configured credentials (e.g., environment variables or wrangler config)
- **FR-017**: Slash command MUST support actions: list new, view details, mark as contacted, archive
- **FR-018**: System MUST redirect `speck.codes` to `beta.speck.codes` until General Availability (302 temporary redirect)
- **FR-019**: Redirect MUST preserve URL path and query string (e.g., `speck.codes/docs` → `beta.speck.codes/docs`)

### Key Entities

- **Inquiry**: Represents an interest inquiry submission (formerly "Lead")
  - email (required, validated format)
  - message (required, max 2000 characters)
  - submitted_at (timestamp, auto-generated)
  - source_page (URL where form was submitted, for analytics)
  - status (enum: new, contacted, archived; default: new)

- **Consulting Service**: Represents a type of engagement offered
  - title (display name)
  - description (what the engagement includes)
  - example_outcomes (what clients can expect)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Visitors can access the help page via footer link from any page (1 click)
- **SC-002**: Visitors can complete and submit the inquiry form in under 2 minutes
- **SC-003**: 100% of valid form submissions are successfully stored and retrievable
- **SC-004**: Form validation provides immediate feedback on invalid input (under 500ms)
- **SC-005**: Beta site is accessible at beta.speck.codes with under 2-second load time
- **SC-006**: Deployments to beta complete within 5 minutes of push
- **SC-007**: Consulting page achieves 90+ Lighthouse accessibility score

## Assumptions

- The website will continue to use Astro as the static site generator
- Cloudflare Pages is the hosting platform for both beta and production
- The user (Nathan) has access to a Cloudflare account with the speck.codes domain configured
- Lead storage will use Cloudflare D1 (SQLite-based database in Cloudflare ecosystem)
- Email notifications for new leads are out of scope for this feature (can be added later)
- Production deployment to speck.codes/speck.dev is not included in this feature scope