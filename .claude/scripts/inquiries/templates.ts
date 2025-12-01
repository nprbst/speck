/**
 * Email Templates Module
 * Provides markdown-to-HTML conversion and email template rendering
 */
import { marked } from 'marked';

/**
 * Data required to render an email template
 */
export interface EmailTemplateData {
  /** Recipient's email address */
  recipientEmail: string;
  /** Email subject line */
  subject: string;
  /** Body content as HTML (already converted from markdown) */
  bodyHtml: string;
}

/**
 * Escape HTML special characters to prevent XSS
 */
function escapeHtml(text: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, (char) => htmlEscapes[char] || char);
}

/**
 * Escape raw HTML tags in markdown to prevent XSS
 * Preserves markdown syntax while escaping actual HTML tags
 */
function escapeHtmlTags(text: string): string {
  // Escape < and > that look like HTML tags (not markdown)
  // This matches HTML tags like <script>, <div>, etc.
  return text.replace(/<(\/?[a-zA-Z][a-zA-Z0-9]*)[^>]*>/g, (match) => {
    return match.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  });
}

/**
 * Convert markdown text to HTML
 * Uses marked library with security settings enabled
 *
 * @param markdown - Markdown text to convert
 * @returns HTML string
 */
export function markdownToHtml(markdown: string): string {
  if (!markdown || markdown.trim() === '') {
    return '';
  }

  // Escape raw HTML tags for security before parsing
  const sanitizedMarkdown = escapeHtmlTags(markdown);

  // Configure marked for safe rendering
  marked.setOptions({
    gfm: true, // GitHub Flavored Markdown
    breaks: true, // Convert \n to <br>
  });

  // Parse markdown to HTML
  const html = marked.parse(sanitizedMarkdown, { async: false }) as string;

  return html.trim();
}

/**
 * Render a complete HTML email template
 * Wraps the body content in a responsive, styled email layout
 *
 * @param data - Email template data
 * @returns Complete HTML document as string
 */
export function renderEmailTemplate(data: EmailTemplateData): string {
  const { subject, bodyHtml } = data;
  const escapedSubject = escapeHtml(subject);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <title>${escapedSubject}</title>
  <style>
    /* Light mode (default) */
    :root {
      --color-bg: #ffffff;
      --color-bg-outer: #f8f8f7;
      --color-text: #1a1a1a;
      --color-text-secondary: #666666;
      --color-border: #e0e0e0;
      --color-accent: #c17d4a;
      --color-code-bg: #f5f5f5;
    }

    /* Dark mode (system preference) */
    @media (prefers-color-scheme: dark) {
      :root {
        --color-bg: #1a1a1a;
        --color-bg-outer: #0f0f0f;
        --color-text: #e8e6e3;
        --color-text-secondary: #a8a8a8;
        --color-border: #3a3a3a;
        --color-accent: #d4a574;
        --color-code-bg: #2a2a2a;
      }
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: var(--color-text);
      margin: 0;
      padding: 0;
      background-color: var(--color-bg-outer);
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: var(--color-bg);
    }
    .content {
      padding: 20px 0;
    }
    .content h1, .content h2, .content h3 {
      color: var(--color-text);
      margin-top: 24px;
      margin-bottom: 12px;
    }
    .content h1 { font-size: 24px; }
    .content h2 { font-size: 20px; }
    .content h3 { font-size: 18px; }
    .content p {
      margin: 0 0 16px 0;
    }
    .content ul, .content ol {
      margin: 0 0 16px 0;
      padding-left: 24px;
    }
    .content li {
      margin-bottom: 8px;
    }
    .content a {
      color: var(--color-accent);
      text-decoration: underline;
    }
    .content code {
      background-color: var(--color-code-bg);
      color: var(--color-text);
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'SF Mono', Monaco, 'Courier New', monospace;
      font-size: 14px;
    }
    .content pre {
      background-color: var(--color-code-bg);
      padding: 12px;
      border-radius: 6px;
      overflow-x: auto;
    }
    .content pre code {
      background: none;
      padding: 0;
    }
    .content blockquote {
      margin: 0 0 16px 0;
      padding: 12px 16px;
      border-left: 4px solid var(--color-border);
      background-color: var(--color-code-bg);
      color: var(--color-text-secondary);
    }
    .content hr {
      border: none;
      border-top: 1px solid var(--color-border);
      margin: 24px 0;
    }
    .footer {
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid var(--color-border);
      font-size: 12px;
      color: var(--color-text-secondary);
      text-align: center;
    }
    .footer a {
      color: var(--color-accent);
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="content">
      ${bodyHtml}
    </div>
    <div class="footer">
      <p>
        Sent from <a href="https://speck.codes">Speck</a> - Claude Code-Native Spec-Driven Development
      </p>
    </div>
  </div>
</body>
</html>`;
}
