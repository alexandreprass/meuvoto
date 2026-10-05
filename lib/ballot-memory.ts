"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { BallotChoices } from "./offices";

const EMPTY: BallotChoices = {};
let first: BallotChoices = EMPTY;
let second: BallotChoices = EMPTY;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

export function useBallotMemory(round: 1 | 2) {
  const choices = useSyncExternalStore(
    subscribe,
    () => (round === 1 ? first : second),
    () => EMPTY,
  );
  const setChoices = useCallback((update: BallotChoices | ((current: BallotChoices) => BallotChoices)) => {
    const current = round === 1 ? first : second;
    const next = typeof update === "function" ? update(current) : update;
    if (round === 1) first = next;
    else second = next;
    emit();
  }, [round]);
  return [choices, setChoices] as const;
}
