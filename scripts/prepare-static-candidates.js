const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const output = path.join(root, "public", "candidate-data");
const sources = [
  ["senador", "senators.json"],
  ["deputado_federal", "federal-deputies.json"],
  ["deputado_estadual", "state-deputies.json"],
];

fs.rmSync(output, { recursive: true, force: true });
for (const [office, filename] of sources) {
  const data = JSON.parse(fs.readFileSync(path.join(root, "data", filename), "utf8"));
  const officeDir = path.join(output, office);
  fs.mkdirSync(officeDir, { recursive: true });
  for (const [uf, candidates] of Object.entries(data.states ?? {})) {
    fs.writeFileSync(path.join(officeDir, `${uf}.json`), JSON.stringify(candidates));
  }
}

const presidents = [
  { id: "flavio-bolsonaro", name: "Flávio Bolsonaro", fullName: "Flávio Bolsonaro", party: "PL", number: "22", photo: "/candidates/flavio-bolsonaro.jpg", color: "#1D4ED8", sq: "280002551544", tseUf: "BR" },
  { id: "lula", name: "Lula", fullName: "Luiz Inácio Lula da Silva", party: "PT", number: "13", photo: "/candidates/lula.jpg", color: "#DC2626", sq: "280002542548", tseUf: "BR" },
  { id: "renan-santos", name: "Renan Santos", fullName: "Renan Santos", party: "Missão", number: "14", photo: "/candidates/renan-santos.jpg", color: "#CA8A04", sq: "280002540694", tseUf: "BR" },
  { id: "augusto-cury", name: "Augusto Cury", fullName: "Augusto Cury", party: "Avante", number: "70", photo: "/candidates/augusto-cury.jpg", color: "#7C3AED", sq: "280002551547", tseUf: "BR" },
  { id: "ronaldo-caiado", name: "Ronaldo Caiado", fullName: "Ronaldo Caiado", party: "PSD", number: "55", photo: "/candidates/ronaldo-caiado.jpg", color: "#0891B2", sq: "280002551932", tseUf: "BR" },
  { id: "zema", name: "Zema", fullName: "Romeu Zema", party: "Novo", number: "30", photo: "/candidates/zema.jpg", color: "#EA580C", sq: "280002539826", tseUf: "BR" },
];
const presidentDir = path.join(output, "presidente");
fs.mkdirSync(presidentDir, { recursive: true });
fs.writeFileSync(path.join(presidentDir, "BR.json"), JSON.stringify(presidents));
console.log("Generated static candidate JSON files.");
