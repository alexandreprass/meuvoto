"use client";

import { useState, type ReactNode } from "react";
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
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const chosen = OFFICES_ORDER.flatMap((office) => {
    const candidate = candidatesByOffice[office];
    return candidate ? [{ office, candidate }] : [];
  });

  async function share(target: "image" | "x" | "instagram" | "facebook" | "tiktok") {
    if (chosen.length === 0 || busy) return;
    setNotice(null);
    const preview = target === "image" ? window.open("about:blank", "_blank") : null;
    setBusy(target);
    try {
      const blob = await renderBallotCard(
        chosen.map(({ office, candidate }) => ({
          name: candidate.name,
          number: candidate.number,
          party: candidate.party,
          office: OFFICES[office].label,
          photoUrl: photoSrc(office, candidate),
        })),
      );
      const file = new File([blob], "meus-candidatos-2026.png", { type: "image/png" });
      if (target === "image") {
        const url = URL.createObjectURL(blob);
        if (preview) preview.location.href = url;
        else window.open(url, "_blank", "noopener");
        return;
      }
      preview?.close();
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "MEUS CANDIDATOS PARA ELEIÇÃO DE 2026",
          text: "MEUS CANDIDATOS PARA ELEIÇÃO DE 2026",
        });
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.name;
      link.click();
      const text = encodeURIComponent("MEUS CANDIDATOS PARA ELEIÇÃO DE 2026");
      const destinations = {
        x: `https://twitter.com/intent/tweet?text=${text}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?quote=${text}`,
        instagram: "https://www.instagram.com/",
        tiktok: "https://www.tiktok.com/tiktokstudio/upload",
      };
      window.open(destinations[target], "_blank", "noopener");
      setNotice("A imagem foi baixada. Anexe ela na rede que abriu.");
    } catch (error) {
      preview?.close();
      if (error instanceof DOMException && error.name === "AbortError") return;
      setNotice("Não foi possível gerar a imagem.");
    } finally {
      setBusy(null);
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
              {me.loggedIn && me.state
                ? `Estado ${me.state}. Suas escolhas ficam salvas na sua conta.`
                : "Escolha os candidatos que você quer incluir."}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="rounded-full p-2 text-neutral-400 hover:bg-neutral-100">
            ×
          </button>
        </div>
        {!me.loggedIn ? (
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
            {guestMode ? <p className="mt-1 text-[10px] text-neutral-400">Modo convidado ativo — escolhas não salvas</p> : null}
          </div>
        ) : null}
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
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Compartilhar</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <ShareButton label="X" busy={busy === "x"} disabled={chosen.length === 0 || Boolean(busy)} onClick={() => void share("x")}>
              <XIcon className="h-4 w-4" />
            </ShareButton>
            <ShareButton label="Instagram" busy={busy === "instagram"} disabled={chosen.length === 0 || Boolean(busy)} onClick={() => void share("instagram")}>
              <InstagramIcon />
            </ShareButton>
            <ShareButton label="Facebook" busy={busy === "facebook"} disabled={chosen.length === 0 || Boolean(busy)} onClick={() => void share("facebook")}>
              <FacebookIcon />
            </ShareButton>
            <ShareButton label="TikTok" busy={busy === "tiktok"} disabled={chosen.length === 0 || Boolean(busy)} onClick={() => void share("tiktok")}>
              <TikTokIcon />
            </ShareButton>
            <ShareButton label="Compartilhar" busy={busy === "image"} disabled={chosen.length === 0 || Boolean(busy)} onClick={() => void share("image")}>
              <ShareIcon />
            </ShareButton>
          </div>
          {notice ? <p className="mt-2 text-xs text-neutral-500">{notice}</p> : null}
        </div>
      </div>
    </div>
  );
}

function ShareButton({
  label,
  busy,
  disabled,
  onClick,
  children,
}: {
  label: string;
  busy: boolean;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-10 items-center gap-2 rounded-full border border-black px-3 text-xs font-semibold text-neutral-950 hover:bg-neutral-50 disabled:opacity-40"
    >
      {children}
      <span>{busy ? "..." : label}</span>
    </button>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.4" cy="6.6" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="currentColor">
      <path d="M14.5 8.5V6.8c0-.7.5-1 1.2-1H17V3h-2.1C12.4 3 11 4.5 11 6.6v1.9H9v2.7h2V21h3.5v-9.8h2.3l.4-2.7h-2.7z" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="currentColor">
      <path d="M14.2 3c.4 2.4 1.8 4.1 4.1 4.5v2.4c-1.4 0-2.7-.4-4-1.2v6.5c0 3.4-2.6 5.8-5.9 5.8S2.5 18.6 2.5 15.2c0-3.3 2.5-5.7 5.7-5.8v2.6c-1.6.1-2.9 1.4-2.9 3.2 0 1.8 1.4 3.2 3.2 3.2s3.2-1.4 3.2-3.2V3h2.5z" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="6" cy="12" r="2.2" />
      <circle cx="17" cy="6.5" r="2.2" />
      <circle cx="17" cy="17.5" r="2.2" />
      <path d="M8 11.2 14.8 7.4M8 12.8l6.8 3.6" />
    </svg>
  );
}
