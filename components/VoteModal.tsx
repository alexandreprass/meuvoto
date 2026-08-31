"use client";

import { useMemo, useState } from "react";
import { signIn } from "next-auth/react";
import type { Candidate, OfficeId } from "@/lib/offices";
import { isStateOffice, OFFICES, voteScope } from "@/lib/offices";
import { REGIONS, STATES, UF_MAP } from "@/lib/states";
import type { MePayload } from "@/lib/types";
import { XIcon } from "./XIcon";

type Props = {
  open: boolean;
  summary: boolean;
  office: OfficeId;
  selectedState: string;
  candidates: Candidate[];
  me: MePayload | null;
  voteCandidates: Partial<Record<OfficeId, Candidate>>;
  onSelectOffice: (office: OfficeId) => void;
  onClose: () => void;
  onVoted: () => void;
};

export function VoteModal({
  open,
  summary,
  office,
  selectedState,
  candidates,
  me,
  voteCandidates,
  onSelectOffice,
  onClose,
  onVoted,
}: Props) {
  const [state, setState] = useState(selectedState);
  const [candidateId, setCandidateId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");


  const stateKey = state ? voteScope(office, state) : "";
  const currentVote =
    me?.votes.find((vote) => vote.office === office && vote.stateKey === stateKey) ?? null;
  const alreadyVoted = Boolean(currentVote);
  const votedCandidate = currentVote
    ? candidates.find((candidate) => candidate.id === currentVote.candidateId)
    : null;
  const votedState = currentVote ? UF_MAP[currentVote.state] : null;

  const grouped = useMemo(
    () =>
      REGIONS.map((region) => ({
        region,
        states: STATES.filter((s) => s.region === region),
      })),
    [],
  );

  if (!open) return null;

  if (summary && me?.loggedIn) {
    const offices: OfficeId[] = ["presidente", "senador", "deputado_federal", "deputado_estadual"];
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
        <button type="button" className="absolute inset-0 bg-neutral-950/40" aria-label="Fechar" onClick={onClose} />
        <div className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-3xl sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Sua participação</p>
              <h2 className="text-xl font-semibold text-neutral-950">Seus votos</h2>
              <p className="mt-1 text-sm text-neutral-500">Um voto por cargo na enquete.</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Fechar" className="rounded-full p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700">×</button>
          </div>
          <div className="divide-y divide-neutral-100 border-y border-neutral-100">
            {offices.map((targetOffice) => {
              const targetVote = targetOffice === "presidente"
                ? me.votes.find((vote) => vote.office === targetOffice)
                : me.votes.find((vote) => vote.office === targetOffice && vote.stateKey === selectedState);
              const candidate = voteCandidates[targetOffice];
              return (
                <div key={targetOffice} className="flex min-h-24 items-center gap-3 py-4">
                  {targetVote ? (
                    <>
                      {candidate ? (
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
                        <span className="h-14 w-14 shrink-0 animate-pulse rounded-full bg-neutral-100" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{OFFICES[targetOffice].label}</p>
                        <p className="truncate font-semibold text-neutral-950">{candidate?.name ?? "Carregando candidato..."}</p>
                        <p className="text-xs text-neutral-500">
                          {candidate ? candidate.party + " · " + candidate.number : ""}
                          {targetOffice !== "presidente" ? " · " + targetVote.state : ""}
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-emerald-600">Votado</span>
                    </>
                  ) : (
                    <>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{OFFICES[targetOffice].label}</p>
                        <p className="mt-1 text-sm text-neutral-500">Você ainda não votou neste cargo.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onSelectOffice(targetOffice)}
                        className="shrink-0 rounded-full bg-neutral-950 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800"
                      >
                        Votar agora
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

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
        body: JSON.stringify({ office, candidateId, state }),
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

  const officeLabel = OFFICES[office].label;
  const stateOffice = isStateOffice(office);
  const filteredCandidates = candidates.filter((candidate) => {
    const term = query.trim().toLocaleLowerCase("pt-BR");
    if (!term) return true;
    return [candidate.name, candidate.fullName, candidate.party, candidate.number]
      .some((value) => value.toLocaleLowerCase("pt-BR").includes(term));
  }).slice(0, 80);
  const emptyCandidates = candidates.length === 0;

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
              {officeLabel}
            </p>
            <h2 className="text-xl font-semibold text-neutral-950">
              {alreadyVoted ? "Seu voto foi registrado" : "Registrar voto"}
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              {stateOffice
                ? "1 voto para " + officeLabel.toLowerCase() + " por conta do X neste estado."
                : "1 voto para presidente por conta do X."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
          >
            ×
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
                  {votedCandidate?.name ?? currentVote?.candidateId}
                </p>
                <p className="text-sm text-neutral-500">
                  {votedCandidate?.party} · {votedState?.name} ({currentVote?.state})
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
                onChange={(e) => {
                  setState(e.target.value);
                  setCandidateId("");
                }}
                disabled
                className="w-full rounded-xl disabled:bg-neutral-100 border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-950 outline-none focus:border-neutral-400"
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
              {candidates.length > 12 ? (
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar por nome, partido ou número"
                  className="mb-3 w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-neutral-400"
                />
              ) : null}
              {emptyCandidates ? (
                <p className="rounded-2xl border border-dashed border-neutral-200 px-4 py-6 text-center text-sm text-neutral-400">
                  Nenhum candidato carregado para este estado.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {filteredCandidates.map((c) => {
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
                          onError={(event) => {
                            event.currentTarget.onerror = null;
                            event.currentTarget.src = c.fallbackPhoto ?? "/candidates/senators/placeholder.svg";
                          }}
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
              )}
            </div>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            <button
              type="button"
              disabled={submitting || emptyCandidates}
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