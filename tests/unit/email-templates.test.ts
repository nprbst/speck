/**
 * Unit tests for email template rendering
 * Tests the HTML email template function that wraps response content
 */
import { describe, expect, test } from 'bun:test';
import { renderEmailTemplate, type EmailTemplateData } from '../../.claude/scripts/inquiries/templates';

describe('renderEmailTemplate', () => {
  const baseData: EmailTemplateData = {
    recipientEmail: 'user@example.com',
    subject: 'Re: Your Speck Inquiry',
    bodyHtml: '<p>Thank you for your interest in Speck.</p>',
  };

  test('renders complete HTML document', () => {
    const html = renderEmailTemplate(baseData);

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html');
    expect(html).toContain('</html>');
  });

  test('includes meta charset and viewport', () => {
    const html = renderEmailTemplate(baseData);

    expect(html).toContain('charset="UTF-8"');
    expect(html).toContain('viewport');
  });

  test('includes body content', () => {
    const html = renderEmailTemplate(baseData);

    expect(html).toContain('Thank you for your interest in Speck');
  });

  test('includes subject in title', () => {
    const html = renderEmailTemplate(baseData);

    expect(html).toContain('<title>Re: Your Speck Inquiry</title>');
  });

  test('escapes HTML in subject to prevent XSS', () => {
    const data: EmailTemplateData = {
      ...baseData,
      subject: '<script>alert("xss")</script>',
    };
    const html = renderEmailTemplate(data);

    expect(html).not.toContain('<script>alert');
    expect(html).toContain('&lt;script&gt;');
  });

  test('includes responsive styling', () => {
    const html = renderEmailTemplate(baseData);

    expect(html).toContain('max-width');
    expect(html).toContain('font-family');
  });

  test('includes Speck branding/footer', () => {
    const html = renderEmailTemplate(baseData);

    expect(html).toMatch(/speck/i);
  });

  test('handles empty body gracefully', () => {
    const data: EmailTemplateData = {
      ...baseData,
      bodyHtml: '',
    };
    const html = renderEmailTemplate(data);

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('</html>');
  });

  test('preserves HTML formatting in body', () => {
    const data: EmailTemplateData = {
      ...baseData,
      bodyHtml: '<h1>Heading</h1><p>Paragraph with <strong>bold</strong> text.</p>',
    };
    const html = renderEmailTemplate(data);

    expect(html).toContain('<h1>Heading</h1>');
    expect(html).toContain('<strong>bold</strong>');
  });
});
