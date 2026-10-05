"use client";

import { useEffect, useState } from "react";
import type { BallotChoices, OfficeId } from "@/lib/offices";
import { OFFICE_SEATS, OFFICES, OFFICES_ORDER, slotLabel } from "@/lib/offices";
import { renderBallotCard } from "./ballot-card";
import { PartyBadge } from "./PartyBadge";
import { assetUrl } from "@/lib/asset-url";

type Props = {
  choices: BallotChoices;
  offices?: OfficeId[];
  caption?: string;
  downloadName?: string;
  onClose: () => void;
  onOffice: (office: OfficeId, index: number) => void;
  onClear: (office: OfficeId, index: number) => void;
};

export function ChoiceModal({ choices, offices = OFFICES_ORDER, caption, downloadName = "minhas-escolhas-meuvoto.png", onClose, onOffice, onClear }: Props) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const slots = offices.flatMap((office) => Array.from({ length: OFFICE_SEATS[office] }, (_, index) => ({ office, index })));
  const chosen = slots.flatMap(({ office, index }) => {
    const candidate = choices[office]?.[index];
    return candidate ? [{ office, candidate }] : [];
  });

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  async function saveImage() {
    if (!chosen.length || busy) return;
    setNotice(null); setBusy(true);
    try {
      const blob = await renderBallotCard(chosen.map(({ office, candidate }) => ({
        name: candidate.name, number: candidate.number, party: candidate.party,
        office: OFFICES[office].label,
        photoUrl: candidate.photo.startsWith("/") ? new URL(assetUrl(candidate.photo), window.location.origin).toString() : candidate.photo,
        fallbackPhotoUrl: candidate.fallbackPhoto ? new URL(assetUrl(candidate.fallbackPhoto), window.location.origin).toString() : undefined,
      })), caption);
      setPreviewUrl((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return URL.createObjectURL(blob);
      });
    } catch { setNotice("Não foi possível gerar a imagem."); }
    finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button type="button" className="absolute inset-0 bg-neutral-950/40" aria-label="Fechar" onClick={onClose} />
      <div className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-3xl sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Somente nesta página</p>
            <h2 className="text-xl font-semibold text-neutral-950">Suas escolhas</h2>
            <p className="mt-1 text-sm text-neutral-500">Elas não são enviadas nem guardadas. Ao fechar ou atualizar a página, desaparecem.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="rounded-full p-2 text-neutral-400 hover:bg-neutral-100">×</button>
        </div>
        <div className="flex flex-col gap-3">
          {slots.map(({ office, index }) => {
            const candidate = choices[office]?.[index];
            return <div key={`${office}-${index}`} className="flex flex-col gap-3 rounded-2xl border border-neutral-200 px-3 py-3 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                {candidate ? <img src={candidate.photo.startsWith("/") ? assetUrl(candidate.photo) : candidate.photo} alt="" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = assetUrl(candidate.fallbackPhoto ?? "/candidates/senators/placeholder.svg"); }} className="h-14 w-14 shrink-0 rounded-full object-cover object-top" /> : <span className="h-14 w-14 shrink-0 rounded-full border border-neutral-200 bg-neutral-50" />}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{slotLabel(office, index)}</p>
                  <p className="truncate font-semibold text-neutral-950">{candidate?.name ?? "Ainda sem escolha"}</p>
                  {candidate ? <p className="truncate text-xs text-neutral-500">{candidate.party} · {candidate.number}</p> : null}
                </div>
                {candidate ? <PartyBadge party={candidate.party} size={30} /> : null}
              </div>
              <div className="flex shrink-0 items-center justify-end gap-2">
                {candidate ? <button type="button" onClick={() => onClear(office, index)} className="rounded-full px-3 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100">Remover</button> : null}
                <button type="button" onClick={() => onOffice(office, index)} className="rounded-full bg-neutral-950 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800">{candidate ? "Trocar" : "Escolher"}</button>
              </div>
            </div>;
          })}
        </div>
        <div className="mt-5">
          <button type="button" disabled={!chosen.length || busy} onClick={() => void saveImage()} className="w-full rounded-full bg-neutral-950 px-4 py-3 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-40">{busy ? "Preparando imagem..." : "Gerar imagem para salvar"}</button>
          {notice ? <p className="mt-2 text-xs text-neutral-500">{notice}</p> : null}
        </div>
      </div>
      {previewUrl ? <div className="fixed inset-0 z-[80] flex items-center justify-center bg-neutral-950/55 p-4" role="dialog" aria-modal="true" aria-label="Prévia das escolhas">
        <button type="button" className="absolute inset-0" aria-label="Fechar prévia" onClick={() => setPreviewUrl(null)} />
        <div className="relative z-10 flex max-h-[82vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white p-4 shadow-2xl">
          <button type="button" onClick={() => setPreviewUrl(null)} aria-label="Fechar" className="absolute right-3 top-3 z-10 rounded-full bg-white/90 px-3 py-1 text-xl text-neutral-600 shadow">×</button>
          <img src={previewUrl} alt="Prévia das escolhas" className="min-h-0 w-full flex-1 rounded-xl object-contain" />
          <a href={previewUrl} download={downloadName} className="mt-4 block shrink-0 rounded-full bg-neutral-950 px-5 py-3 text-center text-sm font-semibold text-white hover:bg-neutral-800">Salvar no dispositivo</a>
        </div>
      </div> : null}
    </div>
  );
}
