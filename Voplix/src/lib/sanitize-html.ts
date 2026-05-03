import DOMPurify from 'isomorphic-dompurify';

/** Safe HTML for subscription bank copy and broadcast preview (owner-controlled content). */
export function sanitizeOwnerHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ['target'],
  });
}
