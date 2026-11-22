import { withAuth } from "next-auth/middleware";
import type { NextRequestWithAuth } from "next-auth/middleware";
import type { NextFetchEvent, NextRequest } from "next/server";
import { NextResponse } from "next/server";

/** Admin guard (unchanged behaviour): only the allowlisted admin may pass. */
const adminGuard = withAuth({
  pages: {
    signIn: "/admin/signin",
  },
  callbacks: {
    authorized: ({ token, req }) => {
      const path = req.nextUrl.pathname;

      if (path === "/admin/signin") {
        return true;
      }

      return token?.email === "newlookimpex130@gmail.com";
    },
  },
});

/**
 * Privacy-conscious country hint (Phase 5).
 *
 * Reads the country code our own proxy already attached to the request
 * (Vercel `x-vercel-ip-country`, Cloudflare `cf-ipcountry`) and mirrors it to
 * a first-party cookie. The IP address itself is never read or stored, no
 * third-party geolocation service is called, nothing is logged, and the
 * visitor is never redirected — the header/footer selector always wins over
 * this hint and can be changed by hand.
 */
function geoCookie(req: NextRequest): NextResponse | null {
  // An explicit buyer choice outranks the proxy hint — leave it untouched.
  if (req.cookies.get("nli_dest")?.value) return null;

  const cc =
    req.headers.get("x-vercel-ip-country") ||
    req.headers.get("cf-ipcountry") ||
    "";
  if (!/^[A-Za-z]{2}$/.test(cc)) return null;

  const res = NextResponse.next();
  res.cookies.set("nli_geo", cc.toUpperCase(), {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // one year; overwritten on the next visit
    sameSite: "lax",
  });
  return res;
}

export default function middleware(req: NextRequest, event: NextFetchEvent) {
  // Admin auth runs exactly as before on /admin routes.
  if (req.nextUrl.pathname.startsWith("/admin")) {
    return adminGuard(req as NextRequestWithAuth, event);
  }

  // Public routes: add the country hint when we have one, otherwise pass through.
  return geoCookie(req) || NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    // Everything public except API routes, Next internals and static files.
    "/((?!api|_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|.*\\..*).*)",
  ],
};
