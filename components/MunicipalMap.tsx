"use client";

import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { assetUrl } from "@/lib/asset-url";
import { FLAVIO_RAMP, LULA_RAMP, MAP_EMPTY } from "@/lib/apuracao";

type Shape = { ibge: string; d: string };
type UfShape = { uf: string; d: string; x: number; y: number };
type MapFile = { w: number; h: number; p: [string, string][]; s?: [string, string, number, number][] };

type Props = {
  fills: Record<string, string>;
  marks: Record<string, string | null>;
  activeIbge: string | null;
  onSelect: (ibge: string) => void;
  tip: (ibge: string) => ReactNode;
};

const WIDTH = 640;
const HEIGHT = 680;
const MIN_VIEW = 70;
const GROUND = "#0F0E0D";
const MUNI_STROKE = "rgba(15,14,13,0.55)";
const BORDER = "0.4";
const ACTIVE_STROKE = "#FAFAF9";
const ACTIVE_WIDTH = "1.7";
const SVG_NS = "http://www.w3.org/2000/svg";
const SMALL = new Set(["DF", "SE", "AL", "RN", "PB", "ES", "RJ", "SC"]);
const NUDGE: Record<string, [number, number]> = {
  RN: [18, -14],
  PB: [22, 0],
  AL: [20, 4],
  SE: [16, 14],
  GO: [-14, -10],
  DF: [10, 20],
  ES: [14, 0],
  RJ: [8, 8],
};

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

function paintStroke(path: SVGPathElement, active: boolean) {
  path.setAttribute("stroke", active ? ACTIVE_STROKE : MUNI_STROKE);
  path.setAttribute("stroke-width", active ? ACTIVE_WIDTH : BORDER);
}

const PathLayer = memo(function PathLayer({ shapes }: { shapes: Shape[] }) {
  const ref = useRef<SVGGElement>(null);

  useLayoutEffect(() => {
    const group = ref.current;
    if (!group) return;
    const fragment = document.createDocumentFragment();
    for (const shape of shapes) {
      const path = document.createElementNS(SVG_NS, "path");
      path.setAttribute("d", shape.d);
      path.setAttribute("data-id", shape.ibge);
      path.setAttribute("fill", MAP_EMPTY);
      path.setAttribute("stroke", MUNI_STROKE);
      path.setAttribute("stroke-width", BORDER);
      path.setAttribute("stroke-linejoin", "round");
      path.setAttribute("vector-effect", "non-scaling-stroke");
      path.setAttribute("class", "cursor-pointer");
      fragment.appendChild(path);
    }
    group.replaceChildren(fragment);
  }, [shapes]);

  return <g ref={ref} className="munis" />;
});

const StateLayer = memo(function StateLayer({ states }: { states: UfShape[] }) {
  const ref = useRef<SVGGElement>(null);

  useLayoutEffect(() => {
    const group = ref.current;
    if (!group) return;
    const fragment = document.createDocumentFragment();
    for (const shape of states) {
      const path = document.createElementNS(SVG_NS, "path");
      path.setAttribute("d", shape.d);
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", GROUND);
      path.setAttribute("stroke-width", "1.35");
      path.setAttribute("stroke-linejoin", "round");
      path.setAttribute("vector-effect", "non-scaling-stroke");
      fragment.appendChild(path);
    }
    group.replaceChildren(fragment);
  }, [states]);

  return <g ref={ref} style={{ pointerEvents: "none" }} />;
});

