"use client";

import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { assetUrl } from "@/lib/asset-url";
import { FLAVIO_RAMP, FLAVIO_SOLID, LULA_RAMP, LULA_SOLID, MAP_EMPTY } from "@/lib/apuracao";
import { useNightMode } from "./ThemeToggle";

type Shape = { ibge: string; d: string };
type UfShape = { uf: string; d: string; x: number; y: number };
type MapFile = { w: number; h: number; p: [string, string][]; s?: [string, string, number, number][] };

export type MapMode = "municipal" | "estadual";

type Props = {
  mode: MapMode;
  fills: Record<string, string>;
  stateFills: Record<string, string>;
  activeIbge: string | null;
  activeUf: string | null;
  focusUf: string | null;
  focusPrefix: string | null;
  onSelect: (ibge: string) => void;
  onSelectState: (uf: string) => void;
  tip: (ibge: string) => ReactNode;
  stateTip: (uf: string) => ReactNode;
};

const WIDTH = 640;
const HEIGHT = 680;
const MIN_VIEW = 70;
const MUNI_STROKE = "#000000";
const DAY_EMPTY = "#ffffff";
const DAY_SEAM = "#000000";
const DAY_ACTIVE = "#171717";
const BORDER = "0.45";
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

function zoomOut(view: View, home: View): View {
  const w = view.w * 1.6;
  const h = view.h * 1.6;
  if (w >= home.w || h >= home.h) return home;
  return { x: home.x + (home.w - w) / 2, y: home.y + (home.h - h) / 2, w, h };
}

function fitView(box: { x: number; y: number; width: number; height: number }): View {
  const pad = Math.max(box.width, box.height, 12) * 0.06;
  let w = box.width + pad * 2;
  let h = box.height + pad * 2;
  const frame = WIDTH / HEIGHT;
  if (w / h > frame) h = w / frame;
  else w = h * frame;
  return { x: box.x + box.width / 2 - w / 2, y: box.y + box.height / 2 - h / 2, w, h };
}

function clampView(view: View): View {
  const w = Math.min(WIDTH, Math.max(MIN_VIEW, view.w));
  const h = Math.min(HEIGHT, Math.max(MIN_VIEW * (HEIGHT / WIDTH), view.h));
  const x = Math.min(WIDTH - w * 0.35, Math.max(-w * 0.15, view.x));
  const y = Math.min(HEIGHT - h * 0.35, Math.max(-h * 0.15, view.y));
  return { x, y, w, h };
}

function nightOn() {
  return document.documentElement.classList.contains("dark");
}

function paintStroke(path: SVGPathElement, active: boolean) {
  const night = nightOn();
  path.setAttribute("stroke", active ? (night ? ACTIVE_STROKE : DAY_ACTIVE) : (night ? MUNI_STROKE : DAY_SEAM));
  path.setAttribute("stroke-width", active ? ACTIVE_WIDTH : BORDER);
}

const PathLayer = memo(function PathLayer({ shapes }: { shapes: Shape[] }) {
  const ref = useRef<SVGGElement>(null);

  useLayoutEffect(() => {
    const group = ref.current;
    if (!group) return;
    const night = nightOn();
    const fragment = document.createDocumentFragment();
    for (const shape of shapes) {
      const path = document.createElementNS(SVG_NS, "path");
      path.setAttribute("d", shape.d);
      path.setAttribute("data-id", shape.ibge);
      path.setAttribute("fill", night ? MAP_EMPTY : DAY_EMPTY);
      path.setAttribute("stroke", night ? MUNI_STROKE : DAY_SEAM);
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
      path.setAttribute("data-uf", shape.uf);
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", "#000000");
      path.setAttribute("stroke-width", "1.15");
      path.setAttribute("stroke-linejoin", "round");
      path.setAttribute("vector-effect", "non-scaling-stroke");
      fragment.appendChild(path);
    }
    group.replaceChildren(fragment);
  }, [states]);

  return <g ref={ref} className="estados" />;
});

