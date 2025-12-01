/**
 * Validation functions for inquiry form
 * Used both client-side and server-side
 */

/**
 * Validate email format
 * Uses a simple regex that covers common valid email patterns
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export interface MessageValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate message content
 * - Must not be empty
 * - Must not exceed 2000 characters
 */
export function validateMessage(message: string): MessageValidationResult {
  const trimmed = message.trim();

  if (!trimmed) {
    return { valid: false, error: 'Message is required' };
  }

  if (trimmed.length > 2000) {
    return { valid: false, error: 'Message must be under 2000 characters' };
  }

  return { valid: true };
}

export interface InquiryData {
  email: string;
  message: string;
  turnstile_token?: string;
}

export interface InquiryValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate complete inquiry data (server-side validation)
 * Checks email format, message content, and required fields
 */
export function validateInquiry(data: unknown): InquiryValidationResult {
  const errors: string[] = [];

  if (typeof data !== 'object' || data === null) {
    return { valid: false, errors: ['Invalid request body'] };
  }

  const { email, message } = data as Partial<InquiryData>;

  // Validate email
  if (typeof email !== 'string' || !validateEmail(email)) {
    errors.push('Valid email address is required');
  }

  // Validate message
  if (typeof message !== 'string' || !message.trim()) {
    errors.push('Message is required');
  } else if (message.length > 2000) {
    errors.push('Message must be under 2000 characters');
  }

  return { valid: errors.length === 0, errors };
}
