"use client";

import { useEffect, useState } from "react";

const HIT_URL = "https://countapi.mileshilliard.com/api/v1/hit/meuvoto.digital";

export function VisitCounter() {
  const [value, setValue] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const storageKey = "meuvoto-visitas";
    const cached = sessionStorage.getItem(storageKey);

    const show = (next: string) => {
      if (!cancelled) setValue(next);
    };

    if (cached) {
      show(cached);
      return;
    }

    fetch(HIT_URL)
      .then((response) => response.json())
      .then((data) => {
        const next = String(data.value ?? "");
        if (!next) return;
        sessionStorage.setItem(storageKey, next);
        show(next);
      })
      .catch(() => show("—"));

    return () => {
      cancelled = true;
    };
  }, []);

  const label = value === null ? "..." : Number.isFinite(Number(value)) ? Number(value).toLocaleString("pt-BR") : value;

  return (
    <span className="fixed right-3 top-3 z-50 inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white/90 px-2.5 py-1 text-xs font-medium text-neutral-600 shadow-sm backdrop-blur-md dark:border-neutral-700 dark:bg-neutral-900/90 dark:text-neutral-200" title="Visitas nesta página">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M2.5 12S6.5 5.5 12 5.5 21.5 12 21.5 12 17.5 18.5 12 18.5 2.5 12 2.5 12Z" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="12" cy="12" r="2.6" stroke="currentColor" strokeWidth="1.8" />
      </svg>
      <span>{label}</span>
    </span>
  );
}
