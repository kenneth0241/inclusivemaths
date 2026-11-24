/** Minimal allowlist for Dify-generated worksheet SVG (preview only). */
export function sanitizeWorksheetSvgForPreview(svg: string): string | null {
  const trimmed = svg.trim();
  if (!/^<svg[\s>]/i.test(trimmed)) {
    return null;
  }
  if (
    /<script[\s>]/i.test(trimmed) ||
    /\son[a-z]+\s*=/i.test(trimmed) ||
    /javascript:/i.test(trimmed)
  ) {
    return null;
  }
  return trimmed;
}