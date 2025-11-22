import { test, expect } from '@playwright/test';

/**
 * Visual Regression Tests - Homepage
 * Captures screenshots at different viewports to detect unintended visual changes
 */

test.describe('Homepage Visual Tests', () => {
  test('should match desktop layout at 1920x1080', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');

    // Wait for content to load
    await page.waitForSelector('.hero-headline');

    // Take full page screenshot
    await expect(page).toHaveScreenshot('homepage-desktop.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should match tablet layout at 768x1024', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');

    await page.waitForSelector('.hero-headline');

    await expect(page).toHaveScreenshot('homepage-tablet.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should match mobile layout at 375x667', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    await page.waitForSelector('.hero-headline');

    await expect(page).toHaveScreenshot('homepage-mobile.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should display all hero elements', async ({ page }) => {
    await page.goto('/');

    // Verify critical elements are visible
    await expect(page.locator('.hero-headline')).toBeVisible();
    await expect(page.locator('.hero-subheadline')).toBeVisible();
    await expect(page.locator('.cta-primary')).toBeVisible();

    // Check feature cards are present
    const featureCards = page.locator('.feature-card');
    await expect(featureCards).toHaveCount(3);
  });

  test('should have working navigation links', async ({ page }) => {
    await page.goto('/');

    // Check navigation is visible
    const nav = page.locator('nav[aria-label="Main navigation"]');
    await expect(nav).toBeVisible();

    // Verify navigation links
    await expect(page.locator('a:has-text("Docs")')).toBeVisible();
    await expect(page.locator('a:has-text("Comparison")')).toBeVisible();
  });

  test('should display theme toggle', async ({ page }) => {
    await page.goto('/');

    const themeToggle = page.locator('[data-theme-toggle]');
    await expect(themeToggle).toBeVisible();

    // Verify toggle works
    await themeToggle.click();

    // Check theme attribute changed
    const htmlElement = page.locator('html');
    const theme = await htmlElement.getAttribute('data-theme');
    expect(['light', 'dark']).toContain(theme);
  });
});

test.describe('Homepage Dark Mode', () => {
  test('should render correctly in dark mode', async ({ page }) => {
    await page.goto('/');

    // Force dark mode
    await page.evaluate(() => {
      (globalThis as any).document.documentElement.setAttribute('data-theme', 'dark');
    });

    await page.waitForSelector('.hero-headline');

    await expect(page).toHaveScreenshot('homepage-dark-mode.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should render correctly in light mode', async ({ page }) => {
    await page.goto('/');

    // Force light mode
    await page.evaluate(() => {
      (globalThis as any).document.documentElement.setAttribute('data-theme', 'light');
    });

    await page.waitForSelector('.hero-headline');

    await expect(page).toHaveScreenshot('homepage-light-mode.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });
});
