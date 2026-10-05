import { readFileSync, writeFileSync } from "node:fs";
import { geoMercator, geoPath } from "d3-geo";

const output = new URL("../public/brazil-municipios.json", import.meta.url);
const WIDTH = 640;
const HEIGHT = 680;
const EPSILON = 1.8;

function close(points) {
  if (points.length < 3) return points;
  const first = points[0];
  const last = points[points.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) return [...points, [first[0], first[1]]];
  return points;
}

function simplify(points, epsilon) {
  const closed =
    points.length > 2 &&
    points[0][0] === points[points.length - 1][0] &&
    points[0][1] === points[points.length - 1][1];
  const open = closed ? points.slice(0, -1) : points.slice();
  if (open.length <= 3) return close(open);
  const keep = new Uint8Array(open.length);
  keep[0] = 1;
  keep[open.length - 1] = 1;
  const stack = [[0, open.length - 1]];
  const limit = epsilon * epsilon;
  while (stack.length) {
    const [start, end] = stack.pop();
    const ax = open[start][0];
    const ay = open[start][1];
    const bx = open[end][0];
    const by = open[end][1];
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    let max = 0;
    let index = -1;
    for (let cursor = start + 1; cursor < end; cursor += 1) {
      const px = open[cursor][0];
      const py = open[cursor][1];
      let dist;
      if (len2 === 0) {
        dist = (px - ax) ** 2 + (py - ay) ** 2;
      } else {
        let t = ((px - ax) * dx + (py - ay) * dy) / len2;
        if (t < 0) t = 0;
        else if (t > 1) t = 1;
        dist = (px - (ax + t * dx)) ** 2 + (py - (ay + t * dy)) ** 2;
      }
      if (dist > max) {
        max = dist;
        index = cursor;
      }
    }
    if (index !== -1 && max > limit) {
      keep[index] = 1;
      if (index - start > 1) stack.push([start, index]);
      if (end - index > 1) stack.push([index, end]);
    }
  }
  const out = [];
  for (let index = 0; index < open.length; index += 1) if (keep[index]) out.push(open[index]);
  return close(out);
}

function projectRing(ring, projection) {
  const out = [];
  for (const point of ring) {
    const xy = projection(point);
    if (!xy || !Number.isFinite(xy[0]) || !Number.isFinite(xy[1])) continue;
    const prev = out[out.length - 1];
    if (prev && Math.abs(prev[0] - xy[0]) < 0.05 && Math.abs(prev[1] - xy[1]) < 0.05) continue;
    out.push(xy);
  }
  return out;
}

function quantize(ring) {
  const out = [];
  for (const point of ring) {
    const next = [Math.round(point[0]), Math.round(point[1])];
    const prev = out[out.length - 1];
    if (prev && prev[0] === next[0] && prev[1] === next[1]) continue;
    out.push(next);
  }
  if (out.length < 3) return null;
  const first = out[0];
  const last = out[out.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) out.push([first[0], first[1]]);
  return out.length >= 4 ? out : null;
}

function boxRing(ring) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const point of ring) {
    minX = Math.min(minX, point[0]);
    minY = Math.min(minY, point[1]);
    maxX = Math.max(maxX, point[0]);
    maxY = Math.max(maxY, point[1]);
  }
  if (!Number.isFinite(minX)) return null;
  if (maxX - minX < 1) maxX = minX + 1;
  if (maxY - minY < 1) maxY = minY + 1;
  return quantize([
    [minX, minY],
    [maxX, minY],
    [maxX, maxY],
    [minX, maxY],
    [minX, minY],
  ]);
}

function ringPath(ring) {
  let d = `M${ring[0][0]} ${ring[0][1]}`;
  for (let index = 1; index < ring.length - 1; index += 1) d += `L${ring[index][0]} ${ring[index][1]}`;
  return `${d}Z`;
}

function ringArea(ring) {
  let sum = 0;
  for (let index = 0; index < ring.length - 1; index += 1) {
    sum += ring[index][0] * ring[index + 1][1] - ring[index + 1][0] * ring[index][1];
  }
  return Math.abs(sum);
}

function geometryPath(geometry, projection) {
  const polygons = geometry?.type === "Polygon" ? [geometry.coordinates] : geometry?.type === "MultiPolygon" ? geometry.coordinates : [];
  let d = "";
  for (const polygon of polygons) {
    const rings = [];
    for (const ring of polygon) {
      const projected = projectRing(ring, projection);
      if (projected.length >= 3) rings.push(projected);
    }
    if (rings.length === 0) continue;
    rings.sort((a, b) => ringArea(b) - ringArea(a));
    const shell = quantize(simplify(rings[0], EPSILON)) ?? boxRing(rings[0]);
    if (shell) d += ringPath(shell);
    for (let index = 1; index < rings.length; index += 1) {
      const hole = quantize(simplify(rings[index], EPSILON + 0.8));
      if (hole && ringArea(hole) > 12) d += ringPath(hole);
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
const path = geoPath(projection);
const round = (value) => Math.round(value);
const parts = [];
for (const feature of raw.features) {
  const id = String(feature.properties?.id ?? "").padStart(7, "0");
  if (!id || id === "0000000" || !feature.geometry) continue;
  const drawn = geometryPath(feature.geometry, projection);
  if (drawn) parts.push(`["${id}","${drawn}"]`);
}

const IBGE_UF = {
  11: "RO", 12: "AC", 13: "AM", 14: "RR", 15: "PA", 16: "AP", 17: "TO",
  21: "MA", 22: "PI", 23: "CE", 24: "RN", 25: "PB", 26: "PE", 27: "AL", 28: "SE", 29: "BA",
  31: "MG", 32: "ES", 33: "RJ", 35: "SP", 41: "PR", 42: "SC", 43: "RS",
  50: "MS", 51: "MT", 52: "GO", 53: "DF",
};
const states = JSON.parse(readFileSync(new URL("../public/brazil-states.geojson", import.meta.url), "utf8"));
const outlines = [];
for (const feature of states.features) {
  const uf = IBGE_UF[String(feature.properties?.codarea ?? "")];
  const drawn = uf ? geometryPath(feature.geometry, projection) : "";
  if (!uf || !drawn) continue;
  const [x, y] = path.centroid(feature);
  outlines.push(`["${uf}","${drawn}",${round(x)},${round(y)}]`);
}

const text = `{"w":${WIDTH},"h":${HEIGHT},"p":[${parts.join(",")}],"s":[${outlines.join(",")}]}`;
writeFileSync(output, text);
console.log(`${parts.length} municípios, ${outlines.length} estados, ${(text.length / 1024 / 1024).toFixed(2)} MB`);
