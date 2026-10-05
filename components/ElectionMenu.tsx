"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export function ElectionMenu({ round }: { round: 1 | 2 }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {open ? (
        <button type="button" aria-label="Fechar menu da eleição" className="fixed inset-0 z-30 bg-black/20" onClick={() => setOpen(false)} />
      ) : null}
      <div className={`fixed left-0 top-1/2 z-40 -translate-y-1/2 overflow-hidden rounded-r-2xl border border-l-0 border-neutral-200 bg-white shadow-xl transition-[width] duration-300 ease-out ${open ? "w-72" : "w-10"}`}>
        <div className={`flex w-72 items-stretch transition-transform duration-300 ease-out ${open ? "translate-x-0" : "-translate-x-[calc(100%-2.5rem)]"}`}>
          <div inert={!open} className="flex min-w-0 flex-1 flex-col justify-center gap-2 py-3 pl-3 pr-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Menu</p>
            <p className="text-xs font-semibold leading-snug text-neutral-950">Eleição presidencial 2026</p>
            <Link
              href="/"
              aria-current={round === 1 ? "page" : undefined}
              onClick={() => setOpen(false)}
              className={`rounded-full px-3 py-2 text-left text-sm font-semibold ${round === 1 ? "bg-neutral-950 text-white" : "bg-neutral-100 text-neutral-600"}`}
            >
              1º Turno
            </Link>
            <Link
              href="/segundo-turno"
              aria-current={round === 2 ? "page" : undefined}
              onClick={() => setOpen(false)}
              className={`rounded-full px-3 py-2 text-left text-sm font-semibold ${round === 2 ? "bg-neutral-950 text-white" : "bg-neutral-100 text-neutral-600"}`}
            >
              2º Turno
            </Link>
          </div>
          <button
            type="button"
            aria-expanded={open}
            aria-label={open ? "Fechar menu da eleição" : "Abrir menu da eleição"}
            onClick={() => setOpen((current) => !current)}
            className="flex w-10 shrink-0 items-center justify-center border-l border-neutral-200 text-neutral-950"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d={open ? "M14.5 6 8.5 12l6 6" : "M9.5 6 15.5 12l-6 6"} stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}
