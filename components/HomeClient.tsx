"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { isStateOffice, OFFICES, voteScope, type Candidate, type OfficeId } from "@/lib/offices";
import { Header } from "./Header";
import { BrazilMap, type MapHoverPos } from "./BrazilMap";
import { StatePanel } from "./StatePanel";
import { CandidateList } from "./CandidateList";
import { CandidateDossier } from "./CandidateDossier";
import { ChoiceModal } from "./ChoiceModal";
import { OpinionChat } from "./OpinionChat";
import { StateGateModal } from "./StateGateModal";
import { UF_MAP } from "@/lib/states";
import type { MePayload } from "@/lib/types";

type Tip = { uf: string; x: number; y: number };

export function HomeClient() {
  const [office, setOffice] = useState<OfficeId>("presidente");
  const [selectedState, setSelectedState] = useState("SP");
  const [me, setMe] = useState<MePayload | null>(null);
  const [tip, setTip] = useState<Tip | null>(null);
  const [pinnedUf, setPinnedUf] = useState<string | null>(null);
  const [choiceOpen, setChoiceOpen] = useState(false);
  const [stateGateOpen, setStateGateOpen] = useState(false);
  const [pendingCandidate, setPendingCandidate] = useState<Candidate | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [dossier, setDossier] = useState<Candidate | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [candidateCache, setCandidateCache] = useState<Record<string, Candidate[]>>({});
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapWidth, setMapWidth] = useState(640);

  const loadMe = useCallback(async () => {
    const payload = await fetch("/api/me", { cache: "no-store" }).then((response) => response.json());
    setMe(payload);
    if (payload.state && UF_MAP[payload.state]) setSelectedState(payload.state);
    return payload as MePayload;
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadMe(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadMe]);

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
    if (!choiceOpen) return;
    const timeout = window.setTimeout(() => {
      for (const choice of me?.choices ?? []) void loadCandidates(choice.office, choice.state);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [choiceOpen, loadCandidates, me?.choices]);

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
  const accountState = me?.state ?? null;
  const currentChoice = me?.choices.find(
    (choice) => choice.office === office && choice.stateKey === voteScope(office, accountState ?? selectedState),
  );
  const otherState = Boolean(me?.loggedIn && accountState && stateOffice && selectedState !== accountState);

  function handleHover(uf: string | null, pos?: MapHoverPos) {
    if (!uf) {
      setTip(null);
      return;
    }
    setTip({ uf, x: pos?.x ?? 0, y: pos?.y ?? 0 });
  }

  function openBallot() {
    if (!me?.loggedIn) {
      void signIn("twitter");
      return;
    }
    if (!me.state) {
      setPendingCandidate(null);
      setStateGateOpen(true);
      return;
    }
    setChoiceOpen(true);
  }

  async function saveCandidate(candidate: Candidate, current = me) {
    if (!current?.loggedIn) {
      setPendingCandidate(candidate);
      void signIn("twitter");
      return;
    }
    if (!current.state) {
      setPendingCandidate(candidate);
      setStateGateOpen(true);
      return;
    }
    if (isStateOffice(office) && candidate.state && candidate.state !== current.state) return;

    setSaving(true);
    setSaveError(null);
    try {
      const response = await fetch("/api/choice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ office, candidateId: candidate.id }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setSaveError(payload.error ?? "Não foi possível guardar.");
        return;
      }
      await loadMe();
    } catch {
      setSaveError("Falha de conexão. Tente de novo.");
    } finally {
      setSaving(false);
    }
  }

  const tipWidth = 148;
  const tipLeft = tip ? Math.min(Math.max(8, tip.x + 14), Math.max(8, mapWidth - tipWidth - 8)) : 0;
  const tipTop = tip ? Math.max(8, tip.y - 12) : 0;
  const saveHint = !me?.loggedIn
    ? "Entre com o X para a escolha ficar salva na sua conta."
    : otherState
      ? `Sua cédula está em ${UF_MAP[accountState ?? ""]?.name ?? accountState}. Este estado é só consulta.`
      : saveError;

  const choicesByOffice = Object.fromEntries(
    (me?.choices ?? []).map((choice) => {
      const key = choice.office + ":" + (choice.office === "presidente" ? "BR" : choice.state);
      return [choice.office, candidateCache[key]?.find((candidate) => candidate.id === choice.candidateId)];
    }),
  ) as Partial<Record<OfficeId, Candidate | undefined>>;

  return (
    <div className="flex min-h-full flex-col bg-white">
      <Header
        me={me}
        office={office}
        onOffice={(id) => {
          if (!(id in OFFICES)) return;
          setOffice(id as OfficeId);
          setPinnedUf(null);
          setTip(null);
          setDossier(null);
        }}
        onBallot={openBallot}
        onOpinion={() => setChatOpen(true)}
      />

      <main className="mx-auto flex w-full max-w-screen-2xl flex-1 flex-col gap-8 px-4 py-6 sm:px-6 lg:flex-row lg:items-start lg:gap-10 lg:py-8">
        <section className="relative min-w-0 flex-1">
          <div className="mb-3">
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl">
              {"Candidatos a " + OFFICES[office].label.toLowerCase()}
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              Toque no estado para ver os candidatos. Sua escolha fica só na sua conta.
            </p>
          </div>

          <div ref={mapRef} className="relative mx-auto w-full lg:mx-auto lg:w-1/2">
            <BrazilMap
              activeUf={activeUf}
              onHover={handleHover}
              onSelect={(uf) => {
                if (stateOffice) setSelectedState(uf);
                setPinnedUf((current) => (current === uf ? null : uf));
                setTip(null);
              }}
            />
            {tip && UF_MAP[tip.uf] ? (
              <div
                className="pointer-events-none absolute z-20 hidden w-[148px] lg:block"
                style={{ left: tipLeft, top: tipTop }}
              >
                <StatePanel uf={tip.uf} mini />
              </div>
            ) : null}
          </div>

          {pinnedUf ? (
            <div className="mt-4 lg:hidden">
              <StatePanel uf={pinnedUf} onClose={() => setPinnedUf(null)} />
            </div>
          ) : (
            <p className="mt-3 text-center text-sm text-neutral-400 lg:hidden">Toque em um estado para selecionar</p>
          )}
        </section>

        <aside className="w-full shrink-0 lg:w-[520px]">
          <div className="rounded-3xl border border-neutral-200 bg-white p-5 lg:sticky lg:top-24">
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                {stateOffice ? UF_MAP[selectedState]?.name ?? selectedState : "Brasil"}
              </p>
              <h2 className="text-lg font-semibold text-neutral-950">{OFFICES[office].plural}</h2>
            </div>

            {stateOffice ? (
              <label className="mb-4 block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-400">Estado</span>
                <select
                  value={selectedState}
                  onChange={(event) => {
                    setSelectedState(event.target.value);
                    setPinnedUf(null);
                    setTip(null);
                  }}
                  className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-950 outline-none focus:border-neutral-400"
                >
                  {Object.values(UF_MAP).map((state) => (
                    <option key={state.uf} value={state.uf}>
                      {state.name} ({state.uf})
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <CandidateList
              candidates={visibleCandidates}
              selectedId={otherState ? undefined : currentChoice?.candidateId}
              onOpen={setDossier}
            />

            <button
              type="button"
              onClick={openBallot}
              className="mt-6 w-full rounded-full bg-neutral-950 py-3 text-sm font-semibold text-white hover:bg-neutral-800"
            >
              {me?.choices.length ? "Abrir minha cédula" : "Montar minha cédula"}
            </button>
            <p className="mt-3 text-center text-xs leading-relaxed text-neutral-400">
              Consulta de candidatos. A cédula é pessoal e não vira placar.
            </p>
          </div>
        </aside>
      </main>

      <footer className="border-t border-neutral-100 px-4 py-6 text-center text-xs text-neutral-400">
        meuvoto.org · patrimônio e dados eleitorais com fontes do TSE
      </footer>

      {dossier ? (
        <CandidateDossier
          candidate={dossier}
          office={office}
          state={accountState ?? selectedState}
          saved={!otherState && currentChoice?.candidateId === dossier.id}
          canSave={!otherState}
          saveHint={saveHint}
          saving={saving}
          onClose={() => setDossier(null)}
          onSave={() => void saveCandidate(dossier)}
        />
      ) : null}

      {choiceOpen && me?.loggedIn ? (
        <ChoiceModal
          me={me}
          candidatesByOffice={choicesByOffice}
          onClose={() => setChoiceOpen(false)}
          onOffice={(target) => {
            setOffice(target);
            setChoiceOpen(false);
            if (accountState) setSelectedState(accountState);
          }}
        />
      ) : null}

      <StateGateModal
        open={stateGateOpen}
        onClose={() => {
          setStateGateOpen(false);
          setPendingCandidate(null);
        }}
        onSaved={(state) => {
          setSelectedState(state);
          setMe((current) => (current ? { ...current, state } : current));
          setStateGateOpen(false);
          const candidate = pendingCandidate;
          setPendingCandidate(null);
          if (candidate) {
            void saveCandidate(candidate, me ? { ...me, state } : me);
          } else {
            setChoiceOpen(true);
          }
        }}
      />

      <OpinionChat open={chatOpen} me={me} onClose={() => setChatOpen(false)} />
    </div>
  );
}
