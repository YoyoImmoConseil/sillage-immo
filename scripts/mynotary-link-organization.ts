#!/usr/bin/env tsx
/**
 * scripts/mynotary-link-organization.ts
 *
 * One-shot CLI used when wiring a new agency to Sillage's MyNotary
 * application.
 *
 * What it does:
 *   1. Reads the application token from `MYNOTARY_API_KEY` (env)
 *   2. Reads the agency's one-time organization token from --org-token
 *      (or from MYNOTARY_ORGANIZATION_TOKEN env)
 *   3. Calls POST /clients with both headers
 *   4. Prints the returned organizationId
 *
 * The organizationId is then stored once in Vercel as
 * `MYNOTARY_ORGANIZATION_ID` and reused by every other MyNotary call.
 *
 * Usage:
 *   MYNOTARY_API_KEY=xxx \
 *   npm run mynotary:link-organization -- --org-token=<org-one-time-token>
 */

import { linkOrganization } from "@/lib/mynotary/client";

const readFlag = (name: string): string | null => {
  const prefix = `--${name}=`;
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith(prefix)) {
      return arg.slice(prefix.length);
    }
  }
  return null;
};

const main = async () => {
  const cliToken = readFlag("org-token");
  const envToken = process.env.MYNOTARY_ORGANIZATION_TOKEN ?? null;
  const orgToken = cliToken ?? envToken;

  if (!orgToken) {
    console.error(
      "Missing organization token.\n" +
        "Usage:\n" +
        "  MYNOTARY_API_KEY=<app-key> \\\n" +
        "  npm run mynotary:link-organization -- --org-token=<one-time-org-token>\n" +
        "or set MYNOTARY_ORGANIZATION_TOKEN in your env."
    );
    process.exit(1);
  }

  if (!process.env.MYNOTARY_API_KEY) {
    console.error(
      "Missing MYNOTARY_API_KEY env var (the application token issued by MyNotary support)."
    );
    process.exit(1);
  }

  console.log("Calling POST /clients on MyNotary…");
  try {
    const { organizationId } = await linkOrganization(orgToken);
    console.log("\nSuccess. organizationId =", organizationId);
    console.log(
      "\nNext: add this value to Vercel as MYNOTARY_ORGANIZATION_ID " +
        "(Production + Preview), then redeploy."
    );
  } catch (err) {
    console.error(
      "Linking failed:",
      err instanceof Error ? err.message : String(err)
    );
    if (err && typeof err === "object" && "responseBody" in err) {
      console.error("Response body:", (err as { responseBody?: unknown }).responseBody);
    }
    process.exit(1);
  }
};

main();
