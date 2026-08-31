"use client";

import { signIn, signOut } from "next-auth/react";
import { XIcon } from "./XIcon";
import type { MePayload } from "@/lib/types";

const OFFICES = [
  { id: "presidente", label: "Presidente", soon: false },
  { id: "senadores", label: "Senadores", soon: true },
  { id: "deputados", label: "Deputados", soon: true },
] as const;

type Props = {
  me: MePayload | null;
  office: string;
  onOffice: (id: string) => void;
  onVote: () => void;
};

export function Header({ me, office, onOffice, onVote }: Props) {
  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center justify-between gap-6">
          <a href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-950 text-white">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M5 13.5l5 5L20 7"
                  stroke="#22c55e"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="text-lg font-semibold tracking-tight text-neutral-950">
              meu<span className="text-emerald-600">voto</span>
              <span className="text-neutral-400">.org</span>
            </span>
          </a>

          <nav className="hidden items-center gap-1 rounded-full bg-neutral-100 p-1 md:flex">
            {OFFICES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onOffice(item.id)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                  office === item.id && !item.soon
                    ? "bg-white text-neutral-950 shadow-sm"
                    : "text-neutral-500 hover:text-neutral-800"
                }`}
              >
                {item.label}
                {item.soon ? (
                  <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
                    breve
                  </span>
                ) : null}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {me?.loggedIn ? (
            <>
              <div className="flex min-w-0 items-center gap-2 rounded-full border border-neutral-200 py-1 pr-3 pl-1">
                {me.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={me.image}
                    alt=""
                    className="h-7 w-7 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-900 text-[10px] font-bold text-white">
                    {(me.username ?? "X").slice(0, 1).toUpperCase()}
                  </span>
                )}
                <span className="max-w-[120px] truncate text-sm text-neutral-700">
                  @{me.username ?? "conta"}
                </span>
              </div>
              <button
                type="button"
                onClick={onVote}
                className="rounded-full bg-neutral-950 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
              >
                {me.vote ? "Seu voto" : "Votar"}
              </button>
              <button
                type="button"
                onClick={() => signOut()}
                className="rounded-full px-3 py-2 text-sm text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
              >
                Sair
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onVote}
                className="rounded-full bg-neutral-950 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
              >
                Votar
              </button>
              <button
                type="button"
                onClick={() => signIn("twitter")}
                className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-neutral-50"
              >
                <XIcon className="h-3.5 w-3.5" />
                Entrar com X
              </button>
            </>
          )}
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-4 pb-3 md:hidden">
        {OFFICES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onOffice(item.id)}
            className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${
              office === item.id && !item.soon
                ? "bg-neutral-950 text-white"
                : "bg-neutral-100 text-neutral-500"
            }`}
          >
            {item.label}
            {item.soon ? " · breve" : ""}
          </button>
        ))}
      </nav>
    </header>
  );
}
