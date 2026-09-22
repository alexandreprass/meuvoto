"use client";

import { UF_MAP } from "@/lib/states";

type Props = {
  uf: string;
  onClose?: () => void;
  mini?: boolean;
};

export function StatePanel({ uf, onClose, mini }: Props) {
  const state = UF_MAP[uf];
  if (!state) return null;

  return (
    <div
      className={`border border-neutral-200 bg-white shadow-lg shadow-neutral-900/10 ${
        mini ? "rounded-xl p-2" : "rounded-2xl p-4"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span
            className={mini ? "h-2 w-2 rounded-full" : "h-3 w-3 rounded-full"}
            style={{ backgroundColor: state.color }}
          />
          <div>
            <p className={mini ? "text-[11px] font-semibold text-neutral-950" : "text-sm font-semibold text-neutral-950"}>
              {state.name}
            </p>
            <p className={mini ? "text-[9px] text-neutral-400" : "text-xs text-neutral-400"}>{uf}</p>
          </div>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-2 py-1 text-xs text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
          >
            Fechar
          </button>
        ) : null}
      </div>
    </div>
  );
}
