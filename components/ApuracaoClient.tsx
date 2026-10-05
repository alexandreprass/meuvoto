"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { ApuracaoBadge } from "./ApuracaoButton";
import { BrazilMap, type MapStamp } from "./BrazilMap";
import { OFFICES, OFFICES_ORDER, type OfficeId } from "@/lib/offices";
import { STATES, UF_MAP, formatPercent, formatVotes } from "@/lib/states";
import {
  andamentoLabel,
  isProportional,
  leadVisual,
  parseResult,
  resultUrl,
  type Tally,
} from "@/lib/apuracao";

const TSE_PAGE: Record<OfficeId, string> = {
  presidente: "https://resultados.tse.jus.br/oficial/app/index.html#/eleicao/6257/uf/br/cargo/1/vis/nominal/resultados",
  governador: "https://resultados.tse.jus.br/oficial/app/index.html#/eleicao/6259/uf/br/cargo/3/vis/nominal/resultados",
  senador: "https://resultados.tse.jus.br/oficial/app/index.html#/eleicao/6259/uf/br/cargo/5/vis/nominal/resultados",
  deputado_federal: "https://resultados.tse.jus.br/oficial/app/index.html#/eleicao/6259/uf/br/cargo/6/vis/nominal/resultados",
  deputado_estadual: "https://resultados.tse.jus.br/oficial/app/index.html#/eleicao/6259/uf/br/cargo/7/vis/nominal/resultados",
};

const OFFICE_SHORT: Record<OfficeId, string> = {
  presidente: "Presidente",
  governador: "Governador",
  senador: "Senadores",
  deputado_federal: "Dep. Federal",
  deputado_estadual: "Dep. Estadual",
};

function placeName(uf: string, office: OfficeId) {
  if (uf === "BR") return "Brasil";
  const state = UF_MAP[uf];
  if (office === "deputado_estadual" && uf === "DF") return "Distrito Federal";
  return state?.name ?? uf;
}

function officeHeading(office: OfficeId, uf: string) {
  if (office === "deputado_estadual" && uf === "DF") return "Deputado distrital";
  return OFFICES[office].label;
}

