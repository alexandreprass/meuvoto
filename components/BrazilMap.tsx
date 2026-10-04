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

export type MapStamp = { ink: string };

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

function StateSiglas({
  path,
  features,
  stamps,
}: {
  path: ReturnType<typeof geoPath>;
  features: BrazilFeature[];
  stamps: Record<string, MapStamp>;
}) {
  const items: { uf: string; x: number; y: number; size: number; ink: string }[] = [];
  for (const feature of features) {
    const uf = IBGE_TO_UF[String(feature.properties?.codarea ?? "")];
    const stamp = uf ? stamps[uf] : undefined;
    if (!uf || !stamp) continue;
    const [x, y] = path.centroid(feature as never);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    const [[x0, y0], [x1, y1]] = path.bounds(feature as never);
    items.push({
      uf,
      x,
      y,
      size: Math.max(6.5, Math.min(15, (x1 - x0) * 0.3, (y1 - y0) * 0.46)),
      ink: stamp.ink,
    });
  }
  for (let pass = 0; pass < 6; pass++) {
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i];
        const b = items[j];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        const need = (a.size + b.size) * 1.05;
        if (dist > 0 && dist < need) {
          const scale = dist / need;
          a.size *= scale;
          b.size *= scale;
        }
      }
    }
  }
  return items.map((item) => (
    <text
      key={`uf-${item.uf}`}
      x={item.x}
      y={item.y}
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={item.size}
      fontWeight={700}
      fill={item.ink}
      pointerEvents="none"
    >
      {item.uf}
    </text>
  ));
}

export function BrazilMap({ activeUf, onHover, onSelect, fills, stamps }: Props) {
  const [geo, setGeo] = useState<BrazilCollection | null>(null);

  useEffect(() => {
    fetch(assetUrl("/brazil-states.geojson"))
      .then((r) => r.json())
      .then(setGeo)
      .catch(() => setGeo(null));
  }, []);

  const { path, features } = useMemo(() => {
    if (!geo)
      return {
        path: null as ReturnType<typeof geoPath> | null,
        features: [] as BrazilFeature[],
      };
    const projection = geoMercator().fitExtent(
      [
        [12, 12],
        [WIDTH - 12, HEIGHT - 12],
      ],
      geo,
    );
    const generator = geoPath(projection);
    return { path: generator, features: geo.features };
  }, [geo]);

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
      {stamps ? <StateSiglas path={path} features={features} stamps={stamps} /> : null}
    </svg>
  );
}
