"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isStateOffice, OFFICES, type Candidate, type OfficeId } from "@/lib/offices";
import { Header } from "./Header";
import { BrazilMap, type MapHoverPos } from "./BrazilMap";
import { CandidateBars } from "./CandidateBar";
import { StatePanel } from "./StatePanel";
import { VoteModal } from "./VoteModal";
import { OpinionChat } from "./OpinionChat";
import { emptyResults } from "@/lib/results-client";
import { formatVotes, STATES, UF_MAP } from "@/lib/states";
import type { MePayload, ResultsPayload } from "@/lib/types";

type Tip = { uf: string; x: number; y: number };

export function HomeClient() {
  const [office, setOffice] = useState<OfficeId>("presidente");
  const [selectedState, setSelectedState] = useState("SP");
  const [results, setResults] = useState<ResultsPayload>(emptyResults("presidente"));
  const [me, setMe] = useState<MePayload | null>(null);
  const [tip, setTip] = useState<Tip | null>(null);
  const [pinnedUf, setPinnedUf] = useState<string | null>(null);
  const [voteOpen, setVoteOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [soon, setSoon] = useState<string | null>(null);
  const [candidateCache, setCandidateCache] = useState<Record<string, Candidate[]>>({});
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapWidth, setMapWidth] = useState(640);

  const load = useCallback(async () => {
    const [r, m] = await Promise.all([
      fetch(`/api/results?office=${office}`, { cache: "no-store" }).then((x) => x.json()),
      fetch("/api/me", { cache: "no-store" }).then((x) => x.json()),
    ]);
    setResults(r);
    setMe(m);
  }, [office]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 0);
    const interval = window.setInterval(() => void load(), 8000);
    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, [load]);

  const loadCandidates = useCallback(async (targetOffice: OfficeId, uf?: string) => {
    const stateParam = targetOffice === "presidente" ? "" : "&state=" + (uf ?? selectedState);
    const key = targetOffice + ":" + (targetOffice === "presidente" ? "BR" : uf ?? selectedState);
    if (candidateCache[key]) return;
    const payload = await fetch("/api/candidates?office=" + targetOffice + stateParam).then((response) => response.json());
    setCandidateCache((current) => ({ ...current, [key]: payload.candidates ?? [] }));
  }, [candidateCache, selectedState]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadCandidates(office, selectedState), 0);
    return () => window.clearTimeout(timeout);
  }, [loadCandidates, office, selectedState]);

  useEffect(() => {
    const uf = tip?.uf ?? pinnedUf;
    if (!uf) return;
    const timeout = window.setTimeout(() => void loadCandidates(office, uf), 0);
    return () => window.clearTimeout(timeout);
  }, [loadCandidates, office, pinnedUf, tip?.uf]);

  useEffect(() => {
    const node = mapRef.current;
    if (!node) return;

    const observer = new ResizeObserver(([entry]) => {
      if (entry) setMapWidth(entry.contentRect.width);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const stateOffice = isStateOffice(office);
  const activeUf = tip?.uf ?? pinnedUf ?? (stateOffice ? selectedState : null);
  const candidateKey = office + ":" + (stateOffice ? selectedState : "BR");
  const visibleCandidates = candidateCache[candidateKey] ?? [];
  const candidatesForState = (uf: string) =>
    candidateCache[office + ":" + (stateOffice ? uf : "BR")] ?? [];
  const visibleTallies =
    stateOffice ? results.byState[selectedState]?.candidates ?? [] : results.national;
  const visibleTotal = stateOffice ? results.byState[selectedState]?.total ?? 0 : results.total;
  const currentVote =
    stateOffice
      ? me?.votes.find((vote) => vote.office === office && vote.stateKey === selectedState)
      : me?.votes.find((vote) => vote.office === "presidente");

  function handleHover(uf: string | null, pos?: MapHoverPos) {
    if (!uf) {
      setTip(null);
      return;
    }
    setTip({ uf, x: pos?.x ?? 0, y: pos?.y ?? 0 });
  }

  function handleOffice(id: string) {
    if (!(id in OFFICES)) return;
    setOffice(id as OfficeId);
    setPinnedUf(null);
    setTip(null);
    setSoon(null);
  }

  const tipWidth = 148;
  const tipLeft = tip
    ? Math.min(Math.max(8, tip.x + 14), Math.max(8, mapWidth - tipWidth - 8))
    : 0;
  const tipTop = tip ? Math.max(8, tip.y - 12) : 0;

  return (
    <div className="flex min-h-full flex-col bg-white">
      <Header
        me={me}
        office={office}
        onOffice={handleOffice}
        onVote={() => setVoteOpen(true)}
        onOpinion={() => setChatOpen(true)}
      />

      {soon ? (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-900">
          {soon} em breve. Por enquanto a enquete tem presidente e senadores.
        </div>
      ) : null}

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 py-6 sm:px-6 lg:flex-row lg:items-start lg:py-8">
        <section className="relative min-w-0 flex-1">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl">
                {"Enquete para " + OFFICES[office].label.toLowerCase()}
              </h1>
              <p className="mt-1 text-sm text-neutral-500">
                Passe o mouse no estado; no celular, toque para ver os votos locais.
              </p>
            </div>
            <p className="hidden text-right text-sm text-neutral-400 sm:block">
              <span className="block text-lg font-semibold tabular-nums text-neutral-950">
                {formatVotes(results.total)}
              </span>
              votos no Brasil
            </p>
          </div>

          <div ref={mapRef} className="relative">
            <BrazilMap
              activeUf={activeUf}
              onHover={handleHover}
              onSelect={(uf) => {
                if (stateOffice) setSelectedState(uf);
                setPinnedUf((cur) => (cur === uf ? null : uf));
                setTip(null);
              }}
            />

            {tip && UF_MAP[tip.uf] ? (
              <div
                className="pointer-events-none absolute z-20 hidden w-[148px] lg:block"
                style={{ left: tipLeft, top: tipTop }}
              >
                <StatePanel
                  uf={tip.uf}
                  office={office}
                  candidates={candidatesForState(tip.uf)}
                  results={results}
                  mini
                />
              </div>
            ) : null}
          </div>

          {pinnedUf ? (
            <div className="mt-4 lg:hidden">
              <StatePanel
                uf={pinnedUf}
                office={office}
                candidates={candidatesForState(pinnedUf)}
                results={results}
                mini
                onClose={() => setPinnedUf(null)}
              />
            </div>
          ) : (
            <p className="mt-3 text-center text-sm text-neutral-400 lg:hidden">
              Toque em um estado para ver os votos
            </p>
          )}
        </section>

        <aside className="w-full shrink-0 lg:w-[380px]">
          <div className="rounded-3xl border border-neutral-200 bg-white p-5 lg:sticky lg:top-24">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  {stateOffice ? UF_MAP[selectedState]?.name ?? selectedState : "Brasil"}
                </p>
                <h2 className="text-lg font-semibold text-neutral-950">
                  {stateOffice ? OFFICES[office].plural : "Intenção de voto"}
                </h2>
              </div>
              <p className="text-right text-sm text-neutral-400">
                <span className="block text-base font-semibold tabular-nums text-neutral-950">
                  {formatVotes(visibleTotal)}
                </span>
                votos
              </p>
            </div>

            {stateOffice ? (
              <label className="mb-4 block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  Estado
                </span>
                <select
                  value={selectedState}
                  onChange={(e) => {
                    setSelectedState(e.target.value);
                    setPinnedUf(null);
                    setTip(null);
                  }}
                  className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-950 outline-none focus:border-neutral-400"
                >
                  {STATES.map((state) => (
                    <option key={state.uf} value={state.uf}>
                      {state.name} ({state.uf})
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <CandidateBars candidates={visibleCandidates} tallies={visibleTallies} />

            <button
              type="button"
              onClick={() => setVoteOpen(true)}
              className="mt-6 w-full rounded-full bg-neutral-950 py-3 text-sm font-semibold text-white hover:bg-neutral-800"
            >
              {currentVote ? "Você já votou" : "Votar agora"}
            </button>
            <p className="mt-3 text-center text-xs leading-relaxed text-neutral-400">
              Enquete independente. Não é urna oficial. 1 voto por conta do X em cada disputa.
            </p>
          </div>
        </aside>
      </main>

      <footer className="border-t border-neutral-100 px-4 py-6 text-center text-xs text-neutral-400">
        meuvoto.org · fotos oficiais via TSE · enquete independente
      </footer>

      {voteOpen ? (
        <VoteModal
          open={voteOpen}
          office={office}
          selectedState={selectedState}
          candidates={visibleCandidates}
          me={me}
          onClose={() => setVoteOpen(false)}
          onVoted={async () => {
            await load();
            setVoteOpen(false);
          }}
        />
      ) : null}

      <OpinionChat
        open={chatOpen}
        me={me}
        onClose={() => setChatOpen(false)}
        onVote={() => {
          setChatOpen(false);
          setVoteOpen(true);
        }}
      />
    </div>
  );
}