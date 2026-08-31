"use client";

import { useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import type { MePayload } from "@/lib/types";
import { getCandidate } from "@/lib/candidates";

type ChatItem = {
  id: string;
  name: string;
  username: string | null;
  candidateNumber: string | null;
  candidateColor: string | null;
  body: string;
  createdAt: string;
};

type Props = {
  open: boolean;
  me: MePayload | null;
  onClose: () => void;
  onVote: () => void;
};

export function OpinionChat({ open, me, onClose, onVote }: Props) {
  const [messages, setMessages] = useState<ChatItem[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    let stop = false;
    async function load() {
      const res = await fetch("/api/chat", { cache: "no-store" });
      const data = await res.json();
      if (!stop) setMessages(data.messages ?? []);
    }
    load();
    const id = setInterval(load, 4000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [open]);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, open]);

  if (!open) return null;

  const voted = Boolean(me?.vote);
  const myCandidate = me?.vote ? getCandidate(me.vote.candidateId) : null;

  async function send() {
    setError(null);
    if (!me?.loggedIn) {
      signIn("twitter");
      return;
    }
    if (!voted) {
      setError("Vote para presidente primeiro para dar sua opinião");
      return;
    }
    const body = text.trim();
    if (!body) return;
    setSending(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Não foi possível enviar.");
        return;
      }
      setText("");
      setMessages(data.messages ?? []);
    } catch {
      setError("Falha de conexão.");
    } finally {
      setSending(false);
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
      <div className="relative flex h-[85vh] w-full max-w-lg flex-col rounded-t-3xl bg-white shadow-2xl sm:h-[640px] sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
              Comunidade
            </p>
            <h2 className="text-lg font-semibold text-neutral-950">Dê sua opinião</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
          >
            ✕
          </button>
        </div>

        <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {messages.length === 0 ? (
            <p className="text-center text-sm text-neutral-400">
              Nenhuma mensagem ainda. Quem votou pode começar.
            </p>
          ) : (
            messages.map((m) => (
              <div key={m.id} className="rounded-2xl bg-neutral-50 px-3 py-2">
                <p className="text-xs font-semibold text-neutral-950">
                  {m.name}
                  {m.candidateNumber ? (
                    <span
                      className="ml-1.5 font-bold"
                      style={{ color: m.candidateColor ?? "#111" }}
                    >
                      (VOTA {m.candidateNumber})
                    </span>
                  ) : null}
                </p>
                <p className="mt-0.5 text-sm text-neutral-700">{m.body}</p>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-neutral-100 p-4">
          {!voted ? (
            <div className="rounded-2xl bg-amber-50 px-4 py-3 text-center">
              <p className="text-sm font-medium text-amber-950">
                Vote para presidente primeiro para dar sua opinião
              </p>
              <button
                type="button"
                onClick={onVote}
                className="mt-2 rounded-full bg-neutral-950 px-4 py-2 text-xs font-semibold text-white"
              >
                Votar agora
              </button>
            </div>
          ) : (
            <>
              {myCandidate ? (
                <p className="mb-2 text-[11px] text-neutral-400">
                  Você aparece como {me?.name || me?.username}{" "}
                  <span className="font-semibold" style={{ color: myCandidate.color }}>
                    (VOTA {myCandidate.number})
                  </span>
                </p>
              ) : null}
              <div className="flex gap-2">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  maxLength={280}
                  placeholder="Escreva sua opinião..."
                  className="min-w-0 flex-1 rounded-full border border-neutral-200 px-4 py-2.5 text-sm outline-none focus:border-neutral-400"
                />
                <button
                  type="button"
                  disabled={sending}
                  onClick={send}
                  className="rounded-full bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Enviar
                </button>
              </div>
            </>
          )}
          {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}
