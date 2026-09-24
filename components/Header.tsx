"use client";

import Link from "next/link";

const OFFICES = [
  { id: "presidente", label: "Presidente" },
  { id: "senador", label: "Senadores" },
  { id: "deputado_federal", label: "Dep. Federal" },
  { id: "deputado_estadual", label: "Dep. Estadual" },
] as const;

type Props = {
  office: string;
  onOffice: (id: string) => void;
  onBallot: () => void;
};

export function Header({ office, onOffice, onBallot }: Props) {
  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-950 text-white">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="m5 13.5 5 5L20 7" stroke="#22c55e" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="text-lg font-semibold tracking-tight text-neutral-950">meu<span className="text-emerald-600">voto</span><span className="text-neutral-400">.org</span></span>
          </Link>
          <nav className="hidden items-center gap-1 rounded-full bg-neutral-100 p-1 md:flex">
            {OFFICES.map((item) => <button key={item.id} type="button" onClick={() => onOffice(item.id)} className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${office === item.id ? "bg-white text-neutral-950 shadow-sm" : "text-neutral-500 hover:text-neutral-800"}`}>{item.label}</button>)}
          </nav>
        </div>
        <button type="button" onClick={onBallot} className="rounded-full bg-neutral-950 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800">Escolhas temporárias</button>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-4 pb-3 md:hidden">
        {OFFICES.map((item) => <button key={item.id} type="button" onClick={() => onOffice(item.id)} className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${office === item.id ? "bg-neutral-950 text-white" : "bg-neutral-100 text-neutral-500"}`}>{item.label}</button>)}
      </nav>
    </header>
  );
}