function fold(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

function reducedMotionSubscribe(onChange: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function reducedMotionSnapshot() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function reducedMotionServer() {
  return false;
}

type ReelFrame = { place: string; from: string; to: string; gen: number };

/** Digits travel upward only, passing each number in between, like a meter wheel. */
function upwardGlyphs(from: string, to: string) {
  if (from === to) return [to];
  if (from >= "0" && from <= "9" && to >= "0" && to <= "9") {
    const start = Number(from);
    const turns = (Number(to) - start + 10) % 10;
    return Array.from({ length: turns + 1 }, (_, index) => String((start + index) % 10));
  }
  return [from, to];
}

function reelKind(chars: string[]) {
  const visible = chars.filter((char) => char !== "\0");
  if (visible.length === 0 || visible.every((char) => char >= "0" && char <= "9")) return "digit";
  if (visible.every((char) => char === "." || char === ",")) return "sep";
  if (visible.every((char) => char === "%")) return "mark";
  return "other";
}

function RollingText({ value, place }: { value: string; place: string }) {
  const reduce = useSyncExternalStore(reducedMotionSubscribe, reducedMotionSnapshot, reducedMotionServer);
  const [frame, setFrame] = useState<ReelFrame>({ place, from: value, to: value, gen: 0 });
  if (reduce) {
    if (frame.place !== place || frame.from !== value || frame.to !== value) {
      setFrame({ place, from: value, to: value, gen: frame.gen });
    }
  } else if (frame.place !== place) {
    setFrame({ place, from: value, to: value, gen: frame.gen + 1 });
  } else if (frame.to !== value) {
    setFrame({ place, from: frame.to, to: value, gen: frame.gen + 1 });
  }

  const width = Math.max(frame.from.length, frame.to.length);
  const fromChars = frame.from.padStart(width, "\0").split("");
  const toChars = frame.to.padStart(width, "\0").split("");
  const sequences = fromChars.map((char, index) => upwardGlyphs(char, toChars[index]));
  const maxSteps = sequences.reduce((max, seq) => Math.max(max, seq.length - 1), 0);
  const duration = Math.min(0.9, 0.42 + Math.max(0, maxSteps - 1) * 0.07);

  return (
    <span className="inline-flex items-end whitespace-nowrap align-bottom tabular-nums">
      <span className="sr-only">{value}</span>
      <span aria-hidden="true" className="inline-flex">
        {sequences.map((seq, index) => {
          const steps = seq.length - 1;
          return (
            <span key={width - index} className="vote-reel" data-kind={reelKind(seq)}>
              {steps > 0 ? (
                <span
                  key={frame.gen}
                  className="vote-reel-strip"
                  style={{ animationDuration: `${duration}s`, ["--reel-steps" as string]: String(steps) }}
                  onAnimationEnd={(event) => {
                    if (event.target !== event.currentTarget || steps !== maxSteps) return;
                    setFrame((current) => (current.gen !== frame.gen || current.from === current.to ? current : { ...current, from: current.to }));
                  }}
                >
                  {seq.map((char, step) => (
                    <span key={step} className="vote-reel-cell">{char === "\0" ? "" : char}</span>
                  ))}
                </span>
              ) : (
                <span className="vote-reel-cell">{seq[0] === "\0" ? "" : seq[0]}</span>
              )}
            </span>
          );
        })}
      </span>
    </span>
  );
}

export function ApuracaoClient() {
  const [office, setOffice] = useState<OfficeId>("presidente");
  const [selected, setSelected] = useState<string>("BR");
  const [presidentByUf, setPresidentByUf] = useState<Record<string, Tally>>({});
  const [byUf, setByUf] = useState<Record<string, Tally>>({});
  const [error, setError] = useState("");
  const [clock, setClock] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let stopped = false;
    let running = false;
    const proportional = isProportional(office);
    const jobs = [
      ...STATES.map((state) => ({ bucket: "president" as const, uf: state.uf, office: "presidente" as const })),
      { bucket: "president" as const, uf: "BR", office: "presidente" as const },
      ...(office === "presidente"
        ? []
        : STATES.map((state) => ({ bucket: "office" as const, uf: state.uf, office }))),
    ];

    async function tick() {
      if (running) return;
      running = true;
      try {
        const pairs = await Promise.all(
          jobs.map(async (job) => {
            try {
              const response = await fetch(resultUrl(job.office, job.uf), { cache: "no-store" });
              if (!response.ok) return null;
              return [job, parseResult(await response.json(), job.uf, job.bucket === "president" ? false : proportional)] as const;
            } catch {
              return null;
            }
          }),
        );
        if (stopped) return;
        const ready = pairs.filter((pair): pair is readonly [(typeof jobs)[number], Tally] => pair !== null);
        if (ready.length === 0) throw new Error("empty");
        setPresidentByUf((current) => {
          const next = { ...current };
          for (const [job, tally] of ready) if (job.bucket === "president") next[job.uf] = tally;
          return next;
        });
        if (office !== "presidente") {
          setByUf((current) => {
            const next = { ...current };
            for (const [job, tally] of ready) if (job.bucket === "office") next[job.uf] = tally;
            return next;
          });
        }
        setError(ready.length === jobs.length ? "" : "Parte dos estados não atualizou nesta leitura.");
        setClock(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      } catch {
        if (!stopped) setError("Não foi possível atualizar os dados do TSE agora.");
      } finally {
        running = false;
      }
    }

    void tick();
    const timer = setInterval(() => void tick(), 5000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [office]);

  const panelByUf = office === "presidente" ? presidentByUf : byUf;

  const shown = useMemo(() => {
    const uf = office !== "presidente" && selected === "BR" ? "SP" : selected;
    return panelByUf[uf] ?? null;
  }, [office, panelByUf, selected]);

  const { fills, stamps } = useMemo(() => {
    const nextFills: Record<string, string> = {};
    const nextStamps: Record<string, MapStamp> = {};
    for (const state of STATES) {
      const row = presidentByUf[state.uf];
      const visual = leadVisual(row?.pt ?? 0, row?.pl ?? 0, row?.valid ?? 0);
      nextFills[state.uf] = visual.fill;
      nextStamps[state.uf] = { ink: visual.ink };
    }
    return { fills: nextFills, stamps: nextStamps };
  }, [presidentByUf]);

  const activeUf = selected !== "BR" ? selected : null;
  const rows = shown && shown.candidates.length > 0 ? shown.candidates : shown?.parties ?? [];
  const filteredRows = useMemo(() => {
    const needle = fold(query.trim());
    if (!needle) return rows;
    return rows.filter((row) => fold(`${row.nome} ${row.numero} ${row.sigla}`).includes(needle));
  }, [query, rows]);
  const ptPct = shown && shown.valid > 0 ? (shown.pt / shown.valid) * 100 : 0;
  const plPct = shown && shown.valid > 0 ? (shown.pl / shown.valid) * 100 : 0;
  const votePlace = shown?.uf ?? "";

  return (
    <div className="flex min-h-full flex-col bg-white">
      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-950 text-white">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="m5 13.5 5 5L20 7" stroke="#22c55e" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="text-lg font-semibold tracking-tight text-neutral-950">meu<span className="text-emerald-600">voto</span><span className="text-neutral-400">.digital</span></span>
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <ApuracaoBadge />
            <Link href="/" className="rounded-full bg-neutral-950 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800">VOLTAR À CÉDULA</Link>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-screen-2xl flex-1 flex-col gap-8 px-4 py-6 sm:px-6 lg:flex-row lg:items-start lg:gap-10 lg:py-8">
        <section className="relative min-w-0 flex-1">
          <div className="mb-3">
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl">Apuração para {OFFICES[office].label.toLowerCase()}</h1>
            <p className="mt-1 text-sm text-neutral-500">O mapa compara Lula e Flávio Bolsonaro. Cor forte quando a vantagem passa de 10 pontos. Cor fraca até 10 pontos.</p>
          </div>
          <div className="mb-3 flex gap-1 overflow-x-auto">
            {OFFICES_ORDER.map((id) => (
              <button key={id} type="button" onClick={() => { if (id === office) return; setOffice(id); setByUf({}); setError(""); setQuery(""); if (id !== "presidente") setSelected((current) => (current === "BR" ? "SP" : current)); }} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium ${office === id ? "bg-neutral-950 text-white" : "bg-neutral-100 text-neutral-500"}`}>{OFFICE_SHORT[id]}</button>
            ))}
          </div>
          <div className="relative mx-auto w-full lg:w-1/2">
            {Object.keys(presidentByUf).length > 0 ? (
              <BrazilMap
                activeUf={activeUf}
                fills={fills}
                stamps={stamps}
                onHover={() => undefined}
                onSelect={(uf) => setSelected((current) => (current === uf && office === "presidente" ? "BR" : uf))}
              />
            ) : (
              <div className="flex aspect-square w-full items-center justify-center rounded-3xl bg-neutral-50">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-neutral-200 border-t-neutral-900" />
              </div>
            )}
          </div>
          <p className="mt-3 text-center text-sm text-neutral-400 lg:hidden">Toque em um estado para ver os votos</p>
        </section>

        <aside className="w-full shrink-0 lg:w-[520px]">
          <div className="rounded-3xl border border-neutral-200 bg-white p-3 sm:p-4 lg:sticky lg:top-24">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">{placeName(selected, office)}</p>
                <h2 className="text-base font-semibold text-neutral-950">{officeHeading(office, selected)}</h2>
                <p className="text-xs text-neutral-500">{shown ? andamentoLabel(shown.andamento) : "Carregando dados do TSE"}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs text-neutral-400">{clock ? `Atualizado às ${clock}` : "Atualizando"}</p>
                {shown ? <p className="mt-1 text-xs font-medium text-neutral-500">{formatPercent(shown.sectionsPct)}% das urnas apuradas</p> : null}
              </div>
            </div>
            <label className="mb-2 block">
              <span className="sr-only">Estado</span>
              <select value={selected} onChange={(event) => { setSelected(event.target.value); setQuery(""); }} className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-950 outline-none focus:border-neutral-400">
                {office === "presidente" ? <option value="BR">Brasil</option> : null}
                {STATES.map((state) => <option key={state.uf} value={state.uf}>{state.name} ({state.uf})</option>)}
              </select>
            </label>

            <label className="mb-3 flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0 text-neutral-400">
                <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
                <path d="M16 16.5 20 20.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome" className="w-full bg-transparent text-xs text-neutral-950 outline-none placeholder:text-neutral-400" />
            </label>

            {error ? <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

            {office === "presidente" ? (
              <div className="mb-3 grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-red-600 px-3 py-3 text-white">
                  <p className="text-xs font-semibold">LULA</p>
                  <p className="text-2xl font-semibold tracking-tight"><RollingText value={`${formatPercent(ptPct)}%`} place={votePlace} /></p>
                  <p className="text-xs text-red-100"><RollingText value={formatVotes(shown?.pt ?? 0)} place={votePlace} /> votos</p>
                </div>
                <div className="rounded-2xl bg-green-700 px-3 py-3 text-white">
                  <p className="text-xs font-semibold">FLAVIO BOLSONARO</p>
                  <p className="text-2xl font-semibold tracking-tight"><RollingText value={`${formatPercent(plPct)}%`} place={votePlace} /></p>
                  <p className="text-xs text-green-100"><RollingText value={formatVotes(shown?.pl ?? 0)} place={votePlace} /> votos</p>
                </div>
              </div>
            ) : null}

            {shown?.generated || (selected === "BR" && office === "presidente") ? (
              <p className="mb-3 text-xs text-neutral-500">
                {shown?.generated ? `TSE ${shown.generated}` : ""}
                {selected === "BR" && office === "presidente" ? `${shown?.generated ? " · " : ""}inclui o voto no exterior` : ""}
              </p>
            ) : null}

            <div className="max-h-[70vh] space-y-2 overflow-y-auto pr-1">
              {filteredRows.map((row) => {
                const tone = row.sigla === "PT" ? "bg-red-600" : row.sigla === "PL" ? "bg-green-700" : "bg-neutral-800";
                return (
                  <div key={`${row.sigla}-${row.numero}-${row.nome}`} className="rounded-2xl border border-neutral-200 px-3 py-2">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="min-w-0 truncate text-sm font-semibold text-neutral-950">
                        <span className="mr-2 text-neutral-400">{row.numero}</span>{row.nome}
                        <span className="ml-2 text-xs font-medium text-neutral-500">{row.sigla}</span>
                      </p>
                      <p className="shrink-0 text-sm font-semibold text-neutral-950">{formatPercent(row.pct)}%</p>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-neutral-100">
                      <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.max(0, Math.min(100, row.pct))}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-neutral-500">{formatVotes(row.votos)} votos</p>
                  </div>
                );
              })}
              {query.trim() && filteredRows.length === 0 ? <p className="px-1 py-3 text-center text-xs text-neutral-400">Nenhum candidato com esse nome.</p> : null}
            </div>

            {shown ? (
              <p className="mt-3 text-xs text-neutral-400">
                Válidos {formatVotes(shown.valid)} · Brancos {formatVotes(shown.blank)} · Nulos {formatVotes(shown.nulls)}
              </p>
            ) : null}
            <p className="mt-2 text-xs text-neutral-400">
              Dados oficiais parciais do TSE, atualizados a cada 5 segundos.{" "}
              <a href={TSE_PAGE[office]} target="_blank" rel="noopener noreferrer" className="underline">Fonte</a>
            </p>
          </div>
        </aside>
      </main>
    </div>
  );
}
