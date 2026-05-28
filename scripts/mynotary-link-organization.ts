#!/usr/bin/env tsx
/**
 * scripts/mynotary-link-organization.ts
 *
 * One-shot CLI used when wiring a new agency to Sillage's MyNotary
 * application.
 *
 * What it does:
 *   1. Reads the application token from `MYNOTARY_API_KEY` (env).
 *   2. Reads the agency's one-time organization token from --org-token
 *      (or from MYNOTARY_ORGANIZATION_TOKEN env).
 *   3. Reads the API base URL from `MYNOTARY_API_BASE_URL` (env)
 *      so the same script works against preprod or production.
 *   4. Calls POST /clients and prints the returned organizationId.
 *
 * The organizationId is then stored once in Vercel as
 * `MYNOTARY_ORGANIZATION_ID` and reused by every other MyNotary call.
 *
 * Standalone : this script does NOT import lib/mynotary/client.ts so
 * it can run via tsx without dragging the Next.js-only
 * `server-only` module into the dependency graph.
 *
 * Usage:
 *   MYNOTARY_API_KEY=<app-key> \
 *   MYNOTARY_API_BASE_URL=https://api.mynotary.fr/api/v1 \
 *   npm run mynotary:link-organization -- --org-token=<one-time-org-token>
 */

const readFlag = (name: string): string | null => {
  const prefix = `--${name}=`;
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith(prefix)) {
      return arg.slice(prefix.length);
    }
  }
  return null;
};

type OrganizationDto = {
  id?: number | string;
  name?: string;
  address?: string;
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
        "  MYNOTARY_API_BASE_URL=https://api.mynotary.fr/api/v1 \\\n" +
        "  npm run mynotary:link-organization -- --org-token=<one-time-org-token>\n" +
        "or set MYNOTARY_ORGANIZATION_TOKEN in your env."
    );
    process.exit(1);
  }

  const apiKey = process.env.MYNOTARY_API_KEY;
  if (!apiKey) {
    console.error(
      "Missing MYNOTARY_API_KEY env var (the application token issued by MyNotary support)."
    );
    process.exit(1);
  }

  const baseUrl = (
    process.env.MYNOTARY_API_BASE_URL ?? "https://api.mynotary.fr/api/v1"
  ).replace(/\/+$/, "");

  console.log(`Calling POST ${baseUrl}/clients on MyNotary…`);
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/clients`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "x-api-date-version": "2",
      },
      body: JSON.stringify({ apiKey: orgToken }),
    });
  } catch (err) {
    console.error(
      "Network error:",
      err instanceof Error ? err.message : String(err)
    );
    process.exit(1);
  }

  const text = await response.text();
  let parsed: unknown = null;
  if (text.length > 0) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!response.ok) {
    console.error(
      `MyNotary POST /clients returned ${response.status}.`
    );
    console.error("Response body:", parsed);
    process.exit(1);
  }

  const data = (parsed ?? {}) as OrganizationDto;
  if (data.id === undefined || data.id === null) {
    console.error(
      "MyNotary POST /clients did not return an organization id; check the token."
    );
    console.error("Response body:", parsed);
    process.exit(1);
  }

  console.log("\nSuccess. organizationId =", String(data.id));
  if (data.name) console.log("  name    :", data.name);
  if (data.address) console.log("  address :", data.address);
  console.log(
    "\nNext: add this value to Vercel as MYNOTARY_ORGANIZATION_ID " +
      "(matching environment), then redeploy."
  );
};

main();
