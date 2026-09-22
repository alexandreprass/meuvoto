"use client";

import type { Candidate, OfficeId } from "@/lib/offices";
import { OFFICES } from "@/lib/offices";
import type { MePayload } from "@/lib/types";

const OFFICES_ORDER: OfficeId[] = ["presidente", "senador", "deputado_federal", "deputado_estadual"];

type Props = {
  me: MePayload;
  candidatesByOffice: Partial<Record<OfficeId, Candidate | undefined>>;
  onClose: () => void;
  onOffice: (office: OfficeId) => void;
};

export function ChoiceModal({ me, candidatesByOffice, onClose, onOffice }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button type="button" className="absolute inset-0 bg-neutral-950/40" aria-label="Fechar" onClick={onClose} />
      <div className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-3xl sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Só na sua conta</p>
            <h2 className="text-xl font-semibold text-neutral-950">Sua cédula</h2>
            <p className="mt-1 text-sm text-neutral-500">
              {me.state ? `Estado ${me.state}. Ninguém mais vê esta lista.` : "Escolha um estado para montar a cédula."}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="rounded-full p-2 text-neutral-400 hover:bg-neutral-100">
            ×
          </button>
        </div>
        <div className="divide-y divide-neutral-100 border-y border-neutral-100">
          {OFFICES_ORDER.map((office) => {
            const choice = me.choices.find((item) => item.office === office);
            const candidate = candidatesByOffice[office];
            return (
              <div key={office} className="flex min-h-20 items-center gap-3 py-4">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{OFFICES[office].label}</p>
                  <p className="truncate font-semibold text-neutral-950">
                    {choice ? candidate?.name ?? "Carregando..." : "Ainda sem escolha"}
                  </p>
                  {candidate && choice ? (
                    <p className="text-xs text-neutral-500">
                      {candidate.party} · {candidate.number}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => onOffice(office)}
                  className="shrink-0 rounded-full bg-neutral-950 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800"
                >
                  {choice ? "Trocar" : "Escolher"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
