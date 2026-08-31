"use client";

import { useMemo, useState } from "react";
import { signIn } from "next-auth/react";
import { CANDIDATES, getCandidate } from "@/lib/candidates";
import { REGIONS, STATES, UF_MAP } from "@/lib/states";
import type { MePayload } from "@/lib/types";
import { XIcon } from "./XIcon";

type Props = {
  open: boolean;
  me: MePayload | null;
  onClose: () => void;
  onVoted: () => void;
};

export function VoteModal({ open, me, onClose, onVoted }: Props) {
  const [state, setState] = useState(me?.vote?.state ?? "");
  const [candidateId, setCandidateId] = useState(me?.vote?.candidateId ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const alreadyVoted = Boolean(me?.vote);
  const votedCandidate = me?.vote ? getCandidate(me.vote.candidateId) : null;
  const votedState = me?.vote ? UF_MAP[me.vote.state] : null;

  const grouped = useMemo(
    () =>
      REGIONS.map((region) => ({
        region,
        states: STATES.filter((s) => s.region === region),
      })),
    [],
  );

  if (!open) return null;

  async function submit() {
    setError(null);
    if (!state) {
      setError("Informe o estado.");
      return;
    }
    if (!candidateId) {
      setError("Escolha um candidato.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId, state }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Não foi possível registrar o voto.");
        return;
      }
      onVoted();
    } catch {
      setError("Falha de conexão. Tente de novo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-neutral-950/40"
        aria-label="Fechar"
        onClick={onClose}
      />
      <div className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-3xl sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
              Presidente
            </p>
            <h2 className="text-xl font-semibold text-neutral-950">
              {alreadyVoted ? "Seu voto foi registrado" : "Registrar voto"}
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              1 voto por conta do X. Senadores e deputados entram em breve.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
          >
            ✕
          </button>
        </div>

        {!me?.loggedIn ? (
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-6 text-center">
            <p className="mb-4 text-sm text-neutral-600">
              Entre com o X para votar. Usamos a conta só para garantir um voto por pessoa.
            </p>
            <button
              type="button"
              onClick={() => signIn("twitter")}
              className="inline-flex items-center gap-2 rounded-full bg-neutral-950 px-5 py-3 text-sm font-semibold text-white hover:bg-neutral-800"
            >
              <XIcon className="h-4 w-4" />
              Entrar com X
            </button>
          </div>
        ) : alreadyVoted ? (
          <div className="rounded-2xl border border-neutral-200 p-5">
            <div className="flex items-center gap-4">
              {votedCandidate ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={votedCandidate.photo}
                  alt=""
                  className="h-16 w-16 rounded-full object-cover object-top"
                />
              ) : null}
              <div>
                <p className="text-lg font-semibold text-neutral-950">
                  {votedCandidate?.name}
                </p>
                <p className="text-sm text-neutral-500">
                  {votedCandidate?.party} · {votedState?.name} ({me.vote?.state})
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-neutral-700">
                Seu estado
              </span>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-950 outline-none focus:border-neutral-400"
              >
                <option value="">Selecione o estado</option>
                {grouped.map((g) => (
                  <optgroup key={g.region} label={g.region}>
                    {g.states.map((s) => (
                      <option key={s.uf} value={s.uf}>
                        {s.name} ({s.uf})
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>

            <div>
              <p className="mb-2 text-sm font-medium text-neutral-700">Candidato</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {CANDIDATES.map((c) => {
                  const selected = candidateId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCandidateId(c.id)}
                      className={`flex items-center gap-3 rounded-2xl border p-2.5 text-left transition ${
                        selected
                          ? "border-neutral-950 bg-neutral-50 ring-1 ring-neutral-950"
                          : "border-neutral-200 hover:border-neutral-300"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={c.photo}
                        alt=""
                        className="h-12 w-12 rounded-full object-cover object-top"
                      />
                      <span>
                        <span className="block text-sm font-semibold text-neutral-950">
                          {c.name}
                        </span>
                        <span className="block text-[11px] uppercase tracking-wide text-neutral-400">
                          {c.party} · {c.number}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {error ? (
              <p className="text-sm text-red-600">{error}</p>
            ) : null}

            <button
              type="button"
              disabled={submitting}
              onClick={submit}
              className="rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {submitting ? "Registrando..." : "Confirmar meu voto"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
