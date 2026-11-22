/**
 * Shared hand-off between the floating live-chat assistant and the RFQ form.
 * The chat bot (and its earlier wizard form) write the buyer's answers here;
 * /request-quote reads and clears it once, so the form arrives pre-filled.
 */
export const ASSISTANT_BRIEF_KEY = "nli_assistant_brief";

/** Window event that asks the floating chat bot to open (footer/header CTAs). */
export const NLI_CHAT_EVENT = "nli-chat-open";

/** Window event that asks the sales popup to open (bottom sale bar CTA). */
export const NLI_SALE_POPUP_EVENT = "nli-sale-popup-open";

export function openNliChat(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(NLI_CHAT_EVENT));
}

export function openSalePopup(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(NLI_SALE_POPUP_EVENT));
}

/**
 * Soft two-note chime generated in-browser (no asset, no network) for the
 * welcome pop and the discount popup. Browsers may block autoplay until a
 * user gesture; callers still show the visual pop when that happens.
 */
export function playPopChime(): void {
  if (typeof window === "undefined") return;
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const now = ctx.currentTime;
    [[659.25, 0], [783.99, 0.13]].forEach(([freq, delay]) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, now + delay);
      g.gain.exponentialRampToValueAtTime(0.06, now + delay + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.4);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(now + delay);
      o.stop(now + delay + 0.45);
    });
    window.setTimeout(() => { ctx.close().catch(() => undefined); }, 1200);
  } catch {
    /* autoplay blocked or unsupported — the visual pop still works */
  }
}
