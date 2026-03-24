import { headers } from "next/headers";
import { SiteHeaderClient } from "./site-header-client";

const MOBILE_OS_USER_AGENT_PATTERN =
  /\b(android|iphone|ipad|ipod)\b/i;

export async function SiteHeader() {
  const userAgent = (await headers()).get("user-agent") ?? "";
  const isMobileOs = MOBILE_OS_USER_AGENT_PATTERN.test(userAgent);

  return <SiteHeaderClient isMobileOs={isMobileOs} />;
}
