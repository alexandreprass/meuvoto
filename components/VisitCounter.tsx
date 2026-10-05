"use client";

import { useEffect, useState } from "react";

const HIT_URL = "https://countapi.mileshilliard.com/api/v1/hit/meuvoto.digital";
const GET_URL = "https://countapi.mileshilliard.com/api/v1/get/meuvoto.digital";
const COUNTED_KEY = "meuvoto-visitas-counted";

function alreadyCounted() {
  try {
    if (localStorage.getItem(COUNTED_KEY) === "1") return true;
  } catch {
    /* storage blocked */
  }
  return document.cookie.split(";").some((part) => part.trim() === `${COUNTED_KEY}=1`);
}

function rememberVisit() {
  try {
    localStorage.setItem(COUNTED_KEY, "1");
  } catch {
    /* private mode can block storage */
  }
  document.cookie = `${COUNTED_KEY}=1; max-age=31536000; path=/; samesite=lax`;
}

export function VisitCounter() {
  const [value, setValue] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const show = (next: unknown) => {
      const text = String(next ?? "");
      if (!cancelled && text) setValue(text);
    };

    const read = () =>
      fetch(GET_URL)
        .then((response) => response.json())
        .then((data) => show(data.value))
        .catch(() => {
          if (!cancelled) setValue((current) => current ?? "—");
        });

    if (alreadyCounted()) {
      void read();
    } else {
      rememberVisit();
      void fetch(HIT_URL)
        .then((response) => response.json())
        .then((data) => show(data.value))
        .catch(() => read());
    }

    const timer = window.setInterval(() => void read(), 5000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const label = value === null ? "..." : Number.isFinite(Number(value)) ? Number(value).toLocaleString("pt-BR") : value;

  return (
    <span className="fixed right-3 top-3 z-50 inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white/90 px-2.5 py-1 text-xs font-medium text-neutral-600 shadow-sm backdrop-blur-md dark:border-neutral-700 dark:bg-neutral-900/90 dark:text-neutral-200" title="Visitantes neste navegador">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M2.5 12S6.5 5.5 12 5.5 21.5 12 21.5 12 17.5 18.5 12 18.5 2.5 12 2.5 12Z" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="12" cy="12" r="2.6" stroke="currentColor" strokeWidth="1.8" />
      </svg>
      <span>{label}</span>
    </span>
  );
}
