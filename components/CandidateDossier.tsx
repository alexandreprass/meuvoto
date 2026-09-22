"use client";

import { useEffect, useState } from "react";
import type { Candidate, OfficeId } from "@/lib/offices";
import { OFFICES } from "@/lib/offices";

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

type Tab = "patrimonio" | "contas";

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
  }, [candidate.id]);

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
      <button type="button" className="absolute inset-0 bg-neutral-950/50" aria-label="Fechar" onClick={onClose} />
      <div className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-3xl sm:p-6">
        <div className="flex items-start gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={candidate.photo}
            alt=""
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = candidate.fallbackPhoto ?? "/candidates/senators/placeholder.svg";
            }}
            className="h-20 w-16 shrink-0 rounded-md object-cover object-top"
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">{OFFICES[office].label}</p>
            <h2 className="text-xl font-semibold text-neutral-950">{candidate.name}</h2>
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
            aria-selected={tab === "patrimonio"}
            onClick={() => setTab("patrimonio")}
            className={`rounded-full px-3 py-2 text-xs font-semibold tracking-wide ${
              tab === "patrimonio" ? "bg-white text-neutral-950 shadow-sm" : "text-neutral-500"
            }`}
          >
            PATRIMÔNIO
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "contas"}
            onClick={() => setTab("contas")}
            className={`rounded-full px-3 py-2 text-xs font-semibold tracking-wide ${
              tab === "contas" ? "bg-white text-neutral-950 shadow-sm" : "text-neutral-500"
            }`}
          >
            PRESTAÇÃO DE CONTAS
          </button>
        </div>

        {!dossier && !error ? <p className="mt-4 text-sm text-neutral-400">Consultando o TSE...</p> : null}
        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

        {tab === "patrimonio" && dossier ? (
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

        {tab === "contas" && dossier ? (
          <section className="mt-4" role="tabpanel">
            <dl className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-neutral-50 p-3">
                <dt className="text-[11px] uppercase tracking-wide text-neutral-400">Arrecadado</dt>
                <dd className="mt-1 text-sm font-semibold tabular-nums">{formatMoney(dossier.raised)}</dd>
              </div>
              <div className="rounded-2xl bg-neutral-50 p-3">
                <dt className="text-[11px] uppercase tracking-wide text-neutral-400">Despesas</dt>
                <dd className="mt-1 text-sm font-semibold tabular-nums">{formatMoney(dossier.spent)}</dd>
              </div>
              <div className="col-span-2 rounded-2xl bg-neutral-50 p-3">
                <dt className="text-[11px] uppercase tracking-wide text-neutral-400">Limite de gastos</dt>
                <dd className="mt-1 text-sm font-semibold tabular-nums">{formatMoney(dossier.spendingLimit)}</dd>
              </div>
            </dl>
            {dossier.sources.length > 0 ? (
              <ul className="mt-3 space-y-1 text-sm text-neutral-600">
                <li className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Origem das despesas</li>
                {dossier.sources.map((source) => (
                  <li key={source.label} className="flex justify-between gap-3">
                    <span>{source.label}</span>
                    <span className="tabular-nums text-neutral-950">{formatMoney(source.value)}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            <p className="mt-3 text-xs leading-relaxed text-neutral-400">{dossier.note}</p>
          </section>
        ) : null}
      </div>
    </div>
  );
}
