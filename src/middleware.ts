export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/dashboard","/dashboard/:path*",
    "/contacts/:path*",
    "/inbox/:path*",
    "/campaigns/:path*",
    "/templates/:path*",
    "/sequences/:path*",
    "/settings/:path*",
    "/api/contacts/:path*",
    "/api/campaigns/:path*",
    "/api/templates/:path*",
    "/api/sequences/:path*",
    "/api/inbox/:path*",
    "/api/settings/:path*",
    "/api/dashboard/:path*",
  ],
};
