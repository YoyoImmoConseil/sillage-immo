"use client";

import { useEffect } from "react";

export function AdminAuthDebugProbe({
  serverSawContext,
  warningMessage,
}: {
  serverSawContext: boolean;
  warningMessage: string | null;
}) {
  useEffect(() => {
    const runId = `admin-page-${Date.now()}`;

    const sendLog = (hypothesisId: string, message: string, data: Record<string, unknown>) => {
      // #region agent log
      fetch("http://127.0.0.1:7760/ingest/34db18ce-fe4a-4a99-91a2-c9c0aaded505", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "cada68" },
        body: JSON.stringify({
          sessionId: "cada68",
          runId,
          hypothesisId,
          location: "app/admin/admin-auth-debug-probe.tsx:14",
          message,
          data,
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
    };

    sendLog("H1_H3_H4", "admin page mounted", {
      path: window.location.pathname,
      serverSawContext,
      warningMessage,
    });

    void (async () => {
      try {
        const response = await fetch("/api/admin/auth/debug-context", {
          headers: {
            "Cache-Control": "no-store",
          },
        });
        const payload = (await response.json()) as Record<string, unknown>;
        sendLog("H1_H3_H4", "admin auth diagnostics", {
          ok: response.ok,
          status: response.status,
          payload,
        });
      } catch (error) {
        sendLog("H1_H3_H4", "admin auth diagnostics failed", {
          message: error instanceof Error ? error.message : "unknown_error",
        });
      }
    })();
  }, [serverSawContext, warningMessage]);

  return null;
}
