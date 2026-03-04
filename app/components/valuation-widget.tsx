"use client";

import { useEffect, useMemo } from "react";

declare global {
  interface Window {
    wlvw?: (key: string, containerId: string) => void;
  }
}

type ValuationWidgetProps = {
  widgetKey: string;
  containerId: string;
};

const SCRIPT_ID = "la-loupe-widget-script";
const SCRIPT_SRC = "https://la-loupe.immo/wlv.js";

export function ValuationWidget({ widgetKey, containerId }: ValuationWidgetProps) {
  const resolvedContainerId = useMemo(() => containerId.trim(), [containerId]);
  const resolvedWidgetKey = useMemo(() => widgetKey.trim(), [widgetKey]);

  useEffect(() => {
    if (!resolvedContainerId || !resolvedWidgetKey) return;

    const initWidget = () => {
      if (typeof window.wlvw === "function") {
        window.wlvw(resolvedWidgetKey, resolvedContainerId);
      }
    };

    const existingScript = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript) {
      if (typeof window.wlvw === "function") {
        initWidget();
      } else {
        existingScript.addEventListener("load", initWidget, { once: true });
      }
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.async = true;
    script.src = SCRIPT_SRC;
    script.type = "text/javascript";
    script.addEventListener("load", initWidget, { once: true });
    document.body.appendChild(script);
  }, [resolvedContainerId, resolvedWidgetKey]);

  if (!resolvedWidgetKey) {
    return (
      <p className="text-sm text-amber-700">
        Widget non initialise: configure une cle publique
        NEXT_PUBLIC_WLV_WIDGET_KEY.
      </p>
    );
  }

  if (!resolvedContainerId) {
    return (
      <p className="text-sm text-amber-700">
        Widget non initialise: configure un identifiant de conteneur
        NEXT_PUBLIC_WLV_CONTAINER_ID.
      </p>
    );
  }

  return <div id={resolvedContainerId} />;
}
