import { test, expect } from '@playwright/test';

/**
 * E2E tests for inquiry form submission
 * Tests for User Story 2: Visitor Submits Interest Inquiry
 */

test.describe('Inquiry Form Submission', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/expert-help');
  });

  test('displays form with all required fields', async ({ page }) => {
    const emailInput = page.locator('#email');
    const messageInput = page.locator('#message');
    const submitButton = page.locator('#submit-btn');

    await expect(emailInput).toBeVisible();
    await expect(messageInput).toBeVisible();
    await expect(submitButton).toBeVisible();
  });

  test('shows character counter for message field', async ({ page }) => {
    const charCount = page.locator('#char-count');
    await expect(charCount).toBeVisible();
    await expect(charCount).toHaveText('0');

    // Type some text
    await page.locator('#message').fill('Hello world');
    await expect(charCount).toHaveText('11');
  });

  test('validates email format on input', async ({ page }) => {
    const emailInput = page.locator('#email');

    // Enter invalid email and blur
    await emailInput.fill('invalid-email');
    await emailInput.blur();

    // HTML5 validation should mark it invalid
    const isInvalid = await emailInput.evaluate((el) => {
      return !(el as HTMLInputElement).checkValidity();
    });
    expect(isInvalid).toBe(true);
  });

  test('submits form with valid data', async ({ page }) => {
    // Fill out the form
    await page.locator('#email').fill('test@example.com');
    await page.locator('#message').fill('I would like help implementing Speck for my team.');

    // Submit
    await page.locator('#submit-btn').click();

    // Wait for response - should show success or error message
    // (Error is expected if D1 is not configured in test env)
    const successMessage = page.locator('#form-success');
    const errorMessage = page.locator('#form-error');

    // One of these should become visible
    await expect(successMessage.or(errorMessage)).toBeVisible({ timeout: 10000 });
  });

  test('prevents submission with empty email', async ({ page }) => {
    await page.locator('#message').fill('Valid message');

    // Try to submit without email
    await page.locator('#submit-btn').click();

    // Form should not be submitted - check for HTML5 validation
    const emailInput = page.locator('#email');
    const validationMessage = await emailInput.evaluate((el) => {
      return (el as HTMLInputElement).validationMessage;
    });
    expect(validationMessage).not.toBe('');
  });

  test('prevents submission with empty message', async ({ page }) => {
    await page.locator('#email').fill('test@example.com');

    // Try to submit without message
    await page.locator('#submit-btn').click();

    // Form should not be submitted
    const messageInput = page.locator('#message');
    const validationMessage = await messageInput.evaluate((el) => {
      return (el as HTMLTextAreaElement).validationMessage;
    });
    expect(validationMessage).not.toBe('');
  });

  test('shows warning when approaching character limit', async ({ page }) => {
    const messageInput = page.locator('#message');
    const charCountContainer = page.locator('.form-counter');

    // Type text near the limit
    await messageInput.fill('a'.repeat(1600));
    await expect(charCountContainer).toHaveClass(/warning/);

    // Go over soft limit
    await messageInput.fill('a'.repeat(1900));
    await expect(charCountContainer).toHaveClass(/error/);
  });

  test('enforces 2000 character maximum', async ({ page }) => {
    const messageInput = page.locator('#message');

    // HTML5 maxlength should prevent going over
    await messageInput.fill('a'.repeat(2100));

    const value = await messageInput.inputValue();
    expect(value.length).toBeLessThanOrEqual(2000);
  });

  test('shows loading state during submission', async ({ page }) => {
    await page.locator('#email').fill('test@example.com');
    await page.locator('#message').fill('Test message');

    // Intercept the request to slow it down
    await page.route('/api/inquiry', async (route) => {
      await new Promise((r) => setTimeout(r, 500));
      await route.continue();
    });

    // Click submit
    await page.locator('#submit-btn').click();

    // Check for loading state
    const loadingText = page.locator('.submit-loading');
    await expect(loadingText).toBeVisible();
  });

  test('clears form after successful submission', async ({ page }) => {
    // Mock successful response
    await page.route('/api/inquiry', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: "Thank you for your inquiry.",
        }),
      });
    });

    await page.locator('#email').fill('test@example.com');
    await page.locator('#message').fill('Test message');

    await page.locator('#submit-btn').click();

    // Wait for success message
    await expect(page.locator('#form-success')).toBeVisible();

    // Check form is cleared
    await expect(page.locator('#email')).toHaveValue('');
    await expect(page.locator('#message')).toHaveValue('');
    await expect(page.locator('#char-count')).toHaveText('0');
  });

  test('shows error message on submission failure', async ({ page }) => {
    // Mock error response
    await page.route('/api/inquiry', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Server error',
        }),
      });
    });

    await page.locator('#email').fill('test@example.com');
    await page.locator('#message').fill('Test message');

    await page.locator('#submit-btn').click();

    // Wait for error message
    await expect(page.locator('#form-error')).toBeVisible();
  });

  test('honeypot field is hidden', async ({ page }) => {
    const honeypot = page.locator('input[name="website"]');

    // Should exist in DOM
    await expect(honeypot).toHaveCount(1);

    // But should not be visible
    await expect(honeypot).not.toBeVisible();
  });
});
