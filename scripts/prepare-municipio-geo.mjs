import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { geoMercator, geoPath } from "d3-geo";

const localGeo = new URL("../public/brazil-municipios.geojson", import.meta.url);
const output = new URL("../public/brazil-municipios.json", import.meta.url);
const WIDTH = 640;
const HEIGHT = 680;

function roundRing(ring, digits) {
  const factor = 10 ** digits;
  const out = [];
  for (const point of ring) {
    const next = [Math.round(point[0] * factor) / factor, Math.round(point[1] * factor) / factor];
    const prev = out[out.length - 1];
    if (prev && prev[0] === next[0] && prev[1] === next[1]) continue;
    out.push(next);
  }
  if (out.length >= 2) {
    const first = out[0];
    const last = out[out.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) out.push([...first]);
  }
  return out.length >= 4 ? out : null;
}

function thin(ring, minDist) {
  if (ring.length < 12) return ring;
  const limit = minDist * minDist;
  const out = [ring[0]];
  for (let index = 1; index < ring.length - 1; index += 1) {
    const prev = out[out.length - 1];
    const dx = ring[index][0] - prev[0];
    const dy = ring[index][1] - prev[1];
    if (dx * dx + dy * dy >= limit) out.push(ring[index]);
  }
  out.push(ring[ring.length - 1]);
  const first = out[0];
  const last = out[out.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) out.push([...first]);
  return out.length >= 4 ? out : ring;
}

function cleanCoords(coords) {
  if (typeof coords[0] === "number") return coords;
  if (typeof coords[0][0] === "number") {
    const rounded = roundRing(coords, 3) ?? roundRing(coords, 4);
    if (!rounded) return coords;
    return thin(rounded, 0.012);
  }
  return coords.map((part) => cleanCoords(part));
}

let geo;
if (existsSync(localGeo)) {
  geo = JSON.parse(readFileSync(localGeo, "utf8"));
  geo = {
    type: "FeatureCollection",
    features: geo.features.map((feature) => ({
      type: "Feature",
      properties: { id: String(feature.properties?.id ?? "").padStart(7, "0") },
      geometry: {
        type: feature.geometry.type,
        coordinates: cleanCoords(feature.geometry.coordinates),
      },
    })),
  };
} else {
  const source = "https://raw.githubusercontent.com/tbrugz/geodata-br/master/geojson/geojs-100-mun.json";
  const response = await fetch(source);
  if (!response.ok) throw new Error(`mapa ${response.status}`);
  const raw = await response.json();
  geo = {
    type: "FeatureCollection",
    features: raw.features.flatMap((feature) => {
      const id = String(feature.properties?.id ?? "").padStart(7, "0");
      if (!id || id === "0000000" || !feature.geometry) return [];
      return [{
        type: "Feature",
        properties: { id },
        geometry: { type: feature.geometry.type, coordinates: cleanCoords(feature.geometry.coordinates) },
      }];
    }),
  };
}

const projection = geoMercator().fitExtent(
  [
    [8, 8],
    [WIDTH - 8, HEIGHT - 8],
  ],
  geo,
);
const path = geoPath(projection);
const factor = 10;
const round = (value) => Math.round(value * factor) / factor;
const parts = [];
for (const feature of geo.features) {
  const drawn = path(feature);
  if (!drawn) continue;
  const compact = drawn.replace(/-?\d*\.?\d+/g, (token) => String(round(Number(token))));
  parts.push(`["${feature.properties.id}","${compact}"]`);
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
  const drawn = uf ? path(feature) : null;
  if (!uf || !drawn) continue;
  const compact = drawn.replace(/-?\d*\.?\d+/g, (token) => String(round(Number(token))));
  const [x, y] = path.centroid(feature);
  outlines.push(`["${uf}","${compact}",${round(x)},${round(y)}]`);
}

const text = `{"w":${WIDTH},"h":${HEIGHT},"p":[${parts.join(",")}],"s":[${outlines.join(",")}]}`;
writeFileSync(output, text);
console.log(`${parts.length} municípios, ${outlines.length} estados, ${(text.length / 1024 / 1024).toFixed(2)} MB`);
