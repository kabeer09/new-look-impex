import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    authorized: ({ token, req }) => {
      const isAdmin = req.nextUrl.pathname.startsWith("/admin");
      if (isAdmin) {
        return !!token && token.email === "newlookimpex130@gmail.com";
      }
      return true; // public pages stay open
    },
  },
});

export const config = {
  matcher: ["/admin/:path*"],
};
