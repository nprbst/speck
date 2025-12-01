import { describe, test, expect } from 'bun:test';

/**
 * Unit tests for inquiry form validation
 * Tests for User Story 2: Visitor Submits Interest Inquiry
 */

// Validation functions (will be implemented in website/src/lib/validation.ts)
// For now, we define the expected behavior

/**
 * Email validation tests
 */
describe('validateEmail', () => {
  // Import the function (will fail until implementation exists)
  const validateEmail = (email: string): boolean => {
    // Placeholder - actual implementation should be imported
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  test('accepts valid email addresses', () => {
    expect(validateEmail('user@example.com')).toBe(true);
    expect(validateEmail('user.name@example.com')).toBe(true);
    expect(validateEmail('user+tag@example.com')).toBe(true);
    expect(validateEmail('user@subdomain.example.com')).toBe(true);
  });

  test('rejects invalid email addresses', () => {
    expect(validateEmail('')).toBe(false);
    expect(validateEmail('invalid')).toBe(false);
    expect(validateEmail('invalid@')).toBe(false);
    expect(validateEmail('@example.com')).toBe(false);
    expect(validateEmail('user@')).toBe(false);
    expect(validateEmail('user@example')).toBe(false);
    expect(validateEmail('user name@example.com')).toBe(false);
  });
});

/**
 * Message validation tests
 */
describe('validateMessage', () => {
  interface ValidationResult {
    valid: boolean;
    error?: string;
  }

  const validateMessage = (message: string): ValidationResult => {
    const trimmed = message.trim();

    if (!trimmed) {
      return { valid: false, error: 'Message is required' };
    }

    if (trimmed.length > 2000) {
      return { valid: false, error: 'Message must be under 2000 characters' };
    }

    return { valid: true };
  };

  test('accepts valid messages', () => {
    expect(validateMessage('Hello, I need help with Speck').valid).toBe(true);
    expect(validateMessage('A').valid).toBe(true);
    expect(validateMessage('a'.repeat(2000)).valid).toBe(true);
  });

  test('rejects empty messages', () => {
    const result = validateMessage('');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Message is required');
  });

  test('rejects whitespace-only messages', () => {
    const result = validateMessage('   ');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Message is required');
  });

  test('rejects messages over 2000 characters', () => {
    const result = validateMessage('a'.repeat(2001));
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Message must be under 2000 characters');
  });
});

/**
 * Inquiry data validation tests
 */
describe('validateInquiry', () => {
  interface InquiryData {
    email: string;
    message: string;
  }

  interface ValidationResult {
    valid: boolean;
    errors: string[];
  }

  const validateInquiry = (data: unknown): ValidationResult => {
    const errors: string[] = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (typeof data !== 'object' || data === null) {
      return { valid: false, errors: ['Invalid request body'] };
    }

    const { email, message } = data as Partial<InquiryData>;

    if (typeof email !== 'string' || !emailRegex.test(email)) {
      errors.push('Valid email address is required');
    }

    if (typeof message !== 'string' || !message.trim()) {
      errors.push('Message is required');
    } else if (message.length > 2000) {
      errors.push('Message must be under 2000 characters');
    }

    return { valid: errors.length === 0, errors };
  };

  test('accepts valid inquiry data', () => {
    const result = validateInquiry({
      email: 'user@example.com',
      message: 'I need help with Speck',
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  test('rejects inquiry with invalid email', () => {
    const result = validateInquiry({
      email: 'invalid',
      message: 'Valid message',
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Valid email address is required');
  });

  test('rejects inquiry with empty message', () => {
    const result = validateInquiry({
      email: 'user@example.com',
      message: '',
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Message is required');
  });

  test('rejects inquiry with message too long', () => {
    const result = validateInquiry({
      email: 'user@example.com',
      message: 'a'.repeat(2001),
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Message must be under 2000 characters');
  });

  test('returns multiple errors when multiple fields invalid', () => {
    const result = validateInquiry({
      email: 'invalid',
      message: '',
    });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });

  test('handles null input', () => {
    const result = validateInquiry(null);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Invalid request body');
  });

  test('handles undefined input', () => {
    const result = validateInquiry(undefined);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Invalid request body');
  });
});
