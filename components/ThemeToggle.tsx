"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";

const KEY = "meuvoto-theme";
const EVENT = "meuvoto-theme";

function applyTheme(dark: boolean) {
  document.documentElement.classList.toggle("dark", dark);
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener(EVENT, onStoreChange);
  return () => window.removeEventListener(EVENT, onStoreChange);
}

function snapshot() {
  return document.documentElement.classList.contains("dark");
}

export function useNightMode() {
  return useSyncExternalStore(subscribe, snapshot, () => true);
}

export function ThemeToggle() {
  const dark = useNightMode();

  useLayoutEffect(() => {
    const wantDark = localStorage.getItem(KEY) !== "light";
    if (wantDark !== snapshot()) applyTheme(wantDark);
  }, []);

  function toggle() {
    const next = !snapshot();
    applyTheme(next);
    localStorage.setItem(KEY, next ? "dark" : "light");
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Usar modo claro" : "Usar modo escuro"}
      className="theme-toggle fixed right-4 bottom-4 z-40 flex h-10 w-10 items-center justify-center rounded-full shadow-lg"
    >
      {dark ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M21 14.5A8.5 8.5 0 1 1 9.5 3 7 7 0 0 0 21 14.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
          <path d="M12 3v2M12 19v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M3 12h2M19 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )}
    </button>
  );
}
