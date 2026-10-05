import { writeFileSync } from "node:fs";

const source = "https://raw.githubusercontent.com/tbrugz/geodata-br/master/geojson/geojs-100-mun.json";
const response = await fetch(source);
if (!response.ok) throw new Error(`mapa ${response.status}`);
const geo = await response.json();

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
  if (ring.length < 20) return ring;
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
    return thin(rounded, 0.008);
  }
  return coords.map((part) => cleanCoords(part));
}

const features = [];
for (const feature of geo.features) {
  const id = String(feature.properties?.id ?? "").padStart(7, "0");
  if (!id || id === "0000000" || !feature.geometry) continue;
  features.push({
    type: "Feature",
    properties: { id },
    geometry: { type: feature.geometry.type, coordinates: cleanCoords(feature.geometry.coordinates) },
  });
}

const text = JSON.stringify({ type: "FeatureCollection", features });
writeFileSync(new URL("../public/brazil-municipios.geojson", import.meta.url), text);
console.log(`${features.length} municípios, ${(text.length / 1024 / 1024).toFixed(1)} MB`);
