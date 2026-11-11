import { withAuth } from "next-auth/middleware";

export default withAuth({
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

export const config = {
  matcher: ["/admin/:path*"],
};