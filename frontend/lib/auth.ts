import { getToken } from "./api";

export function logout(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("nli_token");
}

/** Guard for admin areas: returns true when a token exists, otherwise redirects to the admin login. */
export function requireAuth(loginPath = "/admin/login"): boolean {
  if (getToken()) return true;
  if (typeof window !== "undefined") {
    const target = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.replace(`${loginPath}?next=${target}`);
  }
  return false;
}
