"use client";

import { useEffect } from "react";

export function AdminPageMountLogger({
  page,
  data,
}: {
  page: string;
  data?: Record<string, unknown>;
}) {
  useEffect(() => {
    // #region agent log
    fetch("http://127.0.0.1:7695/ingest/34db18ce-fe4a-4a99-91a2-c9c0aaded505", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "cada68" },
      body: JSON.stringify({
        sessionId: "cada68",
        runId: `admin-page-mount-${Date.now()}`,
        hypothesisId: "H14",
        location: "app/admin/admin-page-mount-logger.tsx:useEffect",
        message: "Mounted admin-facing page in browser",
        data: {
          page,
          ...data,
          href: window.location.href,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  }, [data, page]);

  return null;
}
