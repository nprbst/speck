/**
 * Unit tests for markdown to HTML conversion
 * Tests the markdown parsing function used for email responses
 */
import { describe, expect, test } from 'bun:test';
import { markdownToHtml } from '../../.claude/scripts/inquiries/templates';

describe('markdownToHtml', () => {
  test('converts basic paragraph', () => {
    const html = markdownToHtml('Hello, world!');

    expect(html).toContain('<p>Hello, world!</p>');
  });

  test('converts headings', () => {
    const markdown = '# Heading 1\n## Heading 2\n### Heading 3';
    const html = markdownToHtml(markdown);

    expect(html).toContain('<h1>Heading 1</h1>');
    expect(html).toContain('<h2>Heading 2</h2>');
    expect(html).toContain('<h3>Heading 3</h3>');
  });

  test('converts bold text', () => {
    const html = markdownToHtml('This is **bold** text.');

    expect(html).toContain('<strong>bold</strong>');
  });

  test('converts italic text', () => {
    const html = markdownToHtml('This is *italic* text.');

    expect(html).toContain('<em>italic</em>');
  });

  test('converts unordered lists', () => {
    const markdown = '- Item 1\n- Item 2\n- Item 3';
    const html = markdownToHtml(markdown);

    expect(html).toContain('<ul>');
    expect(html).toContain('<li>Item 1</li>');
    expect(html).toContain('<li>Item 2</li>');
    expect(html).toContain('<li>Item 3</li>');
    expect(html).toContain('</ul>');
  });

  test('converts ordered lists', () => {
    const markdown = '1. First\n2. Second\n3. Third';
    const html = markdownToHtml(markdown);

    expect(html).toContain('<ol>');
    expect(html).toContain('<li>First</li>');
    expect(html).toContain('</ol>');
  });

  test('converts links', () => {
    const html = markdownToHtml('Visit [Speck](https://speck.codes) for more.');

    expect(html).toContain('<a href="https://speck.codes"');
    expect(html).toContain('>Speck</a>');
  });

  test('converts inline code', () => {
    const html = markdownToHtml('Use the `speck init` command.');

    expect(html).toContain('<code>speck init</code>');
  });

  test('converts code blocks', () => {
    const markdown = '```bash\nspeck init\n```';
    const html = markdownToHtml(markdown);

    expect(html).toContain('<pre>');
    expect(html).toContain('<code');
    expect(html).toContain('speck init');
  });

  test('converts blockquotes', () => {
    const html = markdownToHtml('> This is a quote.');

    expect(html).toContain('<blockquote>');
    expect(html).toContain('This is a quote.');
    expect(html).toContain('</blockquote>');
  });

  test('handles multiple paragraphs', () => {
    const markdown = 'First paragraph.\n\nSecond paragraph.';
    const html = markdownToHtml(markdown);

    expect(html).toContain('<p>First paragraph.</p>');
    expect(html).toContain('<p>Second paragraph.</p>');
  });

  test('handles empty input', () => {
    const html = markdownToHtml('');

    expect(html).toBe('');
  });

  test('handles whitespace-only input', () => {
    const html = markdownToHtml('   \n\n   ');

    expect(html.trim()).toBe('');
  });

  test('escapes raw HTML by default for security', () => {
    const html = markdownToHtml('<script>alert("xss")</script>');

    expect(html).not.toContain('<script>');
  });

  test('converts horizontal rules', () => {
    const html = markdownToHtml('Above\n\n---\n\nBelow');

    expect(html).toContain('<hr');
  });

  test('handles line breaks correctly', () => {
    const markdown = 'Line 1  \nLine 2';
    const html = markdownToHtml(markdown);

    expect(html).toContain('<br');
  });
});
