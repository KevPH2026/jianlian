import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const role = (req.nextauth.token?.role as string | undefined) || "USER";
    const path = req.nextUrl.pathname;
    const usersArea = path === "/users" || path.startsWith("/users/") || path === "/api/users" || path.startsWith("/api/users/");
    if (usersArea && role !== "ADMIN") {
      if (path.startsWith("/api/")) {
        return NextResponse.json({ error: "无权限" }, { status: 403 });
      }
      return new NextResponse("无权限", {
        status: 403,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => Boolean(token),
    },
  }
);

export const config = {
  matcher: [
    "/dashboard","/dashboard/:path*",
    "/contacts/:path*",
    "/inbox/:path*",
    "/campaigns/:path*",
    "/templates/:path*",
    "/sequences/:path*",
    "/settings/:path*",
    "/users","/users/:path*",
    "/api/contacts/:path*",
    "/api/campaigns/:path*",
    "/api/templates/:path*",
    "/api/sequences/:path*",
    "/api/inbox/:path*",
    "/api/settings/:path*",
    "/api/dashboard/:path*",
    "/api/users","/api/users/:path*",
  ],
};
