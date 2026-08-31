"use client";

import { useState } from "react";
import type { MePayload } from "@/lib/types";

type Props = {
  open: boolean;
  me: MePayload | null;
  onClose: () => void;
  onDeleted: () => void;
};

export function ProfileModal({ open, me, onClose, onDeleted }: Props) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  if (!open || !me?.loggedIn) return null;

  async function deleteVotes() {
    if (!window.confirm("Apagar todos os seus votos? Esta ação só pode ser usada uma vez.")) return;
    setDeleting(true);
    setError("");
    try {
      const response = await fetch("/api/me/votes", { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Não foi possível apagar.");
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível apagar.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-neutral-950/45" aria-label="Fechar" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-lg bg-white p-6 text-center shadow-2xl">
        <button type="button" onClick={onClose} aria-label="Fechar" className="absolute right-3 top-3 rounded-full p-2 text-neutral-400 hover:bg-neutral-100">×</button>
        {me.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={me.image} alt="" className="mx-auto h-24 w-24 rounded-full object-cover ring-4 ring-neutral-100" />
        ) : (
          <span className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-neutral-950 text-2xl font-bold text-white">
            {(me.username ?? "X").slice(0, 1).toUpperCase()}
          </span>
        )}
        <h2 className="mt-4 text-lg font-semibold text-neutral-950">{me.name ?? me.username}</h2>
        <p className="text-sm text-neutral-500">@{me.username ?? "conta"}</p>
        <button
          type="button"
          disabled={deleting || !me.canDeleteVotes || me.votes.length === 0}
          onClick={deleteVotes}
          className="mt-6 w-full rounded-md bg-red-700 px-4 py-3 text-sm font-bold uppercase text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-neutral-300"
        >
          {deleting ? "Apagando..." : "Apagar votos"}
        </button>
        <p className="mt-3 text-xs font-medium uppercase leading-relaxed text-neutral-500">
          {me.canDeleteVotes
            ? "Você pode apagar seus votos apenas uma vez, aproveite"
            : "Você já utilizou a exclusão única dos seus votos"}
        </p>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </div>
    </div>
  );
}
