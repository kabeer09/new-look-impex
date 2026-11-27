/** Thin GA4 helper. Only static, non-personal parameters are ever sent.
 *  Never pass form state, hrefs, reference numbers, names, emails or phones. */
export function gaEvent(name: string, params: Record<string, string | number> = {}) {
  if (typeof window === "undefined") return;
  const gtag = (window as any).gtag;
  if (typeof gtag !== "function") return;
  gtag("event", name, params);
}
