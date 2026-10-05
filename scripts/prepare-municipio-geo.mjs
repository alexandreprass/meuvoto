import { writeFileSync } from "node:fs";
import { geoIdentity, geoMercator, geoPath } from "d3-geo";
import { feature, mesh } from "topojson-client";
import { topology } from "topojson-server";
import { presimplify, simplify } from "topojson-simplify";

const output = new URL("../public/brazil-municipios.json", import.meta.url);
const WIDTH = 640;
const HEIGHT = 680;
const MIN_WEIGHT = 0.35;

const IBGE_UF = {
  11: "RO", 12: "AC", 13: "AM", 14: "RR", 15: "PA", 16: "AP", 17: "TO",
  21: "MA", 22: "PI", 23: "CE", 24: "RN", 25: "PB", 26: "PE", 27: "AL", 28: "SE", 29: "BA",
  31: "MG", 32: "ES", 33: "RJ", 35: "SP", 41: "PR", 42: "SC", 43: "RS",
  50: "MS", 51: "MT", 52: "GO", 53: "DF",
};

function snap(value) {
  return Math.round(value * 4) / 4;
}

function projectRing(ring, projection) {
  const out = [];
  for (const point of ring) {
    const xy = projection(point);
    if (!xy || !Number.isFinite(xy[0]) || !Number.isFinite(xy[1])) continue;
    const next = [snap(xy[0]), snap(xy[1])];
    const prev = out[out.length - 1];
    if (prev && prev[0] === next[0] && prev[1] === next[1]) continue;
    out.push(next);
  }
  if (out.length < 4) return null;
  const first = out[0];
  const last = out[out.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) out.push([first[0], first[1]]);
  return out.length >= 4 ? out : null;
}

function projectGeometry(geometry, projection) {
  const convert = (polygon) => {
    const rings = [];
    for (const ring of polygon) {
      const projected = projectRing(ring, projection);
      if (projected) rings.push(projected);
    }
    return rings.length ? rings : null;
  };
  if (geometry?.type === "Polygon") {
    const rings = convert(geometry.coordinates);
    return rings ? { type: "Polygon", coordinates: rings } : null;
  }
  if (geometry?.type === "MultiPolygon") {
    const polygons = [];
    for (const polygon of geometry.coordinates) {
      const rings = convert(polygon);
      if (rings) polygons.push(rings);
    }
    return polygons.length ? { type: "MultiPolygon", coordinates: polygons } : null;
  }
  return null;
}

function num(value) {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function ringPath(ring) {
  let d = `M${num(ring[0][0])} ${num(ring[0][1])}`;
  for (let index = 1; index < ring.length - 1; index += 1) d += `L${num(ring[index][0])} ${num(ring[index][1])}`;
  return `${d}Z`;
}

function ufOf(geometry) {
  const id = String(geometry?.properties?.id ?? "");
  return IBGE_UF[Number(id.slice(0, 2))] ?? "";
}

function linePath(geometry) {
  const lines = geometry?.type === "LineString" ? [geometry.coordinates] : geometry?.type === "MultiLineString" ? geometry.coordinates : [];
  let d = "";
  for (const line of lines) {
    if (line.length < 2) continue;
    d += `M${num(line[0][0])} ${num(line[0][1])}`;
    for (let index = 1; index < line.length; index += 1) d += `L${num(line[index][0])} ${num(line[index][1])}`;
  }
  return d;
}

function geometryPath(geometry) {
  const polygons = geometry?.type === "Polygon" ? [geometry.coordinates] : geometry?.type === "MultiPolygon" ? geometry.coordinates : [];
  let d = "";
  for (const polygon of polygons) {
    if (!polygon[0] || polygon[0].length < 4) continue;
    d += ringPath(polygon[0]);
    for (let index = 1; index < polygon.length; index += 1) {
      if (polygon[index].length >= 4) d += ringPath(polygon[index]);
    }
  }
  return d;
}

const source = "https://raw.githubusercontent.com/tbrugz/geodata-br/master/geojson/geojs-100-mun.json";
const response = await fetch(source);
if (!response.ok) throw new Error(`mapa ${response.status}`);
const raw = await response.json();
const projection = geoMercator().fitExtent(
  [
    [8, 8],
    [WIDTH - 8, HEIGHT - 8],
  ],
  raw,
);

const features = [];
for (const item of raw.features) {
  const id = String(item.properties?.id ?? "").padStart(7, "0");
  if (!id || id === "0000000" || !item.geometry) continue;
  const geometry = projectGeometry(item.geometry, projection);
  if (!geometry) continue;
  features.push({ type: "Feature", properties: { id }, geometry });
}

const topo = topology({ mun: { type: "FeatureCollection", features } });
const simplified = simplify(presimplify(topo), MIN_WEIGHT);
const municipalities = feature(simplified, simplified.objects.mun);
const parts = [];
for (const item of municipalities.features) {
  const id = String(item.properties?.id ?? "").padStart(7, "0");
  const drawn = geometryPath(item.geometry);
  if (id && drawn) parts.push(`["${id}","${drawn}"]`);
}

const identity = geoPath(geoIdentity());
const byUf = new Map();
for (const item of municipalities.features) {
  const id = String(item.properties?.id ?? "").padStart(7, "0");
  const uf = IBGE_UF[Number(id.slice(0, 2))];
  const drawn = geometryPath(item.geometry);
  if (!uf || !drawn) continue;
  if (!byUf.has(uf)) byUf.set(uf, { d: "", sx: 0, sy: 0, sa: 0 });
  const group = byUf.get(uf);
  group.d += drawn;
  const area = Math.abs(identity.area(item));
  const [x, y] = identity.centroid(item);
  if (area > 0 && Number.isFinite(x) && Number.isFinite(y)) {
    group.sx += x * area;
    group.sy += y * area;
    group.sa += area;
  }
}
const outlines = [];
for (const [uf, group] of byUf) {
  if (!group.d || group.sa <= 0) continue;
  outlines.push(`["${uf}","${group.d}",${num(group.sx / group.sa)},${num(group.sy / group.sa)}]`);
}

const borders = linePath(mesh(simplified, simplified.objects.mun, (left, right) => {
  const a = ufOf(left);
  const b = ufOf(right);
  return a !== "" && b !== "" && a !== b;
}));
const text = `{"w":${WIDTH},"h":${HEIGHT},"b":${JSON.stringify(borders)},"p":[${parts.join(",")}],"s":[${outlines.join(",")}]}`;
writeFileSync(output, text);
console.log(`${parts.length} municípios, ${outlines.length} estados, ${(text.length / 1024 / 1024).toFixed(2)} MB`);
