"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { geoMercator, geoPath } from "d3-geo";
import type { FeatureCollection, Geometry } from "geojson";
import { assetUrl } from "@/lib/asset-url";

type GeoProps = { id?: string };
type MunCollection = FeatureCollection<Geometry, GeoProps>;
type Shape = { ibge: string; d: string };

type Props = {
  fills: Record<string, string>;
  activeIbge: string | null;
  onSelect: (ibge: string) => void;
  tip: (ibge: string) => ReactNode;
};

const WIDTH = 640;
const HEIGHT = 680;
const MIN_VIEW = 70;

type View = { x: number; y: number; w: number; h: number };

const HOME: View = { x: 0, y: 0, w: WIDTH, h: HEIGHT };

function zoomAround(view: View, factor: number): View {
  const w = Math.min(WIDTH, Math.max(MIN_VIEW, view.w * factor));
  const h = Math.min(HEIGHT, Math.max(MIN_VIEW * (HEIGHT / WIDTH), view.h * factor));
  const cx = view.x + view.w / 2;
  const cy = view.y + view.h / 2;
  return clampView({ x: cx - w / 2, y: cy - h / 2, w, h });
}

function clampView(view: View): View {
  const w = Math.min(WIDTH, Math.max(MIN_VIEW, view.w));
  const h = Math.min(HEIGHT, Math.max(MIN_VIEW * (HEIGHT / WIDTH), view.h));
  const x = Math.min(WIDTH - w * 0.35, Math.max(-w * 0.15, view.x));
  const y = Math.min(HEIGHT - h * 0.35, Math.max(-h * 0.15, view.y));
  return { x, y, w, h };
}

const Shapes = memo(function Shapes({
  shapes,
  fills,
  activeIbge,
  onShapeMove,
  onShapeClick,
}: {
  shapes: Shape[];
  fills: Record<string, string>;
  activeIbge: string | null;
  onShapeMove: (ibge: string, event: ReactMouseEvent<SVGPathElement>) => void;
  onShapeClick: (ibge: string) => void;
}) {
  return shapes.map((shape) => {
    const active = shape.ibge === activeIbge;
    return (
      <path
        key={shape.ibge}
        d={shape.d}
        fill={fills[shape.ibge] ?? "#e5e5e5"}
        stroke={active ? "#111111" : "#ffffff"}
        strokeWidth={active ? 1.4 : 0.35}
        vectorEffect="non-scaling-stroke"
        className="cursor-pointer"
        onMouseEnter={(event) => onShapeMove(shape.ibge, event)}
        onMouseMove={(event) => onShapeMove(shape.ibge, event)}
        onClick={() => onShapeClick(shape.ibge)}
      />
    );
  });
});

export function MunicipalMap({ fills, activeIbge, onSelect, tip }: Props) {
  const [geo, setGeo] = useState<MunCollection | null>(null);
  const [view, setView] = useState<View>(HOME);
  const [cursor, setCursor] = useState<{ ibge: string; x: number; y: number; flipX: boolean; flipY: boolean } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number; view: View; moved: boolean } | null>(null);
  const skipClick = useRef(false);

  useEffect(() => {
    fetch(assetUrl("/brazil-municipios.geojson"))
      .then((response) => response.json())
      .then(setGeo)
      .catch(() => setGeo(null));
  }, []);

  const shapes = useMemo(() => {
    if (!geo) return [];
    const projection = geoMercator().fitExtent(
      [
        [8, 8],
        [WIDTH - 8, HEIGHT - 8],
      ],
      geo,
    );
    const path = geoPath(projection);
    return geo.features.flatMap((feature) => {
      const ibge = String(feature.properties?.id ?? "").padStart(7, "0");
      const d = path(feature as never);
      if (!ibge || !d) return [];
      return [{ ibge, d }];
    });
  }, [geo]);

  const onShapeMove = useCallback((ibge: string, event: ReactMouseEvent<SVGPathElement>) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    setCursor({
      ibge,
      x,
      y,
      flipX: x > rect.width * 0.58,
      flipY: y > rect.height * 0.62,
    });
  }, []);

  const onShapeClick = useCallback((ibge: string) => {
    if (skipClick.current) {
      skipClick.current = false;
      return;
    }
    onSelect(ibge);
  }, [onSelect]);

  function onPointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    if (event.button !== 0) return;
    skipClick.current = false;
    dragRef.current = { x: event.clientX, y: event.clientY, view, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 5) return;
    drag.moved = true;
    skipClick.current = true;
    const scaleX = drag.view.w / rect.width;
    const scaleY = drag.view.h / rect.height;
    setView(clampView({ ...drag.view, x: drag.view.x - dx * scaleX, y: drag.view.y - dy * scaleY }));
  }

  function onPointerUp() {
    dragRef.current = null;
  }

  if (!geo || shapes.length === 0) {
    return (
      <div className="flex aspect-[640/680] w-full items-center justify-center rounded-3xl bg-neutral-50">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-neutral-200 border-t-neutral-900" />
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="relative">
      <svg
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-auto w-full touch-none select-none"
        role="img"
        aria-label="Mapa do Brasil por município"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onMouseLeave={() => setCursor(null)}
      >
        <Shapes
          shapes={shapes}
          fills={fills}
          activeIbge={activeIbge}
          onShapeMove={onShapeMove}
          onShapeClick={onShapeClick}
        />
      </svg>
      {cursor ? (
        <div
          className="pointer-events-none absolute z-20 w-52 rounded-2xl border border-neutral-200 bg-white p-2.5 shadow-lg"
          style={{
            left: cursor.x,
            top: cursor.y,
            transform: `translate(${cursor.flipX ? "calc(-100% - 14px)" : "14px"}, ${cursor.flipY ? "calc(-100% - 8px)" : "14px"})`,
          }}
        >
          {tip(cursor.ibge)}
        </div>
      ) : null}
      <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
        <button
          type="button"
          aria-label="Aproximar o mapa"
          onClick={() => setView((current) => zoomAround(current, 1 / 1.6))}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-950 shadow-md"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="10.5" cy="10.5" r="6.25" stroke="currentColor" strokeWidth="1.8" />
            <path d="M15.2 15.2 20 20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M10.5 8v5M8 10.5h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
        <button
          type="button"
          aria-label="Afastar o mapa"
          onClick={() => setView((current) => zoomAround(current, 1.6))}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-950 shadow-md"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="10.5" cy="10.5" r="6.25" stroke="currentColor" strokeWidth="1.8" />
            <path d="M15.2 15.2 20 20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M8 10.5h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
