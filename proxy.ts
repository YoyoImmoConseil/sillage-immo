import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { DEFAULT_LOCALE, isSupportedLocale } from "@/lib/i18n/config";
import { stripLocalePrefix } from "@/lib/i18n/routing";
import {
  ANONYMOUS_SESSION_COOKIE_NAME,
  buildAnonymousSessionCookieOptions,
  buildAnonymousSessionCookieValue,
  generateAnonymousSessionUuid,
  parseAnonymousSessionCookie,
} from "@/lib/ai/anonymous-session";

const EXCLUDED_PREFIXES = ["/api", "/_next", "/admin"];
const LOCALE_COOKIE_NAME = "sillage-locale";

// Routes where we *do* want a stable anonymous AI session cookie to
// correlate conversation turns. We deliberately keep the list small so
// the cookie does not get planted on visitors who never interact with
// an AI surface (favicon hits, static assets, /_next/*, etc.).
const ANONYMOUS_SESSION_TRIGGER_PREFIXES = [
  "/api/home-assistant",
  "/api/estimation",
];
const ANONYMOUS_SESSION_TRIGGER_EXACT = new Set<string>(["/", "/estimation"]);

const isAnonymousSessionTrigger = (pathname: string) => {
  if (ANONYMOUS_SESSION_TRIGGER_EXACT.has(pathname)) return true;
  return ANONYMOUS_SESSION_TRIGGER_PREFIXES.some((prefix) =>
    pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
};

const ensureAnonymousSessionCookie = async (
  request: NextRequest,
  response: NextResponse
) => {
  const existing = request.cookies.get(ANONYMOUS_SESSION_COOKIE_NAME)?.value;
  const parsed = await parseAnonymousSessionCookie(existing);
  if (parsed) return;
  const uuid = generateAnonymousSessionUuid();
  const value = await buildAnonymousSessionCookieValue(uuid);
  response.cookies.set(
    ANONYMOUS_SESSION_COOKIE_NAME,
    value,
    buildAnonymousSessionCookieOptions()
  );
};

const isExcludedPath = (pathname: string) => {
  if (pathname === "/favicon.ico" || pathname === "/icon.png") {
    return true;
  }
  if (/\.[a-z0-9]+$/i.test(pathname)) {
    return true;
  }
  return EXCLUDED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
};

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (isExcludedPath(pathname)) {
    if (isAnonymousSessionTrigger(pathname)) {
      const response = NextResponse.next();
      await ensureAnonymousSessionCookie(request, response);
      return response;
    }
    return NextResponse.next();
  }

  const segments = pathname.split("/");
  const maybeLocale = segments[1];
  const headers = new Headers(request.headers);

  if (isSupportedLocale(maybeLocale) && maybeLocale !== DEFAULT_LOCALE) {
    const strippedPath = stripLocalePrefix(pathname);
    if (isExcludedPath(strippedPath)) {
      const redirectUrl = new URL(`${strippedPath}${search}`, request.url);
      return NextResponse.redirect(redirectUrl);
    }

    headers.set("x-sillage-locale", maybeLocale);
    const rewriteUrl = new URL(`${strippedPath}${search}`, request.url);
    const response = NextResponse.rewrite(rewriteUrl, {
      request: { headers },
    });
    response.cookies.set(LOCALE_COOKIE_NAME, maybeLocale, {
      path: "/",
      sameSite: "lax",
    });
    if (isAnonymousSessionTrigger(strippedPath)) {
      await ensureAnonymousSessionCookie(request, response);
    }
    return response;
  }

  headers.set("x-sillage-locale", DEFAULT_LOCALE);
  const response = NextResponse.next({
    request: { headers },
  });
  response.cookies.set(LOCALE_COOKIE_NAME, DEFAULT_LOCALE, {
    path: "/",
    sameSite: "lax",
  });
  if (isAnonymousSessionTrigger(pathname)) {
    await ensureAnonymousSessionCookie(request, response);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
