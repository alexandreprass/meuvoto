"use client";

import { useCallback, useEffect, useState } from "react";
import { OFFICES, type OfficeId } from "@/lib/offices";

type Vote = {
  twitterId: string;
  office: OfficeId;
  candidateId: string;
  candidateName: string;
  candidateParty: string | null;
  candidateNumber: string | null;
  state: string;
  stateKey: string;
  createdAt: string;
};

type User = {
  twitterId: string;
  username: string | null;
  name: string | null;
  email: string | null;
  image: string | null;
  createdAt: string;
  lastLoginAt: string;
  blockedAt: string | null;
  votes: Vote[];
};

function voteKey(vote: Vote) {
  return [vote.twitterId, vote.office, vote.stateKey].join("|");
}

export function AdminClient() {
  const [password, setPassword] = useState("");
  const [users, setUsers] = useState<User[] | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedVotes, setSelectedVotes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/data", { cache: "no-store" });
    if (response.status === 401) {
      setUnauthorized(true);
      setUsers(null);
      return;
    }
    const data = await response.json();
    setUsers(data.users ?? []);
    setUnauthorized(false);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  async function login(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Não foi possível entrar.");
      return;
    }
    setPassword("");
    await load();
  }

  async function action(body: object, confirmation: string) {
    if (!window.confirm(confirmation)) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Operação não concluída.");
      setSelectedUsers([]);
      setSelectedVotes([]);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operação não concluída.");
    } finally {
      setBusy(false);
    }
  }

  if (unauthorized || users === null) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-100 p-4">
        <form onSubmit={login} className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-neutral-950">Administração</h1>
          <p className="mt-1 text-sm text-neutral-500">Acesso restrito.</p>
          <label className="mt-5 block text-sm font-medium text-neutral-700">
            Senha
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoFocus
              className="mt-1.5 w-full rounded-md border border-neutral-300 px-3 py-2 outline-none focus:border-neutral-600"
            />
          </label>
          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
          <button type="submit" className="mt-4 w-full rounded-md bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white">
            Entrar
          </button>
        </form>
      </main>
    );
  }

  const allVotes = users.flatMap((user) => user.votes);
  const chosenVotes = allVotes.filter((vote) => selectedVotes.includes(voteKey(vote)));

  return (
    <main className="min-h-screen bg-neutral-100 text-neutral-950">
      <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-3 px-4 py-3">
          <div className="mr-auto">
            <h1 className="font-semibold">Administração do meuvoto.org</h1>
            <p className="text-xs text-neutral-500">{users.length} cadastros · {allVotes.length} votos</p>
          </div>
          <button disabled={busy || selectedVotes.length === 0} onClick={() => action({ action: "delete_votes", votes: chosenVotes.map(({ twitterId, office, stateKey }) => ({ twitterId, office, stateKey })) }, "Excluir os votos selecionados?")} className="rounded-md border border-red-300 px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-40">Excluir votos ({selectedVotes.length})</button>
          <button disabled={busy || selectedUsers.length === 0} onClick={() => action({ action: "block_users", twitterIds: selectedUsers }, "Bloquear os usuários selecionados?")} className="rounded-md border border-amber-300 px-3 py-2 text-xs font-semibold text-amber-800 disabled:opacity-40">Bloquear</button>
          <button disabled={busy || selectedUsers.length === 0} onClick={() => action({ action: "unblock_users", twitterIds: selectedUsers }, "Desbloquear os usuários selecionados?")} className="rounded-md border border-neutral-300 px-3 py-2 text-xs font-semibold disabled:opacity-40">Desbloquear</button>
          <button disabled={busy || selectedUsers.length === 0} onClick={() => action({ action: "delete_users", twitterIds: selectedUsers }, "Excluir definitivamente os cadastros selecionados, seus votos e mensagens?")} className="rounded-md bg-red-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">Excluir cadastros</button>
          <button onClick={async () => { await fetch("/api/admin/logout", { method: "POST" }); location.reload(); }} className="rounded-md bg-neutral-950 px-3 py-2 text-xs font-semibold text-white">Sair</button>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] p-4">
        {error ? <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
          <table className="w-full min-w-[1050px] border-collapse text-left text-sm">
            <thead className="bg-neutral-50 text-xs uppercase text-neutral-500">
              <tr>
                <th className="p-3"><input type="checkbox" aria-label="Selecionar todos" checked={selectedUsers.length === users.length && users.length > 0} onChange={(event) => setSelectedUsers(event.target.checked ? users.map((user) => user.twitterId) : [])} /></th>
                <th className="p-3">Cadastro</th>
                <th className="p-3">Status</th>
                <th className="p-3">Último acesso</th>
                <th className="p-3">Votos</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.twitterId} className="border-t border-neutral-100 align-top">
                  <td className="p-3"><input type="checkbox" aria-label={"Selecionar " + (user.username ?? user.twitterId)} checked={selectedUsers.includes(user.twitterId)} onChange={(event) => setSelectedUsers((current) => event.target.checked ? [...current, user.twitterId] : current.filter((id) => id !== user.twitterId))} /></td>
                  <td className="p-3">
                    <p className="font-semibold">{user.name ?? "Sem nome"}</p>
                    <p className="text-neutral-500">@{user.username ?? "sem_usuario"}</p>
                    <p className="mt-1 font-mono text-[11px] text-neutral-400">{user.twitterId}</p>
                  </td>
                  <td className="p-3">{user.blockedAt ? <span className="rounded bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">Bloqueado</span> : <span className="rounded bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">Ativo</span>}</td>
                  <td className="p-3 whitespace-nowrap text-neutral-600">{new Date(user.lastLoginAt).toLocaleString("pt-BR")}</td>
                  <td className="p-3">
                    {user.votes.length === 0 ? <span className="text-neutral-400">Nenhum voto</span> : (
                      <div className="space-y-2">
                        {user.votes.map((vote) => {
                          const key = voteKey(vote);
                          return (
                            <label key={key} className="flex items-start gap-2 rounded-md border border-neutral-200 p-2">
                              <input type="checkbox" className="mt-1" checked={selectedVotes.includes(key)} onChange={(event) => setSelectedVotes((current) => event.target.checked ? [...current, key] : current.filter((item) => item !== key))} />
                              <span>
                                <span className="block text-xs font-semibold uppercase text-neutral-500">{OFFICES[vote.office].label} · {vote.stateKey}</span>
                                <span className="font-medium">{vote.candidateName}</span>
                                <span className="ml-1 text-xs text-neutral-500">{vote.candidateParty} {vote.candidateNumber}</span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
