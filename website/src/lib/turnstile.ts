/**
 * Cloudflare Turnstile server-side verification
 * See: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */

export interface TurnstileVerifyResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  'error-codes'?: string[];
  action?: string;
  cdata?: string;
}

/**
 * Verify a Turnstile token server-side
 *
 * @param token - The response token from the Turnstile widget
 * @param secret - The Turnstile secret key
 * @param remoteip - Optional client IP address
 * @returns Promise<boolean> - True if verification succeeded
 */
export async function verifyTurnstile(
  token: string,
  secret: string,
  remoteip?: string
): Promise<boolean> {
  // Skip verification if no secret key is configured (development mode)
  if (!secret) {
    console.warn('Turnstile secret not configured, skipping verification');
    return true;
  }

  // Skip if token is empty/missing
  if (!token) {
    return false;
  }

  try {
    const formData = new URLSearchParams({
      secret,
      response: token,
    });

    if (remoteip) {
      formData.append('remoteip', remoteip);
    }

    const response = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      }
    );

    const result: TurnstileVerifyResponse = await response.json();
    return result.success === true;
  } catch (error) {
    console.error('Turnstile verification failed:', error);
    return false;
  }
}
