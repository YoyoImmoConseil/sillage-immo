"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { AppLocale } from "@/lib/i18n/config";

export type ZonePolygon = Array<[number, number]>;

type BuyerSearchZoneMapProps = {
  locale: AppLocale;
  value: ZonePolygon | null;
  onChange: (polygon: ZonePolygon | null) => void;
  center?: [number, number];
  initialZoom?: number;
  height?: string;
};

const TILE_URL =
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const TILE_SUBDOMAINS = "abcd";
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">CARTO</a>';

const DEFAULT_CENTER: [number, number] = [43.7102, 7.262]; // Nice
const DEFAULT_ZOOM = 11;

const COPY: Record<
  AppLocale,
  {
    helperIdle: string;
    helperDrawing: string;
    helperDone: (points: number) => string;
    buttonDraw: string;
    buttonClear: string;
    buttonCancel: string;
    tooltipStart: string;
    tooltipContinue: string;
    tooltipFinish: string;
  }
> = {
  fr: {
    helperIdle:
      "Cliquez sur « Dessiner la zone » puis cliquez sur la carte pour déposer chaque point. Double-cliquez pour fermer la zone.",
    helperDrawing: "Cliquez sur la carte pour ajouter des points. Double-cliquez sur le dernier point pour terminer.",
    helperDone: (points: number) => `Zone enregistrée (${points} points). Vous pouvez la modifier ou l'effacer.`,
    buttonDraw: "Dessiner la zone",
    buttonClear: "Effacer la zone",
    buttonCancel: "Annuler",
    tooltipStart: "Cliquez sur la carte pour commencer",
    tooltipContinue: "Cliquez pour continuer",
    tooltipFinish: "Double-cliquez pour terminer",
  },
  en: {
    helperIdle:
      "Click 'Draw zone', then click on the map to add points. Double-click to close the shape.",
    helperDrawing: "Click on the map to add points. Double-click the last point to finish.",
    helperDone: (points: number) => `Zone saved (${points} points). You can edit or clear it.`,
    buttonDraw: "Draw zone",
    buttonClear: "Clear zone",
    buttonCancel: "Cancel",
    tooltipStart: "Click on the map to start",
    tooltipContinue: "Click to continue",
    tooltipFinish: "Double-click to finish",
  },
  es: {
    helperIdle:
      "Haga clic en 'Dibujar zona', luego haga clic en el mapa para añadir puntos. Doble clic para cerrar la forma.",
    helperDrawing: "Haga clic en el mapa para añadir puntos. Doble clic en el último punto para terminar.",
    helperDone: (points: number) => `Zona guardada (${points} puntos). Puede editarla o borrarla.`,
    buttonDraw: "Dibujar zona",
    buttonClear: "Borrar zona",
    buttonCancel: "Cancelar",
    tooltipStart: "Haga clic en el mapa para empezar",
    tooltipContinue: "Haga clic para continuar",
    tooltipFinish: "Doble clic para terminar",
  },
  ru: {
    helperIdle:
      "Нажмите «Нарисовать зону», затем кликайте по карте, чтобы добавлять точки. Двойной клик — чтобы закрыть фигуру.",
    helperDrawing: "Кликайте по карте, чтобы добавлять точки. Двойной клик по последней точке — завершение.",
    helperDone: (points: number) => `Зона сохранена (${points} точек). Её можно изменить или удалить.`,
    buttonDraw: "Нарисовать зону",
    buttonClear: "Удалить зону",
    buttonCancel: "Отмена",
    tooltipStart: "Кликните по карте, чтобы начать",
    tooltipContinue: "Кликните для продолжения",
    tooltipFinish: "Двойной клик — готово",
  },
};

type LMod = typeof import("leaflet");

const loadLeafletWithDraw = async (): Promise<LMod> => {
  const leafletNamespace = (await import("leaflet")) as unknown as
    | LMod
    | { default: LMod };
  const L = ((leafletNamespace as { default?: LMod }).default ??
    leafletNamespace) as LMod;
  if (typeof window !== "undefined") {
    (window as unknown as { L: LMod }).L = L;
  }
  await import("leaflet-draw");
  return L;
};

