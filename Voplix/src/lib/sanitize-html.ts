import sanitizeHtml from 'sanitize-html';

/**
 * Safe HTML for subscription bank copy, broadcast preview, and Telegram template previews.
 * Uses `sanitize-html` (htmlparser2) instead of `isomorphic-dompurify` so the server bundle
 * never loads `jsdom` — that dependency breaks in some serverless runtimes (ERR_REQUIRE_ESM).
 */
const SANITIZE_OPTS: sanitizeHtml.IOptions = {
  ...sanitizeHtml.defaults,
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    a: ['href', 'name', 'target', 'rel'],
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel', 'ftp'],
};

export function sanitizeOwnerHtml(html: string): string {
  if (html == null || typeof html !== 'string') {
    return '';
  }
  return sanitizeHtml(html, SANITIZE_OPTS);
}
