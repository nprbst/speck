/**
 * Email Client Module
 * Provides Resend API integration for sending email responses
 */
import { Resend } from 'resend';

/**
 * Email send options
 */
export interface SendEmailOptions {
  /** Recipient email address */
  to: string;
  /** Email subject line */
  subject: string;
  /** HTML content of the email */
  html: string;
  /** Plain text fallback (optional) */
  text?: string;
  /** Reply-to address (optional) */
  replyTo?: string;
}

/**
 * Email send result
 */
export interface SendEmailResult {
  success: boolean;
  /** Resend message ID if successful */
  messageId?: string;
  /** Error message if failed */
  error?: string;
}

/**
 * Configuration for the email client
 */
export interface EmailClientConfig {
  /** Resend API key */
  apiKey: string;
  /** From email address (must be verified in Resend) */
  fromEmail: string;
  /** From name (displayed in email clients) */
  fromName: string;
}

/**
 * Default email configuration
 */
const DEFAULT_CONFIG: Omit<EmailClientConfig, 'apiKey'> = {
  fromEmail: 'hello@speck.codes',
  fromName: 'Speck',
};

/**
 * Get the Resend API key from environment
 */
function getApiKey(): string {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error(
      'RESEND_API_KEY environment variable is not set. ' +
        'Set it in your shell or add it to a .env file.'
    );
  }
  return apiKey;
}

/**
 * Create a configured Resend client
 */
function createClient(config?: Partial<EmailClientConfig>): Resend {
  const apiKey = config?.apiKey || getApiKey();
  return new Resend(apiKey);
}

/**
 * Send an email using Resend
 *
 * @param options - Email options (to, subject, html, etc.)
 * @param config - Optional client configuration overrides
 * @returns Result with success status and message ID or error
 */
export async function sendEmail(
  options: SendEmailOptions,
  config?: Partial<EmailClientConfig>
): Promise<SendEmailResult> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  try {
    const client = createClient(config);

    const response = await client.emails.send({
      from: `${mergedConfig.fromName} <${mergedConfig.fromEmail}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo,
    });

    if (response.error) {
      return {
        success: false,
        error: response.error.message || 'Unknown error from Resend',
      };
    }

    return {
      success: true,
      messageId: response.data?.id,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Validate that the email client is properly configured
 *
 * @returns true if configured, throws if not
 */
export function validateEmailConfig(): boolean {
  getApiKey(); // Will throw if not set
  return true;
}

/**
 * Check if email is configured (without throwing)
 *
 * @returns true if RESEND_API_KEY is set
 */
export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}