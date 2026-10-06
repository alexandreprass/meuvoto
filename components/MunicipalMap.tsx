"use client";

import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { assetUrl } from "@/lib/asset-url";
import { FLAVIO_RAMP, FLAVIO_SOLID, LULA_RAMP, LULA_SOLID, MAP_EMPTY } from "@/lib/apuracao";
import { useNightMode } from "./ThemeToggle";

type Shape = { ibge: string; d: string };
type UfShape = { uf: string; d: string; x: number; y: number };
type MapFile = { w: number; h: number; b?: string; p: [string, string][]; s?: [string, string, number, number][] };

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
const PAGE_NIGHT = "#0F0E0D";
const PAGE_DAY = "#ffffff";
const DAY_SEAM = "#000000";
const DAY_ACTIVE = "#171717";
const BORDER = "0.25";
const STATE_BORDER = "1.8";
const ACTIVE_STROKE = "#FAFAF9";
const ACTIVE_WIDTH = "1.7";
const LULA_STRONG = "#991B1B";
const FLAVIO_STRONG = "#14532D";
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

function zoomAt(view: View, factor: number, fx: number, fy: number): View {
  const w = Math.min(WIDTH, Math.max(MIN_VIEW, view.w * factor));
  const h = Math.min(HEIGHT, Math.max(MIN_VIEW * (HEIGHT / WIDTH), view.h * factor));
  const ax = view.x + view.w * fx;
  const ay = view.y + view.h * fy;
  return clampView({ x: ax - w * fx, y: ay - h * fy, w, h });
}

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

function strongerWinner(color: string) {
  const hex = color.trim().toLowerCase();
  if (hex === LULA_SOLID.toLowerCase()) return LULA_STRONG;
  if (hex === FLAVIO_SOLID.toLowerCase()) return FLAVIO_STRONG;
  return color;
}

function applyViewBox(svg: SVGSVGElement, view: View) {
  svg.setAttribute("viewBox", `${view.x} ${view.y} ${view.w} ${view.h}`);
}

function paintStroke(path: SVGPathElement, active: boolean) {
  const night = nightOn();
  path.setAttribute("stroke", active ? (night ? ACTIVE_STROKE : DAY_ACTIVE) : (night ? MUNI_STROKE : DAY_SEAM));
  path.setAttribute("stroke-width", active ? ACTIVE_WIDTH : BORDER);
}

const CITY_SCALE = 3;

