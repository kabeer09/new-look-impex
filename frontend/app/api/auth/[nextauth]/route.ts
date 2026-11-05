import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { createHmac } from "crypto";

// Sign a JWT using Node's built-in crypto (no external dependency needed)
function signJwt(payload: Record<string, any>, secret: string): string {
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" })
  ).toString("base64url");
  const payloadStr = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret)
    .update(`${header}.${payloadStr}`)
    .digest("base64url");
  return `${header}.${payloadStr}.${signature}`;
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
        token.email = user.email;
        token.sub = user.id;
        // Sign a custom JWT that the FastAPI backend can verify
        token.customAccessToken = signJwt(
          {
            email: user.email,
            role: "admin",
            user_id: user.id,
          },
          process.env.SECRET_KEY!
        );
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        (session.user as any).email = token.email;
        (session.user as any).id = token.sub;
        (session.user as any).accessToken = token.customAccessToken;
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
