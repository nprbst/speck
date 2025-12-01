import { test, expect } from '@playwright/test';

/**
 * E2E tests for /expert-help page
 * Tests for User Story 1: Visitor Explores Help Options
 */

test.describe('Expert Help Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/expert-help');
  });

  test('displays the page with correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/Expert Help|Speck/);
  });

  test('shows main heading describing consulting services', async ({ page }) => {
    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();
    await expect(heading).toContainText(/help|expert|consulting/i);
  });

  test('displays service descriptions', async ({ page }) => {
    // Should have at least 3 service types per spec
    const services = ['implementation', 'training', 'architecture'];

    for (const service of services) {
      const serviceContent = page.locator(`text=/${service}/i`);
      await expect(serviceContent.first()).toBeVisible();
    }
  });

  test('shows soft disclaimer about response times', async ({ page }) => {
    // FR-014: Must include soft disclaimer about "when schedule permits"
    const disclaimer = page.locator('text=/when schedule permits/i');
    await expect(disclaimer).toBeVisible();
  });

  test('positions author as community expert, not commercial service', async ({ page }) => {
    // Should emphasize passion project / community aspect
    const communityContent = page.locator('text=/passion|community|open source/i');
    await expect(communityContent.first()).toBeVisible();
  });

  test('includes inquiry form', async ({ page }) => {
    // Form should be present with email and message fields
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    const messageInput = page.locator('textarea, input[name="message"]');

    await expect(emailInput).toBeVisible();
    await expect(messageInput).toBeVisible();
  });

  test('has submit button for inquiry form', async ({ page }) => {
    const submitButton = page.getByRole('button', { name: /submit|send|contact/i });
    await expect(submitButton).toBeVisible();
  });
});

test.describe('Footer Navigation', () => {
  test('homepage footer has link to expert-help page', async ({ page }) => {
    await page.goto('/');

    const footer = page.locator('footer');
    const helpLink = footer.getByRole('link', { name: /expert help|help|consulting/i });

    await expect(helpLink).toBeVisible();
    await expect(helpLink).toHaveAttribute('href', '/expert-help');
  });

  test('clicking footer link navigates to expert-help page', async ({ page }) => {
    await page.goto('/');

    const footer = page.locator('footer');
    const helpLink = footer.getByRole('link', { name: /expert help|help|consulting/i });

    await helpLink.click();
    await expect(page).toHaveURL(/\/expert-help/);
  });
});

test.describe('Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('page renders correctly on mobile', async ({ page }) => {
    await page.goto('/expert-help');

    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();

    // Form should still be visible and usable
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    await expect(emailInput).toBeVisible();
  });
});
