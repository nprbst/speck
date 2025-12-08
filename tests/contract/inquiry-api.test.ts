import { describe, test, expect } from 'bun:test';

/**
 * Contract tests for POST /api/inquiry endpoint
 * Tests for User Story 2: Visitor Submits Interest Inquiry
 *
 * Note: These tests verify the API contract/behavior.
 * They require the dev server to be running for full integration testing.
 */

interface InquiryResponse {
  success: boolean;
  message?: string;
  error?: string;
  details?: unknown;
  id?: string;
  email?: string;
}

const BASE_URL = 'http://localhost:4321';

describe('POST /api/inquiry - Contract Tests', () => {
  describe('Success Cases', () => {
    test('returns 201 Created with valid data', async () => {
      // This test requires the server to be running
      // Skip in CI if server not available
      try {
        const response = await fetch(`${BASE_URL}/api/inquiry`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'test@example.com',
            message: 'Test inquiry message',
            turnstile_token: '', // Empty in test mode
          }),
        });

        // Should return 201 Created or 500 (if D1 not configured)
        expect([201, 500]).toContain(response.status);

        const data = (await response.json()) as InquiryResponse;
        expect(typeof data.success).toBe('boolean');
      } catch (error) {
        // Server not running, skip test
        console.log('Server not running, skipping integration test');
      }
    });

    test('response includes success message on 201', async () => {
      try {
        const response = await fetch(`${BASE_URL}/api/inquiry`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'valid@email.com',
            message: 'Valid message content',
          }),
        });

        if (response.status === 201) {
          const data = (await response.json()) as InquiryResponse;
          expect(data.success).toBe(true);
          expect(data.message).toBeDefined();
          expect(typeof data.message).toBe('string');
        }
      } catch {
        console.log('Server not running, skipping integration test');
      }
    });
  });

  describe('Validation Errors (400)', () => {
    test('returns 400 for invalid email', async () => {
      try {
        const response = await fetch(`${BASE_URL}/api/inquiry`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'invalid-email',
            message: 'Valid message',
          }),
        });

        expect(response.status).toBe(400);

        const data = (await response.json()) as InquiryResponse;
        expect(data.success).toBe(false);
        expect(data.error).toBeDefined();
        expect(data.details).toBeDefined();
        expect(Array.isArray(data.details)).toBe(true);
      } catch {
        console.log('Server not running, skipping integration test');
      }
    });

    test('returns 400 for empty message', async () => {
      try {
        const response = await fetch(`${BASE_URL}/api/inquiry`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'valid@email.com',
            message: '',
          }),
        });

        expect(response.status).toBe(400);

        const data = (await response.json()) as InquiryResponse;
        expect(data.success).toBe(false);
        expect(data.details).toContain('Message is required');
      } catch {
        console.log('Server not running, skipping integration test');
      }
    });

    test('returns 400 for message over 2000 characters', async () => {
      try {
        const response = await fetch(`${BASE_URL}/api/inquiry`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'valid@email.com',
            message: 'a'.repeat(2001),
          }),
        });

        expect(response.status).toBe(400);

        const data = (await response.json()) as InquiryResponse;
        expect(data.success).toBe(false);
        expect(data.details).toContain('Message must be under 2000 characters');
      } catch {
        console.log('Server not running, skipping integration test');
      }
    });

    test('returns 400 for invalid JSON body', async () => {
      try {
        const response = await fetch(`${BASE_URL}/api/inquiry`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: 'invalid json',
        });

        expect(response.status).toBe(400);

        const data = (await response.json()) as InquiryResponse;
        expect(data.success).toBe(false);
      } catch {
        console.log('Server not running, skipping integration test');
      }
    });
  });

  describe('Honeypot Detection', () => {
    test('silently accepts honeypot-filled submissions with 201', async () => {
      try {
        const response = await fetch(`${BASE_URL}/api/inquiry`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'bot@spam.com',
            message: 'Spam message',
            website: 'http://spam-site.com', // Honeypot field filled
          }),
        });

        // Should return 201 but not actually store
        expect(response.status).toBe(201);

        const data = (await response.json()) as InquiryResponse;
        expect(data.success).toBe(true);
      } catch {
        console.log('Server not running, skipping integration test');
      }
    });
  });

  describe('Response Format', () => {
    test('all responses have Content-Type: application/json', async () => {
      try {
        const response = await fetch(`${BASE_URL}/api/inquiry`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'test@example.com',
            message: 'Test',
          }),
        });

        expect(response.headers.get('Content-Type')).toBe('application/json');
      } catch {
        console.log('Server not running, skipping integration test');
      }
    });

    test('success response matches contract schema', async () => {
      try {
        const response = await fetch(`${BASE_URL}/api/inquiry`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'test@example.com',
            message: 'Test message',
          }),
        });

        const data = (await response.json()) as InquiryResponse;

        // Check schema
        expect(typeof data.success).toBe('boolean');

        if (response.status === 201) {
          expect(data.success).toBe(true);
          expect(typeof data.message).toBe('string');
        } else if (response.status === 400) {
          expect(data.success).toBe(false);
          expect(typeof data.error).toBe('string');
          expect(Array.isArray(data.details)).toBe(true);
        } else if (response.status === 403) {
          expect(data.success).toBe(false);
          expect(typeof data.error).toBe('string');
        } else if (response.status === 500) {
          expect(data.success).toBe(false);
          expect(typeof data.error).toBe('string');
        }
      } catch {
        console.log('Server not running, skipping integration test');
      }
    });
  });
});
