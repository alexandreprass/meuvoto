"use client";

import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { geoMercator, geoPath } from "d3-geo";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { IBGE_TO_UF, UF_MAP } from "@/lib/states";
import { assetUrl } from "@/lib/asset-url";

type GeoProps = { codarea?: string };
type BrazilFeature = Feature<Geometry, GeoProps>;
type BrazilCollection = FeatureCollection<Geometry, GeoProps>;

export type MapHoverPos = { x: number; y: number };

export type MapStamp = { top: string; bottom: string; ink: string };

type Props = {
  activeUf: string | null;
  onHover: (uf: string | null, pos?: MapHoverPos) => void;
  onSelect: (uf: string) => void;
  fills?: Record<string, string>;
  stamps?: Record<string, MapStamp>;
};

function localPos(e: MouseEvent<SVGElement>): MapHoverPos {
  const node = (e.currentTarget.ownerSVGElement ?? e.currentTarget) as SVGSVGElement;
  const rect = node.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  };
}

const WIDTH = 640;
const HEIGHT = 680;

function MapStamps({
  path,
  features,
  stamps,
}: {
  path: ReturnType<typeof geoPath>;
  features: BrazilFeature[];
  stamps: Record<string, MapStamp>;
}) {
  const inside: { uf: string; stamp: MapStamp; x: number; y: number; size: number }[] = [];
  const pending: { uf: string; stamp: MapStamp; x1: number; y: number }[] = [];

  for (const feature of features) {
    const uf = IBGE_TO_UF[String(feature.properties?.codarea ?? "")];
    const stamp = uf ? stamps[uf] : undefined;
    if (!uf || !stamp) continue;
    const [x, y] = path.centroid(feature as never);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    const [[x0, y0], [x1, y1]] = path.bounds(feature as never);
    const boxW = x1 - x0;
    const boxH = y1 - y0;
    if (boxW >= 48 && boxH >= 36) {
      inside.push({ uf, stamp, x, y, size: boxW > 100 ? 12 : boxW > 64 ? 9 : 8 });
    } else {
      pending.push({ uf, stamp, x1, y });
    }
  }

  pending.sort((a, b) => a.y - b.y);
  let cursor = 28;
  const outside = pending.map((item) => {
    const labelY = Math.max(item.y, cursor);
    cursor = labelY + 30;
    return { ...item, labelX: WIDTH - 132, labelY };
  });

  return (
    <>
      {inside.map((item) => (
        <text key={`stamp-${item.uf}`} x={item.x} y={item.y} textAnchor="middle" fontWeight={700} fill={item.stamp.ink} pointerEvents="none">
          <tspan x={item.x} dy="-0.45em" fontSize={item.size}>{item.stamp.top}</tspan>
          <tspan x={item.x} dy="1.25em" fontSize={item.size}>{item.stamp.bottom}</tspan>
        </text>
      ))}
      {outside.map((item) => {
        const elbow = Math.min(item.x1 + 16, item.labelX - 8);
        return (
          <g key={`out-${item.uf}`} pointerEvents="none">
            <path d={`M ${item.x1 + 1} ${item.y} H ${elbow} L ${item.labelX - 4} ${item.labelY}`} fill="none" stroke="#111111" strokeWidth={1} />
            <text x={item.labelX} y={item.labelY} textAnchor="start" fontWeight={700} fill="#171717">
              <tspan x={item.labelX} dy="-0.4em" fontSize={11}>{item.stamp.top}</tspan>
              <tspan x={item.labelX} dy="1.2em" fontSize={11}>{item.stamp.bottom}</tspan>
            </text>
          </g>
        );
      })}
    </>
  );
}

export function BrazilMap({ activeUf, onHover, onSelect, fills, stamps }: Props) {
  const [geo, setGeo] = useState<BrazilCollection | null>(null);

  useEffect(() => {
    fetch(assetUrl("/brazil-states.geojson"))
      .then((r) => r.json())
      .then(setGeo)
      .catch(() => setGeo(null));
  }, []);

  const callouts = Boolean(stamps);
  const { path, features } = useMemo(() => {
    if (!geo)
      return {
        path: null as ReturnType<typeof geoPath> | null,
        features: [] as BrazilFeature[],
      };
    const projection = geoMercator().fitExtent(
      callouts
        ? [
            [18, 18],
            [WIDTH - 148, HEIGHT - 18],
          ]
        : [
            [12, 12],
            [WIDTH - 12, HEIGHT - 12],
          ],
      geo,
    );
    const generator = geoPath(projection);
    return { path: generator, features: geo.features };
  }, [geo, callouts]);

  if (!geo || !path) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-3xl bg-neutral-50">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-neutral-200 border-t-neutral-900" />
      </div>
    );
  }

  const ordered = [...features].sort((a, b) => {
    const ua = IBGE_TO_UF[String(a.properties?.codarea ?? "")];
    const ub = IBGE_TO_UF[String(b.properties?.codarea ?? "")];
    if (ua === activeUf) return 1;
    if (ub === activeUf) return -1;
    return 0;
  });
  const painted = Boolean(fills);

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="xMidYMid meet"
      className="h-auto w-full select-none"
      role="img"
      aria-label="Mapa do Brasil por estados"
      onMouseMove={(e) => {
        if (e.target === e.currentTarget) onHover(null);
      }}
      onMouseLeave={() => onHover(null)}
    >
      {ordered.map((feature, i) => {
        const ibge = String(feature.properties?.codarea ?? "");
        const uf = IBGE_TO_UF[ibge];
        const state = uf ? UF_MAP[uf] : undefined;
        if (!state) return null;
        const d = path(feature as never);
        if (!d) return null;
        const active = activeUf === state.uf;
        return (
          <path
            key={`${state.uf}-${i}`}
            d={d}
            fill={painted ? fills?.[state.uf] ?? "#ffffff" : state.color}
            fillOpacity={painted || active ? 1 : 0.9}
            fillRule="evenodd"
            stroke={painted || active ? "#111111" : "#ffffff"}
            strokeWidth={painted ? (active ? 1.8 : 1.15) : active ? 1.1 : 0.6}
            strokeLinejoin="round"
            className="cursor-pointer outline-none"
            aria-label={state.name}
            style={{ outline: "none" }}
            onMouseDown={(e) => e.preventDefault()}
            onMouseEnter={(e) => onHover(state.uf, localPos(e))}
            onMouseMove={(e) => onHover(state.uf, localPos(e))}
            onClick={() => onSelect(state.uf)}
          />
        );
      })}
      {stamps ? <MapStamps path={path} features={features} stamps={stamps} /> : null}
    </svg>
  );
}
