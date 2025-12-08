# Delta: auth

## ADDED Requirements

### REQ-AUTH-001: User Login

Users SHALL be able to log in with email and password.

#### Scenario: Successful login

- **Given**: A registered user with valid credentials
- **When**: The user submits login form with correct email and password
- **Then**: The user SHALL be authenticated and redirected to dashboard

## MODIFIED Requirements

### REQ-USER-001: User Registration

**Before**: Users can register with email only
**After**: Users MUST register with email and verify their email address

## REMOVED Requirements

### REQ-GUEST-001: Guest Access

**Reason**: Guest access is being replaced with anonymous sessions
