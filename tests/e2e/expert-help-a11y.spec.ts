import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Accessibility tests for /expert-help page
 * Target: 90+ Lighthouse accessibility score (SC-007)
 */

test.describe('Expert Help Page Accessibility', () => {
  test('should not have any automatically detectable accessibility issues', async ({ page }) => {
    await page.goto('/expert-help');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    // Log violations for debugging
    if (accessibilityScanResults.violations.length > 0) {
      console.log(
        'Accessibility violations:',
        JSON.stringify(accessibilityScanResults.violations, null, 2)
      );
    }

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('page has proper heading structure', async ({ page }) => {
    await page.goto('/expert-help');

    // Should have exactly one h1
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBe(1);

    // Headings should be in logical order (no skipped levels)
    const headings = await page.evaluate(() => {
      const headingElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      return Array.from(headingElements).map((h) => parseInt(h.tagName[1]));
    });

    // Verify no heading levels are skipped
    for (let i = 1; i < headings.length; i++) {
      const diff = headings[i] - headings[i - 1];
      // Can only go up by 1 level, or down to any level
      expect(diff).toBeLessThanOrEqual(1);
    }
  });

  test('form has accessible labels', async ({ page }) => {
    await page.goto('/expert-help');

    // Email field should have a label
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    const emailId = await emailInput.getAttribute('id');
    if (emailId) {
      const label = page.locator(`label[for="${emailId}"]`);
      await expect(label).toBeVisible();
    } else {
      // Check for aria-label or aria-labelledby
      const ariaLabel = await emailInput.getAttribute('aria-label');
      const ariaLabelledBy = await emailInput.getAttribute('aria-labelledby');
      expect(ariaLabel || ariaLabelledBy).toBeTruthy();
    }

    // Message field should have a label
    const messageInput = page.locator('textarea, input[name="message"]');
    const messageId = await messageInput.getAttribute('id');
    if (messageId) {
      const label = page.locator(`label[for="${messageId}"]`);
      await expect(label).toBeVisible();
    } else {
      const ariaLabel = await messageInput.getAttribute('aria-label');
      const ariaLabelledBy = await messageInput.getAttribute('aria-labelledby');
      expect(ariaLabel || ariaLabelledBy).toBeTruthy();
    }
  });

  test('interactive elements are keyboard accessible', async ({ page }) => {
    await page.goto('/expert-help');

    // Tab through the page and verify focus is visible
    await page.keyboard.press('Tab');

    // Should be able to reach the form elements via keyboard
    let foundEmailInput = false;
    let tabCount = 0;
    const maxTabs = 50;

    while (tabCount < maxTabs && !foundEmailInput) {
      const focusedElement = await page.evaluate(() => {
        const el = document.activeElement;
        return {
          tagName: el?.tagName,
          type: el?.getAttribute('type'),
          name: el?.getAttribute('name'),
        };
      });

      if (focusedElement.type === 'email' || focusedElement.name === 'email') {
        foundEmailInput = true;
      }

      await page.keyboard.press('Tab');
      tabCount++;
    }

    expect(foundEmailInput).toBe(true);
  });

  test('has sufficient color contrast', async ({ page }) => {
    await page.goto('/expert-help');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['cat.color'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('images have alt text', async ({ page }) => {
    await page.goto('/expert-help');

    const images = page.locator('img');
    const imageCount = await images.count();

    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      // alt can be empty string for decorative images, but should be present
      expect(alt).not.toBeNull();
    }
  });

  test('links have discernible text', async ({ page }) => {
    await page.goto('/expert-help');

    const links = page.locator('a');
    const linkCount = await links.count();

    for (let i = 0; i < linkCount; i++) {
      const link = links.nth(i);
      const text = await link.textContent();
      const ariaLabel = await link.getAttribute('aria-label');
      const title = await link.getAttribute('title');

      // Link should have some accessible name
      const hasAccessibleName = (text && text.trim().length > 0) || ariaLabel || title;
      expect(hasAccessibleName).toBeTruthy();
    }
  });
});
