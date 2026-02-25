import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ─── Route Definitions ───────────────────────────────────────────

const publicPaths = ["/", "/login", "/signup"];

const adminPaths = ["/dashboard", "/tests", "/submissions"];

const candidatePaths = ["/test", "/result"];

// ─── Helpers ─────────────────────────────────────────────────────

function isPublicPath(pathname: string): boolean {
    return (
        publicPaths.includes(pathname) || pathname.startsWith("/invite/")
    );
}

function isAdminPath(pathname: string): boolean {
    return adminPaths.some(
        (path) => pathname === path || pathname.startsWith(`${path}/`)
    );
}

function isCandidatePath(pathname: string): boolean {
    return candidatePaths.some(
        (path) => pathname === path || pathname.startsWith(`${path}/`)
    );
}

// ─── Middleware ───────────────────────────────────────────────────

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Allow public paths without auth
    if (isPublicPath(pathname)) {
        return NextResponse.next();
    }

    // Backend sets a single "token" HTTP-only cookie for both roles.
    // We can check presence but cannot decode the JWT in Edge runtime
    // without importing jsonwebtoken (not available in Edge).
    // Role-based guards are handled in layout/page components.
    const token = request.cookies.get("token")?.value;

    // Admin routes require auth
    if (isAdminPath(pathname)) {
        if (!token) {
            const loginUrl = new URL("/login", request.url);
            loginUrl.searchParams.set("redirect", pathname);
            return NextResponse.redirect(loginUrl);
        }
        return NextResponse.next();
    }

    // Candidate routes require auth
    if (isCandidatePath(pathname)) {
        if (!token) {
            const homeUrl = new URL("/", request.url);
            return NextResponse.redirect(homeUrl);
        }
        return NextResponse.next();
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - api routes
         * - _next/static (static files)
         * - _next/image (image optimization)
         * - favicon.ico
         * - public assets
         */
        "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
