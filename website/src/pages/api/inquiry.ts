/**
 * POST /api/inquiry
 * Submit a new inquiry from the expert help form
 *
 * This is an Astro API route with SSR enabled for Cloudflare Pages
 */

import type { APIRoute } from 'astro';
import { createDb } from '../../lib/db';
import { validateInquiry } from '../../lib/validation';
import { verifyTurnstile } from '../../lib/turnstile';

// Disable prerendering for this API endpoint
export const prerender = false;

interface InquiryRequest {
  email: string;
  message: string;
  turnstile_token?: string;
  website?: string; // Honeypot field
}

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Parse request body
    let data: InquiryRequest;
    try {
      data = await request.json();
    } catch {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid request body',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Check honeypot field - if filled, it's a bot
    if (data.website) {
      // Silently accept but don't store (bot trap)
      return new Response(
        JSON.stringify({
          success: true,
          message: "Thank you for your inquiry. We'll respond when schedule permits.",
        }),
        {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate inquiry data
    const validation = validateInquiry(data);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Validation failed',
          details: validation.errors,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Verify Turnstile token
    // Get the secret from environment (Cloudflare runtime)
    const runtime = locals.runtime as { env?: { TURNSTILE_SECRET_KEY?: string; DB?: D1Database } } | undefined;
    const env = runtime?.env;
    const turnstileSecret = env?.TURNSTILE_SECRET_KEY || '';

    if (turnstileSecret && data.turnstile_token) {
      const clientIp = request.headers.get('CF-Connecting-IP') || undefined;
      const isValid = await verifyTurnstile(data.turnstile_token, turnstileSecret, clientIp);

      if (!isValid) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Verification failed. Please try again.',
          }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // Get D1 database binding
    const d1 = env?.DB;

    if (!d1) {
      console.error('D1 database not configured');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Unable to process your inquiry. Please try again later.',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Insert inquiry into database
    const db = createDb(d1);

    await db
      .insertInto('inquiries')
      .values({
        email: data.email.trim(),
        message: data.message.trim(),
        source_page: '/expert-help',
        status: 'new',
        contacted_at: null,
        notes: null,
      })
      .execute();

    return new Response(
      JSON.stringify({
        success: true,
        message: "Thank you for your inquiry. We'll respond when schedule permits.",
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error processing inquiry:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Unable to process your inquiry. Please try again later.',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