export function MunicipalMap({ mode, fills, stateFills, activeIbge, activeUf, focusUf, focusPrefix, onSelect, onSelectState, tip, stateTip }: Props) {
  const night = useNightMode();
  const [shapes, setShapes] = useState<Shape[] | null>(null);
  const [states, setStates] = useState<UfShape[]>([]);
  const [view, setView] = useState<View>(HOME);
  const [cursor, setCursor] = useState<{ kind: "city" | "state"; id: string; x: number; y: number; flipX: boolean; flipY: boolean } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const activeNode = useRef<SVGPathElement | null>(null);
  const hoverNode = useRef<SVGPathElement | null>(null);
  const activeRef = useRef<string | null>(null);
  const dragRef = useRef<{ x: number; y: number; view: View; moved: boolean } | null>(null);
  const skipClick = useRef(false);
  const fittedRef = useRef<View>(HOME);

  useEffect(() => {
    activeRef.current = activeIbge;
  }, [activeIbge]);

  useEffect(() => {
    setCursor(null);
  }, [mode]);

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
    const empty = night ? MAP_EMPTY : DAY_EMPTY;
    const seam = night ? MUNI_STROKE : DAY_SEAM;
    const hot = night ? "rgba(250,250,249,0.9)" : "rgba(23,23,23,0.8)";
    const activeColor = night ? ACTIVE_STROKE : DAY_ACTIVE;
    svg.setAttribute("data-fills", String(Object.keys(fills).length));
    const paths = svg.querySelectorAll("g.munis path");
    for (let index = 0; index < paths.length; index += 1) {
      const path = paths[index];
      const ibge = path.getAttribute("data-id") ?? "";
      const raw = fills[ibge];
      const shown = mode === "municipal" && (!focusPrefix || ibge.startsWith(focusPrefix));
      if (shown) path.removeAttribute("display");
      else path.setAttribute("display", "none");
      path.setAttribute("fill", !raw || (!night && raw === MAP_EMPTY) ? empty : raw);
      const on = ibge === activeRef.current;
      const over = hoverNode.current === path && !on;
      path.setAttribute("stroke", on ? activeColor : over ? hot : seam);
      path.setAttribute("stroke-width", on ? ACTIVE_WIDTH : over ? "1.15" : BORDER);
    }
    const stateActive = night ? ACTIVE_STROKE : "#000000";
    svg.querySelectorAll("g.estados path").forEach((node) => {
      if (!(node instanceof SVGPathElement)) return;
      const uf = node.getAttribute("data-uf") ?? "";
      const selected = mode === "estadual" && uf === activeUf;
      const hideState = mode !== "estadual" || (focusUf && uf !== focusUf);
      if (hideState) node.setAttribute("display", "none");
      else node.removeAttribute("display");
      const color = stateFills[uf] || empty;
      node.setAttribute("fill", color);
      node.setAttribute("stroke", selected ? stateActive : color);
      node.setAttribute("stroke-width", selected ? "2.2" : "0.8");
      node.setAttribute("pointer-events", mode === "estadual" ? "auto" : "none");
    });
  }, [activeUf, fills, focusPrefix, focusUf, mode, night, shapes, stateFills]);

  useEffect(() => {
    if (mode !== "municipal" || !focusUf || !svgRef.current) {
      fittedRef.current = HOME;
      setView(HOME);
      return;
    }
    const node = svgRef.current.querySelector(`path[data-uf="${focusUf}"]`);
    if (!(node instanceof SVGGraphicsElement)) return;
    const hidden = node.getAttribute("display");
    node.removeAttribute("display");
    const box = node.getBBox();
    if (hidden) node.setAttribute("display", hidden);
    if (box.width < 1 || box.height < 1) return;
    const next = fitView(box);
    fittedRef.current = next;
    setView(next);
  }, [focusUf, mode, states]);

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
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const uf = target.getAttribute("data-uf");
    if (mode === "estadual") {
      if (!uf) return;
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      setCursor({ kind: "state", id: uf, x, y, flipX: x > rect.width * 0.58, flipY: y > rect.height * 0.62 });
      return;
    }
    const ibge = target.getAttribute("data-id");
    if (!ibge) return;
    if (hoverNode.current !== target) {
      const previous = hoverNode.current;
      if (previous) paintStroke(previous, previous.getAttribute("data-id") === activeRef.current);
      hoverNode.current = target;
      if (ibge !== activeRef.current) {
        target.setAttribute("stroke", "#000000");
        target.setAttribute("stroke-width", "1.8");
      }
    }
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    setCursor({
      kind: "city",
      id: ibge,
      x,
      y,
      flipX: x > rect.width * 0.58,
      flipY: y > rect.height * 0.62,
    });
  }, [mode]);

  const onShapeClick = useCallback((event: ReactMouseEvent<SVGSVGElement>) => {
    const target = event.target;
    if (!(target instanceof SVGPathElement)) return;
    if (skipClick.current) {
      skipClick.current = false;
      return;
    }
    if (mode === "estadual") {
      const uf = target.getAttribute("data-uf");
      if (uf) onSelectState(uf);
      return;
    }
    const ibge = target.getAttribute("data-id");
    if (ibge) onSelect(ibge);
  }, [mode, onSelect, onSelectState]);

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
      <div className="flex aspect-[640/680] w-full items-center justify-center">
        <div className="map-spin h-10 w-10 animate-spin rounded-full border-2" />
      </div>
    );
  }

  const showMarks = Boolean(focusUf) || view.w > 240;

  return (
    <div ref={wrapRef} className="relative overflow-hidden">
      <svg
        ref={svgRef}
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-auto w-full touch-none select-none"
        shapeRendering="optimizeSpeed"
        role="img"
        aria-label={mode === "estadual" ? "Mapa do Brasil por estado" : "Mapa do Brasil por município"}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onMouseMove={onShapeMove}
        onClick={onShapeClick}
        onMouseLeave={() => { clearHover(); setCursor(null); }}
      >
        {mode === "municipal" ? <PathLayer shapes={shapes} /> : null}
        <StateLayer states={states} />
        {showMarks ? (
          <g style={{ pointerEvents: "none" }} fontFamily="inherit">
            {states.filter((pin) => mode !== "municipal" || !focusUf || pin.uf === focusUf).map((pin) => {
              const small = SMALL.has(pin.uf);
              const [dx, dy] = focusUf ? [0, 0] : (NUDGE[pin.uf] ?? [0, 0]);
              const x = pin.x + dx;
              const y = pin.y + dy;
              return (
                <text key={pin.uf} className="muni-label" x={x} y={y} textAnchor="middle" strokeWidth="2.4" paintOrder="stroke" strokeLinejoin="round" fontWeight={600} fontSize={small ? 10 : 13}>
                  {pin.uf}
                </text>
              );
            })}
          </g>
        ) : null}
      </svg>
      {cursor ? (
        <div
          className="map-tip pointer-events-none absolute z-20 w-52 rounded-2xl border p-2.5 shadow-lg"
          style={{
            left: cursor.x,
            top: cursor.y,
            transform: `translate(${cursor.flipX ? "calc(-100% - 14px)" : "14px"}, ${cursor.flipY ? "calc(-100% - 8px)" : "14px"})`,
          }}
        >
          {cursor.kind === "city" ? tip(cursor.id) : stateTip(cursor.id)}
        </div>
      ) : null}
      <div className="map-legend flex flex-wrap items-center gap-x-3 gap-y-1 px-1 pt-2">
        {mode === "estadual" ? (
          <>
            <span className="flex items-center gap-1.5 text-[11px]"><i className="block h-2.5 w-3 rounded-sm" style={{ background: LULA_SOLID }} />Lula</span>
            <span className="flex items-center gap-1.5 text-[11px]"><i className="block h-2.5 w-3 rounded-sm" style={{ background: FLAVIO_SOLID }} />Flávio</span>
          </>
        ) : (
          <>
            <Ramp name="Lula" colors={LULA_RAMP} />
            <Ramp name="Flávio" colors={FLAVIO_RAMP} />
            <span className="text-[10px]">até 10 · 25 · 45 · mais pontos</span>
          </>
        )}
      </div>
      <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
        <button
          type="button"
          aria-label="Aproximar o mapa"
          onClick={() => setView((current) => zoomAround(current, 1 / 1.6))}
          className="map-zoom flex h-9 w-9 items-center justify-center rounded-full border"
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
          onClick={() => setView((current) => zoomOut(current, fittedRef.current))}
          className="map-zoom flex h-9 w-9 items-center justify-center rounded-full border"
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
      <span className="text-[11px]">{name}</span>
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
