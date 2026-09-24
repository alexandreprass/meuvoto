"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { isStateOffice, OFFICES, voteScope, type Candidate, type OfficeId } from "@/lib/offices";
import { Header } from "./Header";
import { BrazilMap } from "./BrazilMap";
import { StatePanel } from "./StatePanel";
import { CandidateList } from "./CandidateList";
import { CandidateDossier } from "./CandidateDossier";
import { ChoiceModal } from "./ChoiceModal";
import { OpinionChat } from "./OpinionChat";
import { StateGateModal } from "./StateGateModal";
import { UF_MAP } from "@/lib/states";
import type { MePayload } from "@/lib/types";


export function HomeClient() {
  const [office, setOffice] = useState<OfficeId>("presidente");
  const [selectedState, setSelectedState] = useState("SP");
  const [me, setMe] = useState<MePayload | null>(null);
  const [guestMode, setGuestMode] = useState(false);
  const [guestChoices, setGuestChoices] = useState<Partial<Record<OfficeId, Candidate>>>({});
  const [hoverUf, setHoverUf] = useState<string | null>(null);
  const [pinnedUf, setPinnedUf] = useState<string | null>(null);
  const [choiceOpen, setChoiceOpen] = useState(false);
  const [stateGateOpen, setStateGateOpen] = useState(false);
  const [pendingCandidate, setPendingCandidate] = useState<Candidate | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [dossier, setDossier] = useState<Candidate | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [candidateCache, setCandidateCache] = useState<Record<string, Candidate[]>>({});
  const [candidateLoadStatus, setCandidateLoadStatus] = useState<Record<string, "loading" | "error">>({});
  const candidateRequests = useRef(new Set<string>());

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
    if (candidateCache[key] || candidateRequests.current.has(key)) return;
    candidateRequests.current.add(key);
    setCandidateLoadStatus((current) => ({ ...current, [key]: "loading" }));
    try {
      const response = await fetch("/api/candidates?office=" + targetOffice + stateParam);
      if (!response.ok) throw new Error("Candidate request failed");
      const payload = await response.json();
      if (!Array.isArray(payload.candidates)) throw new Error("Candidate data is invalid");
      setCandidateCache((current) => ({ ...current, [key]: payload.candidates }));
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
      for (const choice of me?.choices ?? []) void loadCandidates(choice.office, choice.state);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [choiceOpen, loadCandidates, me?.choices]);

  const stateOffice = isStateOffice(office);
  const activeUf = hoverUf ?? pinnedUf ?? (stateOffice ? selectedState : null);
  const candidateKey = office + ":" + (stateOffice ? selectedState : "BR");
  const visibleCandidates = candidateCache[candidateKey] ?? [];
  const accountState = me?.state ?? null;
  const currentChoice = me?.choices.find(
    (choice) => choice.office === office && choice.stateKey === voteScope(office, accountState ?? selectedState),
  );
  const selectedCandidateId = guestMode && !me?.loggedIn
    ? guestChoices[office]?.id
    : currentChoice?.candidateId;
  const otherState = Boolean(me?.loggedIn && accountState && stateOffice && selectedState !== accountState);

  function handleHover(uf: string | null) { setHoverUf(uf); }

  function openBallot() {
    if (!me?.loggedIn) {
      setChoiceOpen(true);
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
      if (guestMode) {
        setGuestChoices((choices) => ({ ...choices, [office]: candidate }));
        setDossier(null);
        setChoiceOpen(true);
        return;
      }
      setPendingCandidate(candidate);
      setDossier(null);
      setChoiceOpen(true);
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

  const saveHint = !me?.loggedIn
    ? guestMode ? "Modo convidado: esta escolha não ficará salva." : "Entre com o X para salvar, ou abra sua cédula e continue como convidado."
    : otherState
      ? `Sua cédula está em ${UF_MAP[accountState ?? ""]?.name ?? accountState}. Este estado é só consulta.`
      : saveError;

  const savedChoicesByOffice = Object.fromEntries(
    (me?.choices ?? []).map((choice) => {
      const key = choice.office + ":" + (choice.office === "presidente" ? "BR" : choice.state);
      return [choice.office, candidateCache[key]?.find((candidate) => candidate.id === choice.candidateId)];
    }),
  ) as Partial<Record<OfficeId, Candidate | undefined>>;
  const choicesByOffice = !me?.loggedIn && guestMode
    ? { ...savedChoicesByOffice, ...guestChoices }
    : savedChoicesByOffice;
  const emptyMe: MePayload = me ?? { loggedIn: false, choices: [] };

  return (
    <div className="flex min-h-full flex-col bg-white">
      <Header
        me={me}
        office={office}
        onOffice={(id) => {
          if (!(id in OFFICES)) return;
          setOffice(id as OfficeId);
          setPinnedUf(null);
          setHoverUf(null);
          setDossier(null);
          setChoiceOpen(false);
        }}
        onBallot={openBallot}
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

          <div className="relative mx-auto w-full lg:mx-auto lg:w-1/2">
            <BrazilMap
              activeUf={activeUf}
              onHover={handleHover}
              onSelect={(uf) => {
                if (stateOffice) setSelectedState(uf);
                setPinnedUf((current) => (current === uf ? null : uf));
                setHoverUf(null);
              }}
            />
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
                <select
                  value={selectedState}
                  onChange={(event) => {
                    setSelectedState(event.target.value);
                    setPinnedUf(null);
                    setHoverUf(null);
                  }}
                  className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-950 outline-none focus:border-neutral-400"
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
              office={office}
              state={selectedState}
              loading={candidateLoadStatus[candidateKey] === "loading"}
              loadError={candidateLoadStatus[candidateKey] === "error"}
              onRetry={() => void loadCandidates(office, selectedState)}
              selectedId={otherState ? undefined : selectedCandidateId}
              onOpen={setDossier}
            />

            <button
              type="button"
              onClick={openBallot}
              className="mt-3 w-full rounded-full bg-neutral-950 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800"
            >
              {me?.choices.length || Object.keys(guestChoices).length ? "Abrir minha cédula" : "Montar minha cédula"}
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
          saved={!otherState && selectedCandidateId === dossier.id}
          canSave={!otherState}
          saveHint={saveHint}
          saving={saving}
          onClose={() => setDossier(null)}
          onSave={() => void saveCandidate(dossier)}
        />
      ) : null}

      {choiceOpen ? (
        <ChoiceModal
          me={emptyMe}
          candidatesByOffice={choicesByOffice}
          guestMode={guestMode && !me?.loggedIn}
          onGuestMode={() => {
            setGuestMode(true);
            if (pendingCandidate) {
              setGuestChoices((choices) => ({ ...choices, [office]: pendingCandidate }));
              setPendingCandidate(null);
            }
          }}
          onLogin={() => void signIn("twitter")}
          onClose={() => {
            setChoiceOpen(false);
            setPendingCandidate(null);
          }}
          onOffice={(target) => {
            setOffice(target);
            setChoiceOpen(false);
            setPendingCandidate(null);
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

      {!chatOpen ? (
        <button
          type="button"
          onClick={() => setChatOpen(true)}
          aria-label="Dê sua opinião"
          title="Dê sua opinião"
          className="fixed bottom-5 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-950 text-white shadow-xl hover:bg-neutral-800 sm:bottom-6 sm:right-6"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5 8 8 0 0 1-3.5-.8L4 20l1.5-4A7.5 7.5 0 1 1 20 11.5Z" />
            <path d="M8 11.5h.01M12 11.5h.01M16 11.5h.01" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </button>
      ) : null}
      <OpinionChat open={chatOpen} me={me} onClose={() => setChatOpen(false)} />
    </div>
  );
}
