import type { EventInput } from "./types";

export const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("nli_token");
}

export function authHeaders(): HeadersInit {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

function parseError(status: number, body: string): string {
  try {
    const j = JSON.parse(body);
    if (j && typeof j.error === "string") return `${status}: ${j.error}`;
    if (j && typeof j.detail === "string") return `${status}: ${j.detail}`;
  } catch {
    /* not json */
  }
  return `${status}: ${body.slice(0, 300)}`;
}

async function handleResponse<T>(r: Response): Promise<T> {
  if (!r.ok) {
    const body = await r.text();
    throw new Error(parseError(r.status, body));
  }
  const text = await r.text();
  if (!text) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

/** JSON request helper (uses stored admin token when present). */
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${API}${path}`, { ...init, headers: { ...authHeaders(), ...(init?.headers || {}) } });
  return handleResponse<T>(r);
}

/** Multipart upload helper — keeps Authorization but lets the browser set the multipart boundary. */
export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const headers: HeadersInit = {};
  const t = getToken();
  if (t) headers["Authorization"] = `Bearer ${t}`;
  const r = await fetch(`${API}${path}`, { method: "POST", body: formData, headers });
  return handleResponse<T>(r);
}

/** Authed GET that streams a file (CSV/PDF) and triggers a browser download. */
export async function downloadFile(path: string, filename: string): Promise<void> {
  const headers: HeadersInit = {};
  const t = getToken();
  if (t) headers["Authorization"] = `Bearer ${t}`;
  const r = await fetch(`${API}${path}`, { headers });
  if (!r.ok) {
    const body = await r.text();
    throw new Error(parseError(r.status, body));
  }
  const blob = await r.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/** Resolve a media/product image URL against the API base when needed.
 *  For Supabase Storage URLs, wraps in Cloudinary fetch for optimized delivery. */
export function mediaUrl(url: string | null | undefined): string {
  if (!url) return "";
  if (url.startsWith("data:")) return url;
  // Cloudinary fetch transform for remote images
  if (CLOUDINARY_CLOUD && /^https?:\/\//i.test(url) && url.includes("supabase.co")) {
    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD}/image/fetch/q_auto,f_auto/${encodeURIComponent(url)}`;
  }
  if (/^https?:\/\//i.test(url)) return url;
  return `${API}${url.startsWith("/") ? "" : "/api/media/files/"}${url}`;
}

/** Cloudinary cloud name — set via NEXT_PUBLIC_CLOUDINARY_CLOUD in env. */
const CLOUDINARY_CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD || "";

/** Wrap a remote image URL in Cloudinary's fetch/transform URL for optimized
 *  delivery (WebP/AVIF, responsive sizing, auto quality). Falls back to the
 *  original URL if Cloudinary is not configured. */
export function cloudinaryUrl(url: string | null | undefined, width?: number): string {
  if (!url) return "";
  if (!CLOUDINARY_CLOUD) return mediaUrl(url);
  if (!/^https?:\/\//i.test(url)) return mediaUrl(url);
  const transforms = width ? `w_${width},c_scale,q_auto,f_auto` : "q_auto,f_auto";
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD}/image/fetch/${transforms}/${encodeURIComponent(url)}`;
}

/** True only for files served by our own media endpoint (safe to add ?variant=). */
export function isLocalMedia(url: string | null | undefined): boolean {
  if (!url) return false;
  if (url.includes("supabase.co/storage/")) return true;
  if (/^https?:\/\//i.test(url)) return url.startsWith(API);
  return url.startsWith("/api/media/files/");
}

/** Derivative URL: thumb (800px JPEG) or webp (1600px). For Supabase Storage
 *  images, uses the render/image endpoint for on-the-fly resizing. */
export function variantUrl(url: string | null | undefined, variant: "thumb" | "webp"): string {
  if (!url) return "";
  const w = variant === "thumb" ? 400 : 800;
  // Cloudinary fetch transform (WebP/AVIF, auto quality)
  if (CLOUDINARY_CLOUD && /^https?:\/\//i.test(url)) {
    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD}/image/fetch/w_${w},c_scale,q_auto,f_auto/${encodeURIComponent(url)}`;
  }
  const base = mediaUrl(url);
  if (!base) return base;
  // Local media endpoint (backend serves thumbnails)
  if (isLocalMedia(url) && !url.includes("supabase.co")) {
    return `${base}${base.includes("?") ? "&" : "?"}variant=${variant}`;
  }
  return base;
}

/** Small srcset for cards and galleries: 800px thumb + 1600px WebP. */
export function cardSrcSet(url: string | null | undefined): string | undefined {
  if (!isLocalMedia(url)) return undefined;
  return `${variantUrl(url, "thumb")} 800w, ${variantUrl(url, "webp")} 1600w`;
}

/** Analytics beacon — fire-and-forget, never blocks UI, never throws. */
export function trackEvent(input: EventInput): void {
  try {
    if (typeof window === "undefined") return;
    void fetch(`${API}/api/public/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...input, url: input.url || window.location.pathname, referrer: input.referrer || document.referrer }),
    }).catch(() => undefined);
  } catch {
    /* non-blocking */
  }
}

export const WHATSAPP_URL = "https://wa.me/919690053913";
export const BUSINESS_EMAIL = "newlookimpex130@gmail.com";
export const BUSINESS_SALES_EMAIL = "newlookimpex@gmail.com";
export const BUSINESS_PHONES = ["+91 8218251238", "+91 7500441239"];
export const BUSINESS_WHATSAPP = "+91 96900 53913";
export const BUSINESS_SALES_WHATSAPP = "+91 9808588603";
export const BUSINESS_LOCATION = "Moradabad, Uttar Pradesh, India";
export const WHATSAPP_TEXT = "Hi New Look Impex, I would like a wholesale quotation.";

// Configurable WhatsApp number (admin setting `whatsapp_number`, E.164 digits).
// Seeded with the known default; the public layout fetches settings once and
// updates it, and components subscribe via useWhatsappNumber() to re-render.
export const DEFAULT_WHATSAPP_NUMBER = "919690053913";
let _whatsappNumber = DEFAULT_WHATSAPP_NUMBER;
const _waListeners = new Set<() => void>();

export function setWhatsappNumber(n: string): void {
  const digits = (n || "").replace(/\D/g, "");
  if (digits && digits !== _whatsappNumber) {
    _whatsappNumber = digits;
    _waListeners.forEach((l) => l());
  }
}

export function getWhatsappNumber(): string {
  return _whatsappNumber;
}

export function subscribeWhatsapp(cb: () => void): () => void {
  _waListeners.add(cb);
  return () => {
    _waListeners.delete(cb);
  };
}

/** Click-to-chat URL for the currently configured WhatsApp number. */
export function whatsappUrl(): string {
  return `https://wa.me/${_whatsappNumber}`;
}

export function whatsappLink(text = WHATSAPP_TEXT): string {
  return `${whatsappUrl()}?text=${encodeURIComponent(text)}`;
}
