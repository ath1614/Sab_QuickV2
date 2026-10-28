/**
 * Policy / compliance screens are read as documents, not store pages.
 * They keep their public URLs (app-store listings, emails, footer links),
 * but the shopping chrome — bottom tabs, cart pill, live order bar — must
 * stay out of the way while someone is reading them.
 */
export const DOCUMENT_ROUTES = [
  "/terms",
  "/privacy",
  "/refund",
  "/delete-account",
] as const;

export function isDocumentRoute(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return DOCUMENT_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}
