export const MAX_PRODUCT_IMAGES = 8;

/**
 * Trim, de-duplicate and cap a product gallery.
 * Empty strings are dropped so a half-filled upload row never becomes a slide.
 */
export function cleanProductImages(values: unknown): string[] {
  if (!Array.isArray(values)) return [];

  const seen = new Set<string>();
  const cleaned: string[] = [];

  for (const value of values) {
    if (typeof value !== "string") continue;
    const url = value.trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    cleaned.push(url);
    if (cleaned.length >= MAX_PRODUCT_IMAGES) break;
  }

  return cleaned;
}

/**
 * Resolve the gallery for a product, keeping the primary image first.
 *
 * Legacy rows and cached payloads only carry `imageUrl`, so those are still
 * rendered as a one-image gallery. `preferredPrimary` lets a rename/patch of
 * the primary image take effect without reordering the rest of the gallery.
 */
export function resolveProductImages(
  imageUrls?: string[] | null,
  imageUrl?: string | null,
  preferredPrimary?: string | null
): string[] {
  const primary = (preferredPrimary ?? imageUrl ?? "").trim();
  const gallery = cleanProductImages(imageUrls);

  if (primary && gallery[0] !== primary) {
    return cleanProductImages([primary, ...gallery]);
  }

  if (gallery.length > 0) return gallery;
  return primary ? [primary] : [];
}
