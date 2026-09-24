"use client";

import { useEffect, useRef, useState } from "react";
import type { Candidate, OfficeId } from "@/lib/offices";
import { OFFICES } from "@/lib/offices";
import { PartyBadge } from "./PartyBadge";

type AssetItem = { description: string; value: number | null };
type MoneySource = { label: string; value: number };

type Dossier = {
  officialUrl: string | null;
  loaded: boolean;
  situation: string | null;
  assetsTotal: number | null;
  assets: AssetItem[];
  raised: number | null;
  spent: number | null;
  spendingLimit: number | null;
  sources: MoneySource[];
  note: string;
};

type Props = {
  candidate: Candidate;
  office: OfficeId;
  state: string;
  saved: boolean;
  canSave: boolean;
  saveHint: string | null;
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
};

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function formatMoney(value: number | null) {
  return value === null ? "—" : money.format(value);
}

type Tab = "patrimonio" | "biografia";

export function CandidateDossier({
  candidate,
  office,
  state,
  saved,
  canSave,
  saveHint,
  saving,
  onClose,
  onSave,
}: Props) {
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("patrimonio");
  const [biography, setBiography] = useState<string | null>(null);
  const [biographyLength, setBiographyLength] = useState(0);
  const [biographyLoading, setBiographyLoading] = useState(false);
  const [biographyError, setBiographyError] = useState<string | null>(null);
  const requestedBiographies = useRef(new Set<string>());
  const biographyKey = `${office}:${candidate.state ?? state}:${candidate.id}`;
  const [tabBiographyKey, setTabBiographyKey] = useState(biographyKey);
  const activeTab = tabBiographyKey === biographyKey ? tab : "patrimonio";
  const activeBiographyKey = useRef(biographyKey);
  activeBiographyKey.current = biographyKey;

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      office,
      id: candidate.id,
      state: candidate.state ?? state,
    });
    fetch(`/api/candidate/dossier?${params}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "Não foi possível abrir a ficha.");
        setDossier(payload);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Não foi possível abrir a ficha.");
      });
    return () => controller.abort();
  }, [candidate.id, candidate.state, office, state]);

  useEffect(() => {
    setTab("patrimonio");
    setTabBiographyKey(biographyKey);
    setBiography(null);
    setBiographyLength(0);
    setBiographyError(null);
    setBiographyLoading(false);
  }, [biographyKey]);

  useEffect(() => {
    if (activeTab !== "biografia" || requestedBiographies.current.has(biographyKey)) return;
    requestedBiographies.current.add(biographyKey);
    setBiographyLoading(true);
    setBiographyError(null);
    fetch("/api/candidate/biography", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ office, id: candidate.id, state: candidate.state ?? state }),
    })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "Não foi possível gerar a biografia.");
        if (activeBiographyKey.current === biographyKey) setBiography(payload.biography as string);
      })
      .catch((err: unknown) => {
        requestedBiographies.current.delete(biographyKey);
        if (activeBiographyKey.current === biographyKey) {
          setBiographyError(err instanceof Error ? err.message : "Não foi possível gerar a biografia.");
        }
      })
      .finally(() => {
        if (activeBiographyKey.current === biographyKey) setBiographyLoading(false);
      });
  }, [activeTab, biographyKey, candidate.id, candidate.state, office, state]);

  useEffect(() => {
    if (!biography || activeTab !== "biografia") {
      setBiographyLength(0);
      return;
    }
    setBiographyLength(0);
    const timer = window.setInterval(() => {
      setBiographyLength((current) => {
        if (current >= biography.length) {
          window.clearInterval(timer);
          return current;
        }
        return Math.min(current + 2, biography.length);
      });
    }, 18);
    return () => window.clearInterval(timer);
  }, [activeTab, biography]);

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
      <button type="button" className="absolute inset-0 bg-neutral-950/50" aria-label="Fechar" onClick={onClose} />
      <div className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-3xl sm:p-6">
        <div className="flex items-start gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={candidatePhotoSrc(office, candidate, state)}
            alt=""
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = candidate.fallbackPhoto ?? "/candidates/senators/placeholder.svg";
            }}
            className="h-20 w-16 shrink-0 rounded-md object-cover object-top"
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">{OFFICES[office].label}</p>
            <div className="flex items-center gap-2">
              <h2 className="min-w-0 flex-1 text-xl font-semibold text-neutral-950">{candidate.name}</h2>
              <PartyBadge party={candidate.party} size={34} />
            </div>
            <p className="text-sm text-neutral-500">{candidate.fullName}</p>
            <p className="text-sm text-neutral-500">
              {candidate.party} · {candidate.number}
              {candidate.state ? ` · ${candidate.state}` : ""}
              {dossier?.situation ? ` · ${dossier.situation}` : ""}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="rounded-full p-2 text-neutral-400 hover:bg-neutral-100">
            ×
          </button>
        </div>

        <div className="mt-5">
          {saved ? (
            <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
              Esta pessoa está na sua cédula.
            </p>
          ) : (
            <button
              type="button"
              disabled={!canSave || saving}
              onClick={onSave}
              className="w-full rounded-full bg-neutral-950 py-3 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              {saving ? "Salvando..." : "Guardar na minha cédula"}
            </button>
          )}
          {saveHint ? <p className="mt-2 text-center text-xs text-neutral-500">{saveHint}</p> : null}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-1 rounded-full bg-neutral-100 p-1" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "patrimonio"}
            onClick={() => setTab("patrimonio")}
            className={`rounded-full px-3 py-2 text-xs font-semibold tracking-wide ${
              activeTab === "patrimonio" ? "bg-white text-neutral-950 shadow-sm" : "text-neutral-500"
            }`}
          >
            PATRIMÔNIO
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "biografia"}
            onClick={() => setTab("biografia")}
            className={`rounded-full px-3 py-2 text-xs font-semibold tracking-wide ${
              activeTab === "biografia" ? "bg-white text-neutral-950 shadow-sm" : "text-neutral-500"
            }`}
          >
            BIOGRAFIA COM IA
          </button>
        </div>

        {!dossier && !error ? <p className="mt-4 text-sm text-neutral-400">Consultando o TSE...</p> : null}
        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

        {activeTab === "patrimonio" && dossier ? (
          <section className="mt-4" role="tabpanel">
            <p className="text-sm text-neutral-500">Total declarado: {formatMoney(dossier.assetsTotal)}</p>
            {dossier.assets.length === 0 ? (
              <p className="mt-2 text-sm text-neutral-400">A lista de bens não veio nesta consulta.</p>
            ) : (
              <ul className="mt-3 divide-y divide-neutral-100 border-y border-neutral-100">
                {dossier.assets.map((asset, index) => (
                  <li key={`${asset.description}-${index}`} className="flex items-start justify-between gap-3 py-2 text-sm">
                    <span className="text-neutral-700">{asset.description}</span>
                    <span className="shrink-0 tabular-nums text-neutral-950">{formatMoney(asset.value)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}

        {activeTab === "biografia" ? (
          <section className="mt-4 min-h-32 rounded-2xl bg-neutral-50 p-4" role="tabpanel">
            {biographyLoading ? <p className="text-sm text-neutral-500">Gerando biografia...</p> : null}
            {biographyError ? (
              <div className="space-y-3">
                <p className="text-sm text-red-600">{biographyError}</p>
                <button
                  type="button"
                  onClick={() => {
                    requestedBiographies.current.delete(biographyKey);
                    setBiographyError(null);
                    setTab("patrimonio");
                    window.setTimeout(() => setTab("biografia"), 0);
                  }}
                  className="rounded-full border border-neutral-300 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-white"
                >
                  Tentar novamente
                </button>
              </div>
            ) : null}
            {biography ? (
              <p className="whitespace-pre-wrap text-sm leading-7 text-neutral-700">
                {biography.slice(0, biographyLength)}
                {biographyLength < biography.length ? <span className="ml-0.5 animate-pulse">|</span> : null}
              </p>
            ) : null}
          </section>
        ) : null}
      </div>
    </div>
  );
}

function candidatePhotoSrc(office: OfficeId, candidate: Candidate, state: string) {
  const params = new URLSearchParams({ office, id: candidate.id, state: candidate.state ?? state });
  return `/api/candidate/photo?${params}`;
}
