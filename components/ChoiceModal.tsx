"use client";

import { useState } from "react";
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
  const chosen = OFFICES_ORDER.flatMap((office) => {
    const candidate = candidatesByOffice[office];
    return candidate ? [{ office, candidate }] : [];
  });
  const ballotReady = me.loggedIn || guestMode;

  async function saveImage() {
    if (chosen.length === 0 || busy) return;
    setNotice(null);
    const preview = window.open("about:blank", "_blank");
    if (!preview) {
      setNotice("Permita abrir uma nova guia para salvar sua imagem.");
      return;
    }
    setBusy(true);
    try {
      const blob = await renderBallotCard(chosen.map(({ office, candidate }) => ({
        name: candidate.name,
        number: candidate.number,
        party: candidate.party,
        office: OFFICES[office].label,
        photoUrl: photoSrc(office, candidate),
      })));
      const url = URL.createObjectURL(blob);
      preview.document.open();
      preview.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Minha c&eacute;dula | MeuVoto</title><style>*{box-sizing:border-box}body{margin:0;padding:24px;background:#eef3ef;color:#15251e;font:16px system-ui,sans-serif}.page{max-width:900px;margin:auto;text-align:center}.save{display:inline-block;margin:0 auto 20px;padding:13px 22px;border-radius:999px;background:#0e5b43;color:#fff;text-decoration:none;font-weight:700}.image{display:block;width:100%;height:auto;margin:auto;border-radius:16px;box-shadow:0 12px 40px #142d201f}</style></head><body><main class="page"><a class="save" href="${url}" download="minha-cedula-meuvoto.png">Salvar no dispositivo</a><img class="image" src="${url}" alt="Imagem da minha c&eacute;dula"></main></body></html>`);
      preview.document.close();
    } catch {
      preview.close();
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
    </div>
  );
}

