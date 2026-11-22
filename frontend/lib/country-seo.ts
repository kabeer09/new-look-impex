/**
 * Shared SEO helpers for market / country landing pages.
 *
 * Meta descriptions are built from each market's own H1 + first buyer bullet,
 * so every country gets a unique, keyword-relevant description without
 * mid-word truncation. No unverifiable claims, prices or lead times.
 */
export function marketMetaDescription(
  h1: string,
  bullets: string[],
  focus?: string,
  max = 158,
): string {
  const lead = focus ? `${h1} — ${focus}.` : `${h1}.`;
  let detail = (bullets[0] || "").replace(/\s+/g, " ").trim();
  const room = Math.max(24, max - lead.length - 1);
  if (detail.length > room) {
    detail = detail.slice(0, room).replace(/\s+\S*$/, "");
  }
  return `${lead} ${detail}`.replace(/\s+/g, " ").trim();
}
