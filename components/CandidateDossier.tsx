"use client";

import type { Candidate, OfficeId } from "@/lib/offices";
import { OFFICES } from "@/lib/offices";
import { tseIdentity, tsePageUrl } from "@/lib/tse";
import { PartyBadge } from "./PartyBadge";
import { assetUrl } from "@/lib/asset-url";

type Props = {
  candidate: Candidate;
  office: OfficeId;
  state: string;
  onClose: () => void;
  onChoose: () => void;
};

export function CandidateDossier({ candidate, office, onClose, onChoose }: Props) {
  const identity = tseIdentity(candidate);
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
      <button type="button" className="absolute inset-0 bg-neutral-950/50" aria-label="Fechar" onClick={onClose} />
      <div className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-3xl sm:p-6">
        <div className="flex items-start gap-4">
          <img src={candidate.photo.startsWith("/") ? assetUrl(candidate.photo) : candidate.photo} alt="" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = assetUrl(candidate.fallbackPhoto ?? "/candidates/senators/placeholder.svg"); }} className="h-20 w-16 shrink-0 rounded-md object-cover object-top" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">{OFFICES[office].label}</p>
            <div className="flex items-center gap-2"><h2 className="min-w-0 flex-1 text-xl font-semibold text-neutral-950">{candidate.name}</h2><PartyBadge party={candidate.party} size={34} /></div>
            <p className="text-sm text-neutral-500">{candidate.fullName}</p>
            <p className="text-sm text-neutral-500">{candidate.party} · {candidate.number}{candidate.state ? ` · ${candidate.state}` : ""}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="rounded-full p-2 text-neutral-400 hover:bg-neutral-100">×</button>
        </div>
        <button type="button" onClick={onChoose} className="mt-5 w-full rounded-full bg-neutral-950 py-3 text-sm font-semibold text-white hover:bg-neutral-800">Escolher temporariamente</button>
        <p className="mt-2 text-center text-xs text-neutral-500">A escolha existe só enquanto esta página estiver aberta.</p>
        <section className="mt-5 rounded-2xl bg-neutral-50 p-4">
          <h3 className="font-semibold text-neutral-950">Ficha oficial</h3>
          <p className="mt-1 text-sm leading-relaxed text-neutral-600">Consulte no TSE os dados declarados pelo candidato, incluindo patrimônio e prestação de contas.</p>
          {identity ? <a href={tsePageUrl(identity)} target="_blank" rel="noreferrer" className="mt-4 inline-flex rounded-full border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-800 hover:bg-white">Abrir ficha no TSE ↗</a> : <p className="mt-3 text-xs text-neutral-500">O link oficial ainda não está disponível para este registro.</p>}
        </section>
      </div>
    </div>
  );
}