export function BuyerSearchZoneMap({
  locale,
  value,
  onChange,
  center = DEFAULT_CENTER,
  initialZoom = DEFAULT_ZOOM,
  height = "360px",
}: BuyerSearchZoneMapProps) {
  const copy = useMemo(() => COPY[locale], [locale]);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<import("leaflet").Map | null>(null);
  const drawnLayerRef = useRef<import("leaflet").FeatureGroup | null>(null);
  const polygonLayerRef = useRef<import("leaflet").Polygon | null>(null);
  const activeDrawerRef = useRef<{ disable: () => void } | null>(null);
  const onChangeRef = useRef(onChange);
  const LRef = useRef<LMod | null>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [pointCount, setPointCount] = useState<number>(value?.length ?? 0);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!mapRef.current) return;
    let disposed = false;

    void (async () => {
      let L: LMod;
      try {
        L = await loadLeafletWithDraw();
      } catch (error) {
        console.error("[buyer-search-zone-map] failed to load leaflet/leaflet-draw", error);
        return;
      }
      if (disposed || !mapRef.current) return;

      LRef.current = L;

      const map = L.map(mapRef.current, {
        center,
        zoom: initialZoom,
        scrollWheelZoom: true,
      });
      mapInstanceRef.current = map;

      L.tileLayer(TILE_URL, {
        attribution: ATTRIBUTION,
        subdomains: TILE_SUBDOMAINS,
        maxZoom: 19,
      }).addTo(map);

      const drawnItems = new L.FeatureGroup();
      drawnItems.addTo(map);
      drawnLayerRef.current = drawnItems;

      if (value && value.length >= 3) {
        const layer = L.polygon(value, { color: "#f4c47a", weight: 2, fillOpacity: 0.2 });
        drawnItems.addLayer(layer);
        polygonLayerRef.current = layer;
        map.fitBounds(layer.getBounds(), { padding: [30, 30], maxZoom: 15 });
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const LAny = L as any;
      const createdEvent: string =
        LAny?.Draw?.Event?.CREATED ?? "draw:created";
      const drawStopEvent: string =
        LAny?.Draw?.Event?.DRAWSTOP ?? "draw:drawstop";

      map.on(createdEvent, (event: { layer: import("leaflet").Layer }) => {
        const layer = event.layer as import("leaflet").Polygon;
        drawnItems.clearLayers();
        polygonLayerRef.current = layer;
        drawnItems.addLayer(layer);
        const latlngs = layer.getLatLngs()[0] as unknown as Array<{
          lat: number;
          lng: number;
        }>;
        const points: ZonePolygon = latlngs.map((p) => [p.lat, p.lng]);
        setPointCount(points.length);
        setIsDrawing(false);
        activeDrawerRef.current = null;
        onChangeRef.current(points);
      });

      map.on(drawStopEvent, () => {
        setIsDrawing(false);
        activeDrawerRef.current = null;
      });
    })();

    return () => {
      disposed = true;
      if (activeDrawerRef.current) {
        try {
          activeDrawerRef.current.disable();
        } catch {
          /* ignore */
        }
        activeDrawerRef.current = null;
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      drawnLayerRef.current = null;
      polygonLayerRef.current = null;
    };
    // Intentionally only run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStartDrawing = () => {
    const L = LRef.current;
    const map = mapInstanceRef.current;
    if (!L || !map) return;
    if (activeDrawerRef.current) {
      try {
        activeDrawerRef.current.disable();
      } catch {
        /* ignore */
      }
      activeDrawerRef.current = null;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const LAny = L as any;
    if (!LAny?.Draw?.Polygon) {
      console.error(
        "[buyer-search-zone-map] L.Draw.Polygon is not available — leaflet-draw may not have loaded properly"
      );
      return;
    }
    try {
      const drawer = new LAny.Draw.Polygon(map, {
        allowIntersection: false,
        showArea: false,
        shapeOptions: {
          color: "#f4c47a",
          weight: 2,
          fillOpacity: 0.2,
        },
      });
      drawer.enable();
      activeDrawerRef.current = drawer;
      setIsDrawing(true);
    } catch (error) {
      console.error("[buyer-search-zone-map] failed to enable polygon drawer", error);
    }
  };

  const handleCancelDrawing = () => {
    if (activeDrawerRef.current) {
      try {
        activeDrawerRef.current.disable();
      } catch {
        /* ignore */
      }
      activeDrawerRef.current = null;
    }
    setIsDrawing(false);
  };

  const handleClear = () => {
    drawnLayerRef.current?.clearLayers();
    polygonLayerRef.current = null;
    setPointCount(0);
    onChangeRef.current(null);
  };

  const hasZone = pointCount >= 3;
  const helper = isDrawing
    ? copy.helperDrawing
    : hasZone
      ? copy.helperDone(pointCount)
      : copy.helperIdle;

  return (
    <div className="space-y-3">
      <div
        ref={mapRef}
        className="w-full overflow-hidden rounded-xl border border-[rgba(20,20,70,0.18)] bg-[#e9e1d8]"
        style={{ height }}
      />
      <p className="text-xs text-[#141446]/75">{helper}</p>
      <div className="flex flex-wrap gap-2">
        {!isDrawing ? (
          <button
            type="button"
            onClick={handleStartDrawing}
            className="sillage-btn-secondary rounded px-4 py-2 text-xs uppercase tracking-[0.12em]"
          >
            {hasZone ? copy.buttonDraw + " (remplacer)" : copy.buttonDraw}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleCancelDrawing}
            className="rounded border border-[rgba(20,20,70,0.24)] px-4 py-2 text-xs uppercase tracking-[0.12em]"
          >
            {copy.buttonCancel}
          </button>
        )}
        {hasZone && !isDrawing ? (
          <button
            type="button"
            onClick={handleClear}
            className="rounded border border-red-400 px-4 py-2 text-xs uppercase tracking-[0.12em] text-red-700"
          >
            {copy.buttonClear}
          </button>
        ) : null}
      </div>
    </div>
  );
}