const CityCanvas = memo(function CityCanvas({ shapes, fills, focusPrefix, night, activeIbge, view, blitRef, hitRef }: { shapes: Shape[]; fills: Record<string, string>; focusPrefix: string | null; night: boolean; activeIbge: string | null; view: View; blitRef:  { current: ((next: View) => void) | null }; hitRef:  { current: HTMLCanvasElement | null } }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const cacheRef = useRef<HTMLCanvasElement | null>(null);
  const pathsRef = useRef<Path2D[]>([]);
  const idsRef = useRef<string[]>([]);
  const viewRef = useRef(view);
  viewRef.current = view;

  const paint = useCallback((next: View, sharp = true) => {
    const canvas = ref.current;
    const cache = cacheRef.current;
    if (!canvas || !cache) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const zoomed = next.w < WIDTH * 0.92;
    if (!sharp || !zoomed) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(cache, next.x * CITY_SCALE, next.y * CITY_SCALE, next.w * CITY_SCALE, next.h * CITY_SCALE, 0, 0, width, height);
    } else {
      const empty = night ? MAP_EMPTY : DAY_EMPTY;
      const page = night ? PAGE_NIGHT : PAGE_DAY;
      ctx.setTransform(width / next.w, 0, 0, height / next.h, -next.x * width / next.w, -next.y * height / next.h);
      ctx.fillStyle = page;
      ctx.fillRect(next.x - 2, next.y - 2, next.w + 4, next.h + 4);
      ctx.lineWidth = Math.max(0.15, next.w / width);
      ctx.strokeStyle = "#000000";
      const paths = pathsRef.current;
      const ids = idsRef.current;
      for (let index = 0; index < paths.length; index += 1) {
        const ibge = ids[index];
        if (focusPrefix && !ibge.startsWith(focusPrefix)) continue;
        const raw = fills[ibge];
        ctx.fillStyle = !raw || (!night && raw === MAP_EMPTY) ? empty : raw;
        ctx.fill(paths[index]);
        ctx.stroke(paths[index]);
      }
    }
    if (!activeIbge) return;
    const index = idsRef.current.indexOf(activeIbge);
    const path = pathsRef.current[index];
    if (!path) return;
    ctx.save();
    ctx.setTransform(width / next.w, 0, 0, height / next.h, -next.x * width / next.w, -next.y * height / next.h);
    ctx.strokeStyle = night ? ACTIVE_STROKE : DAY_ACTIVE;
    ctx.lineWidth = 1.6 * next.w / width;
    ctx.stroke(path);
    ctx.restore();
  }, [activeIbge, fills, focusPrefix, night]);

  useLayoutEffect(() => {
    pathsRef.current = shapes.map((shape) => new Path2D(shape.d));
    idsRef.current = shapes.map((shape) => shape.ibge);
    const scale = CITY_SCALE;
    const cache = document.createElement("canvas");
    cache.width = WIDTH * scale;
    cache.height = HEIGHT * scale;
    const ctx = cache.getContext("2d");
    if (!ctx) return;
    const empty = night ? MAP_EMPTY : DAY_EMPTY;
    const page = night ? PAGE_NIGHT : PAGE_DAY;
    ctx.scale(scale, scale);
    ctx.fillStyle = page;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.lineWidth = 0.35;
    ctx.strokeStyle = "#000000";
    const paths = pathsRef.current;
    const ids = idsRef.current;
    for (let index = 0; index < paths.length; index += 1) {
      const ibge = ids[index];
      if (focusPrefix && !ibge.startsWith(focusPrefix)) continue;
      const raw = fills[ibge];
      ctx.fillStyle = !raw || (!night && raw === MAP_EMPTY) ? empty : raw;
      ctx.fill(paths[index]);
      ctx.stroke(paths[index]);
    }
    cacheRef.current = cache;

    const hit = document.createElement("canvas");
    hit.width = WIDTH;
    hit.height = HEIGHT;
    const hitCtx = hit.getContext("2d", { willReadFrequently: true });
    if (hitCtx) {
      hitCtx.fillStyle = "#000000";
      hitCtx.fillRect(0, 0, WIDTH, HEIGHT);
      for (let index = 0; index < paths.length; index += 1) {
        const ibge = ids[index];
        if (focusPrefix && !ibge.startsWith(focusPrefix)) continue;
        const id = index + 1;
        hitCtx.fillStyle = `rgb(${id & 255},${(id >> 8) & 255},${(id >> 16) & 255})`;
        hitCtx.fill(paths[index]);
      }
      hitRef.current = hit;
    }
    paint(viewRef.current);
  }, [fills, focusPrefix, night, paint, shapes]);

  useLayoutEffect(() => {
    blitRef.current = (next) => paint(next, false);
    paint(view, true);
    return () => {
      blitRef.current = null;
    };
  }, [blitRef, paint, view]);

  return <canvas ref={ref} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden />;
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
  const [borders, setBorders] = useState("");
  const [view, setView] = useState<View>(HOME);
  const [cursor, setCursor] = useState<{ kind: "city" | "state"; id: string; x: number; y: number; flipX: boolean; flipY: boolean } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const activeNode = useRef<SVGPathElement | null>(null);
  const hoverNode = useRef<SVGPathElement | null>(null);
  const activeRef = useRef<string | null>(null);
  const dragRef = useRef<{ x: number; y: number; view: View; pending: View | null; moved: boolean } | null>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const cityBlitRef = useRef<((next: View) => void) | null>(null);
  const cityHitRef = useRef<HTMLCanvasElement | null>(null);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{ dist: number; view: View; cx: number; cy: number; pending: View | null } | null>(null);
  const shapesRef = useRef<Shape[] | null>(null);
  const viewRef = useRef(view);
  const skipClick = useRef(false);
  const fittedRef = useRef<View>(HOME);

  useEffect(() => {
    activeRef.current = activeIbge;
  }, [activeIbge]);

  useEffect(() => {
    shapesRef.current = shapes;
  }, [shapes]);

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  useEffect(() => {
    setCursor(null);
  }, [mode]);

  useEffect(() => {
    fetch(assetUrl("/brazil-municipios.json"))
      .then((response) => response.json())
      .then((file: MapFile) => {
        setShapes(file.p.map(([ibge, d]) => ({ ibge, d })));
        setStates((file.s ?? []).map(([uf, d, x, y]) => ({ uf, d, x, y })));
        setBorders(file.b ?? "");
      })
      .catch(() => setShapes(null));
  }, []);

  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg || !shapes) return;
    const empty = night ? MAP_EMPTY : DAY_EMPTY;
    svg.querySelectorAll("g.estados path").forEach((node) => {
      if (!(node instanceof SVGPathElement)) return;
      const uf = node.getAttribute("data-uf") ?? "";
      const selected = mode === "estadual" && uf === activeUf;
      const hideState = mode !== "estadual" || (focusUf && uf !== focusUf);
      if (hideState) node.setAttribute("display", "none");
      else node.removeAttribute("display");
      const base = stateFills[uf] || empty;
      const color = selected ? strongerWinner(base) : base;
      node.setAttribute("fill", color);
      node.setAttribute("stroke", color);
      node.setAttribute("stroke-width", selected ? "1.2" : "0.8");
      node.setAttribute("pointer-events", mode === "estadual" ? "auto" : "none");
    });
  }, [activeUf, focusUf, mode, night, shapes, stateFills]);

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


  function pickCity(clientX: number, clientY: number, rect: DOMRect) {
    const hit = cityHitRef.current;
    const shapesNow = shapesRef.current;
    if (!hit || !shapesNow) return null;
    const current = dragRef.current?.pending ?? viewRef.current;
    const vx = current.x + ((clientX - rect.left) / rect.width) * current.w;
    const vy = current.y + ((clientY - rect.top) / rect.height) * current.h;
    const ctx = hit.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    const pixel = ctx.getImageData(Math.max(0, Math.min(WIDTH - 1, Math.floor(vx))), Math.max(0, Math.min(HEIGHT - 1, Math.floor(vy))), 1, 1).data;
    const id = pixel[0] + (pixel[1] << 8) + (pixel[2] << 16);
    return id ? shapesNow[id - 1]?.ibge ?? null : null;
  }

  const onShapeMove = useCallback((event: ReactMouseEvent<SVGSVGElement>) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const target = event.target;
    if (mode === "estadual") {
      if (!(target instanceof SVGPathElement)) return;
      const uf = target.getAttribute("data-uf");
      if (!uf) return;
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const flipX = x > rect.width * 0.58;
      const flipY = y > rect.height * 0.62;
      placeTip(x, y, flipX, flipY);
      setCursor((current) => current?.kind === "state" && current.id === uf ? current : { kind: "state", id: uf, x, y, flipX, flipY });
      return;
    }
    const ibge = pickCity(event.clientX, event.clientY, rect);
    if (!ibge) return;
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const flipX = x > rect.width * 0.58;
    const flipY = y > rect.height * 0.62;
    placeTip(x, y, flipX, flipY);
    setCursor((current) => current?.kind === "city" && current.id === ibge ? current : { kind: "city", id: ibge, x, y, flipX, flipY });
  }, [mode]);

  function placeTip(x: number, y: number, flipX: boolean, flipY: boolean) {
    const tip = tipRef.current;
    if (!tip) return;
    tip.style.left = `${x}px`;
    tip.style.top = `${y}px`;
    tip.style.transform = "translate(calc(-100% - 8px), -50%)";
  }

  const onShapeClick = useCallback((event: ReactMouseEvent<SVGSVGElement>) => {
    if (skipClick.current) {
      skipClick.current = false;
      return;
    }
    const target = event.target;
    if (mode === "estadual") {
      if (!(target instanceof SVGPathElement)) return;
      const uf = target.getAttribute("data-uf");
      if (uf) onSelectState(uf);
      return;
    }
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const ibge = pickCity(event.clientX, event.clientY, rect);
    if (ibge) onSelect(ibge);
  }, [mode, onSelect, onSelectState]);

  function onPointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    if (event.button !== 0) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    event.currentTarget.setPointerCapture(event.pointerId);
    if (pointersRef.current.size >= 2) {
      const pts = [...pointersRef.current.values()];
      pinchRef.current = { dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y), view: dragRef.current?.pending ?? viewRef.current, cx: (pts[0].x + pts[1].x) / 2, cy: (pts[0].y + pts[1].y) / 2, pending: null };
      dragRef.current = null;
      skipClick.current = true;
      return;
    }
    skipClick.current = false;
    dragRef.current = { x: event.clientX, y: event.clientY, view: viewRef.current, pending: null, moved: false };
  }

  function onPointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    if (!pointersRef.current.has(event.pointerId)) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const rect = event.currentTarget.getBoundingClientRect();
    const pinch = pinchRef.current;
    if (pinch && pointersRef.current.size >= 2) {
      const pts = [...pointersRef.current.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (pinch.dist < 1 || dist < 1) return;
      const next = zoomAt(pinch.view, pinch.dist / dist, (pinch.cx - rect.left) / rect.width, (pinch.cy - rect.top) / rect.height);
      pinch.pending = next;
      if (svgRef.current) applyViewBox(svgRef.current, next);
      cityBlitRef.current?.(next);
      return;
    }
    const drag = dragRef.current;
    if (!drag) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 5) return;
    drag.moved = true;
    skipClick.current = true;
    const scaleX = drag.view.w / rect.width;
    const scaleY = drag.view.h / rect.height;
    const next = clampView({ ...drag.view, x: drag.view.x - dx * scaleX, y: drag.view.y - dy * scaleY });
    drag.pending = next;
    if (svgRef.current) applyViewBox(svgRef.current, next);
    cityBlitRef.current?.(next);
  }

  function onPointerUp(event: ReactPointerEvent<SVGSVGElement>) {
    pointersRef.current.delete(event.pointerId);
    const pinch = pinchRef.current;
    if (pointersRef.current.size < 2) pinchRef.current = null;
    const pending = pinch?.pending ?? dragRef.current?.pending ?? null;
    if (pointersRef.current.size === 0) dragRef.current = null;
    if (pending && pointersRef.current.size < 2) setView(pending);
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
    <div ref={wrapRef} className="relative overflow-hidden" style={{ background: night ? PAGE_NIGHT : PAGE_DAY }}>
      {mode === "municipal" ? <CityCanvas shapes={shapes} fills={fills} focusPrefix={focusPrefix} night={night} activeIbge={activeIbge} view={view} blitRef={cityBlitRef} hitRef={cityHitRef} /> : null}
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
        <StateLayer states={states} />
        {borders ? (
          <path d={borders} fill="none" stroke="#000000" strokeWidth={STATE_BORDER} strokeLinejoin="round" vectorEffect="non-scaling-stroke" pointerEvents="none" />
        ) : null}
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
          ref={tipRef}
          className="map-tip pointer-events-none absolute z-20 w-[6.5rem] rounded-xl border p-1.5 pr-4 shadow-lg"
          style={{
            left: cursor.x,
            top: cursor.y,
            transform: "translate(calc(-100% - 8px), -50%)",
          }}
        >
          <button type="button" aria-label="Fechar" onClick={() => setCursor(null)} className="pointer-events-auto absolute top-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full text-xs leading-none text-neutral-400">×</button>
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
