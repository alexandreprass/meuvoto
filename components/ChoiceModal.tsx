"use client";

import { useEffect, useState } from "react";
import type { Candidate, OfficeId } from "@/lib/offices";
import { OFFICES } from "@/lib/offices";
import type { MePayload } from "@/lib/types";
import { renderBallotCard } from "./ballot-card";
import { XIcon } from "./XIcon";
import { PartyBadge } from "./PartyBadge";

const OFFICES_ORDER: OfficeId[] = ["presidente", "senador", "deputado_federal", "deputado_estadual"];

type Props = {
  me: MePayload;
  candidatesByOffice: Partial<Record<OfficeId, Candidate | undefined>>;
  guestMode: boolean;
  onGuestMode: () => void;
  onLogin: () => void;
  onClose: () => void;
  onOffice: (office: OfficeId) => void;
};

function photoSrc(office: OfficeId, candidate: Candidate) {
  const params = new URLSearchParams({
    office,
    id: candidate.id,
    state: candidate.state ?? "BR",
  });
  return `/api/candidate/photo?${params}`;
}

export function ChoiceModal({ me, candidatesByOffice, guestMode, onGuestMode, onLogin, onClose, onOffice }: Props) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const chosen = OFFICES_ORDER.flatMap((office) => {
    const candidate = candidatesByOffice[office];
    return candidate ? [{ office, candidate }] : [];
  });
  const ballotReady = me.loggedIn || guestMode;

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  async function saveImage() {
    if (chosen.length === 0 || busy) return;
    setNotice(null);
    setBusy(true);
    try {
      const blob = await renderBallotCard(chosen.map(({ office, candidate }) => ({
        name: candidate.name,
        number: candidate.number,
        party: candidate.party,
        office: OFFICES[office].label,
        photoUrl: photoSrc(office, candidate),
        fallbackPhotoUrl: candidate.fallbackPhoto,
      })));
      const url = URL.createObjectURL(blob);
      setPreviewUrl((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return url;
      });
    } catch {
      setNotice("N\u00e3o foi poss\u00edvel gerar a imagem.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button type="button" className="absolute inset-0 bg-neutral-950/40" aria-label="Fechar" onClick={onClose} />
      <div className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-3xl sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">{me.loggedIn ? "Salva na sua conta" : "Monte sua cédula"}</p>
            <h2 className="text-xl font-semibold text-neutral-950">Sua cédula</h2>
            <p className="mt-1 text-sm text-neutral-500">
              {me.loggedIn && me.state ? `Estado ${me.state}. Suas escolhas ficam salvas na sua conta.` : ballotReady ? "Suas escolhas como convidado não serão salvas." : "Entre para começar a montar sua cédula."}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="rounded-full p-2 text-neutral-400 hover:bg-neutral-100">
            ×
          </button>
        </div>
        {!me.loggedIn && !guestMode ? (
          <div className="mb-5 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-center">
            <button
              type="button"
              onClick={onLogin}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-neutral-950 px-4 py-3 text-sm font-semibold text-white hover:bg-neutral-800"
            >
              <XIcon className="h-4 w-4" />
              ENTRAR COM X
            </button>
            <p className="mt-1 text-[10px] text-neutral-400">Suas escolhas ficam salvas</p>
            <button
              type="button"
              onClick={onGuestMode}
              className={`mt-3 w-full rounded-full border px-4 py-3 text-sm font-semibold ${
                guestMode
                  ? "border-emerald-700 bg-emerald-50 text-emerald-800"
                  : "border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-100"
              }`}
            >
              LOGAR COMO CONVIDADO
            </button>
          </div>
        ) : null}
      {ballotReady ? <>
        <div className="flex flex-col gap-3">
          {OFFICES_ORDER.map((office) => {
            const candidate = candidatesByOffice[office];
            const choice = Boolean(candidate);
            return (
              <div key={office} className="flex min-h-20 items-center gap-3 rounded-2xl border border-black px-3 py-3">
                {candidate && choice ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={candidate.photo}
                    alt=""
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = candidate.fallbackPhoto ?? "/candidates/senators/placeholder.svg";
                    }}
                    className="h-14 w-14 shrink-0 rounded-full object-cover object-top"
                  />
                ) : (
                  <span className="h-14 w-14 shrink-0 rounded-full border border-black bg-neutral-50" />
                )}
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
                {candidate ? <PartyBadge party={candidate.party} size={30} /> : null}
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

        <div className="mt-5">
          <button type="button" disabled={chosen.length === 0 || busy} onClick={() => void saveImage()} className="w-full rounded-full bg-neutral-950 px-4 py-3 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-40">
            {busy ? "Preparando imagem..." : "Salvar imagem"}
          </button>
          {notice ? <p className="mt-2 text-xs text-neutral-500">{notice}</p> : null}
        </div>
        </> : null}
      </div>
      {previewUrl ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-neutral-950/55 p-4" role="dialog" aria-modal="true" aria-label="Prévia da imagem da cédula">
          <button type="button" className="absolute inset-0" aria-label="Fechar prévia" onClick={() => setPreviewUrl(null)} />
          <div className="relative z-10 flex max-h-[82vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white p-4 shadow-2xl sm:p-5">
            <button type="button" onClick={() => setPreviewUrl(null)} aria-label="Fechar" className="absolute right-3 top-3 z-10 rounded-full bg-white/90 px-3 py-1 text-xl text-neutral-600 shadow">×</button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="Prévia da imagem da cédula" className="min-h-0 w-full flex-1 rounded-xl object-contain" />
            <a href={previewUrl} download="minha-cedula-meuvoto.png" className="mt-4 block shrink-0 rounded-full bg-neutral-950 px-5 py-3 text-center text-sm font-semibold text-white hover:bg-neutral-800">
              Salvar no dispositivo
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}

