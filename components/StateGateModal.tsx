"use client";

import { useState } from "react";
import { REGIONS, STATES } from "@/lib/states";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: (state: string) => void;
};

export function StateGateModal({ open, onClose, onSaved }: Props) {
  const [state, setState] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  async function save() {
    if (!state) {
      setError("Selecione seu estado.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/me/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Não foi possível salvar.");
      onSaved(state);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      <button type="button" className="absolute inset-0 bg-neutral-950/45" aria-label="Fechar" onClick={onClose} />
      <div className="relative w-full rounded-t-3xl bg-white p-6 shadow-2xl sm:max-w-md sm:rounded-3xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Sua cédula</p>
            <h2 className="mt-1 text-xl font-semibold text-neutral-950">Escolha seu estado</h2>
            <p className="mt-2 text-sm leading-relaxed text-neutral-500">
              O estado define senador e deputados da sua cédula. Ele fica salvo na sua conta.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="rounded-full p-2 text-neutral-400 hover:bg-neutral-100">×</button>
        </div>
        <label className="mt-6 block">
          <span className="mb-1.5 block text-sm font-medium text-neutral-700">Seu estado</span>
          <select value={state} onChange={(event) => setState(event.target.value)} className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-3 text-sm outline-none focus:border-neutral-600">
            <option value="">Selecione</option>
            {REGIONS.map((region) => (
              <optgroup key={region} label={region}>
                {STATES.filter((item) => item.region === region).map((item) => (
                  <option key={item.uf} value={item.uf}>{item.name} ({item.uf})</option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        <button type="button" disabled={saving} onClick={save} className="mt-5 w-full rounded-full bg-neutral-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">
          {saving ? "Salvando..." : "Continuar"}
        </button>
      </div>
    </div>
  );
}
