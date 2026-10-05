"use client";

import { useState } from "react";
import { chooseCandidate, OFFICES, OFFICE_SEATS, removeChoice, type OfficeId } from "@/lib/offices";
import { useBallotMemory } from "@/lib/ballot-memory";
import { hasGovernorRunoff, RUNOFF_OFFICES, RUNOFF_STATES, runoffCandidates } from "@/lib/runoff-ballot";
import { UF_MAP } from "@/lib/states";
import { Header } from "./Header";
import { ElectionMenu } from "./ElectionMenu";
import { BrazilMap } from "./BrazilMap";
import { CandidateList } from "./CandidateList";
import { CandidateDossier } from "./CandidateDossier";
import { ChoiceModal } from "./ChoiceModal";
import type { Candidate } from "@/lib/offices";

export function SegundoTurnoClient() {
  const [office, setOffice] = useState<OfficeId>("presidente");
  const [selectedState, setSelectedState] = useState("RJ");
  const [choices, setChoices] = useBallotMemory(2);
  const [hoverUf, setHoverUf] = useState<string | null>(null);
  const [choiceOpen, setChoiceOpen] = useState(false);
  const [dossier, setDossier] = useState<Candidate | null>(null);
  const [pendingSlot, setPendingSlot] = useState<number | null>(null);
  const [blockedUf, setBlockedUf] = useState<string | null>(null);

  const stateOffice = office === "governador";
  const activeUf = hoverUf ?? (stateOffice ? selectedState : null);
  const visibleCandidates = runoffCandidates(office, selectedState);

  function openOffice(id: string) {
    if (id !== "presidente" && id !== "governador") return;
    setOffice(id);
    setPendingSlot(null);
    setDossier(null);
    setChoiceOpen(false);
    setBlockedUf(null);
  }

  return (
    <div className="flex min-h-full flex-col">
      <ElectionMenu round={2} />
      <Header
        office={office}
        offices={RUNOFF_OFFICES}
        onOffice={openOffice}
        onBallot={() => setChoiceOpen(true)}
      />

      <main className="mx-auto flex w-full max-w-screen-2xl flex-1 flex-col gap-8 px-4 py-6 sm:px-6 lg:flex-row lg:items-start lg:gap-10 lg:py-8">
        <section className="relative min-w-0 flex-1">
          <div className="mb-3">
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl">
              {"2º turno para " + OFFICES[office].label.toLowerCase()}
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              Cédula nova, só com quem disputa o segundo turno. Ela não usa as escolhas do 1º turno.
            </p>
          </div>
          <div className="relative mx-auto w-full lg:mx-auto lg:w-1/2">
            <BrazilMap
              activeUf={activeUf}
              onHover={(uf) => setHoverUf(uf)}
              onSelect={(uf) => {
                setHoverUf(null);
                if (!hasGovernorRunoff(uf)) {
                  setBlockedUf(uf);
                  return;
                }
                setBlockedUf(null);
                setOffice("governador");
                setSelectedState(uf);
              }}
            />
          </div>
          {blockedUf ? (
            <p className="mt-3 text-center text-sm text-neutral-400">{UF_MAP[blockedUf]?.name ?? blockedUf} não tem segundo turno para governador.</p>
          ) : (
            <p className="mt-3 text-center text-sm text-neutral-400 lg:hidden">Toque em um estado com segundo turno</p>
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
                <select value={selectedState} onChange={(event) => { setSelectedState(event.target.value); setBlockedUf(null); }} className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-950 outline-none focus:border-neutral-400">
                  {RUNOFF_STATES.map((uf) => <option key={uf} value={uf}>{UF_MAP[uf]?.name ?? uf} ({uf})</option>)}
                </select>
              </label>
            ) : null}
            <CandidateList
              candidates={visibleCandidates}
              office={office}
              state={selectedState}
              selectedIds={(choices[office] ?? []).map((candidate) => candidate.id)}
              onOpen={setDossier}
            />
            <button type="button" onClick={() => setChoiceOpen(true)} className="mt-3 w-full rounded-full bg-neutral-950 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800">
              MINHAS ESCOLHAS
            </button>
          </div>
        </aside>
      </main>

      <footer className="border-t border-neutral-100 px-4 py-6 text-center text-xs text-neutral-400">
        meuvoto.digital · 2º turno em 25 de outubro de 2026
      </footer>

      {dossier ? <CandidateDossier candidate={dossier} office={office} state={selectedState} chosen={(choices[office] ?? []).some((item) => item.id === dossier.id)} seatsFull={(choices[office] ?? []).length >= OFFICE_SEATS[office]} slotIndex={pendingSlot} onClose={() => setDossier(null)} onChoose={() => {
        setChoices((current) => chooseCandidate(current, office, dossier, pendingSlot));
        setPendingSlot(null);
        setDossier(null);
      }} /> : null}
      {choiceOpen ? <ChoiceModal choices={choices} offices={RUNOFF_OFFICES} caption="2º turno das eleições de 2026" downloadName="minhas-escolhas-2-turno-meuvoto.png" onClose={() => setChoiceOpen(false)} onOffice={(target, index) => {
        openOffice(target); setPendingSlot(index); setChoiceOpen(false); setDossier(null);
      }} onClear={(target, index) => setChoices((current) => removeChoice(current, target, index))} /> : null}
    </div>
  );
}
