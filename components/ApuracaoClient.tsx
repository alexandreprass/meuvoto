"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { ApuracaoBadge } from "./ApuracaoButton";
import { MunicipalMap, type MapMode } from "./MunicipalMap";
import { PartyBadge } from "./PartyBadge";
import { OFFICES, OFFICES_ORDER, type OfficeId } from "@/lib/offices";
import { assetUrl } from "@/lib/asset-url";
import { STATES, UF_MAP, formatPercent, formatVotes } from "@/lib/states";
import { RUNOFF_UFS, SEGUNDO_TURNO } from "@/lib/segundo-turno";
import { briefFromTally, parseMunConfig, type MunBrief, type Municipio } from "@/lib/municipios";
import { unpack, type Pack } from "@/lib/apuracao-pack";
import {
  andamentoLabel,
  isProportional,
  tallyComplete,
  stateWinnerFill,
  winnerFill,
  type CandidateTally,
  type PartyTally,
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

const PLACEHOLDER = "/candidates/senators/placeholder.svg";

const CURATED_PHOTOS: Record<string, string> = {
  "280002551544": "/candidates/flavio-bolsonaro.jpg",
  "280002542548": "/candidates/lula.jpg",
  "280002540694": "/candidates/renan-santos.jpg",
  "280002551547": "/candidates/augusto-cury.jpg",
  "280002551932": "/candidates/ronaldo-caiado.jpg",
  "280002539826": "/candidates/zema.jpg",
};

type ResultRow = CandidateTally | PartyTally;

function rowSq(row: ResultRow) {
  return "sq" in row ? row.sq : "";
}

function rowSituacao(row: ResultRow) {
  return "situacao" in row ? row.situacao : "";
}

/** TSE fills cand.st on state races. Presidente often stays blank, so the state total can show the runoff. A city total never invents Eleito. */
function displayedSituacao(row: ResultRow, rows: ResultRow[], sectionsPct: number, proportional: boolean, infer: boolean) {
  const own = rowSituacao(row);
  if (own || proportional || sectionsPct < 99.9 || !infer) return own;
  const people = rows.filter((item): item is CandidateTally => "sq" in item && item.sq !== "");
  if (people.length < 2 || people.some((item) => item.situacao)) return "";
  const [first, second] = people;
  if (first.pct > 50) return row === first ? "Eleito" : "Não eleito";
  if (row === first || row === second) return "2º turno";
  return "Não eleito";
}

function tsePhoto(office: OfficeId, uf: string, sq: string) {
  const ele = office === "presidente" ? "6257" : "6259";
  const code = office === "presidente" ? "br" : uf.toLowerCase();
  return `https://resultados.tse.jus.br/oficial/ele2026/${ele}/fotos/${code}/${sq}.jpeg`;
}

function photoSources(sq: string, office: OfficeId, uf: string) {
  if (!sq) return [PLACEHOLDER];
  const remote = tsePhoto(office, uf, sq);
  const curated = CURATED_PHOTOS[sq];
  if (curated) return [curated, remote, PLACEHOLDER];
  return [`/candidate-photos/${sq}.jpg`, `/candidate-photos/${sq}.png`, remote, PLACEHOLDER];
}

function situacaoTone(situacao: string) {
  if (situacao.startsWith("Eleito")) return "bg-emerald-700 text-white";
  if (situacao.includes("turno")) return "bg-amber-600 text-white";
  if (situacao === "Suplente") return "bg-sky-800 text-white";
  return "bg-neutral-500 text-white";
}

function Portrait({ sources, className }: { sources: string[]; className?: string }) {
  const list = sources.length > 0 ? sources : [PLACEHOLDER];
  const [step, setStep] = useState(0);
  const chosen = list[Math.min(step, list.length - 1)];
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={chosen.startsWith("https://") ? chosen : assetUrl(chosen)}
      alt=""
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setStep((current) => (current >= list.length - 1 ? current : current + 1))}
      className={className ?? "h-12 w-12 shrink-0 rounded-full object-cover object-top ring-2 ring-white shadow-sm"}
    />
  );
}

