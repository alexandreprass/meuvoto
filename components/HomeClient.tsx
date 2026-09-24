"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isStateOffice, OFFICES, type Candidate, type OfficeId } from "@/lib/offices";
import { Header } from "./Header";
import { BrazilMap } from "./BrazilMap";
import { StatePanel } from "./StatePanel";
import { CandidateList } from "./CandidateList";
import { CandidateDossier } from "./CandidateDossier";
import { ChoiceModal } from "./ChoiceModal";
import { UF_MAP } from "@/lib/states";
import { assetUrl } from "@/lib/asset-url";

const OFFICES_ORDER: OfficeId[] = ["presidente", "senador", "deputado_federal", "deputado_estadual"];

export function HomeClient() {
  const [office, setOffice] = useState<OfficeId>("presidente");
  const [selectedState, setSelectedState] = useState("SP");
  const [choices, setChoices] = useState<Partial<Record<OfficeId, Candidate>>>({});
  const [hoverUf, setHoverUf] = useState<string | null>(null);
  const [pinnedUf, setPinnedUf] = useState<string | null>(null);
  const [choiceOpen, setChoiceOpen] = useState(false);
  const [dossier, setDossier] = useState<Candidate | null>(null);
  const [candidateCache, setCandidateCache] = useState<Record<string, Candidate[]>>({});
  const [candidateLoadStatus, setCandidateLoadStatus] = useState<Record<string, "loading" | "error">>({});
  const candidateRequests = useRef(new Set<string>());

  const loadCandidates = useCallback(async (targetOffice: OfficeId, uf?: string) => {
    const state = targetOffice === "presidente" ? "BR" : uf ?? selectedState;
    const key = `${targetOffice}:${state}`;
    if (candidateCache[key] || candidateRequests.current.has(key)) return;
    candidateRequests.current.add(key);
    setCandidateLoadStatus((current) => ({ ...current, [key]: "loading" }));
    try {
      const response = await fetch(assetUrl(`/candidate-data/${targetOffice}/${state}.json`));
      if (!response.ok) throw new Error("Candidate data request failed");
      const candidates = await response.json();
      if (!Array.isArray(candidates)) throw new Error("Candidate data is invalid");
      setCandidateCache((current) => ({ ...current, [key]: candidates }));
      setCandidateLoadStatus((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
    } catch {
      setCandidateLoadStatus((current) => ({ ...current, [key]: "error" }));
    } finally {
      candidateRequests.current.delete(key);
    }
  }, [candidateCache, selectedState]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadCandidates(office, selectedState), 0);
    return () => window.clearTimeout(timeout);
  }, [loadCandidates, office, selectedState]);

  useEffect(() => {
    if (!choiceOpen) return;
    const timeout = window.setTimeout(() => {
      OFFICES_ORDER.forEach((item) => {
        if (item !== "presidente") void loadCandidates(item, selectedState);
      });
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [choiceOpen, loadCandidates, selectedState]);

  const stateOffice = isStateOffice(office);
  const activeUf = hoverUf ?? pinnedUf ?? (stateOffice ? selectedState : null);
  const candidateKey = `${office}:${stateOffice ? selectedState : "BR"}`;
  const visibleCandidates = candidateCache[candidateKey] ?? [];

  return (
    <div className="flex min-h-full flex-col bg-white">
      <Header
        office={office}
        onOffice={(id) => {
          if (!(id in OFFICES)) return;
          setOffice(id as OfficeId);
          setPinnedUf(null);
          setHoverUf(null);
          setDossier(null);
          setChoiceOpen(false);
        }}
        onBallot={() => setChoiceOpen(true)}
      />

      <main className="mx-auto flex w-full max-w-screen-2xl flex-1 flex-col gap-8 px-4 py-6 sm:px-6 lg:flex-row lg:items-start lg:gap-10 lg:py-8">
        <section className="relative min-w-0 flex-1">
          <div className="mb-3">
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl">
              {"Candidatos a " + OFFICES[office].label.toLowerCase()}
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              Explore os candidatos. Suas escolhas são temporárias e ficam apenas nesta página.
            </p>
          </div>
          <div className="relative mx-auto w-full lg:mx-auto lg:w-1/2">
            <BrazilMap
              activeUf={activeUf}
              onHover={(uf) => setHoverUf(uf)}
              onSelect={(uf) => {
                if (stateOffice) setSelectedState(uf);
                setPinnedUf((current) => (current === uf ? null : uf));
                setHoverUf(null);
              }}
            />
          </div>
          {pinnedUf ? (
            <div className="mt-4 lg:hidden"><StatePanel uf={pinnedUf} onClose={() => setPinnedUf(null)} /></div>
          ) : <p className="mt-3 text-center text-sm text-neutral-400 lg:hidden">Toque em um estado para selecionar</p>}
        </section>

        <aside className="w-full shrink-0 lg:w-[520px]">
          <div className="rounded-3xl border border-neutral-200 bg-white p-3 sm:p-4 lg:sticky lg:top-24">
            <div className="mb-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                {stateOffice ? UF_MAP[selectedState]?.name ?? selectedState : "Brasil"}
              </p>
              <h2 className="text-base font-semibold text-neutral-950">{OFFICES[office].plural}</h2>
            </div>
            {stateOffice ? (
              <label className="mb-2 block">
                <span className="sr-only">Estado</span>
                <select value={selectedState} onChange={(event) => {
                  setSelectedState(event.target.value); setPinnedUf(null); setHoverUf(null);
                }} className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-950 outline-none focus:border-neutral-400">
                  {Object.values(UF_MAP).map((state) => <option key={state.uf} value={state.uf}>{state.name} ({state.uf})</option>)}
                </select>
              </label>
            ) : null}
            <CandidateList
              candidates={visibleCandidates}
              office={office}
              state={selectedState}
              loading={candidateLoadStatus[candidateKey] === "loading"}
              loadError={candidateLoadStatus[candidateKey] === "error"}
              onRetry={() => void loadCandidates(office, selectedState)}
              selectedId={choices[office]?.id}
              onOpen={setDossier}
            />
            <button type="button" onClick={() => setChoiceOpen(true)} className="mt-3 w-full rounded-full bg-neutral-950 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800">
              MINHAS ESCOLHAS
            </button>
          </div>
        </aside>
      </main>

      <footer className="border-t border-neutral-100 px-4 py-6 text-center text-xs text-neutral-400">
        meuvoto.org · dados de candidaturas publicados pelo TSE
      </footer>

      {dossier ? <CandidateDossier candidate={dossier} office={office} state={selectedState} onClose={() => setDossier(null)} onChoose={() => {
        setChoices((current) => ({ ...current, [office]: dossier }));
        setDossier(null);
      }} /> : null}
      {choiceOpen ? <ChoiceModal choices={choices} onClose={() => setChoiceOpen(false)} onOffice={(target) => {
        setOffice(target); setChoiceOpen(false); setDossier(null);
      }} onClear={(target) => setChoices((current) => {
        const next = { ...current }; delete next[target]; return next;
      })} /> : null}
    </div>
  );
}
