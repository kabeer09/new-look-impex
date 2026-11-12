import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { createHmac } from "crypto";

// Sign a JWT using Node's built-in crypto (no external dependency needed)
interface JwtPayload {
  email: string;
  role: string;
  user_id: string;
  iat?: number; // issued at timestamp
  exp?: number; // expiration timestamp
}
function signJwt(payload: JwtPayload, secret: string): string {
  // Add default timestamps if not provided
  const payloadWithTimes = {
    ...payload,
    iat: payload.iat || Math.floor(Date.now() / 1000),
    exp: payload.exp || Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // 30 days
  };
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" })
  ).toString("base64url");
  const payloadStr = Buffer.from(JSON.stringify(payloadWithTimes)).toString("base64url");
  const signature = createHmac("sha256", secret)
    .update(`${header}.${payloadStr}`)
    .digest("base64url");
  return `${header}.${payloadStr}.${signature}`;
}

// JWT signing secret - REQUIRED server-side environment variable
// Application fails closed if NEXTAUTH_SECRET is missing (no default fallback)
const SECRET = process.env.NEXTAUTH_SECRET;
if (!SECRET) {
  throw new Error("NEXTAUTH_SECRET is required for JWT signing");
}

// JWT validation helper (for diagnostics only - does not expose secret)
function jwtHeaderDecode(encodedToken: string): { alg: string; typ: string } | null {
  try {
    const parts = encodedToken.split(".");
    if (parts.length !== 3) return null;
    const headerBase64 = parts[0];
    // Pad base64 if needed
    const headerStr = Buffer.from(headerBase64, "base64").toString("utf-8");
    return JSON.parse(headerStr);
  } catch {
    return null;
  }
}

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user }) {
      // Only newlookimpex130@gmail.com can sign in
      return user.email === "newlookimpex130@gmail.com";
    },
    async jwt({ token, user }) {
      if (user) {
        const _user = user as { email: string; id: string };
        token.email = _user.email;
        token.sub = _user.id;
        // Sign a custom JWT that the FastAPI backend can verify
        // Include standard JWT claims for compatibility
        token.accessToken = signJwt(
          {
            email: _user.email,
            role: "admin",
            user_id: _user.id,
          },
          SECRET
        );
      }
      return token;
    },
    async session({ session, token }) {
      // Robustly populate session user accessToken
      if (token && token.accessToken && typeof token.accessToken === "string") {
        (session.user as any).email = token.email;
        (session.user as any).id = token.sub;
        (session.user as any).accessToken = token.accessToken;
      } else {
        // Diagnostic: token.accessToken missing - log category without exposing secrets
        console.warn(
          "[AuthDiagnostic] Missing accessToken in session: token.accessToken=%j, token=%j",
          token?.accessToken,
          token
        );
        // Initialize as empty string so authHeaders() doesn't crash
        (session.user as any).accessToken = "";
      }
      return session;
    },
  },
  pages: {
    signIn: "/admin/signin",
    error: "/admin/signin",
  },
});

export { handler as GET, handler as POST };