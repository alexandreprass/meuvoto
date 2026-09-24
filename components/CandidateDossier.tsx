"use client";

import { useState } from "react";
import type { Candidate, OfficeId } from "@/lib/offices";
import { OFFICES } from "@/lib/offices";
import { tseIdentity } from "@/lib/tse";
import { PartyBadge } from "./PartyBadge";
import { assetUrl } from "@/lib/asset-url";

type Asset = { description: string; value: number | null };
type Props = {
  candidate: Candidate;
  office: OfficeId;
  state: string;
  onClose: () => void;
  onChoose: () => void;
};

function parseAmount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = Number(value.includes(",") ? value.replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "") : value.replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

export function CandidateDossier({ candidate, office, state, onClose, onChoose }: Props) {
  const identity = tseIdentity(candidate);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [assetsError, setAssetsError] = useState("");
  const [assets, setAssets] = useState<Asset[] | null>(null);
  const [assetsGeneratedAt, setAssetsGeneratedAt] = useState<string | null>(null);

  async function loadAssets() {
    if (!identity) return;
    setLoadingAssets(true);
    setAssetsError("");
    try {
      const uf = office === "presidente" ? "BR" : candidate.state ?? state;
      const response = await fetch(assetUrl(`/candidate-assets/${office}/${uf}.json`));
      if (!response.ok) throw new Error("Os dados de patrim\u00f4nio deste cargo ainda n\u00e3o est\u00e3o dispon\u00edveis.");
      const payload: unknown = await response.json();
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("O arquivo de dados do TSE est\u00e1 em formato inesperado.");
      const record = payload as { candidates?: Record<string, unknown>; generatedAt?: string };
      const rawAssets = record.candidates?.[identity.sq];
      if (!Array.isArray(rawAssets)) throw new Error("Este candidato n\u00e3o consta no arquivo de bens do TSE.");
      const result = rawAssets.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item)).map((item) => ({
        description: typeof item.description === "string" ? item.description : "Bem declarado",
        value: parseAmount(item.value),
      }));
      setAssets(result);
      setAssetsGeneratedAt(typeof record.generatedAt === "string" ? record.generatedAt : null);
      if (result.length === 0) setAssetsError("O arquivo oficial consultado n\u00e3o lista bens para este candidato.");
    } catch (error) {
      setAssetsError(error instanceof Error ? error.message : "N\u00e3o foi poss\u00edvel abrir o arquivo de bens.");
    } finally {
      setLoadingAssets(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
      <button type="button" className="absolute inset-0 bg-neutral-950/50" aria-label="Fechar" onClick={onClose} />
      <div className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-3xl sm:p-6">
        <div className="flex items-start gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={candidate.photo.startsWith("/") ? assetUrl(candidate.photo) : candidate.photo} alt="" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = assetUrl(candidate.fallbackPhoto ?? "/candidates/senators/placeholder.svg"); }} className="h-20 w-16 shrink-0 rounded-md object-cover object-top" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">{OFFICES[office].label}</p>
            <div className="flex items-center gap-2"><h2 className="min-w-0 flex-1 text-xl font-semibold text-neutral-950">{candidate.name}</h2><PartyBadge party={candidate.party} size={34} /></div>
            <p className="text-sm text-neutral-500">{candidate.fullName}</p>
            <p className="text-sm text-neutral-500">{candidate.party} - {candidate.number}{candidate.state ? ` - ${candidate.state}` : ""}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="rounded-full p-2 text-neutral-400 hover:bg-neutral-100">x</button>
        </div>
        <button type="button" onClick={onChoose} className="mt-5 w-full rounded-full bg-neutral-950 py-3 text-sm font-semibold text-white hover:bg-neutral-800">ESCOLHER CANDIDATO</button>
        <p className="mt-2 text-center text-xs text-neutral-500">{"A escolha existe s\u00f3 enquanto esta p\u00e1gina estiver aberta."}</p>
        <section className="mt-5 rounded-2xl bg-neutral-50 p-4">
          <h3 className="font-semibold text-neutral-950">Ficha oficial</h3>
          <p className="mt-1 text-sm leading-relaxed text-neutral-600">Consulte os bens declarados e as contas de campanha do candidato nos dados do TSE.</p>
          {identity && (office === "presidente" || office === "senador" || office === "deputado_federal") ? <button type="button" onClick={loadAssets} disabled={loadingAssets} className="mt-4 inline-flex rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">{loadingAssets ? "Carregando dados salvos..." : "Ver patrim\u00f4nio aqui"}</button> : null}
          {assetsError ? <p role="status" className="mt-3 text-sm text-neutral-600">{assetsError}</p> : null}
          {assets && assets.length > 0 ? <>
            <p className="mt-3 text-xs text-neutral-500">Arquivo oficial do TSE baixado em {assetsGeneratedAt ? new Date(assetsGeneratedAt).toLocaleString("pt-BR") : "data indispon\u00edvel"}.</p>
            <ul className="mt-2 space-y-2">{assets.map((asset, index) => <li key={`${asset.description}-${index}`} className="rounded-xl bg-white p-3 text-sm"><span className="font-medium text-neutral-800">{asset.description}</span><span className="mt-1 block text-neutral-600">{asset.value === null ? "Valor n\u00e3o informado" : asset.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span></li>)}</ul>
          </> : null}
        </section>
      </div>
    </div>
  );
}