export function MunicipalMap({ fills, marks, activeIbge, onSelect, tip }: Props) {
  const [shapes, setShapes] = useState<Shape[] | null>(null);
  const [states, setStates] = useState<UfShape[]>([]);
  const [view, setView] = useState<View>(HOME);
  const [cursor, setCursor] = useState<{ ibge: string; x: number; y: number; flipX: boolean; flipY: boolean } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const activeNode = useRef<SVGPathElement | null>(null);
  const hoverNode = useRef<SVGPathElement | null>(null);
  const activeRef = useRef<string | null>(null);
  const dragRef = useRef<{ x: number; y: number; view: View; moved: boolean } | null>(null);
  const skipClick = useRef(false);

  useEffect(() => {
    activeRef.current = activeIbge;
  }, [activeIbge]);

  useEffect(() => {
    fetch(assetUrl("/brazil-municipios.json"))
      .then((response) => response.json())
      .then((file: MapFile) => {
        setShapes(file.p.map(([ibge, d]) => ({ ibge, d })));
        setStates((file.s ?? []).map(([uf, d, x, y]) => ({ uf, d, x, y })));
      })
      .catch(() => setShapes(null));
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !shapes) return;
    const paths = svg.querySelectorAll("g.munis path");
    for (let index = 0; index < paths.length; index += 1) {
      const path = paths[index];
      const ibge = path.getAttribute("data-id") ?? "";
      path.setAttribute("fill", fills[ibge] ?? MAP_EMPTY);
    }
  }, [fills, shapes]);

  useEffect(() => {
    const previous = activeNode.current;
    if (previous) {
      paintStroke(previous, false);
      activeNode.current = null;
    }
    if (!activeIbge || !svgRef.current) return;
    const next = svgRef.current.querySelector(`path[data-id="${activeIbge}"]`);
    if (!(next instanceof SVGPathElement)) return;
    paintStroke(next, true);
    activeNode.current = next;
  }, [activeIbge, shapes]);

  const clearHover = useCallback(() => {
    const previous = hoverNode.current;
    hoverNode.current = null;
    if (previous) paintStroke(previous, previous.getAttribute("data-id") === activeRef.current);
  }, []);

  const onShapeMove = useCallback((event: ReactMouseEvent<SVGSVGElement>) => {
    const target = event.target;
    if (!(target instanceof SVGPathElement)) return;
    const ibge = target.getAttribute("data-id");
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!ibge || !rect) return;
    if (hoverNode.current !== target) {
      const previous = hoverNode.current;
      if (previous) paintStroke(previous, previous.getAttribute("data-id") === activeRef.current);
      hoverNode.current = target;
      if (ibge !== activeRef.current) {
        target.setAttribute("stroke", "rgba(250,250,249,0.9)");
        target.setAttribute("stroke-width", "1.15");
      }
    }
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

  const onShapeClick = useCallback((event: ReactMouseEvent<SVGSVGElement>) => {
    const target = event.target;
    if (!(target instanceof SVGPathElement)) return;
    const ibge = target.getAttribute("data-id");
    if (!ibge) return;
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

  if (!shapes) {
    return (
      <div className="flex aspect-[640/680] w-full items-center justify-center rounded-3xl" style={{ background: GROUND }}>
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-[#FAFAF9]" />
      </div>
    );
  }

  const showMarks = view.w > 240;

  return (
    <div ref={wrapRef} className="relative overflow-hidden rounded-3xl" style={{ background: GROUND }}>
      <svg
        ref={svgRef}
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-auto w-full touch-none select-none"
        style={{ background: GROUND }}
        role="img"
        aria-label="Mapa do Brasil por município"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onMouseMove={onShapeMove}
        onClick={onShapeClick}
        onMouseLeave={() => { clearHover(); setCursor(null); }}
      >
        <PathLayer shapes={shapes} />
        <StateLayer states={states} />
        {showMarks ? (
          <g style={{ pointerEvents: "none" }} fontFamily="inherit">
            {states.map((pin) => {
              const pct = marks[pin.uf];
              const small = SMALL.has(pin.uf);
              const [dx, dy] = NUDGE[pin.uf] ?? [0, 0];
              const x = pin.x + dx;
              const y = pin.y + dy;
              return (
                <text key={pin.uf} x={x} y={y} textAnchor="middle" fill="#FAFAF9" stroke={GROUND} strokeWidth="2.4" paintOrder="stroke" strokeLinejoin="round" fontWeight={600}>
                  {small ? (
                    <tspan fontSize={10}>{pin.uf}{pct ? ` ${pct}%` : ""}</tspan>
                  ) : (
                    <>
                      <tspan x={x} dy={-5} fontSize={13}>{pin.uf}</tspan>
                      {pct ? <tspan x={x} dy={12} fontSize={11} fontWeight={500}>{pct}%</tspan> : null}
                    </>
                  )}
                </text>
              );
            })}
          </g>
        ) : null}
      </svg>
      {cursor ? (
        <div
          className="pointer-events-none absolute z-20 w-52 rounded-2xl border border-white/10 bg-[#151412] p-2.5 shadow-lg"
          style={{
            left: cursor.x,
            top: cursor.y,
            transform: `translate(${cursor.flipX ? "calc(-100% - 14px)" : "14px"}, ${cursor.flipY ? "calc(-100% - 8px)" : "14px"})`,
          }}
        >
          {tip(cursor.ibge)}
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-white/10 px-3 py-2">
        <Ramp name="Lula" colors={LULA_RAMP} />
        <Ramp name="Flávio" colors={FLAVIO_RAMP} />
        <span className="text-[10px] text-[#A6A39C]">até 10 · 25 · 45 · mais pontos</span>
      </div>
      <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
        <button
          type="button"
          aria-label="Aproximar o mapa"
          onClick={() => setView((current) => zoomAround(current, 1 / 1.6))}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-[#1B1A17] text-[#FAFAF9]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="10.5" cy="10.5" r="6.25" stroke="currentColor" strokeWidth="1.8" />
            <path d="M15.2 15.2 20 20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M10.5 8v5M8 10.5h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
        <button
          type="button"
          aria-label="Afastar o mapa"
          onClick={() => setView((current) => zoomAround(current, 1.6))}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-[#1B1A17] text-[#FAFAF9]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="10.5" cy="10.5" r="6.25" stroke="currentColor" strokeWidth="1.8" />
            <path d="M15.2 15.2 20 20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M8 10.5h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function Ramp({ name, colors }: { name: string; colors: readonly string[] }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="text-[11px] text-[#D6D4CF]">{name}</span>
      <span className="flex">
        {colors.map((color, index) => (
          <i
            key={color}
            className={`block h-2.5 w-3 ${index === 0 ? "rounded-l-sm" : ""} ${index === colors.length - 1 ? "rounded-r-sm" : ""}`}
            style={{ background: color }}
          />
        ))}
      </span>
    </span>
  );
}
