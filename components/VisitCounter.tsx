"use client";

import { useEffect, useState } from "react";

const SCRIPT_URL = "https://wgx.github.io/herenow/herenow.min.js";

export function VisitCounter() {
  const [value, setValue] = useState("...");

  useEffect(() => {
    const node = document.querySelector("[data-herenow-count]");
    if (!node) return;

    const read = () => {
      const match = node.textContent?.match(/\d+/);
      if (match) setValue(Number(match[0]).toLocaleString("pt-BR"));
    };

    const observer = new MutationObserver(read);
    observer.observe(node, { childList: true, characterData: true, subtree: true });

    if (!document.querySelector(`script[src="${SCRIPT_URL}"]`)) {
      const script = document.createElement("script");
      script.src = SCRIPT_URL;
      script.defer = true;
      document.body.appendChild(script);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <span className="fixed right-3 top-3 z-50 inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white/90 px-2.5 py-1 text-xs font-medium text-neutral-600 shadow-sm backdrop-blur-md dark:border-neutral-700 dark:bg-neutral-900/90 dark:text-neutral-200" title="Pessoas nesta página agora">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M2.5 12S6.5 5.5 12 5.5 21.5 12 21.5 12 17.5 18.5 12 18.5 2.5 12 2.5 12Z" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="12" cy="12" r="2.6" stroke="currentColor" strokeWidth="1.8" />
      </svg>
      <span className="herenow" data-herenow-count>{value}</span>
    </span>
  );
}
