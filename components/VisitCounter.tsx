"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const SERVER_URL = "https://herenow-anhz7w.fly.dev";
const SESSION_KEY = "hereNowSessionId";

function sessionId() {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function VisitCounter() {
  const pathname = usePathname();
  const [value, setValue] = useState("...");

  useEffect(() => {
    let cancelled = false;
    const page = window.location.hostname + pathname;
    const id = sessionId();
    const referrer = document.referrer || "direct";

    const ping = () =>
      fetch(`${SERVER_URL}/ping`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: id, page, referrer }),
      }).catch(() => undefined);

    const read = () =>
      fetch(`${SERVER_URL}/count?page=${encodeURIComponent(page)}`)
        .then((response) => response.json())
        .then((data) => {
          if (!cancelled) setValue(Number(data.count || 0).toLocaleString("pt-BR"));
        })
        .catch(() => {
          if (!cancelled) setValue((current) => (current === "..." ? "—" : current));
        });

    void ping().then(read);
    const timer = window.setInterval(() => void ping().then(read), 5000);
    const leave = () => {
      const payload = JSON.stringify({ sessionId: id, page, referrer });
      navigator.sendBeacon(`${SERVER_URL}/ping`, new Blob([payload], { type: "application/json" }));
    };
    window.addEventListener("pagehide", leave);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("pagehide", leave);
    };
  }, [pathname]);

  return (
    <span className="fixed right-3 top-3 z-50 inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white/90 px-2.5 py-1 text-xs font-medium text-neutral-600 shadow-sm backdrop-blur-md dark:border-neutral-700 dark:bg-neutral-900/90 dark:text-neutral-200" title="Pessoas nesta página agora">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M2.5 12S6.5 5.5 12 5.5 21.5 12 21.5 12 17.5 18.5 12 18.5 2.5 12 2.5 12Z" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="12" cy="12" r="2.6" stroke="currentColor" strokeWidth="1.8" />
      </svg>
      <span>{value}</span>
    </span>
  );
}
