import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ user }) {
      // Only your email can sign in
      return user.email === "newlookimpex130@gmail.com";
    },
    async session({ session, token }) {
      if (token) {
        (session.user as any).email = token.email;
        (session.user as any).id = token.sub;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.email = user.email;
        token.sub = user.id;
      }
      return token;
    },
  },
  pages: {
    signIn: "/admin/signin",
    error: "/admin/signin",
  },
});

export { handler as GET, handler as POST };
