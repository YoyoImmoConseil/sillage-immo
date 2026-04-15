import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { DEFAULT_LOCALE, isSupportedLocale } from "@/lib/i18n/config";
import { stripLocalePrefix } from "@/lib/i18n/routing";

const EXCLUDED_PREFIXES = ["/api", "/_next", "/admin"];

const isExcludedPath = (pathname: string) => {
  if (pathname === "/favicon.ico" || pathname === "/icon.png") {
    return true;
  }
  if (/\.[a-z0-9]+$/i.test(pathname)) {
    return true;
  }
  return EXCLUDED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
};

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (isExcludedPath(pathname)) {
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
    return NextResponse.rewrite(rewriteUrl, {
      request: { headers },
    });
  }

  headers.set("x-sillage-locale", DEFAULT_LOCALE);
  return NextResponse.next({
    request: { headers },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
