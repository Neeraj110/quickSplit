import { NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";
import { NextRequestWithAuth } from "next-auth/middleware";

const PUBLIC_ROUTES = ["/home", "/signin", "/signup"];
const PROTECTED_ROUTES = [
  "/dashboard",
  "/expenses",
  "/group",
  "/groups",
  "/setting",
  "/profile",
];

export default withAuth(
  function middleware(req: NextRequestWithAuth) {
    const pathname = req.nextUrl.pathname;
    const token = req.nextauth.token;

    if (
      token &&
      (pathname.startsWith("/signin") || pathname.startsWith("/signup"))
    ) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname;

        if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
          return true;
        }

        if (PROTECTED_ROUTES.some((route) => pathname.includes(route))) {
          return !!token;
        }

        if (pathname.startsWith("/api")) {
          const publicApiRoutes = [
            "/api/expenses",
            "/api/groups",
            "/api/settlements",
          ];
          if (publicApiRoutes.some((route) => pathname.startsWith(route))) {
            return true;
          }

          return !!token;
        }

        return true;
      },
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/expenses/:path*",
    "/group/:path*",
    "/groups/:path*",
    "/setting/:path*",
    "/profile/:path*",
    "/signin",
    "/signup",
    "/home",
    "/",
    "/((?!products|product|api/products|api/categories|api/search|_next/static|_next/image|favicon.ico).*)",
  ],
};
