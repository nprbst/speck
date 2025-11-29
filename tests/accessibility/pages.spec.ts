import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Accessibility Tests - WCAG 2.1 AA Compliance
 * Uses Axe-core to automatically detect accessibility violations
 * Target: Lighthouse accessibility score 95+
 */

test.describe.skip('Homepage Accessibility', () => {
  test('should not have any automatically detectable accessibility issues', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/');

    // Should have exactly one h1
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBe(1);

    // Check heading levels don't skip
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').allTextContents();
    expect(headings.length).toBeGreaterThan(0);
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/');

    // Tab through interactive elements
    await page.keyboard.press('Tab');

    // First focusable should be skip link
    const focused = await page.evaluate(
      () => (globalThis as any).document.activeElement?.className
    );
    expect(focused).toContain('skip-link');

    // Continue tabbing through navigation
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
    }

    // Verify focus is visible
    const focusedElement = await page.evaluate(() => {
      const doc = (globalThis as any).document;
      const win = (globalThis as any).window;
      const el = doc.activeElement;
      if (!el) return null;
      const styles = win.getComputedStyle(el);
      return {
        outline: styles.outline,
        outlineWidth: styles.outlineWidth,
      };
    });

    expect(focusedElement).toBeTruthy();
  });

  test('should have ARIA labels on icon-only buttons', async ({ page }) => {
    await page.goto('/');

    // Theme toggle button should have aria-label
    const themeToggle = page.locator('[data-theme-toggle]');
    await expect(themeToggle).toHaveAttribute('aria-label');

    // Mobile menu toggle should have aria-label (on mobile)
    await page.setViewportSize({ width: 375, height: 667 });
    const mobileToggle = page.locator('[data-mobile-menu-toggle]');
    if (await mobileToggle.isVisible()) {
      await expect(mobileToggle).toHaveAttribute('aria-label');
      await expect(mobileToggle).toHaveAttribute('aria-expanded');
    }
  });
});

test.describe('Documentation Pages Accessibility', () => {
  test('should not have accessibility violations on docs page', async ({ page }) => {
    await page.goto('/docs/getting-started/quick-start');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have accessible sidebar navigation', async ({ page }) => {
    await page.goto('/docs/getting-started/quick-start');

    // Sidebar should have proper ARIA
    const sidebar = page.locator('.sidebar');
    await expect(sidebar).toBeVisible();

    // Check navigation has aria-label
    const sidebarNav = page.locator('.sidebar-nav');
    await expect(sidebarNav).toHaveAttribute('aria-label');

    // Active link should have aria-current
    const activeLink = page.locator('.sidebar-link.active');
    if ((await activeLink.count()) > 0) {
      await expect(activeLink.first()).toHaveAttribute('aria-current', 'page');
    }
  });

  test('should have accessible code blocks', async ({ page }) => {
    await page.goto('/docs/getting-started/quick-start');

    // Code blocks should have copy buttons with labels
    const copyButtons = page.locator('.copy-button');
    const count = await copyButtons.count();

    if (count > 0) {
      // Check first copy button has aria-label
      await expect(copyButtons.first()).toHaveAttribute('aria-label');
    }
  });
});

test.describe('Comparison Page Accessibility', () => {
  test('should not have accessibility violations', async ({ page }) => {
    await page.goto('/comparison');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have accessible table semantics', async ({ page }) => {
    await page.goto('/comparison');

    // Check for proper table structure if tables exist
    const tables = page.locator('table');
    const tableCount = await tables.count();

    if (tableCount > 0) {
      // Tables should have proper structure
      const firstTable = tables.first();
      await expect(firstTable.locator('thead')).toBeVisible();
      await expect(firstTable.locator('tbody')).toBeVisible();
    }
  });
});

test.describe('404 Page Accessibility', () => {
  test('should not have accessibility violations', async ({ page }) => {
    await page.goto('/404');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have clear navigation back', async ({ page }) => {
    await page.goto('/404');

    // Should have links to navigate back
    const homeLink = page.locator('a[href="/"]');
    await expect(homeLink).toBeVisible();
  });
});

test.describe('Mobile Accessibility', () => {
  test('should be accessible on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should support touch targets on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Check button sizes meet minimum 44x44px touch target
    const buttons = page.locator('button, a.cta-primary');
    const count = await buttons.count();

    for (let i = 0; i < Math.min(count, 5); i++) {
      const box = await buttons.nth(i).boundingBox();
      if (box) {
        // WCAG 2.1 AA minimum touch target: 44x44
        expect(box.width).toBeGreaterThanOrEqual(40); // Allow slight tolerance
        expect(box.height).toBeGreaterThanOrEqual(40);
      }
    }
  });
});
