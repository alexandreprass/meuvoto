/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");

const [, , csvPathArg] = process.argv;
if (!csvPathArg) {
  console.error("Uso: node scripts/import-tse-senators.js caminho/consulta_cand_2026_BRASIL.csv");
  process.exit(1);
}

const csvPath = path.resolve(csvPathArg);
const placeholder = "/candidates/senators/placeholder.svg";
const electionId = "20322002026";
const palette = ["#2563EB", "#DC2626", "#059669", "#D97706", "#7C3AED", "#0891B2", "#BE123C", "#4D7C0F", "#9333EA", "#0F766E", "#B45309", "#1D4ED8"];
const cargos = {
  SENADOR: { office: "senador", output: "senators.json" },
  "DEPUTADO FEDERAL": { office: "deputado_federal", output: "federal-deputies.json" },
  "DEPUTADO ESTADUAL": { office: "deputado_estadual", output: "state-deputies.json" },
  "DEPUTADO DISTRITAL": { office: "deputado_estadual", output: "state-deputies.json" },
};

function parseCsvLine(line) {
  const cells = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') { current += '"'; index += 1; continue; }
    if (char === '"') { quoted = !quoted; continue; }
    if (char === ";" && !quoted) { cells.push(current); current = ""; continue; }
    current += char;
  }
  cells.push(current);
  return cells;
}

function slug(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const content = fs.readFileSync(csvPath, "latin1");
const [headerLine, ...lines] = content.split(/\r?\n/).filter(Boolean);
const headers = parseCsvLine(headerLine);
const datasets = Object.fromEntries(Object.values(cargos).map(({ office }) => [office, { states: {}, seen: new Set() }]));

for (const line of lines) {
  const values = parseCsvLine(line);
  const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  const config = cargos[(row.DS_CARGO || "").toUpperCase()];
  if (!config) continue;
  const uf = (row.SG_UF || row.SG_UE || "").toUpperCase();
  const sq = row.SQ_CANDIDATO;
  const dataset = datasets[config.office];
  if (!uf || uf.length !== 2 || !sq || dataset.seen.has(sq)) continue;
  dataset.seen.add(sq);
  if (!dataset.states[uf]) dataset.states[uf] = [];
  const index = dataset.states[uf].length;
  dataset.states[uf].push({
    id: config.office + "-" + uf.toLowerCase() + "-" + slug(row.NM_URNA_CANDIDATO || row.NM_CANDIDATO) + "-" + row.NR_CANDIDATO,
    name: row.NM_URNA_CANDIDATO || row.NM_CANDIDATO,
    fullName: row.NM_CANDIDATO || row.NM_URNA_CANDIDATO,
    party: row.SG_PARTIDO,
    number: row.NR_CANDIDATO,
    photo: "https://divulgacandcontas.tse.jus.br/divulga/rest/arquivo/img/" + electionId + "/" + sq + "/" + uf,
    fallbackPhoto: placeholder,
    color: palette[index % palette.length],
    state: uf,
    source: "TSE SQ_CANDIDATO " + sq,
  });
}

for (const config of Object.values(cargos)) {
  const dataset = datasets[config.office];
  const outputPath = path.resolve("data", config.output);
  fs.writeFileSync(outputPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    source: "Portal de Dados Abertos do TSE - Candidatos 2026 / consulta_cand_2026",
    states: dataset.states,
  }, null, 2) + "\n");
  console.log("[import-tse] " + dataset.seen.size + " candidatos em " + outputPath);
}