function SituacaoBadge({ situacao }: { situacao: string }) {
  if (!situacao) return null;
  return (
    <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${situacaoTone(situacao)}`}>
      {situacao}
    </span>
  );
}

function TurnoDrawer({ round, onChange }: { round: 1 | 2; onChange: (round: 1 | 2) => void }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function choose(next: 1 | 2) {
    onChange(next);
    setOpen(false);
  }

  return (
    <>
      {open ? (
        <button type="button" aria-label="Fechar menu de turnos" className="fixed inset-0 z-30 bg-black/20" onClick={() => setOpen(false)} />
      ) : null}
      <div className={`fixed left-0 top-1/2 z-40 -translate-y-1/2 overflow-hidden rounded-r-2xl border border-l-0 border-neutral-200 bg-white shadow-xl transition-[width] duration-300 ease-out ${open ? "w-64" : "w-10"}`}>
        <div className={`flex w-64 items-stretch transition-transform duration-300 ease-out ${open ? "translate-x-0" : "-translate-x-[calc(100%-2.5rem)]"}`}>
        <div inert={!open} className="flex min-w-0 flex-1 flex-col justify-center gap-2 py-3 pl-3 pr-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Turno</p>
          {([1, 2] as const).map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={round === item}
              onClick={() => choose(item)}
              className={`rounded-full px-3 py-2 text-left text-sm font-semibold ${round === item ? "bg-neutral-950 text-white" : "bg-neutral-100 text-neutral-600"}`}
            >
              {item}º Turno
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-expanded={open}
          aria-label={open ? "Fechar menu de turnos" : "Abrir menu de turnos"}
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

function SecondRoundPanel({ focus, onFocus }: { focus: string; onFocus: (uf: string) => void }) {
  const contests = focus === "ALL" ? SEGUNDO_TURNO : SEGUNDO_TURNO.filter((contest) => contest.uf === focus);
  const shown = contests.length > 0 ? contests : SEGUNDO_TURNO;

  return (
    <div className="rounded-3xl border border-neutral-200 bg-white p-3 sm:p-4 lg:sticky lg:top-24">
      <div className="mb-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">25 de outubro de 2026</p>
        <h2 className="text-base font-semibold text-neutral-950">2º turno</h2>
        <p className="text-xs text-neutral-500">Presidente e os estados que voltam às urnas. O TSE ainda não liberou a apuração do segundo turno.</p>
      </div>
      <label className="mb-3 block">
        <span className="sr-only">Disputa do segundo turno</span>
        <select value={focus} onChange={(event) => onFocus(event.target.value)} className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-950 outline-none focus:border-neutral-400">
          <option value="ALL">Todos os segundos turnos</option>
          {SEGUNDO_TURNO.map((contest) => (
            <option key={contest.uf} value={contest.uf}>{contest.place} — {contest.office}</option>
          ))}
        </select>
      </label>
      <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
        {shown.map((contest) => (
          <section key={contest.uf}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">{contest.place}</p>
            <h3 className="mb-2 text-sm font-semibold text-neutral-950">{contest.office}</h3>
            <ul className="flex flex-col gap-1.5">
              {contest.candidates.map((candidate) => (
                <li key={`${contest.uf}-${candidate.number}`} className="flex items-center gap-2.5 rounded-xl border border-black p-2">
                  <Portrait sources={[candidate.photo, PLACEHOLDER]} />
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-neutral-950">{candidate.name}</span>
                    <span className="mt-0.5 block truncate text-[10px] uppercase tracking-wide text-neutral-500">{candidate.party}</span>
                  </div>
                  <span className="shrink-0 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-lg font-extrabold tabular-nums tracking-wide text-emerald-900 ring-1 ring-emerald-200">{candidate.number}</span>
                  <PartyBadge party={candidate.party} size={30} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

export function ApuracaoClient() {
  const [round, setRound] = useState<1 | 2>(1);
  const [roundFocus, setRoundFocus] = useState("ALL");
  const [office, setOffice] = useState<OfficeId>("presidente");
  const [mapMode, setMapMode] = useState<MapMode>("municipal");
  const [mapUf, setMapUf] = useState<string | null>(null);
  const [ufOpen, setUfOpen] = useState(false);
  const [selected, setSelected] = useState<string>("BR");
  const [presidentByUf, setPresidentByUf] = useState<Record<string, Tally>>({});
  const [byUf, setByUf] = useState<Record<string, Tally>>({});
  const [error, setError] = useState("");
  const [clock, setClock] = useState("");
  const [query, setQuery] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [catalog, setCatalog] = useState<Municipio[]>([]);
  const [briefs, setBriefs] = useState<Record<string, MunBrief>>({});
  const [munProgress, setMunProgress] = useState({ done: 0, total: 0 });
  const [munTally, setMunTally] = useState<Tally | null>(null);
  const [presidentPack, setPresidentPack] = useState<Pack | null>(null);
  const [officePacks, setOfficePacks] = useState<Record<string, Pack>>({});

  useEffect(() => {
    let stopped = false;
    async function load() {
      const [configResponse, presidentResponse] = await Promise.all([
        fetch(assetUrl("/mun-config.json")),
        fetch(assetUrl("/apuracao/presidente.json")),
      ]);
      if (!configResponse.ok || !presidentResponse.ok) throw new Error("local");
      const list = parseMunConfig(await configResponse.json());
      const pack = (await presidentResponse.json()) as Pack;
      if (stopped) return;
      const next: Record<string, Tally> = {};
      const brazil = unpack(pack.br, pack, "BR");
      if (brazil) next.BR = brazil;
      for (const [uf, row] of Object.entries(pack.uf ?? {})) {
        const tally = unpack(row, pack, uf);
        if (tally) next[uf] = tally;
      }
      const briefsNext: Record<string, MunBrief> = {};
      for (const mun of list) {
        const tally = unpack(pack.m?.[mun.ibge], pack, mun.uf);
        if (tally) briefsNext[mun.ibge] = briefFromTally(tally);
      }
      setCatalog(list);
      setPresidentPack(pack);
      setPresidentByUf(next);
      setBriefs(briefsNext);
      setMunProgress({ done: Object.keys(briefsNext).length, total: list.length });
      setClock(pack.g || "");
      setError("");
    }
    void load().catch(() => {
      if (!stopped) setError("Não foi possível abrir os resultados salvos.");
    });
    return () => {
      stopped = true;
    };
  }, []);

  useEffect(() => {
    if (round === 2 || office === "presidente") return;
    let stopped = false;
    async function load() {
      const entries = await Promise.all(STATES.map(async (state) => {
        const response = await fetch(assetUrl(`/apuracao/${office}/${state.uf}.json`));
        if (!response.ok) return null;
        return [state.uf, (await response.json()) as Pack] as const;
      }));
      if (stopped) return;
      const tallies: Record<string, Tally> = {};
      const packs: Record<string, Pack> = {};
      let missing = false;
      for (const entry of entries) {
        if (!entry) {
          missing = true;
          continue;
        }
        const [uf, pack] = entry;
        const tally = unpack(pack.u, pack, uf);
        if (tally) tallies[uf] = tally;
        packs[uf] = pack;
      }
      setByUf(tallies);
      setOfficePacks(packs);
      if (missing) setError("Parte dos estados não está no arquivo salvo.");
    }
    void load().catch(() => {
      if (!stopped) setError("Não foi possível abrir os resultados salvos.");
    });
    return () => {
      stopped = true;
    };
  }, [office, round]);

  useEffect(() => {
    if (round === 2 || !municipio || selected === "BR") return;
    const mun = catalog.find((item) => item.uf === selected && item.cd === municipio);
    const pack = office === "presidente" ? presidentPack : officePacks[selected];
    if (!mun || !pack) return;
    setMunTally(unpack(pack.m?.[mun.ibge], pack, mun.uf));
  }, [catalog, municipio, office, officePacks, presidentPack, round, selected]);

  const panelByUf = office === "presidente" ? presidentByUf : byUf;

  const settled = useMemo(() => {
    const presidentReady = STATES.every((state) => {
      const tally = presidentByUf[state.uf];
      return Boolean(tally && tallyComplete(tally));
    }) && Boolean(presidentByUf.BR && tallyComplete(presidentByUf.BR));
    if (!presidentReady) return false;
    if (round === 2 || office === "presidente") return true;
    return STATES.every((state) => {
      const tally = byUf[state.uf];
      return Boolean(tally && tallyComplete(tally, office));
    });
  }, [byUf, office, presidentByUf, round]);
  const panelSettled = municipio ? Boolean(munTally && tallyComplete(munTally, office)) : settled;

  const shown = useMemo(() => {
    if (municipio) return munTally;
    const uf = office !== "presidente" && selected === "BR" ? "SP" : selected;
    return panelByUf[uf] ?? null;
  }, [municipio, munTally, office, panelByUf, selected]);

  const fills = useMemo(() => {
    const next: Record<string, string> = {};
    for (const [ibge, brief] of Object.entries(briefs)) next[ibge] = winnerFill(brief.pt, brief.pl, brief.valid);
    return next;
  }, [briefs]);

  const stateFills = useMemo(() => {
    const next: Record<string, string> = {};
    for (const state of STATES) {
      const tally = presidentByUf[state.uf];
      if (!tally) continue;
      const color = stateWinnerFill(tally.pt, tally.pl, tally.valid);
      if (color) next[state.uf] = color;
    }
    return next;
  }, [presidentByUf]);

  const byIbge = useMemo(() => {
    const next = new Map<string, Municipio>();
    for (const mun of catalog) next.set(mun.ibge, mun);
    return next;
  }, [catalog]);

  const munOptions = useMemo(() => {
    if (selected === "BR") return [];
    return catalog.filter((mun) => mun.uf === selected).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [catalog, selected]);

  const activeIbge = municipio ? munOptions.find((mun) => mun.cd === municipio)?.ibge ?? null : null;
  const selectedMun = activeIbge ? byIbge.get(activeIbge) : undefined;

  const onMapSelect = useCallback((ibge: string) => {
    const mun = byIbge.get(ibge);
    if (!mun) return;
    if (round === 2) {
      setRoundFocus((current) => (RUNOFF_UFS.has(mun.uf) ? (current === mun.uf ? "ALL" : mun.uf) : "ALL"));
      return;
    }
    setSelected(mun.uf);
    setMunicipio(mun.cd);
    setMunTally(null);
    setQuery("");
  }, [byIbge, round]);

  const onStateSelect = useCallback((uf: string) => {
    if (round === 2) {
      setRoundFocus((current) => (RUNOFF_UFS.has(uf) ? (current === uf ? "ALL" : uf) : "ALL"));
      return;
    }
    setSelected(uf);
    setMunicipio("");
    setMunTally(null);
    setQuery("");
  }, [round]);

  const mapTip = useCallback((ibge: string) => {
    const mun = byIbge.get(ibge);
    if (!mun) return null;
    const brief = briefs[ibge];
    return (
      <>
        <p className="mb-1.5 truncate text-xs font-semibold">{mun.nome}</p>
        {!brief ? <p className="tip-muted text-[11px]">Carregando votos</p> : null}
        {brief && brief.top.length === 0 ? <p className="tip-muted text-[11px]">Sem votos publicados</p> : null}
        {brief && brief.top.length > 0 ? (
          <ul className="space-y-1">
            {brief.top.map((candidate) => (
              <li key={`${candidate.sq}-${candidate.numero}`} className="flex items-center gap-2">
                <Portrait className="h-8 w-8 shrink-0 rounded-full object-cover object-top" sources={photoSources(candidate.sq, "presidente", mun.uf)} />
                <span className="tip-muted min-w-0 flex-1 truncate text-[11px]">{candidate.nome}</span>
                <span className="shrink-0 text-xs font-semibold">{formatPercent(candidate.pct)}%</span>
              </li>
            ))}
          </ul>
        ) : null}
      </>
    );
  }, [briefs, byIbge]);

  const stateTip = useCallback((uf: string) => {
    const tally = presidentByUf[uf];
    const name = UF_MAP[uf]?.name ?? uf;
    if (!tally || tally.valid <= 0) return <p className="text-xs font-semibold">{name}</p>;
    return (
      <>
        <p className="mb-1 truncate text-xs font-semibold">{name}</p>
        <p className="text-[11px]">Lula {formatPercent((tally.pt / tally.valid) * 100)}%</p>
        <p className="text-[11px]">Flávio {formatPercent((tally.pl / tally.valid) * 100)}%</p>
      </>
    );
  }, [presidentByUf]);

  function chooseMapUf(uf: string | null) {
    setUfOpen(false);
    setMapUf(uf);
    setMapMode("municipal");
    setMunicipio("");
    setMunTally(null);
    setQuery("");
    if (round === 2) {
      setRoundFocus(!uf || !RUNOFF_UFS.has(uf) ? "ALL" : uf);
      return;
    }
    if (uf) setSelected(uf);
    else if (office === "presidente") setSelected("BR");
  }

  const rows = useMemo(
    () => (shown && shown.candidates.length > 0 ? shown.candidates : shown?.parties ?? []),
    [shown],
  );
  const filteredRows = useMemo(() => {
    const needle = fold(query.trim());
    if (!needle) return rows;
    return rows.filter((row) => fold(`${row.nome} ${row.numero} ${row.sigla}`).includes(needle));
  }, [query, rows]);
  const ptPct = shown && shown.valid > 0 ? (shown.pt / shown.valid) * 100 : 0;
  const plPct = shown && shown.valid > 0 ? (shown.pl / shown.valid) * 100 : 0;
  const votePlace = shown?.uf ?? "";

  return (
    <div className="flex min-h-full flex-col">
      <TurnoDrawer round={round} onChange={(next) => { setRound(next); setMunTally(null); }} />
      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-6">
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

      <main className="mx-auto flex w-full max-w-screen-2xl flex-1 flex-col gap-6 px-4 pt-2 pb-4 sm:px-6 lg:flex-row lg:items-start lg:gap-8 lg:pt-3">
        <section className="relative min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-3">
            <h1 className="shrink-0 whitespace-nowrap text-lg font-semibold tracking-tight text-neutral-950">{round === 2 ? "Apuração do 2º turno" : `Apuração para ${OFFICES[office].label.toLowerCase()}`}</h1>
            {round === 1 ? <div className="flex min-w-0 flex-1 justify-end gap-1 overflow-x-auto">
              {OFFICES_ORDER.map((id) => (
                <button key={id} type="button" onClick={() => { if (id === office) return; setOffice(id); setByUf({}); setError(""); setQuery(""); setMunicipio(""); setMunTally(null); if (id !== "presidente") setSelected((current) => (current === "BR" ? "SP" : current)); }} className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium ${office === id ? "bg-neutral-950 text-white" : "bg-neutral-100 text-neutral-500"}`}>{OFFICE_SHORT[id]}</button>
              ))}
            </div> : null}
          </div>
          <div className="relative mx-auto w-full max-w-3xl">
            <div className="mb-1 flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="font-semibold uppercase tracking-wider text-neutral-400">Mapa:</span>
              <button type="button" onClick={() => setMapMode("municipal")} className={`rounded-full px-2 py-0.5 font-semibold ${mapMode === "municipal" ? "bg-neutral-950 text-white" : "bg-neutral-100 text-neutral-500"}`}>Municipal</button>
              <span className="text-neutral-400">ou</span>
              <button type="button" onClick={() => { setMapMode("estadual"); setMapUf(null); setUfOpen(false); setMunicipio(""); setMunTally(null); }} className={`rounded-full px-2 py-0.5 font-semibold ${mapMode === "estadual" ? "bg-neutral-950 text-white" : "bg-neutral-100 text-neutral-500"}`}>Estadual</button>
              <div className="relative">
                <button type="button" aria-expanded={ufOpen} onClick={() => setUfOpen((open) => !open)} className="rounded-full bg-neutral-100 px-2 py-0.5 font-semibold text-neutral-700">{mapUf ?? "Brasil"}</button>
                {ufOpen ? (
                  <>
                    <button type="button" aria-label="Fechar estados" className="fixed inset-0 z-20 cursor-default" onClick={() => setUfOpen(false)} />
                    <div className="absolute left-0 z-30 mt-1 w-52 rounded-2xl border border-neutral-200 bg-white p-2 shadow-lg">
                      <button type="button" onClick={() => chooseMapUf(null)} className={`mb-1 w-full rounded-full px-2 py-1 text-left font-semibold ${mapUf === null ? "bg-neutral-950 text-white" : "bg-neutral-100 text-neutral-600"}`}>Brasil</button>
                      <div className="grid grid-cols-6 gap-1">
                        {STATES.map((state) => (
                          <button key={state.uf} type="button" onClick={() => chooseMapUf(state.uf)} className={`rounded-md px-1 py-1 font-semibold ${mapUf === state.uf ? "bg-neutral-950 text-white" : "bg-neutral-100 text-neutral-600"}`}>{state.uf}</button>
                        ))}
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
            <MunicipalMap mode={mapMode} fills={fills} stateFills={stateFills}  activeIbge={round === 1 ? activeIbge : null} activeUf={round === 2 ? (roundFocus === "ALL" ? null : roundFocus) : (selected === "BR" ? null : selected)} focusUf={mapMode === "municipal" ? mapUf : null} focusPrefix={mapMode === "municipal" && mapUf ? STATES.find((state) => state.uf === mapUf)?.ibge ?? null : null} onSelect={onMapSelect} onSelectState={onStateSelect} tip={mapTip} stateTip={stateTip} />
            {munProgress.total > 0 && munProgress.done < munProgress.total ? (
              <p className="mt-2 text-center text-xs text-neutral-400">Municípios {munProgress.done.toLocaleString("pt-BR")} de {munProgress.total.toLocaleString("pt-BR")}</p>
            ) : null}
          </div>
          <p className="mt-3 text-center text-sm text-neutral-400 lg:hidden">{round === 2 ? "Toque em um estado com segundo turno" : mapMode === "estadual" ? "Toque em um estado para ver os votos" : "Toque em um município para ver os votos"}</p>
        </section>

        <aside className="w-full shrink-0 lg:w-[520px]">
          {round === 2 ? <SecondRoundPanel focus={roundFocus} onFocus={setRoundFocus} /> : (
          <div className="rounded-3xl border border-neutral-200 bg-white p-3 sm:p-4 lg:sticky lg:top-24">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">{selectedMun ? `${selectedMun.nome} (${selectedMun.uf})` : placeName(selected, office)}</p>
                <h2 className="text-base font-semibold text-neutral-950">{officeHeading(office, selected)}</h2>
                <p className="text-xs text-neutral-500">{shown ? (tallyComplete(shown, office) ? "Apuração encerrada" : andamentoLabel(shown.andamento)) : municipio ? "Carregando município" : "Carregando resultados"}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs text-neutral-400">{clock ? `Atualizado às ${clock}` : "Atualizando"}</p>
                {shown ? <p className="mt-1 text-xs font-medium text-neutral-500">{formatPercent(shown.sectionsPct)}% das urnas apuradas</p> : null}
              </div>
            </div>
            <div className="mb-2 grid grid-cols-2 gap-2">
              <label>
                <span className="sr-only">Estado</span>
                <select value={selected} onChange={(event) => { setSelected(event.target.value); setMunicipio(""); setMunTally(null); setQuery(""); }} className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-950 outline-none focus:border-neutral-400">
                  {office === "presidente" ? <option value="BR">Brasil</option> : null}
                  {STATES.map((state) => <option key={state.uf} value={state.uf}>{state.name} ({state.uf})</option>)}
                </select>
              </label>
              <label>
                <span className="sr-only">Município</span>
                <select value={municipio} disabled={selected === "BR" || munOptions.length === 0} onChange={(event) => { setMunicipio(event.target.value); setMunTally(null); setQuery(""); }} className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-950 outline-none focus:border-neutral-400 disabled:opacity-60">
                  <option value="">Todos</option>
                  {munOptions.map((mun) => <option key={mun.cd} value={mun.cd}>{mun.nome}</option>)}
                </select>
              </label>
            </div>

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
                const sq = rowSq(row);
                const situacao = displayedSituacao(row, rows, shown?.sectionsPct ?? 0, isProportional(office), !municipio);
                return (
                  <div key={`${row.sigla}-${row.numero}-${row.nome}`} className="rounded-2xl border border-neutral-200 px-3 py-2">
                    <div className="flex items-center gap-2.5">
                      {sq ? <Portrait key={sq} sources={photoSources(sq, office, shown?.uf || selected)} /> : <PartyBadge party={row.sigla} size={48} />}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="min-w-0 truncate text-sm font-semibold text-neutral-950">
                            <span className="mr-2 text-neutral-400">{row.numero}</span>{row.nome}
                            <span className="ml-2 text-xs font-medium text-neutral-500">{row.sigla}</span>
                          </p>
                          <p className="shrink-0 text-sm font-semibold text-neutral-950">{formatPercent(row.pct)}%</p>
                        </div>
                        <SituacaoBadge situacao={situacao} />
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-neutral-100">
                          <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.max(0, Math.min(100, row.pct))}%` }} />
                        </div>
                        <p className="mt-1 text-xs text-neutral-500">{formatVotes(row.votos)} votos</p>
                      </div>
                    </div>
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
              {panelSettled
                ? munProgress.total > 0 && munProgress.done < munProgress.total
                  ? "Resultado oficial do TSE salvo no site. O mapa ainda está abrindo as cidades."
                  : "Resultado oficial do TSE salvo no site."
                : "Resultado oficial do TSE salvo no site."}{" "}
              <a href={TSE_PAGE[office]} target="_blank" rel="noopener noreferrer" className="underline">Fonte</a>
            </p>
          </div>
          )}
        </aside>
      </main>
    </div>
  );
}
